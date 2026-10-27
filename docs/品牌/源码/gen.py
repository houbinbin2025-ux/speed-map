# KongMath 品牌 SVG 生成器：位图与坐标都是手工定义的，这里只负责把它们转成 SVG。
import os, sys
OUT = sys.argv[1]

# ---------- 颜色 token ----------
C = dict(cave="#1b1d22", stone="#2a2d34", ink="#ecebe4", paper="#f4ecd8", grass="#3d7524",
         lv0="#9a9ca6", lv1="#fff3b0", lv2="#f6a5a0", lv3="#b3261e", black="#000000")

def svg(w, h, body, vb=None, title="KongMath"):
    vb = vb or f"0 0 {w} {h}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}" '
            f'shape-rendering="crispEdges" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n')

def runs(rows, palette, ox=0, oy=0, u=1):
    """把字符位图转成按行合并的 rect：同一颜色连续格合成一个矩形。"""
    out = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            ch = row[x]
            if ch in palette:
                x2 = x
                while x2 < len(row) and row[x2] == ch: x2 += 1
                out.append(f'<rect x="{ox+x*u:g}" y="{oy+y*u:g}" width="{(x2-x)*u:g}" height="{u:g}" fill="{palette[ch]}"/>')
                x = x2
            else:
                x += 1
    return "".join(out)

def outline(rows, ch="o"):
    """给剪影外描一圈 1 格黑边（4 邻接），像素精灵的经典做法：深底浅底都立得住。"""
    H, W = len(rows), len(rows[0])
    g = [list(r) for r in rows]
    filled = lambda y, x: 0 <= y < H and 0 <= x < W and rows[y][x] != "."
    for y in range(H):
        for x in range(W):
            if rows[y][x] == "." and any(filled(y+dy, x+dx) for dy, dx in ((1,0),(-1,0),(0,1),(0,-1))):
                g[y][x] = ch
    return ["".join(r) for r in g]

# ================= 方向 A · 像素方块岛 =================
# 16×16 网格。四层台阶 = 四档熟练度（灰→淡黄→淡红→深红），每层两行：上行 token 色，下行压暗做方块侧面。
A_MARK = [
 "................",
 "................",
 "...........RRR..",
 "...........RRr..",
 "........PPPRRR..",
 "........PPpRRr..",
 ".....YYYPPPRRR..",
 ".....YYyPPpRRr..",
 "..GGGYYYPPPRRR..",
 "..GGgYYyPPpRRr..",
 ".LLLLLLLLLLLLLL.",
 ".llllllllllllll.",
 "..DDDDDDDDDDDD..",
 "....dddddddd....",
 "......dddd......",
 "................",
]
A_PAL = dict(R="#c8352b", r="#8c1c16", P="#f6a5a0", p="#d4807b", Y="#fff3b0", y="#e3cf72",
             G="#c2c4cc", g="#9a9ca6", L="#6fae3a", l="#3d7524", D="#7a5230", d="#5a3a20", o="#000000")
A_MARK_O = outline(A_MARK)

# 16px 专用版：去掉每层的明暗两行，只留四块纯色 + 草 + 土（细节删到只剩记忆点）
A_FAV = [r.replace("r","R").replace("p","P").replace("y","Y").replace("g","G") for r in A_MARK]
A_FAV_O = outline(A_FAV)

# 英文像素字 5×7（小写 x 高 5，g 带 2 行下伸）
GLYPH = {
"K":["X...X","X..X.","X.X..","XX...","X.X..","X..X.","X...X",".....","....."],
"o":[".....",".....",".XXX.","X...X","X...X","X...X",".XXX.",".....","....."],
"n":[".....",".....","XXXX.","X...X","X...X","X...X","X...X",".....","....."],
"g":[".....",".....",".XXXX","X...X","X...X","X...X",".XXXX","....X","XXXX."],
"M":["X...X","XX.XX","X.X.X","X.X.X","X...X","X...X","X...X",".....","....."],
"a":[".....",".....",".XXX.","....X",".XXXX","X...X",".XXXX",".....","....."],
"t":[".X..",".X..","XXXX",".X..",".X..",".X..","..XX","....","...."],
"h":["X....","X....","XXXX.","X...X","X...X","X...X","X...X",".....","....."],
}
def word_rows(word, colors):
    rows = [""]*9
    for i, ch in enumerate(word):
        gl = GLYPH[ch]
        for r in range(9):
            rows[r] += gl[r].replace("X", colors[i]) + ("." if i < len(word)-1 else "")
    return rows

