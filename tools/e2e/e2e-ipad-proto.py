# iPad 答题原型（docs/原型/ipad/）：6 种布局都在 iPad 横屏里放得下；每种布局真写答案（逐格画数字）判对、写错判错、「不会」给讲解
# 用法：python3 tools/e2e/e2e-ipad-proto.py <项目根> <截图目录>
import sys, pathlib, math
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'docs' / '原型' / 'ipad' / 'index.html').as_uri()
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
# 标准写法（和 ink.js 的 STD 同一套坐标，0.6 × 1）
def arc(cx, cy, rx, ry, a0, a1, n=18): return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / (n - 1))), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / (n - 1)))) for i in range(n)]
D = {0: [arc(.3, .5, .3, .5, -90, 270, 30)], 1: [[(.05, .2), (.3, 0), (.3, 1)]], 2: [arc(.3, .27, .3, .27, 190, 390, 14) + [(0, 1), (.6, 1)]],
     3: [arc(.28, .25, .28, .25, 210, 450, 14) + arc(.28, .73, .32, .27, 270, 510, 16)], 4: [[(.45, 0), (0, .68), (.6, .68)], [(.45, 0), (.45, 1)]],
     5: [[(.55, 0), (.08, 0), (.04, .42)] + arc(.28, .7, .32, .3, 230, 510, 16)[1:]], 6: [arc(.42, .35, .42, .35, 290, 180, 8) + arc(.3, .72, .3, .28, 180, 540, 18)],
     7: [[(0, 0), (.6, 0), (.2, 1)]], 8: [arc(.3, .24, .24, .24, 90, 450, 16) + arc(.3, .74, .3, .26, -90, 270, 18)], 9: [arc(.3, .28, .3, .28, 0, 360, 18) + [(.6, .28), (.5, 1)]]}
def write(pg, el, d):
    b = el.bounding_box(); h = b['height'] * .62; w = h * .6; x0 = b['x'] + (b['width'] - w) / 2; y0 = b['y'] + (b['height'] - h) / 2
    for st in D[d]:
        pts = [(x0 + x * w / .6, y0 + y * h) for x, y in st]
        pg.mouse.move(*pts[0]); pg.mouse.down()
        for p in pts[1:]: pg.mouse.move(*p, steps=2)
        pg.mouse.up()
def answer(pg, ans, rem=None):
    cells = pg.locator('.cell'); n = cells.count() - (1 if rem is not None else 0); s = str(ans)
    for i, ch in enumerate(s): write(pg, cells.nth(n - len(s) + i), int(ch))
    if rem is not None: write(pg, cells.nth(n), rem)
