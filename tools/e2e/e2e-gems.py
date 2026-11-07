# 宝石碎片和锻造台的真实点击回归（说明书-宝石规则）。用法：python3 tools/e2e/e2e-gems.py <项目根> <截图目录> [宽 高]
import sys, json, pathlib, re, hashlib, hmac, datetime
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
W = int(sys.argv[3]) if len(sys.argv) > 3 else 844; H = int(sys.argv[4]) if len(sys.argv) > 4 else 390
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
known = {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': known, 'settings': {'bilingual': False}}
ink = {'done': True, 'samples': [], 'speed': 800}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
cur = lambda pg: pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]")
def play(pg, n, ok=True):
    # 真实走 resolve：和点选、写字判定后是同一个入口
    done = 0
    for _ in range(n * 10):
        c = cur(pg)
        if c == 'demo': pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(200); continue
        if c != 'qplay': break
        ph = pg.evaluate("__sm.Q && __sm.Q.phase")
        if ph == 'q':
            pg.evaluate(f"__sm.resolve({{ok:{'true' if ok else 'false'},fast:true}})"); done += 1
            pg.wait_for_timeout(120)
            if ok: pg.wait_for_timeout(900)
            else: pg.evaluate("(()=>{const b=document.getElementById('qNext');b&&!b.hidden&&b.click()})()"); pg.wait_for_timeout(250)
            if done >= n: break
        else:
            pg.evaluate("(()=>{const b=document.getElementById('qNext');b&&!b.hidden&&b.click()})()"); pg.wait_for_timeout(250)
    return done
def quit_(pg):
    if cur(pg) in ('qplay', 'demo'):
        bb = pg.locator('#qQuit' if cur(pg) == 'qplay' else '#dQuit').bounding_box(); pg.mouse.move(bb['x'] + 10, bb['y'] + 10); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(400)
