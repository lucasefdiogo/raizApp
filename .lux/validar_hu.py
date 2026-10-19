#!/usr/bin/env python3
"""Check the readiness rules R01-R11 and the revision rules V01-V08 for a HU folder (stdlib only).

Rules and messages are described in templates/regras-prontidao.md.
With `--anterior <previous HU folder>` the revision rules also compare against the previous version's lock.
Prints one `Rnn: message` line per gap. Exit 0: ready; 1: gaps; 2: bad usage or input.
"""
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RETIRED_TAIL = re.compile(r"^[—–-]\s*retirado na v\d+:\s*\S")
HISTORY_ROW = re.compile(r"^\|\s*([^|]*?)\s*\|\s*(\d+)\s*\|\s*([^|]*?)\s*\|?\s*$")
STATES = ["normal", "carregando", "vazio", "erro", "sem-permissao", "offline"]
CRITERION = re.compile(r"^-\s+CA-(\d{2})\s+\((feliz|exceção)\):\s*\S")
HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
METHODS = ("get", "put", "post", "delete", "options", "head", "patch", "trace")


class InputError(Exception):
    """Bad usage or input; the CLI exits with 2."""


def read(path):
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        raise InputError(f"não consegui ler {path}: {e}")


def frontmatter(text):
    match = re.match(r"---\n(.*?)\n---", text, re.DOTALL)
    values = {}
    for line in (match.group(1).splitlines() if match else []):
        key, sep, value = line.partition(":")
        if sep:
            values[key.strip()] = value.split("#")[0].strip()
    return values


def sections(text):
    """Map section title -> body, with HTML comments and the frontmatter removed."""
    body = re.sub(r"\A---\n.*?\n---", "", text, flags=re.DOTALL)
    found, title = {}, None
    for line in HTML_COMMENT.sub("", body).splitlines():
        if line.startswith("## "):
            title = " ".join(line[3:].split())
            found[title] = []
        elif title is not None:
            found[title].append(line)
    return {k: "\n".join(v).strip() for k, v in found.items()}


def listed_states(section):
    """(state, justification) pairs from `Estados:`: an inline comma list (justification None) or sub-bullets `- estado: texto`."""
    lines = section.splitlines()
    for i, line in enumerate(lines):
        match = re.match(r"^-?\s*Estados:\s*(.*)$", line)
        if match:
            break
    else:
        return []
    if match.group(1).strip():
        return [(s.strip(), None) for s in match.group(1).split(",") if s.strip()]
    pairs = []
    for line in lines[i + 1:]:
        item = re.match(r"^\s+-\s+([^\s:]+)\s*:\s*(.*)$", line)
        if item:
            pairs.append((item.group(1), item.group(2).strip()))
        elif line.strip() and not line[0].isspace():
            break
    return pairs


def declared_routes(yaml_text):
    """Set of (METHOD, route) from an OpenAPI file, read line by line (no YAML library)."""
    routes, route = set(), None
    for line in yaml_text.splitlines():
        if match := re.match(r"^  (/\S*):\s*$", line):
            route = match.group(1)
        elif route and (match := re.match(r"^    (\w+):", line)) and match.group(1) in METHODS:
            routes.add((match.group(1).upper(), route))
    return routes


