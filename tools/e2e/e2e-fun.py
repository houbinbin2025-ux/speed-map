# 第三批 3a 趣味题（docs/说明书-第三批.md §四）：11 个题型真点一遍——讲解卡逐页（植树、锯木头、三种种法、倒着算）、题面、
# 手写答对、点「不会」看讲解（讲解里有答案）、选择题点错再看讲解；中文和英文日；不溢出、无报错。排课规则（90 秒、隔 5 道）是 B 的，另测
# 用法：python3 tools/e2e/e2e-fun.py <项目根> <截图目录> [宽 高]
import pathlib, re
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    if not ok: fails.append(msg); print('不通过', msg)
W = int(sys.argv[3]) if len(sys.argv) > 3 else 844; H = int(sys.argv[4]) if len(sys.argv) > 4 else 390
IDS = ['garden:g4:pyr', 'garden:g7:pyr2', 'garden:g7:magic', 'dock:g5:tree', 'dock:g5:saw', 'dock:g7:tree2', 'dock:g9:tree3', 'dock:g5:order', 'dock:g7:riddle', 'dock:g9:riddle2', 'dock:g7:cipher']
START = """([id, k, card]) => { const {K} = window.__sm; const x = K.rawPool(id)[k], sk = K.ITEM[id].skill;
  const list = (card && K.BY[sk].concept ? [{kind: 'demo', concept: K.BY[sk].concept, skill: sk}] : []).concat([{kind: 'q', seg: 'new', inst: {id, q: x.q, ans: x.ans}}]);
  window.__sm.startQ('free', {sess: {next: () => list.shift() || null, answer: () => undefined}, group: K.BY[sk].group}); }"""
OVER = """(id => { const e = document.getElementById(id), vw = innerWidth, vh = innerHeight, bad = [];
  if (!e) return bad; if (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2) bad.push(id + ' 内容超出');
  e.querySelectorAll('svg.fig2, .nbsay, .eq, .frac, .pickcard').forEach(x => { const b = x.getBoundingClientRect(); if (b.width && (b.right > vw + 1 || b.bottom > vh + 1 || b.left < -1)) bad.push((x.className.baseVal || x.className) + ' 出屏'); });
  return bad; })"""
