# 秒答校准第一步：真页面答对，S.ftime[技能] 记下「想的时间 ÷ 估计想的时间」；口答、答错不记（中控 11-09，tests/ftime.test.js 管口径）
# 用法：python3 tools/e2e/e2e-ftime.py <项目根> <截图目录>
import sys, json, pathlib
src = pathlib.Path(__file__).with_name('e2e-dec.py').read_text().split('\nwith sync_playwright()')[0]
exec(src)
def go(pg, items, oral=False):
    pg.evaluate(f"(() => {{ const s = ({SETUP})([]); const L = {json.dumps(items)}; __sm.S.oral = {str(oral).lower()}; let cur = null; __sm.startQ('free', {{sess: {{next: () => (cur = L.length ? {{kind: 'q', seg: 'new', inst: L.shift()}} : null), answer: res => __sm.E.settle(__sm.S, cur, res, __sm.today())}}, group: 'speedH'}}); }})()")
    pg.wait_for_timeout(500)
ft = lambda pg, sk: pg.evaluate(f"(__sm.S.ftime || {{}})[{json.dumps(sk)}] || []")
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); {NODEMO}"); pg.reload(); pg.wait_for_timeout(500)
    # 手机写字板写对
    it = pick(pg, 'speed:g12:dec', 1, 143); sk = pg.evaluate(f"__sm.K.ITEM['speed:g12:dec'].skill")
    go(pg, [it]); pad_write(pg, f"{it['ans'] / 10:.1f}"); pg.wait_for_timeout(2600)
    if not pg.locator('#qConfirm').is_hidden(): pg.click('#qcA'); pg.wait_for_timeout(400)
    a = ft(pg, sk); check(len(a) == 1 and 0.05 <= a[0] <= 10 and round(a[0], 2) == a[0], f'写字板写对：记一条两位小数的倍数 {a}')
    # 点选题点对
    x = pg.evaluate("(() => { const id = __sm.K.BY.cmp1.items[0].id; return {id, ...__sm.K.make(id)}; })()")
    go(pg, [{'id': x['id'], 'q': x['q'], 'ans': x['ans']}]); pg.wait_for_timeout(900)
    pg.click(f'.pickcard[data-n="{x["ans"]}"]'); pg.wait_for_timeout(500)
    a = ft(pg, 'cmp1'); check(len(a) == 1, f'点选题点对：记一条 {a}')
    # 点选题点错：不记（等答对后的结算页过去）
    pg.wait_for_timeout(1500); go(pg, [{'id': x['id'], 'q': x['q'], 'ans': x['ans']}]); pg.wait_for_timeout(900)
    wrongN = pg.evaluate("[...document.querySelectorAll('.pickcard')].map(b => +b.dataset.n).find(n => n !== __sm.Q.x.inst.ans)")
    pg.click(f'.pickcard[data-n="{wrongN}"]'); pg.wait_for_timeout(500)
    check(len(ft(pg, 'cmp1')) == 1, '点错不记')
    # 口答答对：不记
    it2 = pick(pg, 'speed:g14:dec2', 2, 382); sk2 = pg.evaluate("__sm.K.ITEM['speed:g14:dec2'].skill")
    pg.wait_for_timeout(300); n0 = len(ft(pg, sk2)); go(pg, [it2], oral=True); pg.click('#qOral'); pg.wait_for_timeout(200); pg.click('#qOralNext'); pg.wait_for_timeout(600)
    check(len(ft(pg, sk2)) == n0, '口答不记')
    pg.evaluate("__sm.S.oral = false")
    # 第二步：攒够 10 条快样本后，个人线在页面上生效（点选估计 2 秒 → 个人线 1 秒；约 1.5 秒点对：改前算秒答，改后不算）
    pg.wait_for_timeout(1500)
    est, own = pg.evaluate(f"(() => {{ const inst = {json.dumps({'id': x['id'], 'q': x['q'], 'ans': x['ans']})}; const o = {{speed: __sm.INK.speed}}; return [__sm.K.fastMs(inst, o), __sm.K.fastMs(inst, Object.assign({{ft: {{cmp1: Array(10).fill(0.3)}}}}, o))]; }})()")
    check(own < est, f'点选题估计 {est} 毫秒，个人线 {own} 毫秒')
    pg.evaluate("__sm.S.ftime = {cmp1: Array(10).fill(0.3)}")
    go(pg, [{'id': x['id'], 'q': x['q'], 'ans': x['ans']}]); pg.wait_for_timeout(1000)
    pg.click(f'.pickcard[data-n="{x["ans"]}"]'); pg.wait_for_timeout(500)
    txt = pg.inner_text('#qBody')
    check('秒答要' in txt, f'按个人线判慢：{txt[:60]!r}')
    pg.screenshot(path=str(out / 'ftime-个人线判慢.png'))
    a = ft(pg, 'cmp1'); check(len(a) == 10 and own / est < a[-1] < 1, f'这次用时落在个人线和估计线之间（改前算秒答），样本照记、滚动保留最新 10 条：{a}')
    # 存进 localStorage（随每题存档）
    saved = pg.evaluate("JSON.parse(localStorage.getItem('speedmap.v2.test')).ftime")
    check(saved and saved.get('cmp1') and len(saved['cmp1']) == 10, f'已存进主存档：{saved}')
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
