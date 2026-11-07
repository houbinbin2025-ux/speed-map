# 伙伴罐（小伙伴乐园买吃喝的宝石）：锻造台领宝石前留一部分；按钮写清留几颗、领几颗；链接只带净值；领取失败不凭空多
# 用法：python3 tools/e2e/e2e-jar.py <项目根> <截图目录>
import sys, json, pathlib
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': {}, 'settings': {'bilingual': False}}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    def fresh(forged, target):
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(400)
        pg.evaluate(f"(()=>{{const st=GEMUI.state(), d=__sm.today ? __sm.today() : new Date().toISOString().slice(0,10); st.days[d]={{ok:5,bad:0,n:5,m:0,paid:0,forged:{forged},waste:0}}; st.palJar={{bal:0,moved:{{}},target:{target}}}; GEMUI.openForge('island');}})()")
        pg.wait_for_timeout(300)
    btn = lambda: pg.locator('#forgeClaim').inner_text()
    # 炼了 5 颗，罐的目标 2：留 2 领 3
    fresh(5, 2)
    check(btn() == '留 2 颗给伙伴罐，领 3 颗', '按钮：' + btn()); pg.screenshot(path=str(out / 'jar-btn.png'))
    r = pg.evaluate("(()=>{const r=document.getElementById('forgeClaim').getBoundingClientRect();return {right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight}})()")
    check(r['right'] <= r['w'] and r['bottom'] <= r['h'], f'按钮不超屏 {r}')
    pg.click('#forgeClaim'); link = pg.evaluate("window.__gemLink") or ''
    items = parse_qs(urlparse(link).query).get('items', [''])[0]
    check(items.split('.')[1:2] == ['3'], '链接只带净值 3：' + items)
    check(pg.evaluate("GEMUI.state().palJar.bal") == 2, '罐里 2 颗')
    check(btn() == '再领一次', '领过后：' + btn())
    # 矿场没入账：恢复原来的 sent，不清空（清空会让罐凭空变多）
    pg.evaluate("window.__kongEarnFailed()"); pg.wait_for_timeout(100)
    st = pg.evaluate("(()=>{const s=GEMUI.state();return {bal:s.palJar.bal, sent:s.sent}})()")
    check(st['bal'] == 2, f'失败后罐不变 {st}')
    check(btn() == '领 3 颗宝石', '失败后可以重领 3 颗：' + btn())
    # 只炼 1 颗、要留：全留，不跳矿场
    fresh(1, 5)
    check(btn() == '留 1 颗给伙伴罐', '按钮：' + btn())
    pg.evaluate("window.__gemLink = null"); pg.click('#forgeClaim'); pg.wait_for_timeout(100)
    check(pg.evaluate("window.__gemLink") is None, '不跳矿场')
    check(pg.locator('#forgeMsg').inner_text() == '宝石留给伙伴罐了', '提示：' + pg.locator('#forgeMsg').inner_text())
    # 没有目标（游戏还没写）：和原来一样
    fresh(3, 0)
    check(btn() == '领 3 颗宝石', '没有目标：' + btn())
    # 英文日
    import datetime; seed['settings'] = {'bilingual': True}; seed['testDays'] = 0 if datetime.date.today().day % 2 else 1   # 单日是英文日
    fresh(5, 2)
    check(pg.evaluate('document.documentElement.lang') == 'en', '测试日是英文日')
    check(btn() == 'Keep 2 for the Pal Jar, claim 3', '英文：' + btn()); pg.screenshot(path=str(out / 'jar-en.png'))
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
