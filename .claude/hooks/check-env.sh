#!/usr/bin/env bash
# SessionStart (startup): looks at the project root for simple signs of an environment not set up yet and prints one short
# line per finding, to the user (systemMessage) and to Claude (additionalContext):
#   package.json without node_modules/
#   requirements.txt or pyproject.toml without a virtualenv ($VIRTUAL_ENV, or .venv/ or venv/ at the root)
#   .env.example without .env
# Only on a new session (source "startup"): resume, clear and compact say nothing again. Never blocks; any error is silent.
# Parses with python3 (stdlib only) because jq is not guaranteed to be installed.
set -u

exec python3 -I -c '
import json, os, sys


def quiet(*_):
    os._exit(0)


sys.excepthook = quiet

data = json.load(sys.stdin)
if data.get("source", "startup") != "startup":
    sys.exit(0)
root = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()


def there(*names):
    return any(os.path.exists(os.path.join(root, n)) for n in names)


found = []
if there("package.json") and not there("node_modules"):
    found.append("package.json sem node_modules/: as dependências não estão instaladas (npm install, pnpm install ou yarn).")
if there("requirements.txt", "pyproject.toml") and not (os.environ.get("VIRTUAL_ENV") or there(".venv", "venv")):
    found.append("projeto Python sem venv (.venv/, venv/ ou VIRTUAL_ENV): crie com python3 -m venv .venv.")
if there(".env.example") and not there(".env"):
    found.append(".env.example presente sem .env: copie e preencha as variáveis.")
if found:
    text = "\n".join(found)
    print(json.dumps({"systemMessage": text,
                      "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": text}}, ensure_ascii=False))
sys.exit(0)
'
