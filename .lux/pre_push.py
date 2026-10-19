#!/usr/bin/env python3
"""Recalculation of the verify over what a push sends to main (stdlib only; `lux pre-push`, called by the lefthook pre-push).

Nothing local is trusted: not verification.md, not the marker of /lux-validar. For each HU or fix merged by the commits being sent,
verify.py runs again (seal, criteria, dependencies, protected files, and the suite on the working tree) with the base at what main
had before that merge (its first parent) and the tip at the merged branch (its second parent), so a branch cannot approve its own
dependencies and a spec revision imported on main earlier is not read as an edit. A merge named `Merge HU-xx:` or `Merge FIX-xx:`
that brought no verification.md is refused. Pushes to other branches are not looked at.
stdin is git's: "<local ref> <local sha> <remote ref> <remote sha>" per line. Exit 0: the push may go; 1: it may not.
"""
import re
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ZERO = "0" * 40
PROTECTED_BRANCHES = ("refs/heads/main", "refs/heads/master")
UNIT = re.compile(r"^docs/(hu|fixes)/([^/]+)/verification\.md$")


def git(root, *args):
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)


def out(root, *args):
    done = git(root, *args)
    return done.stdout.strip() if done.returncode == 0 else None


def units_of(root, base, local):
    """([(kind, folder, base rev, tip rev)], [reasons it cannot be decided]) for the commits base..local."""
    rng = f"{base}..{local}" if base else local
    units, refusals, seen = {}, [], set()
    merges = (out(root, "rev-list", "--merges", "--first-parent", "--reverse", rng) or "").split()
    for merge in merges:
        parents = (out(root, "rev-list", "--parents", "-n", "1", merge) or "").split()[1:]
        names = (out(root, "diff", "--name-only", f"{merge}^1", merge) or "").splitlines()
        found = [m for m in map(UNIT.match, names) if m]
        subject = out(root, "log", "-1", "--format=%s", merge) or ""
        if len(parents) != 2:
            refusals.append(f"{merge[:7]} é um merge com {len(parents)} pais; só o merge de duas pontas de uma HU ou fix é conhecido")
            continue
        if not found and re.match(r"Merge (HU|FIX)-\d+", subject):
            refusals.append(f"{merge[:7]} \"{subject}\" não trouxe nenhum verification.md: a HU ou o fix não passou pelo /lux-validar")
        for match in found:
            units[(match.group(1), match.group(2))] = (parents[0], parents[1])
            seen.add(match.group(0))
    changed = (out(root, "diff", "--name-only", base, local) if base else out(root, "ls-tree", "-r", "--name-only", local)) or ""
    for name in changed.splitlines():  # a verification.md that arrived without a merge (a commit made by hand on main)
        match = UNIT.match(name)
        if match and name not in seen:
            units[(match.group(1), match.group(2))] = (base or local, "HEAD")
    return [(kind, folder, b, t) for (kind, folder), (b, t) in units.items()], refusals


def recalc(root, kind, folder, base, tip, run):
    """Runs verify.py for one unit; returns its pendency lines ([] when it passes)."""
    path = f"docs/{'hu' if kind == 'hu' else 'fixes'}/{folder}"
    if not (Path(root) / path).is_dir():
        return [f"{path} não existe na árvore de trabalho"]
    args = [sys.executable, "-I", str(HERE / "verify.py"), "--base", base, "--tip", tip]
    if kind == "fixes":
        args.append("--fix")
    if not run:
        args.append("--no-run")
    done = subprocess.run([*args, path], cwd=root, capture_output=True, text=True)
    if done.returncode == 0:
        return []
    return (done.stdout + done.stderr).strip().splitlines() or [f"verify.py saiu com {done.returncode} sem dizer o motivo"]


def check_push(root, local, remote):
    """Pendency lines for one ref being sent to main; [] lets it go."""
    if set(local) == {"0"}:
        return ["apagar a main não é um push que este portão libere"]
    head = out(root, "rev-parse", "HEAD")
    if head != local:
        return [f"o recálculo roda a suíte na árvore de trabalho e ela está em {str(head)[:7]}, não em {local[:7]} (o que vai ser enviado): faça checkout da main"]
    base = None if set(remote) == {"0"} else remote
    if base and git(root, "merge-base", "--is-ancestor", base, local).returncode != 0:
        return [f"{local[:7]} não contém {base[:7]} (o que a origin tem): faltou integrar; o push seria recusado ou reescreveria a main"]
    units, problems = units_of(root, base, local)
    first = True
    for kind, folder, ubase, tip in units:
        lines = recalc(root, kind, folder, ubase, tip, run=first)
        first = False  # the suite runs once; the next units read the report it left
        problems += [f"{folder}: {line}" for line in lines]
        print(f"pre-push: {folder} {'reprovou' if lines else 'recalculado'} contra {ubase[:7]}", file=sys.stderr)
    if not units and not problems:
        print("pre-push: nenhuma HU ou fix nos commits enviados à main; nada a recalcular", file=sys.stderr)
    return problems


def main(argv):
    root = git(".", "rev-parse", "--show-toplevel").stdout.strip()
    if not root:
        print("pre-push: fora de um repositório git", file=sys.stderr)
        return 1
    pushes = []
    for line in sys.stdin.read().splitlines():
        parts = line.split()
        if len(parts) == 4:
            pushes.append(parts)
    if not pushes:  # no refs on stdin: judge the branch checked out, the one a bare `git push` sends
        branch = out(root, "symbolic-ref", "HEAD")
        if branch in PROTECTED_BRANCHES:
            pushes.append([branch, out(root, "rev-parse", "HEAD") or ZERO, branch, out(root, "rev-parse", "--verify", "-q", f"refs/remotes/origin/{branch.rsplit('/', 1)[1]}") or ZERO])
    problems = []
    for _, local, remote_ref, remote in pushes:
        if remote_ref in PROTECTED_BRANCHES:
            problems += check_push(root, local, remote)
    if problems:
        print("pre-push: o push da main não sai; o recálculo achou:", file=sys.stderr)
        print("\n".join(f"  {p}" for p in problems), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