# 中文像素字 11×11（逐格手绘）
CN = {
"空":[
 ".....X.....",
 "XXXXXXXXXXX",
 "X...X.X...X",
 "...X...X...",
 "..X.....X..",
 "...........",
 ".XXXXXXXXX.",
 ".....X.....",
 ".....X.....",
 ".....X.....",
 "XXXXXXXXXXX"],
"数":[
 "X.X.X..X...",
 "..X....X...",
 "XXXXX..XXXX",
 ".XXX.....X.",
 "X.X.X....X.",
 "..X....X.X.",
 "XXXXX...X..",
 ".X..X..X.X.",
 "..XX..X...X",
 ".X..X......",
 "X.........."],
"学":[
 "..X..X..X..",
 "...X.X.X...",
 "XXXXXXXXXXX",
 "X.........X",
 "..XXXXXXX..",
 ".......X...",
 ".....XX....",
 "XXXXXXXXXXX",
 ".....X.....",
 ".....X.....",
 "....XX....."],
"岛":[
 "....X......",
 ".XXXXXXX...",
 ".X..X..X...",
 ".X.....X...",
 ".XXXXXXXXXX",
 "..........X",
 "X...X...X.X",
 "X...X...X.X",
 "X...X...X.X",
 "XXXXXXXXX.X",
 "........XX."],
}
def cn_rows(text, gap=2):
    rows = [""]*11
    for i, ch in enumerate(text):
        for r in range(11):
            rows[r] += CN[ch][r] + ("."*gap if i < len(text)-1 else "")
    return rows

def A_files(theme):
    ink = C["ink"] if theme == "dark" else C["cave"]
    acc = "#6fae3a" if theme == "dark" else C["grass"]
    files = {}
    files["mark.svg"] = svg(160, 160, runs(A_MARK_O, A_PAL, u=10), title="空空数学岛")
    files["favicon-16.svg"] = svg(16, 16, f'<rect width="16" height="16" fill="{C["cave"]}"/>' + runs(A_FAV_O, A_PAL), title="空空数学岛")
    files["favicon-32.svg"] = svg(32, 32, f'<rect width="32" height="32" fill="{C["cave"]}"/>' + runs(A_MARK_O, A_PAL, u=2), title="空空数学岛")
    # iPhone 图标 180：深洞穴底，标志 16 格放在 18 格里留 1 格边
    files["app-icon-180.svg"] = svg(180, 180, f'<rect width="180" height="180" fill="{C["cave"]}"/>' + runs(A_MARK_O, A_PAL, ox=10, oy=10, u=10), title="空空数学岛")
    cn = cn_rows("空空数学岛")
    en = word_rows("KongMath", ["I"]*4 + ["A"]*4)
    cw = len(cn[0])
    files[f"wordmark-cn-{theme}.svg"] = svg(cw*8, 11*8, runs(cn, {"X": ink}, u=8), title="空空数学岛")
    ew = len(en[0])
    files[f"wordmark-en-{theme}.svg"] = svg(ew*8, 9*8, runs(en, {"I": ink, "A": acc}, u=8), title="KongMath")
    # 横向组合：中文 11u + 空 2u + 英文 9u（含下伸）= 22u；标志 1.25u 一格，可见高 15 格 ≈ 19u
    u = 8
    mu = u*1.25
    body = runs(A_MARK_O, A_PAL, ox=0, oy=-mu*1+u*0.5, u=mu)
    x0 = 16*mu + 3*u
    body += runs(cn, {"X": ink}, ox=x0, oy=0, u=u)
    body += runs(en, {"I": ink, "A": acc}, ox=x0, oy=13*u, u=u)
    W = x0 + cw*u
    files[f"lockup-{theme}.svg"] = svg(W, 22*u, body, title="KongMath · 空空数学岛")
    return files

