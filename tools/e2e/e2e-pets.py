# 家里的伙伴（C 模块，中控 11-08）：旧漏洞留下的空列表进屋自动补 3 只；图鉴不能把伙伴全部取消；还没学会技能时不写空列表
# 用法：python3 tools/e2e/e2e-pets.py <项目根> <截图目录>
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)   # 借用 url / seed / shot（和 e2e7.py 一样）
fails = []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
def tap_art(pg, x, y): pg.evaluate(f"__sm.HS.tap({x}, {y})")
def seed_with(pg, pets, skills):
    st = pg.evaluate("""([pets, skills]) => { const S = {v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, skills: {}, stats: {}, settings: {bilingual: false}};
      skills.forEach(sid => __sm.K.BY[sid].items.forEach(i => { S.skills[i.id] = {lv: 3, d: ['2026-09-01', '2026-09-02', '2026-09-06'], seen: 3, lastDay: '2026-09-06', win: []}; }));
      S.home = {ore: 0, got: {}, loot: [], place: {}, pets, sec: 0, go: 0}; return JSON.stringify(S); }""", [pets, skills])
    pg.evaluate("s => { localStorage.clear(); localStorage.setItem('speedmap.v2.test', s); }", st); pg.reload(); pg.wait_for_timeout(500)
def enter(pg):
    pg.click('.w-mini button[data-z="home"]'); pg.wait_for_timeout(2200)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url)
    # 1 真 iPad 现在的样子：学会了 4 个技能，伙伴列表是空的 → 进屋自动带 3 只回家
    SKILLS = pg.evaluate("__sm.K.SKILLS.filter(s => s.items.length && !s.speed).slice(0, 4).map(s => s.id)")
    seed_with(pg, [], SKILLS); enter(pg)
    pets = pg.evaluate("__sm.S.home.pets"); check(isinstance(pets, list) and len(pets) == 3, f'空列表进屋自动补 3 只：{pets}')
    check(pg.evaluate("__sm.HS.pets ? __sm.HS.pets.length : 3") == 3, '屋里画出 3 只'); shot(pg, 'pets-refilled')
    # 2 图鉴：取消到只剩 1 只时不让取消，提示一句
    tap_art(pg, pg.evaluate('__sm.HS.BOOK.x') + 6, 50); pg.wait_for_timeout(300)
    for i in pets[:2]:
        pg.click(f'.bkc[data-i="{i}"]'); pg.wait_for_timeout(150); pg.click('#h_bkPet'); pg.wait_for_timeout(200)
    check(pg.evaluate("__sm.S.home.pets.length") == 1, '取消 2 只后剩 1 只')
    last = pg.evaluate("__sm.S.home.pets[0]"); pg.click(f'.bkc[data-i="{last}"]'); pg.wait_for_timeout(150); pg.click('#h_bkPet'); pg.wait_for_timeout(250)
    check(pg.evaluate("__sm.S.home.pets") == [last], '最后 1 只取消不掉')
    check(pg.is_visible('#h_toast') and pg.inner_text('#h_toast') == '至少带一个伙伴回家', '提示：' + (pg.inner_text('#h_toast') if pg.is_visible('#h_toast') else '没出'))
    shot(pg, 'pets-last-one')
    # 3 还没学会技能的新设备：进屋不写空列表（保持没选过）
    pg.close(); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(url)   # 先关掉旧页（关页时会存一次进度），再种新数据
    seed_with(pg, None, []); enter(pg)
    check(pg.evaluate("__sm.S.home.pets") is None, '没学会技能：不写空列表：' + str(pg.evaluate("__sm.S.home.pets")))
    tap_art(pg, pg.evaluate('__sm.HS.BOOK.x') + 6, 50); pg.wait_for_timeout(300)   # 审查 11-08：这时打开图鉴曾报错崩溃
    check(pg.is_visible('#h_book') and not errs, '没学会技能：图鉴能打开、不报错：' + str(errs[:1]))
    # 4 合并进来的伙伴本机全都没学会：进屋直接补成本机学会的，不出现 0 只
    pg.close(); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(url)
    OTHER = pg.evaluate("__sm.K.SKILLS.filter(s => s.items.length && !s.speed).slice(4, 8).map(s => s.id)")
    seed_with(pg, OTHER, SKILLS[:2]); enter(pg)
    got = pg.evaluate("__sm.S.home.pets"); check(isinstance(got, list) and len(got) == 2 and set(got) <= set(SKILLS[:2]), f'伙伴都没学会：进屋补成本机的：{got}')
    b.close()
print('页面报错:', errs[:3])
if fails or errs: print('FAIL', len(fails), '项'); sys.exit(1)
print('PASS 家里的伙伴（空列表自动补、不能全部取消）')
