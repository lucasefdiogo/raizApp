#!/usr/bin/env python3
"""End-to-end flows of a HU (stdlib only): skeletons made from the sealed .feature files, device detection, the run.

The executor (maestro for mobile, playwright for web) and the command come from the `e2e` block of
verify.config.json on refs/heads/main, never from the working tree. Formats are in templates/formatos.md.
Exit 0: ok (flows green); 1: flows red; 2: bad usage or input; 3: pending, no device or browser to run on.
"""
import glob
import hashlib
import importlib.util
import json
import os
import re
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True  # sibling scripts are loaded by path: no __pycache__ in .lux/ (it would dirty the tree)
SKELETON = "LUX-ESQUELETO"
EXECUTORS = {"maestro": ".yaml", "playwright": ".spec.ts"}
SCENARIO = re.compile(r"^\s*(?:Cenário|Cenario|Esquema do Cenário|Esquema do Cenario|Scenario(?: Outline)?):\s*(.+?)\s*$")
EXAMPLES = re.compile(r"^\s*(?:Exemplos|Examples):")


class E2EError(Exception):
    """Bad input or usage; the CLI exits with 2."""


def load_aparelho():
    path = Path(__file__).resolve().parent / "aparelho.py"
    spec = importlib.util.spec_from_file_location("aparelho", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def metro_port(env=None):
    return int((os.environ if env is None else env).get("LUX_METRO_PORT", "8081"))


def git(root, *args):
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)


def project_root(path):
    out = git(path, "rev-parse", "--show-toplevel")
    if out.returncode != 0:
        raise E2EError(f"{path} não está num repositório git")
    return Path(out.stdout.strip())


def read_config(root):
    """The `e2e` block of main's verify.config.json (None when absent), validated."""
    out = git(root, "show", "refs/heads/main:verify.config.json")
    if out.returncode != 0:
        raise E2EError("verify.config.json não existe na main (rode /lux-preparar e faça o merge)")
    try:
        block = json.loads(out.stdout).get("e2e")
    except ValueError as e:
        raise E2EError(f"verify.config.json da main inválido: {e!r}")
    if block is None:
        return None
    if not isinstance(block, dict) or not isinstance(block.get("executor", ""), str):
        raise E2EError("bloco e2e do verify.config.json da main inválido")
    if block.get("executor", "") not in ("", *EXECUTORS):
        raise E2EError(f"executor de E2E desconhecido: {block['executor']} (use maestro ou playwright)")
    return block


def enabled_config(root):
    """The e2e block, or an error when the project has no executor (the skeleton needs one)."""
    block = read_config(root)
    if not block or not block.get("executor"):
        raise E2EError("e2e não está configurado na main: sem executor em verify.config.json (rode `lux atualizar-projeto` ou /lux-preparar)")
    return block


def hu_id(hu):
    match = re.match(r"(HU-\d+)(?:-|$)", Path(hu).resolve().name)
    if not match or not (Path(hu) / "spec.md").is_file():
        raise E2EError(f"{hu} não é uma pasta de HU")
    return match.group(1)


def scenarios(hu):
    """[(CA id, scenario title, step lines)] from the frozen cenarios/CA-xx.feature files."""
    found = []
    for feature in sorted((Path(hu) / "cenarios").glob("CA-*.feature")):
        title, steps = None, []
        for line in feature.read_text(encoding="utf-8").splitlines():
            if match := SCENARIO.match(line):
                title = " ".join(match.group(1).split())
            elif title and EXAMPLES.match(line):
                break
            elif title and line.strip() and not line.strip().startswith(("#", "@", "|")):
                steps.append(" ".join(line.split()))
        if title:
            found.append((feature.stem, title, steps))
    return found


def skeleton(executor, ca, title, steps, app=None):
    """The flow file text. `app` ({"id", "slug"}) marks an Expo project: the dev client opens by deep link."""
    if executor == "maestro":
        quoted = title.replace("\\", "\\\\").replace('"', '\\"')
        lines = [f"# {SKELETON}: gerado de cenarios/{ca}.feature; escreva os comandos do fluxo e apague esta linha.",
                 f"appId: {app['id'] if app else 'TODO.app.id'}", f'name: "{ca}: {quoted}"', "---"]
        if app:
            link = f"exp+{app['slug']}://expo-development-client/?url=http%3A%2F%2Flocalhost%3A{metro_port()}"
            lines += ["# O dev client abre pelo deep link, apontando para o Metro (o lux e2e faz o adb reverse); sem o seletor de servidores.",
                      f'- openLink: "{link}"']
        return "\n".join(lines + [f"# {s}" for s in steps]) + "\n"
    quoted = title.replace("\\", "\\\\").replace("'", "\\'")
    lines = [f"// {SKELETON}: gerado de cenarios/{ca}.feature; escreva o teste e apague esta linha.",
             "import { test, expect } from '@playwright/test';", "", f"test('{ca}: {quoted}', async ({{ page }}) => {{"]
    return "\n".join(lines + [f"  // {s}" for s in steps] + ["});"]) + "\n"


