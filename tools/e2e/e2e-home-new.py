# 方案 4 乙丙的 8 件新道具、新摆设还没画图（等 E）：拿到了也不能让家卡住（中控 11-09 审查要求 ③，审查员的验证脚本改写）。
# 场景 1：旧奖励都拿过 + 400 道下架错题 + 175 天 → 进家战利品箱里正好是 8 件新的，开箱、收好、告示牌、图鉴、全屋每格点一遍、摆放模式每格点一遍，都不报错，8 件新道具都摆出来
# 场景 2：99 道 + 99 天 → 告示牌出现「铁砧 99/100」「风车 99/100」，不报错
# 用法：python3 tools/e2e/e2e-home-new.py <项目根> <截图目录>
import sys, pathlib, json
ROOT = pathlib.Path(sys.argv[1]).resolve()
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (ROOT / 'v2' / 'index.html').as_uri() + '?gems=1#test'
NEW = ['fix100', 'fix200', 'fix400', 'deco15', 'deco16', 'deco17', 'deco18', 'deco19']
errs = []; fails = []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
SEED = """([solved, days, preGot, NEW]) => { const S = {v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, skills: {}, stats: {}, settings: {bilingual: false}};
  for (let i = 0; i < solved; i++) S.mistakes['k' + i] = {key: 'k' + i, uid: 'look1', src: 'look', q: {}, ans: 1, due: null, out: 1, passes: 0, added: '2026-09-01', last: '2026-09-02'};
  for (let i = 0; i < days; i++) { const d = new Date(Date.UTC(2026, 4, 1 + i)).toISOString().slice(0, 10); S.stats[d] = {sec: 700, n: 30}; }
  const got = {}; if (preGot) Object.keys(HOME.BY).filter(k => !NEW.includes(k)).forEach(k => got[k] = '2026-09-01');
  S.home = {ore: 0, got, loot: [], place: {}, pets: [], sec: 0, go: 0}; return JSON.stringify(S); }"""
def setup(pg, solved, days, preGot):
    pg.goto(url); pg.wait_for_timeout(500)
    st = pg.evaluate(SEED, [solved, days, preGot, NEW])
    pg.evaluate("s => { localStorage.clear(); localStorage.setItem('speedmap.v2.test', s); }", st); pg.reload(); pg.wait_for_timeout(800)