def load_locker():
    spec = importlib.util.spec_from_file_location("criteria_lock", HERE / "criteria_lock.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def previous_lock(folder):
    path = folder / "criteria.lock"
    if not path.is_file():
        raise InputError(f"criteria.lock da versão anterior não encontrado em {folder}")
    try:
        lock = json.loads(read(path))
        return lock.get("versao", 1), lock["criterios"]
    except (ValueError, KeyError, AttributeError):
        raise InputError(f"criteria.lock malformado em {folder}")


def revision_gaps(hu, meta, body, active, retired, anterior):
    """V01-V08: version, struck criteria, history table and, with `anterior`, the step from the previous version."""
    locker = load_locker()
    gaps = []
    raw = meta.get("versao")
    if raw is not None and not (raw.isdigit() and int(raw) >= 1):
        gaps.append(f'V01: versao "{raw}" inválida; use um inteiro a partir de 1.')
    version = int(raw) if raw is not None and raw.isdigit() and int(raw) >= 1 else 1

    for ca, (_, tail) in retired.items():
        if not RETIRED_TAIL.match(tail):
            gaps.append(f'V02: {ca} retirado sem o motivo; escreva "~~CA-NN (...)~~ — retirado na vN: motivo".')

    if version >= 2:
        rows = [m.groups() for m in map(HISTORY_ROW.match, body.get("Histórico de versões", "").splitlines()) if m]
        if not any(int(v) == version and re.fullmatch(r"\d{4}-\d{2}-\d{2}", d) and what for d, v, what in rows):
            gaps.append(f'V03: "Histórico de versões" sem linha para a versão {version} (data, versão, o que mudou).')
        if any(int(v) > version for _, v, _ in rows):
            gaps.append(f'V03: "Histórico de versões" tem versão acima da {version} da spec.')

    if anterior is not None:
        before, prior = previous_lock(anterior)
        if version != before + 1:
            gaps.append(f"V04: versão {version}, esperada {before + 1} (a versão só sobe de 1 em 1).")
        for ca in sorted(prior):
            if ca not in active and ca not in retired:
                gaps.append(f"V05: {ca} sumiu da spec; retire-o (riscado, com o motivo) em vez de apagar.")
            elif ca in active and prior[ca].get("status", "ativo") == "retirado":
                gaps.append(f"V06: {ca} foi retirado e voltou a ativo; número de CA nunca é reaproveitado.")
        for ca, (text, _) in sorted(retired.items()):
            if ca not in prior:
                continue
            if locker.hash_text(text) != prior[ca]["criterio"]:
                gaps.append(f"V07: {ca} retirado com texto diferente da última versão.")
            feature = hu / "cenarios" / f"{ca}.feature"
            if feature.is_file() and locker.hash_text(read(feature), feature=True) != prior[ca]["cenario"]:
                gaps.append(f"V07: {ca} retirado com cenário diferente da última versão.")
        number = lambda ca: int(ca.split("-")[1])  # noqa: E731
        free = max((number(ca) for ca in prior), default=0) + 1
        for i, ca in enumerate(sorted((c for c in [*active, *retired] if c not in prior), key=number)):
            if number(ca) != free + i:
                gaps.append(f"V08: {ca} novo deve usar o próximo número livre (CA-{free + i:02d}).")
    return gaps


def validate(hu, anterior=None):
    hu = hu.resolve()
    root = hu.parent.parent.parent
    spec_path = hu / "spec.md"
    if not spec_path.is_file():
        raise InputError(f"spec.md não encontrado em {hu}")
    spec = read(spec_path)
    meta, body = frontmatter(spec), sections(spec)
    gaps = []

    if meta.get("status") != "aprovada":
        gaps.append(f'R01: status é "{meta.get("status", "")}"; a spec precisa estar "aprovada".')

    items = [l.strip() for l in body.get("Critérios de aceitação", "").splitlines() if l.strip().startswith("- ")]
    if not any(re.match(r"^-\s+(CA-\d+\s+)?\(exceção\)", i) for i in items):
        gaps.append("R02: nenhum critério de exceção; toda HU precisa de ao menos um.")

    retired = {}
    criteria, seen, r03 = {}, set(), False
    for item in items:
        if struck := load_locker().RETIRED.match(item):
            ca = struck.group(1).split("(")[0].strip()
            text = " ".join(struck.group(1).split())
            if ca in seen or ca in retired:
                gaps.append(f'R03: critério sem ID fixo ou repetido: "{" ".join(item.split())}".')
                r03 = True
            else:
                retired[ca] = (text, struck.group(2).strip())
            continue
        match = CRITERION.match(item)
        ca = f"CA-{match.group(1)}" if match else None
        if not match or ca in seen or ca in retired:
            gaps.append(f'R03: critério sem ID fixo ou repetido: "{" ".join(item.split())}".')
            r03 = True
        else:
            seen.add(ca)
            criteria[ca] = match.group(2)

    r04 = False
    for ca, kind in criteria.items():
        feature = hu / "cenarios" / f"{ca}.feature"
        tags = set()
        if feature.is_file():
            for line in read(feature).splitlines():
                if line.strip().startswith("@"):
                    tags.update(line.split())
        if not feature.is_file():
            why = "arquivo ausente"
        elif f"@{ca}" not in tags:
            why = f"falta a tag @{ca}"
        elif f"@{'feliz' if kind == 'feliz' else 'excecao'}" not in tags:
            why = f"falta a tag @{'feliz' if kind == 'feliz' else 'excecao'} igual ao tipo do critério"
        else:
            continue
        gaps.append(f"R04: {ca} sem cenarios/{ca}.feature válido ({why}).")
        r04 = True

    lock = hu / "criteria.lock"
    if not lock.is_file():
        gaps.append("R05: criteria.lock não encontrado; gere o lacre com lux lacrar.")
    elif not (r03 or r04):
        done = subprocess.run([sys.executable, "-I", str(Path(__file__).with_name("criteria_lock.py")), "check", str(hu)],
                              capture_output=True, text=True)
        if done.returncode == 2:
            gaps.append(f"R06: {done.stderr.strip().removeprefix('erro: ')}.")
        gaps += [f"R06: {line}." for line in done.stdout.splitlines() if line]

    if body.get("Dúvidas abertas", ""):
        gaps.append("R07: há dúvidas abertas; resolva no claude.ai antes de entregar.")

    if meta.get("tem_tela") == "sim":
        section = body.get("Estados de tela", "")
        match = re.search(r"Protótipo:\s*(\S+)", section)
        proto = root / match.group(1) if match else None
        html = read(proto) if proto and proto.is_file() else ""
        states = listed_states(section)
        if not states:
            gaps.append('R08: "Estados de tela" não lista nenhum estado.')
        for state, why in states:
            if state not in STATES:
                gaps.append(f'R08: estado "{state}" desconhecido; use {", ".join(STATES)}.')
            elif why == "":
                gaps.append(f'R08: estado "{state}" sem justificativa em "Estados de tela".')
            elif not re.search(rf'data-estado\s*=\s*["\']{state}["\']', html):
                gaps.append(f'R08: protótipo sem o estado "{state}" (ou arquivo inexistente).')

    if meta.get("dados_sensiveis") == "sim":
        lgpd = body.get("Dados e LGPD", "")
        for item in ("Dados", "Base legal", "Retenção"):
            if not re.search(rf"^-?\s*{item}:\s*\S", lgpd, re.MULTILINE):
                gaps.append(f'R09: dados_sensiveis é "sim" mas falta "{item}" em "Dados e LGPD".')

    if meta.get("muda_contrato") == "sim":
        lines = re.findall(r"^-\s+([A-Z]+)\s+(\S+)\s+\((\S+)\)", body.get("Contratos", ""), re.MULTILINE)
        if not lines:
            gaps.append('R10: muda_contrato é "sim" mas a seção "Contratos" não lista nenhuma rota.')
        for method, route, file in lines:
            path = root / file
            if (method, route) not in (declared_routes(read(path)) if path.is_file() else set()):
                gaps.append(f'R10: contrato não declara "{method} {route}" em {file}.')

    arch = body.get("Arquitetura e stack", "")
    ref = re.search(r"Referência:\s*(\S+)", arch)
    if not arch or (ref and not (root / ref.group(1)).is_file()):
        gaps.append("R11: arquitetura e stack não definidas (spec ou docs/arquitetura/).")

    return gaps + revision_gaps(hu, meta, body, criteria, retired, anterior)


def main(argv):
    anterior = None
    if len(argv) == 4 and argv[2] == "--anterior":
        anterior = Path(argv[3])
        argv = argv[:2]
    if len(argv) != 2:
        print("uso: validar_hu.py <pasta-da-HU> [--anterior <pasta-da-versão-anterior>]", file=sys.stderr)
        return 2
    hu = Path(argv[1])
    if not hu.is_dir() or (anterior is not None and not anterior.is_dir()):
        print(f"erro: {hu if not hu.is_dir() else anterior} não é uma pasta", file=sys.stderr)
        return 2
    try:
        gaps = validate(hu, anterior)
    except InputError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2
    if gaps:
        print("\n".join(gaps))
    return 1 if gaps else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
