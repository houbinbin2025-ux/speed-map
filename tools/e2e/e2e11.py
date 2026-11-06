# 15 级难度（说明书-难度分级）：家长区真实点选 → 今日练习、练这一块、秒答地图只出选中的级；各种新题面截图；改回自动；刷新后还在
# 用法：python3 tools/e2e/e2e11.py <项目根> <截图目录> [宽 高]
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    if not ok: fails.append(msg)
W = int(sys.argv[3]) if len(sys.argv) > 3 else 844; H = int(sys.argv[4]) if len(sys.argv) > 4 else 390
LV = "(()=>{const Q=__sm.Q;return Q&&Q.x&&Q.x.kind==='q'?__sm.K.levelOf(Q.x.inst):null})()"
def parent(pg):
    bb = pg.locator('#gear').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(2200); pg.mouse.up(); pg.wait_for_timeout(300)
def choose(pg, lvs):
    parent(pg)
    pg.locator('#lvBoxes [data-lv="0"]').scroll_into_view_if_needed(); pg.click('#lvBoxes [data-lv="0"]')
    for n in lvs: pg.locator(f'#lvBoxes [data-lv="{n}"]').scroll_into_view_if_needed(); pg.click(f'#lvBoxes [data-lv="{n}"]')
    pg.wait_for_timeout(100); pg.evaluate("document.getElementById('parBack').click()"); pg.wait_for_timeout(400)
def play_some(pg, want, n, name):
    seen = 0
    for i in range(n * 8):
        c = cur(pg)
        if c == 'demo': shot(pg, f'demo-{name}'); pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(300); continue
        if c != 'qplay': break
        st = qst(pg)
        if not st or st['phase'] != 'q': pg.wait_for_timeout(250); continue
        L = pg.evaluate(LV); check(L in want, f'{name} 出了第 {L} 级：{st["id"]}'); shot(pg, f'q-{name}-{st["id"].replace(":", "_").replace("|", "_")}')
        o = pg.evaluate("(()=>{const e=document.getElementById('qBody');return e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2})()"); check(not o, st['id'] + ' 题面溢出')
        if st['input'] == 'pick': pg.wait_for_function('__sm.Q && __sm.Q.pickOpen', timeout=4000); pg.wait_for_timeout(600); pg.locator(f'.pickcard[data-n="{st["ans"]}"]').first.click()
        elif st['input'] == 'line': pg.evaluate("__sm.Q.val=__sm.Q.x.inst.ans; __sm.Q.phase"); bb = pg.locator('#lineBox').bounding_box(); x = bb['x'] + bb['width'] * st['ans'] / st['q']['max']; pg.mouse.click(x, bb['y'] + 122); pg.wait_for_timeout(1400)
        else: pg.wait_for_timeout(600); pg.click('#qOral'); pg.wait_for_timeout(600); pg.click('#qOralNext')
        pg.wait_for_timeout(950); seen += 1
        if seen >= n: break
    check(seen >= min(n, 3), f'{name} 只练了 {seen} 题')
def quit_home(pg):
    if cur(pg) in ('qplay', 'demo'):
        bb = pg.locator('#qQuit' if cur(pg) == 'qplay' else '#dQuit').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(500)
    if cur(pg) == 'qsum': pg.click('#qsHome'); pg.wait_for_timeout(400)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(400)
    pg.evaluate("__sm.S.oral = true; document.body.classList.remove('write')")
    # 家长区：默认自动，15 个按钮 + 自动都在
    parent(pg); check(pg.locator('#lvBoxes button').count() == 16, '难度按钮不是 16 个'); check('on' in pg.get_attribute('#lvBoxes [data-lv="0"]', 'class'), '默认不是自动'); pg.locator('#lvBoxes').scroll_into_view_if_needed(); shot(pg, 'a-levels')
    bb = pg.locator('#lvBoxes [data-lv="15"]').bounding_box(); check(bb['width'] >= 80, f'按钮太窄 {bb}'); pg.evaluate("document.getElementById('parBack').click()"); pg.wait_for_timeout(300)
    # 手选一级：今日练习只出这一级（覆盖三类新题）
    for lv, name in [(6, 'L6'), (10, 'L10'), (15, 'L15')]:
        choose(pg, [lv]); pg.click('#btnStart'); pg.wait_for_timeout(2600); play_some(pg, [lv], 8, name); quit_home(pg); pg.evaluate("__sm.S.daily=null;__sm.S.stats={}")
    # 手选多级 + 练这一块；没有题的地块
    choose(pg, [2, 8]); check(pg.evaluate("__sm.S.settings.levels.join()") == '2,8', '多选没存')
    pg.locator('.w-mini button[data-z="place"]').scroll_into_view_if_needed(); pg.click('.w-mini button[data-z="place"]'); pg.wait_for_timeout(500); check(pg.inner_text('#zGo') == '练这一块', '数位第 8 级有题'); pg.click('#zGo'); pg.wait_for_timeout(3000); play_some(pg, [2, 8], 4, 'zone'); quit_home(pg)
    pg.click('.w-mini button[data-z="look"]'); pg.wait_for_timeout(500); check(pg.inner_text('#zGo') == '这个难度没有题' and pg.is_disabled('#zGo'), '看数应显示这个难度没有题：' + pg.inner_text('#zGo')); shot(pg, 'b-empty'); pg.click('#zX'); pg.wait_for_timeout(200)
    # 秒答地图：选第 6 级，只出两位数加减一位数和整十
    choose(pg, [6]); pg.click('.w-mini button[data-z="speed"]'); pg.wait_for_timeout(500); pg.click('#zGo'); pg.wait_for_timeout(400); pg.click('.lvtab[data-level="2"]'); pg.wait_for_timeout(300); pg.click('[data-series="add"]'); pg.wait_for_timeout(800)
    ids = pg.evaluate("[...new Set(__sm.P.deck.map(c=>c.id))]"); check(ids and all(i.split(':')[1] in ('add10', 'addT', 'add1n', 'add1c') for i in ids), '秒答地图第 6 级出了 ' + str(ids))
    pg.evaluate(f"localStorage.setItem('speedmap.v2.test', JSON.stringify(__sm.S))"); pg.goto(url); pg.reload(); pg.wait_for_timeout(500); check(pg.evaluate("__sm.S.settings.levels.join()") == '6', '刷新后难度丢了'); check(pg.evaluate("__sm.S.settings.levelsV") == 2, '没写级别版本')
    pg.evaluate("__sm.S.oral = true")
    # 改回自动
    choose(pg, []); check(pg.evaluate("__sm.E.chosen(__sm.S)") is None, '改回自动失败')
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
