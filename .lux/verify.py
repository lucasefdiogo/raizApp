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
import shutil
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

sys.dont_write_bytecode = True  # sibling scripts are loaded by path: no __pycache__ in .lux/ (it would dirty the tree)
REPORT = "verification.md"
BASE = "refs/heads/main"  # the trusted ref: --base moves it (the push recalculation anchors on what main had before the merge)
TIP = "HEAD"  # the work being judged: --tip moves it (the second parent of that merge)
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


def load_escopo():
    path = Path(__file__).resolve().parent / "escopo.py"
    spec = importlib.util.spec_from_file_location("escopo", path)
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
    out = git(root, "show", f"{BASE}:verify.config.json", check=False)
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


def dirty_files(root, hu, recalc=False):
    out = git(root, "status", "--porcelain").stdout.splitlines()
    report = os.path.relpath((Path(hu) / REPORT).resolve(), Path(root).resolve())
    # the /lux-entregar leaves a line in progress.md on main after the merge; it is not part of what the push sends
    return [line for line in out if line[3:] != report and not (recalc and re.fullmatch(r"docs/(hu|fixes)/[^/]+/progress\.md", line[3:]))]


def dependency_problems(root):
    """A manifest changed on the branch (against main) may only add what approvedDeps on main lists."""
    deps = load_deps()
    try:
        approved = json.loads(git(root, "show", f"{BASE}:verify.config.json").stdout).get("approvedDeps", [])
    except (ValueError, AttributeError):
        approved = []
    approved = [d for d in approved if isinstance(d, str)] if isinstance(approved, list) else []
    problems = []
    changed = git(root, "diff", "--name-only", f"{BASE}...{TIP}", check=False).stdout.splitlines()
    for file in changed:
        kind = deps.manifest_kind(file)
        now = git(root, "show", f"{TIP}:{file}", check=False)
        if not kind or now.returncode != 0:
            continue  # not a manifest, or deleted on the branch
        before = git(root, "show", f"{BASE}:{file}", check=False)
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
        return load_protegidos().problems(root, base=BASE, tip=TIP)
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
        block = e2e.read_config(root, BASE)
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


def main_ref(root):
    """refs/heads/main, or origin/main where the CI has no local main."""
    for ref in ((BASE,) if BASE != "refs/heads/main" else ("refs/heads/main", "refs/remotes/origin/main")):
        if git(root, "rev-parse", "--verify", "-q", ref, check=False).returncode == 0:
            return ref
    return None


def frozen_problems(root, hu):
    """CONGELADO: spec.md, criteria.lock and cenarios/*.feature of the HU must equal main's. After `git merge main`
    they do; a newer version on main, or an edit on the branch, makes them differ."""
    ref = main_ref(root)
    if ref is None:
        return []
    rel = Path(hu).resolve().relative_to(Path(root).resolve()).as_posix()
    frozen = re.compile(rf"^{re.escape(rel)}/(spec\.md|criteria\.lock|cenarios/[^/]+\.feature)$")

    def blobs(rev):
        out = git(root, "-c", "core.quotePath=false", "ls-tree", "-r", rev, "--", rel, check=False).stdout
        return {m.group(2): m.group(1) for m in (re.match(r"\S+ blob (\S+)\t(.*)$", l) for l in out.splitlines()) if m and frozen.match(m.group(2))}

    on_main = blobs(ref)
    if not on_main:  # the HU is not on main: nothing to compare against
        return []
    here = blobs(TIP)
    return [f"CONGELADO: {path} difere da main; rode git merge main e replaneje"
            for path in sorted(set(on_main) | set(here)) if on_main.get(path) != here.get(path)]


def lock_at(root, rev, rel):
    out = git(root, "show", f"{rev}:{rel}", check=False)
    try:
        return json.loads(out.stdout) if out.returncode == 0 else None
    except ValueError:
        return None