ZHLEFT = "(() => { const t = document.getElementById('qplay').innerText + ' ' + [...document.querySelectorAll('#qplay [aria-label], #qplay [data-say]')].map(e => (e.getAttribute('aria-label') || '') + (e.getAttribute('data-say') || '')).join(' '); return (t.match(/[\\u4e00-\\u9fff]+/g) || []).filter(w => !/长按结束/.test(w)).slice(0, 5); })()"
def setup(pg, en):
    pg.goto(url); pg.evaluate("en => localStorage.setItem('speedmap.v2.test', JSON.stringify({v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, settings: {bilingual: en}, testDays: en && !I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 1 : 0}))", en)
    pg.reload(); pg.wait_for_timeout(400)
    pg.click('#btnStart'); pg.wait_for_timeout(2200)   # 先校准手写（0–9 各写 3 遍），之后真画数字作答
    if cur(pg) == 'calib':
        for d in range(10):
            for r in range(3): draw(pg, '#calPad', str(d)); pg.wait_for_timeout(1050)
        pg.wait_for_timeout(400)
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for en in (False, True):
        L = 'en' if en else 'zh'; TAG = f'{W}x{H} {L}'
        pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        setup(pg, en)
        for id in IDS:
            nm = id.replace(':', '_')
            # 1) 讲解卡逐页 + 第一题写对 / 点对
            pg.evaluate(START, [id, 0, True]); pg.wait_for_timeout(300)
            hasC = pg.evaluate(f"!!__sm.K.BY[__sm.K.ITEM['{id}'].skill].concept"); n = pg.evaluate("__sm.Q.card ? __sm.Q.card.n : 0"); check(n >= 3 or not hasC, f'{TAG} {id} 没出讲解卡')
            for i in range(n):
                pg.wait_for_function("!document.getElementById('ack').disabled", timeout=4000); pg.wait_for_timeout(500)
                bad = pg.evaluate(OVER, 'demoBox'); check(not bad, f'{TAG} {id} 讲解卡第 {i + 1} 页 {bad}'); shot(pg, f'{L}-{W}-card-{nm}-{i + 1}', True)
                if en: z = pg.evaluate(ZHLEFT.replace("'qplay'", "'demo'").replace("#qplay", "#demo")); check(not z, f'{TAG} {id} 讲解卡第 {i + 1} 页有中文 {z}')
                pg.click('#ack'); pg.wait_for_timeout(250)
            st = qst(pg); check(st and st['phase'] == 'q', f'{TAG} {id} 讲解卡后没进题')
            pg.wait_for_timeout(500); bad = pg.evaluate(OVER, 'qBody'); check(not bad, f'{TAG} {id} 题面 {bad}'); shot(pg, f'{L}-{W}-q-{nm}', True)
            say = pg.evaluate("(document.querySelector('#qplay .spk') || {}).dataset && document.querySelector('#qplay .spk').dataset.say")
            check(say and (not en or not re.search(r'[\u4e00-\u9fff]', say)), f'{TAG} {id} 喇叭朗读：{say}')
            if en: z = pg.evaluate(ZHLEFT); check(not z, f'{TAG} {id} 题面有中文 {z}')
            if st['input'] == 'pick':
                pg.wait_for_function('__sm.Q && __sm.Q.pickOpen', timeout=4000); pg.wait_for_timeout(300)
                k = next(i for i in range(3) if i != st['ans']); pg.locator(f'.pickcard[data-n="{k}"]').first.click(); pg.wait_for_timeout(600)
                check(pg.is_visible('#qNext'), f'{TAG} {id} 点错停住看讲解'); bad = pg.evaluate(OVER, 'qWide'); check(not bad, f'{TAG} {id} 选择题讲解 {bad}')
                check(pg.evaluate("__sm.Q.x.inst.q.opts[__sm.Q.x.inst.ans]") in pg.inner_text('#qWide') or en, f'{TAG} {id} 讲解里没有正确答案')
                if en: z = pg.evaluate(ZHLEFT); check(not z, f'{TAG} {id} 讲解有中文 {z}')
                shot(pg, f'{L}-{W}-bad-{nm}', True); pg.wait_for_timeout(500); pg.click('#qNext'); pg.wait_for_timeout(300)
            else:
                draw(pg, '#qPad', str(st['ans']))
                try: pg.wait_for_function("() => { const Q = window.__sm.Q; return !Q || Q.phase !== 'q'; }", timeout=6000)
                except Exception: check(False, f'{TAG} {id} 写完没交')
                pg.wait_for_timeout(400); ok = pg.evaluate("!!document.querySelector('#qBody .okbig')")
                shot(pg, f'{L}-{W}-ok-{nm}', True)
                # 2) 第二题点「不会」：讲解里答案填进方框位置
                check(ok, f'{TAG} {id} 写对了没判对')
                pg.wait_for_timeout(2000)   # 等答对后的自动下一题走完，再开第二题
                pg.evaluate(START, [id, 1, False]); pg.wait_for_function("__sm.Q && __sm.Q.phase === 'q'", timeout=5000); pg.wait_for_timeout(400); pg.click('#qDunno'); pg.wait_for_timeout(900)
                bad = pg.evaluate(OVER, 'qBody'); check(not bad, f'{TAG} {id} 不会的讲解 {bad}')
                ans = pg.evaluate("String(__sm.Q.x.inst.ans)"); check(ans in pg.inner_text('#qBody'), f'{TAG} {id} 讲解里没有答案 {ans}')
                if en: z = pg.evaluate(ZHLEFT); check(not z, f'{TAG} {id} 讲解有中文 {z}')
                shot(pg, f'{L}-{W}-dunno-{nm}', True)
            pg.evaluate("window.__sm.Q && (window.__sm.Q.sess = {next: () => null, answer: () => undefined})")
        pg.close()
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
