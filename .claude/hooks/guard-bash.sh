#!/usr/bin/env bash
# PreToolUse (Bash): reads the hook JSON from stdin and denies the commands that are never the agent's to run:
# git push --force/-f/+refspec, git push --no-verify, git reset --hard, git clean, git branch -D, LEFTHOOK* in the
# environment, writes to .git/hooks/, and moving main/master by hand (git commit-tree on top of it, git update-ref,
# git symbolic-ref, git reset, git branch -f, git checkout -B, git fetch/pull into it, git push from a local repo): a merge the sandbox stopped is the user's to do, not something to rebuild another way. A merge
# into main/master, or a checkout of it, that would write to .claude/ is stopped up front with that same message.
# git pull on main/master is denied outright: telling what it brings needs the network, and hooks run outside the
# sandbox, so the agent runs git fetch (sandboxed) and then git merge (checked here). Exit 0 lets the command go on to the normal permission flow (the hook never
# approves anything); exit 2 blocks it and shows stderr to Claude.
# Not a shell parser: it closes the obvious ways. The sandbox denyWrite of .git/hooks is the OS-level layer.
# Parses with python3 (stdlib only) because jq is not guaranteed to be installed.
set -u

exec python3 -I -c '
import json, os, re, shlex, subprocess, sys

OPERATORS = {";", "&&", "||", "|", "&", "(", ")"}
SHELLS = {"sh", "bash", "zsh", "dash"}
WRAPPERS = {"env", "command", "exec", "nohup", "time", "nice", "timeout", "xargs", "stdbuf", "sudo", "builtin",
            "{", "!", "if", "then", "else", "elif", "do", "while", "until"}
HOOK_BYPASS_VAR = re.compile(r"^LEFTHOOK\w*=")
GIT_HOOKS = re.compile(r"(^|/)\.git/hooks(/|$)")
MUTATORS = {"tee", "mv", "rm", "cp", "install", "truncate", "ln", "dd", "touch", "chmod", "chown", "rsync",
            "patch", "unlink", "shred", "rmdir"}
REDIRECT = re.compile(r"^[<>|&]*>[<>|&]*$")
SUBSTITUTION = re.compile(r"\$\(([^()]*)\)|`([^`]*)`")
PROTECTED_BRANCHES = ("main", "master")
PROTECTED_REF = re.compile(r"^refs/heads/(main|master)")
MANUAL_MERGE = ("Mover main/master por fora do merge normal bloqueado: um merge que o sandbox parou é seu, "
                "faça você mesmo, fora do Claude Code. Não procure outro caminho.")
# .git/hooks/ is never tracked, so a merge or checkout only reaches the sandbox denyWrite through .claude/
PROTECTED_PATHS = (".claude/",)
PROTECTED_MERGE = ("Esse merge precisa escrever em arquivos protegidos — mergeie você mesmo, fora do Claude Code. "
                   "O sandbox nega escrita em .claude/ e .git/hooks/; não procure outro caminho.")
RESET_MODES = {"--soft", "--mixed", "--hard", "--keep", "--merge"}
TRANSFER_VALUE_OPTIONS = ("-o", "--push-option", "--receive-pack", "--exec", "--upload-pack", "--depth", "-j", "--jobs",
                          "--repo")
PULL_ON_MAIN = ("git pull na main/master bloqueado: rode git fetch e depois git merge, que confere se o merge "
                "escreveria em .claude/ ou .git/hooks/. Se escrever, mergeie você mesmo, fora do Claude Code.")
MERGE_VALUE_OPTIONS = ("-m", "-F", "-s", "-X", "--file", "--strategy", "--strategy-option", "--into-name")


def crash(*_):
    # an unhandled exception would exit 1, which does not block the tool call
    print("guard-bash: erro interno; bloqueando por segurança.", file=sys.stderr)
    os._exit(2)


sys.excepthook = crash


def block(msg):
    print(msg, file=sys.stderr)
    sys.exit(2)


