# 习惯记录和能力观察页（docs/说明书-习惯记录.md）：真实手写作答 → 有记录；6 种尺寸不溢出；题面页没有多出东西
# 用法：python3 tools/e2e/e2e12.py <项目根> <截图目录>
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    if not ok: fails.append(msg)
SIZES = [(956, 440), (932, 430), (852, 393), (844, 390), (812, 375), (667, 375)]
def parent(pg):
    bb = pg.locator('#gear').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(2200); pg.mouse.up(); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(300)
    # 校准
    pg.click('#btnStart')
    pg.wait_for_timeout(2200)
    if cur(pg) == 'calib':
        for d in range(10):
            for k in range(3): draw(pg, '#calPad', str(d)); pg.wait_for_timeout(1050)
        pg.wait_for_timeout(500)
    # 手写作答：先对后错
    n = 0; first = 0   # first：不是「再来一次」的手写题，书写记录应该正好这么多
    for i in range(60):
        c = cur(pg)
        if c == 'demo': pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(300); continue
        if c != 'qplay': pg.wait_for_timeout(300); continue
        st = qst(pg)
        if not st or st['phase'] != 'q': pg.wait_for_timeout(300); continue
        if st['input'] != 'write':
            answer(pg, st, True); pg.wait_for_timeout(1200); continue
        shot(pg, f'q-{n}')
        check(pg.locator('#qplay').get_by_text('书写评分').count() == 0, '做题页出现了书写评分')
        if not pg.evaluate("window.__sm.Q.x.retry"): first += 1
        answer(pg, st, n % 3 != 2); pg.wait_for_timeout(1500)
        if pg.locator('#qNext').is_visible(): pg.click('#qNext'); pg.wait_for_timeout(500)
        n += 1
        if n >= 6: break
    check(n >= 6, f'只手写了 {n} 题')
    rec = pg.evaluate("window.__sm.INK.recent || []"); check(len(rec) == first, f'最近写的字 {len(rec)} 条，应为 {first}')
    check(all(isinstance(x, int) for r in rec for x in r['s']), '评分不是数字')
    day = pg.evaluate("(() => { const S = window.__sm.S, k = Object.keys(S.stats).sort().pop(); return S.stats[k].h; })()")
    check(day and day['ia'] == first and day['in'] >= first and day['a'] >= first, f'每日记录不对 {day}，应为 {first}')
    # 把进度存盘后回到首页（长按结束练习）
    bb = pg.locator('#qQuit').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1300); pg.mouse.up(); pg.wait_for_timeout(500)
    if cur(pg) == 'qsum': pg.click('#qsHome'); pg.wait_for_timeout(400)
    # 秒答地图旧路径：熟题写错，失误保留加减号；重写不重复计数
    pg.click('.w-mini button[data-z="speed"]'); pg.wait_for_timeout(600); pg.click('#zGo'); pg.click('[data-series="add"]'); pg.wait_for_timeout(600)
    before = pg.evaluate("(() => { const S = window.__sm.S, k = Object.keys(S.stats).sort().pop(); return JSON.parse(JSON.stringify(S.stats[k].h)); })()")
    for i in range(3):
        q = pg.evaluate("(() => { const P = window.__sm.P, c = P.deck[P.i]; window.__sm.S.cards[c.id] = Object.assign(window.__sm.S.cards[c.id] || {seen: 0, d: []}, {lv: 2}); return c; })()")
        draw(pg, '#pad', str(q['ans'] + 1)); pg.wait_for_timeout(2200)
        if pg.evaluate("window.__sm.P && window.__sm.P.phase === 'confirm'"): pg.click('#cfA'); pg.wait_for_timeout(1500)
        if pg.locator('#btnNext').is_visible(): pg.click('#btnNext'); pg.wait_for_timeout(800)
    after = pg.evaluate("(() => { const S = window.__sm.S, k = Object.keys(S.stats).sort().pop(); return {h: S.stats[k].h, slips: S.slips || []}; })()")
    check(after['h'].get('ks', 0) - before.get('ks', 0) >= 2, f"旧路径失误没记上 {after['h']}")
    sp = [m for m in after['slips'] if m.get('uid', '').startswith('L') or m.get('op')]
    check(sp and all(m.get('op') == '+' for m in sp), f'旧路径丢了加号 {sp}')
    check(any('+' in pg.evaluate("m => window.__sm.R.mistLabel(m)", m) for m in sp), '错题标签没有加号')
    bb = pg.locator('#btnQuit').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1300); pg.mouse.up(); pg.wait_for_timeout(600)
    pg.evaluate("window.__sm.goIsland && window.__sm.goIsland()"); pg.reload(); pg.wait_for_timeout(500)
    # 注入一批数据，看满格时的版面
    pg.evaluate("""() => { const {S, INK, E} = window.__sm; const K = window.__sm.K; const id = K.SKILLS.find(s => s.nb && s.input === 'write').items[0].id;
      const inst = K.make(id, () => 0); const d = Object.keys(S.stats).sort().pop(); for (let i = 0; i < 35; i++) E.noteAnswer(S, d, inst, {ok: false, secs: 9}, true);
      while ((INK.recent || []).length < 24) INK.recent.push(INK.recent[0]); }""")
    parent(pg); check(pg.evaluate("!document.getElementById('parent').hidden"), '进不了家长区'); shot(pg, 'parent')
    check('熟题失误率' in pg.inner_text('#habInfo'), '家长区摘要缺失')
    pg.locator('#btnHabit').scroll_into_view_if_needed(); pg.click('#btnHabit'); pg.wait_for_timeout(300)
    check(pg.evaluate("!document.getElementById('habit').hidden"), '能力观察页没打开')
    body = pg.inner_text('#habBody')
    for w in ['熟题', '失误率', '书写评分', '免确认识别率', '文字题平均用时', '最近写的字', '最近失误的题', '「不会」占比']: check(w in body, f'缺 {w}')
    check(pg.locator('#habBody .hsk').count() == 24, f"字 {pg.locator('#habBody .hsk').count()} 个")
    check(pg.locator('#habBody .hsk polyline').count() >= 24, '笔画没画出来')
    check(pg.locator('#habBody .mq').count() == 30, f"失误题 {pg.locator('#habBody .mq').count()} 道")
    for w, h in SIZES:
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(200); shot(pg, f'habit-{w}x{h}')
        pg.evaluate("document.getElementById('habBody').scrollTop = 99999"); pg.wait_for_timeout(100); shot(pg, f'habit-{w}x{h}-end'); pg.evaluate("document.getElementById('habBody').scrollTop = 0")
        o = pg.evaluate("(() => { const e = document.getElementById('habBody'); return {sw: e.scrollWidth, cw: e.clientWidth, doc: document.documentElement.scrollWidth, win: innerWidth, bottom: e.getBoundingClientRect().bottom, wh: innerHeight}; })()")
        check(o['sw'] <= o['cw'] + 1 and o['doc'] <= o['win'] + 1 and o['bottom'] <= o['wh'] + 1, f'{w}x{h} 溢出 {o}')
    pg.set_viewport_size({'width': 844, 'height': 390})
    pg.click('#habBack'); pg.wait_for_timeout(200); check(pg.evaluate("!document.getElementById('parent').hidden"), '返回没回到家长区')
    b.close()
print('错误日志：', errs); print('不通过：', fails); print('手写题数', n)
sys.exit(1 if fails or errs else 0)
