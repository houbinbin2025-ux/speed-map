# 每类题答对都有碎片（Ben 11-08：「所有的作业都有激励」）：真页面里逐类答对一题，看背包碎片有没有涨
# 摸底走真按钮（首页「开始」→ 摸底说明「开始」→ 答一题）；Boss、老流程摸底（scan / final）、口答模式用页面里真的碎片模块按各自题型调一次
# 用法：python3 tools/e2e/e2e-all-gems.py <项目根> <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
ink = {'done': True, 'samples': [], 'speed': 800}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
total = lambda pg: pg.evaluate("Object.values(GEMUI.state().inv).reduce((n, x) => n + (x || 0), 0)")
with sync_playwright() as p:
    b = __import__('quiet').launch(p); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    # 1 摸底（新孩子第一次进来）：真点按钮进摸底，答对一题
    fresh = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'known': {}, 'settings': {'bilingual': False}}
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(fresh))}); localStorage.setItem('speedmap.ink.test', {json.dumps(json.dumps(ink))})"); pg.reload(); pg.wait_for_timeout(700)
    pg.click('#btnStart'); pg.wait_for_timeout(2200)
    if pg.is_visible('#piGo'): pg.click('#piGo'); pg.wait_for_timeout(900)
    kind = pg.evaluate("__sm.Q && __sm.Q.kind")
    t0 = total(pg); pg.evaluate("__sm.Q.t0 = performance.now(); __sm.Q.ms = 500; __sm.resolve({ok: true, fast: true})"); pg.wait_for_timeout(300)
    check(kind == 'place' and total(pg) == t0 + 1, f'摸底答对给 1 个小碎片：{kind}，{t0}→{total(pg)}'); pg.screenshot(path=str(out / 'place.png'))
    check(pg.evaluate("Object.keys(GEMUI.state().days).length") == 0, '摸底不进当天统计（正确率、闪电次数）')
    # 2 其余题型：用页面里真的碎片模块，按 Boss / 老流程摸底 / 口答各答对一题
    inst = "(() => { const s = __sm.K.SKILLS.find(s => s.items && s.items.length && !s.speed); const it = s.items[0]; return {id: it.id, q: it.q || {}, ans: it.ans}; })()"
    for k in ['boss', 'scan']:   # 最终 Boss 也是 'boss'；scan = 秒答区摸底
        t0 = total(pg)
        got = pg.evaluate(f"(() => {{ const i = {inst}; return GEMUI.answerP({{kind: '{k}', ms: 900, result: 'fast'}}, i, {{id: i.id}}, 5000); }})()")
        check(bool(got and got.get('got')) and total(pg) > t0, f'{k} 答对给碎片：{(got or {}).get("got")}')
    check(pg.evaluate("GEMUI.summary({kind: 'boss', gem: {}}, __sm.today()) !== ''"), 'Boss 结算页也显示碎片')
    # 老流程（秒答区加法练习）口答：真点「看答案」→「下一题」（审查 11-08：原来口答绕开发碎片那一步）
    # 口答开关在打开页面前写进存档（运行中改再刷新，可能被关页时的自动保存盖回去，走查不稳）
    pg.close(); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    oral = dict(fresh, placedAt=1, oral=True)
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(oral))}); localStorage.setItem('speedmap.ink.test', {json.dumps(json.dumps(ink))})"); pg.reload(); pg.wait_for_timeout(800)
    check(pg.evaluate("__sm.S.oral === true"), '口答模式已打开')
    started = pg.evaluate("(() => { const b = document.querySelector('[data-series=add]'); if (!b) return false; b.click(); return true; })()"); pg.wait_for_timeout(1500)
    t0 = total(pg); n = 0
    for _ in range(3):
        if not pg.evaluate("!!(__sm.P && __sm.P.phase === 'q')"): break
        pg.evaluate("document.getElementById('oralTap').click()"); pg.wait_for_timeout(250)
        pg.evaluate("document.getElementById('btnOralNext').click()"); pg.wait_for_timeout(900); n += 1
    check(started and n == 3 and total(pg) > t0, f'秒答区口答真点按钮答对 {n} 题给碎片：{t0}→{total(pg)}')
    t0 = total(pg)
    got = pg.evaluate(f"(() => {{ const i = {inst}; return GEMUI.answerP({{kind: 'daily', ms: 900, result: 'fast'}}, Object.assign(i, {{id: i.id + '#oral'}}), {{id: i.id}}, 5000); }})()")
    check(bool(got) and got.get('got') == ['b'] and total(pg) == t0 + 1, f'口答模式答对给 1 个小碎片、没有秒答奖励：{(got or {}).get("got")}')
    t0 = total(pg)
    got = pg.evaluate(f"(() => {{ const i = {inst}; return GEMUI.answerP({{kind: 'daily', ms: 900, result: 'wrong'}}, Object.assign(i, {{id: i.id + '#bad'}}), {{id: i.id}}, 5000); }})()")
    check(not (got and got.get('got')) and total(pg) == t0, '答错不给')
    b.close()
print('页面报错:', errs[:3])
if fails or errs: print('FAIL', len(fails), '项'); sys.exit(1)
print('PASS 每类题答对都有碎片（摸底、Boss、老流程摸底、口答）')