def revision_problems(root, hu, locker):
    """REVISÃO: a CA changed by the current version needs a test that names it and was modified after the commit
    that imported that version. Nothing to check for a first import or when the lock did not change version."""
    rel = Path(hu).resolve().relative_to(Path(root).resolve()).as_posix() + "/criteria.lock"
    sha = git(root, "log", "-1", "--format=%H", TIP, "--", rel, check=False).stdout.strip()
    new, old = (lock_at(root, sha, rel), lock_at(root, f"{sha}^", rel)) if sha else (None, None)
    if not new or not old or new.get("versao", 1) == old.get("versao", 1):
        return []
    changed = locker.diff_locks(old, new)[0]
    subject = git(root, "log", "-1", "--format=%s", sha).stdout.strip()
    # files with a real change (not whitespace) in the commits that come after the import commit, merges left out
    patch = git(root, "-c", "core.quotePath=false", "log", "-p", "-U0", "-w", "--ignore-blank-lines", "--no-merges",
                "--ancestry-path", "--format=", f"{sha}..{TIP}", check=False).stdout
    touched, current = set(), None
    for line in patch.splitlines():
        if line.startswith("+++ "):
            current = line[6:] if line.startswith("+++ b/") else None
        elif line.startswith("@@") and current and not current.startswith(("docs/", ".lux/", ".github/")):
            touched.add(current)
    problems = []
    for ca in changed:
        named = [f for f in sorted(touched) if git(root, "grep", "-lwq", "-e", ca, TIP, "--", f, check=False).returncode == 0]
        if not named:
            problems.append(f"REVISÃO: {ca} mudou na v{new.get('versao', 1)} e nenhum teste que cita {ca} foi modificado depois de {sha[:7]} ({subject})")
    return problems


def plan_problems(hu, locker):
    """PLANO: tasks.md records the spec version it was approved for (v1 when absent); it must be the lock's."""
    tasks = Path(hu) / "tasks.md"
    if not tasks.is_file():
        return []
    match = re.search(r"^Spec:\s*v(\d+)\s*$", tasks.read_text(encoding="utf-8"), re.MULTILINE)
    plan, locked = (int(match.group(1)) if match else 1), json.loads((Path(hu) / "criteria.lock").read_text(encoding="utf-8")).get("versao", 1)
    if plan == locked:
        return []
    return [f"PLANO: tasks.md registra a spec v{plan}, mas o lacre está na v{locked}; replaneje (/lux-planejar em modo replanejamento)"]


def evaluate(hu, root, config, run, locker, ci=False, recalc=False):
    """Returns (problems, rows, lock_ok, e2e); each problem is one output line, e2e is an E2E or None."""
    command, reports_glob, tag = config
    problems = []

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        lock_code = locker.check(hu)
    lock_ok = lock_code == 0
    problems += [f"INTEGRIDADE: {line}" for line in buf.getvalue().splitlines()]

    if git(root, "merge-base", "--is-ancestor", BASE, TIP, check=False).returncode != 0:
        problems.append("BRANCH: a main não está integrada na branch; faça o merge da main antes")
    problems += frozen_problems(root, hu)
    problems += dependency_problems(root)
    if not ci:  # CI cannot see ~/.claude: `lux protegidos --ci` only reports there
        problems += protected_problems(root)
    if dirty := dirty_files(root, hu, recalc):
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
    spec_text = locker.load_spec(Path(hu))
    criteria, retired = locker.spec_criteria(spec_text), locker.spec_retired(spec_text)
    found = read_reports(paths, tag, scenario_titles(hu), known=set(criteria) | set(retired))

    for test in found.unknown:
        problems.append(f"RASTREABILIDADE: teste cita {test.ca}, que não existe na spec: {test.label}")
    for ca in sorted(retired):
        problems += [f"RETIRADO: teste ligado a {ca}, retirado na spec: {t.label}; remova o teste" for t in found.by_ca.get(ca, [])]
    problems += plan_problems(hu, locker) + revision_problems(root, hu, locker)
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


