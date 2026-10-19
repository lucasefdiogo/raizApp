#!/usr/bin/env python3
"""lux aparelho: checks the machine that runs the E2E flows on an Android emulator (stdlib only).

Inside WSL the emulator lives on Windows, so adb is bridged: the adb server runs on Windows listening on the
WSL subnet's gateway, and the WSL adb client reaches it through ADB_SERVER_SOCKET. This script checks the
tools, starts that server (never opens the firewall, never installs anything: it prints the command) and
warns when port 5037 is reachable beyond the WSL interface. Details and the exact commands: docs/aparelho.md.
Exit 0: nothing missing (warnings do not count); 1: something missing; 2: bad usage.
"""
import base64
import glob
import ipaddress
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True  # sibling scripts are loaded by path: no __pycache__ in .lux/ (it would dirty the tree)
PORT = 5037
RULE = "Lux adb WSL"
WSL_ADAPTER = "vEthernet (WSL (Hyper-V firewall))"  # name of the adapter on WSL 2.x with the Hyper-V firewall; Get-NetAdapter shows it
RULE_REMOTE = ipaddress.ip_network("172.16.0.0/12")  # the private range WSL's NAT subnet is drawn from
WSL_ALIAS = "vEthernet (WSL"  # any WSL adapter name (also plain "vEthernet (WSL)") counts as the WSL interface when judging exposure
WIN_ADB_GLOB = "/mnt/c/Users/*/AppData/Local/Android/Sdk/platform-tools/adb.exe"
SDK_INSTALL = 'sdkmanager --install "platform-tools" "platforms;android-36" "build-tools;36.0.0"'
# Tied to the WSL interface and to 172.16.0.0/12, profile Any (the WSL adapter has no network profile, so Private never matches).
FIREWALL_COMMAND = ("New-NetFirewallRule -DisplayName 'Lux adb WSL' -Direction Inbound -Protocol TCP -LocalPort 5037 "
                    "-InterfaceAlias 'vEthernet (WSL (Hyper-V firewall))' -RemoteAddress 172.16.0.0/12 -Profile Any -Action Allow")
FIREWALL_REMOVE = "Remove-NetFirewallRule -DisplayName 'Lux adb WSL'"
# Read-only. Inbound allow rules that reach port 5037: by port, or by an adb program with any port. ActiveStore is
# readable without admin; its address and interface filters are not, so those come from the few candidate rules only.
FIREWALL_QUERY = r"""
$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
$rules = Get-NetFirewallRule -PolicyStore ActiveStore -Direction Inbound -Enabled True -Action Allow
$ports = @{}; Get-NetFirewallPortFilter -PolicyStore ActiveStore | ForEach-Object { $ports[$_.InstanceID] = $_ }
$apps = @{}; Get-NetFirewallApplicationFilter -PolicyStore ActiveStore | ForEach-Object { $apps[$_.InstanceID] = $_ }
$svcs = @{}; Get-NetFirewallServiceFilter -PolicyStore ActiveStore | ForEach-Object { $svcs[$_.InstanceID] = $_ }
$out = foreach ($r in $rules) {
  $id = $r.InstanceID; $p = $ports[$id]; $port = ($p.LocalPort -join ','); $prog = [string]$apps[$id].Program; $svc = [string]$svcs[$id].Service
  $any = ($prog -eq 'Any' -and $svc -eq 'Any')
  if ((($port -eq '5037') -and ($any -or $prog -like '*adb*.exe')) -or (($port -eq 'Any') -and ($prog -like '*adb*.exe'))) {
    $pr = Get-NetFirewallRule -Name $r.Name
    $a = $pr | Get-NetFirewallAddressFilter
    $i = $pr | Get-NetFirewallInterfaceFilter
    [pscustomobject]@{Name=$r.DisplayName;Profile=[string]$r.Profile;Remote=($a.RemoteAddress -join ',');Proto=[string]$p.Protocol;Port=$port;Prog=$prog;Iface=[string]$i.InterfaceAlias}
  }
}
@($out) | ConvertTo-Json -Compress
"""


def sh(argv, timeout=30, env=None):
    """(exit code, stdout + stderr); 127 when the program is missing or times out."""
    try:
        done = subprocess.run(list(argv), capture_output=True, text=True, errors="replace", timeout=timeout, env=env)
    except (OSError, subprocess.TimeoutExpired):
        return 127, ""
    return done.returncode, done.stdout + done.stderr


def is_wsl():
    try:
        return "microsoft" in Path("/proc/version").read_text().lower()
    except OSError:
        return False


def tcp_open(host, port):
    try:
        socket.create_connection((host, port), timeout=2).close()
        return True
    except OSError:
        return False


def background(argv):
    subprocess.Popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)


