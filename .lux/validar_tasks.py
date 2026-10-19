#!/usr/bin/env python3
"""Check that tasks.md covers the HU's spec (stdlib only).

Every CA has a task; each task has a `Teste:` line; with tem_tela "sim" there is a task tagged `tela` that names
every state listed in the spec; with muda_contrato "sim" there is a task tagged `contrato`; with tem_tela "sim" and an executor in the architecture
(`## Executor de E2E`: maestro or playwright) there is a task tagged `e2e` that cites every CA (one flow per scenario).
Prints one `Tnn: message` line per gap. Exit 0: plan covers the spec; 1: gaps; 2: bad usage or input.
"""
import re
import sys
import unicodedata
from pathlib import Path

E2E_EXECUTORS = ("maestro", "playwright")
STATES = ["normal", "carregando", "vazio", "erro", "sem-permissao", "offline"]
TASK = re.compile(r"^- \[[ xX]\] (TASK-\d+)\s*(?:\(([^)]*)\))?")
HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)


class InputError(Exception):
    """Bad usage or input; the CLI exits with 2."""


def read(path):
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        raise InputError(f"não consegui ler {path}: {e}")


def plain(text):
    """Lowercase without accents, with hyphens as spaces, so `sem-permissao` matches `sem permissão`."""
    text = unicodedata.normalize("NFD", text.lower().replace("-", " "))
    return "".join(c for c in text if not unicodedata.combining(c))


def frontmatter(text):
    match = re.match(r"---\n(.*?)\n---", text, re.DOTALL)
    values = {}
    for line in (match.group(1).splitlines() if match else []):
        key, sep, value = line.partition(":")
        if sep:
            values[key.strip()] = value.split("#")[0].strip()
    return values


def spec_states(text):
    """States listed in `Estados de tela` (inline comma list or `- estado: justificativa` sub-bullets); the six standard ones when the spec lists none."""
    body = HTML_COMMENT.sub("", re.sub(r"\A---\n.*?\n---", "", text, flags=re.DOTALL))
    match = re.search(r"^## Estados de tela\n(.*?)(?=^## |\Z)", body, re.DOTALL | re.MULTILINE)
    lines = match.group(1).splitlines() if match else []
    for i, line in enumerate(lines):
        listed = re.match(r"^-?\s*Estados:\s*(.*)$", line)
        if listed:
            break
    else:
        return STATES
    if listed.group(1).strip():
        states = [s.strip() for s in listed.group(1).split(",") if s.strip()]
    else:
        states = []
        for line in lines[i + 1:]:
            item = re.match(r"^\s+-\s+([^\s:]+)\s*:", line)
            if item:
                states.append(item.group(1))
            elif line.strip() and not line[0].isspace():
                break
    return states or STATES


def e2e_executor(hu):
    """First word of the `## Executor de E2E` section of docs/arquitetura/arquitetura.md ('' when absent, empty or `nenhum`)."""
    path = hu.resolve().parent.parent / "arquitetura" / "arquitetura.md"
    if not path.is_file():
        return ""
    body = HTML_COMMENT.sub("", read(path))
    match = re.search(r"^## Executor de E2E\n(.*?)(?=^## |\Z)", body, re.DOTALL | re.MULTILINE)
    words = match.group(1).split() if match else []
    word = words[0].strip(".,;:`").lower() if words else ""
    return "" if word in ("", "nenhum", "nenhuma", "não", "nao") else word


def parse_tasks(text):
    """List of (id, tags, block text); tags are the comma-separated words in the header parentheses."""
    tasks = []
    for line in text.splitlines():
        match = TASK.match(line)
        if match:
            tags = [t.strip() for t in (match.group(2) or "").split(",")]
            tasks.append([match.group(1), tags, line])
        elif tasks:
            tasks[-1][2] += "\n" + line
    return tasks


def validate(hu):
    spec = read(hu / "spec.md")
    tasks_file = hu / "tasks.md"
    if not tasks_file.is_file():
        raise InputError(f"{tasks_file} não existe")
    tasks = parse_tasks(read(tasks_file))
    if not tasks:
        raise InputError(f"{tasks_file} não tem nenhuma task no formato `- [ ] TASK-01 (CA-01): ...`")
    meta = frontmatter(spec)

    criteria = re.findall(r"^-\s+(CA-\d+)\s+\(", spec, re.MULTILINE)
    cited = {tag for _, tags, _ in tasks for tag in tags if re.fullmatch(r"CA-\d+", tag)}
    gaps = [f"T01: {ca} sem task; toda HU tem ao menos uma task por critério." for ca in criteria if ca not in cited]
    for task_id, tags, _ in tasks:
        for tag in tags:
            if re.fullmatch(r"CA-\d+", tag) and tag not in criteria:
                gaps.append(f"T02: {task_id} cita {tag}, que não existe na spec.")
    for task_id, _, block in tasks:
        if not re.search(r"^\s+- Teste:\s*\S", block, re.MULTILINE):
            gaps.append(f"T06: {task_id} sem linha `- Teste:` com o nome do teste.")

    if meta.get("tem_tela") == "sim":
        screens = [block for _, tags, block in tasks if "tela" in tags]
        if not screens:
            gaps.append('T03: tem_tela é "sim" mas nenhuma task leva a tag `tela`.')
        else:
            covered = plain("\n".join(screens))
            for state in spec_states(spec):
                if plain(state) not in covered:
                    gaps.append(f'T04: task de tela não cobre o estado "{state}" da spec.')
    if meta.get("muda_contrato") == "sim" and not any("contrato" in tags for _, tags, _ in tasks):
        gaps.append('T05: muda_contrato é "sim" mas nenhuma task leva a tag `contrato`.')
    executor = e2e_executor(hu) if meta.get("tem_tela") == "sim" else ""
    if executor and executor not in E2E_EXECUTORS:
        gaps.append(f"T07: executor de E2E desconhecido: {executor} (use maestro ou playwright).")
    elif executor:
        flows = [(tags, block) for _, tags, block in tasks if "e2e" in tags]
        if not flows:
            gaps.append(f'T07: tem_tela é "sim" e o executor é {executor}, mas nenhuma task leva a tag `e2e`.')
        else:
            covered = {tag for tags, _ in flows for tag in tags}
            gaps += [f"T07: task e2e não cobre {ca}; um fluxo por cenário." for ca in criteria if ca not in covered]
    return gaps


def main(argv):
    if len(argv) != 2:
        print("uso: validar_tasks.py <pasta-da-HU>", file=sys.stderr)
        return 2
    hu = Path(argv[1])
    if not hu.is_dir():
        print(f"erro: {hu} não é uma pasta", file=sys.stderr)
        return 2
    try:
        gaps = validate(hu)
    except InputError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2
    if gaps:
        print("\n".join(gaps))
    return 1 if gaps else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
