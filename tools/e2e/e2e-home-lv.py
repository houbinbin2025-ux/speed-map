# 家里的三四年级奖励画面（C 方案 11-09 + E）：新奖状不报错、挂在另一面墙上不挡门口和告示牌、点得开；图鉴和计数只算开放了的
# 用法：python3 tools/e2e/e2e-home-lv.py <项目根> <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '#test'
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
# levels = 家长手选的级别；hard = 三四年级技能全部深红到第几级（0 = 没有）
SEED = """([levels, hard]) => { const S = {v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: Date.now(), placedAt: 1, known: {}, skills: {}, stats: {}, settings: {bilingual: false}};
  if (levels.length) { S.settings.levels = levels; S.settings.levelsV = 2; }
  ['look1', 'look3'].forEach(sid => __sm.K.BY[sid].items.forEach(i => { S.skills[i.id] = {lv: 3, d: ['2026-09-01', '2026-09-02', '2026-09-06'], seen: 3, lastDay: '2026-09-06', win: []}; }));
  __sm.K.HARD.forEach(s => s.items.forEach(i => { if (Math.max(...__sm.K.itemLevels(i.id)) <= hard) S.skills[i.id] = {lv: 3, d: ['2026-09-01', '2026-09-02', '2026-09-06'], seen: 3, lastDay: '2026-09-06', win: []}; }));
  if (hard >= 9) S.home = {pets: ['lv:9', 'look1']};   // 带一只三四年级伙伴回家
  for (let d = 1; d <= 8; d++) S.stats['2026-09-0' + d] = {sec: 620, n: 40, ups: 0, over: 0, gap: 0};
  localStorage.setItem('speedmap.v2.test', JSON.stringify(S)); }"""
