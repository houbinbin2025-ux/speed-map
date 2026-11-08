# 结算页版面回归（捣蛋鬼第 1 轮第 12 条）：碎片开着、信息最多的情况下，关键行都要在屏幕里，不靠滚动。
# 用法：python3 tools/e2e/e2e-qsum.py <项目根> <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
known = {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': known, 'settings': {'bilingual': False}}
ink = {'done': True, 'samples': [], 'speed': 800}
SIZES = [(667, 375), (844, 390), (932, 430), (1194, 834)]
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
cur = lambda pg: pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]")
def play(pg, n):
    done = 0
    for _ in range(n * 10):
        c = cur(pg)
        if c == 'demo': pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(200); continue
        if c != 'qplay': break
        if pg.evaluate("__sm.Q && __sm.Q.phase") == 'q':
            pg.evaluate("__sm.resolve({ok:true,fast:true})"); done += 1; pg.wait_for_timeout(1000)
            if done >= n: break
        else:
            pg.evaluate("(()=>{const b=document.getElementById('qNext');b&&!b.hidden&&b.click()})()"); pg.wait_for_timeout(250)
    return done
# 看得见：在视口内，且没被滚动容器裁掉
VIS = """sel => { const e = document.querySelector(sel); if (!e) return 'missing'; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return 'hidden';
  if (r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1) return 'off-screen ' + JSON.stringify([r.top|0, r.bottom|0, innerHeight]);
  let p = e.parentElement; while (p && p !== document.body) { const s = getComputedStyle(p); if (/auto|scroll|hidden/.test(s.overflowY)) { const q = p.getBoundingClientRect(); if (r.top < q.top - 1 || r.bottom > q.bottom + 1) return 'clipped ' + JSON.stringify([r.top|0, r.bottom|0, q.top|0, q.bottom|0]); } p = p.parentElement; }
  return 'ok'; }"""
