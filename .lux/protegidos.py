"""Protected CI files (stdlib only): .lux/, .github/workflows/ and lefthook.yml must match main or a source the agent cannot write.

Used by verify.py (pendency PROTEGIDOS, on every branch) and by `lux protegidos`. Locally a changed file is accepted
when it equals the installed kit copy (.lux/x -> ~/.claude/lux/x) or, for workflows and lefthook.yml (it holds the pre-push
that recomputes the verify), when its sha256 is the one that `lux atualizar-projeto` or `lux iniciar` recorded in
~/.claude/lux/estado/<repo>.json. CI cannot see ~/.claude, so there (ci=True) every difference from main is only reported.
`merged_changes` lists the protected files a HU's merge brought, for the final report.
"""
import importlib.util
import re
import hashlib
import json
import os
import subprocess
from pathlib import Path

LUX_DIR = ".lux/"
WORKFLOWS_DIR = ".github/workflows/"
LEFTHOOK = "lefthook.yml"


def git(root, *args):
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True)


def kit_home():
    return Path(os.path.expanduser("~")) / ".claude" / "lux"


def changed(root, base="refs/heads/main", tip="HEAD"):
    """Protected paths whose content on the tip (HEAD) differs from the base (refs/heads/main): added, changed or deleted."""
    out = git(root, "diff", "--name-only", "-z", "--no-renames", base, tip, "--", ".lux", ".github/workflows", LEFTHOOK)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.decode(errors="replace").strip() or "git diff falhou")
    return sorted(p for p in out.stdout.decode().split("\0") if p.startswith((LUX_DIR, WORKFLOWS_DIR)) or p == LEFTHOOK)


def recorded_workflows(root):
    state = kit_home() / "estado" / f"{Path(root).resolve().name}.json"
    try:
        found = json.loads(state.read_text(encoding="utf-8")).get("workflows", {})
        return found if isinstance(found, dict) else {}
    except (OSError, ValueError, AttributeError):
        return {}


def accepted(root, path, workflows, tip="HEAD"):
    blob = git(root, "show", f"{tip}:{path}")
    if blob.returncode != 0:  # deleted on the branch: nothing can approve removing the CI
        return False
    if path.startswith(LUX_DIR):
        try:
            return (kit_home() / path[len(LUX_DIR):]).read_bytes() == blob.stdout
        except OSError:
            return False
    return workflows.get(path) == hashlib.sha256(blob.stdout).hexdigest()


def merged_changes(root, hu_id):
    """Protected files (escopo.is_protected) that the merge of a HU brought into main, or that the checked-out branch has against main
    when it is not merged yet; the HU's own tasks.md, progress.md and verification.md are the expected exceptions."""
    escopo_path = Path(__file__).resolve().parent / "escopo.py"
    spec = importlib.util.spec_from_file_location("escopo", escopo_path)
    escopo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(escopo)
    found = git(root, "log", "--first-parent", "--merges", "--format=%H", "-n", "1", f"--grep=^Merge {re.escape(hu_id)}:", "refs/heads/main")
    merge = found.stdout.decode().strip() if found.returncode == 0 else ""
    span = f"{merge}^1...{merge}^2" if merge else "refs/heads/main...HEAD"
    out = git(root, "-c", "core.quotePath=false", "diff", "--name-only", "-z", "--no-renames", span, "--")
    if out.returncode != 0:
        raise RuntimeError(out.stderr.decode(errors="replace").strip() or "git diff falhou")
    own = re.compile(rf"^docs/hu/{re.escape(hu_id)}-[^/]+/(tasks|progress|verification)\.md$")
    return sorted(p for p in out.stdout.decode().split("\0") if p and escopo.is_protected(p) and not own.match(p))


def problems(root, ci=False, base="refs/heads/main", tip="HEAD"):
    """Local: one PROTEGIDOS line per path not accepted. CI: the warning lines for every changed path."""
    paths = changed(root, base, tip)
    if ci:
        return [f"::warning::mudança em arquivo protegido: {p}\nmudança em arquivo protegido: {p}" for p in paths]
    workflows = recorded_workflows(root)
    return [
        f"PROTEGIDOS: {p} difere da main e " + ("da cópia instalada em ~/.claude/lux" if p.startswith(LUX_DIR)
                                                else "do hash registrado pelo lux atualizar-projeto")
        for p in paths if not accepted(root, p, workflows, tip)
    ]
