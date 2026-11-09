# 方案 4 乙丙的新道具、新摆设还没画图（等 E）：拿到了也不能让家卡住。进家、打开战利品箱、点墙，页面不报错；没画图的不摆出来
# 用法：python3 tools/e2e/e2e-home-new.py <项目根> <截图目录>
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
NEW = ['fix100', 'fix200', 'fix400', 'deco15', 'deco16', 'deco17', 'deco18', 'deco19']
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for W, H in [(844, 390), (1180, 820)]:
        pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url)
        st = pg.evaluate("""(NEW) => { const S = {v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, skills: {}, stats: {}, settings: {bilingual: false}};
          for (let i = 0; i < 400; i++) S.mistakes['k' + i] = {key: 'k' + i, uid: 'look1', src: 'look', q: {}, ans: 1, due: null, out: 1, passes: 0, added: '2026-09-01', last: '2026-09-02'};
          for (let i = 0; i < 175; i++) { const d = new Date(Date.UTC(2026, 4, 1 + i)).toISOString().slice(0, 10); S.stats[d] = {sec: 700, n: 30}; }
          S.home = {ore: 0, got: {}, loot: [], place: {}, pets: [], sec: 0, go: 0}; return JSON.stringify(S); }""", NEW)
        pg.evaluate("s => { localStorage.clear(); localStorage.setItem('speedmap.v2.test', s); }", st); pg.reload(); pg.wait_for_timeout(600)
        pg.click('.w-mini button[data-z="home"]'); pg.wait_for_timeout(2500)
        got = pg.evaluate("Object.keys(__sm.S.home.got)")
        check(all(i in got for i in NEW), f'{W} 新道具、新摆设都发了：{[i for i in NEW if i not in got]} 没发')
        check(pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]") == 'house', f'{W} 进得了家')
        placed = pg.evaluate("Object.keys(__sm.S.home.place || {})")
        check(not any(i in placed for i in NEW), f'{W} 没画图的不摆出来：{[i for i in NEW if i in placed]}')
        for x, y in [(40, 40), (120, 60), (200, 80)]: pg.evaluate(f"__sm.HS && __sm.HS.tap && __sm.HS.tap({x}, {y})"); pg.wait_for_timeout(250)
        pg.screenshot(path=str(out / f'home-new-{W}.png')); pg.close()
    b.close()
print('页面报错:', errs[:3])
if fails or errs: print('FAIL', len(fails), '项'); sys.exit(1)
print('PASS 新道具、新摆设没画图时家不卡住')
