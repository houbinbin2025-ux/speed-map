# 10-29 Ben 真机踩坑回归：答错没有「错」的提示、错题不进错题宝箱
# 今日练习连写错 6 题（都是还在学的灰格）→ 每题左边有「✗ 你写的是 X」、提示已放进错题宝箱、错题数 +1；
# 结算写「新进错题本 6 道」；错题宝箱里能看到这 6 道（标「明天」）
# 10-29 加：写错的题隔 3 题原题「再来一次」（题签带「再来一次」，同样的数）；再来一次写错不重复进错题本
# 用法：python3 tools/e2e/e2e4.py <项目根> <截图目录>
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)   # 借用 e2e2 的 url / seed / 笔画 / draw / cur / qst / answer，不跑它的主流程
N = 6; fails = []; firsts = []; retries = 0
def check(ok, msg):
    if not ok: fails.append(msg)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(300)
    pg.click('#btnStart'); pg.wait_for_timeout(2200)
    for d in range(10):
        for r in range(3): draw(pg, '#calPad', str(d)); pg.wait_for_timeout(1050)
    pg.wait_for_timeout(400)
    k = 0
    while k < N:
        c = cur(pg)
        if c == 'demo': pg.wait_for_timeout(3200); pg.click('#ack'); continue
        if c != 'qplay': fails.append('没进练习页：' + str(c)); break
        st = qst(pg)
        if not st or st['phase'] != 'q': pg.wait_for_timeout(300); continue
        rt = pg.evaluate("!!window.__sm.Q.x.retry")
        if rt:
            retries += 1; check('再来一次' in pg.inner_text('#qTag'), '再来一次的题签没写「再来一次」')
            check([st['id'], st['q']] in firsts, f"再来一次不是原题：{st['id']}")
        else: firsts.append([st['id'], st['q']])
        answer(pg, st, False); pg.wait_for_timeout(400)
        body, note = pg.inner_text('#qBody'), pg.inner_text('#qNote')
        nm = pg.evaluate("Object.keys(window.__sm.S.mistakes).length")
        if st['input'] == 'write': check('你写的是' in body, f'第 {k + 1} 题没显示「你写的是」：{body!r}')
        check('错题宝箱' in note, f'第 {k + 1} 题没提示放进错题宝箱：{note!r}')
        check(nm == len(firsts), f'第 {k + 1} 题后错题数 {nm}，应为 {len(firsts)}')
        shot(pg, f'w{k}' + ('-再来一次' if rt else '')); k += 0 if rt else 1
        pg.wait_for_function("() => { const Q = window.__sm.Q; return !Q || Q.phase === 'q' || Q.phase === 'demo'; }", timeout=8000)
    check(retries >= 1, '连错 6 题没有出现再来一次')
    btn = '#qQuit' if cur(pg) == 'qplay' else '#dQuit'
    bb = pg.locator(btn).bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(500)
    shot(pg, 'sum'); check(f'新进错题本 {N} 道' in pg.inner_text('#qsum'), '结算没写新进错题本 6 道')
    pg.click('#qsHome'); pg.wait_for_timeout(500); pg.click('#btnMist'); pg.wait_for_timeout(400); shot(pg, 'mist')
    check(pg.locator('#mist .mq.later').count() == N, f"错题宝箱里复习中的题 {pg.locator('#mist .mq.later').count()} 道")
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
