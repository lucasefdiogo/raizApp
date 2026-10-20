#!/usr/bin/env python3
"""lux: single entry point of the Luxthor kit in the terminal (stdlib only).

lacrar, conferir-lacre and verificar call the sibling scripts; importar brings the ZIP made by
the lux-especificar skill into the repository. The lock file is still called criteria.lock.
"""
import difflib
import glob
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path

sys.dont_write_bytecode = True  # sibling scripts are loaded by path: no __pycache__ in .lux/ (it would dirty the tree)
HERE = Path(__file__).resolve().parent
DOWNLOADS = "/mnt/c/Users/*/Downloads"
ZIP_PATTERNS = ("lux-HU-*.zip", "pacote-hu*.zip")
USAGE = "uso: lux lacrar|conferir-lacre|conferir-plano|auditar-task|aprendizado|pre-push|verificar|importar|iniciar|protegidos|testar|sandbox|atualizar-projeto|instalar-ci|e2e|aparelho [argumentos]"


def script(name, *args):
    return subprocess.run([sys.executable, "-I", str(HERE / name), *args], capture_output=True, text=True)


def show(done):
    sys.stdout.write(done.stdout)
    sys.stderr.write(done.stderr)


def resolve_hu(arg):
    """A HU folder, or an id such as HU-03 looked up under docs/hu/."""
    path = Path(arg)
    if path.is_dir():
        return path
    found = sorted(Path("docs/hu").glob(f"{arg}-*")) if re.fullmatch(r"HU-\d+", arg) else []
    if len(found) == 1:
        return found[0]
    raise SystemExit(f"erro: {arg} não é uma pasta de HU")


def hu_arg(args):
    if len(args) != 1:
        raise SystemExit("uso: lux lacrar|conferir-lacre <pasta-da-HU | HU-xx>")
    return resolve_hu(args[0])


def inside_claude_code(command):
    """lacrar, importar and iniciar are the user's own commands: the agent never runs them."""
    if os.environ.get("CLAUDECODE"):
        print(f"erro: lux {command} não roda dentro do Claude Code (CLAUDECODE definido). Rode no seu terminal.", file=sys.stderr)
        return True
    return False


def lacrar(args):
    # the lacre (hash of the criteria) is the user's seal: the agent never writes it
    if inside_claude_code("lacrar"):
        return 2
    hu = hu_arg(args)
    done = script("criteria_lock.py", "generate", str(hu))
    show(done)
    if done.returncode == 0:
        print(f"lacre gerado: {hu / 'criteria.lock'}")
    return done.returncode


def conferir(args):
    hu = hu_arg(args)
    done = script("criteria_lock.py", "check", str(hu))
    if done.returncode == 0:
        print("lacre conferido")
    elif done.returncode == 1:
        print("lacre rompido")
        sys.stdout.write(done.stdout)
    else:
        show(done)
    return done.returncode


def conferir_plano(args):
    """Deterministic check of tasks.md (scope of each task, protected paths, approved dependencies): see conferir_plano.py."""
    if len(args) != 1:
        raise SystemExit("uso: lux conferir-plano <pasta-da-HU | HU-xx>")
    done = script("conferir_plano.py", str(resolve_hu(args[0])))
    show(done)
    if done.returncode == 0:
        print("plano conferido")
    return done.returncode


def auditar_task(args):
    """Audit package of a task (and its verdict with --veredito) for the lux-auditor agent: see auditar_task.py."""
    flags = {"--nova", "--veredito"}
    positional = [a for a in args if a not in flags]
    if len(positional) != 2 or any(a.startswith("--") for a in positional):
        print("uso: lux auditar-task <HU-xx> <TASK-yy> [--nova] [--veredito]", file=sys.stderr)
        return 2
    audit = load_sibling("auditar_task")
    hu, task = positional
    try:
        root = audit.project_root()
        if "--veredito" in args:
            code, message = audit.veredito(root, audit.hu_id_of(resolve_hu(hu)), task)
            print(message)
            return code
        result = audit.build(root, resolve_hu(hu), task, nova="--nova" in args)
    except audit.AuditError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2
    print(f"pacote em {result['pacote'].relative_to(root)}")
    sys.stdout.write((result["pacote"] / "pre-diagnostico.md").read_text(encoding="utf-8"))
    stop = audit.protected_stop(root, audit.hu_id_of(resolve_hu(hu)), task)
    if stop:  # the package is the evidence; the loop does not go on to the auditor
        print(stop)
        return audit.PARAR
    return 0


