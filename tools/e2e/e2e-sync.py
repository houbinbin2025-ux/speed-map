# 家长一键同步（C 暂代 F，中控 11-08 派单）：两个浏览器当手机和 iPad，家长区真点「发送进度」「接收进度」
# 查：互相发一次两边一致、同一份收两次不翻倍、旧格式文件能收、不能分享时退回下载、超过 3 天的提示只在家长区
# 用法：python3 tools/e2e/e2e-sync.py <项目根> <截图目录>
import sys, json, pathlib, time
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
PK, GK, SK = 'speedmap.v2.test', 'speedmap.test.gems', 'speedmap.v2.test.sync'
ink = {'done': True, 'samples': [], 'speed': 800}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
# 分享面板换成记录：发送时把文件内容留在 window.__sent（真机上这一步是系统分享面板 / 隔空投送）
SHARE = "navigator.canShare = () => true; navigator.share = async o => { window.__sent = {name: o.files[0].name, text: await o.files[0].text()}; };"
def seed(pg, skills, mists, inv):
    st = pg.evaluate("""([skills, mists]) => { const S = {v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, skills: {}, stats: {}, settings: {bilingual: false}};
      skills.forEach(([sid, lv]) => __sm.K.BY[sid].items.forEach(i => { S.skills[i.id] = {lv, d: ['2026-09-01', '2026-09-02', '2026-09-06'].slice(0, lv), seen: 3, lastDay: '2026-09-06', win: []}; }));
      mists.forEach(([sid, n]) => { const it = __sm.K.BY[sid].items[0]; for (let k = 0; k < n; k++) { const key = it.id + ':m' + k; S.mistakes[key] = {key, uid: it.id, src: sid, q: 'q' + k, ans: k, passes: 0, due: '2026-09-07', added: '2026-09-06', last: '2026-09-06'}; } });
      return JSON.stringify(S); }""", [skills, mists])
    g = {'v': 1, 'inv': inv, 'tickets': 0, 'best': 0, 'lvMax': {}, 'days': {}, 'seen': {'day': '', 'keys': {}, 'cells': {}}, 'sent': {}}
    pg.evaluate(f"""s => {{ localStorage.clear(); localStorage.setItem('{PK}', s); localStorage.setItem('speedmap.ink.test', {json.dumps(json.dumps(ink))}); localStorage.setItem('{GK}', {json.dumps(json.dumps(g))}); }}""", st)
def open_dev(b, share=True):
    ctx = b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, accept_downloads=True)
    if share: ctx.add_init_script(SHARE)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(url); pg.wait_for_timeout(500)
    return ctx, pg
def parent(pg):
    bb = pg.locator('#gear').bounding_box(); pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.mouse.down(); pg.wait_for_timeout(2200); pg.mouse.up(); pg.wait_for_timeout(400)
def send(pg):
    pg.evaluate("window.__sent = null"); pg.locator('#btnSyncOut').scroll_into_view_if_needed(); pg.click('#btnSyncOut'); pg.wait_for_timeout(400)
    return pg.evaluate("window.__sent")
def receive(pg, path):
    pg.locator('#btnSyncIn').scroll_into_view_if_needed()
    with pg.expect_file_chooser() as fc: pg.click('#btnSyncIn')
    fc.value.set_files(str(path)); pg.wait_for_timeout(600)
    return pg.inner_text('#syncMsg')
def state(pg):   # 两边要一致的：每格档位、错题、碎片背包
    return pg.evaluate("({lv: Object.fromEntries(Object.entries(__sm.S.skills).map(([k, v]) => [k, v.lv]).sort()), mist: Object.keys(__sm.S.mistakes).sort(), inv: GEMUI.state().inv, lit: [__sm.S.cards, __sm.S.skills].reduce((n, o) => n + Object.values(o || {}).filter(c => c && c.lv > 0).length, 0)})")
