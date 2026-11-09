# 2b-2 一题几个空（B 方案 §6）：手机写字板一格一格写——停笔填进当前格、跳下一格；点格回去重写；一格写多了提示；
# 两格都对才对；写错显示「你写的是 3 余 2」、描红分格印「余」「又」；英文日；口答「答案是」。MULTI_CELL 在页面加载前打开。
# 用法：python3 tools/e2e/e2e-cells.py <项目根> <截图目录> [宽 高 [app]]；iPad Safari 1194 834，iPad App 932 651 app
import sys, json, pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    print(('ok  ' if ok else '不通过'), msg)
    if not ok: fails.append(msg)
W = int(sys.argv[3]) if len(sys.argv) > 3 else 844; H = int(sys.argv[4]) if len(sys.argv) > 4 else 390
APP = len(sys.argv) > 5 and sys.argv[5] == 'app'   # iPad App：网页按 932 宽缩放，屏幕 1194×834
IPAD = H >= 700 or APP; KW = {'screen': {'width': 1194, 'height': 834}} if APP else {}
ON = "window.process = {env: {MULTI_CELL: '1'}};"   # 网页里没有 process：走查时在脚本加载前打开 2b-2
INKSET = """() => { const I = window.INK, INKS = window.__sm.INK;
  Object.keys(I.STD).forEach(d => I.STD[d].forEach(form => I.addTemplate(INKS, d, form.map(st => { const o = []; for (let i = 0; i + 1 < st.length; i++) for (let k = 0; k < 8; k++) { const t = k / 8; o.push({x: (st[i][0] + t * (st[i + 1][0] - st[i][0])) * 100, y: (st[i][1] + t * (st[i + 1][1] - st[i][1])) * 100, t: 0}); } const z = st[st.length - 1]; o.push({x: z[0] * 100, y: z[1] * 100, t: 0}); return o; }))));
  INKS.done = true; INKS.speed = 900; }"""
START = """([id, k]) => { const {K} = window.__sm; const x = K.rawPool(id)[k];
  const list = [{kind: 'q', seg: 'new', inst: {id, q: x.q, ans: x.ans}}];
  window.__sm.startQ('free', {sess: {next: () => list.shift() || null, answer: () => undefined}, group: K.BY[K.ITEM[id].skill].group}); return {q: x.q, ans: x.ans}; }"""