def aprendizado(args):
    """Short lesson of a task, kept at a fixed size in .lux/aprendizados-<HU>.md: see auditar_task.py."""
    if len(args) != 3:
        print('uso: lux aprendizado <HU-xx> <TASK-yy> "lição curta"', file=sys.stderr)
        return 2
    audit = load_sibling("auditar_task")
    try:
        line = audit.aprendizado(audit.project_root(), audit.hu_id_of(resolve_hu(args[0])), args[1], args[2])
    except audit.AuditError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2
    print(line)
    return 0


def pre_push(args):
    """The lefthook pre-push: recomputes the verify over what a push sends to main: see pre_push.py."""
    return subprocess.run([sys.executable, "-I", str(HERE / "pre_push.py"), *args]).returncode


def verificar(args):
    return subprocess.run([sys.executable, "-I", str(HERE / "verify.py"), *args]).returncode


def e2e(args):
    """esqueleto (flows from the sealed .feature files), detectar and rodar: see e2e.py."""
    return subprocess.run([sys.executable, "-I", str(HERE / "e2e.py"), *args]).returncode


def aparelho(args):
    """Checks the machine that runs the E2E flows and starts the Windows adb server in WSL: see aparelho.py."""
    return subprocess.run([sys.executable, "-I", str(HERE / "aparelho.py"), *args]).returncode


def git(root, *args):
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)