def start_today(pg):
    pg.click('#btnStart', force=True); pg.wait_for_timeout(1800)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=True); pg = ctx.new_page()
    ctx.add_init_script('window.__gemRand = () => 0.99')   # 回归里关掉杂色碎片，数量才断言得准；杂色碎片单独测（第 12 组）
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.add_init_script(f"if(!localStorage.getItem('speedmap.v2.test')) {{ localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); localStorage.setItem('speedmap.ink.test', {json.dumps(json.dumps(ink))}); }}")
    pg.goto(url); pg.wait_for_timeout(800)
    check(pg.evaluate("GEMUI.enabled()"), '测试网址下碎片已开启')
    # 1 今日练习：答对几题后退出，结算页出现碎片区块
    start_today(pg); check(cur(pg) in ('qplay', 'demo'), '进入今日练习 ' + str(cur(pg)))
    n1 = play(pg, 12); quit_(pg)
    check(cur(pg) == 'qsum', '退出后到结算页'); st = pg.evaluate("GEMUI.state()")
    tot = st['inv']['s'] + st['inv']['m']
    check(tot > 0, f'答对 {n1} 题得到碎片：{st["inv"]}')
    check(pg.locator('.gemsum').count() == 1, '结算页有碎片区块')
    check(pg.locator('.gemsum').inner_text().find('%') < 0, '结算页不出现百分比'); pg.screenshot(path=str(out / f'sum-{W}.png'))
    check(pg.evaluate("(()=>{const e=document.querySelector('.gemsum').getBoundingClientRect();return e.right<=innerWidth+1})()"), '碎片区块不超屏')
    # 2 锻造：放 12 个小碎片（不够）→ 提醒、废料；1 大 8 中 → 废料 30
    pg.evaluate("Object.assign(GEMUI.state().inv,{s:20,m:20,l:2})")
    pg.locator('[data-gem=forge]').click(); pg.wait_for_timeout(200); check(cur(pg) == 'forge', '进锻造台')
    for _ in range(13): pg.locator('[data-add=s]').click(); pg.wait_for_timeout(30)
    check(pg.locator('#forgeMsg').inner_text() == '炉子最多放 12 个', '第 13 个放不进去：' + pg.locator('#forgeMsg').inner_text())
    pg.screenshot(path=str(out / f'forge-full-{W}.png'))
    # 不够：先提醒，选先不炼什么都不丢；仍然锻造就全变废料
    pg.click('#forgeGo'); pg.wait_for_timeout(150); check(pg.locator('#forgeWarn').is_visible(), '不够 100 先提醒'); pg.screenshot(path=str(out / f'forge-warn-{W}.png'))
    check('40' not in pg.locator('#forgeWarn').inner_text(), '提醒不说还差多少')
    check(pg.evaluate("(()=>{const b=document.getElementById('forgeWarnGo').getBoundingClientRect();return b.bottom<=innerHeight&&b.right<=innerWidth})()"), '提醒按钮不超屏')
    pg.click('#forgeWarnBack'); pg.wait_for_timeout(100); check(not pg.locator('#forgeWarn').is_visible(), '先不炼关掉提醒')
    check(pg.locator('#forgeSlots button').count() == 12 and pg.evaluate("GEMUI.state().inv.s") == 20, '先不炼：碎片还在炉子里，一个没少')
    t0 = pg.evaluate('performance.now()'); pg.click('#forgeGo'); pg.click('#forgeWarnGo'); pg.wait_for_timeout(100)
    check(pg.evaluate("GEMUI.state().inv.s") == 8, '仍然锻造：动画开始前碎片已扣并存盘')
    pg.wait_for_function("document.getElementById('forgeMsg').textContent", timeout=25000); pg.screenshot(path=str(out / f'forge-short-{W}.png'))
    t1 = pg.evaluate('performance.now()'); check(t1 - t0 >= 4000, f'动画够慢（{(t1 - t0) / 1000:.1f} 秒）')
    check(pg.locator('#forgeMsg').inner_text() == '没有炼出宝石，废料 60', '12 小炼不出：' + pg.locator('#forgeMsg').inner_text())
    check(pg.evaluate("GEMUI.state().days[Object.keys(GEMUI.state().days).pop()].forged") == 0, '没算炼出宝石')
    check(pg.locator('#forgeClaim').is_hidden(), '没有宝石可领')
    pg.evaluate("Object.assign(GEMUI.state().inv,{s:20})")
    pg.locator('[data-add=l]').click()
    for _ in range(8): pg.locator('[data-add=m]').click(); pg.wait_for_timeout(30)
    pg.wait_for_timeout(300); pg.screenshot(path=str(out / f'forge-{W}.png'))
    pg.click('#forgeGo'); pg.wait_for_timeout(3600); pg.screenshot(path=str(out / f'forge-hit-{W}.png')); pg.wait_for_timeout(2000); pg.screenshot(path=str(out / f'forge-gem-{W}.png')); pg.wait_for_function("document.getElementById('forgeMsg').textContent", timeout=25000)
    check(pg.locator('#forgeMsg').inner_text() == '得到宝石 1，废料 30', '1 大 8 中：' + pg.locator('#forgeMsg').inner_text())
    inv = pg.evaluate("GEMUI.state().inv"); check(inv == {'s': 20, 'm': 12, 'l': 1}, f'扣对了碎片 {inv}')
    pg.screenshot(path=str(out / f'forge-done-{W}.png'))
    # 3 领取：链接签名算对；再领一次是同一个累计数
    check(pg.locator('#forgeClaim').inner_text() == '领 1 颗宝石', '领取按钮：' + pg.locator('#forgeClaim').inner_text())
    pg.click('#forgeClaim'); link = pg.evaluate("window.__gemLink"); q = parse_qs(urlparse(link).query)
    want = hmac.new(b'48dbd815a5cefbc6c3380eba9c38d45c', f"mathmap|{q['items'][0]}|{q['ts'][0]}".encode(), hashlib.sha256).hexdigest()
    check(q['sig'][0] == want, '页面算的签名和标准算法一致'); check(re.fullmatch(r'\d{8}\.1\.\d+\.\d+', q['items'][0]) is not None, '链接：' + q['items'][0])
    check(pg.locator('#forgeClaim').inner_text() == '再领一次', '领过后按钮变再领一次')
    pg.click('#forgeBack'); pg.wait_for_timeout(200); check(cur(pg) == 'qsum', '返回结算页')
    # 4 挑战：没券没有按钮；有券进入就扣；全对得大碎片
    check(pg.locator('[data-gem=challenge]').count() == 0, '没券不显示挑战')
    pg.evaluate("GEMUI.state().tickets=1"); pg.goto(url); pg.reload(); pg.wait_for_timeout(600)
    pg.evaluate("GEMUI.state().tickets=1; GEMUI.state().inv.m=0")
    start_today(pg); play(pg, 2); quit_(pg)
    check(pg.locator('[data-gem=challenge]').count() == 1, '有券显示挑战')
    pg.locator('[data-gem=challenge]').click(); pg.wait_for_timeout(600)
    check(pg.evaluate("GEMUI.state().tickets") == 0, '进入挑战就扣券')
    pg.screenshot(path=str(out / f'challenge-{W}.png'))
    m0, l0 = pg.evaluate("[GEMUI.state().inv.m,GEMUI.state().inv.l]")
    won = play(pg, 5); pg.wait_for_timeout(400)
    check(won == 5, f'挑战 5 题，答了 {won}'); check(cur(pg) == 'qsum', '挑战结束页')
    m1, l1 = pg.evaluate("[GEMUI.state().inv.m,GEMUI.state().inv.l]"); check((m1 - m0, l1 - l0) == (5, 1), f'全对：中 +{m1-m0} 大 +{l1-l0}')
    pg.screenshot(path=str(out / f'challenge-done-{W}.png'))
    pg.click('#chHome'); pg.wait_for_timeout(300)
    # 5 刷新不丢；口答完全不算
    before = pg.evaluate("JSON.stringify(GEMUI.state().inv)"); pg.reload(); pg.wait_for_timeout(600)
    check(pg.evaluate("JSON.stringify(GEMUI.state().inv)") == before, '刷新后碎片还在')
    pg.evaluate("__sm.S.oral=true"); n0 = pg.evaluate("Object.values(GEMUI.state().days).reduce((a,d)=>a+d.n,0)")
    start_today(pg); play(pg, 3); quit_(pg)
    check(pg.evaluate("Object.values(GEMUI.state().days).reduce((a,d)=>a+d.n,0)") == n0, '口答模式不记作答')
    # 6 手机网页（没带 gems=1）：没有碎片
    pg2 = ctx.new_page(); pg2.goto((root / 'v2' / 'index.html').as_uri() + '#test'); pg2.wait_for_timeout(600)
    check(pg2.evaluate("GEMUI.enabled()") is False, '测试模式没带 gems=1 不开碎片')
    # 6b 手机网页：碎片和锻造台都有，没有领宝石
    pg3 = ctx.new_page(); pg3.goto((root / 'v2' / 'index.html').as_uri()); pg3.wait_for_timeout(700)
    check(pg3.evaluate("GEMUI.enabled()") is True, '手机网页开碎片')
    pg3.evaluate("Object.assign(GEMUI.state().inv,{s:0,m:10,l:0}); GEMUI.openForge('island')"); pg3.wait_for_timeout(200)
    for _ in range(10): pg3.locator('[data-add=m]').click()
    pg3.click('#forgeGo'); pg3.wait_for_function("document.getElementById('forgeMsg').textContent", timeout=25000)
    check(pg3.locator('#forgeMsg').inner_text() == pg3.evaluate("I18N.text('得到宝石 1，废料 0')"), '手机上能炼')   # 这一页走真实日期，单日是英文
    check(pg3.locator('#forgeClaim').is_hidden(), '手机上没有领宝石按钮'); check(pg3.evaluate("I18N.text('近 14 天 1')") in pg3.locator('#forgeToday').inner_text(), '手机上显示近 14 天炼出：' + pg3.locator('#forgeToday').inner_text())
    pg3.screenshot(path=str(out / f'phone-{W}.png'))
    # 7 动画被系统暂停（finished 永远不结束）：不能卡死在锻造台
    def fresh(extra=None, gems=None):
        c2 = b.new_context(viewport={'width': W, 'height': H}); c2.add_init_script('window.__gemRand = () => 0.99'); pp = c2.new_page(); pp.on('pageerror', lambda e: errs.append('异常场景 ' + str(e)))
        sd = dict(seed); sd.update(extra or {})
        init = f"localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(sd))}); localStorage.setItem('speedmap.ink.test', {json.dumps(json.dumps(ink))});"
        if gems is not None: init += f" localStorage.setItem('speedmap.test.gems', {json.dumps(gems)});"
        pp.add_init_script(init); pp.goto(url); pp.wait_for_timeout(600); return pp
    pp = fresh()
    pp.evaluate("(()=>{Object.assign(GEMUI.state().inv,{s:0,m:10,l:0}); GEMUI.openForge('island'); const o=Element.prototype.animate; Element.prototype.animate=function(){const a=o.apply(this,arguments); Object.defineProperty(a,'finished',{get(){return new Promise(()=>{});}}); return a;}; return 0;})()")
    for _ in range(10): pp.locator('[data-add=m]').click()
    pp.click('#forgeGo'); pp.wait_for_function("document.getElementById('forgeMsg').textContent", timeout=25000)
    check(pp.locator('#forgeMsg').inner_text() == '得到宝石 1，废料 0', '动画卡住也能走完：' + pp.locator('#forgeMsg').inner_text())
    pp.click('#forgeBack', timeout=3000); pp.wait_for_timeout(200); check(cur(pp) == 'island', '动画卡住后还能返回')
    # 8 碎片数据损坏：练习照常，不覆盖
    for bad in ['{"days":null}', '{坏的', '[1]', 'null']:
        pp = fresh(gems=bad)
        check(pp.evaluate("GEMUI.enabled()") is False and cur(pp) == 'island' and pp.evaluate("!!window.__sm"), f'碎片数据 {bad} 不挡练习')
        check(pp.evaluate("localStorage.getItem('speedmap.test.gems')") == bad, f'损坏的 {bad} 没被覆盖')
    # 9 只读：不结算、不进锻造台
    pp = fresh(); pp.evaluate("__sm.S.readOnly=true; GEMUI.openForge('island')"); pp.wait_for_timeout(100); check(cur(pp) != 'forge', '只读时进不了锻造台')
    # 10 口答：不显示挑战，再练不写券
    pp = fresh({'oral': True}); pp.evaluate("GEMUI.state().tickets=2"); pp.click('#btnStart', force=True); pp.wait_for_timeout(1800); play(pp, 2); quit_(pp)
    check(pp.locator('[data-gem=challenge]').count() == 0, '口答时不显示挑战')
    # 12 杂色碎片：掉落进结算和背包；炉子里能放；放下后不超屏；能凑准 100
    pp = fresh(); pp.evaluate("window.__gemRand = () => 0")
    pp.click('#btnStart', force=True); pp.wait_for_timeout(1800); play(pp, 2); quit_(pp)
    check(pp.locator('.gemsum .frag.o').count() > 0, '结算页显示杂色碎片'); pp.screenshot(path=str(out / f'odd-sum-{W}.png'))
    pp = fresh(); pp.evaluate("Object.assign(GEMUI.state().inv,{s:9,m:9,l:9,o4:1,o6:2,o7:3,o8:1,o12:1,o13:2}); GEMUI.openForge('island')"); pp.wait_for_timeout(300)
    oob = pp.evaluate("[...document.querySelectorAll('#forgeList button, #forgeGo, #forgeBack')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>innerHeight||r.top<0||r.right>innerWidth||r.left<0}).length"); check(oob == 0, f'杂色碎片 6 种都有时按钮不超屏（{oob} 个超了）')
    small = pp.evaluate("Math.min(...[...document.querySelectorAll('.oddchip')].map(e=>e.getBoundingClientRect().height))"); check(small >= 36, f'杂色碎片按钮够大（{small}）'); pp.screenshot(path=str(out / f'odd-forge-{W}.png'))
    for t in ['o13', 'o13', 'o12', 'o6', 'o6']: pp.locator(f'[data-add={t}]').click(); pp.wait_for_timeout(40)
    pp.locator('[data-add=l]').click(); pp.wait_for_timeout(350); pp.screenshot(path=str(out / f'odd-placed-{W}.png'))
    pp.click('#forgeGo'); pp.wait_for_timeout(300); pp.wait_for_function("document.getElementById('forgeMsg').textContent", timeout=25000)
    check(pp.locator('#forgeMsg').inner_text() in ['得到宝石 1，废料 0', pp.evaluate("I18N.text('得到宝石 1，废料 0')")], '13+13+12+6+6+50 正好 100：' + pp.locator('#forgeMsg').inner_text())
    inv = pp.evaluate("GEMUI.state().inv"); check(inv['o13'] == 0 and inv['o6'] == 0 and inv['l'] == 8 and inv['o7'] == 3, f'扣对了杂色碎片 {inv}')
    check(pp.locator('[data-add=o13]').count() == 0, '用完的杂色碎片不再显示')
    pp.reload(); pp.wait_for_timeout(600); check(pp.evaluate("GEMUI.state().inv.o7") == 3, '杂色碎片刷新后还在')
    # 13 弹出：双倍挑战（成功、失败、再挑战一次）、限时挑战、暴击、退出提示、30 分钟休息（真实点击）
    DAYK = "(()=>{const d=GEMUI.state().days;return d[Object.keys(d).pop()]})()"
    def forced(js=''):
        pp = fresh(); pp.evaluate("GEMS.TUNE.gapMin=0; GEMS.TUNE.gapMax=1;" + js); pp.click('#btnStart', force=True); pp.wait_for_timeout(1800); return pp
    def evc(pp): return pp.evaluate("!!(__sm.Q && __sm.Q.opts && __sm.Q.opts.evc)")
    pp = forced("GEMS.TUNE.qcShare=0; GEMS.TUNE.dblMinN=2; GEMS.TUNE.dblSec=60; GEMUI.state().ev={sec:30,acc:.5,h:{},log:[]}"); play(pp, 2); pp.wait_for_timeout(700)
    check(pp.locator('#gemEv.offer').count() == 1, '弹出双倍挑战：' + pp.locator('#gemEv').inner_text()); pp.screenshot(path=str(out / f'ev-offer-{W}.png'))
    check(pp.evaluate("(()=>{const b=document.getElementById('gemEv').getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.height>=40})()"), '双倍入口不超屏、够大')
    n0 = pp.evaluate("__sm.Q.n"); pp.click('#gemEv'); pp.wait_for_timeout(500); check(evc(pp), '点进入后是独立小关'); pp.screenshot(path=str(out / f'ev-dbl-{W}.png'))
    check(pp.evaluate(DAYK + ".dbl") == 1, '计 1 次双倍挑战'); inv0 = pp.evaluate("JSON.stringify(GEMUI.state().inv)")
    for _ in range(4):
        if cur(pp) != 'qplay': break
        pp.evaluate("__sm.Q&&__sm.Q.phase==='q'&&__sm.resolve({ok:true,fast:true})"); pp.wait_for_timeout(1000)
    pp.wait_for_timeout(600); check(cur(pp) == 'qsum' and pp.locator('#evBack').count() == 1, '答够题数出结果：' + pp.locator('#qsum').inner_text()[:40].replace(chr(10), ' ')); pp.screenshot(path=str(out / f'ev-won-{W}.png'))
    check(pp.locator('#evRetry').count() == 0, '完成了不用再挑战'); check(pp.evaluate("GEMUI.state().ev.log.length") == 1 and pp.evaluate("GEMUI.state().ev.log[0].won") == 1, '记录了这次完成')
    pp.click('#evBack'); pp.wait_for_timeout(600); check(cur(pp) == 'qplay' and not evc(pp) and pp.evaluate("__sm.Q.n") >= n0, f'回到原来的练习，计数接着算（{n0}）')
    pp = forced("GEMS.TUNE.qcShare=0; GEMS.TUNE.dblSec=2; GEMS.TUNE.dblMinN=20"); play(pp, 2); pp.wait_for_timeout(700); pp.click('#gemEv'); pp.wait_for_timeout(3200)
    check(cur(pp) == 'qsum' and pp.locator('#evRetry').count() == 1, '超时：可以再挑战一次'); pp.screenshot(path=str(out / f'ev-fail-{W}.png')); h1 = pp.evaluate("GEMUI.state().ev.h.dbl"); check(h1 < 0.85, f'失败后题目略易（{h1}）')
    pp.click('#evRetry'); pp.wait_for_timeout(3200); check(cur(pp) == 'qsum' and pp.locator('#evRetry').count() == 0 and pp.locator('#evBack').count() == 1, '再挑战一次也没完成：只能继续练习'); check(pp.evaluate(DAYK + ".dbl") == 1, '再挑战不占次数')
    pp = forced("GEMS.TUNE.qcShare=1; GEMS.TUNE.qcMinN=2; GEMS.TUNE.qcMaxN=2; GEMS.TUNE.dblMax=0"); play(pp, 2); pp.wait_for_timeout(700); check(pp.locator('#gemEv.offer').count() == 1, '弹出限时挑战：' + pp.locator('#gemEv').inner_text()); pp.screenshot(path=str(out / f'ev-qc-{W}.png'))
    pp.click('#gemEv'); pp.wait_for_timeout(300); f0 = pp.evaluate(DAYK + ".forged")
    for _ in range(3):
        if cur(pp) != 'qplay': break
        pp.evaluate("__sm.Q&&__sm.Q.phase==='q'&&__sm.resolve({ok:true,fast:true})"); pp.wait_for_timeout(1000)
    pp.wait_for_timeout(600); f1 = pp.evaluate(DAYK + ".forged"); check(f1 == f0 + 1, f'答够题数得 1 颗宝石（{f0} → {f1}）'); check(cur(pp) == 'qsum', '限时挑战出结果')
    pp = forced("GEMS.TUNE.critAt=0; GEMS.TUNE.crit1=1; GEMS.TUNE.crit2=1; GEMS.TUNE.gapMin=1e9; GEMS.TUNE.gapMax=1e9; window.__gemRand=()=>0"); play(pp, 1); pp.wait_for_timeout(100); check(pp.evaluate("GEMUI.state().inv.l") >= 1, '暴击得大碎片'); pp.screenshot(path=str(out / f'ev-crit-{W}.png'))
    pp = forced("GEMS.TUNE.gapMin=1e9; GEMS.TUNE.gapMax=1e9;"); play(pp, 2); pp.evaluate("GEMS.TUNE.critAt=99999; " + DAYK + ".sec=99999-120")
    box = pp.locator('#qQuit').bounding_box(); pp.mouse.move(box['x'] + 5, box['y'] + 5); pp.mouse.down(); pp.wait_for_timeout(1150); pp.mouse.up(); pp.wait_for_timeout(200)
    check(pp.locator('#exitOv').is_visible() and cur(pp) == 'qplay', '差一点开启暴击时间：长按结束先提示'); pp.screenshot(path=str(out / f'ev-exit-{W}.png'))
    pp.click('#exitEnd'); pp.wait_for_timeout(400); check(cur(pp) != 'qplay', '选结束直接退出')
    pp = forced("GEMS.TUNE.gapMin=1e9; GEMS.TUNE.gapMax=1e9;"); play(pp, 2); box = pp.locator('#qQuit').bounding_box(); pp.mouse.move(box['x'] + 5, box['y'] + 5); pp.mouse.down(); pp.wait_for_timeout(1150); pp.mouse.up(); pp.wait_for_timeout(300)
    check(not pp.locator('#exitOv').is_visible() and cur(pp) != 'qplay', '离得远不弹，直接退出')
    # 30 分钟：提示倒计时 → 结束 → 休息盖住界面 → 刷新跳不过
    pp = forced("GEMS.TUNE.gapMin=1e9; GEMS.TUNE.gapMax=1e9; GEMS.TUNE.restGrace=2"); play(pp, 1); pp.evaluate("GEMUI.state().rest={sec:1799,at:Date.now()/1000,until:0}"); play(pp, 1); pp.wait_for_timeout(700)
    check('休息' in pp.locator('#gemEv').inner_text() or 'Rest' in pp.locator('#gemEv').inner_text(), '满 30 分钟提示：' + pp.locator('#gemEv').inner_text()); pp.screenshot(path=str(out / f'rest-soon-{W}.png'))
    pp.wait_for_timeout(2600); check(cur(pp) != 'qplay' and pp.locator('#restOv').is_visible(), '到点结束，休息盖住界面'); pp.screenshot(path=str(out / f'rest-{W}.png'))
    left = pp.evaluate("GEMS.restLeft(GEMUI.state(), Date.now()/1000)"); check(280 < left <= 300, f'休息 5 分钟（{left:.0f}）')
    pp.reload(); pp.wait_for_timeout(1200); check(pp.locator('#restOv').is_visible(), '刷新跳不过休息')
    pp = forced("GEMS.TUNE.qcShare=0; GEMS.TUNE.dblSec=60; GEMS.TUNE.dblMinN=20; GEMS.TUNE.restGrace=1"); play(pp, 2); pp.wait_for_timeout(700); pp.click('#gemEv'); pp.wait_for_timeout(300); pp.evaluate("GEMUI.state().rest={sec:1900,at:Date.now()/1000,until:0}"); pp.wait_for_timeout(2500)
    check(cur(pp) == 'qplay' and evc(pp) and not pp.locator('#restOv').is_visible(), '挑战中不打断')
    pp.evaluate("__sm.Q.opts.evc.until=0"); pp.wait_for_timeout(1000); check(pp.locator('#restOv').is_visible() and pp.locator('#evRetry').count() == 0, '挑战结束后休息，不给再挑战')
    # 岛首页锻造入口
    pp = fresh(); check(pp.locator('#btnForge').is_visible(), '岛首页有锻造台入口'); pp.screenshot(path=str(out / f'island-forge-{W}.png'))
    oob = pp.evaluate("(()=>{const b=document.getElementById('btnForge').getBoundingClientRect(),m=document.getElementById('btnMist').getBoundingClientRect();return b.left<0||b.right>m.left+1||b.right>innerWidth})()"); check(not oob, '入口不和错题宝箱重叠、不超屏')
    pp.click('#btnForge'); pp.wait_for_timeout(300); check(cur(pp) == 'forge', '点入口进锻造台'); pp.click('#forgeBack'); pp.wait_for_timeout(300); check(cur(pp) == 'island', '返回回到岛上')
    # 11 英文日：孩子看到的新文字没有中文
    pp = fresh({'settings': {'bilingual': True}, 'testDays': 0 if datetime.date.today().day % 2 == 1 else 1});   # 单日是英文日，今天是双日就跳到明天 check(pp.evaluate("document.documentElement.lang") == 'en', '测试日是英文日')
    pp.evaluate("Object.assign(GEMUI.state().inv,{s:20,m:20,l:2}); GEMUI.state().tickets=1; GEMUI.openForge('island')"); pp.wait_for_timeout(300)
    for _ in range(13): pp.locator('[data-add=s]').click(); pp.wait_for_timeout(20)
    pp.wait_for_timeout(200); t1 = pp.locator('#forge').inner_text(); pp.screenshot(path=str(out / f'forge-en-{W}.png'))
    pp.click('#forgeGo'); pp.wait_for_timeout(150); t2 = pp.locator('#forgeWarn').inner_text(); pp.screenshot(path=str(out / f'forge-warn-en-{W}.png')); pp.click('#forgeWarnGo'); pp.wait_for_timeout(300); pp.wait_for_function("document.getElementById('forgeMsg').textContent", timeout=25000); t2 += pp.locator('#forge').inner_text()
    pp.locator('[data-add=m]').click(); [pp.locator('[data-add=m]').click() for _ in range(9)]; pp.click('#forgeGo'); pp.wait_for_timeout(600); pp.wait_for_function("document.getElementById('forgeMsg').textContent", timeout=25000); t3 = pp.locator('#forge').inner_text(); pp.wait_for_timeout(400); pp.screenshot(path=str(out / f'forge-en-done-{W}.png'))
    box = pp.evaluate("(()=>{const b=document.getElementById('forgeToday').getBoundingClientRect();return [b.left,b.top,b.right,b.bottom,innerWidth,b.height]})()"); check(box[1] >= 0 and box[2] <= box[4] and box[5] <= 72, f'英文日「近 14 天」不换行不超屏 {box}')
    pp.click('#forgeBack'); pp.wait_for_timeout(300); pp.click('#btnStart', force=True); pp.wait_for_timeout(1800); play(pp, 2); quit_(pp); t4 = pp.locator('.gemsum').inner_text(); pp.screenshot(path=str(out / f'sum-en-{W}.png'))
    han = re.compile(r'[\u3400-\u9fff]')
    for name, t in [('放碎片', t1), ('不够', t2), ('炼成', t3), ('结算', t4)]: check(not han.search(t), f'英文日{name}没有中文：' + t.replace(chr(10), ' ')[:110])
    b.close()
check(not errs, '没有报错 ' + '; '.join(errs[:3]))
print('失败' if fails else '全部通过', len(fails)); sys.exit(1 if fails else 0)
