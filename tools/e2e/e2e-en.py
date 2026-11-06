# 单双日语言：英文日真实点击走完 岛 → 地点卡片 → 校准 → 今日练习（答对、答错、不会）→ 结算 → 错题宝箱 → 技能地图 → 秒答地图和练习 → 家 → 图鉴 → 奖状
# 每屏查：看得见的字没有中文、按钮和标题不出屏不撑破；家长区永远中文；开关立刻生效、刷新后保持；错题和进度不受切换影响；存档里没有英文
# 用法：python3 tools/e2e/e2e-en.py <项目根> <截图目录> [宽 高]
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)   # 借用 url / draw / cur / shot
fails = []
def check(ok, msg):
    if not ok: fails.append(msg)
W = int(sys.argv[3]) if len(sys.argv) > 3 else 844; H = int(sys.argv[4]) if len(sys.argv) > 4 else 390
AUDIT = r"""() => {
  const ZH = /[　-〿㐀-鿿＀-￯]/, out = {zh: [], over: []}, skip = '#testBar';
  const vis = el => { if (!el || el.closest(skip)) return false; const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const p = n.parentElement; if (['SCRIPT', 'STYLE'].includes(p.tagName) || !ZH.test(n.data) || !vis(p)) continue; const r = document.createRange(); r.selectNodeContents(n); if (r.getClientRects().length) out.zh.push(n.data.trim().slice(0, 50)); }
  document.querySelectorAll('[aria-label],[title],[data-say]').forEach(el => { if (!vis(el)) return; ['aria-label', 'title', 'data-say'].forEach(a => { const v = el.getAttribute(a); if (v && ZH.test(v)) out.zh.push(a + ':' + v.slice(0, 50)); }); });
  document.querySelectorAll('button,.btn,.gobig,.big,h1,h2,h3,.qtag,.dtitle,.nm,.w-flag,.tally,.chip,.badge').forEach(el => { if (!vis(el) || el.closest('.w-vp') || el.closest('[style*="overflow-x"]') || el.closest('.w-sheet:not(.open)')) return; const r = el.getBoundingClientRect();
    if ((el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 3) && el.clientWidth > 0 && getComputedStyle(el).display !== 'inline') out.over.push('撑破 ' + (el.id || el.className) + ' ' + el.textContent.trim().slice(0, 30));
    if (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1) { let c = el.parentElement, scroll = false; while (c && c !== document.body) { const o = getComputedStyle(c); if (/(auto|scroll)/.test(o.overflowY + o.overflowX)) { scroll = true; break; } c = c.parentElement; } if (!scroll) out.over.push('出屏 ' + (el.id || el.className) + ' ' + el.textContent.trim().slice(0, 30)); } });
  return out; }"""
seen = []
def screen(pg, name):
    pg.wait_for_timeout(60)
    a = pg.evaluate(AUDIT); seen.append(name); pg.screenshot(path=str(out / (name + '.png')))
    check(not a['zh'], f'{name} 还有中文：{a["zh"][:6]}'); check(not a['over'], f'{name} 溢出：{a["over"][:6]}')
def hold(pg, sel, ms):
    bb = pg.locator(sel).bounding_box(); pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.mouse.down(); pg.wait_for_timeout(ms); pg.mouse.up(); pg.wait_for_timeout(250)
def tap_art(pg, x, y): pg.evaluate(f"__sm.HS.tap({x}, {y})")
def qstate(pg): return pg.evaluate("(() => { const Q = __sm.Q; return Q && Q.x && Q.x.kind === 'q' ? {phase: Q.phase, input: Q.v.input, ans: Q.x.inst.ans, q: Q.x.inst.q} : null; })()")
def to_q(pg):
    for _ in range(8):
        c = pg.evaluate("__sm.Q && __sm.Q.phase")
        if c == 'demo':
            pg.wait_for_function("!document.getElementById('ack').disabled", timeout=4000); screen(pg, 'demo-' + str(len(seen))); pg.click('#ack'); pg.wait_for_timeout(120); continue
        if c == 'q': return True
        pg.wait_for_timeout(300)
    return False
