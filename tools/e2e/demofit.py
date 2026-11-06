# 新关卡示范卡在 6 种尺寸下不许被裁：题干、图、想一想、答案都要完整可见（11-06 踩坑：外框没超、内层 dbody 把内容裁掉）
# 用法：python3 tools/e2e/demofit.py <项目根> <截图目录>
import sys, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '#test'; bad = []
SCREENS = "['island','placeIntro','placeResult','qplay','demo','qsum','skillmap','home','calib','play','summary','mist','parent'].forEach(k=>document.getElementById(k).hidden=k!=='demo');"
CHECK = """() => { const res = []; const body = document.querySelector('#demoBox .dbody'), head = document.querySelector('#demoBox .dhead');
  if (body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1) res.push(`dbody ${body.scrollWidth}x${body.scrollHeight} > ${body.clientWidth}x${body.clientHeight}`);
  if (head.scrollWidth > head.clientWidth + 1) res.push('dhead 横向溢出');
  const B = body.getBoundingClientRect();
  body.querySelectorAll('.dstep').forEach(st => { const r = st.getBoundingClientRect(); if (r.top < B.top - 1 || r.bottom > B.bottom + 1 || r.left < B.left - 1 || r.right > B.right + 1) res.push('步骤超出框'); if (st.scrollWidth > st.clientWidth + 1) res.push('步骤内容横向溢出'); });
  const ack = document.getElementById('ack').getBoundingClientRect(), D = document.querySelector('#demoBox .demo').getBoundingClientRect(); if (ack.bottom > innerHeight + 1 || D.bottom > ack.top + 1) res.push('和按钮重叠或超出屏幕');
  return res; }"""
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(956, 440), (932, 430), (852, 393), (844, 390), (812, 375), (667, 375)]:
        pg = b.new_page(viewport={'width': w, 'height': h}); pg.goto(url); pg.wait_for_timeout(300)
        for sid in pg.evaluate("__sm.K.SKILLS.filter(s=>s.nb).map(s=>s.id)"):
            pg.evaluate("sid => {" + SCREENS + "document.getElementById('demoBox').innerHTML=__sm.R.demo(sid);}", sid); pg.wait_for_timeout(40)
            r = pg.evaluate(CHECK)
            if r: bad.append((w, sid, r))
            if w == 667: pg.add_style_tag(content='.dstep{animation:none!important;opacity:1!important}'); pg.screenshot(path=str(out / (sid + '.png')))
        pg.close()
    b.close()
print('不通过', bad or '无'); sys.exit(1 if bad else 0)
