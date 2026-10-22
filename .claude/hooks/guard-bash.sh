#!/usr/bin/env bash
# PreToolUse (Bash): reads the hook JSON from stdin and denies the commands that are never the agent's to run:
# git push --force/-f/+refspec, git push --no-verify, git reset --hard, git clean, git branch -D, LEFTHOOK* in the
# environment, and writes to .git/hooks/. Exit 0 lets the command go on to the normal permission flow (the hook never
# approves anything); exit 2 blocks it and shows stderr to Claude.
# Not a shell parser: it closes the obvious ways. The sandbox denyWrite of .git/hooks is the OS-level layer.
# Parses with python3 (stdlib only) because jq is not guaranteed to be installed.
set -u

exec python3 -I -c '
import json, os, re, shlex, sys

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


def git_sub(argv):
    """(subcommand, args after it) of a git argv, skipping global options such as -C dir."""
    i = 1
    while i < len(argv):
        if argv[i] in ("-C", "-c", "--git-dir", "--work-tree", "--namespace") and i + 1 < len(argv):
            i += 2
        elif argv[i].startswith("-"):
            i += 1
        else:
            return argv[i], argv[i + 1:]
    return None, []


def short_flag(args, letter):
    """True when some -abc cluster holds the letter."""
    return any(re.fullmatch(rf"-[A-Za-z]*{letter}[A-Za-z]*", a) for a in args)


def check_git(sub, args):
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
            check_git(*git_sub(argv))
        check_hooks_write(prog, argv, cur)


try:
    data = json.load(sys.stdin)
    command = data.get("tool_input", {}).get("command") or ""
except (ValueError, AttributeError):
    block("guard-bash: entrada JSON inválida; bloqueando por segurança.")
check(command, data.get("cwd"))
sys.exit(0)
'