def diary_summary(hu, root):
    """Report lines summarizing .lux/diario/ for this HU (the journal itself is not committed)."""
    hu_id = re.match(r"HU-\d+", Path(hu).name)
    files = sorted(Path(root, ".lux", "diario").glob(f"{hu_id.group(0)}-TASK-*.jsonl")) if hu_id else []
    files += [f for f in [Path(root, ".lux", "diario", "sem-task.jsonl")] if f.is_file()]
    lines = ["", "## Diário", ""]
    if not files:
        return lines + ["Diário: sem registros."]
    lines += ["| Task | Chamadas | Com falha | Bash | Write/Edit | Bloqueadas |", "| --- | --- | --- | --- | --- | --- |"]
    unreadable = 0
    for f in files:
        calls = failed = bash = writes = blocked = 0
        for raw in f.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                entry = json.loads(raw)
            except ValueError:
                unreadable += 1
                continue
            if entry.get("status") == "bloqueado":  # a call a guard stopped: it did not run
                blocked += 1
                continue
            calls += 1
            failed += entry.get("exit") not in (0, None)
            bash += entry.get("tool") == "Bash"
            writes += entry.get("tool") in ("Write", "Edit", "NotebookEdit")
        name = "sem task" if f.stem == "sem-task" else f.stem.split("-", 2)[2]
        lines.append(f"| {name} | {calls} | {failed} | {bash} | {writes} | {blocked} |")
    if unreadable:
        lines += ["", f"{unreadable} linha ilegível no diário."]
    return lines


def write_report(hu, root, rows, problems, lock_ok, e2e=None):
    spec_version = json.loads((Path(hu) / "criteria.lock").read_text(encoding="utf-8")).get("versao", 1)
    sha = git(root, "rev-parse", "--short", "HEAD").stdout.strip()
    green = sum(1 for r in rows if r[3] == "passou")
    verdict = "APROVADO" if not problems else "BLOQUEADO"
    lines = [f"# Verificação — {Path(hu).name}", "", "| CA | Lacre | Teste | Resultado |", "| --- | --- | --- | --- |"]
    lines += [f"| {ca} | {digest} | {label or '—'} | {result} |" for ca, digest, label, result in rows]
    lines += ["", f"Commit: {sha} · lacre {'íntegro' if lock_ok else 'rompido'} · {green}/{len(rows)} critérios verdes",
              f"Spec: v{spec_version}", "", f"Resultado: {verdict}"]
    if e2e and e2e.note:
        lines += ["", "## E2E", "", e2e.note]
    elif e2e and e2e.rows:
        lines += ["", "## E2E", "", "| CA | Fluxo | Resultado |", "| --- | --- | --- |"]
        lines += [f"| {ca} | {label or '—'} | {outcome} |" for ca, label, outcome in e2e.rows]
    lines += diary_summary(hu, root)
    if problems:
        lines += ["", "Pendências:"] + [f"- {p}" for p in problems]
    (Path(hu) / REPORT).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return green, len(rows)



# ---- a fix branch (docs/fixes/FIX-xx-slug/verification.md): no spec, so no criteria table; the proof is a regression test

FIX_DIR = re.compile(r"FIX-\d+-[A-Za-z0-9._-]+")
FROZEN_PATH = re.compile(r"^docs/hu/[^/]+/(spec\.md|criteria\.lock|cenarios/[^/]+\.feature)$")
DEPENDENCY_DIRS = ("node_modules", ".venv", "venv", "vendor")  # linked into the base worktree, where nothing is installed


