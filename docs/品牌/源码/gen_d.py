# KongMath 方向 D · 岛世界：位图逐格手绘，脚本只负责上纹理、描边、转 SVG。
# 用法：python3 docs/品牌/源码/gen_d.py docs/品牌
import os, sys, importlib.util
OUT = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("gen", os.path.join(here, "gen.py"))
# 复用 A 的像素字标和工具函数（gen.py 运行时会重写 A/B/C，这里只取函数和位图）
src = open(os.path.join(here, "gen.py")).read().split("for name, fn in")[0]
G = {}; exec(src.replace("OUT = sys.argv[1]", "OUT = None"), G)
svg, runs, outline, cn_rows, word_rows = G["svg"], G["runs"], G["outline"], G["cn_rows"], G["word_rows"]

# 颜色全部取自 v4 原型 docs/原型-v4/岛世界.html 的 TEX 和 :root
PAL = {
 "G": "#7dbb44", "g": "#6fae3a", "h": "#62a033",          # 草
 "D": "#7a5230", "d": "#6b4628", "e": "#86593a",          # 泥土
 "S": "#8a8d94", "s": "#7c7f86", "t": "#979aa1",          # 石头
 "T": "#6b4628", "U": "#5a3a20",                          # 树干
 "L": "#4f8a2e", "l": "#3d7524", "m": "#2f5e1c",          # 树叶
 "P": "#4a2f1b",                                          # 旗杆
 "F": "#b3261e", "f": "#8a1c16",                          # 深红旗 = 练熟了
 "0": "#c2c4cc", "1": "#fff3b0", "2": "#f6a5a0", "3": "#b3261e",   # 四档熟练度矿块
 "o": "#000000",
}
SKY, CAVE = "#8fc8ff", "#1b1d22"

# ---------- 32×32 主图形（≥32px 用）----------
# 大写字母 = 底色，texture() 会按固定种子把同族颜色撒进去，像原型的方块纹理
M32 = [
 "................................",
 "................................",
 "................................",
 "................................",
 ".....LLLLL......................",
 "....LLLLLLL..........PFFFFF.....",
 "...LLLLLLLLL.........PFFFFF.....",
 "...LLLLLLLLL.........Pffff......",
 "....LLLLLLL..........P..........",
 "......LLL............P..........",
 ".......T.............P..........",
 ".......T.............P..........",
 ".......T.............P..........",
 ".......T.............P..........",
 ".GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.",
 ".GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.",
 ".DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD.",
 "..DDDDDDD00DD11DD22DD33DDDDDDD..",
 "...DDDDDD00DD11DD22DD33DDDDDD...",
 "....DDDDDDDDDDDDDDDDDDDDDDDD....",
 ".....SSSSSSSSSSSSSSSSSSSSSS.....",
 ".......SSSSSSSSSSSSSSSSSS.......",
 ".........SSSSSSSSSSSSSS.........",
 "...........SSSSSSSSSS...........",
 ".............SSSSSS.............",
 "...............SS...............",
 "................................",
 "................................",
 "................................",
 "................................",
 "................................",
 "................................",
]
# 整体上下居中：内容第 4–25 行，往下挪 1 行
M32 = M32[-1:] + M32[:-1]

FAMILY = {"G": "Ggh", "D": "Dde", "S": "Sst", "L": "Llm", "T": "TU"}
def texture(rows, seed=7):
    s = seed; out = []
    for y, r in enumerate(rows):
        line = ""
        for x, ch in enumerate(r):
            s = (s * 1103515245 + 12345) & 0x7fffffff
            if ch in FAMILY:
                fam = FAMILY[ch]
                if ch == "T": line += fam[(x + y) % 2]; continue
                line += fam[(s >> 8) % len(fam)]
            else:
                line += ch
        out.append(line)
    return out

MARK = outline(texture(M32))

# ---------- 16×16 favicon（逐格重画，只留记忆点：树、红旗、草顶、四色矿、往下收的岛底）----------
F16 = [
 "................",
 "..LLL...........",
 ".LLLLL....PFFF..",
 ".LLLLL....PFFF..",
 "..LLL.....P.....",
 "...T......P.....",
 ".gggggggggggggg.",
 ".DDDDDDDDDDDDDD.",
 ".DDDDD0123DDDDD.",
 "..DDDDDDDDDDDD..",
 "...SSSSSSSSSS...",
 ".....SSSSSS.....",
 ".......SS.......",
 "................",
 "................",
 "................",
]
F16 = F16[-1:] + F16[:-1]
FAV = outline(F16)

def files():
    f = {}
    f["mark.svg"] = svg(160, 160, runs(MARK, PAL, u=5), title="空空数学岛")
    f["favicon-16.svg"] = svg(16, 16, runs(FAV, PAL), title="空空数学岛")
    f["favicon-32.svg"] = svg(32, 32, runs(MARK, PAL), title="空空数学岛")
    # iPhone 图标：天空底（和 v4 首页一样），岛 32 格放在 36 格里，四周各留 2 格
    f["app-icon-180.svg"] = svg(180, 180, f'<rect width="180" height="180" fill="{SKY}"/>' + runs(MARK, PAL, ox=10, oy=10, u=5), title="空空数学岛")
    cn = cn_rows("空空数学岛"); en = word_rows("KongMath", ["I"]*4 + ["A"]*4)
    cw, ew = len(cn[0]), len(en[0])
    for theme in ("dark", "light"):
        ink = "#ecebe4" if theme == "dark" else CAVE
        acc = "#6fae3a" if theme == "dark" else "#3d7524"
        f[f"wordmark-cn-{theme}.svg"] = svg(cw*8, 11*8, runs(cn, {"X": ink}, u=8), title="空空数学岛")
        f[f"wordmark-en-{theme}.svg"] = svg(ew*8, 9*8, runs(en, {"I": ink, "A": acc}, u=8), title="KongMath")
        # 组合：文字块 22u（中文 11 + 空 2 + 英文 9）；岛的可见部分（第 4–26 行）对齐文字块高度
        u = 8; mu = 22*u/24
        body = runs(MARK, PAL, ox=0, oy=-4*mu, u=mu)
        x0 = 32*mu + 3*u
        body += runs(cn, {"X": ink}, ox=x0, oy=0, u=u)
        body += runs(en, {"I": ink, "A": acc}, ox=x0, oy=13*u, u=u)
        f[f"lockup-{theme}.svg"] = svg(round(x0 + cw*u), 22*u, body, title="KongMath · 空空数学岛")
    return f

d = os.path.join(OUT, "D-岛世界"); os.makedirs(d, exist_ok=True)
for k, v in files().items():
    open(os.path.join(d, k), "w").write(v)
print(sorted(os.listdir(d)))