def flow_file(root, hu, ca, executor):
    return Path(root) / "e2e" / hu / f"{ca}{EXECUTORS[executor]}"


def detect(executor, env=None):
    """(available, detail): a ready device for maestro (`adb devices`), an installed browser for playwright."""
    env = os.environ if env is None else env
    if executor == "maestro":
        aparelho = load_aparelho()
        adb = aparelho.adb_path(env)
        if not adb or not os.access(adb, os.X_OK):
            return False, "sem aparelho: adb não encontrado (rode lux aparelho)"
        if aparelho.is_windows_binary(adb):
            return False, f"sem aparelho: o adb do PATH é o do Windows ({adb}); use o do SDK Linux (lux aparelho)"
        try:
            listing = subprocess.run([adb, "devices"], capture_output=True, text=True, timeout=30, env=aparelho.adb_env(env)).stdout
        except (OSError, subprocess.TimeoutExpired) as e:
            return False, f"sem aparelho: adb devices falhou: {e}"
        ready = [line.split()[0] for line in listing.splitlines()[1:] if len(line.split()) == 2 and line.split()[1] == "device"]
        return (True, ", ".join(ready)) if ready else (False, "sem aparelho: nenhum aparelho ou emulador pronto no adb devices (rode lux aparelho)")
    cache = env.get("PLAYWRIGHT_BROWSERS_PATH") or os.path.join(env.get("HOME", ""), ".cache", "ms-playwright")
    found = sorted(glob.glob(os.path.join(cache, "chromium*")))
    return (True, os.path.basename(found[0])) if found else (False, f"sem navegador: nenhum chromium do Playwright em {cache}")


def read_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def is_expo(root):
    manifest = read_json(Path(root) / "package.json")
    return isinstance(manifest, dict) and "expo" in manifest.get("dependencies", {})


def app_config(root):
    config = read_json(Path(root) / "app.json")
    return config.get("expo", config) if isinstance(config, dict) else {}


def app_id(root):
    package = (app_config(root).get("android") or {}).get("package")
    if not package:
        raise E2EError("app.json sem expo.android.package: o E2E precisa do id do app Android")
    return package


def expo_app(root):
    """{"id", "slug"} for the Expo project at root (placeholders for what app.json lacks), None for any other project."""
    if not is_expo(root):
        return None
    config = app_config(root)
    return {"id": (config.get("android") or {}).get("package") or "TODO.app.id", "slug": config.get("slug") or "TODO-slug"}


def native_fingerprint(root):
    """Hash of what forces a native rebuild: native dependencies (name and installed version), app config, local config plugins.

    A dependency is native when its package has an android/ folder or an expo-module.config.json; without
    node_modules every dependency counts as native. JS-only dependencies do not change it.
    """
    root = Path(root)
    manifest = read_json(root / "package.json") or {}
    native = {}
    for name, wanted in sorted(manifest.get("dependencies", {}).items()):
        package = root / "node_modules" / name
        installed = (read_json(package / "package.json") or {}).get("version") if package.is_dir() else None
        if name in ("expo", "react-native") or not package.is_dir() or (package / "android").is_dir() or (package / "expo-module.config.json").is_file():
            native[name] = installed or wanted
    config_files = {}
    for name in ("app.json", "app.config.js", "app.config.ts"):
        if (root / name).is_file():
            config_files[name] = (root / name).read_text(encoding="utf-8")
    plugins = {}
    for entry in app_config(root).get("plugins") or []:
        ref = entry[0] if isinstance(entry, list) and entry else entry
        if isinstance(ref, str) and ref.startswith("."):
            target = root / ref
            candidates = [target] + [Path(f"{target}{ext}") for ext in (".js", ".ts")] + [target / "app.plugin.js", target / "index.js"]
            found = next((c for c in candidates if c.is_file()), None)
            plugins[ref] = found.read_text(encoding="utf-8") if found else None
    return hashlib.sha256(json.dumps({"native": native, "config": config_files, "plugins": plugins}, sort_keys=True).encode()).hexdigest()


def state_file(root, env):
    base = env.get("XDG_CACHE_HOME") or os.path.join(env.get("HOME", str(Path.home())), ".cache")
    return Path(base) / "lux" / "e2e" / f"{hashlib.sha1(str(Path(root).resolve()).encode()).hexdigest()[:16]}.json"


