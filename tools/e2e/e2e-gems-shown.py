# 奖励到账看得见（中控 11-09）：①答对出对勾时碎片条不藏、挪到对勾下面不重叠；②摸底结果页显示这次拿到的碎片
# 用法：python3 tools/e2e/e2e-gems-shown.py <项目根> <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
known = {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': known, 'settings': {'bilingual': False}}
fresh = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'known': {}, 'settings': {'bilingual': False}}
ink = {'done': True, 'samples': [], 'speed': 800}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
cur = lambda pg: pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]")
RECT = """(()=>{const r=id=>{const e=document.getElementById(id);if(!e||e.hidden)return null;const b=e.getBoundingClientRect();if(!b.width)return null;return {l:b.left,t:b.top,r:b.right,b:b.bottom,vis:getComputedStyle(e).visibility}};return {feel:r('qFeel'),check:r('qCheck'),pad:r('qPad')||null,W:innerWidth,H:innerHeight}})()"""
def page(b, W, H, data):
    ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=True, screen={'width': W, 'height': H})
    pg = ctx.new_page(); pg.goto(url)
    pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(data))}); localStorage.setItem('speedmap.ink.test', {json.dumps(json.dumps(ink))})")
    pg.close(); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(url); pg.wait_for_timeout(800)
    return pg
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for name, W, H in [('844', 844, 390), ('667', 667, 375), ('ipad', 1180, 820)]:
        # ① 今日练习答对：出对勾的那一刻碎片条看得见，不和对勾重叠，不出屏幕
        pg = page(b, W, H, seed); pg.click('#btnStart', force=True); pg.wait_for_timeout(1800)
        seen = 0
        for _ in range(40):
            c = cur(pg)
            if c == 'demo': pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(200); continue
            if c != 'qplay': break
            if pg.evaluate("__sm.Q && __sm.Q.phase") == 'q':
                had = pg.evaluate(RECT)['feel']
                pg.evaluate("__sm.Q.t0 = performance.now(); __sm.Q.ms = 500; __sm.resolve({ok:true,fast:true})"); pg.wait_for_timeout(150)
                r = pg.evaluate(RECT)
                if had and r['check']:
                    f, k = r['feel'], r['check']
                    overlap = not (f['r'] <= k['l'] or f['l'] >= k['r'] or f['b'] <= k['t'] or f['t'] >= k['b'])
                    check(f['vis'] == 'visible' and not overlap and f['r'] <= W and f['b'] <= H, f'{name} 对勾时碎片条看得见、不压对勾：{f} {k}')
                    if seen == 0: pg.screenshot(path=str(out / f'shown-check-{name}.png'))
                    seen += 1
                pg.wait_for_timeout(1000)
                if seen >= 2: break
            else:
                pg.evaluate("(()=>{const b=document.getElementById('qNext');b&&!b.hidden&&b.click()})()"); pg.wait_for_timeout(300)
        check(seen >= 2, f'{name} 走到了出对勾的写字题 {seen} 次')
        # 下一题出来后碎片条回到右上角原位
        pg.wait_for_timeout(400); r = pg.evaluate(RECT)
        wide = pg.evaluate("document.getElementById('qplay').classList.contains('wide')")
        check(not r['check'] and r['feel'] and abs(r['feel']['t'] - (62 if wide else 16)) <= 4, f'{name} 下一题碎片条回到原位（{"宽版" if wide else "写字板"}）：{r["feel"]}')
        for _ in range(20):
            if cur(pg) != 'qplay': break
            if pg.evaluate("__sm.Q && __sm.Q.phase") == 'q' and not pg.evaluate("document.getElementById('qplay').classList.contains('wide')"):
                pg.wait_for_timeout(300); r = pg.evaluate(RECT); check(r['feel'] and abs(r['feel']['t'] - 16) <= 4, f'{name} 写字板版面碎片条在右上角原位：{r["feel"]}'); break
            if pg.evaluate("__sm.Q && __sm.Q.phase") == 'q': pg.evaluate("__sm.Q.t0 = performance.now(); __sm.Q.ms = 500; __sm.resolve({ok:true,fast:true})"); pg.wait_for_timeout(1100)
            else: pg.evaluate("(()=>{const b=document.getElementById('qNext');b&&!b.hidden&&b.click()})()"); pg.wait_for_timeout(300)
        # 能量格：这次答对新加的格子在闪（class new）
        pg.context.close()
        # ② 摸底答对 3 题后长按结束：结果页有「这次的碎片 +3」，不挤出屏幕
        pg = page(b, W, H, fresh); pg.click('#btnStart', force=True); pg.wait_for_timeout(2200)
        if pg.is_visible('#piGo'): pg.click('#piGo'); pg.wait_for_timeout(900)
        n = 0
        for _ in range(12):
            if pg.evaluate("__sm.Q && __sm.Q.kind === 'place' && __sm.Q.phase === 'q'"):
                pg.evaluate("__sm.Q.t0 = performance.now(); __sm.Q.ms = 500; __sm.resolve({ok: true, fast: true})"); n += 1
                if n >= 3: break
            pg.wait_for_timeout(900)
        pg.wait_for_timeout(900)
        bb = pg.locator('#qQuit').bounding_box(); pg.mouse.move(bb['x'] + 10, bb['y'] + 10); pg.mouse.down(); pg.wait_for_timeout(1300); pg.mouse.up(); pg.wait_for_timeout(800)
        i = pg.evaluate("(()=>{const e=document.getElementById('prGems'),g=document.getElementById('prGo');return {cur:[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0],text:e?e.innerText.replace(/\\s+/g,' '):'',bottom:e?e.getBoundingClientRect().bottom:0,go:g.getBoundingClientRect().bottom,sw:document.documentElement.scrollWidth}})()")
        check(n == 3 and i['cur'] == 'placeResult' and '这次的碎片' in i['text'] and '+3' in i['text'], f'{name} 摸底结果页显示这次的碎片：{i["text"]}')
        check(i['bottom'] < i['go'] <= H and i['sw'] <= W, f'{name} 摸底结果页不超出屏幕：{i}')
        pg.screenshot(path=str(out / f'shown-place-{name}.png')); pg.context.close()
    b.close()
print('页面报错:', errs[:3])
if fails or errs: print('FAIL', len(fails), '项'); sys.exit(1)
print('PASS 奖励到账看得见（对勾时碎片条、摸底结果页碎片）')
