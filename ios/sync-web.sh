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
