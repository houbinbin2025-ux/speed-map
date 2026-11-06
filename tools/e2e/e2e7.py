# 空空的家（说明书-v5-家）：旧存档第一次进家有补发、格子数不变；开箱 → 奖状；图鉴带回家；告示牌；摆放；返回手势；进度刷新后还在；练完结算页出现「回家打开」
# 用法：python3 tools/e2e/e2e5.py <项目根> <截图目录>
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)   # 借用 url / seed / draw / cur / qst / answer / shot
fails = []
def check(ok, msg):
    if not ok: fails.append(msg)
def tap_art(pg, x, y): pg.evaluate(f"__sm.HS.tap({x}, {y})")   # 屋内像素坐标；屏幕上的真实点击由审查员走查
def lit_count(pg): return pg.evaluate("[...Object.values(__sm.S.skills || {}), ...Object.values(__sm.S.cards || {})].filter(c => c && c.lv > 0).length")
old = dict(seed); old['skills'] = {}; old['stats'] = {}; old['log'] = {}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url); pg.evaluate("localStorage.clear()")
    # 旧存档：骰子点 + 乱点全部深红，练过 8 天；没有 home 字段
    st = pg.evaluate("""() => { const S = {v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, skills: {}, stats: {}, settings: {bilingual: false}};
      ['look1', 'look3'].forEach(sid => __sm.K.BY[sid].items.forEach(i => { S.skills[i.id] = {lv: 3, d: ['2026-09-01', '2026-09-02', '2026-09-06'], seen: 3, lastDay: '2026-09-06', win: []}; }));
      for (let d = 1; d <= 8; d++) S.stats['2026-09-0' + d] = {sec: 620, n: 40, ups: 0, over: 0, gap: 0};
      return JSON.stringify(S); }""")
    pg.evaluate("s => localStorage.setItem('speedmap.v2.test', s)", st); pg.reload(); pg.wait_for_timeout(500)
    before = lit_count(pg); shot(pg, 'a-island')
    check(pg.locator('.w-sign[data-z="home"] .w-flag').count() == 1, '岛上家没有战利品箱旗子')
    check(pg.evaluate("__sm.S.home.loot.length") >= 5, '旧进度没有补发')
    # 真实点「家」按钮
    pg.click('.w-mini button[data-z="home"]'); pg.wait_for_timeout(2200)
    check(pg.evaluate("!document.getElementById('house').hidden"), '点家没有进屋'); shot(pg, 'b-door')
    check(lit_count(pg) == before, f'格子数变了 {before}')
    n = pg.evaluate("__sm.S.home.loot.length")
    pg.wait_for_timeout(400); lx = pg.evaluate('__sm.HS.LOOT.x'); tap_art(pg, lx + 6, 55); pg.wait_for_timeout(300); check(pg.is_visible('#h_lootC'), '箱子没打开'); shot(pg, 'c-box')
    pg.click('#h_lootC'); pg.wait_for_timeout(1400); shot(pg, 'd-open'); check(pg.locator('.lootI').count() >= 1, '战利品没显示')
    pg.click('#h_lootOk'); pg.wait_for_timeout(900); check(pg.is_visible('#h_certC'), '收好后没出奖状'); shot(pg, 'e-cert')
    check(pg.evaluate("__sm.S.home.loot.length") == 0, '开过的箱子没清空')
    closes = 0
    while pg.is_visible('#h_cClose') and closes < 10: pg.click('#h_cClose'); closes += 1; pg.wait_for_timeout(600)
    check(closes <= 3, f'连弹奖状 {closes} 张')
    # 图鉴：真实点卡片，带回家
    tap_art(pg, pg.evaluate('__sm.HS.BOOK.x') + 6, 50); pg.wait_for_timeout(200); check(pg.locator('.bkc').count() == pg.evaluate("__sm.K.SKILLS.length"), '图鉴数量不对'); shot(pg, 'f-book')
    pg.click('.bkc:not(.lock):not(.home)') if pg.locator('.bkc:not(.lock):not(.home)').count() else pg.click('.bkc:not(.lock)')
    pg.wait_for_timeout(100); pg.click('.bkc.lock'); pg.wait_for_timeout(100); check(pg.is_visible('#h_bkGo'), '未解锁没有去练按钮')
    pg.click('.bkc:not(.lock)'); pg.wait_for_timeout(100); shot(pg, 'g-book2'); pg.click('#h_bkClose')
    # 告示牌、矿物柜、木箱
    for name, x, y, sel in [('h-sign', pg.evaluate('__sm.HS.SIGN.x') + 6, 20, '.sh-h'), ('i-cab', pg.evaluate('__sm.HS.CAB.x') + 6, 30, '.ore3'), ('j-chest', pg.evaluate('__sm.HS.CHEST.x') + 6, 55, '.sh-h')]:
        tap_art(pg, x, y); pg.wait_for_timeout(1000); check(pg.is_visible(sel), name + ' 卡片没开'); shot(pg, name); pg.click('.sh-x'); pg.wait_for_timeout(250)
    # 摆放（10-xx 真机崩溃：提示框里变量重名）：进入、选中、放错类型、挪动、完成；点伙伴也会弹提示
    pg.click('#h_btnEdit'); pg.wait_for_timeout(150); check(pg.is_visible('#h_toast'), '摆放提示没出来')
    slots = pg.evaluate("(() => { const H = __sm.HS, p = __sm.S.home.place, ks = Object.keys(p); const a = H.SLOTS[p[ks[0]]], other = Object.values(H.SLOTS).find(s => s.t === a.t && !Object.values(p).includes(s.id)), wrong = Object.values(H.SLOTS).find(s => s.t !== a.t); return {a, other, wrong, k: ks[0]}; })()")
    tap_art(pg, slots['a']['x'] + 4, slots['a']['y'] + 4); pg.wait_for_timeout(100)
    tap_art(pg, slots['wrong']['x'] + 4, slots['wrong']['y'] + 4); pg.wait_for_timeout(100)
    tap_art(pg, slots['other']['x'] + 4, slots['other']['y'] + 4); pg.wait_for_timeout(100)
    check(pg.evaluate(f"__sm.S.home.place['{slots['k']}']") == slots['other']['id'], '摆放没生效')
    pg.click('#h_btnEdit'); pg.wait_for_timeout(100)
    pets = pg.evaluate("__sm.HS.pets.map(p => p.x)")
    if pets: tap_art(pg, pets[0] + 6, 58); pg.wait_for_timeout(100)
    check(not pg.is_visible('#ovCrash'), '摆放或点伙伴崩溃')
    # 返回手势：先关卡片，再回岛
    tap_art(pg, pg.evaluate('__sm.HS.SIGN.x') + 6, 20); pg.wait_for_timeout(1000); pg.go_back(); pg.wait_for_timeout(300)
    check(not pg.evaluate("document.getElementById('h_sheet').classList.contains('on')"), '返回没先关卡片'); check(cur(pg) != 'island', '返回提前离开了家')
    # 进度刷新后还在
    pg.click('#h_btnOut'); pg.wait_for_timeout(1000); check(cur(pg) == 'island', '回到岛上失败')
    got = pg.evaluate("Object.keys(__sm.S.home.got).length"); pg.reload(); pg.wait_for_timeout(400)
    check(pg.evaluate("Object.keys(__sm.S.home.got).length") == got, '刷新后奖励变了'); check(lit_count(pg) == before, '刷新后格子数变了')
    check(pg.locator('.w-sign[data-z="home"] .w-flag').count() == 0, '开过箱后旗子还在')
    # 从家里去练：未得到的奖状 → 去练这一块 → 进入练习
    pg.click('.w-mini button[data-z="home"]'); pg.wait_for_timeout(2600)
    pos = pg.evaluate("__sm.HS.certPos['c:bond:1']"); tap_art(pg, pos['x'] + 3, pos['y'] + 3); pg.wait_for_timeout(1000); shot(pg, 'k-goal')
    pg.click('#h_goP'); pg.wait_for_timeout(2600)
    check(cur(pg) in ('calib', 'qplay', 'demo'), '去练这一块没进入练习：' + str(cur(pg)))
    check(pg.evaluate("__sm.S.home.go") == 1, '去练次数没记')
    check(pg.evaluate("Object.values(__sm.S.stats).some(d => d.home >= 0 && 'home' in d)"), '家里时间没记')
    # 全部获得：每件道具都放得下
    pg.goto(url); pg.evaluate("""() => { const S = __sm.S; __sm.K.SKILLS.forEach(s => s.items.forEach(i => { const p = __sm.E.prog(S, i.id); p.lv = 3; p.d = ['2026-01-01', '2026-01-02', '2026-01-06']; })); S.stats = {}; for (let i = 0; i < 200; i++) S.stats['2026-0' + (1 + (i >> 5) % 9) + '-' + String(1 + i % 28).padStart(2, '0') + 'x' + i] = {sec: 700, n: 5}; S.mistakes = {}; for (let i = 0; i < 60; i++) S.mistakes['x' + i] = {key: 'x' + i, uid: 'x', due: null, passes: 5}; }""")
    pg.click('.w-mini button[data-z="home"]'); pg.wait_for_timeout(2600); shot(pg, 'm-full')
    miss = pg.evaluate("(() => { const h = __sm.S.home; return __sm.HS.E0.items.filter(i => !i.part && !__sm.HS.SLOTS[h.place[i.id]]).map(i => i.name); })()")
    check(not miss, '放不下的道具：' + str(miss)); check(pg.evaluate("__sm.HS.E0.certs.length") == 31, '全部奖状数不对')
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
