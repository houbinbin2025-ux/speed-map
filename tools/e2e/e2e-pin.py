# 家长区密码（v2/lock.js；docs/说明书-家长区密码.md）：真点每个入口
#   入口：首页齿轮长按 2 秒（唯一入口）；家长区里的子页（能力观察、错题分析、题库）在没解锁时被 show() 兜底拦下
#   输对能进、输错进不去（提示、清空、不锁死）、删除、取消、键盘输入、刷新后要重输、App 注入的面板只在家长区里
#   6 种尺寸：每个键 elementFromPoint 点得到、浮层不出屏
# 用法：python3 tools/e2e/e2e-pin.py <项目根> <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '#test'
PK = 'speedmap.v2.test'
prog = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': {'look1': True}, 'settings': {'bilingual': False}}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
def hold(pg, sel, ms):
    bb = pg.locator(sel).bounding_box(); pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.mouse.down(); pg.wait_for_timeout(ms); pg.mouse.up(); pg.wait_for_timeout(250)
def fresh(pg, en=False):
    p = dict(prog, settings={'bilingual': en})
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('{PK}', {json.dumps(json.dumps(p))})"); pg.reload(); pg.wait_for_timeout(900)
HIT = """sel => { const el = document.querySelector(sel); if (!el) return {miss: true}; const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y);
  return {ok: !!t && (t === el || el.contains(t)), x, y, w: r.width, h: r.height, inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5}; }"""
def key(pg, k):
    h = pg.evaluate(HIT, f'#pinPad [data-k="{k}"]'); pg.mouse.click(h['x'], h['y']); pg.wait_for_timeout(60)
def typ(pg, s):
    for k in s: key(pg, k)
    pg.wait_for_timeout(150)
cur = lambda pg: pg.evaluate("['island','parent','habit','mistp','bankv'].find(id => !document.getElementById(id).hidden) || 'other'")
dots = lambda pg: pg.evaluate("document.querySelectorAll('#pinDots i.on').length")

def flow(pg, tag):
    fresh(pg)
    # 齿轮长按 → 先问密码，家长区不出来
    hold(pg, '#gear', 2200)
    check(pg.is_visible('#pinOv') and cur(pg) == 'island', f'{tag} 长按齿轮先出密码，家长区不出来')
    check(pg.inner_text('#pinTitle') == '家长密码' and '6 位' in pg.inner_text('#pinMsg'), f'{tag} 标题和提示')
    pg.screenshot(path=str(out / f'{tag}-1-密码.png'))
    # 每个键都点得到、在屏内
    for k in '1234567890xd':
        h = pg.evaluate(HIT, f'#pinPad [data-k="{k}"]')
        if not (h['ok'] and h['inView'] and h['w'] >= 72 and h['h'] >= 56): check(False, f'{tag} 键 {k} 点不到或出屏或小于说明书的 72×56 {h}')
    check(True, f'{tag} 12 个键都点得到、在屏内、不小于 72×56')
    # 输错：提示、清空、还在浮层
    typ(pg, '654321')
    check(pg.inner_text('#pinMsg') == '密码错误' and dots(pg) == 0 and pg.is_visible('#pinOv') and cur(pg) == 'island', f'{tag} 输错：提示「密码错误」、清空、进不去')
    pg.screenshot(path=str(out / f'{tag}-2-输错.png'))
    # 连错 5 次也不锁死
    for _ in range(5): typ(pg, '000000')
    check(pg.is_visible('#pinOv'), f'{tag} 连错 5 次浮层还在（不锁死）')
    # 删除
    typ(pg, '12'); key(pg, 'd'); check(dots(pg) == 1, f'{tag} 删除一位')
    key(pg, 'd'); key(pg, 'd'); check(dots(pg) == 0, f'{tag} 空了再删不报错')
    # 输对 → 进家长区
    typ(pg, '123456')
    check(not pg.is_visible('#pinOv') and cur(pg) == 'parent', f'{tag} 输对进家长区')
    # 这次打开期间不再问：返回再进
    pg.click('#parBack'); pg.wait_for_timeout(300); hold(pg, '#gear', 2200)
    check(not pg.is_visible('#pinOv') and cur(pg) == 'parent', f'{tag} 同一次打开再进不问密码')
    # 子页能进
    pg.click('#btnHabit'); pg.wait_for_timeout(200); check(cur(pg) == 'habit', f'{tag} 解锁后能进能力观察'); pg.click('#habBack'); pg.wait_for_timeout(200)
    # 刷新 → 要重输
    pg.reload(); pg.wait_for_timeout(900); hold(pg, '#gear', 2200)
    check(pg.is_visible('#pinOv') and cur(pg) == 'island', f'{tag} 刷新后要重输')
    # 取消
    key(pg, 'x'); pg.wait_for_timeout(150); check(not pg.is_visible('#pinOv') and cur(pg) == 'island', f'{tag} 取消回到岛上')
    # 兜底：没解锁时，家长区里的子页入口被拦（模拟以后哪里多出一个入口直接调这些按钮）
    for btn, scr in [('btnHabit', 'habit'), ('btnMistP', 'mistp')]:
        pg.evaluate(f"document.getElementById('{btn}').click()"); pg.wait_for_timeout(150)
        check(pg.is_visible('#pinOv') and cur(pg) == 'island', f'{tag} 没解锁直接触发 {btn}：先问密码，{scr} 不出来')
        key(pg, 'x'); pg.wait_for_timeout(100)
    pg.evaluate("(() => { const g = document.getElementById('bankGo'); if (!g.querySelector('[data-bg]')) g.innerHTML = '<button data-bg=\"look\">look</button>'; g.querySelector('[data-bg]').click(); })()"); pg.wait_for_timeout(150)   # 题库按钮在打开家长区时才画，刷新后先放一个同样的
    check(pg.is_visible('#pinOv') and cur(pg) == 'island', f'{tag} 没解锁直接触发题库入口：先问密码')
    typ(pg, '123456'); check(cur(pg) == 'bankv', f'{tag} 题库入口输对后进题库')
    # 键盘输入（iPad 外接键盘）
    pg.reload(); pg.wait_for_timeout(900); hold(pg, '#gear', 2200)
    for c in '123450': pg.keyboard.press(c)
    pg.wait_for_timeout(150); check(pg.inner_text('#pinMsg') == '密码错误', f'{tag} 键盘输错')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); check(not pg.is_visible('#pinOv'), f'{tag} Esc 取消')
    hold(pg, '#gear', 2200)
    for c in '123456': pg.keyboard.press(c)
    pg.wait_for_timeout(200); check(cur(pg) == 'parent', f'{tag} 键盘输对进家长区')

