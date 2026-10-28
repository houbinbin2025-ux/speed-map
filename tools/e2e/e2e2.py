# 门 6 走查第 2 轮：手写模式（程序画 0–9 校准 + 作答）、暂停原题重出、返回手势不离开、示范卡播完、自由加练（点选）、v2 秒答练习
import sys, json, pathlib, time, math
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '#test'
known = {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': known}
# 0–9 的笔画（单位方框 0..1 × 0..1.4，可多笔）
def arc(cx, cy, rx, ry, a0, a1, n=14): return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
D = {
  0: [arc(.5, .7, .4, .62, -90, 270, 24)],
  1: [[(.35, .2), (.55, .05), (.55, 1.35)]],
  2: [arc(.5, .4, .38, .34, 200, 360, 10) + [(.85, .55), (.12, 1.32), (.9, 1.32)]],
  3: [arc(.48, .38, .36, .32, 210, 450, 12) + arc(.48, 1.0, .4, .36, 270, 510, 12)],
  4: [[(.7, .05), (.1, .95), (.95, .95)], [(.7, .4), (.7, 1.35)]],
  5: [[(.85, .08), (.2, .08), (.15, .6)] + arc(.48, .95, .38, .38, 230, 500, 14)],
  6: [[(.75, .1), (.35, .45)] + arc(.5, 1.0, .36, .36, 200, 560, 18)],
  7: [[(.1, .08), (.9, .08), (.4, 1.35)]],
  8: [arc(.5, .36, .3, .3, 90, 450, 16) + arc(.5, 1.0, .38, .36, -90, 270, 16)],
  9: [arc(.5, .42, .34, .34, 0, 360, 16) + [(.84, .42), (.75, 1.35)]],
}
def draw(pg, sel, text, scale=None):
    bb = pg.locator(sel).bounding_box(); h = bb['height'] * 0.62; w = h / 1.4
    n = len(text); gap = w * 0.45; total = n * w + (n - 1) * gap
    x0 = bb['x'] + (bb['width'] - total) / 2; y0 = bb['y'] + (bb['height'] - h) / 2
    for i, ch in enumerate(text):
        for stroke in D[int(ch)]:
            pts = [(x0 + i * (w + gap) + px * w, y0 + py * h / 1.4) for px, py in stroke]
            pg.mouse.move(*pts[0]); pg.mouse.down()
            for p in pts[1:]: pg.mouse.move(*p, steps=2)
            pg.mouse.up()
shots, errs = set(), []
def shot(pg, name, force=False):
    if name in shots and not force: return
    shots.add(name); pg.screenshot(path=str(out / (name + '.png')))
def cur(pg): return pg.evaluate("['island','placeIntro','placeResult','qplay','demo','qsum','skillmap','home','calib','play','summary','mist','parent'].find(k => !document.getElementById(k).hidden)")
def qst(pg):
    return pg.evaluate("""() => { const Q = window.__sm.Q; if (!Q || !Q.x || Q.x.kind !== 'q') return null; const it = window.__sm.K.ITEM[Q.x.inst.id];
      return {phase: Q.phase, input: Q.v && Q.v.input, group: window.__sm.K.BY[it.skill].group, id: Q.x.inst.id, ans: Q.x.inst.ans, q: Q.x.inst.q}; }""")
def answer(pg, st, right):
    if st['input'] == 'write':
        text = str(st['ans'] if right else (st['ans'] + 1))
        draw(pg, '#qPad', text)
        try: pg.wait_for_function("() => { const Q = window.__sm.Q; return !Q || Q.phase !== 'q'; }", timeout=4000)
        except Exception: return 'stuck'
        if pg.evaluate("window.__sm.Q && window.__sm.Q.phase === 'confirm'"):
            a = pg.inner_text('#qcA'); pg.click('#qcA' if a in text else '#qcB')
    elif st['input'] == 'pick':
        a, b = st['q']['a'], st['q']['b']
        pg.wait_for_function("() => !document.querySelector('.pickcard.lock')", timeout=3000)
        pg.click(f'.pickcard[data-n="{max(a, b) if right else min(a, b)}"]')
    else:
        r = pg.evaluate("(() => { const b = document.getElementById('lineBox').getBoundingClientRect(); return [b.left, b.top, b.width]; })()")
        t = st['q']['target'] / st['q']['max'] if right else (0.95 if st['q']['target'] / st['q']['max'] < 0.5 else 0.05)
        pg.mouse.move(r[0] + r[2] * t, r[1] + 122); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(1500)
    return 'ok'
def run(pg, n, tag, wrong_every=4):
    k = 0; t0 = time.time(); res = {'ok': 0, 'bad': 0, 'stuck': 0, 'rec_right': 0}
    while k < n and time.time() - t0 < 240:
        c = cur(pg)
        if c in ('qsum', 'island', 'summary'): break
        if c == 'demo':
            pg.wait_for_timeout(3300); shot(pg, f'{tag}-demo-done')
            pg.click('#ack'); pg.wait_for_timeout(200); continue
        st = qst(pg)
        if c == 'qplay' and st and st['phase'] == 'q':
            shot(pg, f"{tag}-q-{st['group']}-{st['input']}")
            right = (k % wrong_every) != wrong_every - 1
            r = answer(pg, st, right); k += 1
            if r == 'stuck': res['stuck'] += 1; pg.click('#qDunno'); continue
            pg.wait_for_timeout(300)
            shot(pg, f"{tag}-{'ok' if right else 'bad'}-{st['group']}-{st['input']}")
            # 识别对不对：看引擎记的这题结果
            res['ok' if right else 'bad'] += 1
        pg.wait_for_timeout(150)
    return k, res
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 932, 'height': 430}, device_scale_factor=1)
    pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append('console ' + m.text))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(300)
    shot(pg, 'a1-island')
    pg.click('#btnStart'); pg.wait_for_timeout(300); shot(pg, 'a2-calib')
    for d in range(10):
        for r in range(3):
            draw(pg, '#calPad', str(d)); pg.wait_for_timeout(1050)
    pg.wait_for_timeout(400)
    print('校准完成', pg.evaluate("window.__sm.INK.done"), '今天已练秒数', pg.evaluate("window.__sm.S.daily && window.__sm.S.daily.sec"))
    # 今日练习：手写作答
    k, res = run(pg, 24, 'b')
    log = pg.evaluate("Object.entries(window.__sm.S.log || {}).map(([d, v]) => v.ups.length)")
    print('今日练习', k, '题', res, '识别统计', pg.evaluate("(window.__sm.INK.stats || []).reduce((a, b) => a + b, 0) + '/' + (window.__sm.INK.stats || []).length"))
    # 暂停：题还没答 → 切后台 → 回来 → 继续 → 原题重出
    pg.wait_for_function("() => { const Q = window.__sm.Q; return Q && (Q.phase === 'q' || Q.phase === 'demo'); }", timeout=8000)
    before = pg.evaluate("window.__sm.Q.x.inst ? window.__sm.Q.x.inst.id : 'demo'")
    pg.evaluate("Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange'))")
    pg.wait_for_timeout(800)
    pg.evaluate("Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange'))")
    pg.wait_for_timeout(200); shot(pg, 'c1-pause')
    pg.click('#pauseGo'); pg.wait_for_timeout(300)
    after = pg.evaluate("window.__sm.Q.x.inst ? window.__sm.Q.x.inst.id : 'demo'")
    print('暂停前后同一题', before == after, before)
    # 返回手势：练习中右滑（浏览器后退）不离开
    pg.go_back(); pg.wait_for_timeout(300); shot(pg, 'c2-back')
    print('后退后还在练习页', cur(pg))
    # 长按结束 → 结算
    pg.wait_for_function("() => { const Q = window.__sm.Q; return !Q || Q.phase === 'q' || Q.phase === 'demo'; }", timeout=8000)
    btn = '#qQuit' if cur(pg) == 'qplay' else '#dQuit'
    bb = pg.locator(btn).bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(300)
    shot(pg, 'c3-qsum'); pg.click('#qsHome'); pg.wait_for_timeout(200)
    # 自由加练：比大小
    pg.click('.tile[data-g="cmp"]'); pg.click('#smGo'); pg.wait_for_timeout(300)
    k2, r2 = run(pg, 14, 'd', wrong_every=3)
    pg.wait_for_timeout(500); shot(pg, 'd9-freesum'); print('自由加练', k2, r2, cur(pg))
    if cur(pg) == 'qsum': pg.click('#qsHome')
    # 家长区
    pg.wait_for_timeout(200)
    bb = pg.locator('#gear').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(2200); pg.mouse.up(); pg.wait_for_timeout(300)
    shot(pg, 'e1-parent'); pg.click('#parBack')
    # v2 秒答练习照常能用
    pg.click('.tile[data-g="speed"]'); pg.click('[data-series="add"]'); pg.wait_for_timeout(400)
    for i in range(3):
        q = pg.evaluate("window.__sm.P && window.__sm.P.deck[window.__sm.P.i]")
        draw(pg, '#pad', str(q['ans'])); pg.wait_for_timeout(2200)
        if pg.evaluate("window.__sm.P && window.__sm.P.phase === 'confirm'"):
            pg.click('#cfA' if pg.inner_text('#cfA') in str(q['ans']) else '#cfB'); pg.wait_for_timeout(1500)
    shot(pg, 'f1-speedplay')
    bb = pg.locator('#btnQuit').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(300)
    shot(pg, 'f2-speedsum')
    print('v2 秒答练习结算页', cur(pg))
    print('截图', len(shots), '张'); print('错误', errs[:10] if errs else '无')
    b.close()
