# 真浏览器走查（Playwright，932×430 横屏）

需要本机装好 Python 版 Playwright（`pip install playwright && playwright install chromium`）；只给开发用，网页本身不依赖它。

```bash
python3 tools/e2e/e2e.py  . /tmp/km-e2e  40   # 口答：首次 → 摸底 → 今日练习 → 结算 → 各页 → 暂停 / 另一个页面 / 出错
python3 tools/e2e/e2e2.py . /tmp/km-e2e2      # 手写：程序画 0–9 校准并作答；暂停原题重出、返回手势、自由加练、v2 秒答练习
python3 tools/e2e/e2e3.py . /tmp/km-e2e3      # 速度预算、存不了进度提示条、正式版上线后旧预览页停写
```
每个脚本最后打印"错误 无"才算过；截图在第二个参数的目录里，逐张看。
