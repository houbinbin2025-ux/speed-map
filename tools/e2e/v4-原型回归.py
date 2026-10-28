# v4 岛世界原型回归：按 10-28 独立审查清单逐条重放（进场被打断、连点、两位数手写、答错讲解、结算对得上、错题宝箱、小地图、点击区、竖屏）
# 用法：python3 tools/e2e/v4-原型回归.py docs/原型-v4/岛世界.html <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
url = pathlib.Path(sys.argv[1]).resolve().as_uri(); out = pathlib.Path(sys.argv[2]); R = {}; errs = []
def scr(pg): return pg.evaluate("['world','play','sum'].find(k => !document.getElementById(k).classList.contains('off'))")
with sync_playwright() as p:
    b = p.chromium.launch()
    def page(w=932, h=430):
        ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(url); pg.wait_for_timeout(500)
        pg.evaluate("window.__shows = 0; new MutationObserver(() => { if (!document.getElementById('play').classList.contains('off')) window.__shows++; }).observe(document.getElementById('play'), {attributes: true})")
        cdp = ctx.new_cdp_session(pg); return pg, cdp
    def touch(cdp, k, x=0, y=0): cdp.send('Input.dispatchTouchEvent', {'type': k, 'touchPoints': [] if k == 'touchEnd' else [{'x': x, 'y': y}]})
    def stroke(pg, cdp, dx=0):
        bb = pg.locator('#pad').bounding_box(); x, y = bb['x'] + bb['width'] / 2 - 60 + dx, bb['y'] + 60
        touch(cdp, 'touchStart', x, y)
        for i in range(10): touch(cdp, 'touchMove', x + i, y + i * 12); pg.wait_for_timeout(16)
        touch(cdp, 'touchEnd')
    def asked(pg): return pg.evaluate("document.getElementById('cart').style.left")
    # 1 进场途中碰岛
    for d in [100, 300]:
        pg, cdp = page(); pg.tap('#start'); pg.wait_for_timeout(d); pg.touchscreen.tap(400, 250); pg.wait_for_timeout(2600)
        R[f'1 点开始后 {d}ms 碰岛'] = scr(pg); pg.context.close()
    # 5 连点开始
    pg, cdp = page(); [pg.tap('#start') for _ in range(3)]; pg.wait_for_timeout(2600); R['5 连点开始，进练习次数'] = pg.evaluate("window.__shows")
    # 2 两位数：写 1，停 1 秒，写 4，等 1.8 秒
    stroke(pg, cdp); pg.wait_for_timeout(1000); c1 = asked(pg); stroke(pg, cdp, 60); pg.wait_for_timeout(1800); R['2 两位数停 1 秒：第二笔前交卷了吗'] = c1 != '0px'; R['2 两笔后交成 1 题'] = asked(pg) != '0px'
    # 写好了按钮
    pg.wait_for_timeout(600); stroke(pg, cdp); pg.tap('#done'); pg.wait_for_timeout(100); R['写好了按钮立即交卷'] = pg.evaluate("document.getElementById('pad').classList.contains('lock')")
    pg.wait_for_timeout(900)
    # 6 答错讲解
    pg.tap('#dBad'); pg.wait_for_timeout(300); pg.screenshot(path=str(out / 'r6-wrong.png'))
    R['6 答错：空格填了答案、提示'] = pg.evaluate("[document.querySelector('#qfig u')?.textContent, document.getElementById('qnote').textContent]")
    # 8 反馈期间写字
    R['8 反馈期间写字板锁住'] = pg.evaluate("getComputedStyle(document.getElementById('ink')).pointerEvents")
    pg.wait_for_timeout(1400); R['6 1.7 秒时还在讲解'] = pg.evaluate("document.getElementById('qnote').classList.contains('rv')"); pg.wait_for_timeout(1000)
    # 7 对啦 和答案
    pg.tap('#dOk'); pg.wait_for_timeout(180)
    R['7 对啦与答案重叠'] = pg.evaluate("(() => { const a = document.getElementById('okpop').getBoundingClientRect(), n = document.getElementById('ans'), t = document.createRange(); t.selectNodeContents(n); const b = t.getBoundingClientRect(); return !(a.bottom < b.top || a.top > b.bottom); })()")
    pg.screenshot(path=str(out / 'r7-ok.png')); pg.wait_for_timeout(900)
    for i in range(8): pg.tap('#dOk'); pg.wait_for_timeout(900)
    pg.wait_for_timeout(600); pg.screenshot(path=str(out / 'r3-sum-bond.png'))
    R['3 结算（分合 11/12）'] = pg.evaluate("[document.getElementById('sumT').textContent, document.getElementById('sumP').textContent, document.getElementById('sumLit').textContent]")
    pg.tap('#home'); pg.wait_for_timeout(700); pg.screenshot(path=str(out / 'r4-home.png'))
    R['4 回岛：开始副标题、旗子在哪、亮的格'] = pg.evaluate("[document.getElementById('startSub').textContent, window.__v4.ZONES.find(z => z.today)?.id, window.__v4.ZONES.find(z => z.id==='bond').lv.join('')]")
    hx = pg.evaluate("(() => { const r = document.getElementById('hero').getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })()"); pg.touchscreen.tap(*hx); pg.wait_for_timeout(200)
    R['4 小人台词'] = pg.evaluate("document.getElementById('say').textContent")
    pg.wait_for_timeout(1900)
    dg = pg.evaluate("(() => { const r = document.getElementById('dog').getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })()"); pg.touchscreen.tap(*dg); pg.wait_for_timeout(200)
    R['9 点小狗'] = [pg.evaluate("document.getElementById('say').textContent"), pg.evaluate("document.getElementById('sheet').classList.contains('open')")]
    # 10 小地图
    for i, n in [(1, 'home'), (7, 'speed'), (4, 'place')]:
        pg.tap(f'#mini button:nth-child({i})'); pg.wait_for_timeout(700)
        R[f'10 点小地图 {n} → 高亮'] = pg.evaluate("document.querySelector('#mini button.on')?.dataset.z")
        if n == 'home': pg.wait_for_timeout(300); R['9 家'] = pg.evaluate("document.getElementById('say').classList.contains('on') && document.getElementById('say').textContent")
        if pg.evaluate("document.getElementById('sheet').classList.contains('open')"): pg.tap('#sheetX'); pg.wait_for_timeout(300)
    # 全错结算
    pg.evaluate("window.__v4.go(window.__v4.ZONES.find(z => z.id === 'look'))"); pg.wait_for_timeout(2600)
    for i in range(12): pg.tap('#dBad'); pg.wait_for_timeout(2650)
    pg.wait_for_timeout(500); pg.screenshot(path=str(out / 'r3-allwrong.png'))
    R['3 看数全错结算'] = pg.evaluate("[document.getElementById('sumT').textContent, document.getElementById('sumP').textContent, document.getElementById('sumLit').textContent, document.querySelector('.sumHero').classList.contains('still')]")
    pg.tap('#home'); pg.wait_for_timeout(600)
    # 11 错题宝箱
    pg.tap('#btnChest'); pg.wait_for_timeout(400); pg.tap('#boxGo'); pg.wait_for_timeout(2600); qs = []
    for i in range(3): qs.append(pg.evaluate("document.getElementById('qtag').textContent + ' ' + document.getElementById('qfig').innerText.replace(/\\s+/g,' ') + '=' + document.getElementById('ans').textContent")); pg.tap('#dOk'); pg.wait_for_timeout(900)
    pg.wait_for_timeout(500); R['11 错题宝箱出的题'] = qs; R['11 结算'] = pg.evaluate("document.getElementById('sumLit').textContent")
    pg.tap('#home'); pg.wait_for_timeout(500); R['11 宝箱角标'] = pg.evaluate("document.querySelector('#btnChest .n').textContent")
    # 12 木牌格数 = 技能数
    R['12 木牌格数 vs 技能数'] = pg.evaluate("window.__v4.ZONES.filter(z => z.lv).map(z => z.id + ':' + document.querySelectorAll('#props .sign')[window.__v4.ZONES.filter(q => q.lv).indexOf(z)].querySelectorAll('.row i').length)")
    pg.context.close()
    # 小屏：点击区、旗子挡按钮、竖屏
    pg, cdp = page(667, 375); pg.screenshot(path=str(out / 'r-667-first.png'))
    R['点击区 <44 的按钮'] = pg.evaluate("[...document.querySelectorAll('#world button')].filter(b => b.offsetParent && b.getBoundingClientRect().width > 0 && (b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44)).map(b => (b.id || b.textContent.trim()) + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height))")
    R['旗子和右上按钮重叠'] = pg.evaluate("(() => { const f = document.querySelector('.sign .flag'); if (!f) return 'no flag'; const a = f.getBoundingClientRect(), b = document.getElementById('topR').getBoundingClientRect(); return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom); })()")
    pg.evaluate("window.__v4.go(window.__v4.ZONES.find(z => z.id === 'bond'))"); pg.wait_for_timeout(2600); pg.screenshot(path=str(out / 'r-667-play.png'))
    R['练习页点击区 <44'] = pg.evaluate("[...document.querySelectorAll('#play button')].filter(b => b.getBoundingClientRect().height < 44).map(b => b.id || b.textContent.trim())")
    pg.set_viewport_size({'width': 375, 'height': 667}); pg.wait_for_timeout(300); pg.screenshot(path=str(out / 'r13-portrait.png'))
    R['13 竖屏提示'] = pg.evaluate("getComputedStyle(document.getElementById('turn')).display")
    pg.context.close(); b.close()
for k, v in R.items(): print(k, '→', json.dumps(v, ensure_ascii=False))
print('错误', errs)
