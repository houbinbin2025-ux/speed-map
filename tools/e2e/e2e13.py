# 第二批 2a（docs/说明书-到四年级第二批.md）：家长区手选第 8、9 级 → 今日练习真点讲解卡（连点、右滑和短按的提示、切后台回来停在同一页、每天最多 2 张）、
# 线段图 / 条形图 / 长方形题面和答错图解不溢出；手选第 12、14 级 → 选择题点错看讲解、点对；讲解卡后前 5 题有记录
# 用法：python3 tools/e2e/e2e13.py <项目根> <截图目录> [宽 高]
import pathlib
PIN = lambda pg: ([pg.click(f'#pinPad [data-k="{d}"]') for d in '123456'], pg.wait_for_timeout(200)) if pg.is_visible('#pinOv') else None   # 家长区密码（v2/lock.js），走查统一用这个输
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    if not ok: fails.append(msg); print('不通过', msg)
W = int(sys.argv[3]) if len(sys.argv) > 3 else 844; H = int(sys.argv[4]) if len(sys.argv) > 4 else 390
TAG = f'{W}x{H}'
def parent(pg):
    bb = pg.locator('#gear').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(2200); pg.mouse.up(); pg.wait_for_timeout(300); PIN(pg)
def choose(pg, lvs):
    parent(pg)
    pg.locator('#lvBoxes [data-lv="0"]').scroll_into_view_if_needed(); pg.click('#lvBoxes [data-lv="0"]')
    for n in lvs: pg.locator(f'#lvBoxes [data-lv="{n}"]').scroll_into_view_if_needed(); pg.click(f'#lvBoxes [data-lv="{n}"]')
    pg.wait_for_timeout(100); pg.evaluate("document.getElementById('parBack').click()"); pg.wait_for_timeout(400)
OVER = """(id => { const e = document.getElementById(id), vw = innerWidth, vh = innerHeight, bad = [];
  if (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2) bad.push(id + ' 内容超出');
  e.querySelectorAll('svg.fig2, .nbsay, .eq, .nrows').forEach(x => { const b = x.getBoundingClientRect(); if (b.width && (b.right > vw + 1 || b.bottom > vh + 1 || b.height < 40)) bad.push(x.className.baseVal || x.className); });
  return bad; })"""
FIGQ = "(()=>{const Q=__sm.Q;return Q&&Q.x&&Q.x.kind==='q'&&Q.x.inst.q?Q.x.inst.q.view:null})()"
def card_checks(pg, cards):
    c = pg.evaluate('__sm.Q.card && __sm.Q.card.c'); n = pg.evaluate('__sm.Q.card.n'); cards.append(c)
    check(pg.is_disabled('#ack'), f'{TAG} {c} 讲解卡第一页「下一步」先灰 0.8 秒')
    pg.wait_for_timeout(900); pg.click('#ack'); pg.click('#ack', force=True); pg.wait_for_timeout(200)
    check(pg.evaluate('__sm.Q.card.p') == 1, f'{TAG} {c} 连点只翻一页')
    pg.evaluate('history.back()'); pg.wait_for_timeout(300); check(pg.is_visible('#dQuitHint') and cur(pg) == 'demo', f'{TAG} {c} 右滑在讲解卡上显示「长按结束」提示，不离开')
    pg.wait_for_timeout(1600)
    bb = pg.locator('#dQuit').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(150); pg.mouse.up(); pg.wait_for_timeout(100)
    check(pg.is_visible('#dQuitHint'), f'{TAG} {c} 短按长按按钮显示提示'); check(cur(pg) == 'demo', f'{TAG} {c} 短按不结束')
    # 切后台再回来：停在同一页
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(200)
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(300)
    if pg.is_visible('#pauseGo'): pg.click('#pauseGo'); pg.wait_for_timeout(300)
    check(cur(pg) == 'demo' and pg.evaluate('__sm.Q.card && __sm.Q.card.p') == 1, f'{TAG} {c} 切后台回来停在第 2 页')
    for p in range(1, n):
        bad = pg.evaluate(OVER, 'demoBox'); check(not bad, f'{TAG} 讲解卡 {c} 第 {p + 1} 页 {bad}'); shot(pg, f'{W}-card-{c}-{p + 1}', True)
        pg.wait_for_timeout(900); pg.click('#ack'); pg.wait_for_timeout(200)
    check(cur(pg) == 'qplay', f'{TAG} {c} 「试一试」进第一题')