def do_answer(pg, right):
    s = qstate(pg)
    if s['input'] == 'write':
        draw(pg, '#qPad', str(s['ans'] if right else s['ans'] + 1))
        pg.wait_for_function("!__sm.Q || __sm.Q.phase !== 'q'", timeout=4000)
        if pg.evaluate("__sm.Q && __sm.Q.phase === 'confirm'"): screen(pg, 'confirm'); pg.click('#qcRewrite'); pg.click('#qDunno')
    elif s['input'] == 'pick':
        pg.wait_for_function("!document.querySelector('.pickcard.lock')", timeout=3000)
        vals = pg.evaluate("[...document.querySelectorAll('.pickcard')].map(b => +b.dataset.n)")
        pg.click(f'.pickcard[data-n="{s["ans"] if right else next(v for v in vals if v != s["ans"])}"]')
    else:
        r = pg.evaluate("(() => { const b = document.getElementById('lineBox').getBoundingClientRect(); return [b.left, b.top, b.width]; })()")
        t = s['q']['target'] / s['q']['max'] if right else (0.95 if s['q']['target'] / s['q']['max'] < 0.5 else 0.05)
        pg.mouse.move(r[0] + r[2] * t, r[1] + 122); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(1500)
SNAP = "JSON.stringify({m: __sm.S.mistakes, sk: Object.entries(__sm.S.skills).map(([k, v]) => [k, v.lv]).sort(), c: Object.entries(__sm.S.cards).filter(([k, v]) => v.seen).map(([k, v]) => [k, v.lv]).sort(), h: __sm.S.home && __sm.S.home.got})"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url); pg.evaluate("localStorage.clear()")
    # 种子：单日；两个技能已深红（家里有战利品箱、奖状、伙伴可看），练过 8 天；没有 bilingual 字段 = 默认开
    pg.evaluate("""() => { const S = {v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {look1: true, look2: true, look3: true, look4: true, bond1: true, cmp1: true}, skills: {}, stats: {}, testDays: I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 0 : 1};
      ['look1', 'look3'].forEach(sid => __sm.K.BY[sid].items.forEach(i => { S.skills[i.id] = {lv: 3, d: ['2026-09-01', '2026-09-02', '2026-09-06'], seen: 3, lastDay: '2026-09-06', win: []}; }));
      for (let d = 1; d <= 8; d++) S.stats['2026-09-0' + d] = {sec: 620, n: 40, ups: 0, over: 0, gap: 0};
      localStorage.setItem('speedmap.v2.test', JSON.stringify(S)); }""")
    pg.reload(); pg.wait_for_timeout(500)
    check(pg.evaluate("document.documentElement.lang") == 'en', 'html lang 不是 en'); check(pg.title() == 'Kongkong Math Island', '标题没翻：' + pg.title())
    check(not pg.evaluate("document.documentElement.classList.contains('i18n-wait')"), '页面还藏着')
    screen(pg, '01-island')
    # 绘制前翻好：改完文字后的第一帧已经是英文，量尺寸也量英文
    painted = pg.evaluate("""() => new Promise(res => { const b = document.getElementById('leadSub'), old = b.textContent; b.textContent = '先看看你已经会什么，大约 5 分钟'; requestAnimationFrame(() => { const t = b.textContent; b.textContent = old; res(t); }); })""")
    check(not any('一' <= c <= '鿿' for c in painted), '下一帧还是中文：' + painted)
    # 朗读：data-say 英文
    say = pg.evaluate("""() => { const K = __sm.K, it = K.BY.dockA.items[0], x = K.rawPool(it.id)[0], d = document.createElement('div'); d.innerHTML = __sm.R.question({id: it.id, q: x.q, ans: x.ans}).html; document.getElementById('island').append(d); I18N.flush(); const v = d.querySelector('.spk').dataset.say; d.remove(); return v; }""")
    check(not any('一' <= c <= '鿿' for c in say), '朗读还是中文：' + say)
    # 地点卡片
    pg.click('.w-mini button[data-z="look"]'); pg.wait_for_timeout(900)
    if not pg.evaluate("document.getElementById('zSheet').classList.contains('open')"): pg.mouse.click(W / 2, H * .45); pg.wait_for_timeout(500)
    check(pg.evaluate("document.getElementById('zSheet').classList.contains('open')"), '地点卡片没打开'); screen(pg, '02-zone'); pg.click('#zX'); pg.wait_for_timeout(200)
    # 校准（真实笔画）
    pg.click('#btnStart'); pg.wait_for_timeout(2500); check(cur(pg) == 'calib', '没进校准：' + str(cur(pg))); screen(pg, '03-calib')
    for k in range(30):
        d = int(pg.inner_text('#calNum')); draw(pg, '#calPad', str(d)); pg.wait_for_timeout(1000)
    pg.wait_for_timeout(300)
    # 今日练习：答对、答错、不会
    check(to_q(pg), '校准后没出题')
    screen(pg, '04-question')
    do_answer(pg, True); screen(pg, '05-right'); pg.wait_for_timeout(1000)
    check(to_q(pg), '答对后没下一题')
    screen(pg, '06-question2'); do_answer(pg, False); pg.wait_for_timeout(150); screen(pg, '07-wrong')
    if pg.is_visible('#qNext'): pg.click('#qNext'); pg.wait_for_timeout(600)
    wrongs = 0
    for k in range(6):
        if not to_q(pg): break
        screen(pg, f'08-q{k}')
        if pg.is_visible('#qDunno'): pg.click('#qDunno')   # 点选、数线是宽版，没有写字板那一栏：答错一次代替
        else: do_answer(pg, False)
        pg.wait_for_timeout(150); screen(pg, f'09-dunno{k}'); wrongs += 1
        pg.wait_for_timeout(550)
        if pg.is_visible('#qNext'): pg.click('#qNext')
        pg.wait_for_timeout(600)
    to_q(pg)
    # 针对性：应用题、钟、钱的题面和讲解画进真实练习页
    for sid in ['dockA', 'clockB', 'money2', 'gardenC', 'dockC']:
        pg.evaluate("""sid => { const {K, R} = __sm, it = K.BY[sid].items[0], x = K.rawPool(it.id)[0], inst = {id: it.id, q: x.q, ans: x.ans}, v = R.question(inst); document.getElementById('qTag').textContent = v.tag; document.getElementById('qWide').hidden = true; document.getElementById('qBody').innerHTML = v.html + R.explain(inst); }""", sid); screen(pg, 'q-' + sid)
    hold(pg, '#qQuit', 1200); pg.wait_for_timeout(300); check(cur(pg) == 'qsum', '没到结算：' + str(cur(pg))); screen(pg, '10-summary')
    pg.click('#qsHome'); pg.wait_for_timeout(400); check(cur(pg) == 'island', '结算没回岛')
    mist = pg.evaluate("Object.keys(__sm.S.mistakes).length"); check(mist >= 1, '错题没进宝箱')
    # 错题宝箱
    pg.click('#btnMist'); pg.wait_for_timeout(200); check(cur(pg) == 'mist', '没到错题宝箱'); screen(pg, '11-mist'); pg.click('#mistBack'); pg.wait_for_timeout(300)
    # 技能地图
    pg.click('.w-mini button[data-z="cmp"]'); pg.wait_for_timeout(900)
    if not pg.evaluate("document.getElementById('zSheet').classList.contains('open')"): pg.mouse.click(W / 2, H * .45); pg.wait_for_timeout(500)
    pg.click('#zMap'); pg.wait_for_timeout(200); check(cur(pg) == 'skillmap', '没到技能地图'); screen(pg, '12-skillmap')
    for g in ['bond', 'garden', 'market', 'dock']: pg.click(f'#smTabs [data-g="{g}"]'); pg.wait_for_timeout(100); screen(pg, '12-skillmap-' + g)
    pg.click('#smBack'); pg.wait_for_timeout(300)
    # 秒答地图和练习
    pg.click('.w-mini button[data-z="speed"]'); pg.wait_for_timeout(900)
    if not pg.evaluate("document.getElementById('zSheet').classList.contains('open')"): pg.mouse.click(W / 2, H * .45); pg.wait_for_timeout(500)
    pg.click('#zGo'); pg.wait_for_timeout(300); check(cur(pg) == 'home', '没到秒答地图'); screen(pg, '13-speedmap')
    pg.click('#levels [data-level="2"]'); pg.wait_for_timeout(100); screen(pg, '13-speedmap-L3'); pg.evaluate("__sm.S.settings.levels = __sm.K.LEVELS.map(l => l.n)"); pg.click('#levels [data-level="1"]'); pg.wait_for_timeout(100); screen(pg, '13-speedmap-open')   # 自动难度下这一级还没开放：家长手选全部级别
    pg.click('[data-series="add"]'); pg.wait_for_timeout(300); check(cur(pg) == 'play', '没进秒答练习'); screen(pg, '14-play')
    a = pg.evaluate("__sm.P.deck[__sm.P.i].ans"); draw(pg, '#pad', str(a)); pg.wait_for_timeout(1050); screen(pg, '15-play-ok'); pg.wait_for_timeout(1000)
    pg.click('#btnDunno'); pg.wait_for_timeout(150); screen(pg, '16-play-dunno'); pg.wait_for_timeout(500); pg.click('#btnNext'); pg.wait_for_timeout(300)
    hold(pg, '#btnQuit', 1200); pg.wait_for_timeout(200); check(cur(pg) == 'summary', '秒答没到结算'); screen(pg, '17-play-summary')
    pg.click('#sumHome'); pg.wait_for_timeout(200); pg.click('#spBack'); pg.wait_for_timeout(300)
    # 家：战利品箱 → 奖状 → 图鉴 → 告示牌、矿物柜、木箱
    pg.click('.w-mini button[data-z="home"]'); pg.wait_for_timeout(2300)
    check(pg.evaluate("!document.getElementById('house').hidden"), '没进家'); screen(pg, '18-house')
    lx = pg.evaluate('__sm.HS.LOOT.x'); tap_art(pg, lx + 6, 55); pg.wait_for_timeout(300); check(pg.is_visible('#h_lootC'), '箱子没打开'); screen(pg, '19-loot')
    pg.click('#h_lootC'); pg.wait_for_timeout(1400); screen(pg, '20-loot-open'); pg.click('#h_lootOk'); pg.wait_for_timeout(900)
    check(pg.is_visible('#h_certC'), '没出奖状'); screen(pg, '21-cert')
    for _ in range(4):
        if pg.is_visible('#h_cClose'): pg.click('#h_cClose'); pg.wait_for_timeout(600)
    tap_art(pg, pg.evaluate('__sm.HS.BOOK.x') + 6, 50); pg.wait_for_timeout(300); screen(pg, '22-book')
    pg.click('.bkc:not(.lock)'); pg.wait_for_timeout(100); screen(pg, '23-book-pal'); pg.click('.bkc.lock'); pg.wait_for_timeout(100); screen(pg, '24-book-locked'); pg.click('#h_bkClose'); pg.wait_for_timeout(200)
    for name, x, y in [('25-sign', pg.evaluate('__sm.HS.SIGN.x') + 6, 20), ('26-cabinet', pg.evaluate('__sm.HS.CAB.x') + 6, 30), ('27-chest', pg.evaluate('__sm.HS.CHEST.x') + 6, 55)]:
        tap_art(pg, x, y); pg.wait_for_timeout(1000); screen(pg, name); pg.click('.sh-x'); pg.wait_for_timeout(250)
    pos = pg.evaluate("__sm.HS.certPos['c:bond:1']"); tap_art(pg, pos['x'] + 3, pos['y'] + 3); pg.wait_for_timeout(1000); screen(pg, '28-goal'); pg.click('.sh-x'); pg.wait_for_timeout(250)
    pg.click('#h_btnEdit'); pg.wait_for_timeout(150); screen(pg, '29-edit'); pg.click('#h_btnEdit'); pg.wait_for_timeout(150)
    pg.click('#h_btnOut'); pg.wait_for_timeout(800); check(cur(pg) == 'island', '没回岛'); screen(pg, '30-island-after')
    miss = pg.evaluate("[...I18N.misses]"); check(not miss, '没翻译到：' + str(miss[:12]))
    # 存档里没有英文
    saved = pg.evaluate("localStorage.getItem('speedmap.v2.test')")
    for w in ['Little ', 'How many', 'Start today', 'Kongkong', "o'clock"]: check(w not in saved, '存档里混进英文：' + w)
    # 家长区：永远中文，开关有效
    before = pg.evaluate(SNAP)
    hold(pg, '#gear', 2200); pg.wait_for_timeout(200); check(cur(pg) == 'parent', '没进家长区')
    pt = pg.inner_text('#parent'); check('家长区' in pt and '单日英文、双日中文（今天：英文）' in pt, '家长区不是中文或开关文案不对'); check('Back' not in pt, '家长区混进英文')
    check(pg.is_checked('#biBox'), '默认没勾选'); pg.screenshot(path=str(out / '31-parent-en-day.png'))
    pg.click('#bankGo [data-bg="dock"]'); pg.wait_for_timeout(200); check('题库' in pg.inner_text('#bankv'), '题库页不是中文'); pg.click('#bankList [data-bo]'); pg.wait_for_timeout(200); pg.click('#bankList [data-bq]'); pg.wait_for_timeout(200); check('孩子看到的题' in pg.inner_text('#ovQ'), '题库预览不是中文'); check('还剩' in pg.inner_text('#ovQ') or '一共' in pg.inner_text('#ovQ') or '？' in pg.inner_text('#ovQ'), '题库预览的题不是中文'); pg.click('#qpX'); pg.click('#bankBack'); pg.wait_for_timeout(200)
    pg.click('#biBox'); pg.wait_for_timeout(100)
    check(pg.evaluate("document.documentElement.lang") == 'zh-CN', '关闭后 lang 没变'); check('今天：中文' in pg.inner_text('#parent'), '关闭后今天不是中文'); check(pg.title() == '空空数学岛', '关闭后标题没还原')
    pg.click('#parBack'); pg.wait_for_timeout(300)
    t = pg.inner_text('#island'); check('空空数学岛' in t and '错题宝箱' in t, '关闭后首页不是中文：' + t[:60]); check('Mistake' not in t and 'Kongkong' not in t, '关闭后还有英文')
    pg.screenshot(path=str(out / '32-island-off.png'))
    pg.click('#btnMist'); pg.wait_for_timeout(200); check('错题宝箱' in pg.inner_text('#mist'), '关闭后错题宝箱不是中文'); pg.click('#mistBack'); pg.wait_for_timeout(200)
    pg.reload(); pg.wait_for_timeout(500)
    check(pg.evaluate("__sm.S.settings.bilingual") is False, '刷新后开关没保持'); check(pg.evaluate("document.documentElement.lang") == 'zh-CN', '刷新后变回英文'); check('空空数学岛' in pg.inner_text('#island'), '刷新后首页不是中文')
    after = pg.evaluate(SNAP); check(after == before, '切换语言后错题或进度变了：' + next((f'{k}: {json.loads(before)[k]} -> {json.loads(after)[k]}'[:400] for k in json.loads(before) if json.loads(before)[k] != json.loads(after)[k]), ''))
    # 再打开：立刻回英文；拨到下一天（双日或连着的单日）按规则走
    hold(pg, '#gear', 2200); pg.click('#biBox'); pg.wait_for_timeout(100); check(pg.evaluate("document.documentElement.lang") == 'en', '重新勾选没回英文'); pg.click('#parBack'); pg.wait_for_timeout(200); check('Kongkong Math Island' in pg.inner_text('#island'), '重新勾选后首页不是英文')
    pg.click('[data-t="day+1"]'); pg.wait_for_timeout(200)
    expect = pg.evaluate("I18N.isEn(__sm.S.settings, __sm.today()) ? 'en' : 'zh-CN'"); check(pg.evaluate("document.documentElement.lang") == expect, '拨日期后语言不对')
    check(not pg.is_visible('#ovCrash'), '出现崩溃页')
    b.close()
print('走过', len(seen), '屏 · 翻译错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
