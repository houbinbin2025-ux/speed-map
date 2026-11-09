# 锻造室每天只能进 5 次（Ben 11-09）：真点岛上「锻造」按钮进出 5 次，每次提示还剩几次；第 6 次进不去、留在岛上提示明天再来、按钮变暗；
# 结算页「去锻造」也算次数；关页再开次数不重置；侧栏「今天还可进入 N 次」不超屏。用法：python3 tools/e2e/e2e-forge5.py <项目根> <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': {}, 'settings': {'bilingual': False}}
ink = {'done': True, 'samples': [], 'speed': 800}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
cur = lambda pg: pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]")
toast = lambda pg: pg.evaluate("(()=>{const t=document.getElementById('gemToast');return t&&!t.hidden?t.textContent:''})()")
def fresh(ctx):
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(url); pg.wait_for_timeout(900); return pg
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for name, W, H in [('844', 844, 390), ('667', 667, 375), ('ipad', 1180, 820)]:
        ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=True, screen={'width': W, 'height': H})
        pg = ctx.new_page(); pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); localStorage.setItem('speedmap.ink.test', {json.dumps(json.dumps(ink))})"); pg.close()
        pg = fresh(ctx)
        for i in range(1, 6):
            if i == 4:   # 关页再开：次数不重置
                pg.close(); pg = fresh(ctx)
            pg.click('#btnForge'); pg.wait_for_timeout(500)
            left = 5 - i; want = f'今天还可进入锻造室 {left} 次' if left else '这是今天最后一次进入锻造室'
            side = pg.locator('#forgeLeft').inner_text(); sb = pg.locator('#forgeLeft').bounding_box()
            check(cur(pg) == 'forge' and toast(pg) == want, f'{name} 第 {i} 次进锻造室，提示「{toast(pg)}」')
            check(side == (f'今天还可进入 {left} 次' if left else '今天最后一次进入') and sb and sb['y'] + sb['height'] <= H and sb['x'] + sb['width'] <= W, f'{name} 侧栏「{side}」在屏幕内 {sb}')
            if i == 1: pg.screenshot(path=str(out / f'forge-in-{name}.png'))
            if i == 1: pg.wait_for_timeout(1300); check(toast(pg) == '', f'{name} 锻造室里的提示 1.5 秒后消失（不挡放碎片）')
            pg.click('#forgeBack'); pg.wait_for_timeout(500)
        check(pg.evaluate("document.getElementById('btnForge').classList.contains('spent')"), f'{name} 5 次用完，岛上锻造按钮变暗')
        pg.click('#btnForge'); pg.wait_for_timeout(400)
        check(cur(pg) == 'island' and toast(pg) == '今天的 5 次锻造已用完，明天再来', f'{name} 第 6 次进不去，留在岛上提示：「{toast(pg)}」')
        pg.screenshot(path=str(out / f'forge-full-{name}.png'))
        tb = pg.locator('#gemToast').bounding_box(); check(tb and tb['x'] >= 0 and tb['x'] + tb['width'] <= W, f'{name} 提示条不超屏 {tb}')
        pg.wait_for_timeout(2800); check(toast(pg) == '', f'{name} 提示 2.5 秒后消失')
        # 结算页「去锻造」也走同一个入口：用完后点了不进门（GEMUI.openForge 就是那个按钮调的）
        pg.evaluate("GEMUI.openForge('island')"); pg.wait_for_timeout(300)
        check(cur(pg) == 'island', f'{name} 其他入口用完后也进不去')
        # 结算页的「去锻造」用完后是灰的、点不了；家里熔炉先问 forgeBlocked，用完了留在家里提示（审查建议 1、2）
        btn = pg.evaluate("(()=>{const d=document.createElement('div');d.innerHTML=GEMUI.summary({kind:'free',gem:{}},__sm.today());const b=d.querySelector('[data-gem=forge]');return b?{t:b.textContent,dis:b.disabled}:null})()")
        check(btn == {'t': '今天锻造次数已用完', 'dis': True}, f'{name} 结算页锻造按钮用完后变灰：{btn}')
        check(pg.evaluate("GEMUI.forgeBlocked()") == '今天的 5 次锻造已用完，明天再来', f'{name} 家里熔炉拿得到「用完」的提示')
        # 第二天重新有 5 次（把当天记录挪到昨天）
        pg.evaluate("(()=>{const st=GEMUI.state(),t=__sm.today(),D=st.days[t];const y=new Date(t+'T12:00:00Z');y.setUTCDate(y.getUTCDate()-1);st.days[y.toISOString().slice(0,10)]=D;delete st.days[t];GEMUI.islandBtn();})()")
        check(pg.evaluate("GEMUI.forgeBlocked()") == '', f'{name} 第二天家里熔炉不拦')
        pg.click('#btnForge'); pg.wait_for_timeout(500)
        check(cur(pg) == 'forge' and toast(pg) == '今天还可进入锻造室 4 次', f'{name} 第二天重新有 5 次：「{toast(pg)}」')
        ctx.close()
    # 英文日：提示和侧栏翻成英文、不超屏
    ctx = b.new_context(viewport={'width': 667, 'height': 375}, has_touch=True)
    pg = ctx.new_page(); pg.goto(url)
    pg.evaluate("localStorage.clear(); localStorage.setItem('speedmap.v2.test', JSON.stringify({v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, settings: {bilingual: true}, testDays: !I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 1 : 0}))"); pg.close()
    pg = fresh(ctx); pg.click('#btnForge'); pg.wait_for_timeout(500)
    t, side = toast(pg), pg.locator('#forgeLeft').inner_text(); sb = pg.locator('#forgeLeft').bounding_box()
    check(t == '4 more forge visits today' and side == '4 more visits today' and sb['y'] + sb['height'] <= 375, f'英文日：「{t}」「{side}」{sb}')
    pg.screenshot(path=str(out / 'forge-in-en.png')); ctx.close(); b.close()
print('页面报错:', errs[:3])
if fails or errs: print('FAIL', len(fails), '项'); sys.exit(1)
print('PASS 锻造室每天 5 次')
