# 10-31 回归：点「不会」/写错后停住等「继续」；连点两下「继续」只进一题（第二下不能落到下一题的「不会」上）
# 覆盖：理解题手写（今日练习）、秒答地图练习；3 种 iPhone 横屏尺寸；鼠标连点 90ms、触屏连点 150ms
# 用法：python3 tools/e2e/e2e6.py <项目根> <截图目录>
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)   # 借用 e2e2 的 url / seed / draw / cur / qst
fails = []
def check(ok, msg):
    print(('通过 ' if ok else '不通过 ') + msg)
    if not ok: fails.append(msg)
def mid(pg, id):
    return pg.evaluate("id => { const r = document.getElementById(id).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }", id)
def dbl(pg, id, touch):
    x, y = mid(pg, id)
    if touch: pg.touchscreen.tap(x, y); pg.wait_for_timeout(150); pg.touchscreen.tap(x, y)
    else: pg.mouse.click(x, y); pg.wait_for_timeout(90); pg.mouse.click(x, y)
QS = "() => { const Q = window.__sm.Q; return Q && {n: Q.n, phase: Q.phase, input: Q.v && Q.v.input, mist: Object.keys(window.__sm.S.mistakes).length}; }"
PS = "() => { const P = window.__sm.P; return P && {i: P.i, phase: P.phase}; }"
with sync_playwright() as p:
    b = p.chromium.launch()
    for W, H in [(932, 430), (844, 390), (667, 375)]:
        pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(300)
        pg.click('#btnStart'); pg.wait_for_timeout(2200)
        for d in range(10):
            for r in range(3): draw(pg, '#calPad', str(d)); pg.wait_for_timeout(1050)
        pg.wait_for_timeout(400)
        # 理解题手写：不会 → 4 秒后还停着 → 连点继续（鼠标、触屏各一次）
        for touch in (False, True):
            t0 = time.time()
            while time.time() - t0 < 30:
                c = cur(pg)
                if c == 'demo': pg.wait_for_selector('#ack:not([disabled])', timeout=8000); pg.click('#ack'); pg.wait_for_timeout(300); continue
                s = pg.evaluate(QS)
                if c == 'qplay' and s and s['phase'] == 'q' and s['input'] == 'write': break
                if c == 'qplay' and s and s['phase'] == 'q' and pg.is_visible('#qDunno'): pg.click('#qDunno')
                if pg.is_visible('#qNext'): pg.click('#qNext')
                pg.wait_for_timeout(300)
            pg.wait_for_timeout(600)
            a = pg.evaluate(QS); pg.click('#qDunno'); pg.wait_for_timeout(4000); s = pg.evaluate(QS)
            check(s['n'] == a['n'] + 1 and s['phase'] in ('wait', 'trace') and pg.is_visible('#qNext'), f'{W}x{H} 手写题点「不会」4 秒后停住等继续')
            pg.wait_for_timeout(600); dbl(pg, 'qNext', touch); pg.wait_for_timeout(1200)
            if cur(pg) == 'demo': pg.wait_for_selector('#ack:not([disabled])', timeout=8000); pg.click('#ack'); pg.wait_for_timeout(600)
            e = pg.evaluate(QS); pg.screenshot(path=str(out / f'{W}x{H}-q-dbl-{"touch" if touch else "mouse"}.png'))
            check(e['n'] == s['n'] and e['phase'] == 'q' and e['mist'] == s['mist'], f"{W}x{H} 理解题{'触屏' if touch else '鼠标'}连点继续只进一题（n {s['n']}→{e['n']}，phase={e['phase']}，错题 {s['mist']}→{e['mist']}）")
        # 正常节奏：继续后 0.6 秒再点「不会」照常有效
        x = pg.evaluate(QS)
        if x['phase'] == 'q' and pg.is_visible('#qDunno'):
            pg.click('#qDunno'); pg.wait_for_timeout(400); check(pg.evaluate(QS)['n'] == x['n'] + 1, f'{W}x{H} 继续后正常节奏点「不会」有效')
            pg.click('#qNext'); pg.wait_for_timeout(300)
        # 秒答地图：不会 → 停住 → 连点继续只进一题；写错也停住
        btn = '#qQuit' if cur(pg) == 'qplay' else '#dQuit'
        if cur(pg) in ('qplay', 'demo'):
            bb = pg.locator(btn).bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(500)
        pg.goto(url); pg.reload(); pg.wait_for_timeout(800)
        pg.click('.w-mini button[data-z="speed"]'); pg.wait_for_timeout(600); pg.click('#zGo'); pg.wait_for_timeout(400); pg.click('[data-series="add"]'); pg.wait_for_timeout(800)
        for touch in (False, True):
            a = pg.evaluate(PS); pg.click('#btnDunno'); pg.wait_for_timeout(4000); s = pg.evaluate(PS)
            check(s['i'] == a['i'] and s['phase'] in ('a', 'trace') and pg.is_visible('#btnNext'), f'{W}x{H} 秒答地图点「不会」4 秒后停住等继续')
            dbl(pg, 'btnNext', touch); pg.wait_for_timeout(800); e = pg.evaluate(PS)
            pg.screenshot(path=str(out / f'{W}x{H}-speed-dbl-{"touch" if touch else "mouse"}.png'))
            check(e['i'] == s['i'] + 1 and e['phase'] == 'q', f"{W}x{H} 秒答地图{'触屏' if touch else '鼠标'}连点继续只进一题（i {s['i']}→{e['i']}，phase={e['phase']}）")
            pg.wait_for_timeout(600)
        pg.close()
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