with sync_playwright() as p:
    b = p.chromium.launch()
    ca, A = open_dev(b); cb, B = open_dev(b)
    seed(A, [['look1', 2], ['cmp1', 1]], [['cmp1', 1]], {'a': 5, 'b': 0, 'g': 0, 's': 0, 'm': 0, 'h': 0, 'l': 0}); A.reload(); A.wait_for_timeout(800)
    seed(B, [['look1', 3], ['look3', 2]], [['look3', 2]], {'a': 1, 'b': 0, 'g': 0, 's': 4, 'm': 0, 'h': 0, 'l': 0}); B.reload(); B.wait_for_timeout(800)
    parent(A); parent(B)
    check(B.inner_text('#syncInfo') == '还没在两台设备之间同步过', '没同步过：' + B.inner_text('#syncInfo'))
    B.locator('#syncInfo').locator('xpath=..').screenshot(path=str(out / 'sync-parent.png'))   # 只截「进度备份」这一栏
    # 1 手机发给 iPad
    fa = send(A)
    check(bool(fa) and fa['name'].startswith('空空数学岛-进度-') and fa['name'].endswith('.json') and json.loads(fa['text']).get('gems'), '发送：调起分享，文件名带日期，内容带碎片：' + (fa or {}).get('name', '没发出'))
    check(A.evaluate("__sm.S.lastBackup") > 0 and A.inner_text('#syncMsg') == '已发送', '发送后算一次备份：' + A.inner_text('#syncMsg'))
    pa = out / 'from-phone.json'; pa.write_text(fa['text'], encoding='utf-8')
    b0 = state(B); msg = receive(B, pa); b1 = state(B)
    check(msg.startswith('已合并：新增 ') and '格点亮' in msg and '1 道错题' in msg and '碎片 +4' in msg, '接收结果一句话：' + msg)
    check(b1['lit'] > b0['lit'] and len(b1['mist']) == 3 and b1['inv']['a'] == 5 and b1['inv']['s'] == 4, f'iPad 合并后只增不减：{b0["lit"]}→{b1["lit"]} 格，错题 {len(b1["mist"])}，碎片 {b1["inv"]}')
    check(B.inner_text('#syncInfo').startswith('上次同步：今天'), '上次同步：' + B.inner_text('#syncInfo'))
    B.locator('#syncInfo').locator('xpath=..').screenshot(path=str(out / 'sync-received.png'))   # 只截「进度备份」这一栏
    # 2 iPad 发回手机：两边一致
    fb = send(B); pb = out / 'from-ipad.json'; pb.write_text(fb['text'], encoding='utf-8')
    receive(A, pb)
    sa, sb = state(A), state(B)
    check(sa == sb, '互相发一次，两边一致：' + ('一致' if sa == sb else f'{sa} ≠ {sb}'))
    # 3 同一份收两次：不翻倍
    msg = receive(B, pa)
    check(state(B) == sb and msg == '已合并：没有新内容，两台设备的进度已经一致', '同一份收两次不翻倍：' + msg)
    # 4 旧格式文件（升级前的导出文字，没有碎片）
    cc, Cpg = open_dev(b); seed(Cpg, [['look4', 1]], [], {'a': 2, 'b': 0, 'g': 0, 's': 0, 'm': 0, 'h': 0, 'l': 0}); Cpg.reload(); Cpg.wait_for_timeout(800)
    old = {k: v for k, v in json.loads(fa['text']).items() if k != 'gems'}; po = out / 'old.json'; po.write_text(json.dumps(old), encoding='utf-8')
    parent(Cpg); i0 = state(Cpg)['inv']; msg = receive(Cpg, po)
    check(msg.startswith('已合并：新增 ') and state(Cpg)['inv'] == i0, '旧格式文件能收，碎片不动：' + msg)
    # 5 不是进度文件
    bad = out / 'bad.json'; bad.write_text('{"x":1}', encoding='utf-8')
    check(receive(Cpg, bad) == '这个文件不是进度文件，请重新选择', '选错文件有提示')
    # 6 不能分享文件的浏览器：退回下载
    cd, D = open_dev(b, share=False); seed(D, [['look1', 1]], [], {'a': 0, 'b': 0, 'g': 0, 's': 0, 'm': 0, 'h': 0, 'l': 0}); D.reload(); D.wait_for_timeout(800); parent(D)
    D.evaluate("navigator.canShare = undefined")
    D.locator('#btnSyncOut').scroll_into_view_if_needed()
    with D.expect_download() as dl: D.click('#btnSyncOut')
    check(dl.value.suggested_filename.startswith('空空数学岛-进度-') and D.inner_text('#syncMsg').startswith('已下载进度文件'), '不能分享：下载文件 ' + dl.value.suggested_filename)
    # 7 超过 3 天没同步：家长区轻提示；孩子的首页不出现
    D.evaluate(f"localStorage.setItem('{SK}', String(Date.now() - 4 * 864e5))"); D.reload(); D.wait_for_timeout(900)
    check('同步' not in D.inner_text('body'), '首页（孩子看到的）没有同步提示')
    parent(D)
    check(D.inner_text('#syncInfo').startswith('上次同步：4 天前') and D.is_visible('#syncInfo .syncOld'), '家长区：' + D.inner_text('#syncInfo').replace('\n', ' / '))
    D.locator('#syncInfo').locator('xpath=..').screenshot(path=str(out / 'sync-old.png'))   # 只截「进度备份」这一栏
    b.close()
print('页面报错:', errs[:3])
if fails or errs: print('FAIL', len(fails), '项'); sys.exit(1)
print('PASS 家长一键同步（发送、接收、互发一致、不翻倍、旧格式、下载、超过 3 天提示）')