boxes = lambda pg: pg.evaluate("[...document.querySelectorAll('#qBody .box')].map(b => ({t: b.textContent, cur: b.classList.contains('cur')}))")
phase = lambda pg: pg.evaluate("__sm.Q && __sm.Q.phase")
def write1(pg, d): draw(pg, '#qPad', str(d)); pg.wait_for_timeout(1500)
def begin(pg, id, k):
    x = pg.evaluate(START, [id, k]); pg.wait_for_timeout(500)
    for _ in range(4):   # 讲解卡（第一次见这个概念）：点完
        if not pg.is_visible('#ack'): break
        pg.wait_for_function("!document.getElementById('ack').disabled", timeout=6000); pg.click('#ack'); pg.wait_for_timeout(300)
    pg.wait_for_function("__sm.Q && __sm.Q.phase === 'q'", timeout=5000); pg.wait_for_timeout(300); return x
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for en in (False, True):
        L = 'en' if en else 'zh'
        pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True, **KW); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script(ON)
        pg.goto(url); pg.evaluate("en => { localStorage.clear(); localStorage.setItem('speedmap.v2.test', JSON.stringify({v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, settings: {bilingual: en, levels: [10, 15], levelsV: 2}, testDays: en && !I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 1 : 0})); }", en)
        pg.reload(); pg.wait_for_timeout(600); pg.evaluate(INKSET)
        check(pg.evaluate("__sm.K.MULTI_CELL && !!__sm.K.ITEM['speed:g10:divrem2']"), f'{L} 打开 MULTI_CELL 后题型登记了')
        for id in ['speed:g10:divrem2', 'speed:g15:mixed']:
            nm = id.split(':')[-1]; SEP = ('R' if 'divrem' in id else 'and') if en else ('余' if 'divrem' in id else '又')
            if IPAD:   # iPad（屏幕短边 ≥ 700）：蓝框按 cells 分组，组之间印字；点「写好了」才判
                x = begin(pg, id, 2); a = str(x['ans']); g = pg.evaluate("__sm.Q.v.vp.groups")
                n = pg.locator('.vcell').count(); seps = pg.evaluate("[...document.querySelectorAll('.vsep')].map(e => e.textContent)")
                check(g == [2, 2] and n == 4 and SEP in seps, f'{L} {id} 蓝框两组各 2 格、组间印「{SEP}」：{g} {n} {seps}')
                pg.screenshot(path=str(out / f'{L}-{W}-{nm}-iPad-1-开始.png'))
                draw(pg, '.vcell >> nth=1', a[0]); pg.wait_for_timeout(200); pg.click('.vdone'); pg.wait_for_timeout(300)
                check(phase(pg) == 'q' and ('没写' in pg.inner_text('.vnote') or en), f'{L} {id} 空一组：提示不判（{pg.inner_text(".vnote")}）')
                draw(pg, '.vcell >> nth=3', a[1]); pg.wait_for_timeout(200); pg.click('.vdone'); pg.wait_for_timeout(500)
                check(phase(pg) != 'q' and pg.locator('.vcell.ok').count() > 0, f'{L} {id} 两组写对判对')
                pg.screenshot(path=str(out / f'{L}-{W}-{nm}-iPad-2-答对.png')); pg.wait_for_timeout(1800)
                x = begin(pg, id, 4); a = str(x['ans']); wr = (int(a[1]) % 9) + 1
                draw(pg, '.vcell >> nth=0', a[0]); pg.wait_for_timeout(150); draw(pg, '.vcell >> nth=2', str(wr)); pg.wait_for_timeout(150); pg.click('.vdone'); pg.wait_for_timeout(700)
                body = pg.inner_text('#qplay'); tw = a[0] + f' {SEP} ' + str(wr)
                check(phase(pg) != 'q' and tw in body, f'{L} {id} 组内靠左写、第 2 组错：判错，显示「{tw}」')
                mk = pg.evaluate("[...document.querySelectorAll('.vcell')].map(c => c.classList.contains('ok') ? 'o' : c.classList.contains('bad') ? 'x' : '-').join('')")
                check(mk == 'ooxx', f'{L} {id} 第 1 组标绿、第 2 组标红：{mk}')
                pg.screenshot(path=str(out / f'{L}-{W}-{nm}-iPad-3-写错.png'))
                pg.evaluate("window.__sm.Q && (window.__sm.Q.sess = {next: () => null, answer: () => undefined})"); continue
            # 1 两格都写对：第 1 格写完跳到第 2 格，写完才判
            x = begin(pg, id, 2); a = str(x['ans'])
            bx = boxes(pg); check(len(bx) == 2 and bx[0]['cur'] and not bx[1]['cur'], f'{L} {id} 两个格，当前在第 1 格 {bx}')
            if not en: check('一格一格写' in pg.inner_text('#qNote'), f'{L} {id} 提示一格一格写')
            pg.screenshot(path=str(out / f'{L}-{W}-{nm}-1-开始.png'))
            write1(pg, a[0]); bx = boxes(pg)
            check(bx[0]['t'] == a[0] and bx[1]['cur'] and phase(pg) == 'q', f'{L} {id} 第 1 格填 {a[0]}、跳到第 2 格、还没判 {bx}')
            pg.screenshot(path=str(out / f'{L}-{W}-{nm}-2-第一格.png'))
            write1(pg, a[1]); pg.wait_for_timeout(300)
            check(phase(pg) != 'q' and pg.evaluate("!!document.querySelector('#qBody .okbig')"), f'{L} {id} 两格写完判对')
            line = pg.inner_text('#qBody'); check(f' {SEP} ' in line and a[0] in line, f'{L} {id} 答对整式按格显示：{line[-30:]!r}')
            pg.screenshot(path=str(out / f'{L}-{W}-{nm}-3-答对.png')); pg.wait_for_timeout(1800)
            # 2 点格回去重写：第 1 格写错，点第 1 格重写
            x = begin(pg, id, 3); a = str(x['ans']); wrong = (int(a[0]) % 9) + 1
            write1(pg, wrong); pg.locator('#qBody .box').nth(0).click(); pg.wait_for_timeout(300); bx = boxes(pg)
            check(bx[0]['cur'] and bx[0]['t'] == '', f'{L} {id} 点第 1 格回去重写，格清空 {bx}')
            write1(pg, a[0]); write1(pg, a[1]); pg.wait_for_timeout(300)
            check(pg.evaluate("!!document.querySelector('#qBody .okbig')"), f'{L} {id} 改对后判对'); pg.wait_for_timeout(1800)
            # 3 一格写了两位：提示，不填
            x = begin(pg, id, 4); a = str(x['ans'])
            draw(pg, '#qPad', '23'); pg.wait_for_timeout(1500); bx = boxes(pg)
            check(bx[0]['t'] == '' and bx[0]['cur'] and phase(pg) == 'q', f'{L} {id} 一格写两位不填 {bx}')
            if not en: check('写多了' in pg.inner_text('#qFootNote'), f'{L} {id} 提示写多了')
            # 4 写错：第 2 格错 → 你写的是「x 余 y」，描红分格
            write1(pg, a[0]); wr = (int(a[1]) % 9) + 1; write1(pg, wr); pg.wait_for_timeout(400)
            body = pg.inner_text('#qBody'); tw = a[0] + f' {SEP} ' + str(wr)
            check(phase(pg) != 'q' and tw in body, f'{L} {id} 写错显示「你写的是 {tw}」：{body[:40]!r}')
            gh = pg.evaluate("document.getElementById('qGhost').innerText + '|' + (document.querySelector('#qGhost svg') || {}).getAttribute('aria-label')")
            check(SEP in gh and ('余' not in gh and '又' not in gh if en else True), f'{L} {id} 描红分格印字：{gh}')
            pg.screenshot(path=str(out / f'{L}-{W}-{nm}-4-写错描红.png'))
            pg.evaluate("window.__sm.Q && (window.__sm.Q.sess = {next: () => null, answer: () => undefined})")
        pg.close()
    if IPAD: b.close(); print('错误', errs or '无'); print('不通过', fails or '无'); sys.exit(1 if fails or errs else 0)
    # 口答：答案是「3 余 2」
    pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True, **KW); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(ON); pg.goto(url)
    pg.evaluate("localStorage.clear(); localStorage.setItem('speedmap.v2.test', JSON.stringify({v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, oral: true, settings: {bilingual: false, levels: [10], levelsV: 2}}))")
    pg.reload(); pg.wait_for_timeout(600); pg.evaluate("__sm.S.oral = true")
    x = begin(pg, 'speed:g10:divrem2', 5); pg.click('#qOral'); pg.wait_for_timeout(300)
    t = pg.inner_text('#qOral'); a = str(x['ans']); check(t.endswith(f'{a[0]} 余 {a[1]}'), f'口答：{t}')
    pg.close(); b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