def vis(pg, sel): return pg.evaluate(f"(() => {{ const e = document.querySelector('{sel}'); return !!e && !e.hidden; }})()")
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for W, H in [(844, 390), (1180, 820)]:
        pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True); pg.on('pageerror', lambda e: errs.append(f'{W}: {e}'))
        # 场景 1：旧奖励都已拿过，400 道下架错题 + 175 天 → 进家只补发 8 件新的
        setup(pg, 400, 175, True)
        loot0 = pg.evaluate("__sm.S.home.loot")
        print(W, '进家前 loot:', loot0)
        pg.click('.w-mini button[data-z="home"]'); pg.wait_for_timeout(2500)
        loot = pg.evaluate("__sm.S.home.loot"); print(W, '进家后 loot:', loot)
        check(sorted(loot) == sorted(NEW), f'{W} 战利品箱里正好是 8 件新的')
        check(pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]") == 'house', f'{W} 进得了家')
        L = pg.evaluate("__sm.HS.LOOT"); pg.evaluate(f"__sm.HS.tap({L['x']+9}, 55)"); pg.wait_for_timeout(500)
        check(vis(pg, '#h_loot'), f'{W} 战利品箱打开'); pg.click('#h_lootC'); pg.wait_for_timeout(1800)
        names = pg.evaluate("[...document.querySelectorAll('#h_lootL .lootI')].map(e => e.innerText.replace(/\\n/g,' '))"); print(W, '开箱展示:', names)
        cv = pg.evaluate("[...document.querySelectorAll('#h_lootL canvas')].map(c => c.dataset.x + ':' + c.width + 'x' + c.height)"); print(W, '开箱图标:', cv)
        pg.screenshot(path=str(out / f'loot-{W}.png'))
        pg.click('#h_lootOk'); pg.wait_for_timeout(800)
        check(pg.evaluate("__sm.S.home.loot.length") == 0, f'{W} 收好后箱子清空')
        placed = pg.evaluate("Object.keys(__sm.S.home.place)"); check(all(i in placed for i in NEW), f'{W} 8 件新道具都摆出来了（E 11-10 画好图）：缺 {[i for i in NEW if i not in placed]}')
        # 告示牌
        S_ = pg.evaluate("__sm.HS.SIGN"); pg.evaluate(f"__sm.HS.tap({S_['x']+10}, {S_['y']+8})"); pg.wait_for_timeout(1800)
        print(W, '告示牌:', pg.evaluate("(document.getElementById('h_sheet')||{}).innerText"))
        pg.screenshot(path=str(out / f'sign-{W}.png'))
        # 图鉴
        B_ = pg.evaluate("__sm.HS.BOOK"); pg.evaluate(f"__sm.HS.tap({B_['x']+10}, 55)"); pg.wait_for_timeout(800)
        check(vis(pg, '#h_book'), f'{W} 图鉴打开'); pg.screenshot(path=str(out / f'book-{W}.png'))
        pg.click('#h_bkClose'); pg.wait_for_timeout(400)
        # 扫全屋每一格（点道具、奖状墙、影子），每点一下关掉弹出
        for x in range(4, pg.evaluate("document.getElementById('h_cvRoom').width"), 12):   # 屋宽跟着地面格数走（原来写死 972）
            for y in (8, 20, 32, 44, 56):
                pg.evaluate(f"__sm.HS.tap({x}, {y})"); pg.wait_for_timeout(15)
                pg.evaluate("document.querySelectorAll('#h_certV, #h_book, #h_loot').forEach(e => e.hidden = true)")
            if x == 400: pg.wait_for_timeout(1500)  # 让 near() 的回调跑完
        pg.wait_for_timeout(1500)
        # 摆放模式：点每个格子
        pg.click('#h_btnEdit'); pg.wait_for_timeout(300)
        for s in pg.evaluate("Object.values(__sm.HS.SLOTS).map(s => [s.x + 8, s.y + 8])"): pg.evaluate(f"__sm.HS.tap({s[0]}, {s[1]})"); pg.wait_for_timeout(10)
        pg.click('#h_btnEdit'); pg.wait_for_timeout(300)
        pg.screenshot(path=str(out / f'room-{W}.png'))
        # 场景 2：99 道下架 + 99 天，旧的都拿过 → 告示牌上应出现铁砧 99/100、风车 99/100，影子照常画
        setup(pg, 99, 99, True)
        pg.click('.w-mini button[data-z="home"]'); pg.wait_for_timeout(2500)
        nx = pg.evaluate("HOME.next(__sm.S, 3).map(n => n.r.id + ' ' + n.a + '/' + n.b)"); print(W, '场景2 next:', nx)
        check('fix100 99/100' in nx and 'deco15 99/100' in nx, f'{W} 告示牌目标里有铁砧、风车 99/100：{nx}')
        S_ = pg.evaluate("__sm.HS.SIGN"); pg.evaluate(f"__sm.HS.tap({S_['x']+10}, {S_['y']+8})"); pg.wait_for_timeout(1800)
        print(W, '场景2 告示牌:', pg.evaluate("(document.getElementById('h_sheet')||{}).innerText"))
        pg.screenshot(path=str(out / f'sign2-{W}.png'))
        pg.close()
    b.close()
print('页面报错:', errs[:5])
if fails or errs: print('FAIL', len(fails), '项', fails); sys.exit(1)
print('PASS 新道具、新摆设没画图时家不卡住（开箱、告示牌、图鉴、全屋、摆放模式）')
