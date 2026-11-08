# 捣蛋鬼第 1 轮 · B 模块修复的回归（docs/审查/捣蛋鬼台账.md）
# 第 10 条 数线题有「不会」、提示不压刻度 · 第 9 条 切后台回来竖式不清空 · 第 7 / 16 条 iPad App 尺寸讲解栏放得下、孩子的竖式留着
# 第 13 条 进位格只写「进位」· 第 14 条 竖屏提示说「屏幕」· 笔迹存档读坏先另存不覆盖
# 用法：python3 tools/e2e/e2e-b1.py <项目根> <截图目录>
import sys, json, pathlib
src = pathlib.Path(__file__).with_name('e2e-vert.py').read_text().split('\nwith sync_playwright()')[0]
exec(src)   # 复用 e2e-vert 的写数字、出题、hit() 等工具；root / out / url / seed / check / fails / errs 都从那里来
NODEMO = "localStorage.setItem('speedmap.test.vertdemo', JSON.stringify({add: 1, sub: 1, mul: 1, div: 1, law: 1}))"
def fresh(pg, extra=''):
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); {NODEMO}; {extra}"); pg.reload(); pg.wait_for_timeout(500)
def cur(pg): return pg.evaluate("[...document.querySelectorAll('.scr')].find(e => !e.hidden)?.id")
with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- 第 10 条：数线题（宽版）有「不会」，提示不压在刻度上 ----------
    for W, H in [(956, 440), (844, 390), (667, 375)]:
        pg = b.new_page(viewport={'width': W, 'height': H}); pg.on('pageerror', lambda e: errs.append(str(e)))
        fresh(pg); pg.evaluate("__sm.startQ('free', {group: 'line'})"); pg.wait_for_timeout(800)
        for _ in range(5):
            if cur(pg) != 'demo': break
            pg.wait_for_selector('#ack:not([disabled])', timeout=15000); pg.click('#ack'); pg.wait_for_timeout(500)
        check(pg.evaluate("__sm.Q.v.input") == 'line', f'{W}×{H} 出的是数线题')
        check(hit(pg, '#qDunno'), f'{W}×{H} 数线题「不会」看得见、点得到')
        over = pg.evaluate("""() => { const n = document.getElementById('qNote').getBoundingClientRect();
          return [...document.querySelectorAll('#lineBox .lab, #lineBox .ln')].some(l => { const r = l.getBoundingClientRect(); return r.left < n.right && n.left < r.right && r.top < n.bottom && n.top < r.bottom; }); }""")
        check(not over, f'{W}×{H} 提示文字不压在数线和刻度上')
        labs = pg.evaluate("[...document.querySelectorAll('#lineBox .lab')].every(l => l.getBoundingClientRect().bottom <= innerHeight + 6)")   # 667×375 改前就是 378（多 3 像素是行高留白，数字完整）
        check(labs, f'{W}×{H} 刻度 0 和最大数都在屏幕里')
        pg.screenshot(path=str(out / f'line-{W}.png'))
        pg.click('#qDunno'); pg.wait_for_timeout(600)
        check(pg.evaluate("__sm.Q.phase") == 'wait' and hit(pg, '#qNext'), f'{W}×{H} 点「不会」后停住，「继续」点得到')
        pg.click('#qNext'); pg.wait_for_timeout(600)
        check(pg.evaluate("__sm.Q && __sm.Q.phase") in ('q', None) or cur(pg) != 'qplay', f'{W}×{H} 点「继续」出下一题')
        pg.close()
    # ---------- 第 9 条：iPad 竖式写到一半切后台，回来格子和草稿都在，暂停的时间不算 ----------
    pg = b.new_page(viewport={'width': 1194, 'height': 834}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    fresh(pg); start(pg, ['speed:g12:mul2', 'speed:g10:add3'])
    c = pg.locator('.vcell'); write(pg, c.nth(c.count() - 1), 3); write(pg, c.nth(c.count() - 2), 2)
    s = pg.locator('.vstrip canvas').first.bounding_box(); pg.mouse.move(s['x'] + 20, s['y'] + 20); pg.mouse.down(); pg.mouse.move(s['x'] + 80, s['y'] + 40, steps=4); pg.mouse.up()
    before = pg.evaluate("__sm.Q.vc.cells().map(x => x.length)"); used0 = pg.evaluate("performance.now() - __sm.Q.t0")
    pg.evaluate("Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange'))")
    pg.wait_for_timeout(1500)
    pg.evaluate("Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange'))")
    pg.wait_for_timeout(200); check(pg.locator('#ovPause').is_visible(), '切回来先问「休息好了吗」')
    pg.click('#pauseGo'); pg.wait_for_timeout(300)
    after = pg.evaluate("__sm.Q.vc.cells().map(x => x.length)"); used1 = pg.evaluate("performance.now() - __sm.Q.t0")
    check(after == before and sum(after) >= 2, f'回来后答案格的笔画都在：{before} → {after}')
    check(pg.evaluate("__sm.Q.vc.touched()") and pg.evaluate("[...document.querySelectorAll('.vstrip canvas')].length") > 0, '草稿还在')
    check(used1 - used0 < 1200, f'暂停的 1.5 秒不算用时（多出 {used1 - used0:.0f} 毫秒）')
    check(pg.evaluate("__sm.Q.phase") == 'q' and hit(pg, '.vdone'), '回来接着写，「写好了」点得到')
    pg.screenshot(path=str(out / 'pause-back.png')); pg.close()
    # ---------- 第 7 / 16 条：iPad App（932×651）和 Safari，7 种竖式答错，讲解栏不用滑，孩子的竖式整个留在左边 ----------
    MEAS = """() => { const r = document.querySelector('.vres'), c = r.querySelector('.vresc'), card = document.querySelector('.vfit').getBoundingClientRect(), rr = r.getBoundingClientRect();
      const kids = [...c.querySelectorAll('*')].map(e => e.getBoundingClientRect()).filter(x => x.width);
      return {over: c.scrollHeight - c.clientHeight, clip: kids.some(x => x.bottom > rr.bottom + 1 || x.right > rr.right + 1), card: card.right <= rr.left + 1 && card.left >= 0, zoom: Number(c.querySelector('.vresi').style.zoom || 1)}; }"""
    for name, kw in [('App', {'viewport': {'width': 932, 'height': 651}, 'screen': {'width': 1194, 'height': 834}}), ('Safari', {'viewport': {'width': 1194, 'height': 834}})]:
        for en in [False, True]:
            pg = b.new_page(has_touch=True, **kw); pg.on('pageerror', lambda e: errs.append(str(e)))
            fresh(pg)
            if en: pg.evaluate("__sm.S.testDays = I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 0 : 1; __sm.S.settings.bilingual = true; I18N.set(I18N.isEn(__sm.S.settings, __sm.today()))")
            start(pg, IDS)
            for _ in IDS:
                q = inst(pg); c = pg.locator('.vcell'); write(pg, c.nth(c.count() - 1), (q['ans'] + 1) % 10)
                pg.click('.vdone'); pg.wait_for_timeout(600); m = pg.evaluate(MEAS); tag = f"{name}{' 英文' if en else ''} {q['id']}"
                check(m['over'] <= 0 and not m['clip'], f'{tag} 讲解栏不用滑就看全：{m}')
                check(m['zoom'] >= 0.6, f'{tag} 讲解栏缩放不小于 0.6：{m["zoom"]}')
                check(m['card'], f'{tag} 孩子写的竖式整个留在讲解栏左边')
                check(hit(pg, '.vres #qNext') and hit(pg, '.vres .vstep'), f'{tag} 「继续」「一步一步看」点得到')
                if name == 'App' and not en: pg.screenshot(path=str(out / f"app-{q['id'].replace(':', '_')}.png"))
                pg.click('.vres #qNext'); pg.wait_for_timeout(700)
            pg.close()
    # ---------- 第 13 条：加法竖式进位格只写「进位」 ----------
    pg = b.new_page(viewport={'width': 1194, 'height': 834}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    fresh(pg); start(pg, ['speed:g10:add3', 'speed:g10:sub3'])
    lab = pg.inner_text('.vcard .vlab'); check(lab.strip() == '进位', f'加法进位格的标签：{lab!r}')
    pg.click('.vdunno'); pg.wait_for_timeout(500); pg.click('.vres #qNext'); pg.wait_for_timeout(700)
    lab = pg.inner_text('.vcard .vlab'); check(lab.strip() == '退位', f'减法格子的标签：{lab!r}')
    pg.close()
    # ---------- 第 14 条：iPad 竖屏提示说「屏幕」 ----------
    pg = b.new_page(viewport={'width': 834, 'height': 1194}, screen={'width': 834, 'height': 1194}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    fresh(pg); t = pg.evaluate("[...document.querySelectorAll('#rotate, .w-turn')].filter(e => e.offsetParent || getComputedStyle(e).display !== 'none').map(e => e.innerText).join(' ')")
    check('屏幕横过来' in t and '手机' not in t, f'iPad 竖着拿的提示：{t.strip()[:30]!r}')
    pg.screenshot(path=str(out / 'ipad-portrait.png')); pg.close()
    # ---------- 笔迹存档读坏：先另存原值，不被空白覆盖 ----------
    pg = b.new_page(viewport={'width': 844, 'height': 390}); pg.on('pageerror', lambda e: errs.append(str(e)))
    fresh(pg, "localStorage.setItem('speedmap.ink.test', '{\"done\":true,\"templ')")
    keys = pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('speedmap.ink.test.broken.'))")
    check(len(keys) == 1 and pg.evaluate(f"localStorage.getItem({json.dumps(keys[0] if keys else '')})") == '{"done":true,"templ', f'坏的笔迹存档另存了一份：{keys}')
    pg.reload(); pg.wait_for_timeout(500)
    keys2 = pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('speedmap.ink.test.broken.'))")
    check(keys2 == keys, '同一份坏值再打开不重复另存')
    pg.close()
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
