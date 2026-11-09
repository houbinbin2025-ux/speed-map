# 新关卡和高级别题的示范卡在 6 种尺寸下不许被裁：题干、图、想一想、答案都要完整可见（11-06 踩坑：外框没超、内层 dbody 把内容裁掉）
# 步骤内容容忍 24 点：数线两头的数字本来就伸出线外一点，外框另外查
# 用法：python3 tools/e2e/demofit.py <项目根> <截图目录> [en]   加 en = 强制英文日跑一遍
import sys, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '#test'; bad = []; EN = 'en' in sys.argv[3:]
SCREENS = "['island','placeIntro','placeResult','qplay','demo','qsum','skillmap','home','calib','play','summary','mist','parent'].forEach(k=>document.getElementById(k).hidden=k!=='demo');"
CHECK = """() => { const res = []; const body = document.querySelector('#demoBox .dbody'), head = document.querySelector('#demoBox .dhead');
  if (body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1) res.push(`dbody ${body.scrollWidth}x${body.scrollHeight} > ${body.clientWidth}x${body.clientHeight}`);
  if (head.scrollWidth > head.clientWidth + 1) res.push('dhead 横向溢出');
  const B = body.getBoundingClientRect();
  body.querySelectorAll('.dstep').forEach(st => { const r = st.getBoundingClientRect(); if (r.top < B.top - 1 || r.bottom > B.bottom + 1 || r.left < B.left - 1 || r.right > B.right + 1) res.push('步骤超出框'); if (st.scrollWidth > st.clientWidth + 24) res.push('步骤内容横向溢出'); });
  const ack = document.getElementById('ack').getBoundingClientRect(), D = document.querySelector('#demoBox .demo').getBoundingClientRect(); if (ack.bottom > innerHeight + 1 || D.bottom > ack.top + 1) res.push('和按钮重叠或超出屏幕');
  return res; }"""
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for w, h in [(956, 440), (932, 430), (852, 393), (844, 390), (812, 375), (667, 375)]:
        pg = b.new_page(viewport={'width': w, 'height': h}); pg.goto(url); pg.evaluate("en => localStorage.setItem('speedmap.v2.test', JSON.stringify({v: 2, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, placedAt: 1, known: {}, settings: {bilingual: en}, testDays: en && !I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 1 : 0}))", EN); pg.reload(); pg.wait_for_timeout(300)
        if EN: assert pg.evaluate("document.documentElement.lang") == 'en'
        for sid in pg.evaluate("__sm.K.SKILLS.concat(__sm.K.HARD).filter(s=>s.nb||s.hard||s.group==='line').map(s=>s.id)"):
            pg.evaluate("sid => {" + SCREENS + "document.getElementById('demoBox').innerHTML=__sm.R.demo(sid);}", sid); pg.wait_for_timeout(40)
            r = pg.evaluate(CHECK)
            if r: bad.append((w, sid, r))
            if w == 667: pg.add_style_tag(content='.dstep{animation:none!important;opacity:1!important}'); pg.screenshot(path=str(out / (sid + '.png')))
        pg.close()
    b.close()
print('不通过', bad or '无'); sys.exit(1 if bad else 0)
