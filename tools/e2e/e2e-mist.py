# 错题记录「孩子写了什么」（docs/方案-错题数据字段.md §2.1，B 接 F 的 noteMistake）：真页面答错，看 S.mistakes 里的 wrongs / hist
# 手机写字板写错小数（带小数点）· 点选题点错（选项文字）· 数线插错（插的数）· 口答答错（o:1、不记写了什么）· iPad 蓝框写错（格子里的数）
# 用法：python3 tools/e2e/e2e-mist.py <项目根> <截图目录>
import sys, json, pathlib
src = pathlib.Path(__file__).with_name('e2e-dec.py').read_text().split('\nwith sync_playwright()')[0]
exec(src)   # 复用 e2e-dec / e2e-vert 的写数字、出题工具
# 出指定的题，答完走真的引擎结算（E.settle，和今日练习同一处理），错题记录才会写
def go(pg, items, oral=False):
    pg.evaluate(f"(() => {{ const s = ({SETUP})([]); const L = {json.dumps(items)}; __sm.S.oral = {str(oral).lower()}; let cur = null; __sm.startQ('free', {{sess: {{next: () => (cur = L.length ? {{kind: 'q', seg: 'new', inst: L.shift()}} : null), answer: res => __sm.E.settle(__sm.S, cur, res, __sm.today())}}, group: 'speedH'}}); }})()")
    pg.wait_for_timeout(500)
def hist(pg, id): return pg.evaluate(f"(() => {{ const m = Object.values(__sm.S.mistakes).find(m => m.uid === {json.dumps(id)}); return m && {{wrongs: m.wrongs, hist: m.hist}}; }})()")
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); {NODEMO}"); pg.reload(); pg.wait_for_timeout(500)
    # 手机写错小数：记「14.4」
    it = pick(pg, 'speed:g12:dec', 1, 143); wrong = f"{(it['ans'] + 1) / 10:.1f}"
    go(pg, [it]); pad_write(pg, wrong); pg.wait_for_timeout(2600)
    if not pg.locator('#qConfirm').is_hidden(): pg.click('#qcA'); pg.wait_for_timeout(400)
    h = hist(pg, 'speed:g12:dec'); check(h and h['wrongs'] == 1 and h['hist'][-1]['k'] == 'w' and h['hist'][-1]['w'] == wrong, f'手机写错小数：记下写的 {wrong}：{h}')
    pg.wait_for_timeout(300)
    # 点选题点错：记点的选项
    x = pg.evaluate("(() => { const id = __sm.K.BY.cmp1.items[0].id; return {id, ...__sm.K.make(id)}; })()")
    go(pg, [{'id': x['id'], 'q': x['q'], 'ans': x['ans']}]); pg.wait_for_timeout(900)
    wrongN = pg.evaluate("[...document.querySelectorAll('.pickcard')].map(b => +b.dataset.n).find(n => n !== __sm.Q.x.inst.ans)")
    pg.click(f'.pickcard[data-n="{wrongN}"]'); pg.wait_for_timeout(500)
    h = hist(pg, x['id']); check(h and h['hist'][-1]['w'] == str(wrongN), f'点选题点错：记下点的 {wrongN}：{h}')
    # 数线插错：记插的数
    y = pg.evaluate("(() => { const id = __sm.K.BY.line1.items[0].id; return {id, ...__sm.K.make(id)}; })()")
    go(pg, [{'id': y['id'], 'q': y['q'], 'ans': y['ans']}]); pg.wait_for_timeout(600)
    bb = pg.locator('#lineBox').bounding_box(); far = 0 if y['ans'] > y['q']['max'] / 2 else y['q']['max']
    pg.mouse.click(bb['x'] + bb['width'] * far / y['q']['max'], bb['y'] + 122); pg.wait_for_timeout(1600)
    h = hist(pg, y['id']); check(h and h['hist'][-1]['w'] is not None and abs(float(h['hist'][-1]['w']) - far) <= 1, f'数线插错：记下插的数（约 {far}）：{h}')
    # 口答答错：o:1，不记写了什么
    it2 = pick(pg, 'speed:g14:dec2', 2, 382)
    go(pg, [it2], oral=True); pg.click('#qOral'); pg.wait_for_timeout(200); pg.click('#qOralWrong'); pg.click('#qOralNext'); pg.wait_for_timeout(600)
    h = hist(pg, 'speed:g14:dec2'); check(h and h['hist'][-1].get('o') == 1 and h['hist'][-1]['w'] is None, f'口答答错：o:1、不记写了什么：{h}')
    pg.evaluate("__sm.S.oral = false")
    # 老的秒答地图流程（index.html commit）：点「不会」记 k:d；写错记写的数
    pg.evaluate("__sm.startP('daily', '测试', SM.UNITS.filter(u => __sm.K.ITEM[u.id] && !u.retired).slice(0, 60).map(u => ({id: u.id})))"); pg.wait_for_timeout(600)   # 交给它挑现在能出的卡
    c0 = pg.evaluate("__sm.P.deck[0]"); pg.click('#btnDunno'); pg.wait_for_timeout(700); pg.click('#btnNext'); pg.wait_for_timeout(500)   # 老流程点「继续」才结算
    h = pg.evaluate(f"(() => {{ const m = __sm.S.mistakes[{json.dumps(c0['id'])}] || Object.values(__sm.S.mistakes).find(m => m.uid === {json.dumps(c0['id'])}); return m && {{wrongs: m.wrongs, hist: m.hist}}; }})()")
    check(h and h['hist'][-1]['k'] == 'd' and h['hist'][-1]['w'] is None, f'老流程点「不会」：记 k:d：{h}')
    pg.close()
    # iPad 蓝框写错：记格子里的数
    pg = b.new_page(viewport={'width': 1194, 'height': 834}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); {NODEMO}"); pg.reload(); pg.wait_for_timeout(500)
    z = pg.evaluate("(() => { const x = __sm.K.rawPool('speed:g10:add3')[0]; return {id: 'speed:g10:add3', q: x.q, ans: x.ans}; })()")
    go(pg, [z]); answer(pg, z['ans'] + 1); pg.click('.vdone'); pg.wait_for_timeout(600)
    h = hist(pg, 'speed:g10:add3'); check(h and h['hist'][-1]['w'] == str(z['ans'] + 1), f'iPad 竖式写错：记下写的 {z["ans"] + 1}：{h}')
    pg.close(); b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
