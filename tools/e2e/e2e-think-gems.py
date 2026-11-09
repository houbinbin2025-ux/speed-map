# 思维地点答对给碎片、算有效时间（宝石规则 10.2，中控 11-08）。用法：python3 tools/e2e/e2e-think-gems.py <项目根> <截图目录>
# 做对：+1 个金色小碎片、有效时间增加；「不会」：不给；同一题当天再做：普通小碎片；口答模式也给（Ben 11-08）
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
known = {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}
seed = {'v': 2, 'savedAt': 0, 'cards': {'keep': {'lv': 2}}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': known, 'settings': {'bilingual': False}}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
T = '#think '
def tap(pg, sel): pg.click(T + sel)
def solve(pg):   # 天平桥（和 e2e-v8.py 同样的解法）
    x = pg.evaluate('JSON.parse(JSON.stringify(__sm.TH.G.q))')
    if x['kind'] == 'judge': tap(pg, '#yes' if x['equal'] else '#no')
    elif x['kind'] == 'fill': tap(pg, f'[data-n="{x["answer"]}"]')
    elif x['kind'] == 'blind': tap(pg, f'[data-n="{x["answer"]}"]'); tap(pg, '#weigh')
    else: a, c = pg.evaluate('PUZZLES.altPair(__sm.TH.G.q)'); tap(pg, f'[data-n="{a}"]'); tap(pg, f'[data-n="{c}"]')
day = lambda pg: pg.evaluate("(()=>{const d=GEMUI.state().days;return d[Object.keys(d).sort().pop()]||{}})()")
inv = lambda pg: pg.evaluate("GEMUI.state().inv")
with sync_playwright() as p:
    b = __import__('quiet').launch(p); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(600)
    pg.click('.w-mini button[data-z="balance"]'); pg.wait_for_timeout(700); pg.click('#zGo'); pg.wait_for_function("!document.getElementById('think').hidden", timeout=9000); pg.wait_for_timeout(650)
    i0, d0 = inv(pg), day(pg)
    pg.wait_for_timeout(2500)   # 想一会儿再答
    solve(pg); pg.wait_for_timeout(300)
    i1, d1 = inv(pg), day(pg)
    check(pg.evaluate('__sm.TH.G.done') and i1['b'] == i0['b'] + 1, f'做对：+1 个金色小碎片 {i0["b"]}→{i1["b"]}')
    check((d1.get('sec') or 0) - (d0.get('sec') or 0) >= 2, f'有效时间算进去：{d0.get("sec")}→{d1.get("sec")}')
    check((d1.get('ok') or 0) == (d0.get('ok') or 0) and (d1.get('n') or 0) == (d0.get('n') or 0), '不计入当天正确率（答对数、作答数不变）')
    pg.screenshot(path=str(out / 'think-ok.png'))
    # 同一题当天再做：普通小碎片（直接把同一题再交一次）
    pg.evaluate("(()=>{const G=__sm.TH.G; clearTimeout(G.autoT); G.autoT=null; G.got=false; G.done=false; G.tap=0; G.st={};})()"); solve(pg); pg.wait_for_timeout(300)   # 停掉自动下一题、绕开防连点，把同一题再交一次
    i2 = inv(pg); check(i2['a'] == i1['a'] + 1 and i2['b'] == i1['b'], f'同一题再做：普通小碎片 {i2}')
    # 不会：不给
    pg.wait_for_timeout(1700); i3 = inv(pg)
    tap(pg, '#dunno'); pg.wait_for_timeout(300)
    check(inv(pg) == i3, '点「不会」：不给碎片')
    # 口答模式：也给（Ben 11-08：所有题都有激励）
    pg.wait_for_timeout(700)   # 「不会」后有 0.5 秒防连点，太快点「继续」会被挡掉、题目不换（原来这里查「不给」，被挡掉也会误报通过）
    pg.evaluate("__sm.S.oral = true"); pg.click(T + '#cont'); pg.wait_for_timeout(700); i4 = inv(pg)
    check(not pg.evaluate('__sm.TH.G.done'), '换到新题了')
    solve(pg); pg.wait_for_timeout(300)
    check(pg.evaluate('__sm.TH.G.got') and sum(inv(pg).values()) > sum(i4.values()), '口答模式：也给碎片')
    # 试错后才对：普通小碎片（同练习页「答错后改对」）
    pg.evaluate("__sm.S.oral = false"); pg.wait_for_timeout(1900)   # 做对后 1.5 秒自动进下一题
    pg.evaluate("(()=>{const c=document.querySelector('#think #cont'); if (c) c.click();})()"); pg.wait_for_timeout(400); i5 = inv(pg)
    pg.evaluate("(()=>{const G=__sm.TH.G; G.wrong = 2; G.tap = 0;})()"); solve(pg); pg.wait_for_timeout(300); i6 = inv(pg)
    check(i6['a'] == i5['a'] + 1 and i6['b'] == i5['b'], f'试错后才对：普通小碎片 {i5}→{i6}')
    b.close()
print('页面报错:', errs[:3])
if fails or errs: print('FAIL', len(fails), '项'); sys.exit(1)
print('PASS 思维地点答对给碎片（10.2）')
