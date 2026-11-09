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
SEED = """lv => { const S = {v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 3, mistakes: {}, lastBackup: Date.now(), placedAt: 1, known: {}, skills: {}, stats: {}, settings: {bilingual: false}};
  if (lv.length) { S.settings.levels = lv; S.settings.levelsV = 2; }
  localStorage.setItem('speedmap.v2.test', JSON.stringify(S)); localStorage.setItem('speedmap.ink.test', JSON.stringify({done: true, samples: [], speed: 800})); }"""
cur = lambda pg: pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]")
GROUPS = ['look', 'bond', 'place', 'cmp', 'line', 'garden', 'market', 'dock']
with sync_playwright() as p:
    b = p.chromium.launch()
    for W, H in [(667, 375), (844, 390), (1194, 834)]:
        for lv in [[1], [4], [8], [9], [12], list(range(1, 16))]:
            pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True); tag = f'{W}x{H} 第 {lv[0]}–{lv[-1]} 级'
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(url); pg.evaluate("localStorage.clear()"); pg.evaluate(SEED, lv); pg.reload(); pg.wait_for_timeout(700)
            # 1 地块卡片：列出的技能 = R.skillsOf；格数一致；卡片在屏内
            for g in GROUPS:
                pg.evaluate(f"document.querySelector('.w-mini button[data-z=\"{g}\"]').click()"); pg.wait_for_timeout(500)
                n = pg.locator('#zSkills .zsk').count(); want = pg.evaluate(f"__sm.R.skillsOf(__sm.S, '{g}').length")
                ct = pg.inner_text('#zCt'); tot = pg.evaluate(f"__sm.R.groupStat(__sm.S, '{g}').total")
                bb = pg.locator('#zSheet').bounding_box(); go = pg.locator('#zGo').bounding_box()
                check(n == want and ct.endswith(f'/ {tot} 格'), f'{tag} {g} 卡片 {n} 个技能（应 {want}），{ct}')
                check(bb['y'] >= -1 and go['y'] + go['height'] <= H + 1, f'{tag} {g} 卡片和「练这一块」在屏内（卡片顶 {bb["y"]:.0f}，按钮底 {go["y"] + go["height"]:.0f}）')
                if g == 'dock' and lv[0] in (9, 1) and lv[-1] == 15: pg.screenshot(path=str(out / f'{W}x{H}-dock-{lv[0]}-{lv[-1]}.png'))
                pg.click('#zX'); pg.wait_for_timeout(300)
            signs = pg.evaluate("Math.max(...[...document.querySelectorAll('.w-sign .row')].map(r => r.children.length))")
            check(signs <= 10, f'{tag} 木牌最多 10 格（{signs}）')
            # 2 秒答高塔
            if W == 844:
                anyMap = pg.evaluate("[0,1,2,3].some(L => SM.unitsOf(L).some(u => __sm.E.itemOn(__sm.S, u.id)))")
                pg.evaluate("document.querySelector('.w-mini button[data-z=\"speed\"]').click()"); pg.wait_for_timeout(500)
                t = pg.inner_text('#zGo'); dis = pg.is_disabled('#zGo')
                if anyMap:
                    check(t == '去秒答地图', f'{tag} 高塔：有题的图时写「去秒答地图」（{t}）')
                    pg.click('#zGo'); pg.wait_for_timeout(600)
                    on = pg.evaluate("SM.unitsOf(__sm.S.level).some(u => __sm.E.itemOn(__sm.S, u.id))")
                    check(cur(pg) == 'home' and on, f'{tag} 进秒答地图停在有题的那张（第 {pg.evaluate("__sm.S.level")} 张）')
                else:
                    hard = not pg.evaluate("__sm.E.groupEmpty(__sm.S, 'speedH')")
                    check(t == ('去挑战' if hard else '这个难度没有题') and dis == (not hard), f'{tag} 高塔：4 张图都没题时写「{t}」')
                    if hard:
                        pg.click('#zGo'); pg.wait_for_timeout(2500)
                        check(cur(pg) in ('qplay', 'demo') and pg.evaluate("__sm.Q && String(__sm.Q.opts && __sm.Q.opts.group)") == 'speedH', f'{tag} 点了直接进挑战（{cur(pg)}）')
            # 4 思维地点
            if W == 844:
                pg.reload(); pg.wait_for_timeout(700)
                for mod in ['balance', 'target', 'clue', 'block']:
                    pg.evaluate(f"document.querySelector('.w-mini button[data-z=\"{mod}\"]').click()"); pg.wait_for_timeout(400); pg.click('#zGo'); pg.wait_for_function("!document.getElementById('think').hidden", timeout=9000); pg.wait_for_timeout(400)
                    tier = pg.evaluate('__sm.TH.G.tier'); want = pg.evaluate(f"(() => {{ const top = Math.max(...{json.dumps(lv)}); let t = -1; SKILLS.THINK_LEVEL['{mod}'].forEach((n, i) => {{ if (n <= top) t = i; }}); return Math.max(0, t); }})()")
                    en = pg.evaluate("[...document.querySelectorAll('#think [data-t]')].filter(b => !b.disabled).length")
                    check(tier == want and en >= want + 1, f'{tag} 思维地点 {mod} 默认第 {tier} 档（应 {want}），能点 {en} 档')
                    pg.click('#think #back'); pg.wait_for_timeout(600)
            pg.close()
    b.close()
print('页面报错：', errs[:5])
if errs: fails.append('页面报错')
print('通过' if not fails else f'失败 {len(fails)} 项'); sys.exit(1 if fails else 0)
