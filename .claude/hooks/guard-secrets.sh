#!/usr/bin/env bash
# PreToolUse (Bash): before a git commit, looks for secrets in what the commit will take and blocks it when it finds one.
# With gitleaks on the PATH it scans with gitleaks; without it (or when gitleaks fails) it falls back to a few obvious
# patterns: sk-* keys, AWS access keys, GitHub tokens, private keys, and a long value next to key/token/secret/password.
# What is scanned: the staged diff; when the same command also stages (git add, commit -a, commit <paths>), the unstaged
# changes and the untracked files too, since the PreToolUse hook runs before any part of the command.
# Exit 0 lets the command go on to the normal permission flow; exit 2 blocks it and shows stderr to Claude: file, line and
# only the first characters of the secret.
# Parses with python3 (stdlib only) because jq is not guaranteed to be installed.
set -u

exec python3 -I -c '
import json, os, re, shlex, shutil, subprocess, sys, tempfile

OPERATORS = {";", "&&", "||", "|", "&", "(", ")"}
WRAPPERS = {"env", "command", "exec", "nohup", "time", "nice", "timeout", "sudo", "builtin", "{", "!", "then", "do"}
# flags of git commit that take a value: the value is not a pathspec
COMMIT_VALUE_FLAGS = {"-m", "--message", "-F", "--file", "-C", "--reuse-message", "-c", "--reedit-message", "--author",
                      "--date", "-t", "--template", "--fixup", "--squash", "--trailer", "--cleanup"}
PATTERNS = [
    re.compile(r"\bsk-[A-Za-z0-9_-]{20,}"),
    re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
]
# a long base64-like value (letters and digits) assigned next to a secret word
NEAR_WORD = re.compile(r"(?i)(?:key|token|secret|passw(?:or)?d|pwd)\w*[\"\x27]?\s*[:=]\s*[\"\x27]?([A-Za-z0-9+/_-]{20,}={0,2})(?![A-Za-z0-9+/_=-])")
MAX_FILE = 1_000_000


def crash(*_):
    # an unhandled exception would exit 1, which does not block the tool call
    print("guard-secrets: erro interno; bloqueando por segurança.", file=sys.stderr)
    os._exit(2)


sys.excepthook = crash


def block(msg):
    print(msg, file=sys.stderr)
    sys.exit(2)


