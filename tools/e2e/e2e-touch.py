# 手指搭在屏幕上时也要点得动（Ben 11-07，iPhone）。用法：python3 tools/e2e/e2e-touch.py <项目根>
# iOS 实测：一根手指按在屏幕上时，另一根手指点按钮只有按下和抬起，没有 click。这里派发同样的事件序列（派发的事件不会产生 click）
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); url = (root / 'v2' / 'index.html').as_uri() + '#test'
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': {'look1': True}, 'settings': {'bili': False}}
fails = []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
PE = """window.pe = (el, type, id, primary) => { const r = el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, pointerId: id, isPrimary: primary, pointerType: 'touch', clientX: r.x + r.width / 2, clientY: r.y + r.height / 2})); };
  window.$ = id => document.getElementById(id);"""
def opened(pg): return pg.evaluate("$('island').hidden || getComputedStyle($('island')).display === 'none'")
def panel(pg): return pg.evaluate("[...document.querySelectorAll('#island .w-zone, #zone, #zGo')].some(e => e.getClientRects().length > 0 && e.getBoundingClientRect().width > 0 && e.offsetParent !== null)")
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    def fresh():
        ctx = b.new_context(viewport={'width': 844, 'height': 340}); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script(f"localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); localStorage.setItem('speedmap.ink.test', '{{\"done\":true}}');")
        pg.goto(url); pg.wait_for_timeout(500); pg.evaluate(PE); return ctx, pg, errs
    # 1 手指搭在地图上，另一根手指点开始，能进关卡
    ctx, pg, errs = fresh()
    pg.evaluate("pe($('wVp'), 'pointerdown', 1, true); pe($('btnStart'), 'pointerdown', 2, false); pe($('btnStart'), 'pointerup', 2, false);")
    pg.wait_for_timeout(120); pg.evaluate("pe($('wVp'), 'pointerup', 1, true)")
    pg.wait_for_timeout(3500); check(opened(pg), '手指搭在地图上，另一根手指点开始，能进关卡'); check(not errs, f'没有脚本报错 {errs[:1]}'); ctx.close()
    # 2 进关卡途中搭着的手指抬起，岛不能锁死
    ctx, pg, errs = fresh()
    pg.evaluate("pe($('wVp'), 'pointerdown', 1, true)"); pg.click('#btnStart'); pg.wait_for_timeout(80); pg.evaluate("pe($('wVp'), 'pointerup', 1, true)")
    pg.wait_for_timeout(2000); check(opened(pg), '进关卡途中搭着的手指抬起，2 秒内进关卡（不靠 3 秒兜底）'); ctx.close()
    # 3 进关卡途中系统打断手势，岛不能锁死
    ctx, pg, errs = fresh()
    pg.click('#btnStart'); pg.wait_for_timeout(80); pg.evaluate("pe($('wVp'), 'pointercancel', 9, false); $('wVp').dispatchEvent(new Event('pointercancel'))")   # 第二个是 App 捏合时派发的
    pg.wait_for_timeout(2000); check(opened(pg), '进关卡途中手势被打断，2 秒内进关卡（不靠 3 秒兜底）'); ctx.close()
    # 5 真触屏一根手指点一次，只算一次（去重逻辑见 tests/touchfix.test.js）
    ctx = b.new_context(viewport={'width': 844, 'height': 340}, has_touch=True); pg = ctx.new_page()
    pg.add_init_script(f"localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); localStorage.setItem('speedmap.ink.test', '{{\"done\":true}}');")
    pg.goto(url); pg.wait_for_timeout(500)
    pg.evaluate("window.__c = 0; document.querySelector('.w-mini').addEventListener('click', () => window.__c++);")
    pg.tap('.w-mini button:nth-child(2)'); pg.wait_for_timeout(300); check(pg.evaluate('__c') == 1, f"真触屏一根手指点一次，只算一次（{pg.evaluate('__c')}）"); ctx.close()
    # 6 双指点小地图按钮：算一次，搭着的手指抬起不再打开别的
    ctx, pg, errs = fresh()
    pg.evaluate("window.__c = 0; document.querySelector('.w-mini').addEventListener('click', () => window.__c++); window.m = document.querySelector('.w-mini button:nth-child(2)'); pe($('wVp'), 'pointerdown', 1, true); pe(m, 'pointerdown', 2, false); pe(m, 'pointerup', 2, false);")
    pg.wait_for_timeout(200); check(pg.evaluate('__c') == 1, f"手指搭着，点小地图按钮算一次（{pg.evaluate('__c')}）"); ctx.close()
    # 7 拖地图时第二根手指的移动不能让地图乱跳
    ctx, pg, errs = fresh()
    x0 = pg.evaluate("$('wVp').querySelector('.w-main').style.transform")
    pg.evaluate("""(() => { const v = $('wVp'), r = v.getBoundingClientRect(), ev = (t, id, x, pr) => v.dispatchEvent(new PointerEvent(t, {bubbles: true, pointerId: id, isPrimary: pr, pointerType: 'touch', clientX: x, clientY: 150}));
      ev('pointerdown', 1, 400, true); ev('pointermove', 2, 40, false); })()""")
    x1 = pg.evaluate("$('wVp').querySelector('.w-main').style.transform"); check(x0 == x1, f'别的手指移动不带动地图（{x0} → {x1}）'); ctx.close()
    b.close()
print('失败' if fails else '全部通过', len(fails)); sys.exit(1 if fails else 0)
