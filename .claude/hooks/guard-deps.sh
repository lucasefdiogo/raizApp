#!/usr/bin/env bash
# PreToolUse (Bash): warns, never blocks, when a command installs a named package that the project manifest does not declare
# yet: npm install|i|add, pnpm add|install|i, yarn add (package.json), and pip|pip3 install, python[3] -m pip install
# (requirements*.txt, pyproject.toml). The warning goes to the user (systemMessage) and to Claude (additionalContext); the
# permission is left to the normal flow. Installs from the manifest (npm install, pip install -r) are not warned about.
# Any error exits 0 in silence: this hook only informs.
# Parses with python3 (stdlib only) because jq is not guaranteed to be installed.
set -u

exec python3 -I -c '
import glob, json, os, re, shlex, sys

OPERATORS = {";", "&&", "||", "|", "&", "(", ")"}
NPM_INSTALLS = {("npm", "install"), ("npm", "i"), ("npm", "add"), ("pnpm", "add"), ("pnpm", "install"), ("pnpm", "i"), ("yarn", "add")}
# flags that take a value: the value is not a package
VALUE_FLAGS = {"-r", "--requirement", "-e", "--editable", "-c", "--constraint", "-f", "--find-links", "-i", "--index-url",
               "--extra-index-url", "--registry", "--prefix", "-w", "--workspace", "-C", "--dir", "--cwd", "--filter",
               "--target", "-t", "--root", "--tag"}
PY_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")


def quiet(*_):
    os._exit(0)


sys.excepthook = quiet


def segments(command):
    lexer = shlex.shlex(command.replace("\n", " ; "), posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    argv, out = [], []
    for tok in lexer:
        if tok in OPERATORS:
            if argv:
                out.append(argv)
            argv = []
        else:
            argv.append(tok)
    return out + ([argv] if argv else [])


def packages(args):
    """Positional args that name a package (flag values skipped)."""
    names, skip = [], False
    for a in args:
        if skip:
            skip = False
        elif a in VALUE_FLAGS:
            skip = True
        elif not a.startswith("-"):
            names.append(a)
    return names


def npm_name(spec):
    """Package name of an npm spec (name, name@range, @scope/name@range); None for paths, URLs and git specs."""
    if spec.startswith((".", "/", "~")) or ":" in spec or ("/" in spec and not spec.startswith("@")):
        return None
    at = spec.find("@", 1)
    return spec[:at] if at > 0 else spec


def py_norm(name):
    return re.sub(r"[-_.]+", "-", name).lower()


def nearest(start, patterns):
    """Files matching patterns in the closest folder (start or above) that has any."""
    folder = start
    while True:
        found = [p for pattern in patterns for p in sorted(glob.glob(os.path.join(glob.escape(folder), pattern)))]
        if found:
            return found
        parent = os.path.dirname(folder)
        if parent == folder:
            return []
        folder = parent


def npm_known(cur):
    known = set()
    for path in nearest(cur, ["package.json"]):
        try:
            data = json.load(open(path, encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for key in ("dependencies", "devDependencies", "optionalDependencies", "peerDependencies"):
            if isinstance(data.get(key), dict):
                known |= set(data[key])
    return known, "package.json"


def py_known(cur):
    known = set()
    for path in nearest(cur, ["requirements*.txt", "pyproject.toml"]):
        try:
            text = open(path, encoding="utf-8").read()
        except OSError:
            continue
        # every name-like word: a superset of the declared names, so a declared one is never reported as new
        known |= {py_norm(w) for w in PY_NAME.findall(text)}
    return known, "requirements*.txt/pyproject.toml"


def new_packages(argv, cur):
    """(new package names, manifest label) for an install argv, or None when argv is not an install of named packages."""
    prog = os.path.basename(argv[0])
    if prog in ("python", "python3") and argv[1:3] == ["-m", "pip"]:
        argv, prog = ["pip"] + argv[3:], "pip"
    if len(argv) < 2:
        return None
    if (prog, argv[1]) in NPM_INSTALLS:
        names = [n for n in map(npm_name, packages(argv[2:])) if n]
        known, label = npm_known(cur)
        return [n for n in names if n not in known], label
    if prog in ("pip", "pip3") and argv[1] == "install":
        names = [m.group(0) for m in map(PY_NAME.match, packages(argv[2:])) if m]
        known, label = py_known(cur)
        return [n for n in names if py_norm(n) not in known], label
    return None


try:
    data = json.load(sys.stdin)
    command = data.get("tool_input", {}).get("command") or ""
    cur = os.path.realpath(data.get("cwd") or ".")
except (ValueError, AttributeError):
    sys.exit(0)

found, manifests = [], []
for argv in segments(command):
    while argv and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", argv[0]):
        argv = argv[1:]
    if not argv:
        continue
    if argv[0] in ("cd", "pushd"):
        dest = next((a for a in argv[1:] if not a.startswith("-")), "~")
        cur = os.path.realpath(os.path.join(cur, os.path.expanduser(dest)))
        continue
    result = new_packages(argv, cur)
    if result and result[0]:
        found += [n for n in result[0] if n not in found]
        manifests.append(result[1])

if found:
    names = ", ".join(found)
    where = ", ".join(dict.fromkeys(manifests))
    print(json.dumps({
        "systemMessage": f"guard-deps: dependência nova, fora do manifesto do projeto: {names}.",
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "additionalContext": f"guard-deps: o comando instala pacotes que o manifesto ({where}) "
                                 f"ainda não declara: {names}. O dono do projeto pede para ser consultado antes de uma "
                                 "dependência nova (motivo, versão e licença).",
        },
    }, ensure_ascii=False))
sys.exit(0)
'