with sync_playwright() as p:
    b = p.chromium.launch()
    for W, H in SIZES:
        for mode in ('rich', 'plain') + (('en',) if H < 560 else ()):
            ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=True); pg = ctx.new_page()
            ctx.add_init_script('window.__gemRand = () => 0.99')
            ctx.add_init_script("addEventListener('DOMContentLoaded', () => { if (window.GEMS) GEMS.TUNE.exitRate = 0; })")
            pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.add_init_script(f"if(!localStorage.getItem('speedmap.v2.test')) {{ localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); localStorage.setItem('speedmap.ink.test', {json.dumps(json.dumps(ink))}); }}")
            pg.goto(url); pg.wait_for_timeout(800)
            if mode == 'en':   # 英文日：去掉 bilingual=false，拨到单日
                pg.evaluate("(()=>{const S=JSON.parse(localStorage.getItem('speedmap.v2.test'));delete S.settings.bilingual;S.testDays=I18N.isEn({}, SM.dayOf(Date.now(),0))?0:1;localStorage.setItem('speedmap.v2.test',JSON.stringify(S));})()")
                pg.reload(); pg.wait_for_timeout(800)
            pg.click('#btnStart', force=True); pg.wait_for_timeout(1800)
            play(pg, 10)
            if mode in ('rich', 'en'):
                # 信息最多：点亮 16 格、碎片样样都有、有战利品箱、有新错题、练满 10 分钟
                pg.evaluate("""(()=>{ const Q=__sm.Q, S=__sm.S, ids=Object.keys(__sm.K.ITEM).slice(0,16); Q.ups=ids; Q.gem={s:6,m:3,a:2,b:1,h:1,l:1,o3:2}; Q.crit=2; Q.effSec=420;
                  S.home=S.home||{}; S.home.loot=(S.home.loot||[]).concat([{t:'cert',id:'x'}]); S.daily=Object.assign(S.daily||{}, {done:true, sec:700, pearl:false});
                  S.mistakes=Object.assign(S.mistakes, {'zz1':{due:1},'zz2':{due:1}}); Q.mist0=0; })()""")
            bb = pg.locator('#qQuit').bounding_box(); pg.mouse.move(bb['x'] + 10, bb['y'] + 10); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(600)
            check(cur(pg) == 'qsum', f'{W}x{H} {mode} 到结算页')
            pg.screenshot(path=str(out / f'qsum-{W}x{H}-{mode}.png'))
            tight = H < 560
            keys = [('#qsHome', '回到岛上'), ('#qsGemFold' if tight else '#qsum .gemsum', '碎片一行' if tight else '碎片区')]
            if mode != 'plain': keys += [('#qsHouse', '回家打开'), ('#qsBox', '战利品箱一行'), ('#qsUps', '今天点亮的')]
            for sel, name in keys:
                r = pg.evaluate(VIS, sel); check(r == 'ok', f'{W}x{H} {mode} {name} 不用滚动就看得见：{r}')
            if tight:
                check(pg.locator('#qsum .gemsum .gemline').first.is_hidden() and pg.locator('[data-gem=forge]').is_hidden(), f'{W}x{H} {mode} 碎片明细和碎片按钮默认收起（不露半截）')
                lab = pg.locator('#qsGemFold').inner_text(); tk = pg.locator('#qsum .gemsum .gemline').first.inner_text()
                check(('挑战券 +1' in tk or 'ticket' in tk.lower()) == ('挑战券 +1' in lab or 'ticket' in lab.lower()), f'{W}x{H} {mode} 得了挑战券，收起行也写：{lab}')
                if mode != 'plain': check(lab.startswith('Shards this round +16' if mode == 'en' else '这次的碎片 +16'), '收起行写碎片个数：' + pg.locator('#qsGemFold').inner_text())
                check(pg.locator('#qsGemFold').bounding_box()['height'] >= 44, f'{W}x{H} 碎片一行手指够得着（≥44）')
                pg.locator('#qsGemFold').click(); pg.wait_for_timeout(200)
                check(pg.locator('#qsum .gemsum .gemline').first.is_visible(), f'{W}x{H} {mode} 点开后看到碎片明细')
                check(pg.locator('#qsGemFold').get_attribute('aria-expanded') == 'true', f'{W}x{H} 展开状态记在 aria-expanded')
                for g in pg.evaluate("[...document.querySelectorAll('#qsum [data-gem]')].map(b=>b.dataset.gem)"):
                    r = pg.evaluate(VIS, f'#qsum [data-gem={g}]'); check(r == 'ok', f'{W}x{H} {mode} 点开后碎片按钮 {g} 整个看得见：{r}')
                pg.screenshot(path=str(out / f'qsum-{W}x{H}-{mode}-open.png'))
                pg.locator('#qsGemFold').click(); pg.wait_for_timeout(150)
                check(pg.locator('#qsum .gemsum .gemline').first.is_hidden(), f'{W}x{H} {mode} 再点一次收起')
            else:
                check(pg.locator('#qsGemFold').count() == 0 and pg.locator('#qsum .gemsum .gemline').first.is_visible(), f'{W}x{H} {mode} 大屏碎片明细直接摊开')
            if mode == 'plain' and pg.locator('#qsum .qsChips').count():
                check(pg.locator('#qsum .qsChips .chip2:not(.more)[hidden]').count() == 0, f'{W}x{H} plain 放得下时点亮的格子全摆，不收')
            if mode != 'plain' and pg.locator('#qsChips, #qsum .qsChips').count():
                rows = pg.evaluate("new Set([...document.querySelectorAll('#qsum .qsChips .chip2')].filter(c=>!c.hidden).map(c=>c.offsetTop)).size")
                shown = pg.evaluate("[...document.querySelectorAll('#qsum .qsChips .chip2:not(.more)')].filter(c=>!c.hidden).length")
                more = pg.evaluate("(()=>{const m=document.querySelector('#qsum .qsChips .more');return m&&!m.hidden?+m.textContent.slice(1):0})()")
                check(shown + more == 16, f'{W}x{H} 点亮格子 {shown} 个 + 「+{more}」= 16')
                check(rows <= 2 if tight else shown == 16, f'{W}x{H} {mode} 点亮格子：' + (f'手机最多两行（{rows} 行）' if tight else f'大屏全摆（{shown} 个）'))
            if mode == 'en':
                zh = pg.evaluate("[...document.querySelectorAll('#qsum *')].filter(e=>e.offsetParent&&[...e.childNodes].some(n=>n.nodeType===3&&/[\\u4e00-\\u9fff]/.test(n.textContent))).map(e=>e.textContent.trim()).slice(0,5)")
                check(pg.evaluate("document.documentElement.lang") == 'en' and not zh, f'{W}x{H} 英文日结算页没有中文：{zh}')
            check(pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), f'{W}x{H} {mode} 没有横向溢出')
            ctx.close()
    b.close()
print('页面报错：', errs[:5])
if errs: fails.append('页面报错')
print('通过' if not fails else f'失败 {len(fails)} 项'); sys.exit(1 if fails else 0)
