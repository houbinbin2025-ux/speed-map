# 11-06 第 2 轮审查：秒答地图也下架、累计秒答计数；一块地全下架显示全部通关；全部下架首页通关、不白送一天；结算页按钮不出屏；隔天错题穿插且下架的不回来
# 用法：python3 tools/e2e/e2e10.py <项目根> <截图目录> [宽 高]
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    if not ok: fails.append(msg)
W = int(sys.argv[3]) if len(sys.argv) > 3 else 844; H = int(sys.argv[4]) if len(sys.argv) > 4 else 390
OUT = "(g=>{const {K,E,S}=__sm;K.SKILLS.filter(s=>s.group===g||(g==='ALL')||(g==='speed'&&s.speed)).forEach(s=>s.items.forEach(i=>{const q=E.prog(S,i.id);q.lv=3;q.d=['2026-09-01','2026-09-02','2026-09-06'];if(i.gen)q.out=1;}));})"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(400)
    pg.evaluate("__sm.S.oral = true; document.body.classList.remove('write')")
    # 秒答地图：真实点进去，已下架的卡不出；答对且快要计数
    pg.evaluate("""(()=>{const {K,E,S}=__sm;const its=K.speed[0].items.filter(i=>!i.gen);its.slice(0,3).forEach(i=>{const q=E.prog(S,i.id);q.lv=3;q.d=['2026-09-01','2026-09-02','2026-09-06'];});})()""")
    outIds = pg.evaluate("__sm.K.speed[0].items.filter(i=>!i.gen).slice(0,3).map(i=>i.id)")
    pg.click('.w-mini button[data-z="speed"]'); pg.wait_for_timeout(500); pg.click('#zGo'); pg.wait_for_timeout(400); pg.click('[data-series="add"]'); pg.wait_for_timeout(800)
    check(pg.evaluate("__sm.P && __sm.P.deck.length > 0"), '秒答地图没有题'); ids = pg.evaluate("__sm.P.deck.map(c=>c.id)")
    check(not set(ids) & set(outIds), '秒答地图还在出下架的卡：' + str(set(ids) & set(outIds)))
    n0 = pg.evaluate("Object.keys(__sm.S.fast||{}).length")
    pg.click('#oralTap'); pg.wait_for_timeout(100); pg.locator('#oralFoot button').last.click(); pg.wait_for_timeout(600)
    check(pg.evaluate("Object.keys(__sm.S.fast||{}).length") > n0, '秒答地图答快了没计数')
    pg.goto(url); pg.reload(); pg.wait_for_timeout(500); pg.evaluate("__sm.S.oral = true")
    # 只靠真实次数全部下架（没有 out 标记）：不许崩，回地图显示全部通关
    pg.evaluate("""(()=>{const {K,S}=__sm,C=window.SM;S.fast=S.fast||{};K.speed.filter(s=>s.L===2).forEach(s=>s.items.forEach(it=>{const E=__sm.E;if(!it.gen){const q=E.prog(S,it.id);q.lv=3;q.d=['2026-09-01','2026-09-02','2026-09-06'];}else{const seen={};for(let k=0;k<4000;k++){const x=K.make(it.id);const key=it.id+'|'+x.q.a+','+x.q.b;if(!seen[key]){seen[key]=1;S.fast[key]=[4,'2026-09-01',0];}}}}));})()""")
    pg.click('.w-mini button[data-z="speed"]'); pg.wait_for_timeout(500); pg.click('#zGo'); pg.wait_for_timeout(400); pg.click('.lvtab[data-level="2"]'); pg.wait_for_timeout(300); check(pg.is_enabled('[data-series="add"]'), '第 3 级题型还没标记时按钮应可点（这条路曾经崩）'); pg.click('[data-series="add"]'); pg.wait_for_timeout(800)
    check(cur(pg) in ('home', 'island'), '真实次数全下架后点练习，停在 ' + str(cur(pg))); check(pg.is_disabled('[data-series="add"]'), '加法练习应不可点'); check('全部通关' in pg.inner_text('[data-series="add"]'), '加法练习应显示全部通关'); shot(pg, 'a0-speed-out')
    pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.goto(url); pg.reload(); pg.wait_for_timeout(500); pg.evaluate("__sm.S.oral = true")
    # 一块地全下架
    pg.evaluate(OUT + "('bond')"); pg.click('.w-mini button[data-z="bond"]'); pg.wait_for_timeout(600)
    check('全部通关' in pg.inner_text('#zGo') and pg.is_disabled('#zGo'), '分合全下架应显示全部通关：' + pg.inner_text('#zGo')); shot(pg, 'a-zone-out'); pg.click('#zX'); pg.wait_for_timeout(200)
    # 结算页：点亮很多格，「回到岛上」也要在屏内
    pg.locator('.w-mini button[data-z="dock"]').scroll_into_view_if_needed(); pg.click('.w-mini button[data-z="dock"]'); pg.wait_for_timeout(500); pg.click('#zGo'); pg.wait_for_timeout(3000)
    for i in range(3):
        if cur(pg) == 'demo': pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(300)
    pg.wait_for_timeout(600); pg.click('#qOral'); pg.wait_for_timeout(600); pg.click('#qOralNext'); pg.wait_for_timeout(1200)
    while cur(pg) == 'demo': pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(300)
    pg.evaluate("__sm.Q.ups = __sm.K.SKILLS.flatMap(s=>s.items).slice(0,24).map(i=>i.id)")
    bb = pg.locator('#qQuit').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(500)
    check(cur(pg) == 'qsum', '没到结算页'); shot(pg, 'b-sum'); hb = pg.locator('#qsHome').bounding_box(); check(hb and hb['y'] + hb['height'] <= H, f'结算页按钮超出屏幕 {hb}'); pg.click('#qsHome'); pg.wait_for_timeout(400)
    # 全部下架：首页通关，不能开始；这一天不计练习天数
    pg.evaluate(OUT + "('ALL')"); pg.evaluate("localStorage.setItem('speedmap.v2.test', JSON.stringify(__sm.S))"); pg.reload(); pg.wait_for_timeout(600); shot(pg, 'c-allout')
    check(pg.inner_text('#leadTitle') == '全部通关', '首页应显示全部通关：' + pg.inner_text('#leadTitle')); check(not pg.is_visible('#btnStart'), '全部下架不该再有开始按钮')
    d0 = pg.evaluate("Object.keys(__sm.S.stats||{}).filter(k=>__sm.S.stats[k].done).length"); check(d0 == 0, '没做题不该算一天')
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
