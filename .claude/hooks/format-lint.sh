#!/usr/bin/env bash
# PostToolUse (Edit|Write): formats the file the call just wrote, with the formatter the project configures at its root:
#   .prettierrc, .prettierrc.* or prettier.config.*  -> prettier --write (web files)
#   .eslintrc* or eslint.config.*                     -> eslint --fix (script files), after prettier
#   pyproject.toml with [tool.ruff] or [tool.black]   -> ruff format, else black (Python files)
# Only the project's own binaries run (node_modules/.bin; .venv/bin, venv/bin, then PATH for Python), never npx: nothing is
# downloaded. No config, no binary, another file type or a formatter error: nothing happens, in silence. Never blocks.
# Parses with python3 (stdlib only) because jq is not guaranteed to be installed.
set -u

exec python3 -I -c '
import glob, json, os, re, shutil, subprocess, sys

PRETTIER_TYPES = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts", ".json", ".css", ".scss", ".less",
                  ".html", ".vue", ".md", ".mdx", ".yaml", ".yml", ".graphql"}
ESLINT_TYPES = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"}
PYTHON_TYPES = {".py", ".pyi"}


def quiet(*_):
    os._exit(0)


sys.excepthook = quiet


def has(root, *patterns):
    return any(glob.glob(os.path.join(glob.escape(root), p)) for p in patterns)


def node_bin(root, name):
    path = os.path.join(root, "node_modules", ".bin", name)
    return path if os.access(path, os.X_OK) else None


def python_bin(root, name):
    for venv in (".venv", "venv"):
        path = os.path.join(root, venv, "bin", name)
        if os.access(path, os.X_OK):
            return path
    return shutil.which(name)


def pyproject_tools(root):
    try:
        text = open(os.path.join(root, "pyproject.toml"), encoding="utf-8").read()
    except OSError:
        return set()
    return set(re.findall(r"^\[tool\.(ruff|black)[\].]", text, re.M))


def commands(root, path):
    """The formatter commands for path, in the order they run."""
    ext = os.path.splitext(path)[1].lower()
    out = []
    if ext in PRETTIER_TYPES and has(root, ".prettierrc", ".prettierrc.*", "prettier.config.*"):
        binary = node_bin(root, "prettier")
        out += [[binary, "--write", "--ignore-unknown", path]] if binary else []
    if ext in ESLINT_TYPES and has(root, ".eslintrc", ".eslintrc.*", "eslint.config.*"):
        binary = node_bin(root, "eslint")
        out += [[binary, "--fix", path]] if binary else []
    if ext in PYTHON_TYPES:
        tools = pyproject_tools(root)
        name = "ruff" if "ruff" in tools else "black" if "black" in tools else None
        binary = python_bin(root, name) if name else None
        if binary:
            out.append([binary, "format", "--quiet", path] if name == "ruff" else [binary, "--quiet", path])
    return out


data = json.load(sys.stdin)
cwd = data.get("cwd") or os.getcwd()
path = (data.get("tool_input") or {}).get("file_path") or ""
root = os.path.realpath(os.environ.get("CLAUDE_PROJECT_DIR") or cwd)
path = os.path.realpath(os.path.join(cwd, path)) if path else ""
if not path or not os.path.isfile(path) or not path.startswith(root + os.sep):
    sys.exit(0)
for command in commands(root, path):
    try:
        subprocess.run(command, cwd=root, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, timeout=20)
    except (OSError, subprocess.SubprocessError):
        pass
sys.exit(0)
'
