# 空空数学岛 iPad App

把 `v2/` 网页打包成可离线运行的 iPad App。网页本身不改，iPhone 和线上网页不受影响。

## 题库和页面同步到 iPad（改了 `v2/` 并推送后必须跑）
```bash
bash ios/release.sh
```
App 里的题是打包进去的，线上网页更新不会带到 iPad。这个脚本把已提交的 `v2/` 打包、核对版本、装到连着的 iPad；iPad 没连上会报错，不会悄悄跳过。只同步题库和页面，进度各存各的：手机和 iPad 的进度、秒答次数互不相通。

## 手动生成工程并安装到 iPad
```bash
cd ios
bash sync-web.sh && xcodegen generate
xcodebuild -project KongMath.xcodeproj -scheme KongMath -configuration Release -destination 'generic/platform=iOS' -derivedDataPath build -allowProvisioningUpdates build
xcrun devicectl device install app --device <设备标识符> build/Build/Products/Release-iphoneos/KongMath.app
```
只打包已提交的 `v2/`，题目更新后要先提交，再重新安装。安装不会清除进度；删除 App 会。

## 进度
- 主存档在网页 localStorage，App 另存一份副本：`Library/Application Support/progress-backup.json`。
- 主存档缺失或损坏时从副本恢复；缺失或损坏的快照不会写入副本；清空进度不会被恢复。
- 只有一份副本，再往前的回退靠页面的每日备份（`.good`）和家长区的导出。

## 已知限制
- 竖着拿时只盖提示，题目计时不暂停。
- 改了 `v2/` 的备份说明或长期保存文案时，构建会报错，要同步 `sync-web.sh`。

## 界面大小

两指捏合或家长区「界面大小」可调 100%–60%，每档 10%，只存本机，不进进度。答题和手写页面不响应捏合。
按钮和题目靠放大页面逻辑宽度变小（`App/App.swift`）；岛和家的场景按比例缩小并贴屏幕底部（`sync-web.sh` 只改打包副本，`v2/` 对应代码变了会报错）。

## 方块世界

App 里打包了奖励游戏：`sync-web.sh` 用 `git archive HEAD` 把 `~/03_个人/测试/minecraft-web`（可用 `KONG_WORLD_REPO` 改）已提交的版本放进 `web/world/`，岛上左上角加一个方块图标进入（`world-entry.js`），游戏里左上角「回数学岛」回来。线上网页版没有这个入口。

游戏和数学岛共用 App 的 localStorage，进游戏自动领奖励。改了游戏要先提交，再跑 `bash ios/release.sh`。

**配置要求**：数学岛不能放进「学习应用」分组，否则在方块世界玩也会加宝石。