def flow_en(pg, tag):
    # 单日英文、双日中文：用测试条快进 0 天和 1 天，两种都走一遍
    for step in (0, 1):
        fresh(pg, en=True)
        if step: pg.evaluate("document.querySelector('#testBar [data-t=\"day+1\"]').click()"); pg.wait_for_timeout(300); pg.reload(); pg.wait_for_timeout(900)
        t = pg.evaluate("__sm.today()"); odd = int(t[-2:]) % 2 == 1
        hold(pg, '#gear', 2200)
        title = pg.inner_text('#pinTitle'); msg = pg.inner_text('#pinMsg')
        if odd: check(title == 'Parent passcode' and msg == 'Enter the 6-digit parent passcode', f'{tag} 单日英文（{t}）：{title} / {msg}')
        else: check(title == '家长密码' and msg == '输入 6 位家长密码', f'{tag} 双日中文（{t}）：{title} / {msg}')
        typ(pg, '111111'); m2 = pg.inner_text('#pinMsg'); check(m2 == ('Incorrect passcode' if odd else '密码错误'), f'{tag} 输错提示（{t}）：{m2}')
        btn = pg.inner_text('#pinPad [data-k="x"]'); check(btn == ('Cancel' if odd else '取消'), f'{tag} 取消键（{t}）：{btn}')
        pg.screenshot(path=str(out / f'{tag}-3-{"英文" if odd else "中文"}.png'))

with sync_playwright() as p:
    b = __import__('quiet').launch(p)   # 统一启动方式（tests/e2e-quiet.test.js）
    for tag, vw in [('se', (667, 375)), ('iphone', (844, 390)), ('max', (932, 430)), ('ipad', (1194, 834)), ('ipad13', (1366, 1024))]:   # 竖屏整页被「把屏幕横过来」盖住（index.html .w-turn），不测
        pg = b.new_page(viewport={'width': vw[0], 'height': vw[1]}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        flow(pg, tag)
        if tag in ('iphone', 'ipad'): flow_en(pg, tag)
        pg.close()
    # App：方块世界时长面板（ios/world-entry.js）只在家长区里 → 跟着锁。需先 bash ios/sync-web.sh
    web = root / 'ios' / 'web' / 'index.html'
    if web.exists():
        pg = b.new_page(viewport={'width': 1194, 'height': 834}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)) if 'pointer lock' not in str(e).lower() else None)
        pg.add_init_script("window.webkit = { messageHandlers: { backup: { postMessage() {} } } }; window.__kongK = () => 1;")
        pg.goto(web.as_uri()); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2', {json.dumps(json.dumps(prog))})"); pg.reload(); pg.wait_for_timeout(900)
        inside = pg.evaluate("(() => { const w = document.getElementById('worldPanel'); return !!w && document.getElementById('parent').contains(w); })()")
        check(inside, 'App：方块世界时长面板在家长区里面')
        hold(pg, '#gear', 2200); check(pg.is_visible('#pinOv') and not pg.is_visible('#worldPanel'), 'App：长按齿轮先问密码，方块世界面板看不到')
        typ(pg, '123456'); check(pg.is_visible('#worldPanel'), 'App：输对后看得到方块世界面板')
        pg.close()
    else: print('跳过 App 部分：先跑 bash ios/sync-web.sh')
    b.close()
check(not errs, f'页面无报错 {errs[:3]}')
print(f'\n{len(fails)} 项失败' if fails else '\n全部通过')
sys.exit(1 if fails else 0)