def tokenize(cmd):
    lexer = shlex.shlex(cmd.replace("\n", " ; "), posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    return list(lexer)


def segments(tokens):
    """Yields the argv of each simple command."""
    argv = []
    for tok in tokens:
        if tok in OPERATORS:
            if argv:
                yield argv
            argv = []
        else:
            argv.append(tok)
    if argv:
        yield argv


def strip_prefix(argv):
    """argv without leading VAR=value assignments and wrappers such as env, timeout or sudo (and their options)."""
    while argv and (re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", argv[0]) or os.path.basename(argv[0]) in WRAPPERS):
        argv = argv[1:]
        while argv and (argv[0].startswith("-") or re.match(r"^[0-9.]+[smhd]?$", argv[0])):
            argv = argv[1:]
    return argv


def git_sub(argv, cur):
    """(subcommand, args after it, directory it runs in) of a git argv, skipping global options such as -C dir."""
    i = 1
    while i < len(argv):
        if argv[i] in ("-C", "-c", "--git-dir", "--work-tree", "--namespace") and i + 1 < len(argv):
            if argv[i] == "-C":
                cur = os.path.realpath(os.path.join(cur, os.path.expanduser(argv[i + 1])))
            i += 2
        elif argv[i].startswith("-"):
            i += 1
        else:
            return argv[i], argv[i + 1:], cur
    return None, [], cur


def short_flag(args, letter):
    """True when some -abc cluster holds the letter."""
    return any(re.fullmatch(rf"-[A-Za-z]*{letter}[A-Za-z]*", a) for a in args)


def git_out(repo, *args):
    """stdout of a read-only git command run in repo, or None when it fails."""
    try:
        done = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, timeout=3)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return done.stdout.strip() if done.returncode == 0 else None


def current_branch(repo):
    return git_out(repo, "symbolic-ref", "--quiet", "--short", "HEAD")


def positional(args, with_value):
    """The non-option args, skipping the value of the options in with_value."""
    out, skip = [], False
    for a in args:
        if skip:
            skip = False
        elif a in with_value:
            skip = True
        elif not a.startswith("-"):
            out.append(a)
    return out


def check_main_ref(sub, args, repo):
    """Blocks moving main/master without a normal merge or commit."""
    if sub == "commit-tree":
        parents = [args[i + 1] for i, a in enumerate(args[:-1]) if a == "-p"]
        parents += [a[2:] for a in args if a.startswith("-p") and len(a) > 2]
        protected = {git_out(repo, "rev-parse", "--verify", "--quiet", "refs/heads/" + b) for b in PROTECTED_BRANCHES}
        for parent in parents:
            commit = git_out(repo, "rev-parse", "--verify", "--quiet", parent + "^{commit}")
            # a parent that cannot be resolved here (e.g. $(git rev-parse main)) may well be main
            if commit is None or commit in protected:
                block(MANUAL_MERGE)
    if sub == "update-ref":
        if "--stdin" in args:
            block(MANUAL_MERGE)
        refs = positional(args, ("-m",))
        if refs and (PROTECTED_REF.match(refs[0]) or
                     refs[0] == "HEAD" and "--no-deref" not in args and current_branch(repo) in PROTECTED_BRANCHES):
            block(MANUAL_MERGE)
    if sub == "reset" and "--" not in args and current_branch(repo) in PROTECTED_BRANCHES:
        revs, mode = positional(args, ()), RESET_MODES & set(args)
        # without a mode, more than one arg (git reset HEAD file) or an arg that is no commit (git reset file) are paths
        if revs and (mode or len(revs) == 1):
            commit = git_out(repo, "rev-parse", "--verify", "--quiet", revs[0] + "^{commit}")
            if commit is None and mode or commit is not None and commit != git_out(repo, "rev-parse", "HEAD"):
                block(MANUAL_MERGE)
    if sub == "branch":
        names = positional(args, ("-u", "--set-upstream-to"))
        forced = "--force" in args or short_flag(args, "f")
        rename = short_flag(args, "M") or short_flag(args, "C") or forced and {"--move", "--copy"} & set(args)
        if names and (forced and names[0] in PROTECTED_BRANCHES or rename and names[-1] in PROTECTED_BRANCHES):
            block(MANUAL_MERGE)
    if sub in ("checkout", "switch"):
        create = ("-B",) if sub == "checkout" else ("-C", "--force-create")
        if any(a in create and b in PROTECTED_BRANCHES for a, b in zip(args, args[1:])):
            block(MANUAL_MERGE)
    if sub in ("push", "fetch", "pull"):
        names = positional(args, TRANSFER_VALUE_OPTIONS)
        remote = names[0] if names else ""
        # fetch and pull write the local ref whatever the remote; a push only does when the remote is this machine
        local = remote.startswith((".", "/", "~", "file://")) or remote and os.path.isdir(
            os.path.join(repo, os.path.expanduser(remote)))
        for spec in names[1:] if local or sub != "push" else []:
            dst = spec.split(":", 1)[1] if ":" in spec else ""
            if dst in PROTECTED_BRANCHES or PROTECTED_REF.match(dst):
                block(MANUAL_MERGE)
    if sub == "symbolic-ref":
        refs = positional(args, ("-m",))
        if len(refs) >= 2 and refs[0] == "HEAD" and PROTECTED_REF.match(refs[1]) \
                and current_branch(repo) not in PROTECTED_BRANCHES:
            block(MANUAL_MERGE)


def touches_protected(repo, *diff_args):
    names = git_out(repo, "diff", "--name-only", *diff_args) or ""
    return any(n.startswith(PROTECTED_PATHS) for n in names.splitlines())


def check_protected_merge(sub, args, repo):
    """Stops, before the sandbox does, a merge into main/master or a checkout of it that would write to .claude/."""
    if sub == "merge" and not {"--abort", "--quit", "--continue"} & set(args):
        if current_branch(repo) in PROTECTED_BRANCHES:
            for rev in positional(args, MERGE_VALUE_OPTIONS) or ["@{upstream}"]:
                if touches_protected(repo, "HEAD..." + rev):
                    block(PROTECTED_MERGE)
    if sub == "pull" and current_branch(repo) in PROTECTED_BRANCHES:
        block(PULL_ON_MAIN)
    if sub in ("checkout", "switch") and "--" not in args:
        target = next(iter(positional(args, ())), None)
        if target in PROTECTED_BRANCHES and current_branch(repo) != target and touches_protected(repo, "HEAD", target):
            block(PROTECTED_MERGE)


def check_git(sub, args, repo):
    check_main_ref(sub, args, repo)
    check_protected_merge(sub, args, repo)
    if sub == "push":
        if any(a == "--force" or a.startswith("--force-") for a in args) or short_flag(args, "f"):
            block("git push forçado bloqueado. Rode você mesmo no terminal se for realmente isso.")
        if any(a.startswith("+") for a in args if not a.startswith("-")):
            block("git push com refspec forçado (+) bloqueado. Rode você mesmo no terminal se for realmente isso.")
        if "--no-verify" in args:
            block("git push --no-verify bloqueado: os hooks do git valem também para o agente.")
    if sub == "reset" and "--hard" in args:
        block("git reset --hard bloqueado: descarta trabalho sem volta. Rode você mesmo no terminal se for realmente isso.")
    if sub == "clean":
        block("git clean bloqueado: apaga arquivos não versionados sem volta. Rode você mesmo no terminal se for realmente isso.")
    if sub == "branch":
        delete = "--delete" in args or short_flag(args, "d")
        force = "--force" in args or short_flag(args, "f")
        if short_flag(args, "D") or (delete and force):
            block("git branch -D bloqueado: apaga a branch mesmo sem merge. Use git branch -d, ou rode você mesmo no terminal.")


def check_hooks_write(prog, argv, cur):
    """Blocks writing, moving, deleting or linking under .git/hooks/. Reading is free."""
    in_place = prog in ("sed", "perl", "ruby") and any(
        re.match(r"^-[A-Za-z]*i", a) or a.startswith("--in-place") for a in argv[1:])
    find_writes = prog == "find" and any(a in ("-delete", "-exec", "-execdir", "-ok", "-fprint", "-fprintf", "-fls") for a in argv[1:])
    mutates = prog in MUTATORS or in_place or find_writes
    hit = GIT_HOOKS.search(cur + "/") and (mutates or any(REDIRECT.match(a) for a in argv[1:]))
    for i, a in enumerate(argv[1:], 1):
        redirected = bool(REDIRECT.match(argv[i - 1]))
        if not (mutates or redirected) or a.startswith("-") and not redirected:
            continue
        a = re.sub(r"^(of|--target-directory|--output)=", "", a)
        if GIT_HOOKS.search(os.path.realpath(os.path.join(cur, os.path.expanduser(a))) + "/"):
            hit = True
    if hit:
        block("Escrita em .git/hooks/ bloqueada: os hooks do git são do dono do projeto. Ler está liberado.")


def check(cmd, cwd, depth=0):
    if depth > 3:
        block("Shell aninhado demais; bloqueando por segurança.")
    for found in SUBSTITUTION.finditer(cmd):
        check(found.group(1) or found.group(2) or "", cwd, depth + 1)
    try:
        tokens = tokenize(cmd)
    except ValueError:
        tokens = cmd.split()
    cur = os.path.realpath(cwd or ".")
    for argv in segments(tokens):
        if any(HOOK_BYPASS_VAR.match(a) for a in argv):
            block("LEFTHOOK* no ambiente bloqueado: desliga ou filtra os hooks do git.")
        argv = strip_prefix(argv)
        if not argv:
            continue
        prog = os.path.basename(argv[0])
        if prog in ("cd", "pushd"):
            dest = next((a for a in argv[1:] if not a.startswith("-")), "~")
            cur = os.path.realpath(os.path.join(cur, os.path.expanduser(dest)))
        if prog in SHELLS:
            for i, a in enumerate(argv[1:], 1):
                if re.match(r"^-[A-Za-z]*c[A-Za-z]*$", a) and i + 1 < len(argv):
                    check(argv[i + 1], cur, depth + 1)
        if prog == "eval":
            check(" ".join(argv[1:]), cur, depth + 1)
        if prog == "git":
            check_git(*git_sub(argv, cur))
        check_hooks_write(prog, argv, cur)


try:
    data = json.load(sys.stdin)
    command = data.get("tool_input", {}).get("command") or ""
except (ValueError, AttributeError):
    block("guard-bash: entrada JSON inválida; bloqueando por segurança.")
check(command, data.get("cwd"))
sys.exit(0)
'