def gateway_ip(run=sh):
    """The Windows host as WSL sees it: the default route's gateway."""
    code, out = run(["ip", "route"])
    match = re.search(r"^default via (\d+\.\d+\.\d+\.\d+)", out, re.MULTILINE) if code == 0 else None
    return match.group(1) if match else None


def wsl_subnet(run=sh):
    code, out = run(["ip", "-o", "-4", "addr", "show", "eth0"])
    match = re.search(r"inet (\d+\.\d+\.\d+\.\d+/\d+)", out) if code == 0 else None
    return ipaddress.ip_interface(match.group(1)).network if match else None


def adb_env(env=None, wsl=None, run=sh):
    """A copy of env whose adb client talks to the Windows adb server (WSL only; a socket the user set is kept)."""
    env = dict(os.environ if env is None else env)
    if "ADB_SERVER_SOCKET" not in env and (is_wsl() if wsl is None else wsl):
        gateway = gateway_ip(run)
        if gateway:
            env["ADB_SERVER_SOCKET"] = f"tcp:{gateway}:{PORT}"
    return env


def adb_host(env=None, wsl=None, run=sh):
    """Host of the adb server, for tools that want it separately (maestro --host)."""
    socket_ = adb_env(env, wsl, run).get("ADB_SERVER_SOCKET", "")
    match = re.match(r"tcp:([^:]+):\d+$", socket_)
    return match.group(1) if match else "127.0.0.1"


def is_windows_binary(path):
    """A Windows executable (header MZ) reached through the WSL interop: not an adb client for the Linux side."""
    try:
        with open(path, "rb") as f:
            return f.read(2) == b"MZ"
    except OSError:
        return False


def adb_path(env):
    """The adb the Linux side will run: LUX_ADB, else the first adb on PATH (None when there is none)."""
    return env.get("LUX_ADB") or shutil.which("adb", path=env.get("PATH", ""))


def parse_firewall(text):
    json_lines = [line for line in text.splitlines() if line.startswith(("[", "{"))]
    text = (json_lines[0] if json_lines else text).strip()
    if not text or text == "null":
        return []
    rows = json.loads(text)
    return [rows] if isinstance(rows, dict) else rows


def _inside(token, subnet):
    """True when the remote address token (CIDR, range or single address) lies entirely in the subnet."""
    token = token.strip()
    try:
        if "-" in token:
            first, last = (ipaddress.ip_address(p.strip()) for p in token.split("-", 1))
            return first in subnet and last in subnet
        return ipaddress.ip_network(token, strict=False).subnet_of(subnet)
    except (ValueError, TypeError):
        return False


def exposure(rows, subnet, alias=WSL_ALIAS):
    """Warnings for inbound allow rules that make port 5037 reachable beyond the WSL subnet."""
    found = []
    for row in rows:
        if row.get("Proto", "Any") not in ("TCP", "Any", "") or row.get("Port") not in ("5037", "Any"):
            continue
        remote = [t for t in row.get("Remote", "").split(",") if t.strip()]
        on_wsl = bool(row.get("Iface")) and all(i.strip().startswith(alias) for i in row["Iface"].split(","))
        what = f'regra "{row.get("Name")}" libera a 5037 ({row.get("Prog") or "qualquer programa"}) para '
        if not remote or any(t.strip().lower() in ("any", "*", "internet") for t in remote):
            found.append(what + "qualquer endereço")
        elif remote == ["LocalSubnet"]:
            if not on_wsl:
                found.append(what + "a sub-rede local de qualquer adaptador (não só a do WSL)")
        elif not all(_inside(t, subnet) or (on_wsl and _inside(t, RULE_REMOTE)) for t in remote):
            found.append(what + f"{row['Remote']}, fora da sub-rede do WSL ({subnet})" + ("" if on_wsl else " e sem estar presa à interface do WSL"))
    return found


def rule_present(rows):
    """Our rule as FIREWALL_COMMAND creates it: TCP 5037, the WSL adapter, 172.16.0.0/12, profile Any."""
    def same_remote(text):
        try:
            return ipaddress.ip_network(text.strip(), strict=False) == RULE_REMOTE
        except ValueError:
            return False
    return any(r.get("Name") == RULE and r.get("Profile") == "Any" and r.get("Port") == "5037" and r.get("Proto") == "TCP"
               and r.get("Iface") == WSL_ADAPTER and same_remote(r.get("Remote", "")) for r in rows)


def java_major(text):
    match = re.search(r'version "(\d+)(?:\.(\d+))?', text)
    if not match:
        return None
    return int(match.group(2)) if match.group(1) == "1" and match.group(2) else int(match.group(1))


def exit_code(results):
    return 1 if any(level == "falta" for level, _, _ in results) else 0


