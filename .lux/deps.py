#!/usr/bin/env python3
"""List the dependencies a document approves (stdlib only).

The section `## Dependências` of arquitetura.md and of an ADR has one package per line:
`- nome@versão (licença)`. A line without version is not an approval. approvedDeps in
verify.config.json holds `nome@versão`.

  deps.py listar ARQUIVO...          name, version, license and origin, tab separated
  deps.py faltantes CONFIG ARQUIVO...  what CONFIG (a path, or - for stdin) does not approve yet
Exit 0: ok; 2: bad usage or input.
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ENTRY = re.compile(r"^-\s+(?P<name>(?:@[\w.-]+/)?[\w.-]+)(?:@(?P<version>[^\s(]+))?\s*(?:\((?P<license>[^)]*)\))?\s*$")
COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)


class DepsError(Exception):
    """Bad usage or input; the CLI exits with 2."""


def origin(path):
    match = re.match(r"(\d{4})-", path.name)
    return f"ADR-{match.group(1)}" if match else "arquitetura"


def read(path):
    try:
        return Path(path).read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        raise DepsError(f"não consegui ler {path}: {e}")


def dependencies(path):
    """List of (name, version or None, license or None, origin) from the Dependências section of a document."""
    found, in_section = [], False
    for line in COMMENT.sub("", read(path)).splitlines():
        if line.startswith("## "):
            in_section = line[3:].strip() == "Dependências"
        elif in_section and (match := ENTRY.match(line.strip())):
            found.append((match["name"], match["version"], match["license"] or None, origin(Path(path))))
    return found


def approved(config_text):
    try:
        deps = json.loads(config_text).get("approvedDeps", [])
    except (ValueError, AttributeError):
        raise DepsError("verify.config.json inválido")
    return set(deps) if isinstance(deps, list) else set()


def pip_name(name):
    return re.sub(r"[-_.]+", "-", name.lower())


def manifest_kind(path):
    """npm, pip or maven for a manifest file name, else None."""
    name = Path(path).name
    if name == "package.json":
        return "npm"
    if name == "pom.xml":
        return "maven"
    return "pip" if re.fullmatch(r"requirements[\w.-]*\.txt", name) else None


def manifest_deps(kind, text):
    """Dependencies a manifest declares, as {name: version or None}. DepsError when it cannot be read."""
    found = {}
    try:
        if kind == "npm":
            data = json.loads(text)
            for section in ("dependencies", "devDependencies", "optionalDependencies"):
                block = data.get(section, {})
                if not isinstance(block, dict) or not all(isinstance(v, str) for v in block.values()):
                    raise ValueError(section)
                found.update(block)
        elif kind == "pip":
            for line in text.splitlines():
                line = re.sub(r"\s#.*$", "", line.strip())
                if not line or line.startswith("#") or line.startswith("-"):
                    continue
                match = re.match(r"^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:==\s*([^\s;,]+))?\s*(?:;.*)?$", line)
                found[pip_name(match[1]) if match else line] = match[2] if match else None
        elif kind == "maven":
            root = ET.fromstring(text)
            local = lambda tag: tag.rsplit("}", 1)[-1]
            props = {local(p.tag): (p.text or "").strip() for el in root.iter() if local(el.tag) == "properties" for p in el}
            for dep in (el for el in root.iter() if local(el.tag) == "dependency"):
                parts = {local(c.tag): (c.text or "").strip() for c in dep}
                version = parts.get("version") or None
                if version:
                    version = re.sub(r"\$\{([^}]+)\}", lambda m: props.get(m[1], m[0]), version)
                found[f"{parts['groupId']}:{parts['artifactId']}"] = version
        else:
            raise ValueError(kind)
    except (ValueError, KeyError, AttributeError, TypeError, ET.ParseError) as e:
        raise DepsError(f"manifesto ilegível ({e.__class__.__name__})")
    return found


def plain_version(version):
    return version.lstrip("^~= ") if version else version


def undeclared(kind, current, base, approved):
    """Declared dependencies that neither the same manifest on main nor approvedDeps covers.

    Returns one text per dependency: name@version, plus why (new, other version than the approved one, no version).
    """
    key = pip_name if kind == "pip" else (lambda n: n)
    ok = {}
    for entry in approved:
        name, _, version = entry.rpartition("@") if "@" in entry[1:] else (entry, "", "")
        ok.setdefault(key(name), set()).add(version)
    problems = []
    for name, version in current.items():
        if name in base and base[name] == version:
            continue
        shown = f"{name}@{version}" if version else f"{name} (sem versão)"
        versions = ok.get(key(name), set())
        if version and plain_version(version) in versions:
            continue
        if versions:
            shown += f" (versão aprovada: {', '.join(sorted(versions))})"
        elif name in base:
            shown += f" (main declara {base[name] or 'sem versão'})"
        problems.append(shown)
    return problems


def main(argv):
    if len(argv) < 3 or argv[1] not in ("listar", "faltantes"):
        print("uso: deps.py listar ARQUIVO... | faltantes CONFIG|- ARQUIVO...", file=sys.stderr)
        return 2
    try:
        if argv[1] == "listar":
            for name, version, lic, src in (d for f in argv[2:] for d in dependencies(f)):
                if version:
                    print(f"{name}\t{version}\t{lic or '?'}\t{src}")
            return 0
        if len(argv) < 4:
            print("uso: deps.py faltantes CONFIG|- ARQUIVO...", file=sys.stderr)
            return 2
        if argv[2] == "-":
            config = sys.stdin.read()
        else:
            config = Path(argv[2]).read_text(encoding="utf-8") if Path(argv[2]).is_file() else "{}"
        have = approved(config)
        for name, version, _, _ in (d for f in argv[3:] for d in dependencies(f)):
            if not version:
                print(f"sem versão: {name}")
            elif f"{name}@{version}" not in have:
                print(f"faltando: {name}@{version}")
        return 0
    except DepsError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
