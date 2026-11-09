# 分级同步（A 审查 11-09，归 E 的 3 处）：岛上地块卡片列「老技能 + 这一级开放的三四年级技能」且放得下；秒答高塔在当前图没题时换图、4 张都没题时进挑战；
# 思维地点手选级别时默认停在「建议级别 ≤ 所选最高级」的那一档。用法：python3 tools/e2e/e2e-levelsync.py <项目根> <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '#test'
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
SEED = """([lv, en]) => { const S = {v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 3, mistakes: {}, lastBackup: Date.now(), placedAt: 1, known: {}, skills: {}, stats: {}, settings: {bilingual: false}};
  if (lv.length) { S.settings.levels = lv; S.settings.levelsV = 2; }
  if (en) { S.settings.bilingual = true; S.testDays = I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 0 : 1; }
  localStorage.setItem('speedmap.v2.test', JSON.stringify(S)); localStorage.setItem('speedmap.ink.test', JSON.stringify({done: true, samples: [], speed: 800})); }"""
cur = lambda pg: pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]")
GROUPS = ['look', 'bond', 'place', 'cmp', 'line', 'garden', 'market', 'dock']
with sync_playwright() as p:
    b = p.chromium.launch()
    RUNS = [(W, H, lv, False) for W, H in [(667, 375), (844, 390), (874, 297), (1194, 834)] for lv in [[], [1], [2], [4], [5], [8], [9], [12], list(range(3, 9)), list(range(9, 13)), list(range(1, 16))]]
    RUNS += [(W, H, lv, True) for W, H in [(667, 375), (874, 297)] for lv in [[9], list(range(1, 16))]]   # 英文日：字长，卡片更高
    for W, H, lv, en in RUNS:
            pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True); tag = f'{W}x{H} ' + (f'第 {lv[0]}–{lv[-1]} 级' if lv else '自动') + (' 英文' if en else '')
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(url); pg.evaluate("localStorage.clear()"); pg.evaluate(SEED, [lv, en]); pg.reload(); pg.wait_for_timeout(700)
            # 1 地块卡片：列出的技能 = R.skillsOf；格数一致；卡片在屏内
            for g in GROUPS:
                pg.evaluate(f"document.querySelector('.w-mini button[data-z=\"{g}\"]').click()"); pg.wait_for_function("getComputedStyle(document.getElementById('zSheet')).transform.split(',')[5] == ' 0)'", timeout=20000); pg.wait_for_timeout(150)   # 等卡片滑到位再量
                n = pg.locator('#zSkills .zsk').count(); want = pg.evaluate(f"__sm.R.skillsOf(__sm.S, '{g}').length")
                ct = pg.inner_text('#zCt'); tot = pg.evaluate(f"__sm.R.groupStat(__sm.S, '{g}').total")
                bb = pg.locator('#zSheet').bounding_box(); go = pg.locator('#zGo').bounding_box()
                check(n == want and (en or ct.endswith(f'/ {tot} 格')), f'{tag} {g} 卡片 {n} 个技能（应 {want}），{ct}')
                x = pg.locator('#zX').bounding_box()
                check(bb['y'] >= -1 and x['y'] >= -1 and go['y'] + go['height'] <= H + 1, f'{tag} {g} 卡片顶（地名、✕）和「练这一块」都在屏内（卡片顶 {bb["y"]:.0f}，按钮底 {go["y"] + go["height"]:.0f}）')
                if g == 'dock' and lv and lv[0] in (9, 1) and lv[-1] == 15: pg.screenshot(path=str(out / f'{W}x{H}-dock-{lv[0]}-{lv[-1]}{"-en" if en else ""}.png'))
                pg.click('#zX'); pg.wait_for_timeout(300)
            signs = pg.evaluate("Math.max(...[...document.querySelectorAll('.w-sign .row')].map(r => r.children.length))")
            check(signs <= 10, f'{tag} 木牌最多 10 格（{signs}）')
            # 2 秒答高塔
            if W == 844 or (en and W == 667):
                anyMap = pg.evaluate("[0,1,2,3].some(L => SM.unitsOf(L).some(u => __sm.E.itemOn(__sm.S, u.id)))")
                pg.evaluate("document.querySelector('.w-mini button[data-z=\"speed\"]').click()"); pg.wait_for_timeout(500)
                t = pg.inner_text('#zGo'); dis = pg.is_disabled('#zGo')
                if anyMap:
                    check(t in ('去秒答地图', 'Go to Speed Map'), f'{tag} 高塔：有题的图时写「去秒答地图」（{t}）')
                    pg.click('#zGo'); pg.wait_for_timeout(600)
                    on = pg.evaluate("SM.unitsOf(__sm.S.level).some(u => __sm.E.itemOn(__sm.S, u.id))")
                    check(cur(pg) == 'home' and on, f'{tag} 进秒答地图停在有题的那张（第 {pg.evaluate("__sm.S.level")} 张）')
                else:
                    hard = not pg.evaluate("__sm.E.groupEmpty(__sm.S, 'speedH')")
                    check(t in (('去挑战', 'Go to challenge') if hard else ('这个难度没有题', 'No questions at this level')) and dis == (not hard), f'{tag} 高塔：4 张图都没题时写「{t}」')
                    n = pg.locator('#zSkills .zsk').count(); want = pg.evaluate("__sm.R.skillsOf(__sm.S, 'speedH').length"); ct = pg.inner_text('#zCt')
                    check(n == want and (en or ct.endswith(f'/ {pg.evaluate("__sm.R.groupStat(__sm.S, 'speedH').total")} 格')), f'{tag} 高塔卡片改列挑战的 {n} 个技能（应 {want}），{ct}')
                    if hard:
                        pg.click('#zGo'); pg.wait_for_timeout(2500)
                        check(cur(pg) in ('qplay', 'demo') and pg.evaluate("__sm.Q && String(__sm.Q.opts && __sm.Q.opts.group)") == 'speedH', f'{tag} 点了直接进挑战（{cur(pg)}）')
            # 4 思维地点
            pg.close()
    # 思维地点进门档位（中控 11-09：按进度，夹在所选范围里；审查 11-09：跳过低档后过关要能往上走）。预期值按 THINK_LEVEL 手算后写死，不照抄实现
    # THINK_LEVEL：balance [3,4,4,4]、target [2,4,4]、clue [2,3,5,5]、block [8,8,11,13]。(选的级别, 地点, 每档做对几题, 进门停第几档, 能点几档)
    TABLE = [
        ([], 'clue', [0, 3, 0, 0], 0, 3),                    # 没手选：按进度；跳过低档时已过关的下一档也能点（不收回）
        (list(range(1, 16)), 'balance', [0, 0, 0, 0], 0, 1),  # 全选 = 按进度，刚开始停第 0 档
        (list(range(1, 16)), 'block', [3, 3, 3, 3], 3, 4),
        (list(range(3, 9)), 'clue', [0, 0, 0, 0], 1, 2),      # 3–8：第 3 级那档是「四行」
        (list(range(3, 9)), 'clue', [0, 3, 0, 0], 2, 3),      # 过了「四行」→ 进门「粗线框」，能点（审查必须修 1）
        (list(range(3, 9)), 'clue', [0, 2, 0, 0], 1, 2),      # 学到一半：还在「四行」
        (list(range(3, 9)), 'target', [3, 0, 0], 1, 2),
        (list(range(3, 9)), 'block', [3, 3, 3, 3], 1, 4),     # 全部学会：最多停在第 8 级那档，档都能点
        (list(range(9, 13)), 'block', [0, 0, 0, 0], 1, 2),    # 9–12：至少从第 9 级那档起
        (list(range(9, 13)), 'block', [0, 3, 0, 0], 2, 3),
        (list(range(9, 13)), 'balance', [0, 0, 0, 0], 3, 4),
        ([1], 'block', [3, 3, 3, 0], 0, 4),                    # 所选范围里一档都没有：停第 0 档，已开放的不收回
    ]
    pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    for lv, mod, n, want, opens in TABLE:
        pg.goto(url); pg.evaluate("localStorage.clear()"); pg.evaluate(SEED, [lv, False])
        pg.evaluate(f"(() => {{ const S = JSON.parse(localStorage.getItem('speedmap.v2.test')); S.think = {{{mod!r}: {json.dumps(n)}}}; localStorage.setItem('speedmap.v2.test', JSON.stringify(S)); }})()")
        pg.reload(); pg.wait_for_timeout(700)
        pg.evaluate(f"document.querySelector('.w-mini button[data-z=\"{mod}\"]').click()"); pg.wait_for_timeout(400); pg.click('#zGo'); pg.wait_for_function("!document.getElementById('think').hidden", timeout=20000); pg.wait_for_timeout(400)
        tier = pg.evaluate('__sm.TH.G.tier'); can = pg.evaluate("[...document.querySelectorAll('#think [data-t]')].filter(b => !b.disabled).length")
        sel = f'第 {lv[0]}–{lv[-1]} 级' if lv else '自动'
        check(tier == want and can == opens, f'思维地点 {sel} {mod} 进度 {n}：进门第 {tier} 档（应 {want}），能点 {can} 档（应 {opens}）')
    pg.close()
    b.close()
print('页面报错：', errs[:5])
if errs: fails.append('页面报错')
print('通过' if not fails else f'失败 {len(fails)} 项'); sys.exit(1 if fails else 0)
