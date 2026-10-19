"""Protected CI files (stdlib only): .lux/ and .github/workflows/ must match main or a source the agent cannot write.

Used by verify.py (pendency PROTEGIDOS, on every branch) and by `lux protegidos`. Locally a changed file is accepted
when it equals the installed kit copy (.lux/x -> ~/.claude/lux/x) or, for workflows, when its sha256 is the one that
`lux atualizar-projeto` recorded in ~/.claude/lux/estado/<repo>.json. CI cannot see ~/.claude, so there (ci=True)
every difference from main is only reported.
"""
import hashlib
import json
import os
import subprocess
from pathlib import Path

LUX_DIR = ".lux/"
WORKFLOWS_DIR = ".github/workflows/"


def git(root, *args):
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True)


def kit_home():
    return Path(os.path.expanduser("~")) / ".claude" / "lux"


def changed(root):
    """Protected paths whose content on HEAD differs from refs/heads/main (added, changed or deleted)."""
    out = git(root, "diff", "--name-only", "-z", "--no-renames", "refs/heads/main", "HEAD", "--", ".lux", ".github/workflows")
    if out.returncode != 0:
        raise RuntimeError(out.stderr.decode(errors="replace").strip() or "git diff falhou")
    return sorted(p for p in out.stdout.decode().split("\0") if p.startswith((LUX_DIR, WORKFLOWS_DIR)))


def recorded_workflows(root):
    state = kit_home() / "estado" / f"{Path(root).resolve().name}.json"
    try:
        found = json.loads(state.read_text(encoding="utf-8")).get("workflows", {})
        return found if isinstance(found, dict) else {}
    except (OSError, ValueError, AttributeError):
        return {}


def accepted(root, path, workflows):
    blob = git(root, "show", f"HEAD:{path}")
    if blob.returncode != 0:  # deleted on the branch: nothing can approve removing the CI
        return False
    if path.startswith(LUX_DIR):
        try:
            return (kit_home() / path[len(LUX_DIR):]).read_bytes() == blob.stdout
        except OSError:
            return False
    return workflows.get(path) == hashlib.sha256(blob.stdout).hexdigest()


def problems(root, ci=False):
    """Local: one PROTEGIDOS line per path not accepted. CI: the warning lines for every changed path."""
    paths = changed(root)
    if ci:
        return [f"::warning::mudança em arquivo protegido: {p}\nmudança em arquivo protegido: {p}" for p in paths]
    workflows = recorded_workflows(root)
    return [
        f"PROTEGIDOS: {p} difere da main e " + ("da cópia instalada em ~/.claude/lux" if p.startswith(LUX_DIR)
                                                else "do hash registrado pelo lux atualizar-projeto")
        for p in paths if not accepted(root, p, workflows)
    ]