CASES = [('没开三四年级', [1, 2, 3], 0), ('手选 3–8 级、学到第 8 级', [3, 4, 5, 6, 7, 8], 8), ('手选 1–15 级、全部学会', list(range(1, 16)), 15)]
with sync_playwright() as p:
    b = p.chromium.launch()
    for W, H in [(667, 375), (844, 390), (874, 297), (932, 651), (1194, 834)]:
        for name, levels, hard in CASES:
            for en in ([False, True] if W == 844 and hard == 15 else [False]):
                pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True); tag = f'{W}x{H} {name}' + (' 英文' if en else '')
                pg.on('pageerror', lambda e: errs.append(tag + ' ' + str(e)))
                pg.goto(url); pg.evaluate("localStorage.clear()"); pg.evaluate(SEED, [levels, hard])
                if en: pg.evaluate("(()=>{const S=JSON.parse(localStorage.getItem('speedmap.v2.test'));S.testDays=I18N.isEn({}, SM.dayOf(Date.now(),0))?0:1;S.settings.bilingual=true;localStorage.setItem('speedmap.v2.test',JSON.stringify(S));})()")
                pg.reload(); pg.wait_for_timeout(700)
                pg.click('.w-mini button[data-z="home"]')
                try: pg.wait_for_function("!document.getElementById('house').hidden", timeout=12000)
                except Exception: pass
                pg.wait_for_timeout(600)
                pg.wait_for_timeout(300)
                check(pg.evaluate("!document.getElementById('house').hidden") and not [e for e in errs if e.startswith(tag)], tag + ' 进得了家、没有报错：' + str([e for e in errs if e.startswith(tag)][:2]))
                # 开箱：点箱子 → 列表里有新奖状、新伙伴的小图 → 收下，接着连弹的奖状大图都关掉
                if pg.evaluate("(__sm.S.home.loot || []).length"):
                    pg.evaluate("__sm.HS.tap(__sm.HS.LOOT.x + 6, 55)"); pg.wait_for_timeout(500)   # 点屋里的战利品箱
                    check(pg.is_visible('#h_lootC'), tag + ' 有新奖励时点得开战利品箱')
                if pg.locator('#h_lootC').count() and pg.is_visible('#h_lootC'):
                    pg.click('#h_lootC'); pg.wait_for_timeout(1800)
                    if hard: check(pg.locator('#h_lootL canvas').count() > 0, tag + f' 开箱列表有小图（{pg.locator("#h_lootL canvas").count()} 个）')
                    if pg.is_visible('#h_lootOk'): pg.click('#h_lootOk'); pg.wait_for_timeout(500)
                for _ in range(12):   # 收下以后最多连弹 3 张奖状大图，一张张关掉
                    if pg.evaluate("!document.getElementById('h_certV').hidden"): pg.evaluate("document.getElementById('h_cClose').click()"); pg.wait_for_timeout(500)
                    else: pg.wait_for_timeout(300)
                st = pg.evaluate("(() => { const H = HOME, S = __sm.S, lv = H.CERTS.filter(c => c.lv), sh = lv.filter(c => H.shown(S, c)); return {shown: sh.length, got: sh.filter(c => S.home.got[c.id]).length, tC: document.getElementById('h_tC').textContent, tM: document.getElementById('h_tM').textContent, nav: [...document.querySelectorAll('#h_nav button')].map(b => b.textContent)}; })()")
                want_lv = {0: 0, 8: 8, 15: 22}[hard]
                check(st['shown'] == want_lv, tag + f' 显示的三四年级奖状 {st["shown"]} 张（应 {want_lv}）')
                check(('新本领' in st['nav'] or 'New skills' in st['nav'] or any('New' in n for n in st['nav'])) == (want_lv > 0), tag + f' 有新奖状才多一个「新本领」导航：{st["nav"]}')
                base = pg.evaluate("HOME.CERTS.filter(c => !c.lv).length")
                check(st['tC'].endswith('/' + str(base + want_lv)), tag + f' 奖状总数只算显示的：{st["tC"]}')
                pg.screenshot(path=str(out / f'{W}x{H}-{hard}{"-en" if en else ""}-door.png'))
                if want_lv:
                    pg.click('#h_nav button:nth-child(5)'); pg.wait_for_timeout(700)
                    pg.screenshot(path=str(out / f'{W}x{H}-{hard}{"-en" if en else ""}-lvwall.png'))
                    # 点第一张新奖状：已得到 → 打开大图
                    pg.evaluate("__sm.HS.tap(996, 14)"); pg.wait_for_timeout(500)   # 新墙第一张（第 4–5 级「全部点亮」，屋内像素坐标）
                    check(pg.evaluate("!document.getElementById('h_certV').hidden") and ('林间' in pg.inner_text('#h_certV') or 'Forest' in pg.inner_text('#h_certV') or 'Woodland' in pg.inner_text('#h_certV') or len(pg.inner_text('#h_certV')) > 4), tag + ' 点新墙上的奖状能打开大图：' + pg.inner_text('#h_certV')[:30].replace(chr(10), ' '))
                    pg.screenshot(path=str(out / f'{W}x{H}-{hard}{"-en" if en else ""}-cert.png'))
                    pg.evaluate("document.getElementById('h_cClose').click()"); pg.wait_for_timeout(300)
                    # 图鉴：总数只算显示的伙伴，新伙伴点得开、不报错
                    pg.evaluate("__sm.HS.tap(372, 50)"); pg.wait_for_timeout(600)
                    if pg.evaluate("!document.getElementById('h_book').hidden"):
                        n = pg.locator('#h_book .bkc').count(); want = pg.evaluate("__sm.K.SKILLS.length") + {8: 4, 15: 11}[hard]
                        check(n == want, tag + f' 图鉴 {n} 格（应 {want}）')
                        pg.locator('#h_book .bkc').last.click(); pg.wait_for_timeout(300)
                        pg.screenshot(path=str(out / f'{W}x{H}-{hard}{"-en" if en else ""}-book.png'))
                    else: check(False, tag + ' 图鉴没打开')
                check(len([e for e in errs if e.startswith(tag)]) == 0, tag + ' 没有页面报错')
                pg.close()
    b.close()
print('页面报错：', errs[:5])
if errs: fails.append('页面报错')
print('通过' if not fails else f'失败 {len(fails)} 项'); sys.exit(1 if fails else 0)