def read_cases(paths):
    """{label: (status, detail)} of every test in the JUnit files, with or without a criterion in the name."""
    cases = {}
    for path in paths:
        try:
            tree = ET.parse(path)
        except (ET.ParseError, OSError) as e:
            raise VerifyError(f"relatório JUnit ilegível: {path}: {e}")
        for case in tree.getroot().iter("testcase"):
            name, cls = (case.get("name") or "").strip(), (case.get("classname") or "").strip()
            cases[name if cls in ("", name) else f"{cls} > {name}"] = (status_of(case), failure_text(case))
    return cases


def lint_commands(root):
    """[(key, command)] of the `types` and `lint` commands of the pre-commit section of lefthook.yml on the base, never the branch's."""
    shown = git(root, "show", f"{BASE}:lefthook.yml", check=False)
    text = shown.stdout if shown.returncode == 0 else ""
    found = []
    for key in ("types", "lint"):
        match = re.search(rf"^    {key}:\n      run: (.+?)\s*$", text, re.MULTILINE)
        if match:
            found.append((key, match.group(1)))
    return found


def lint_problems(root):
    problems = []
    for _, command in lint_commands(root):
        code = run_tests(root, command)
        if code != 0:
            problems.append(f"LINT: {command} saiu com código {code}")
    return problems


def base_run(root, command, reports_glob):
    """(exit code, cases, test files) of the suite on the code before the fix, with the test files of the fix put on top.

    None when the fix changes no test file. The run is in a temporary worktree at the merge base; dependency folders are linked from
    the project, since nothing is installed there.
    """
    tip = git(root, "rev-parse", TIP).stdout.strip()
    base = git(root, "merge-base", BASE, tip, check=False).stdout.strip() or git(root, "rev-parse", BASE).stdout.strip()
    tests = [f for f in git(root, "-c", "core.quotePath=false", "diff", "--name-only", "--diff-filter=AM", base, tip, check=False).stdout.splitlines()
             if load_escopo().TEST_FILE.search(f)]
    if not tests:
        return None
    tmp = Path(tempfile.mkdtemp(prefix="lux-base-"))
    work = tmp / "base"
    try:
        added = git(root, "worktree", "add", "--detach", str(work), base, check=False)
        if added.returncode != 0:
            raise VerifyError(f"não consegui montar a árvore da versão anterior: {added.stderr.strip()}")
        git(work, "checkout", tip, "--", *tests)
        for name in DEPENDENCY_DIRS:
            if (Path(root) / name).is_dir() and not (work / name).exists():
                (work / name).symlink_to(Path(root) / name)
        code = run_tests(work, command)
        cases = read_cases([work / p for p in sorted(glob.glob(reports_glob, root_dir=work))])
    finally:
        git(root, "worktree", "remove", "--force", str(work), check=False)
        shutil.rmtree(tmp, ignore_errors=True)
    return code, cases, tests


