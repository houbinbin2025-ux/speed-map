# 导出进度带上碎片、宝石、伙伴罐（捣蛋鬼第 1 轮第 11 条）：家长区真点「导出 → 清空 → 导入」
# 三种情况（中控 11-08）：新备份导入新页面、旧备份（没有 gems）导入新页面、同一份备份导两次碎片不翻倍；外加整份替换
# 用法：python3 tools/e2e/e2e-backup-gems.py <项目根> <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
PIN = lambda pg: ([pg.click(f'#pinPad [data-k="{d}"]') for d in '123456'], pg.wait_for_timeout(200)) if pg.is_visible('#pinOv') else None   # 家长区密码（v2/lock.js），走查统一用这个输
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
PK, GK = 'speedmap.v2.test', 'speedmap.test.gems'
known = {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}
prog = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': known, 'settings': {'bilingual': False}, 'home': {'ore': 77}}
ink = {'done': True, 'samples': [], 'speed': 800}
gems = {'v': 1, 'inv': {'a': 3, 'b': 0, 'g': 0, 's': 10, 'm': 2, 'h': 1, 'l': 0}, 'tickets': 2, 'best': 5, 'lvMax': {}, 'days': {}, 'seen': {'day': '', 'keys': {}, 'cells': {}}, 'sent': {},
        'palJar': {'bal': 4, 'moved': {}, 'target': 3, 'res': {'day': '', 'n': 0}}}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
def hold(pg, sel, ms):
    bb = pg.locator(sel).bounding_box(); pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.mouse.down(); pg.wait_for_timeout(ms); pg.mouse.up(); pg.wait_for_timeout(300)
def fresh(pg, p, g):
    pg.goto(url); pg.evaluate(f"""localStorage.clear(); localStorage.setItem('{PK}', {json.dumps(json.dumps(p))}); localStorage.setItem('speedmap.ink.test', {json.dumps(json.dumps(ink))});
      {f"localStorage.setItem('{GK}', {json.dumps(json.dumps(g))});" if g else ''}""")
    pg.reload(); pg.wait_for_timeout(900)
def parent(pg):
    hold(pg, '#gear', 2200); PIN(pg)
def do_import(pg, text, kind='btnImport'):
    if pg.is_visible('#ioPanel'): pg.click('#ioClose'); pg.wait_for_timeout(150)   # 上一次的面板先关掉，和家长真用一样
    if kind == 'btnImportAll': pg.locator('#bkMoreBtn').click(); pg.wait_for_timeout(150)   # 整份替换收在「更多」里
    pg.locator('#' + kind).scroll_into_view_if_needed(); pg.click('#' + kind); pg.fill('#ioText', text); pg.locator('#ioApply').scroll_into_view_if_needed(); pg.click('#ioApply'); pg.wait_for_timeout(400)
    return pg.inner_text('#ioMsg')
inv = lambda pg: pg.evaluate("GEMUI.state().inv")
stored = lambda pg: pg.evaluate(f"JSON.parse(localStorage.getItem('{GK}'))")
with sync_playwright() as p:
    b = __import__('quiet').launch(p); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    # 0 导出：带上碎片和伙伴罐
    fresh(pg, prog, gems); parent(pg)
    pg.click('#btnExport'); pg.wait_for_timeout(200); text = pg.input_value('#ioText')
    o = json.loads(text)
    check(o.get('gems', {}).get('inv', {}).get('s') == 10 and o['gems']['palJar']['bal'] == 4 and o.get('home', {}).get('ore') == 77, '导出文字里有进度，也有碎片和伙伴罐')
    pg.screenshot(path=str(out / 'backup-export.png'))
    old = json.dumps({k: v for k, v in o.items() if k != 'gems'})   # 升级前导出的备份长这样
    # 1 新备份导入新页面（换设备）：碎片、伙伴罐都回来，进度里不混进 gems
    fresh(pg, dict(prog, home={'ore': 0}), None); parent(pg)
    check(inv(pg)['s'] == 0, '新设备：一开始没有碎片')
    msg = do_import(pg, text)
    check(msg == '已导入', '导入提示：' + msg)
    check(inv(pg)['s'] == 10 and inv(pg)['h'] == 1 and pg.evaluate("GEMUI.state().palJar.bal") == 4, '碎片和伙伴罐回来了：' + str(inv(pg)))
    check(stored(pg)['inv']['s'] == 10, '碎片已经存下来')
    check('gems' not in pg.evaluate(f"JSON.parse(localStorage.getItem('{PK}'))") and pg.evaluate(f"JSON.parse(localStorage.getItem('{PK}')).home.ore") == 77, '进度导进来了，进度里没有 gems 字段')
    # 2 同一份导两次：不翻倍
    do_import(pg, text)
    check(inv(pg)['s'] == 10 and inv(pg)['a'] == 3 and pg.evaluate("GEMUI.state().palJar.bal") == 4, '同一份导两次碎片不翻倍：' + str(inv(pg)))
    pg.reload(); pg.wait_for_timeout(900)
    check(inv(pg)['s'] == 10, '刷新后碎片还在')
    # 3 旧备份（没有 gems）导入新页面：进度照常导入，碎片完全不动
    mine = dict(gems, inv={'a': 0, 'b': 0, 'g': 0, 's': 1, 'm': 0, 'h': 0, 'l': 0})
    fresh(pg, dict(prog, home={'ore': 0}), mine); parent(pg)
    msg = do_import(pg, old)
    check(msg == '已导入' and pg.evaluate(f"JSON.parse(localStorage.getItem('{PK}')).home.ore") == 77, '旧备份照常导入进度：' + msg)
    check(inv(pg)['s'] == 1 and stored(pg)['inv']['s'] == 1, '旧备份不动本机碎片')
    # 4 整份替换：带了 gems 就整份换成备份里的
    do_import(pg, text, 'btnImportAll')
    check(inv(pg) == gems['inv'] or {k: v for k, v in inv(pg).items() if v} == {k: v for k, v in gems['inv'].items() if v}, '整份替换：碎片换成备份里的 ' + str(inv(pg)))
    pg.screenshot(path=str(out / 'backup-import.png'))
    # 5 备份里的碎片读不了：进度照样导入，提示碎片没导进来（审查 R1）
    bad = json.dumps(dict(json.loads(old), gems={'inv': 'x'}))
    msg = do_import(pg, bad)
    check(msg == '进度已导入，碎片没有导入' and inv(pg)['s'] == 10, '碎片读不了时提示：' + msg)
    b.close()
print('页面报错:', errs[:3])
if fails or errs: print('FAIL', len(fails), '项'); sys.exit(1)
print('PASS 备份带碎片（导出、新备份、旧备份、导两次、整份替换）')
