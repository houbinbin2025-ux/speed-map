# 门 6 真浏览器走查：932×430 横屏；口答模式走通 首次 → 摸底 → 今日练习（示范卡、三种作答、对错反馈）→ 结算 → 各页 → 异常
import sys, json, pathlib, time
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
N = int(sys.argv[3]) if len(sys.argv) > 3 else 40
url = (root / 'v2' / 'index.html').as_uri() + '#test'
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'oral': True}
shots, errs = set(), []
def shot(pg, name):
    if name in shots: return
    shots.add(name); pg.screenshot(path=str(out / (name + '.png')))
def vis(pg, id): return pg.evaluate(f"!document.getElementById('{id}').hidden")
def state(pg):
    return pg.evaluate("""() => { const Q = window.__sm.Q; const cur = ['island','placeIntro','placeResult','qplay','demo','qsum','skillmap','home','calib','play','summary','mist','parent'].find(k => !document.getElementById(k).hidden);
      if (!Q || !Q.x || Q.x.kind !== 'q') return {cur, phase: Q && Q.phase};
      const it = window.__sm.K.ITEM[Q.x.inst.id], s = window.__sm.K.BY[it.skill];
      return {cur, phase: Q.phase, input: Q.v && Q.v.input, group: s.group, id: Q.x.inst.id, ans: Q.x.inst.ans, q: Q.x.inst.q, kind: Q.kind, sec: window.__sm.S.daily && window.__sm.S.daily.sec}; }""")
def answer(pg, st, right):
    if st['input'] == 'write':
        pg.click('#qOral')
        if not right: pg.click('#qOralWrong')
        pg.click('#qOralNext')
    elif st['input'] == 'pick':
        a, b = st['q']['a'], st['q']['b']
        n = max(a, b) if right else min(a, b)
        pg.wait_for_function("() => !document.querySelector('.pickcard.lock')", timeout=3000)
        pg.click(f'.pickcard[data-n="{n}"]')
    else:
        r = pg.evaluate("(() => { const b = document.getElementById('lineBox').getBoundingClientRect(); return [b.left, b.top, b.width]; })()")
        t = st['q']['target'] / st['q']['max'] if right else (0.95 if st['q']['target'] / st['q']['max'] < 0.5 else 0.05)
        x, y = r[0] + r[2] * t, r[1] + 122
        pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 1, y); pg.mouse.up()
        pg.wait_for_timeout(1500)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 932, 'height': 430}, device_scale_factor=1)
    pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append('console ' + m.text))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(300)
    shot(pg, '01-island-first')
    pg.click('#btnStart'); pg.wait_for_timeout(200); shot(pg, '02-placeIntro')
    pg.click('#piGo'); pg.wait_for_timeout(300)
    k = 0
    while True:
        st = state(pg)
        if st['cur'] == 'placeResult': break
        if st['cur'] == 'qplay' and st.get('phase') == 'q':
            shot(pg, f"03-place-{st['input']}")
            answer(pg, st, k < 9); k += 1
        pg.wait_for_timeout(150)
        if k > 45: break
    pg.wait_for_timeout(300); shot(pg, '04-placeResult')
    print('摸底题数', k)
    pg.click('#prGo'); pg.wait_for_timeout(300)
    n, t0, log = 0, time.time(), []
    while n < N and time.time() - t0 < 600:
        st = state(pg)
        if st['cur'] == 'qsum': break
        if st['cur'] == 'demo':
            shot(pg, '05-demo')
            pg.wait_for_function("() => !document.getElementById('ack').disabled", timeout=5000); pg.click('#ack'); pg.wait_for_timeout(150); continue
        if st['cur'] == 'qplay' and st.get('phase') == 'q':
            shot(pg, f"06-q-{st['group']}-{st['input']}")
            right = (n % 4) != 3
            answer(pg, st, right); n += 1; log.append((st['id'], right))
            pg.wait_for_timeout(250)
            shot(pg, f"07-{'ok' if right else 'bad'}-{st['group']}-{st['input']}")
        pg.wait_for_timeout(120)
    sec = pg.evaluate("window.__sm.S.daily.sec")
    print('今日练习答了', n, '题，今天已练', sec, '秒')
    # 长按结束 → 结算
    if state(pg)['cur'] != 'qsum':
        pg.wait_for_function("() => { const Q = window.__sm.Q; return !Q || Q.phase === 'q' || Q.phase === 'demo'; }", timeout=6000)
        btn = '#qQuit' if state(pg)['cur'] == 'qplay' else '#dQuit'
        bb = pg.locator(btn).bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up()
    pg.wait_for_timeout(300); shot(pg, '08-qsum')
    pg.click('#qsHome'); pg.wait_for_timeout(300); shot(pg, '09-island-after')
    # 技能组地图 5 个
    for g in ['look', 'bond', 'place', 'cmp', 'line']:
        pg.click(f'.w-mini button[data-z="{g}"]'); pg.wait_for_timeout(600); pg.click('#zMap'); pg.wait_for_timeout(150); shot(pg, f'10-map-{g}'); pg.click('#smBack')
    pg.click('.w-mini button[data-z="speed"]'); pg.wait_for_timeout(600); pg.click('#zGo'); pg.wait_for_timeout(200); shot(pg, '11-speedmap'); pg.click('#spBack')
    pg.click('#btnMist'); pg.wait_for_timeout(200); shot(pg, '12-mist'); pg.click('#mistBack')
    bb = pg.locator('#gear').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(2200); pg.mouse.up(); pg.wait_for_timeout(300)
    shot(pg, '13-parent'); pg.click('#parBack')
    # 异常：暂停（切后台）、另一个页面、出错兜底
    pg.click('#btnStart') if vis(pg, 'btnStart') else pg.click('#btnMore') if vis(pg, 'btnMore') else None
    pg.wait_for_timeout(2200)   # 小人先走过去再进练习
    pg.evaluate("Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange'))")
    pg.evaluate("Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange'))")
    pg.wait_for_timeout(200); shot(pg, '14-pause')
    if vis(pg, 'ovPause'): pg.click('#pauseGo')
    pg.wait_for_timeout(300); shot(pg, '15-after-pause')
    pg.evaluate("window.dispatchEvent(new StorageEvent('storage', {key: 'speedmap.v2.test'}))"); pg.wait_for_timeout(200); shot(pg, '16-othertab')
    pg.evaluate("window.__crash('测试用的错误')"); pg.wait_for_timeout(200); shot(pg, '17-crash')
    print('截图', len(shots), '张')
    print('错误', errs[:10] if errs else '无')
    b.close()
