# 真浏览器走查（Playwright，932×430 横屏）

需要本机装好 Python 版 Playwright（`pip install playwright && playwright install chromium`）；只给开发用，网页本身不依赖它。

```bash
python3 tools/e2e/e2e.py  . /tmp/km-e2e  40   # 口答：首次 → 摸底 → 今日练习 → 结算 → 各页 → 暂停 / 另一个页面 / 出错
python3 tools/e2e/e2e2.py . /tmp/km-e2e2      # 手写：程序画 0–9 校准并作答；暂停原题重出、返回手势、自由加练、v2 秒答练习
python3 tools/e2e/e2e3.py . /tmp/km-e2e3      # 速度预算、存不了进度提示条、正式版上线后旧预览页停写
python3 tools/e2e/e2e4.py . /tmp/e2e4        # 答错：显示「你写的是」、进错题宝箱、结算和错题宝箱里看得到（10-29 踩坑）
python3 tools/e2e/e2e5.py /tmp/e2e5                # 宽版答错（比大小点选、数线）：「继续」看得见点得到，左栏不叠字、不出屏 × 3 种尺寸（10-31）
python3 tools/e2e/e2e6.py . /tmp/e2e6             # 不会 / 写错后停住等「继续」；连点两下「继续」只进一题（理解题 + 秒答地图 × 3 种尺寸 × 鼠标 / 触屏，10-31）
python3 tools/e2e/overflow.py . 30            # 遮盖扫描：每种题的题面 + 答错图解 × 6 种 iPhone 横屏尺寸，超出左栏 / 钻到写字板下 / 出屏 = 失败（退出码 1）
```
每个脚本最后打印"错误 无"才算过；截图在第二个参数的目录里，逐张看。

`overflow.py` 打印每个尺寸「问题数 0」才算过。改了题面、图解或页面排版（`render.js` / `index.html` 的样式）必须跑（10-28 踩坑：两个十格框 448px 宽塞进 330px 左栏，右半边被写字板盖住，截图走查没发现）。
