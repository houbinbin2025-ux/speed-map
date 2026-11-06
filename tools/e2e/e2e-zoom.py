# 进入时岛不能放大（Ben 11-07）：iOS 打开页面时尺寸还没定、也不一定发 resize。用法：python3 tools/e2e/e2e-zoom.py <项目根>
# 把 resize 事件全部吞掉，只改视口，模拟「尺寸变了但系统没通知」。岛的高度必须跟上屏幕高度
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); url = (root / 'v2' / 'index.html').as_uri() + '#test'
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': {'look1': True}, 'settings': {'bilingual': False}}
fails = []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
NO_RESIZE = "const a=window.addEventListener; window.addEventListener=function(t,f,o){ if(t==='resize') return; return a.call(this,t,f,o); };"
SCENE = "(()=>{const r=document.getElementById('island'), c=[...r.querySelectorAll('*')].filter(e=>e.style&&e.style.height&&e.style.width&&parseFloat(e.style.width)>parseFloat(e.style.height)*2).sort((x,y)=>parseFloat(y.style.width)-parseFloat(x.style.width))[0];return {h:parseFloat(c.style.height),root:r.clientHeight,inner:innerHeight}})()"
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, a, c in [('竖着打开再横过来', (390, 844), (844, 390)), ('iPad 页面宽度晚生效', (1194, 834), (932, 651)), ('工具栏收起', (844, 340), (844, 390))]:
        ctx = b.new_context(viewport={'width': a[0], 'height': a[1]}); pg = ctx.new_page()
        pg.add_init_script(NO_RESIZE + f"localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); localStorage.setItem('speedmap.ink.test', '{{\"done\":true,\"samples\":[]}}');")
        pg.goto(url); pg.wait_for_timeout(500)
        pg.set_viewport_size({'width': c[0], 'height': c[1]}); pg.wait_for_timeout(900)
        s = pg.evaluate(SCENE)
        check(abs(s['h'] - c[1]) < 2, f"{name}：岛高 {s['h']:.0f}，屏幕高 {c[1]}")
        # 家和锻造台也跟上
        if name.startswith('工具栏'):
            pg2 = ctx.new_page(); pg2.add_init_script(NO_RESIZE); pg2.goto((root / 'v2' / 'index.html').as_uri() + '?gems=1#test'); pg2.wait_for_timeout(500)
            pg2.evaluate("GEMUI.openForge('island')"); pg2.wait_for_timeout(200); pg2.set_viewport_size({'width': 844, 'height': 340}); pg2.wait_for_timeout(400); pg2.set_viewport_size({'width': 844, 'height': 390}); pg2.wait_for_timeout(400)
            cv = pg2.evaluate("(()=>{const c=document.getElementById('forgeScene');return c.height*Math.max(2,Math.floor(Math.min(innerWidth/240,innerHeight/110)))})()")
            check(abs(cv - 390) < 4, f'锻造台场景高 {cv}，屏幕高 390')
        ctx.close()
    b.close()
print('失败' if fails else '全部通过', len(fails)); sys.exit(1 if fails else 0)
