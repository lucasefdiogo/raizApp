#!/usr/bin/env python3
"""Generate and check criteria.lock for a HU folder (stdlib only).

Algorithm 1 is described in templates/formatos.md.
"""
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

ALGORITHM = 1
INVISIBLE = re.compile("[\\ufeff\\u200b\\u200c\\u200d\\u2060]")


def normalize(text, feature=False):
    text = unicodedata.normalize("NFC", INVISIBLE.sub("", text))
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = (" ".join(line.split()) for line in text.split("\n"))
    lines = (line for line in lines if line)
    if feature:
        lines = (line for line in lines if not line.startswith("#"))
    return "\n".join(lines)


def hash_text(text, feature=False):
    return hashlib.sha256(normalize(text, feature).encode("utf-8")).hexdigest()


class LockError(Exception):
    """Bad input or usage; the CLI exits with 2."""


CRITERION = re.compile(r"^-\s+(CA-\d+)\s*\(")


def read_text(path):
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        raise LockError(f"não consegui ler {path}: {e}")


def spec_criteria(spec_text):
    """Map CA id -> criterion text, from the lines `- CA-NN (...)` of the criteria section."""
    found = {}
    in_section = False
    for line in spec_text.splitlines():
        if line.startswith("## "):
            in_section = normalize(line) == "## Critérios de aceitação"
        elif in_section and (match := CRITERION.match(line.strip())):
            ca = match.group(1)
            if ca in found:
                raise LockError(f"{ca} repetido em spec.md")
            found[ca] = normalize(line.strip()[1:])
    return found


def feature_files(hu):
    return {f.stem: f for f in sorted((hu / "cenarios").glob("CA-*.feature"))}


def load_spec(hu):
    spec = hu / "spec.md"
    if not spec.is_file():
        raise LockError(f"spec.md não encontrado em {hu}")
    return read_text(spec)


def generate(hu):
    spec_text = load_spec(hu)
    criteria = spec_criteria(spec_text)
    features = feature_files(hu)
    for ca in criteria:
        if ca not in features:
            raise LockError(f"{ca} sem cenarios/{ca}.feature")
    for ca in features:
        if ca not in criteria:
            raise LockError(f"cenarios/{ca}.feature sem critério {ca} na spec")
    match = re.search(r"^id:\s*(\S+)", spec_text, re.MULTILINE)
    if not match:
        raise LockError("spec.md sem id no frontmatter")
    lock = {
        "algoritmo": ALGORITHM,
        "hu": match.group(1),
        "spec": hash_text(spec_text),
        "criterios": {
            ca: {
                "criterio": hash_text(criteria[ca]),
                "cenario": hash_text(read_text(features[ca]), feature=True),
            }
            for ca in sorted(criteria)
        },
    }
    out = json.dumps(lock, indent=2, ensure_ascii=False) + "\n"
    (hu / "criteria.lock").write_text(out, encoding="utf-8")


def load_lock(hu):
    path = hu / "criteria.lock"
    if not path.is_file():
        raise LockError(f"criteria.lock não encontrado em {hu}")
    try:
        lock = json.loads(read_text(path))
        version = lock["algoritmo"]
        if version != ALGORITHM:
            raise LockError(f"criteria.lock usa algoritmo {version}; este script conhece {ALGORITHM}")
        lock["spec"], lock["criterios"]  # noqa: B018 - fail early if keys are missing
        return lock
    except (ValueError, KeyError, TypeError):
        raise LockError("criteria.lock malformado")


def check(hu):
    lock = load_lock(hu)
    spec_text = load_spec(hu)
    criteria = spec_criteria(spec_text)
    features = feature_files(hu)
    locked = lock["criterios"]
    problems = []
    if hash_text(spec_text) != lock["spec"]:
        problems.append("spec.md diverge do criteria.lock")
    for ca in sorted(set(criteria) | set(features) | set(locked)):
        if ca not in locked:
            why = ["CA a mais"]
        elif ca not in criteria and ca not in features:
            why = ["CA a menos"]
        else:
            why = []
            if ca not in criteria or hash_text(criteria[ca]) != locked[ca]["criterio"]:
                why.append("critério")
            if ca not in features or hash_text(read_text(features[ca]), feature=True) != locked[ca]["cenario"]:
                why.append("cenário")
        problems += [f"{ca} diverge do criteria.lock ({w})" for w in why]
    if problems:
        print("\n".join(problems))
    return 1 if problems else 0


def main(argv):
    if len(argv) != 3 or argv[1] not in COMMANDS:
        print("uso: criteria_lock.py generate|check <pasta-da-HU>", file=sys.stderr)
        return 2
    hu = Path(argv[2])
    if not hu.is_dir():
        print(f"erro: {hu} não é uma pasta", file=sys.stderr)
        return 2
    try:
        return COMMANDS[argv[1]](hu) or 0
    except LockError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2


COMMANDS = {"generate": generate, "check": check}

if __name__ == "__main__":
    sys.exit(main(sys.argv))