# ================= 方向 B · 等距方块岛 =================
# 64 网格。等距草方块，顶面分成 4 块"板块"地，四色 = 四档熟练度；侧面草皮 + 泥土。
def B_mark_body(simple=False):
    T = lambda pts, f: f'<polygon points="{pts}" fill="{f}"/>'
    b = ""
    b += T("32,6 58,19 58,45 32,58 6,45 6,19", "#000000")            # 外轮廓（描边感）
    b += T("8,20 32,32 32,56 8,44", "#7a5230")                        # 左侧泥土
    b += T("32,32 56,20 56,44 32,56", "#5a3a20")                      # 右侧泥土
    b += T("8,20 32,32 32,37 8,25", "#3d7524")                        # 左侧草皮
    b += T("32,32 56,20 56,25 32,37", "#2c5a19")                      # 右侧草皮
    b += T("32,8 56,20 32,32 8,20", "#6fae3a")                        # 顶面草
    if not simple:
        k = 0.78  # 板块内缩，露出草缝
        tiles = [((32,8),(44,14),(32,20),(20,14),"#b3261e"),
                 ((44,14),(56,20),(44,26),(32,20),"#f6a5a0"),
                 ((20,14),(32,20),(20,26),(8,20),"#fff3b0"),
                 ((32,20),(44,26),(32,32),(20,26),"#c2c4cc")]
        for *pts, col in tiles:
            cx = sum(p[0] for p in pts)/4; cy = sum(p[1] for p in pts)/4
            q = " ".join(f"{cx+(x-cx)*k:.2f},{cy+(y-cy)*k:.2f}" for x, y in pts)
            b += T(q, col)
    else:
        # 16px：顶面直接切四色，不留缝
        b += T("32,8 44,14 32,20 20,14", "#b3261e") + T("44,14 56,20 44,26 32,20", "#f6a5a0")
        b += T("20,14 32,20 20,26 8,20", "#fff3b0") + T("32,20 44,26 32,32 20,26", "#c2c4cc")
    return b

def B_files(theme):
    ink = C["ink"] if theme == "dark" else C["cave"]
    acc = "#6fae3a" if theme == "dark" else C["grass"]
    rnd = 'ui-rounded, &quot;SF Pro Rounded&quot;, &quot;Arial Rounded MT Bold&quot;, sans-serif'
    cnf = '&quot;PingFang SC&quot;, &quot;Hiragino Sans GB&quot;, &quot;Microsoft YaHei&quot;, sans-serif'
    f = {}
    def g(s): return s.replace('shape-rendering="crispEdges"', 'shape-rendering="geometricPrecision"')
    f["mark.svg"] = g(svg(160, 160, f'<g transform="scale(2.5)">{B_mark_body()}</g>', title="空空数学岛"))
    f["favicon-16.svg"] = g(svg(16, 16, f'<rect width="16" height="16" fill="{C["cave"]}"/><g transform="scale(0.25)">{B_mark_body(True)}</g>', title="空空数学岛"))
    f["favicon-32.svg"] = g(svg(32, 32, f'<rect width="32" height="32" fill="{C["cave"]}"/><g transform="scale(0.5)">{B_mark_body(True)}</g>', title="空空数学岛"))
    f["app-icon-180.svg"] = g(svg(180, 180, f'<rect width="180" height="180" fill="{C["cave"]}"/><g transform="translate(18 16) scale(2.25)">{B_mark_body()}</g>', title="空空数学岛"))
    f[f"wordmark-cn-{theme}.svg"] = g(svg(400, 80, f'<text x="0" y="62" font-family="{cnf}" font-weight="600" font-size="72" letter-spacing="4" fill="{ink}">空空数学岛</text>', title="空空数学岛"))
    f[f"wordmark-en-{theme}.svg"] = g(svg(330, 80, f'<text x="0" y="60" font-family="{rnd}" font-weight="800" font-size="66" letter-spacing="-1" fill="{ink}">Kong<tspan fill="{acc}">Math</tspan></text>', title="KongMath"))
    body = f'<g transform="scale(2)">{B_mark_body()}</g>'
    body += f'<text x="148" y="66" font-family="{cnf}" font-weight="600" font-size="52" letter-spacing="3" fill="{ink}">空空数学岛</text>'
    body += f'<text x="149" y="112" font-family="{rnd}" font-weight="800" font-size="34" letter-spacing="0.5" fill="{ink}">Kong<tspan fill="{acc}">Math</tspan></text>'
    f[f"lockup-{theme}.svg"] = g(svg(440, 128, body, title="KongMath · 空空数学岛"))
    return f

