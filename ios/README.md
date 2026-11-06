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