with sync_playwright() as p:
    b = __import__('quiet').launch(p); pg = b.new_page(viewport={'width': 1194, 'height': 834}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(300)
    kinds = pg.evaluate("KINDS")
    # 第一次进每种版面先出示范卡（另一组数字），按计算顺序一步一步写，点「我会了」才开始写
    for k in kinds:
        pg.evaluate(f"localStorage.removeItem('ipadproto.demo.{k}'); Q.kind='{k}'; Q.i=0; render()"); pg.wait_for_timeout(200)
        check(pg.locator('#demo').is_visible(), f'{k} 第一次出示范卡')
        if k == 'vert':
            # 先摆出整道题：答案、进位都还没写；第一步算的是个位
            hidden = pg.evaluate("[...document.querySelectorAll('#demoBody .g .q')].every(e=>e.classList.contains('hid'))")
            check(hidden, '示范开始时答案都还没写')
            pg.wait_for_timeout(1800); tip = pg.inner_text('#demoTip')
            check(tip.startswith('个位'), f'示范第一步算个位：{tip}')
            shown = pg.evaluate("[...document.querySelectorAll('#demoBody .g .q')].map(e=>e.classList.contains('hid')?'_':e.textContent).join('')")
            check(shown.endswith('3') and '_' in shown, f'只写出了个位：{shown}')
            pg.screenshot(path=str(out / 'demo-step1.png'))
            pg.wait_for_timeout(2900); check(pg.inner_text('#demoTip').startswith('十位'), '第二步算十位')
            pg.wait_for_timeout(5800); pg.screenshot(path=str(out / 'demo.png'))
        pg.click('#demoGo'); pg.wait_for_timeout(150)
        check(not pg.locator('#demo').is_visible(), f'{k} 点「我会了」关掉示范')
        pg.evaluate(f"render()"); pg.wait_for_timeout(150)
        check(not pg.locator('#demo').is_visible(), f'{k} 看过以后不再自动出')
    pg.click('#seeDemo'); pg.wait_for_timeout(200); check(pg.locator('#demo').is_visible(), '「看示范」能再看'); pg.click('#demoGo')
    for k in kinds:
        n = pg.evaluate(f"BANK['{k}'].qs.length")
        for i in range(n):
            pg.evaluate(f"Q.kind='{k}'; Q.i={i}; render()"); pg.wait_for_timeout(200)
            q = pg.evaluate("BANK[Q.kind].qs[Q.i]")
            over = pg.evaluate("[...document.querySelectorAll('#stage *')].filter(e=>!e.closest('#res')&&(()=>{const r=e.getBoundingClientRect();return r.width&&(r.right>1195||r.bottom>835)})()).length")
            check(over == 0, f'{k}#{i} 放得下（超出 {over} 个；答完才滑出的讲解栏不算）')
            cw = pg.evaluate("Math.min(...[...document.querySelectorAll('.cell')].map(c=>c.getBoundingClientRect().width))")
            check(cw >= 90, f'{k}#{i} 答案格够手指写（最窄 {cw:.0f}）')
            answer(pg, q['ans'], q.get('rem')); pg.wait_for_timeout(100)
            if i == 0: pg.screenshot(path=str(out / f'{k}-write.png'))
            pg.click('#done'); pg.wait_for_timeout(400)
            big = pg.inner_text('#res .big')
            check('对了' in big, f'{k}#{i} 写对 {q["ans"]} 判对：{big} · {pg.inner_text("#res .muted")}')
            if i == 0: pg.screenshot(path=str(out / f'{k}-ok.png'))
    # 写错判错、不会给讲解
    pg.evaluate("Q.kind='vert'; Q.i=0; render()"); pg.wait_for_timeout(200)
    answer(pg, 189); pg.click('#done'); pg.wait_for_timeout(300)
    check('再看看' in pg.inner_text('#res .big'), '写错 189 判错'); pg.screenshot(path=str(out / 'vert-bad.png'))
    pg.evaluate("render()"); pg.wait_for_timeout(200); pg.click('#dunno'); pg.wait_for_timeout(300)
    check('借' in pg.inner_text('#res .why'), '不会：出讲解')
    # 中间空一格算错
    pg.evaluate("Q.kind='vert'; Q.i=0; render()"); pg.wait_for_timeout(200)
    cells = pg.locator('.cell'); write(pg, cells.nth(0), 1); write(pg, cells.nth(2), 9); pg.click('#done'); pg.wait_for_timeout(300)
    check('再看看' in pg.inner_text('#res .big'), '中间空一格判错')
    # 除法商的最高位写 0：不规范，判错并提示
    pg.evaluate("Q.kind='div'; Q.i=0; render()"); pg.wait_for_timeout(200)
    cells = pg.locator('.cell'); [write(pg, cells.nth(i), d) for i, d in enumerate([0, 1, 3, 4])]; pg.click('#done'); pg.wait_for_timeout(300)
    check('最高位不写 0' in pg.inner_text('#res'), '商最高位写 0 判错并提示')
    # 一格写两个数：提示一格一个
    pg.evaluate("Q.kind='vert'; Q.i=0; render()"); pg.wait_for_timeout(200)
    c0 = pg.locator('.cell').nth(0); bb = c0.bounding_box()
    for k, d in enumerate([1, 7]):
        h = bb['height'] * .5; w = h * .6; x0 = bb['x'] + 8 + k * (w + 10); y0 = bb['y'] + bb['height'] * .25
        for st in D[d]:
            pts = [(x0 + x * w / .6, y0 + y * h) for x, y in st]; pg.mouse.move(*pts[0]); pg.mouse.down()
            for q2 in pts[1:]: pg.mouse.move(*q2, steps=2)
            pg.mouse.up()
    pg.click('#done'); pg.wait_for_timeout(300)
    check('一格只写一个数' in pg.inner_text('#res'), '一格写两个数会提示')
    # 填空 2.□4 只有一个方框
    pg.evaluate("Q.kind='fill'; Q.i=0; render()"); pg.wait_for_timeout(200)
    check(pg.locator('.cell').count() == 1, '2.□4 只有一个方框')
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
