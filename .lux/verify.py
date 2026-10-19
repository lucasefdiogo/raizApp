#!/usr/bin/env python3
"""Final check of a HU before merge (stdlib only): lock integrity, traceability, execution and report.

Reads verify.config.json from refs/heads/main, never from the working tree. Formats and exit
codes are described in templates/formatos.md.
"""
import argparse
import contextlib
import glob
import importlib.util
import io
import json
import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

sys.dont_write_bytecode = True  # sibling scripts are loaded by path: no __pycache__ in .lux/ (it would dirty the tree)
REPORT = "verification.md"
MARKER = "luxthor-validar-aprovado"
SCENARIO = re.compile(r"^\s*(?:Cenário|Cenario|Esquema do Cenário|Esquema do Cenario|Scenario(?: Outline)?):\s*(.+?)\s*$")
CA_ID = re.compile(r"CA-\d+")


class VerifyError(Exception):
    """Bad input or usage; the CLI exits with 2."""


def load_criteria_lock():
    # loaded by path: with python -I the script folder is not on sys.path
    path = Path(__file__).resolve().parent / "criteria_lock.py"
    spec = importlib.util.spec_from_file_location("criteria_lock", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_deps():
    path = Path(__file__).resolve().parent / "deps.py"
    spec = importlib.util.spec_from_file_location("deps", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_protegidos():
    path = Path(__file__).resolve().parent / "protegidos.py"
    spec = importlib.util.spec_from_file_location("protegidos", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_e2e():
    path = Path(__file__).resolve().parent / "e2e.py"
    spec = importlib.util.spec_from_file_location("e2e", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def git(root, *args, check=True):
    out = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)
    if check and out.returncode != 0:
        raise VerifyError(f"git {' '.join(args)}: {out.stderr.strip()}")
    return out


def read_config(root):
    out = git(root, "show", "refs/heads/main:verify.config.json", check=False)
    if out.returncode != 0:
        raise VerifyError("verify.config.json não existe na main (rode /lux-preparar e faça o merge)")
    try:
        config = json.loads(out.stdout)
        command, reports = config["testCommand"], config["junitReports"]
        tag = config.get("criteriaTag", r"CA-\d+")
        re.compile(tag)
    except (ValueError, KeyError, TypeError, re.error) as e:
        raise VerifyError(f"verify.config.json da main inválido: {e!r}")
    return command, reports, tag


@dataclass
class Test:
    ca: str
    label: str
    status: str  # passou | falhou | pulado
    detail: str = ""


@dataclass
class Reports:
    by_ca: dict = field(default_factory=lambda: defaultdict(list))
    unknown: list = field(default_factory=list)  # tests that cite a CA outside the spec
    seen: int = 0


def scenario_titles(hu):
    """Scenario title -> CA id, from the frozen cenarios/CA-xx.feature files.

    Cucumber's JUnit XML carries the scenario title and no tag, so this is how its tests find their CA.
    """
    titles = {}
    for feature in sorted((Path(hu) / "cenarios").glob("CA-*.feature")):
        for line in feature.read_text(encoding="utf-8").splitlines():
            if match := SCENARIO.match(line):
                titles[" ".join(match.group(1).split())] = feature.stem
    return titles


def status_of(case):
    if case.find("failure") is not None or case.find("error") is not None:
        return "falhou"
    if case.get("status", "").upper() in ("ERROR", "FAILURE", "FAILED"):
        return "falhou"
    if case.find("skipped") is not None or case.get("status", "").upper() == "SKIPPED":
        return "pulado"
    return "passou"


def failure_text(case):
    node = case.find("failure") if case.find("failure") is not None else case.find("error")
    text = (node.get("message") or node.text or "") if node is not None else ""
    return " ".join(text.split())[:120]


def read_reports(paths, tag, scenarios, known=None):
    """Parses JUnit XML files; each test goes to every CA it names (or whose scenario title it carries)."""
    pattern = re.compile(tag)
    reports = Reports()
    for path in paths:
        try:
            tree = ET.parse(path)
        except (ET.ParseError, OSError) as e:
            raise VerifyError(f"relatório JUnit ilegível: {path}: {e}")
        for case in tree.getroot().iter("testcase"):
            reports.seen += 1
            name, cls = (case.get("name") or ""), (case.get("classname") or "")
            ids = {m.group(0) for m in pattern.finditer(f"{name}\n{cls}")}
            if " ".join(name.split()) in scenarios:
                ids.add(scenarios[" ".join(name.split())])
            label = name.strip() if cls.strip() in ("", name.strip()) else f"{cls.strip()} > {name.strip()}"
            for ca in sorted(ids):
                test = Test(ca, label, status_of(case), failure_text(case))
                if known is None or ca in known:
                    reports.by_ca[ca].append(test)
                else:
                    reports.unknown.append(test)
    return reports


def run_tests(root, command):
    out = subprocess.run(["bash", "-c", command], cwd=root, capture_output=True, text=True)
    return out.returncode


def dirty_files(root, hu):
    out = git(root, "status", "--porcelain").stdout.splitlines()
    report = os.path.relpath((Path(hu) / REPORT).resolve(), Path(root).resolve())
    return [line for line in out if line[3:] != report]


def dependency_problems(root):
    """A manifest changed on the branch (against main) may only add what approvedDeps on main lists."""
    deps = load_deps()
    try:
        approved = json.loads(git(root, "show", "refs/heads/main:verify.config.json").stdout).get("approvedDeps", [])
    except (ValueError, AttributeError):
        approved = []
    approved = [d for d in approved if isinstance(d, str)] if isinstance(approved, list) else []
    problems = []
    changed = git(root, "diff", "--name-only", "refs/heads/main...HEAD", check=False).stdout.splitlines()
    for file in changed:
        kind = deps.manifest_kind(file)
        now = git(root, "show", f"HEAD:{file}", check=False)
        if not kind or now.returncode != 0:
            continue  # not a manifest, or deleted on the branch
        before = git(root, "show", f"refs/heads/main:{file}", check=False)
        try:
            current = deps.manifest_deps(kind, now.stdout)
            base = deps.manifest_deps(kind, before.stdout) if before.returncode == 0 else {}
        except deps.DepsError as e:
            problems.append(f"DEPENDÊNCIA: {file} ilegível: {e}")
            continue
        problems += [f"DEPENDÊNCIA: {p} em {file} não está em approvedDeps da main" for p in deps.undeclared(kind, current, base, approved)]
    return problems


def protected_problems(root):
    """.lux/ and .github/workflows/ (the CI) must equal main, the installed kit or the recorded workflow hash."""
    try:
        return load_protegidos().problems(root)
    except RuntimeError as e:
        return [f"PROTEGIDOS: não consegui comparar com a main: {e}"]


@dataclass
class E2E:
    rows: list = field(default_factory=list)  # (CA, flow, result)
    note: str = ""  # "e2e pendente: ..." when the flows could not run


def e2e_problems(hu, root, criteria, tag, run):
    """(problems, E2E or None). Only a HU with tem_tela "sim" in a project whose main configures an executor.

    Every CA needs a finished flow (no LUX-ESQUELETO). With a device or browser the flows run and each CA needs a
    green result; without one it is pending (a note in verification.md, not a block).
    """
    e2e = load_e2e()
    try:
        block = e2e.read_config(root)
    except e2e.E2EError as e:
        raise VerifyError(str(e))
    if not block or not block.get("executor") or not re.search(r"^tem_tela:\s*sim\b", (Path(hu) / "spec.md").read_text(encoding="utf-8"), re.MULTILINE):
        return [], None
    ident = e2e.hu_id(hu)
    executor = block["executor"]
    problems = []
    for ca in sorted(criteria):
        flow = e2e.flow_file(root, ident, ca, executor)
        if not flow.is_file():
            problems.append(f"E2E: {ca} sem fluxo em e2e/{ident}/")
        elif e2e.SKELETON in flow.read_text(encoding="utf-8"):
            problems.append(f"E2E: {ca} ainda é esqueleto ({e2e.SKELETON}): {flow.relative_to(root)}")
    result = E2E()
    if problems:
        return problems, result
    start = time.time() - 2
    pattern = block.get("junitReports") or "reports/e2e/*.xml"
    if run:
        try:
            status, detail = e2e.run(root, block, ident)
        except e2e.E2EError as e:
            raise VerifyError(str(e))
        if status == "pendente":
            result.note = e2e.pending_line(detail)
            return [], result
    paths = [Path(root) / p for p in sorted(glob.glob(pattern, root_dir=root))]
    if run:
        paths = [p for p in paths if p.stat().st_mtime >= start]
    if not paths:
        if run:
            problems.append(f"E2E: nenhum relatório JUnit novo em {pattern}")
        else:
            result.note = "e2e pendente: sem relatório"
        return problems, result
    found = read_reports(paths, tag, {}, known=set(criteria))
    for test in found.unknown:
        problems.append(f"E2E: fluxo cita {test.ca}, que não existe na spec: {test.label}")
    for ca in sorted(criteria):
        tests = found.by_ca.get(ca, [])
        label = "; ".join(t.label for t in tests)
        if not tests:
            outcome = "sem resultado"
            problems.append(f"E2E: {ca} sem resultado no relatório")
        elif any(t.status == "falhou" for t in tests):
            outcome = "falhou"
            bad = next(t for t in tests if t.status == "falhou")
            problems.append(f"E2E: {ca} falhou: {bad.label}" + (f": {bad.detail}" if bad.detail else ""))
        elif not any(t.status == "passou" for t in tests):
            outcome = "pulado"
            problems.append(f"E2E: {ca} só tem fluxo pulado")
        else:
            outcome = "passou"
        result.rows.append((ca, label, outcome))
    if run and status == "vermelho" and not any(r[2] == "falhou" for r in result.rows):
        problems.append(f"E2E: {detail}")
    return problems, result


def evaluate(hu, root, config, run, locker, ci=False):
    """Returns (problems, rows, lock_ok, e2e); each problem is one output line, e2e is an E2E or None."""
    command, reports_glob, tag = config
    problems = []

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        lock_code = locker.check(hu)
    lock_ok = lock_code == 0
    problems += [f"INTEGRIDADE: {line}" for line in buf.getvalue().splitlines()]

    if git(root, "merge-base", "--is-ancestor", "refs/heads/main", "HEAD", check=False).returncode != 0:
        problems.append("BRANCH: a main não está integrada na branch; faça o merge da main antes")
    problems += dependency_problems(root)
    if not ci:  # CI cannot see ~/.claude: `lux protegidos --ci` only reports there
        problems += protected_problems(root)
    if dirty := dirty_files(root, hu):
        problems.append(f"ÁRVORE: {len(dirty)} arquivo(s) com alterações não commitadas; commite antes de verificar")

    start = time.time() - 2  # a little slack for coarse file system timestamps
    if run:
        code = run_tests(root, command)
        if code != 0:
            problems.append(f"EXECUÇÃO: testCommand saiu com código {code}")
    paths = sorted(glob.glob(reports_glob, root_dir=root))
    paths = [Path(root) / p for p in paths]
    if run:
        paths = [p for p in paths if p.stat().st_mtime >= start]
    if not paths:
        problems.append(f"EXECUÇÃO: nenhum relatório JUnit novo em {reports_glob}" if run
                        else f"EXECUÇÃO: nenhum relatório JUnit em {reports_glob}")

    lock = json.loads((Path(hu) / "criteria.lock").read_text(encoding="utf-8"))["criterios"]
    criteria = locker.spec_criteria(locker.load_spec(Path(hu)))
    found = read_reports(paths, tag, scenario_titles(hu), known=set(criteria))

    for test in found.unknown:
        problems.append(f"RASTREABILIDADE: teste cita {test.ca}, que não existe na spec: {test.label}")
    rows = []
    for ca in sorted(criteria):
        tests = found.by_ca.get(ca, [])
        digest = lock.get(ca, {}).get("criterio", "")[:8]
        label = "; ".join(t.label for t in tests)
        if not tests:
            result = "sem teste"
            problems.append(f"RASTREABILIDADE: {ca} sem teste marcado")
        elif any(t.status == "falhou" for t in tests):
            result = "falhou"
            bad = next(t for t in tests if t.status == "falhou")
            problems.append(f"EXECUÇÃO: {ca} falhou: {bad.label}" + (f": {bad.detail}" if bad.detail else ""))
        elif not any(t.status == "passou" for t in tests):
            result = "pulado"
            problems.append(f"EXECUÇÃO: {ca} só tem teste pulado")
        else:
            result = "passou"
        rows.append((ca, digest, label, result))
    e2e_found, e2e_result = e2e_problems(hu, root, criteria, tag, run)
    return problems + e2e_found, rows, lock_ok, e2e_result


def write_report(hu, root, rows, problems, lock_ok, e2e=None):
    sha = git(root, "rev-parse", "--short", "HEAD").stdout.strip()
    green = sum(1 for r in rows if r[3] == "passou")
    verdict = "APROVADO" if not problems else "BLOQUEADO"
    lines = [f"# Verificação — {Path(hu).name}", "", "| CA | Lacre | Teste | Resultado |", "| --- | --- | --- | --- |"]
    lines += [f"| {ca} | {digest} | {label or '—'} | {result} |" for ca, digest, label, result in rows]
    lines += ["", f"Commit: {sha} · lacre {'íntegro' if lock_ok else 'rompido'} · {green}/{len(rows)} critérios verdes",
              "", f"Resultado: {verdict}"]
    if e2e and e2e.note:
        lines += ["", "## E2E", "", e2e.note]
    elif e2e and e2e.rows:
        lines += ["", "## E2E", "", "| CA | Fluxo | Resultado |", "| --- | --- | --- |"]
        lines += [f"| {ca} | {label or '—'} | {outcome} |" for ca, label, outcome in e2e.rows]
    if problems:
        lines += ["", "Pendências:"] + [f"- {p}" for p in problems]
    (Path(hu) / REPORT).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return green, len(rows)


def marker_path(root):
    return Path(root) / git(root, "rev-parse", "--git-path", MARKER).stdout.strip()


def main(argv):
    parser = argparse.ArgumentParser(prog="verify.py", description=__doc__.splitlines()[0])
    parser.add_argument("hu", type=Path, help="pasta da HU (docs/hu/HU-xx-slug)")
    parser.add_argument("--no-run", action="store_true", help="não roda o testCommand; lê os relatórios que já existem")
    parser.add_argument("--aprovar", action="store_true",
                        help="só confere (sem rodar nem gravar o relatório) e, se verde, grava o marcador do SHA aprovado")
    parser.add_argument("--ci", action="store_true",
                        help="para o CI: não confere PROTEGIDOS (o `lux protegidos --ci` só avisa); não combina com --aprovar")
    args = parser.parse_args(argv[1:])
    hu = args.hu
    try:
        if args.ci and args.aprovar:
            raise VerifyError("--ci não grava o marcador: --aprovar só vale sem --ci")
        if not hu.is_dir():
            raise VerifyError(f"{hu} não é uma pasta")
        root = Path(git(hu, "rev-parse", "--show-toplevel").stdout.strip())
        config = read_config(root)
        locker = load_criteria_lock()
        try:
            problems, rows, lock_ok, e2e = evaluate(hu, root, config, run=not (args.no_run or args.aprovar), locker=locker, ci=args.ci)
        except locker.LockError as e:
            raise VerifyError(str(e))
        marker = marker_path(root)
        if args.aprovar:
            marker.unlink(missing_ok=True)  # an approval for an older SHA never outlives a red check
        else:
            green, total = write_report(hu, root, rows, problems, lock_ok, e2e)
        if problems:
            print("\n".join(problems))
            return 1
        if args.aprovar:
            marker.write_text(git(root, "rev-parse", "HEAD").stdout.strip() + "\n", encoding="utf-8")
            print(f"verify: SHA aprovado gravado em {marker}")
        else:
            print(f"verify: {green}/{total} critérios verdes; relatório em {hu / REPORT}")
        return 0
    except VerifyError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