def evaluate_fix(fix, root, config, run, recalc=False):
    """Returns (problems, regression rows, summary lines) of a fix branch."""
    command, reports_glob, tag = config
    problems = []
    if git(root, "merge-base", "--is-ancestor", BASE, TIP, check=False).returncode != 0:
        problems.append("BRANCH: a main não está integrada na branch; faça o merge da main antes")
    problems += [f"CONGELADO: {p} muda numa correção de bug; spec ou cenário errado volta ao claude.ai, não se conserta aqui"
                 for p in git(root, "diff", "--name-only", f"{BASE}...{TIP}", check=False).stdout.splitlines() if FROZEN_PATH.match(p)]
    deps = dependency_problems(root)
    problems += deps + protected_problems(root)
    if dirty := dirty_files(root, fix, recalc):
        problems.append(f"ÁRVORE: {len(dirty)} arquivo(s) com alterações não commitadas; commite antes de verificar")
    lint = lint_commands(root)
    lint_found = lint_problems(root) if run else []
    problems += lint_found

    start = time.time() - 2
    if run:
        code = run_tests(root, command)
        if code != 0:
            problems.append(f"EXECUÇÃO: testCommand saiu com código {code}")
    paths = [Path(root) / p for p in sorted(glob.glob(reports_glob, root_dir=root))]
    if run:
        paths = [p for p in paths if p.stat().st_mtime >= start]
    if not paths:
        problems.append(f"EXECUÇÃO: nenhum relatório JUnit novo em {reports_glob}" if run else f"EXECUÇÃO: nenhum relatório JUnit em {reports_glob}")
    head = read_cases(paths)
    for label, (status, detail) in sorted(head.items()):
        if status == "falhou":
            problems.append(f"EXECUÇÃO: {label} falhou" + (f": {detail}" if detail else ""))

    rows = []
    before = base_run(root, command, reports_glob)
    if before is None:
        problems.append("REGRESSÃO: a correção não mexe em nenhum arquivo de teste; o teste que reproduz o bug vem antes da correção")
    else:
        base_code, base_cases, _ = before
        if base_code != 0 and not base_cases:
            problems.append("REGRESSÃO: a suíte não rodou na versão anterior à correção (nenhum relatório); sem isso não há prova de que o teste falhava")
        wanted = re.compile(rf"FIX-\d+|{tag}")
        for label, (status, _) in sorted(head.items()):
            if status != "passou" or not wanted.search(label):
                continue
            was = base_cases.get(label)
            if was is not None and was[0] == "falhou":
                rows.append((label, "falhou", "passou"))
            elif was is None and base_code != 0 and base_cases:
                rows.append((label, "não rodou (erro ao carregar)", "passou"))
        if not rows and not (base_code != 0 and not base_cases):
            problems.append("REGRESSÃO: nenhum teste FIX-xx ou CA-xx falhava antes da correção e passa agora; o teste de regressão tem de falhar pelo motivo do bug na versão anterior")
    greens = sum(1 for status, _ in head.values() if status == "passou")
    summary = [f"Suíte: {len(head)} testes, {greens} verdes",
               ("Lint: " + ("não configurado" if not lint else "verde" if run and not lint_found else "vermelho" if lint_found else "não rodou nesta chamada")),
               "Dependências: " + ("nenhuma fora de approvedDeps" if not deps else f"{len(deps)} pendência(s)")]
    return problems, rows, summary


def write_fix_report(fix, root, rows, problems, summary):
    sha = git(root, "rev-parse", "--short", "HEAD").stdout.strip()
    verdict = "APROVADO" if not problems else "BLOQUEADO"
    lines = [f"# Verificação — {Path(fix).name}", "", "| Teste de regressão | Antes da correção | Depois |", "| --- | --- | --- |"]
    lines += [f"| {label} | {before} | {after} |" for label, before, after in rows] or ["| — | — | — |"]
    lines += ["", *summary, "", f"Commit: {sha} · {len(rows)} teste(s) de regressão (falhavam antes, passam agora)", "", f"Resultado: {verdict}"]
    if problems:
        lines += ["", "Pendências:"] + [f"- {p}" for p in problems]
    (Path(fix) / REPORT).write_text("\n".join(lines) + "\n", encoding="utf-8")


def marker_path(root):
    return Path(root) / git(root, "rev-parse", "--git-path", MARKER).stdout.strip()


def main_fix(args, fix, recalc):
    if not fix.is_dir():
        if recalc or args.aprovar:
            raise VerifyError(f"{fix} não é uma pasta")
        fix.mkdir(parents=True)
    root = Path(git(fix, "rev-parse", "--show-toplevel").stdout.strip())
    config = read_config(root)
    problems, rows, summary = evaluate_fix(fix, root, config, run=not (args.no_run or args.aprovar), recalc=recalc)
    marker = marker_path(root)
    if args.aprovar:
        marker.unlink(missing_ok=True)  # an approval for an older SHA never outlives a red check
    elif not recalc:
        write_fix_report(fix, root, rows, problems, summary)
    if problems:
        print("\n".join(problems))
        return 1
    if args.aprovar:
        marker.write_text(git(root, "rev-parse", "HEAD").stdout.strip() + "\n", encoding="utf-8")
        print(f"verify: SHA aprovado gravado em {marker}")
    elif recalc:
        print(f"verify: fix recalculado contra {BASE}: {len(rows)} teste(s) de regressão")
    else:
        print(f"verify: {len(rows)} teste(s) de regressão; relatório em {fix / REPORT}")
    return 0