class Aparelho:
    def __init__(self, env=None, run=sh, connect=tcp_open, popen=background, sleep=time.sleep, wsl=None, project=None,
                 win_adb=None, start=True):
        self.env = dict(os.environ if env is None else env)
        self.run, self.connect, self.popen, self.sleep = run, connect, popen, sleep
        self.wsl = is_wsl() if wsl is None else wsl
        self.project = Path(project or ".")
        self.win_adb = [Path(p) for p in sorted(glob.glob(WIN_ADB_GLOB))] if win_adb is None else win_adb
        self.start = start
        self.results = []
        self.exposed_fix = ""

    def add(self, level, text, fix=""):
        self.results.append((level, text, fix))

    def checks(self):
        self.results = []
        self.check_java()
        self.check_maestro()
        self.check_sdk()
        adb_ok = self.check_adb_client()
        reachable = True
        gateway = None
        if self.wsl:
            gateway = gateway_ip(self.run)
            reachable = self.check_bridge(gateway)
        if adb_ok and reachable:
            self.check_device()
        self.check_expo()
        self.check_exports(gateway)
        return self.results

    def check_java(self):
        code, out = self.run(["java", "-version"])
        major = java_major(out) if code == 0 else None
        if major and major >= 17:
            self.add("ok", f"Java {major}")
        else:
            found = f"Java {major} encontrado" if major else "Java não encontrado"
            self.add("falta", f"Java 17 ou mais ({found})", "sudo apt install openjdk-17-jdk")

    def check_maestro(self):
        code, out = self.run(["maestro", "--version"], timeout=60)
        version = re.search(r"\d+\.\d+\.\d+", out) if code == 0 else None
        if version:
            self.add("ok", f"maestro {version.group(0)}")
        else:
            self.add("falta", "maestro não encontrado", 'curl -fsSL "https://get.maestro.mobile.dev" | bash')

    def sdk_home(self):
        home = self.env.get("ANDROID_HOME") or self.env.get("ANDROID_SDK_ROOT")
        return Path(home) if home else None

    def check_sdk(self):
        sdk = self.sdk_home()
        if not sdk:
            self.add("falta", "SDK Linux: ANDROID_HOME não definido", f'export ANDROID_HOME="$HOME/Android/Sdk"  # e instale: {SDK_INSTALL} (docs/aparelho.md)')
            return
        if self.wsl and str(sdk).startswith("/mnt/"):
            self.add("falta", f"ANDROID_HOME aponta para o disco do Windows ({sdk}): o Gradle do WSL precisa de um SDK Linux",
                     f'export ANDROID_HOME="$HOME/Android/Sdk"  # e instale: {SDK_INSTALL} (docs/aparelho.md)')
            return
        parts = {"cmdline-tools/latest": (sdk / "cmdline-tools" / "latest" / "bin" / "sdkmanager").is_file(),
                 "platform-tools": (sdk / "platform-tools" / "adb").is_file(),
                 "platforms/android-36": (sdk / "platforms" / "android-36").is_dir(),
                 "build-tools": any((sdk / "build-tools").glob("*")) if (sdk / "build-tools").is_dir() else False}
        missing = [name for name, here in parts.items() if not here]
        if missing:
            self.add("falta", f"SDK Linux em {sdk}: faltam {', '.join(missing)}", f"{SDK_INSTALL}  # veja docs/aparelho.md")
        else:
            self.add("ok", f"SDK Linux em {sdk}")

    def adb(self):
        return self.env.get("LUX_ADB") or "adb"

    def check_adb_client(self):
        found = adb_path(self.env)
        if self.wsl and found and is_windows_binary(found):
            self.add("falta", f"o adb do PATH é o do Windows ({found}): o cliente do WSL precisa ser o do SDK Linux (ou LUX_ADB)",
                     'export PATH="$ANDROID_HOME/platform-tools:$PATH"  # com o SDK Linux instalado (docs/aparelho.md)')
            return False
        code, out = self.run([self.adb(), "version"])
        if code == 0:
            self.add("ok", f"adb {self.adb()}")
            return True
        self.add("falta", "adb do Linux não encontrado (platform-tools do SDK no PATH, ou LUX_ADB)",
                 'export PATH="$ANDROID_HOME/platform-tools:$PATH"')
        return False

    def find_windows_adb(self):
        for candidate in self.win_adb:
            if self.run([str(candidate), "version"])[0] == 0:
                return str(candidate)
        return "adb.exe" if self.run(["adb.exe", "version"])[0] == 0 else None

    def read_firewall(self):
        encoded = base64.b64encode(FIREWALL_QUERY.encode("utf-16-le")).decode()
        code, out = self.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], timeout=120)
        try:
            return parse_firewall(out) if code == 0 else None
        except ValueError:
            return None

    def check_bridge(self, gateway):
        """The Windows adb server and the firewall around it; True when the WSL client can reach the server."""
        if not gateway:
            self.add("falta", "WSL sem rota padrão: não achei o IP do Windows", "wsl --shutdown (no PowerShell) e abra o WSL de novo")
            return False
        subnet = wsl_subnet(self.run)
        rows = self.read_firewall()
        warnings = []
        if rows is None:
            self.add("aviso", "não consegui ler o firewall do Windows; confira à mão que a 5037 só é liberada para a sub-rede do WSL (docs/aparelho.md)")
        else:
            warnings = exposure(rows, subnet, WSL_ALIAS) if subnet else []
            for warning in warnings:
                self.add("aviso", f"exposta: {warning}")
            names = sorted({w.split('"')[1] for w in warnings})
            self.exposed_fix = "\n".join(f"Disable-NetFirewallRule -DisplayName '{n}'" for n in names)
            if not rule_present(rows):
                self.add("falta", f'firewall: regra "{RULE}" ausente ou diferente (5037 só pela interface {WSL_ADAPTER}, origem {RULE_REMOTE})', FIREWALL_COMMAND)
        target = f"{gateway}:{PORT}"
        if self.connect(gateway, PORT):
            self.add("ok", f"servidor adb do Windows escutando em {target}")
            return True
        if warnings:
            self.add("falta", f"servidor adb do Windows não iniciado em {target}: há regra expondo a 5037 além da sub-rede do WSL",
                     f"{self.exposed_fix}  # no PowerShell do Windows (como administrador), depois rode lux aparelho de novo")
            return False
        if not self.start:
            self.add("falta", f"servidor adb do Windows não está escutando em {target}", "lux aparelho  # sem --so-conferir, ele sobe o servidor")
            return False
        windows_adb = self.find_windows_adb()
        if not windows_adb:
            self.add("falta", "adb.exe do Windows não encontrado", "instale o Android Studio no Windows (platform-tools) e rode de novo")
            return False
        self.run([windows_adb, "kill-server"])  # a server started by Android Studio listens on loopback only
        self.popen([windows_adb, "-a", "-P", str(PORT), "nodaemon", "server"])
        for _ in range(10):
            if self.connect(gateway, PORT):
                self.add("ok", f"servidor adb do Windows iniciado em {target} (adb.exe -a -P {PORT} nodaemon server, em segundo plano)")
                return True
            self.sleep(1)
        self.add("falta", f"o servidor subiu, mas o WSL não conecta em {target}: provável firewall do Windows",
                 f"{FIREWALL_COMMAND}  # no PowerShell do Windows, como administrador; confira o nome do adaptador com Get-NetAdapter e veja docs/aparelho.md")
        return False

    def check_device(self):
        code, out = self.run([self.adb(), "devices"], timeout=30, env=adb_env(self.env, self.wsl, self.run))
        ready = [line.split()[0] for line in out.splitlines()[1:] if len(line.split()) == 2 and line.split()[1] == "device"]
        if ready:
            self.add("ok", f"aparelho ou emulador pronto: {', '.join(ready)}")
        else:
            self.add("falta", "nenhum emulador ou aparelho no adb devices", "abra o emulador no Android Studio (Device Manager) e rode lux aparelho de novo")

    def check_expo(self):
        try:
            manifest = json.loads((self.project / "package.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return
        deps = {**manifest.get("dependencies", {}), **manifest.get("devDependencies", {})}
        if "expo" not in deps:
            return
        if "expo-dev-client" in deps:
            self.add("ok", "expo-dev-client no package.json")
        else:
            self.add("falta", "expo-dev-client ausente no package.json (o E2E abre o app pelo dev client)",
                     "npx expo install expo-dev-client  # dependência nova: confirme o motivo, a versão e a licença antes")

    def check_exports(self, gateway):
        lines = []
        if self.wsl and gateway:
            lines.append(f"export ADB_SERVER_SOCKET=tcp:{gateway}:{PORT}")
        if self.sdk_home() and not (self.wsl and str(self.sdk_home()).startswith("/mnt/")):
            lines.append(f"export ANDROID_HOME={self.sdk_home()}")
        if lines:
            self.add("ok", "para usar adb e npx expo à mão neste shell (o lux e2e já exporta o ADB_SERVER_SOCKET sozinho):", "\n".join(lines))


def main(argv):
    args = argv[1:]
    if args not in ([], ["--so-conferir"]):
        print("uso: aparelho.py [--so-conferir]", file=sys.stderr)
        return 2
    results = Aparelho(project=".", start=not args).checks()
    for level, text, fix in results:
        print(f"{level}: {text}")
        for line in fix.splitlines():
            print(f"  {line}")
    return exit_code(results)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
