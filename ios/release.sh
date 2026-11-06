#!/bin/bash
# 把已提交的 v2/（题库和页面）装到 iPad。改了 v2/ 并推送后跑：bash ios/release.sh
# iPad 没连上就报错退出，不会悄悄跳过；安装不清进度（进度在 App 数据里）。
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; cd "$here"
list="$(mktemp)"; trap 'rm -f "$list"' EXIT
xcrun devicectl list devices --json-output "$list" >/dev/null
device="$(python3 - "$list" <<'PY'
import json, sys
ds = json.load(open(sys.argv[1]))['result']['devices']
ok = [d['identifier'] for d in ds if d['hardwareProperties'].get('deviceType') == 'iPad' and d['connectionProperties'].get('tunnelState') != 'unavailable' and d['deviceProperties'].get('developerModeStatus') == 'enabled']
print(ok[0] if len(ok) == 1 else '')
PY
)"
[ -n "$device" ] || { echo "错误：没找到唯一一台连着的 iPad。iPad 解锁并和这台 Mac 在同一 Wi-Fi 或连线后重跑。" >&2; exit 1; }
[ -z "$(git -C .. status --porcelain -- v2)" ] || echo "提醒：v2/ 有未提交改动，这些改动不会进 iPad（只打包已提交的）。"
xcodegen generate >/dev/null
xcodebuild -project KongMath.xcodeproj -scheme KongMath -configuration Release -destination 'generic/platform=iOS' -derivedDataPath build -allowProvisioningUpdates build -quiet
app=build/Build/Products/Release-iphoneos/KongMath.app
web="$(grep -o 'engine.js?v=[0-9]*' "$app/web/index.html" | head -1)"; head="$(git -C .. show HEAD:v2/index.html | grep -o 'engine.js?v=[0-9]*' | head -1)"
[ "$web" = "$head" ] || { echo "错误：打包版本 $web 和已提交的 $head 不一致" >&2; exit 1; }
xcrun devicectl device install app --device "$device" "$app" | tail -3
echo "已装到 iPad：${web#engine.js?v=} 版，提交 $(git -C .. rev-parse --short HEAD)"
