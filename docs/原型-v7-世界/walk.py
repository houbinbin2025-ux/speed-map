# 原型走查：真实触屏点击走完「答题 → 挖矿 → 合成 → 拓地 → 到期 / 永久 → 图鉴点亮」，多尺寸查溢出、截图。
# 用法：python3 docs/原型-v7-世界/walk.py <截图目录>
import sys, pathlib
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent
url = (here / '世界.html').as_uri()
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/v7shots'); out.mkdir(parents=True, exist_ok=True)
fails, passed = [], []
def check(name, ok, info=''):
    (passed if ok else fails).append(name + (' · ' + str(info) if info != '' else ''))
    print(('通过 ' if ok else '失败 ') + name + (' · ' + str(info) if info != '' and not ok else ''))
SIZES = [(932, 430), (844, 390), (667, 375), (1180, 820), (1024, 768)]
def overflow(page):
    return page.evaluate("""() => { const bad = []; document.querySelectorAll('button, .card, #hud .res, .qtext, #qans, #hint').forEach(el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return; if (el.closest('.pbody, #bbar, .modal')) return; if (r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.top < -1) bad.push((el.id || el.className || el.tagName) + ':' + (el.textContent || '').slice(0, 12)); }); return bad.slice(0, 8); }""")
def small(page):
    return page.evaluate("""() => [...document.querySelectorAll('.page.on button, #rail button, .mact button')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.height < 44; }).map(b => b.textContent.slice(0, 8)).slice(0, 6)""")
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 932, 'height': 430}, has_touch=True, device_scale_factor=2)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    page.goto(url); page.wait_for_timeout(300)
    def touch(sel):
        page.locator(sel).first.tap(); page.wait_for_timeout(120)
    def tap(x, y):
        pos = page.evaluate(f"""() => {{ const c = document.getElementById('map').getBoundingClientRect(); const s = __plotPx(), cam = __cam(); return [c.left + c.width / 2 + cam.x + ({x}) * s, c.top + c.height / 2 + cam.y + ({y}) * s]; }}""")
        page.touchscreen.tap(pos[0], pos[1]); page.wait_for_timeout(420)
    def close_modal():
        if page.locator('#mw.on').count(): page.locator('#mact button').last.tap(); page.wait_for_timeout(120)
    def demo(k):
        touch('#demoBtn'); page.wait_for_timeout(320); page.locator(f"[data-d='{k}']").tap(); page.wait_for_timeout(150)
    def answer_all(limit=60):
        for _ in range(limit):
            if not page.evaluate("document.getElementById('pQ').classList.contains('on')"): return
            pick = page.evaluate("document.getElementById('qpick').style.display === 'flex'")
            a = page.evaluate("__curAns()")
            if a is None: page.wait_for_timeout(100); continue
            if pick: page.locator(f"#qpick button:text-is('{a}')").tap()
            else:
                for d in str(a): page.locator(f"#qright button:text-is('{d}')").tap()
            page.wait_for_timeout(470)
    page.screenshot(path=str(out / '01-首屏.png'))
    check('首屏主按钮可见', page.locator('#start').is_visible())
    tap(1, 0); check('探险前不能拓地', page.evaluate("!__G().W.plots['1,0']"))
    touch('#start'); check('进入答题页', page.evaluate("document.getElementById('pQ').classList.contains('on')"))
    page.screenshot(path=str(out / '02-答题.png'))
    # 答 3 题后刷新：不丢
    for _ in range(3):
        a = page.evaluate("__curAns()"); pick = page.evaluate("document.getElementById('qpick').style.display === 'flex'")
        if pick: page.locator(f"#qpick button:text-is('{a}')").tap()
        else:
            for d in str(a): page.locator(f"#qright button:text-is('{d}')").tap()
        page.wait_for_timeout(470)
    ore0 = page.evaluate("__G().W.bag.ore")
    page.reload(); page.wait_for_timeout(300)
    check('答到一半刷新，矿石还在', page.evaluate("__G().W.bag.ore") == ore0 and ore0 > 0, ore0)
    check('刷新后显示继续探险', '继续' in page.inner_text('#start'))
    touch('#start'); page.wait_for_timeout(100); answer_all()
    check('结算页出现', page.evaluate("document.getElementById('pEnd').classList.contains('on')"))
    page.screenshot(path=str(out / '03-结算.png'))
    for w, h in [(932, 430), (667, 375)]:
        page.set_viewport_size({'width': w, 'height': h}); page.wait_for_timeout(120)
        r = page.evaluate("document.getElementById('endGo').getBoundingClientRect().bottom")
        check(f'{w}×{h} 结算页出口在屏幕内', r <= h, r)
    page.set_viewport_size({'width': 932, 'height': 430}); page.wait_for_timeout(120)
    check('答对得矿石', page.evaluate("__G().W.bag.ore") >= 20)
    check('证明得铁锭', page.evaluate("__G().W.bag.iron") >= 1)
    touch('#endGo'); page.wait_for_timeout(200)
    check('提示：合成木镐', '木镐' in page.inner_text('#hint'), page.inner_text('#hint'))
    touch('#bWork'); check('工作台打开在工具标签', page.locator("[data-tool='pick0']").count() == 1)
    touch("[data-tool='pick0']"); check('合成木镐', page.evaluate("!!__G().W.tools.pick0"))
    page.screenshot(path=str(out / '04-工作台.png'))
    touch('#workBack'); page.wait_for_timeout(120)
    check('提示：插旗', '带旗' in page.inner_text('#hint'), page.inner_text('#hint'))
    page.screenshot(path=str(out / '05-地图-有旗.png'))
    flags = page.evaluate("__G().W.bag.flag")
    tap(1, 0)
    check('触屏点地块不穿透：弹窗还在', page.locator('#mw.on').count() == 1)
    check('拓地成功且是临时', page.evaluate("__G().W.plots['1,0'] && __G().W.plots['1,0'].st === 'temp'"))
    check('只花 1 面旗', page.evaluate("__G().W.bag.flag") == flags - 1)
    page.screenshot(path=str(out / '06-拓地.png'))
    page.wait_for_timeout(350); close_modal()
    hint = page.inner_text('#hint'); check('第一块地之后的提示可执行', ('工作台' in hint) or ('不够' in hint) or ('带旗' in hint) or ('已绑定' in hint), hint)
    # 拖地图不丢：拖很远后回家
    page.evaluate("""() => { const c = document.getElementById('map'); const r = c.getBoundingClientRect(); for (let k = 0; k < 6; k++) { c.dispatchEvent(new PointerEvent('pointerdown', {clientX: 100, clientY: 100, bubbles: true, pointerId: 1})); c.dispatchEvent(new PointerEvent('pointermove', {clientX: 900, clientY: 400, bubbles: true, pointerId: 1})); c.dispatchEvent(new PointerEvent('pointerup', {clientX: 900, clientY: 400, bubbles: true, pointerId: 1})); } }""")
    cam = page.evaluate("__cam()"); check('地图拖动有边界', abs(cam['x']) < 900 and abs(cam['y']) < 900, cam)
    touch('#bHome'); check('回家按钮复位', page.evaluate("__cam().x === 0 && __cam().y === 0"))
    # 给足材料，拓满
    page.evaluate("""() => { const C = __C, w = __G().W; C.gain(w, 'flag', 6); __ITEMS.slice(0, 30).forEach(i => { __G().seen[i.id] = 1; }); }""")
    for (x, y) in [(-1, 0), (0, 1), (0, -1), (1, 1)]:
        tap(x, y); page.wait_for_timeout(320); close_modal()
    t = page.evaluate("Object.values(__G().W.plots).filter(p => p.st === 'temp').length")
    check('临时地块最多 5 块', t == 5, t)
    fl = page.evaluate("__G().W.bag.flag"); tap(-1, 1)
    check('满 5 块后拓不了且不扣旗', page.evaluate("!__G().W.plots['-1,1']") and page.evaluate("__G().W.bag.flag") == fl)
    close_modal(); page.screenshot(path=str(out / '07-地图-临时地块.png'))
    tap(1, 0); page.wait_for_timeout(320); page.screenshot(path=str(out / '08-临时地块详情.png'))
    check('详情显示火把', page.locator('.torches').count() == 1)
    n = page.evaluate("__G().W.plots['1,0'].bound.length"); check('文案写实际题数', f'{n} 道题' in page.inner_text('#modal'), page.inner_text('#modal')[:60])
    page.locator("#mact button:text-is('建造')").tap(); page.wait_for_timeout(250)
    # 建造
    page.evaluate("""() => { const C = __C, w = __G().W; [['yellow', 20], ['purple', 12], ['water', 12], ['bridge', 2], ['lever', 1], ['paint', 1], ['trap', 1], ['plank', 8], ['door', 1]].forEach(([k, n]) => C.gain(w, 'b:' + k, n));
      const p = C.proofOf(w, 'c63'); p.s = 3; p.top = 3; p.cr = 1; p.last = __G().day; p.d3 = __G().day; w.bag.diamond += 1; w.total.diamond += 1; C.craftBlock(w, 'diamondb'); __renderBuild(); }""")
    page.wait_for_timeout(120)
    box = page.locator('#bcv').bounding_box(); cell = box['width'] / 8
    def bt(block, cells):
        page.locator(f"#bbar [data-b='{block}']").tap(); page.wait_for_timeout(40)
        for (i, j) in cells:
            page.touchscreen.tap(box['x'] + (i + .5) * cell, box['y'] + (j + .5) * cell); page.wait_for_timeout(30)
    bt('yellow', [(i, 1) for i in range(1, 7)] + [(1, j) for j in range(2, 6)] + [(6, j) for j in range(2, 6)])
    bt('purple', [(0, 0), (7, 0), (0, 7), (7, 7)])
    bt('water', [(i, 7) for i in range(1, 7)])
    bt('bridge', [(3, 6)]); bt('lever', [(2, 6)])
    bt('paint', [(3, 1 + 1)]); bt('trap', [(5, 4)])
    bt('diamondb', [(3, 3)])
    say = page.inner_text('#bsay'); check('放钻石块显示来源和日期', '来自' in say and '月' in say, say)
    page.touchscreen.tap(box['x'] + 2.5 * cell, box['y'] + 6.5 * cell); page.wait_for_timeout(60)
    check('拉杆收起吊桥', page.evaluate("Object.values(__G().W.built['1,0']).some(v => v.b === 'bridge' && v.up)"))
    page.screenshot(path=str(out / '09-建造.png'))
    bt('x', [(3, 3)]); check('拆除退回钻石块', page.evaluate("__G().W.blocks.diamondb") == 1)
    touch('#buildBack'); page.wait_for_timeout(150); page.screenshot(path=str(out / '10-地图-建筑缩略.png'))
    # 没来 14 天：火把一支不少
    before = page.evaluate("Object.values(__G().W.plots).filter(p => p.st === 'temp').map(p => p.torch)")
    demo('none,14')
    check('14 天没来火把不变', before == page.evaluate("Object.values(__G().W.plots).filter(p => p.st === 'temp').map(p => p.torch)"))
    # 连续全错：到期，盖的东西还在
    for i in range(14):
        demo('bad,1')
    wild = page.evaluate("Object.values(__G().W.plots).filter(p => p.st === 'wild').length")
    check('连续全错后地块被迷雾盖住', wild >= 1, wild)
    check('到期后建筑还在', page.evaluate("Object.keys(__G().W.built['1,0'] || {}).length") >= 10)
    page.screenshot(path=str(out / '11-地图-迷雾.png'))
    tap(1, 0); page.wait_for_timeout(320); page.screenshot(path=str(out / '12-迷雾详情.png')); close_modal()
    for i in range(4): demo('good,5')
    perm = page.evaluate("Object.values(__G().W.plots).filter(p => p.st === 'perm').length - 1")
    check('全对 20 天后有永久地块', perm >= 1, perm)
    check('迷雾地块免费回来', page.evaluate("__G().W.plots['1,0'].st") == 'perm', page.evaluate("__G().W.plots['1,0'].st"))
    page.screenshot(path=str(out / '13-地图-永久.png'))
    touch('#bBook'); page.screenshot(path=str(out / '14-图鉴-伙伴.png'))
    lit = page.locator('#bookGrid .card:not(.dark)').count(); dark = page.locator('#bookGrid .card.dark').count()
    check('图鉴同时有点亮和未点亮', lit > 0 and dark > 0, [lit, dark])
    page.locator("#bookGrid [data-pet]").first.tap(); page.wait_for_timeout(50); check('伙伴可以带上', page.evaluate("!!__G().pet"))
    page.locator("#bookTabs [data-t='role']").tap(); page.wait_for_timeout(50); page.screenshot(path=str(out / '15-图鉴-role.png'))
    for t in ['tool', 'skill', 'boss']:
        page.locator(f"#bookTabs [data-t='{t}']").tap(); page.wait_for_timeout(50); page.screenshot(path=str(out / f'15-图鉴-{t}.png'))
    touch('#bookBack')
    # Boss
    page.evaluate("""() => { const G = __G(), w = G.W; if (!w.tools.pick0) w.tools.pick0 = G.day; }""")
    demo('good,1'); page.wait_for_timeout(100)
    vis = page.locator('#bBoss').is_visible(); check('Boss 就绪时出现挑战按钮', vis)
    if vis:
        touch('#bBoss'); page.wait_for_timeout(320); check('挑战前先确认', page.locator('#mw.on').count() == 1)
        page.locator("#mact button:text-is('开始挑战')").tap(); page.wait_for_timeout(150); page.screenshot(path=str(out / '16-Boss.png'))
        for i in range(5):
            a = page.evaluate("__bossAns()")
            for d in str(a): page.locator(f"#bossPad button:text-is('{d}')").tap()
            page.wait_for_timeout(460)
        check('打败 Boss', page.evaluate("!!__G().W.boss.meadow")); page.screenshot(path=str(out / '17-Boss结束.png')); page.wait_for_timeout(320); close_modal()
    # 夜里只能看
    demo('dusk'); page.wait_for_timeout(350); page.screenshot(path=str(out / '18-天黑.png')); check('天黑弹窗', page.locator('#mw.on').count() == 1)
    page.locator('#mact button').first.tap(); page.wait_for_timeout(100)
    fr = page.evaluate("__C.frontier(__G().W, __itemsNow()).find(a => a.ok && !__G().W.plots[a.x + ',' + a.y])")
    n0 = page.evaluate("Object.keys(__G().W.plots).length"); page.evaluate("__C.gain(__G().W, 'flag', 1)")
    if fr: tap(fr['x'], fr['y'])
    check('夜里不能拓地', page.evaluate("Object.keys(__G().W.plots).length") == n0)
    # 刷新不丢
    v0 = page.evaluate("JSON.stringify(__G().W.plots)"); page.evaluate("localStorage.setItem('kongmath.v7proto3', JSON.stringify(__G()))")
    page.reload(); page.wait_for_timeout(200)
    check('刷新后进度还在', page.evaluate("JSON.stringify(__G().W.plots)") == v0)
    # 长题面在小屏不被切
    page.set_viewport_size({'width': 667, 'height': 375}); page.wait_for_timeout(120)
    demo('self'); page.wait_for_timeout(100); touch('#start'); page.wait_for_timeout(120)
    page.evaluate("document.getElementById('qtext').textContent = '7 点过 2 小时是几点'; document.getElementById('qright').style.display = 'grid'; document.getElementById('qtext').style.fontSize='48px'")
    page.evaluate("window.dispatchEvent(new Event('resize'))"); page.wait_for_timeout(120)
    r = page.evaluate("(() => { const a = document.getElementById('qtext').getBoundingClientRect(), b = document.getElementById('qright').getBoundingClientRect(); return [a.left, a.right, b.left]; })()")
    check('667×375 长题面不越界', r[0] >= 0 and r[1] <= r[2], r)
    page.screenshot(path=str(out / '19-小屏答题.png'))
    touch('#qpause'); page.wait_for_timeout(120)
    check('暂停后回地图可继续', '继续' in page.inner_text('#start'))
    # 多尺寸溢出、按钮大小
    for w, h in SIZES:
        page.set_viewport_size({'width': w, 'height': h}); page.wait_for_timeout(120)
        bad = overflow(page); check(f'{w}×{h} 地图不溢出', not bad, bad)
        sm = small(page); check(f'{w}×{h} 地图按钮 ≥ 44', not sm, sm)
        touch('#bWork'); bad = overflow(page); check(f'{w}×{h} 工作台不溢出', not bad, bad); sm = small(page); check(f'{w}×{h} 工作台按钮 ≥ 44', not sm, sm)
        touch('#workBack'); touch('#bBook'); bad = overflow(page); check(f'{w}×{h} 图鉴不溢出', not bad, bad); sm = small(page); check(f'{w}×{h} 图鉴按钮 ≥ 44', not sm, sm)
        touch('#bookBack')
        if w == 1180: page.screenshot(path=str(out / f'20-iPad-{w}.png'))
    b.close()
print(f'\n通过 {len(passed)}，失败 {len(fails)}，脚本错误 {len(errs)}')
for f in fails: print('失败：', f)
for e in errs[:10]: print('错误：', e)
sys.exit(1 if fails or errs else 0)
