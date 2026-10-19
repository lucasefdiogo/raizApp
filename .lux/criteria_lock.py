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
RETIRED = re.compile(r"^-\s+~~\s*(CA-\d+\s*\(.*?)\s*~~(.*)$")  # struck line: the text inside is the last version


def read_text(path):
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        raise LockError(f"não consegui ler {path}: {e}")


def parse_criteria(spec_text):
    """(active, retired) from the criteria section: CA id -> text, and CA id -> (last text, text after the strike)."""
    active, retired = {}, {}
    in_section = False
    for line in spec_text.splitlines():
        if line.startswith("## "):
            in_section = normalize(line) == "## Critérios de aceitação"
            continue
        line = line.strip()
        if not in_section:
            continue
        if match := CRITERION.match(line):
            ca = match.group(1)
            value, target = normalize(line[1:]), active
        elif match := RETIRED.match(line):
            text = normalize(match.group(1))
            ca = text.split()[0].split("(")[0]
            value, target = (text, match.group(2).strip()), retired
        else:
            continue
        if ca in active or ca in retired:
            raise LockError(f"{ca} repetido em spec.md")
        target[ca] = value
    return active, retired


def spec_criteria(spec_text):
    """Map CA id -> criterion text of the active criteria (`- CA-NN (...)`)."""
    return parse_criteria(spec_text)[0]


def spec_retired(spec_text):
    """Map CA id -> (last criterion text, text after the strike) of the retired criteria (`- ~~CA-NN (...)~~ ...`)."""
    return parse_criteria(spec_text)[1]


def spec_version(spec_text):
    """Version in the frontmatter; a spec without `versao` is v1."""
    match = re.match(r"---\n(.*?)\n---", spec_text, re.DOTALL)
    for line in (match.group(1).splitlines() if match else []):
        key, sep, value = line.partition(":")
        if sep and key.strip() == "versao":
            value = value.split("#")[0].strip()
            if not value.isdigit() or int(value) < 1:
                raise LockError(f'versao inválida na spec: "{value}" (use um inteiro a partir de 1)')
            return int(value)
    return 1


def feature_files(hu):
    return {f.stem: f for f in sorted((hu / "cenarios").glob("CA-*.feature"))}


def load_spec(hu):
    spec = hu / "spec.md"
    if not spec.is_file():
        raise LockError(f"spec.md não encontrado em {hu}")
    return read_text(spec)


def generate(hu):
    spec_text = load_spec(hu)
    active, retired = parse_criteria(spec_text)
    criteria = {**active, **{ca: text for ca, (text, _) in retired.items()}}
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
        "versao": spec_version(spec_text),
        "spec": hash_text(spec_text),
        "criterios": {
            ca: {
                "status": "retirado" if ca in retired else "ativo",
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
    active, retired = parse_criteria(spec_text)
    criteria = {**active, **{ca: text for ca, (text, _) in retired.items()}}
    features = feature_files(hu)
    locked = lock["criterios"]
    version, locked_version = spec_version(spec_text), lock.get("versao", 1)
    problems = []
    if hash_text(spec_text) != lock["spec"]:
        problems.append("spec.md diverge do criteria.lock")
    if version != locked_version:
        problems.append(f"versão da spec ({version}) diverge da versão do lacre ({locked_version})")
    for ca in sorted(set(criteria) | set(features) | set(locked)):
        was_retired = ca in locked and locked[ca].get("status", "ativo") == "retirado"
        if ca not in locked:
            why = ["CA a mais"]
        elif ca not in criteria and ca not in features:
            why = ["retirado sumiu da spec"] if was_retired else ["CA a menos"]
        else:
            why = []
            if ca in criteria and (ca in retired) != was_retired:
                why.append("status")
            if ca not in criteria and was_retired:
                why.append("retirado sumiu da spec")
            elif ca not in criteria or hash_text(criteria[ca]) != locked[ca]["criterio"]:
                why.append("critério")
            if ca not in features or hash_text(read_text(features[ca]), feature=True) != locked[ca]["cenario"]:
                why.append("cenário")
        problems += [f"{ca} diverge do criteria.lock ({w})" for w in why]
    if problems:
        print("\n".join(problems))
    return 1 if problems else 0


def diff_locks(old, new):
    """(changed, new, retired, active_before): how a lock moved to the next version. `changed` are the CA active in
    both whose criterion or scenario hash differs; `retired` are the ones that were active and are now retired."""
    status = lambda lock, ca: lock["criterios"][ca].get("status", "ativo")  # noqa: E731
    active_before = [ca for ca in old["criterios"] if status(old, ca) == "ativo"]
    novos = sorted(ca for ca in new["criterios"] if ca not in old["criterios"])
    retirados = sorted(ca for ca in new["criterios"] if ca in old["criterios"]
                       and status(new, ca) == "retirado" and status(old, ca) == "ativo")
    alterados = sorted(ca for ca in active_before if ca in new["criterios"] and status(new, ca) == "ativo"
                       and (new["criterios"][ca]["criterio"] != old["criterios"][ca]["criterio"]
                            or new["criterios"][ca]["cenario"] != old["criterios"][ca]["cenario"]))
    return alterados, novos, retirados, active_before


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
