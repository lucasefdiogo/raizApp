"""Scope of a task in tasks.md, in a form a script can read (stdlib only; CHORE-17).

Each task declares, as sub-bullets under it:
    - CAs: CA-01, CA-02
    - Arquivos: src/tarefas/**, tests/tarefas/
    - Comandos: teste, lint, tipos          (teste, lint, tipos, build, instalacao, e2e; `nenhum` is allowed)
    - Instala: zod@3.23.8                   (`nenhuma` when the task installs nothing)

`lux conferir-plano` checks the declarations before the code exists; `lux auditar-task` checks the work against them.
A glob covers the path it names and everything under it (`src/tarefas` and `src/tarefas/**` are the same scope);
`*` stays inside a folder, `**` crosses folders, there are no braces.
"""
import fnmatch
import re
import unicodedata
from dataclasses import dataclass, field

CATEGORIES = ("teste", "lint", "tipos", "build", "instalacao", "e2e")
KEYS = ("CAs", "Arquivos", "Comandos", "Instala")
EMPTY = {"nenhum", "nenhuma", "-", "—"}
TASK = re.compile(r"^- \[[ xX]\] (TASK-\d+)")
KEY_LINE = re.compile(r"^\s*-\s*(CAs|Arquivos|Comandos|Instala):[ \t]*(.*?)\s*$")

# Files a task of a HU never owns. Anchored roots are relative to the repository root; the others count at any depth,
# because Claude Code reads them as instructions or configuration wherever they are (like the push check of guard-bash).
ANCHORED = ((".claude",), (".lux",), (".github", "workflows"), ("lefthook.yml",), ("verify.config.json",), ("CLAUDE.md",), ("docs", "hu"))
ANCHORED_FILES = {"lefthook.yml", "verify.config.json", "CLAUDE.md"}
ANYWHERE = ((".claude",), ("CLAUDE.md",), (".mcp.json",))
ANYWHERE_FILES = {"CLAUDE.md", ".mcp.json"}


# What counts as a test file by its name: lux auditar-task reads these for skipped or weakened tests and verify --fix for the regression test
TEST_FILE = re.compile(r"(\.(test|spec)\.[jt]sx?$)|((^|/)test_[^/]*\.py$)|(_test\.py$)|((^|/)[A-Za-z0-9_]*Tests?\.java$)|(\.feature$)|((^|/)__tests__/)|((^|/)e2e/.+\.(ya?ml|[jt]s)$)")


@dataclass
class Scope:
    task: str
    done: bool = False
    cas: list = field(default_factory=list)
    files: list = field(default_factory=list)
    commands: list = field(default_factory=list)
    installs: list = field(default_factory=list)
    unknown_commands: list = field(default_factory=list)
    missing: list = field(default_factory=list)  # keys absent, empty or unusable


def plain(text):
    text = unicodedata.normalize("NFD", text.strip().strip("`").lower())
    return "".join(c for c in text if not unicodedata.combining(c))


def items(value):
    return [v.strip().strip("`").strip() for v in value.split(",") if v.strip().strip("`").strip()]


def parse_scopes(text):
    """{task id: Scope} for every task of a tasks.md."""
    scopes, raw, seen = {}, {}, None
    for line in text.splitlines():
        task = TASK.match(line)
        if task:
            scopes[task.group(1)] = Scope(task.group(1), done=line.startswith(("- [x]", "- [X]")))
            seen = raw[task.group(1)] = {}
            continue
        key = KEY_LINE.match(line)
        if key and seen is not None:
            seen[key.group(1)] = key.group(2)
    for task_id, scope in scopes.items():
        seen = raw[task_id]
        values = {k: items(seen[k]) if k in seen else None for k in KEYS}
        scope.cas = [v for v in (values["CAs"] or []) if re.fullmatch(r"CA-\d+", v)]
        scope.files = values["Arquivos"] or []
        commands = [plain(v) for v in values["Comandos"] or []]
        scope.unknown_commands = [c for c in commands if c not in CATEGORIES and c not in EMPTY]
        scope.commands = [c for c in commands if c in CATEGORIES]
        scope.installs = [] if values["Instala"] is None or {plain(v) for v in values["Instala"]} <= EMPTY else values["Instala"]
        if not scope.cas:
            scope.missing.append("CAs")
        if not scope.files:
            scope.missing.append("Arquivos")
        if values["Comandos"] is None or not values["Comandos"]:
            scope.missing.append("Comandos")
        if values["Instala"] is None or not values["Instala"]:
            scope.missing.append("Instala")
    return scopes


def segments(pattern):
    return [s for s in pattern.strip().strip("/").split("/") if s not in ("", ".")]


def _covers(p, s):
    if not p:
        return True  # the pattern named this path or a folder above it
    if p[0] == "**":
        return _covers(p[1:], s) or bool(s) and _covers(p, s[1:])
    if not s:
        return all(x == "**" for x in p)
    return fnmatch.fnmatchcase(s[0], p[0]) and _covers(p[1:], s[1:])


def matches(pattern, path):
    """True when the glob covers the path (a folder glob covers what is under it)."""
    return _covers(segments(pattern), segments(path))


def _reach(p, root, root_is_dir):
    """True when some path the pattern covers is the protected root, under it, or the pattern covers a folder above it."""
    if not root:
        return root_is_dir or all(x == "**" for x in p)
    if not p:
        return True
    if p[0] == "**":
        return _reach(p[1:], root, root_is_dir) or _reach(p, root[1:], root_is_dir)
    return fnmatch.fnmatchcase(root[0], p[0]) and _reach(p[1:], root[1:], root_is_dir)


def reaches_protected(pattern):
    """The protected path ("/"-joined) that the glob can cover, or None."""
    p = segments(pattern)
    for root in ANCHORED:
        if _reach(p, list(root), root[-1] not in ANCHORED_FILES):
            return "/".join(root)
    for root in ANYWHERE:
        # deeper copies need a segment that names something; a bare `*` or `**` does not
        for i in range(len(p)):
            if p[i] not in ("*", "**") and _reach(p[i:], list(root), root[-1] not in ANYWHERE_FILES):
                return "/".join(root)
    return None


def is_protected(path):
    s = segments(path)
    for root in ANCHORED:
        if s[:len(root)] == list(root):
            return True
    for root in ANYWHERE:
        name = root[-1]
        if name in ANYWHERE_FILES and s and s[-1] == name:
            return True
        if name not in ANYWHERE_FILES and name in s[:-1]:
            return True
    return False
