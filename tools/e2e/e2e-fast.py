# 每道题的秒答时间（11-07 Ben：秒答才是习得）：不显示时间条；超时答对不算学会、不进错题宝箱；答对都有矿石（Ben：答对就要有）
# 用口答走（判定路径和手写同一个 resolve）；把作答起点往前拨来模拟「想了很久」，不用真等
# 用法：python3 tools/e2e/e2e-fast.py <项目根> <截图目录>
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    if not ok: fails.append(msg)
def toQ(pg):
    for i in range(40):
        c = cur(pg)
        if c == 'demo': pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(300); continue
        if c != 'qplay': return False
        st = qst(pg)
        if st and st['phase'] == 'q': return True
        pg.wait_for_timeout(250)
    return False
def oral(pg, late):
    if late: pg.evaluate("__sm.Q.t0 -= 120000; __sm.Q.shownAt -= 120000")
    pg.click('#qOral'); pg.wait_for_timeout(150); pg.click('#qOralNext'); pg.wait_for_timeout(200)
with sync_playwright() as p:
    b = __import__('quiet').launch(p); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(400)
    pg.evaluate("__sm.S.oral = true; document.body.classList.remove('write')")
    pg.evaluate("""(()=>{const {K,E,S}=__sm;K.SKILLS.forEach(s=>{if(s.id==='dockA')return;s.items.forEach(i=>{const q=E.prog(S,i.id);q.lv=1;q.d=['2026-09-01'];q.seen=1;});});})()""")
    pg.locator('.w-mini button[data-z="dock"]').scroll_into_view_if_needed(); pg.click('.w-mini button[data-z="dock"]'); pg.wait_for_timeout(500); pg.click('#zGo'); pg.wait_for_timeout(3000)
    check(toQ(pg), f'没进到题目页：{cur(pg)}')
    # 时间条已去掉（Ben 11-07：明面上的进度条让孩子紧张）：页面上不能有；计时照旧
    check(pg.evaluate("!document.getElementById('qFast') && !document.getElementById('pFast')"), '页面上不该有秒答时间条')
    shot(pg, 'nobar')
    # 慢：对了，但不算
    ore0 = pg.evaluate('__sm.Q.ore'); mist0 = pg.evaluate("Object.keys(__sm.S.mistakes).length")
    id0 = qst(pg)['id']; lv0 = pg.evaluate(f"__sm.E.lv(__sm.S, {json.dumps(id0)})")
    oral(pg, True)
    body = pg.inner_text('#qBody'); shot(pg, 'slow')
    check('对了' in body and '这次' in body and '秒内' in body, f'慢答提示不对：{body!r}')
    check(pg.evaluate('__sm.Q.ore') == ore0 + 1, '慢答也要有 1 块矿石')
    check(pg.evaluate("Object.keys(__sm.S.mistakes).length") == mist0, '慢答不该进错题宝箱')
    check(pg.evaluate(f"__sm.E.lv(__sm.S, {json.dumps(id0)})") == lv0, '慢答不该升级')
    pg.wait_for_timeout(1000)
    # 快：秒答，有矿石
    check(toQ(pg), f'慢答后没到下一题：{cur(pg)}')
    oral(pg, False)
    body = pg.inner_text('#qBody'); shot(pg, 'fast')
    check('秒答' in body, f'秒答提示不对：{body!r}')
    check(pg.evaluate('__sm.Q.ore') == ore0 + 2, '秒答应得 1 块矿石')
    fin = pg.evaluate("__sm.Q.fastN")
    check(fin == 1, f'本次秒答数应为 1，实际 {fin}')
    # 再看一次之类不算数的作答：不说秒答、不给矿石（走 resolve 的算数口径）
    pg.wait_for_timeout(1000); check(toQ(pg), f'秒答后没到下一题：{cur(pg)}')
    pg.evaluate("__sm.Q.peeked = true"); ore1 = pg.evaluate('__sm.Q.ore')
    oral(pg, False)
    body = pg.inner_text('#qBody')
    check('秒答' not in body, f'不算数的作答不该说秒答：{body!r}')
    check(pg.evaluate('__sm.Q.ore') == ore1 + 1, '答对就有矿石')
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