class ExpoSession:
    """The Metro bundler lux started for a run (None when one was already listening); stops it on exit."""

    def __init__(self, metro=None):
        self.metro = metro

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        if self.metro is not None:
            try:
                os.killpg(self.metro.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            self.metro.wait()
        return False


def listening(port):
    with socket.socket() as s:
        s.settimeout(2)
        return s.connect_ex(("127.0.0.1", port)) == 0


def prepare_expo(root, env, wait=time.sleep):
    """Gets an Expo dev client app ready on the device: native build only when something native changed (or the
    app is not installed), adb reverse for Metro, Metro running. Returns a session to use as a context manager.

    The fingerprint is kept outside the repository (XDG_CACHE_HOME/lux/e2e), so the working tree stays clean.
    """
    root = Path(root)
    ident = app_id(root)
    adb = load_aparelho().adb_path(env) or "adb"
    port = metro_port(env)
    fingerprint = native_fingerprint(root)
    state = state_file(root, env)
    known = (read_json(state) or {}).get("hash")
    listing = subprocess.run([adb, "shell", "pm", "list", "packages", ident], capture_output=True, text=True, env=env).stdout
    if known != fingerprint or f"package:{ident}" not in listing.split():
        built = subprocess.run(["npx", "expo", "run:android", "--no-bundler"], cwd=root, env=env, capture_output=True, text=True, timeout=3600)
        if built.returncode != 0:
            tail = " ".join((built.stdout + built.stderr).split()[-30:])
            raise E2EError(f"build nativo falhou (código {built.returncode}): {tail}")
        state.parent.mkdir(parents=True, exist_ok=True)
        state.write_text(json.dumps({"hash": fingerprint, "appId": ident}), encoding="utf-8")
    subprocess.run([adb, "reverse", f"tcp:{port}", f"tcp:{port}"], capture_output=True, text=True, env=env)
    if listening(port):
        return ExpoSession()
    metro = subprocess.Popen(["npx", "expo", "start", "--dev-client", "--port", str(port)], cwd=root, env={**env, "CI": "1"},
                             stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    session = ExpoSession(metro)
    deadline = time.time() + 180
    while not listening(port):
        if metro.poll() is not None or time.time() > deadline:
            session.__exit__()
            raise E2EError(f"o Metro não subiu na porta {port}")
        wait(1)
    return session


def run(root, block, ident, env=None):
    """('verde'|'vermelho'|'pendente', detail): runs the e2e command of one HU when there is a device or browser.

    {hu} in the command is the HU id and {host} the adb server host. An Expo project with the maestro executor
    first gets its app ready (prepare_expo).
    """
    command = block.get("command", "")
    if not command.strip():
        raise E2EError("e2e.command vazio no verify.config.json da main")
    ok, detail = detect(block["executor"], env)
    if not ok:
        return "pendente", detail
    full = {**os.environ, **(env or {})}
    if block["executor"] == "maestro":
        full = load_aparelho().adb_env(full)
        host = load_aparelho().adb_host(full)
        command = command.replace("{host}", host)
    command = command.replace("{hu}", ident)
    session = ExpoSession()
    try:
        if block["executor"] == "maestro" and is_expo(root):
            try:
                session = prepare_expo(root, full)
            except E2EError as e:
                if str(e).startswith("build nativo falhou") or str(e).startswith("o Metro"):
                    return "vermelho", str(e)
                raise
        code = subprocess.run(["bash", "-c", command], cwd=root, capture_output=True, text=True, env=full).returncode
    finally:
        session.__exit__()
    return ("verde", detail) if code == 0 else ("vermelho", f"comando saiu com código {code}")


def pending_line(detail):
    return f"e2e pendente: {detail.split(':')[0]}"


def detectar(args):
    if args:
        raise E2EError("uso: e2e.py detectar")
    block = enabled_config(project_root("."))
    ok, detail = detect(block["executor"])
    print(f"aparelho: {detail}" if ok else pending_line(detail))
    return 0 if ok else 3


def rodar(args):
    if len(args) != 1:
        raise E2EError("uso: e2e.py rodar <pasta-da-HU>")
    hu = Path(args[0])
    ident = hu_id(hu)
    block = enabled_config(project_root(hu))
    status, detail = run(project_root(hu), block, ident)
    if status == "pendente":
        print(pending_line(detail))
        return 3
    print(f"e2e {status}: {detail}")
    return 0 if status == "verde" else 1


def esqueleto(args):
    if len(args) != 1:
        raise E2EError("uso: e2e.py esqueleto <pasta-da-HU>")
    hu = Path(args[0])
    ident = hu_id(hu)
    root = project_root(hu)
    executor = enabled_config(root)["executor"]
    found = scenarios(hu)
    if not found:
        raise E2EError(f"{hu} não tem cenarios/CA-xx.feature")
    for ca, title, steps in found:
        path = flow_file(root, ident, ca, executor)
        if path.exists():
            print(f"pulado (já existe): {path.relative_to(root)}")
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(skeleton(executor, ca, title, steps, app=expo_app(root) if executor == "maestro" else None), encoding="utf-8")
        print(f"criado: {path.relative_to(root)}")
    return 0


COMMANDS = {"esqueleto": esqueleto, "detectar": detectar, "rodar": rodar}


def main(argv):
    if len(argv) < 2 or argv[1] not in COMMANDS:
        print("uso: e2e.py " + "|".join(COMMANDS) + " [argumentos]", file=sys.stderr)
        return 2
    try:
        return COMMANDS[argv[1]](argv[2:])
    except E2EError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
