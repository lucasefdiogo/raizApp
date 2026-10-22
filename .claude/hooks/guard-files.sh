#!/usr/bin/env bash
# PreToolUse (Edit|Write): reads the hook JSON from stdin and denies writes through which the agent could widen its own
# permissions: the project's .claude/ (settings, hooks, agents, skills; at any depth inside the project), any .git/hooks/,
# and the global ~/.claude/settings*.json, ~/.claude/hooks/ and ~/.claude/agents/. The Write and Edit tools run outside
# the bash sandbox, so its denyWrite does not see them. Exit 0 lets the write go on to the normal permission flow; exit 2
# blocks it and shows stderr to Claude.
# Parses with python3 (stdlib only) because jq is not guaranteed to be installed.
set -u

exec python3 -I -c '
import json, os, re, subprocess, sys


def crash(*_):
    # an unhandled exception would exit 1, which does not block the tool call
    print("guard-files: erro interno; bloqueando por segurança.", file=sys.stderr)
    os._exit(2)


sys.excepthook = crash


def block(msg):
    print(msg, file=sys.stderr)
    sys.exit(2)


def project_root(cwd):
    """The session project: $CLAUDE_PROJECT_DIR, else the git root of cwd, else cwd."""
    given = os.environ.get("CLAUDE_PROJECT_DIR")
    if given:
        return os.path.realpath(given)
    try:
        out = subprocess.run(["git", "-C", cwd, "rev-parse", "--show-toplevel"], capture_output=True, text=True, timeout=3)
        if out.returncode == 0 and out.stdout.strip():
            return os.path.realpath(out.stdout.strip())
    except (OSError, subprocess.SubprocessError):
        pass
    return os.path.realpath(cwd)


try:
    data = json.load(sys.stdin)
    path = data.get("tool_input", {}).get("file_path") or ""
except (ValueError, AttributeError):
    block("guard-files: entrada JSON inválida; bloqueando por segurança.")
if not path:
    sys.exit(0)

cwd = data.get("cwd") or os.getcwd()
# symlinks are resolved so a link cannot smuggle a write into a protected place
path = os.path.realpath(os.path.join(cwd, os.path.expanduser(path)))
root = project_root(cwd)
claude_home = os.path.realpath(os.path.expanduser("~/.claude"))

if re.search(r"(^|/)\.git/hooks(/|$)", path):
    block(f"Arquivo protegido: {path} (hooks do git; só o dono do projeto altera, no terminal).")
inside = os.path.relpath(path, root)
if not inside.startswith("..") and re.search(r"(^|/)\.claude(/|$)", inside):
    block(f"Arquivo protegido: {path} (a pasta .claude/ do projeto guarda permissões, hooks e agentes; só o dono do projeto altera, no terminal).")
if os.path.dirname(path) == claude_home and re.fullmatch(r"settings[^/]*\.json", os.path.basename(path)):
    block(f"Arquivo protegido: {path} (permissões globais do Claude Code; só o dono altera, com o install.sh).")
# a global hook or agent would run in every future session, outside the sandbox of this one; skills and memory stay free
in_home = os.path.relpath(path, claude_home)
if not in_home.startswith("..") and in_home.split(os.sep)[0] in ("hooks", "agents"):
    block(f"Arquivo protegido: {path} (hooks e agentes globais valem para todas as sessões futuras; só o dono altera, no terminal).")
sys.exit(0)
'
