#!/usr/bin/env bash
# Builda, instala e abre o app no emulador Android, configurando o host do Metro
# automaticamente para o IP da VM WSL2.
#
# Por que isso existe: neste projeto o Metro roda dentro do WSL2, mas o emulador
# Android roda como processo do Windows (Android Studio). O host padrão que o app
# usa em emulador (10.0.2.2, alias do loopback do Windows) não alcança o Metro
# porque o WSL2 não expõe seu localhost para o Windows neste ambiente. A saída é
# apontar o app direto para o IP da VM WSL2 na rede virtual do Hyper-V, descoberto
# aqui a cada execução (não é fixo — muda a cada reinício do WSL).
set -euo pipefail

if [ -z "${ANDROID_HOME:-}" ]; then
  echo "ANDROID_HOME não está definido." >&2
  exit 1
fi

ADB="$ANDROID_HOME/platform-tools/adb"
PACKAGE="com.lucas.rootora"
ACTIVITY=".MainActivity"
METRO_PORT=8081
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

WSL_IP=$(ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1)
if [ -z "$WSL_IP" ]; then
  echo "Não foi possível detectar o IP da VM WSL2 (interface eth0)." >&2
  exit 1
fi
echo "IP da VM WSL2: $WSL_IP"

echo "Aguardando dispositivo/emulador..."
"$ADB" wait-for-device

echo "Buildando o APK debug..."
(cd "$SCRIPT_DIR/../android" && ./gradlew assembleDebug)

APK_PATH="$SCRIPT_DIR/../android/app/build/outputs/apk/debug/app-debug.apk"
echo "Instalando via adb install..."
"$ADB" install -r "$APK_PATH"

# Garante que o diretório de dados do app já existe antes de gravar a preferência
"$ADB" shell run-as "$PACKAGE" true

echo "Configurando host do Metro para ${WSL_IP}:${METRO_PORT}..."
PREFS_XML=$(mktemp)
trap 'rm -f "$PREFS_XML"' EXIT
cat > "$PREFS_XML" <<EOF
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="debug_http_host">${WSL_IP}:${METRO_PORT}</string>
</map>
EOF
"$ADB" push "$PREFS_XML" /data/local/tmp/prefs.xml > /dev/null
"$ADB" shell "run-as $PACKAGE sh -c 'mkdir -p shared_prefs && cat /data/local/tmp/prefs.xml > shared_prefs/${PACKAGE}_preferences.xml'"
"$ADB" shell rm /data/local/tmp/prefs.xml

echo "Reiniciando o app..."
"$ADB" shell am force-stop "$PACKAGE"
"$ADB" shell am start -n "$PACKAGE/$ACTIVITY" > /dev/null

echo "Pronto. Se o Metro (npm start) não estiver rodando, inicie-o antes de testar."
