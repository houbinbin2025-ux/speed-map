# 空空数学岛 iPad App

把 `v2/` 网页打包成可离线运行的 iPad App。网页本身不改，iPhone 和线上网页不受影响。

## 生成工程并安装到 iPad
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