def load_sibling(name):
    spec = importlib.util.spec_from_file_location(name, HERE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def project_root():
    top = git(".", "rev-parse", "--show-toplevel")
    if top.returncode != 0:
        raise SystemExit("erro: rode dentro do repositório do projeto.")
    return Path(top.stdout.strip())


def protegidos(args):
    """.lux/, .github/workflows/ and lefthook.yml against main. --ci (GitHub Actions) only warns and always exits 0.
    --hu HU-xx lists the protected files that HU brought in (the final report of /lux-entregar; none is expected)."""
    if len(args) == 2 and args[0] == "--hu" and re.fullmatch(r"HU-\d+", args[1]):
        try:
            paths = load_sibling("protegidos").merged_changes(project_root(), args[1])
        except RuntimeError as e:
            print(f"erro: {e}", file=sys.stderr)
            return 2
        print("**Arquivos protegidos alterados: nenhum**" if not paths else "**Arquivos protegidos alterados:**\n" + "\n".join(f"- {p}" for p in paths))
        return 0
    if args not in ([], ["--ci"]):
        raise SystemExit("uso: lux protegidos [--ci | --hu HU-xx]")
    try:
        lines = load_sibling("protegidos").problems(project_root(), ci=bool(args))
    except RuntimeError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 0 if args else 2
    if lines:
        print("\n".join(lines))
    return 0 if args or not lines else 1


def atualizar_projeto(args):
    # rewrites the CI and its scripts: the user's own command, like the seal and the import
    if inside_claude_code("atualizar-projeto"):
        return 2
    return load_sibling("projeto_ci").atualizar(args)


def instalar_ci(args):
    """Creates .lux/ and the workflow when missing (never overwrites); /lux-preparar runs it in a new project."""
    return load_sibling("projeto_ci").instalar_ci(args)


def testar(args):
    """Runs the testCommand of main's verify.config.json and requires a fresh JUnit report (the CI suite step)."""
    if args:
        raise SystemExit("uso: lux testar")
    root = project_root()
    verify = load_sibling("verify")
    try:
        command, reports, _ = verify.read_config(root)
    except verify.VerifyError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2
    started = time.time() - 2
    code = subprocess.run(["bash", "-c", command], cwd=root).returncode
    if code != 0:
        print(f"EXECUÇÃO: testCommand saiu com código {code}")
        return 1
    if not [p for p in glob.glob(reports, root_dir=root) if (root / p).stat().st_mtime >= started]:
        print(f"EXECUÇÃO: nenhum relatório JUnit novo em {reports}")
        return 1
    return 0


def newest_zip(folder_arg):
    given = folder_arg or os.environ.get("LUX_DOWNLOADS")
    folders = [Path(given)] if given else [Path(p) for p in glob.glob(DOWNLOADS)]
    found = [p for folder in folders for pattern in ZIP_PATTERNS for p in folder.glob(pattern)]
    return max(found, key=lambda p: p.stat().st_mtime) if found else None


def undo(entered, new_dirs):
    for path in entered:
        path.unlink(missing_ok=True)
    for folder in sorted(new_dirs, key=lambda p: len(p.parts), reverse=True):
        try:
            folder.rmdir()
        except OSError:
            pass


def load_deps():
    spec = importlib.util.spec_from_file_location("deps", HERE / "deps.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def approve_dependencies(root, hu_id):
    """Shows the packages that arquitetura.md and the ADRs of this HU list, and records them in
    approvedDeps (verify.config.json) only after the user types s."""
    config_path = root / "verify.config.json"
    documents = [root / "docs/arquitetura/arquitetura.md"]
    for adr in sorted((root / "docs/adr").glob("*.md")):
        if re.search(rf"^-\s*HU:\s*{re.escape(hu_id)}\s*$", adr.read_text(encoding="utf-8"), re.MULTILINE):
            documents.append(adr)
    deps = load_deps()
    listed = [d for doc in documents if doc.is_file() for d in deps.dependencies(doc)]
    if not config_path.is_file():
        if listed:
            print("Dependências não registradas: o projeto ainda não tem verify.config.json (rode /lux-preparar).")
        return 0
    config = json.loads(config_path.read_text(encoding="utf-8"))
    have = set(config.get("approvedDeps", []))
    new = {}
    for name, version, lic, src in listed:
        if version and f"{name}@{version}" not in have:
            new.setdefault((name, version), (lic or "?", src))
    unversioned = sorted({name for name, version, _, _ in listed if not version})
    if unversioned:
        print(f"Sem versão (não entram; continuam pedindo aprovação na instalação): {', '.join(unversioned)}")
    if not new:
        return 0
    print("Dependências novas (pacote, versão, licença, origem):")
    for (name, version), (lic, src) in new.items():
        print(f"{name}\t{version}\t{lic}\t{src}")
    try:
        answer = input("Aprovar estas dependências em verify.config.json? [s/N] ")
    except EOFError:
        answer = ""
    if answer.strip().lower() != "s":
        print("Dependências não aprovadas: continuam pedindo aprovação na instalação.")
        return 0
    config["approvedDeps"] = sorted(have | {f"{n}@{v}" for n, v in new})
    config_path.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    git(root, "add", "--", "verify.config.json")
    commit = git(root, "commit", "-q", "-m", f"chore({hu_id}): dependências aprovadas")
    if commit.returncode != 0:
        git(root, "reset", "-q", "--", "verify.config.json")
        git(root, "checkout", "--", "verify.config.json")
        print(commit.stdout + commit.stderr, end="")
        print("Dependências não registradas: o commit foi recusado.")
        return 1
    print(f"Commit: chore({hu_id}): dependências aprovadas")
    return 0


def existing_hu(root, spec_member):
    """The folder of this HU on main, found by its id (HU-01 in HU-01-slug): None for a HU that is new."""
    folder = Path(spec_member).parent.name
    hu_id = re.match(r"HU-\d+", folder)
    if not hu_id:
        return None
    found = sorted(p for p in (root / "docs/hu").glob(f"{hu_id.group(0)}-*") if (p / "spec.md").is_file())
    return found[0] if found else None


def lock_version(folder):
    try:
        return json.loads((Path(folder) / "criteria.lock").read_text(encoding="utf-8")).get("versao", 1)
    except (OSError, ValueError, AttributeError):
        return None


def show_diff(old_root, new_root, rels):
    """Unified diff of the files that differ (a missing file counts as empty)."""
    for rel in rels:
        old, new = old_root / rel, new_root / rel
        before = old.read_text(encoding="utf-8").splitlines(keepends=True) if old.is_file() else []
        after = new.read_text(encoding="utf-8").splitlines(keepends=True) if new.is_file() else []
        if before != after:
            sys.stdout.writelines(difflib.unified_diff(before, after, f"main:{rel}", f"zip:{rel}"))
            if after and not after[-1].endswith("\n"):
                print()


def revisar(root, z, members, spec_member, existing):
    """Import of a higher version of a HU that is already on main: checks everything in a copy of docs/,
    shows the diff and the summary, asks s/N, and only then replaces the files of that HU."""
    folder = Path(spec_member).parent
    rel_hu = existing.relative_to(root)
    if existing.name != folder.name:
        print(f"erro: o ZIP traz a pasta {folder.name}, mas a main já tem a HU em {existing.name}; a revisão usa a mesma pasta.", file=sys.stderr)
        return 1
    others = sorted({m.filename for m in members if re.match(r"docs/hu/", m.filename) and not m.filename.startswith(f"docs/hu/{folder.name}/")})
    if others:
        print(f"erro: o ZIP mexe em outra HU ({others[0]}); uma revisão troca só os arquivos de {folder.name}.", file=sys.stderr)
        return 1
    mine = [m for m in members if m.filename.startswith(f"docs/hu/{folder.name}/")]
    work = Path(tempfile.mkdtemp(prefix="lux-revisao-"))
    try:
        incoming = work / "zip"
        for info in members:
            dest = incoming / info.filename
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(z.read(info))
        before, after = lock_version(existing), lock_version(incoming / rel_hu)
        if after is None:
            print("erro: o ZIP não traz um criteria.lock válido para a HU.", file=sys.stderr)
            return 1
        hu_id = re.search(r"^id:\s*(\S+)", (incoming / rel_hu / "spec.md").read_text(encoding="utf-8"), re.MULTILINE)
        if not hu_id:
            print("erro: spec.md sem id no frontmatter", file=sys.stderr)
            return 1
        hu_id = hu_id.group(1)
        if after <= before:
            print(f"erro: a versão do ZIP (v{after}) não é maior que a da main (v{before}); nada a revisar.", file=sys.stderr)
            return 1

        # the project as it would be after the import: main's docs/ plus the HU's files from the ZIP
        trial = work / "trial"
        shutil.copytree(root / "docs", trial / "docs")
        for info in members:
            dest = trial / info.filename
            if info.filename.startswith(f"docs/hu/{folder.name}/") or not dest.exists():
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(z.read(info))
        hu = trial / rel_hu
        for stale in (hu / "cenarios").glob("*.feature"):  # the ZIP is the whole scenario set of the HU
            if not (incoming / rel_hu / "cenarios" / stale.name).is_file():
                stale.unlink()
        problems = []
        checked = script("criteria_lock.py", "check", str(hu))
        if checked.returncode != 0:
            problems = ["lacre rompido"] + (checked.stdout + checked.stderr).splitlines()
        else:
            rules = script("validar_hu.py", str(hu), "--anterior", str(existing))
            if rules.returncode != 0:
                problems = (rules.stdout + rules.stderr).splitlines()
        if problems:
            print("\n".join(problems))
            print("Importação desfeita: nada foi gravado.")
            return 1

        summary = script("revisao.py", "resumo", str(existing), str(hu))
        print(summary.stdout.rstrip() if summary.returncode == 0 else summary.stderr.rstrip())
        names = sorted({Path(m.filename).relative_to(f"docs/hu/{folder.name}").as_posix() for m in mine} |
                       {p.relative_to(existing).as_posix() for p in (existing / "cenarios").glob("*.feature")} | {"spec.md", "criteria.lock"})
        show_diff(existing, hu, [n for n in names if n != "criteria.lock"])
        try:
            answer = input(f"Importar a revisão v{after} da {hu_id} (troca spec, cenários e lacre)? [s/N] ")
        except EOFError:
            answer = ""
        if answer.strip().lower() != "s":
            print("Revisão não importada: nada foi gravado.")
            return 1
    finally:
        shutil.rmtree(work, ignore_errors=True)

    entered, replaced, skipped = [], [], []
    for info in members:
        dest = root / info.filename
        inside = info.filename.startswith(f"docs/hu/{folder.name}/")
        if dest.exists() and not inside:
            skipped.append(info.filename)
            continue
        (replaced if dest.exists() else entered).append(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(z.read(info))
    rels = [str(p.relative_to(root)) for p in entered + replaced]
    git(root, "add", "--", *rels)
    commit = git(root, "commit", "-q", "-m", f"docs({hu_id}): spec v{after}")
    if commit.returncode != 0:
        git(root, "reset", "-q", "--", *rels)
        git(root, "checkout", "--", *[str(p.relative_to(root)) for p in replaced])
        undo(entered, [])
        print(commit.stdout + commit.stderr, end="")
        print("Importação desfeita: o commit foi recusado.")
        return 1
    for rel in rels:
        print(f"Entrou: {rel}")
    for rel in skipped:
        print(f"Pulado (já existe): {rel}")
    print("lacre conferido")
    print(f"Commit: docs({hu_id}): spec v{after}")
    return approve_dependencies(root, hu_id)


def importar(args):
    if inside_claude_code("importar"):
        return 2
    if len(args) > 1:
        raise SystemExit("uso: lux importar [pasta-de-downloads]")
    top = git(".", "rev-parse", "--show-toplevel")
    if top.returncode != 0:
        print("erro: rode dentro do repositório do projeto.", file=sys.stderr)
        return 1
    root = Path(top.stdout.strip())
    if git(root, "branch", "--show-current").stdout.strip() != "main":
        print("erro: lux importar só roda na main.", file=sys.stderr)
        return 1
    if git(root, "status", "--porcelain").stdout.strip():
        print("erro: árvore suja; commite ou guarde o que está pendente antes de importar.", file=sys.stderr)
        return 1
    package = newest_zip(args[0] if args else None)
    if package is None:
        print("erro: nenhum lux-HU-*.zip (nem pacote-hu*.zip) encontrado.", file=sys.stderr)
        return 1

    with zipfile.ZipFile(package) as z:
        members = [i for i in z.infolist() if not i.is_dir()]
        for info in members:
            name = Path(info.filename)
            if name.is_absolute() or ".." in name.parts:
                print(f"erro: caminho fora do repositório no ZIP: {info.filename}", file=sys.stderr)
                return 1
        # the whole package lives under docs/ (lux-especificar, "Estrutura do ZIP"): anything else would be configuration
        # or code the user never reviewed, so the ZIP is refused as a whole
        outside = [m.filename for m in members if Path(m.filename).parts[:1] != ("docs",)]
        if outside:
            print(f"erro: o ZIP traz arquivo fora de docs/ ({outside[0]}); o pacote inteiro é recusado e nada foi gravado.", file=sys.stderr)
            return 1
        specs = [m.filename for m in members if re.fullmatch(r"docs/hu/[^/]+/spec\.md", m.filename)]
        if len(specs) != 1:
            print(f"erro: o ZIP deve ter exatamente uma HU (achei {len(specs)}).", file=sys.stderr)
            return 1
        existing = existing_hu(root, specs[0])
        if existing is not None:
            return revisar(root, z, members, specs[0], existing)
        entered, skipped, new_dirs = [], [], []
        for info in members:
            dest = root / info.filename
            if dest.exists():
                skipped.append(info.filename)
                continue
            for parent in reversed(dest.relative_to(root).parents[:-1]):
                if not (root / parent).exists():
                    new_dirs.append(root / parent)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(z.read(info))
            entered.append(dest)

    hu = root / Path(specs[0]).parent
    problems = []
    checked = script("criteria_lock.py", "check", str(hu))
    if checked.returncode == 0:
        rules = script("validar_hu.py", str(hu))
        if rules.returncode != 0:
            problems = (rules.stdout + rules.stderr).splitlines()
    else:
        problems = ["lacre rompido"] + (checked.stdout + checked.stderr).splitlines()
    match = re.search(r"^id:\s*(\S+)", (hu / "spec.md").read_text(encoding="utf-8"), re.MULTILINE)
    if not problems and not match:
        problems = ["spec.md sem id no frontmatter"]
    if problems:
        undo(entered, new_dirs)
        print("\n".join(problems))
        print("Importação desfeita: nada foi gravado.")
        return 1
    if not entered:
        print("Nada novo: todos os arquivos do ZIP já existem.")
        return 1

    rels = [str(p.relative_to(root)) for p in entered]
    git(root, "add", "--", *rels)
    commit = git(root, "commit", "-q", "-m", f"docs({match.group(1)}): spec aprovada")
    if commit.returncode != 0:
        git(root, "reset", "-q", "--", *rels)
        undo(entered, new_dirs)
        print(commit.stdout + commit.stderr, end="")
        print("Importação desfeita: o commit foi recusado.")
        return 1
    for rel in rels:
        print(f"Entrou: {rel}")
    for rel in skipped:
        print(f"Pulado (já existe): {rel}")
    print("lacre conferido")
    print(f"Commit: docs({match.group(1)}): spec aprovada")
    return approve_dependencies(root, match.group(1))


def zip_lock(package, hu_id):
    """The criteria.lock bytes of HU hu_id inside the ZIP; None when the ZIP carries another HU."""
    try:
        with zipfile.ZipFile(package) as z:
            for info in z.infolist():
                if re.fullmatch(rf"docs/hu/{re.escape(hu_id)}-[^/]+/criteria\.lock", info.filename):
                    return z.read(info)
    except zipfile.BadZipFile:
        raise SystemExit(f"erro: {package} não é um ZIP válido")
    return None


# The commits that import and setup make on main, and the paths each one may touch: the subject alone proves nothing.
SETUP_PATHS = (".lux/", ".github/workflows/lux.yml", ".claude/settings.json", "lefthook.yml", "verify.config.json", ".gitignore")
INICIAR_COMMITS = (
    (re.compile(r"^docs\(HU-\d+\): spec (aprovada|v\d+)$"), ("docs/",)),
    (re.compile(r"^chore\(HU-\d+\): dependências aprovadas$"), ("verify.config.json",)),
    (re.compile(r"^chore\(CHORE-\d+\): lux iniciar prepara o projeto$"), SETUP_PATHS),
)
# files Claude Code reads as instructions or configuration, at any depth
AGENT_CONFIG = re.compile(r"(^|/)(\.claude/|\.mcp\.json$|CLAUDE\.md$)")


def foreign_commit(root):
    """Describes the first commit of origin/main..main that import and setup would not make, or None."""
    if git(root, "rev-list", "--merges", "origin/main..main").stdout.strip():
        return "merge"
    for sha in git(root, "rev-list", "origin/main..main").stdout.split():
        subject = git(root, "log", "-1", "--format=%s", sha).stdout.strip()
        allowed = next((paths for pattern, paths in INICIAR_COMMITS if pattern.match(subject)), None)
        if allowed is None:
            return subject
        touched = git(root, "-c", "core.quotePath=false", "diff-tree", "--no-commit-id", "--name-only", "-r", "--no-renames", sha).stdout.splitlines()
        stray = [p for p in touched if not any(p == a or (a.endswith("/") and p.startswith(a)) for a in allowed)]
        if stray:
            return f"{subject}: mexe em {stray[0]}"
    return None


def refuse(message):
    print(f"erro: {message}", file=sys.stderr)
    return 1


def main_in_sync(root):
    """None when main equals origin/main (or there is no origin); otherwise the reason to stop. Offers the pull when behind."""
    if "origin" not in git(root, "remote").stdout.split():
        print("Aviso: sem remoto origin; não conferi a main contra ele.")
        return None
    fetched = git(root, "fetch", "-q", "origin")
    if fetched.returncode != 0:
        return f"git fetch origin falhou: {fetched.stderr.strip()}"
    if git(root, "rev-parse", "--verify", "-q", "refs/remotes/origin/main").returncode != 0:
        print("Aviso: origin/main não existe; não conferi a main contra ele.")
        return None
    ahead, behind = (int(n) for n in git(root, "rev-list", "--left-right", "--count", "main...origin/main").stdout.split())
    if ahead and behind:
        return "a main e a origin/main divergiram; resolva no seu terminal antes de iniciar."
    if ahead:
        # a second run (or another HU) starts with the commits the first one made and the user has not pushed yet
        foreign = foreign_commit(root)
        if foreign:
            return f"a main está à frente da origin/main com commit que não é do lux iniciar ({foreign}); faça o push antes de iniciar."
        print(f"Aviso: a main está {ahead} commit(s) à frente da origin/main, todos do lux iniciar; o push é seu.")
    if behind:
        try:
            answer = input(f"A main está {behind} commit(s) atrás da origin/main. Atualizar com git pull --ff-only? [s/N] ")
        except EOFError:
            answer = ""
        if answer.strip().lower() != "s":
            return "a main está atrás da origin/main; atualize antes de iniciar."
        pulled = git(root, "pull", "-q", "--ff-only", "origin", "main")
        if pulled.returncode != 0:
            return f"git pull --ff-only falhou: {pulled.stderr.strip()}"
    return None


def setup_project(root):
    """Applies the project setup (lux atualizar-projeto plus the sandbox template) and commits it on main. 0 or an exit code."""
    ci = load_sibling("projeto_ci")
    try:
        files = ci.desired(root, update_config=True, create_settings=True)
    except ci.CiError as e:
        return refuse(str(e))
    before = {rel: (root / rel).is_file() for rel in files}
    todo = {rel: content for rel, content in files.items() if not before[rel] or (root / rel).read_bytes() != content}
    if todo:
        print("Setup do projeto (commit chore na main):")
        for rel in todo:
            print(f"  {'Atualizado' if before[rel] else 'Criado'}: {rel}")
    created_dirs = [d for d in (root / ".lux", root / ".github" / "workflows", root / ".github", root / ".claude") if not d.exists()]
    ci.write_files(root, todo)
    installed = subprocess.run(["lefthook", "install"], cwd=root, capture_output=True, text=True)
    if installed.returncode != 0:
        print(installed.stdout + installed.stderr, end="")
        return refuse("lefthook install falhou.")
    if not todo:
        print("Setup do projeto: nada a atualizar.")
        return 0
    chore = f"CHORE-{ci.next_chore(root):02d}"
    git(root, "add", "--", *todo)
    print(git(root, "--no-pager", "diff", "--cached", "--stat").stdout, end="")
    message = f"chore({chore}): lux iniciar prepara o projeto"
    commit = git(root, "commit", "-q", "-m", message)
    if commit.returncode != 0:
        print(commit.stdout + commit.stderr, end="")
        git(root, "reset", "-q")
        for rel in todo:
            git(root, "checkout", "--", rel) if before[rel] else (root / rel).unlink(missing_ok=True)
        for folder in created_dirs:
            try:
                folder.rmdir()
            except OSError:
                pass
        return refuse("setup desfeito: o commit foi recusado.")
    if ci.WORKFLOW in todo:
        ci.record_workflow(root, todo[ci.WORKFLOW])
    if "lefthook.yml" in todo:
        ci.record_workflow(root, todo["lefthook.yml"], "lefthook.yml")
    print(f"Commit: {message}")
    return 0


def iniciar(args):
    """One command from the terminal to start a HU: checks, import (when needed), project setup, then opens Claude Code
    on /lux-entregar HU-xx. Safe to run again: whatever is done is skipped."""
    if inside_claude_code("iniciar"):
        return 2
    if len(args) != 1 or not re.fullmatch(r"HU-\d+", args[0]):
        print("uso: lux iniciar HU-xx", file=sys.stderr)
        return 2
    hu_id = args[0]
    top = git(".", "rev-parse", "--show-toplevel")
    if top.returncode != 0:
        return refuse("rode dentro do repositório do projeto.")
    root = Path(top.stdout.strip())
    if root.resolve() != Path.cwd().resolve():
        return refuse(f"rode na raiz do repositório ({root}).")
    if git(root, "branch", "--show-current").stdout.strip() != "main":
        return refuse("lux iniciar só roda na main.")
    if git(root, "status", "--porcelain").stdout.strip():
        return refuse("árvore suja; commite ou guarde o que está pendente antes de iniciar.")
    reason = main_in_sync(root)
    if reason:
        return refuse(reason)

    ci = load_sibling("projeto_ci")
    problems = ci.environment_problems()
    for tool in ("claude", "lefthook", "gitleaks"):
        if not shutil.which(tool):
            problems.append(f"{tool} não encontrado no PATH")
    if problems:
        print("erro: ambiente incompleto:", file=sys.stderr)
        print("\n".join(f"  {p}" for p in problems), file=sys.stderr)
        return 1
    if not (root / "verify.config.json").is_file():
        return refuse("o projeto ainda não tem verify.config.json (rode /lux-preparar).")

    # what to do with the HU, decided before anything changes
    existing = sorted(p for p in (root / "docs/hu").glob(f"{hu_id}-*") if (p / "spec.md").is_file())
    package = newest_zip(None)
    incoming = zip_lock(package, hu_id) if package else None
    importing = False
    if existing:
        folder = existing[0]
        progress = folder / "progress.md"
        started = git(root, "rev-parse", "--verify", "-q", f"refs/heads/feature/{folder.name}").returncode == 0 \
            or (progress.is_file() and progress.read_text(encoding="utf-8").strip() != "")
        if started:
            print(f"{hu_id} em andamento: só retoma.")
            if incoming is not None and incoming != (folder / "criteria.lock").read_bytes():
                print("Aviso: o ZIP em Downloads traz outro lacre. Para importar a revisão, rode lux importar.")
        elif incoming is not None and incoming != (folder / "criteria.lock").read_bytes():
            importing = True
        else:
            print(f"{hu_id} já importada com o mesmo lacre: pulo a importação.")
    elif incoming is None:
        return refuse(f"{hu_id} não está em docs/hu/ e não achei lux-{hu_id}*.zip nem pacote-hu*.zip de {hu_id} em Downloads.")
    else:
        importing = True

    code = setup_project(root)
    if code:
        return code
    problems = ci.project_sandbox_problems(root)
    if problems:
        return refuse("\n  ".join(problems))
    before = git(root, "rev-parse", "HEAD").stdout.strip()
    if importing:
        code = importar([])
        if code:
            return code
    # the import is what brings outside files into the repo: look again before a session reads them
    problems = ci.project_sandbox_problems(root)
    if problems:
        return refuse("depois da importação: " + "\n  ".join(problems))
    touched = [p for p in git(root, "-c", "core.quotePath=false", "diff", "--name-only", before, "HEAD").stdout.splitlines() if AGENT_CONFIG.search(p)]
    if touched:
        return refuse(f"a importação mexeu em arquivo que o Claude Code lê como instrução ou configuração ({touched[0]}); revise o commit e abra o Claude Code você mesmo.")
    ci.ensure_verdict_dir(root)  # the sandbox mounts its write-denied paths when it comes up: .lux/vereditos/ has to exist by then
    print(f"Abrindo o Claude Code com /lux-entregar {hu_id}")
    sys.stdout.flush()
    os.execvp("claude", ["claude", "--permission-mode", "bypassPermissions", f"/lux-entregar {hu_id}"])


def sandbox(args):
    """Exit 0 when the settings and the machine leave the sandbox of bash on for a session opened here; 1 and the reasons otherwise."""
    if args:
        raise SystemExit("uso: lux sandbox")
    problems = load_sibling("projeto_ci").sandbox_problems(project_root())
    if problems:
        print("sandbox NÃO ativo:", *problems, sep="\n  ")
        return 1
    print("sandbox ativo")
    return 0


COMMANDS = {"lacrar": lacrar, "conferir-lacre": conferir, "conferir-plano": conferir_plano, "auditar-task": auditar_task, "pre-push": pre_push, "aprendizado": aprendizado, "verificar": verificar, "importar": importar, "iniciar": iniciar,
            "protegidos": protegidos, "testar": testar, "sandbox": sandbox,
            "atualizar-projeto": atualizar_projeto, "instalar-ci": instalar_ci, "e2e": e2e, "aparelho": aparelho}


def main(argv):
    if len(argv) < 2 or argv[1] not in COMMANDS:
        print(USAGE, file=sys.stderr)
        return 2
    return COMMANDS[argv[1]](argv[2:])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
