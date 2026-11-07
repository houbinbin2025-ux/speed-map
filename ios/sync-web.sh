#!/bin/bash
# 把已提交的 v2/ 打包进 App；只取 HEAD，避免带上正在修改、未验证的网页。
# 目录名不能含 v2：页面按路径里的 /v2/ 判定预览模式，App 要跑正式模式。
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$here/web"
find "$here/web" -mindepth 1 -delete   # 只清这个生成目录，防止残留已删除的旧文件
git -C "$here/.." archive HEAD v2 | tar -x --strip-components=1 -C "$here/web"
# 页面按 iPhone 横屏 932 点宽设计；只在打包副本里声明这个宽度，由系统等比放大铺满 iPad
sed -i '' 's/width=device-width,initial-scale=1,/width=932,/' "$here/web/index.html"
grep -q 'content="width=932,' "$here/web/index.html"
# 页面文案说的是手机 Safari，在 App 里要改说法（同样只改打包副本）
sed -i '' 's/进度只存在这部手机的 Safari 里。请一直用 Safari 打开，不要改成「添加到主屏幕」，也不要在无痕模式下用，否则会看不到进度。/进度保存在这台 iPad 的空空数学岛里。删除 App 会清除进度，删除前先导出。/' "$here/web/index.html"
perl -pi -e "s/长期保存：\\\$\\{persisted.*?'查询中'\\}/长期保存：App 内自动保留副本/" "$here/web/index.html"
grep -q '这台 iPad 的空空数学岛' "$here/web/index.html" || { echo "错误：v2 备份说明的文案变了，请同步 sync-web.sh" >&2; exit 1; }
grep -q '长期保存：App 内自动保留副本' "$here/web/index.html" || { echo "错误：v2 长期保存的文案变了，请同步 sync-web.sh" >&2; exit 1; }

# 让岛和家的场景跟着「界面大小」缩小（同样只改打包副本）：场景贴屏幕底部，上方露出天空或屋顶。
# __kongK 由 App.swift 的启动脚本提供。v2 这几行变了就报错，不会悄悄失效。
patch() {
  python3 - "$here/web/$1" "$2" "$3" <<'PY'
import sys
path, old, new = sys.argv[1:]
text = open(path, encoding='utf-8').read()
if text.count(old) != 1:
    sys.exit(f"错误：{path} 里找不到唯一的「{old}」，请同步 sync-web.sh")
open(path, 'w', encoding='utf-8').write(text.replace(old, new))
PY
}
# 岛
patch world.js "const W = () => root.clientWidth || innerWidth, H = () => root.clientHeight || innerHeight;" \
  "const W = () => root.clientWidth || innerWidth, FH = () => root.clientHeight || innerHeight, H = () => FH() * window.__kongK(), TOP = () => FH() - H();"
patch world.js "P = H() / WH; lastW = W();" \
  "P = H() / WH; lastW = W(); Lmain.style.top = Lfar.style.top = TOP() + 'px';"
patch world.js "ax = (camX + cx) / P, ay = cy / P;" \
  "ax = (camX + cx) / P, ay = (cy - TOP()) / P;"
patch world.js "say.style.top = ay * P - 46 + 'px';" \
  "say.style.top = TOP() + ay * P - 46 + 'px';"
# 家：同时让缩放后镜头停在原来看的位置
patch house.js "const VW = () => innerWidth, VH = () => innerHeight;" \
  "const VW = () => innerWidth, VH = () => innerHeight * window.__kongK(), TOP = () => innerHeight - VH(); let lastVW = 0;"
patch house.js "P = VH() / RH; [cvRoom" \
  "const mid = lastVW ? (camX + lastVW / 2) / P : null; P = VH() / RH; lastVW = VW(); world.style.top = TOP() + 'px'; [cvRoom"
patch house.js "maxX = Math.max(0, RW * P - VW()); setCam(camX);" \
  "maxX = Math.max(0, RW * P - VW()); setCam(mid === null ? camX : Math.max(0, Math.min(maxX, mid * P - VW() / 2)));"
patch house.js "tap((e.clientX + camX) / P, e.clientY / P);" \
  "tap((e.clientX + camX) / P, (e.clientY - TOP()) / P);"
patch index.html "#house #h_vp{position:absolute;inset:0;touch-action:none;background:#2a1d12}" \
  "#house #h_vp{position:absolute;inset:0;touch-action:none;background:repeating-linear-gradient(0deg,#3b2513 0 6px,#5a3a20 6px 34px)}"

# 方块世界（~/03_个人/测试/minecraft-web）打包到 web/world/，和数学岛共用存储，答题后回去自动领奖励。只取它已提交的版本
game="${KONG_WORLD_REPO:-$HOME/03_个人/测试/minecraft-web}"
[ -d "$game/.git" ] || { echo "错误：找不到方块世界仓库 $game" >&2; exit 1; }
mkdir -p "$here/web/world"
git -C "$game" archive HEAD index.html quest.js rewards.js unlock.js pal.js pal-art.js tiles.js math-bank.js three.min.js audio.js | tar -x -C "$here/web/world"
# 岛上加入口（只改打包副本，手机和网页不变）
cp "$here/world-entry.js" "$here/web/world-entry.js"
patch index.html "</body>" '<script src="world-entry.js"></script></body>'
