#!/usr/bin/env python3
"""lux: single entry point of the Luxthor kit in the terminal (stdlib only).

lacrar, conferir-lacre and verificar call the sibling scripts; importar brings the ZIP made by
the lux-especificar skill into the repository. The lock file is still called criteria.lock.
"""
import glob
import importlib.util
import json
import os
import re
import subprocess
import sys
import time
import zipfile
from pathlib import Path

sys.dont_write_bytecode = True  # sibling scripts are loaded by path: no __pycache__ in .lux/ (it would dirty the tree)
HERE = Path(__file__).resolve().parent
DOWNLOADS = "/mnt/c/Users/*/Downloads"
ZIP_PATTERNS = ("lux-HU-*.zip", "pacote-hu*.zip")
USAGE = "uso: lux lacrar|conferir-lacre|verificar|importar|protegidos|testar|atualizar-projeto|instalar-ci|e2e|aparelho [argumentos]"


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
    """lacrar and importar are the user's own commands: the agent never runs them."""
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
    """.lux/ and .github/workflows/ against main. --ci (GitHub Actions) only warns and always exits 0."""
    if args not in ([], ["--ci"]):
        raise SystemExit("uso: lux protegidos [--ci]")
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
        specs = [m.filename for m in members if re.fullmatch(r"docs/hu/[^/]+/spec\.md", m.filename)]
        if len(specs) != 1:
            print(f"erro: o ZIP deve ter exatamente uma HU (achei {len(specs)}).", file=sys.stderr)
            return 1
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


COMMANDS = {"lacrar": lacrar, "conferir-lacre": conferir, "verificar": verificar, "importar": importar,
            "protegidos": protegidos, "testar": testar,
            "atualizar-projeto": atualizar_projeto, "instalar-ci": instalar_ci, "e2e": e2e, "aparelho": aparelho}


def main(argv):
    if len(argv) < 2 or argv[1] not in COMMANDS:
        print(USAGE, file=sys.stderr)
        return 2
    return COMMANDS[argv[1]](argv[2:])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