def main(argv):
    parser = argparse.ArgumentParser(prog="verify.py", description=__doc__.splitlines()[0])
    parser.add_argument("hu", type=Path, help="pasta da HU (docs/hu/HU-xx-slug)")
    parser.add_argument("--no-run", action="store_true", help="não roda o testCommand; lê os relatórios que já existem")
    parser.add_argument("--aprovar", action="store_true",
                        help="só confere (sem rodar nem gravar o relatório) e, se verde, grava o marcador do SHA aprovado")
    parser.add_argument("--ci", action="store_true",
                        help="para o CI: não confere PROTEGIDOS (o `lux protegidos --ci` só avisa); não combina com --aprovar")
    parser.add_argument("--fix", action="store_true",
                        help="a pasta é docs/fixes/FIX-xx-slug: relatório da correção (teste de regressão que falhava antes e passa agora, suíte, lint, dependências)")
    parser.add_argument("--base", metavar="REV",
                        help="recalcula (pre-push): âncora de confiança no lugar de refs/heads/main; roda a suíte e não grava relatório nem marcador")
    parser.add_argument("--tip", metavar="REV", default="HEAD",
                        help="com --base: o trabalho julgado no lugar de HEAD para dependências, arquivos congelados e protegidos (a suíte roda na árvore de trabalho)")
    args = parser.parse_args(argv[1:])
    hu = args.hu
    global BASE, TIP
    recalc = args.base is not None
    try:
        if args.ci and args.aprovar:
            raise VerifyError("--ci não grava o marcador: --aprovar só vale sem --ci")
        if recalc and (args.ci or args.aprovar):
            raise VerifyError("--base recalcula sem gravar nada: não combina com --ci nem --aprovar")
        if args.tip != "HEAD" and not recalc:
            raise VerifyError("--tip só vale com --base")
        if args.fix and (args.ci or not FIX_DIR.fullmatch(hu.name)):
            raise VerifyError("--fix vale para docs/fixes/FIX-xx-slug e não combina com --ci")
        if recalc:
            BASE, TIP = args.base, args.tip
        if args.fix:
            return main_fix(args, hu, recalc)
        if not hu.is_dir():
            raise VerifyError(f"{hu} não é uma pasta")
        root = Path(git(hu, "rev-parse", "--show-toplevel").stdout.strip())
        config = read_config(root)
        locker = load_criteria_lock()
        try:
            problems, rows, lock_ok, e2e = evaluate(hu, root, config, run=not (args.no_run or args.aprovar), locker=locker, ci=args.ci, recalc=recalc)
        except locker.LockError as e:
            raise VerifyError(str(e))
        marker = marker_path(root)
        if args.aprovar:
            marker.unlink(missing_ok=True)  # an approval for an older SHA never outlives a red check
        elif recalc:
            green, total = sum(1 for r in rows if r[3] == "passou"), len(rows)
        else:
            green, total = write_report(hu, root, rows, problems, lock_ok, e2e)
        if problems:
            print("\n".join(problems))
            return 1
        if args.aprovar:
            marker.write_text(git(root, "rev-parse", "HEAD").stdout.strip() + "\n", encoding="utf-8")
            print(f"verify: SHA aprovado gravado em {marker}")
        elif recalc:
            print(f"verify: recalculado contra {BASE}: {green}/{total} critérios verdes")
        else:
            print(f"verify: {green}/{total} critérios verdes; relatório em {hu / REPORT}")
        return 0
    except VerifyError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