# ================= 方向 C · 方格字标 =================
# 等宽线条（7 单位）在方格上构造的字标；"o" 是一个空心方块 = "空"。图形标 = 空心方块 → 实心方块。
def C_word_body(ink, acc, sw=7):
    P = lambda d, col=ink: f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="butt" stroke-linejoin="miter"/>'
    b = ""
    b += P("M3.5 0V40") + P("M25 0L7.5 22") + P("M12.5 17L26 40")                 # K
    b += P("M35.5 15.5H54.5V36.5H35.5Z", acc)                                       # o = 空心方块
    b += P("M66.5 40V15.5H81.5V40")                                                 # n
    b += P("M108.5 15.5V50.5H90") + P("M108.5 15.5H93.5V36.5H108.5")                # g
    b += P("M121.5 40V3.5L135.5 26L149.5 3.5V40")                           # M
    b += P("M160 15.5H175.5V40") + P("M175.5 26H163.5V36.5H175.5")                  # a
    b += P("M190.5 2V36.5H200") + P("M184 15.5H200")                                # t
    b += P("M210.5 0V40") + P("M210.5 15.5H225.5V40")                               # h
    return b   # 宽 229，高 54（含 g 下伸）

def C_mark_body(ink, acc):
    # 64 网格：左空心方块（空）+ 右实心方块（会了）
    return (f'<rect x="7" y="21" width="22" height="22" fill="none" stroke="{ink}" stroke-width="6" stroke-linejoin="miter"/>'
            f'<rect x="35" y="18" width="25" height="28" fill="{acc}"/>')

def C_files(theme):
    ink = C["ink"] if theme == "dark" else C["cave"]
    acc = "#e0473c" if theme == "dark" else C["lv3"]
    cnf = '&quot;PingFang SC&quot;, &quot;Hiragino Sans GB&quot;, &quot;Microsoft YaHei&quot;, sans-serif'
    f = {}
    def g(s): return s.replace('shape-rendering="crispEdges"', 'shape-rendering="geometricPrecision"')
    f[f"mark-{theme}.svg"] = g(svg(160, 160, f'<g transform="scale(2.5)">{C_mark_body(ink, acc)}</g>', title="空空数学岛"))
    if theme == "light":
        f["favicon-16.svg"] = svg(16, 16, f'<rect width="16" height="16" fill="{C["paper"]}"/><rect x="1.5" y="5.5" width="5" height="5" fill="none" stroke="{C["cave"]}" stroke-width="1"/><rect x="9" y="4" width="6" height="8" fill="{C["lv3"]}"/>', title="空空数学岛").replace('stroke-width="1"', 'stroke-width="1.6"').replace('x="1.5" y="5.5" width="5" height="5"', 'x="1.8" y="5.3" width="5.2" height="5.4"')
        f["favicon-32.svg"] = g(svg(32, 32, f'<rect width="32" height="32" fill="{C["paper"]}"/><g transform="scale(0.5)">{C_mark_body(C["cave"], C["lv3"])}</g>', title="空空数学岛"))
        f["app-icon-180.svg"] = g(svg(180, 180, f'<rect width="180" height="180" fill="{C["paper"]}"/><g transform="translate(18 18) scale(2.25)">{C_mark_body(C["cave"], C["lv3"])}</g>', title="空空数学岛"))
    f[f"wordmark-en-{theme}.svg"] = g(svg(470, 112, f'<g transform="translate(2 2) scale(2)">{C_word_body(ink, acc)}</g>', title="KongMath"))
    f[f"wordmark-cn-{theme}.svg"] = g(svg(400, 80, f'<text x="0" y="64" font-family="{cnf}" font-weight="600" font-size="72" letter-spacing="2" fill="{ink}">空空数学岛</text>', title="空空数学岛"))
    # 组合：英文主字标在上（字标优先），中文在下，左对齐 K 的竖笔外沿
    body = f'<g transform="scale(1.6)">{C_word_body(ink, acc)}</g>'
    body += f'<text x="0" y="132" font-family="{cnf}" font-weight="600" font-size="38" letter-spacing="9" fill="{ink}">空空数学岛</text>'
    f[f"lockup-{theme}.svg"] = g(svg(368, 142, body, title="KongMath · 空空数学岛"))
    return f

for name, fn in (("A-像素方块岛", A_files), ("B-等距方块岛", B_files), ("C-方格字标", C_files)):
    d = os.path.join(OUT, name); os.makedirs(d, exist_ok=True)
    allf = {}
    for t in ("dark", "light"): allf.update(fn(t))
    for k, v in allf.items():
        open(os.path.join(d, k), "w").write(v)
    print(name, sorted(allf))