def play(pg, n, name, wrong_first=True, until=None):
    seen, wrong_done, cards, views = 0, not wrong_first, [], set()
    for i in range(n * 10):
        c = cur(pg)
        if c == 'demo':
            if pg.evaluate('!!(__sm.Q && __sm.Q.card)'): card_checks(pg, cards)
            else: pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(300)
            continue
        if c != 'qplay': break
        st = qst(pg)
        if not st or st['phase'] != 'q': pg.wait_for_timeout(250); continue
        v = pg.evaluate(FIGQ)
        if v in ('bar', 'chart', 'rect', 'choice'):
            views.add(v); bad = pg.evaluate(OVER, 'qBody'); check(not bad, f'{TAG} {st["id"]} 题面 {bad}'); shot(pg, f'{W}-q-{st["id"].replace(":", "_")}')
        if st['input'] == 'pick':
            pg.wait_for_function('__sm.Q && __sm.Q.pickOpen', timeout=4000); pg.wait_for_timeout(300)
            if v == 'choice' and not wrong_done:
                k = next(i for i in range(3) if i != st['ans']); pg.locator(f'.pickcard[data-n="{k}"]').first.click(); pg.wait_for_timeout(500); wrong_done = True
                check(pg.is_visible('#qNext'), f'{TAG} 选择题点错停住'); t = pg.inner_text('#qWide'); check(st['q']['opts'][st['ans']] in t, f'{TAG} 选择题讲解里有正确答案')
                bad = pg.evaluate(OVER, 'qWide'); check(not bad, f'{TAG} 选择题图解 {bad}'); shot(pg, f'{W}-explain-choice', True); pg.wait_for_timeout(600); pg.click('#qNext'); pg.wait_for_timeout(500)
            else: pg.locator(f'.pickcard[data-n="{st["ans"]}"]').first.click(); pg.wait_for_timeout(1000)
        elif st['input'] == 'line':   # 第 8 级的旧数线题（同 e2e11）
            ln0 = pg.locator('#lineBox .ln').bounding_box(); check(ln0 and ln0['y'] + ln0['height'] <= H, f'{TAG} 数线在屏幕外（y={ln0 and ln0["y"]}），孩子插不了旗子')
            pg.evaluate("__sm.Q.val=__sm.Q.x.inst.ans"); bb = pg.locator('#lineBox').bounding_box(); ln = pg.locator('#lineBox .ln').bounding_box(); x = bb['x'] + bb['width'] * st['ans'] / st['q']['max']; pg.mouse.click(x, ln['y'] + ln['height'] / 2); pg.wait_for_timeout(1400)   # 按数线实际位置点（矮屏上数线位置不同）
        else:
            pg.wait_for_timeout(400)
            for k in range(3):
                pg.click('#qOral'); pg.wait_for_timeout(400)
                if pg.is_visible('#qOralNext'): break
            check(pg.is_visible('#qOralNext'), f'{TAG} {st["id"]} 口答看答案没反应')
            if v in ('bar', 'chart', 'rect') and not wrong_done:
                pg.wait_for_timeout(600); pg.click('#qOralWrong'); pg.wait_for_timeout(600); pg.click('#qOralNext'); pg.wait_for_timeout(500); wrong_done = True
                bad = pg.evaluate(OVER, 'qBody'); check(not bad, f'{TAG} {st["id"]} 答错图解 {bad}'); shot(pg, f'{W}-explain-{v}', True)
                if pg.is_visible('#qNext'): pg.wait_for_timeout(600); pg.click('#qNext'); pg.wait_for_timeout(400)
            else: pg.wait_for_timeout(600); pg.click('#qOralNext'); pg.wait_for_timeout(900)
        seen += 1
        if seen >= n or (until and until in views and wrong_done): break
    return seen, cards, views
def quit_home(pg):
    if cur(pg) in ('qplay', 'demo'):
        bb = pg.locator('#qQuit' if cur(pg) == 'qplay' else '#dQuit').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(500)
    if pg.is_visible('#ovQuit') if pg.locator('#ovQuit').count() else False: pg.click('#ovQuit button.go')
    if cur(pg) == 'qsum': pg.click('#qsHome'); pg.wait_for_timeout(400)
with sync_playwright() as p:
    b = __import__('quiet').launch(p); pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(400)
    pg.evaluate("__sm.S.oral = true; document.body.classList.remove('write')")
    choose(pg, [8, 9]); pg.click('#btnStart'); pg.wait_for_timeout(2600)
    seen, cards, views = play(pg, 70, 'L89')
    check(len(cards) == 2 and len(set(cards)) == 2, f'{TAG} 今天出了 {cards} 张讲解卡（应该正好 2 张）')
    check({'bar', 'chart', 'rect'} & views, f'{TAG} 没碰到新题面 {views}')
    st = pg.evaluate('__sm.S.introStat'); check(st and all(c in st and st[c][0] >= 1 for c in cards), f'{TAG} 讲解卡后记录 {st}')
    quit_home(pg); pg.evaluate("__sm.S.daily=null; __sm.S.testDays = (__sm.S.testDays || 0) + 1")   # 今天讲解卡已满 2 张，小数要明天才出：日期往后拨一天
    choose(pg, [12, 14]); pg.click('#btnStart'); pg.wait_for_timeout(2600)
    seen2, cards2, views2 = play(pg, 120, 'L1214', until='choice')   # 第 12、14 级题型多，练到碰到选择题为止
    check('choice' in views2, f'{TAG} 第 12、14 级没出选择题 {views2}')
    quit_home(pg); choose(pg, [])
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