def segments(cmd):
    lexer = shlex.shlex(cmd.replace("\n", " ; "), posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    argv = []
    for tok in lexer:
        if tok in OPERATORS:
            if argv:
                yield argv
            argv = []
        else:
            argv.append(tok)
    if argv:
        yield argv


def strip_prefix(argv):
    while argv and (re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", argv[0]) or os.path.basename(argv[0]) in WRAPPERS):
        argv = argv[1:]
    return argv


def git_sub(argv):
    """(subcommand, args after it, -C dir) of a git argv."""
    i, workdir = 1, None
    while i < len(argv):
        if argv[i] == "-C" and i + 1 < len(argv):
            workdir = argv[i + 1]
            i += 2
        elif argv[i] in ("-c", "--git-dir", "--work-tree", "--namespace") and i + 1 < len(argv):
            i += 2
        elif argv[i].startswith("-"):
            i += 1
        else:
            return argv[i], argv[i + 1:], workdir
    return None, [], workdir


def commit_stages(args):
    """True when git commit itself takes changes that are not staged yet: -a/--all or a pathspec."""
    skip = False
    for a in args:
        if skip:
            skip = False
        elif a in COMMIT_VALUE_FLAGS:
            skip = True
        elif a in ("-a", "--all", "--include", "-i", "--only", "-o") or re.fullmatch(r"-[A-Za-z]*a[A-Za-z]*", a):
            return True
        elif a == "--" or not a.startswith("-"):
            return True
    return False


def commits(command, cwd):
    """[(repo dir, broad)] for each git commit in the command; broad when the command also stages changes."""
    found, staging, cur = [], False, cwd
    for argv in segments(command):
        argv = strip_prefix(argv)
        if not argv:
            continue
        prog = os.path.basename(argv[0])
        if prog in ("cd", "pushd"):
            dest = next((a for a in argv[1:] if not a.startswith("-")), "~")
            cur = os.path.realpath(os.path.join(cur, os.path.expanduser(dest)))
        if prog != "git":
            continue
        sub, args, workdir = git_sub(argv)
        where = os.path.realpath(os.path.join(cur, os.path.expanduser(workdir))) if workdir else cur
        if sub in ("add", "stage"):
            staging = True
        if sub == "commit":
            found.append((where, staging or commit_stages(args)))
    return found


def git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, timeout=20)


def untracked(repo):
    out = git(repo, "ls-files", "--others", "--exclude-standard", "-z")
    return [p for p in out.stdout.split("\0") if p] if out.returncode == 0 else []


def mask(secret):
    return secret[:4] + "…"


def scan_gitleaks(repo, broad):
    """Findings [(file, line, secret)] from gitleaks, or None when gitleaks is missing or failed."""
    binary = shutil.which("gitleaks")
    if not binary:
        return None
    base = ["--no-banner", "--log-level", "error", "--report-format", "json", "--exit-code", "3"]
    runs = [["git", "--pre-commit", "--staged", "."]]
    if broad:
        runs.append(["git", "--pre-commit", "."])
        runs += [["dir", path] for path in untracked(repo)[:200]]
    findings = []
    for run in runs:
        fd, report = tempfile.mkstemp(suffix=".json")
        os.close(fd)
        try:
            done = subprocess.run([binary, *run, *base, "--report-path", report], cwd=repo, capture_output=True, timeout=60)
            if done.returncode == 3:
                items = json.load(open(report, encoding="utf-8")) or []
                findings += [(i.get("File", "?"), i.get("StartLine", "?"), i.get("Secret") or i.get("Match") or "") for i in items]
            elif done.returncode != 0:
                return None
        except (OSError, ValueError, subprocess.SubprocessError):
            return None
        finally:
            os.unlink(report)  # the report holds the secrets in full
    return findings


def match_line(text):
    for pattern in PATTERNS:
        found = pattern.search(text)
        if found:
            return found.group(0)
    found = NEAR_WORD.search(text)
    value = found.group(1) if found else ""
    if re.search(r"[A-Za-z]", value) and re.search(r"[0-9]", value):
        return value
    return None


def added_lines(diff):
    """[(file, line, text)] for the added lines of a unified diff with -U0."""
    out, path, line = [], None, 0
    for raw in diff.splitlines():
        if raw.startswith("+++ "):
            path = raw[6:] if raw.startswith("+++ b/") else None
        elif raw.startswith("@@"):
            line = int(re.match(r"@@ -\S+ \+(\d+)", raw).group(1))
        elif raw.startswith("+") and path:
            out.append((path, line, raw[1:]))
            line += 1
    return out


def scan_patterns(repo, broad):
    diff_args = ["diff", "--no-color", "--no-ext-diff", "-U0"]
    lines = added_lines(git(repo, *diff_args, "--cached").stdout)
    if broad:
        lines += added_lines(git(repo, *diff_args).stdout)
        for path in untracked(repo):
            full = os.path.join(repo, path)
            try:
                if os.path.getsize(full) > MAX_FILE:
                    continue
                text = open(full, encoding="utf-8").read()
            except (OSError, UnicodeDecodeError):
                continue
            lines += [(path, n, t) for n, t in enumerate(text.splitlines(), 1)]
    findings = []
    for path, n, text in lines:
        secret = match_line(text)
        if secret:
            findings.append((path, n, secret))
    return findings


try:
    data = json.load(sys.stdin)
    command = data.get("tool_input", {}).get("command") or ""
    cwd = os.path.realpath(data.get("cwd") or ".")
except (ValueError, AttributeError):
    block("guard-secrets: entrada JSON inválida; bloqueando por segurança.")
if "commit" not in command:
    sys.exit(0)
try:
    targets = commits(command, cwd)
except ValueError:
    targets = []
for repo, broad in targets:
    findings, tool = scan_gitleaks(repo, broad), "gitleaks"
    if findings is None:
        findings, tool = scan_patterns(repo, broad), "padrões óbvios (gitleaks ausente ou com erro)"
    if findings:
        where = "\n".join(f"  {f}:{n} ({mask(s)})" for f, n, s in dict.fromkeys(findings))
        block(f"Commit bloqueado: possível segredo, detectado por {tool}:\n{where}\n"
              "Tire o valor do código (variável de ambiente, .env no .gitignore) e tente de novo.")
sys.exit(0)
'
