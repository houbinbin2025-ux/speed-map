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
  const ack = document.getElementById('ack').getBoundingClientRect(), D = document.querySelector('#demoBox .demo').getBoundingClientRect(); if (ack.bottom > innerHeight + 1) res.push('按钮超出屏幕');
  // 按钮在卡片下方（大屏），或在右下角和提示句同一行（矮屏，字号审查 R3）：都不许压住图框、标题和提示句的字
  const hit = r => r.width && r.height && r.left < ack.right - 1 && r.right > ack.left + 1 && r.top < ack.bottom - 1 && r.bottom > ack.top + 1;
  const foot = document.querySelector('#demoBox .dfoot'), fr = foot && (() => { const g = document.createRange(); g.selectNodeContents(foot); return [...g.getClientRects()]; })();
  if (hit(body.getBoundingClientRect()) || hit(head.getBoundingClientRect()) || (fr || []).some(hit)) res.push('和按钮重叠');
  if (D.bottom > innerHeight + 1) res.push('卡片超出屏幕');
  if (foot && getComputedStyle(document.getElementById('ack').parentElement).position === 'absolute') { const fb = foot.getBoundingClientRect(), pr = parseFloat(getComputedStyle(foot).paddingRight);
    if (fb.right - pr > ack.left - 8 && fb.bottom > ack.top) res.push('提示句的字区伸到按钮下面');   // 几何断言：中文提示句短、碰不到按钮时也能查出 CSS 坏了
  }
  // 图里的字（docs/视觉规范.md 2.3）：横向压缩不低于 0.8（不许压成扁字）；字不出图的 viewBox（不许被裁）
  body.querySelectorAll('svg.fig2').forEach(svg => { const vb = svg.viewBox.baseVal;
    svg.querySelectorAll('text').forEach(t => { const parts = t.querySelector('tspan') ? [...t.querySelectorAll('tspan')] : [t];
      parts.forEach(e => { const L = e.getAttribute('textLength'); if (!L) return; e.removeAttribute('textLength'); const nat = e.getComputedTextLength(); e.setAttribute('textLength', L); if (+L / nat < 0.79) res.push(`图字压扁 ${(+L / nat).toFixed(2)} ${e.textContent.slice(0, 12)}`); });
      const bb = t.getBBox(); if (vb && vb.width && (bb.x < vb.x - 2 || bb.y < vb.y - 2 || bb.x + bb.width > vb.x + vb.width + 2 || bb.y + bb.height > vb.y + vb.height + 2)) res.push('图字出框 ' + t.textContent.slice(0, 12)); }); });
  return res; }"""
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for w, h in [(956, 440), (932, 430), (852, 393), (844, 390), (812, 375), (667, 375)]:
        pg = b.new_page(viewport={'width': w, 'height': h}); pg.goto(url); pg.evaluate("en => localStorage.setItem('speedmap.v2.test', JSON.stringify({v: 2, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, placedAt: 1, known: {}, settings: {bilingual: en}, testDays: en && !I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 1 : 0}))", EN); pg.reload(); pg.wait_for_timeout(300)
        if EN: assert pg.evaluate("document.documentElement.lang") == 'en'
        for sid in pg.evaluate("__sm.K.SKILLS.concat(__sm.K.HARD, __sm.K.FUN || []).filter(s=>s.nb||s.hard||s.fun||s.group==='line').map(s=>s.id)"):
            pg.evaluate("sid => {" + SCREENS + "document.getElementById('demoBox').innerHTML=__sm.R.demo(sid);}", sid); pg.wait_for_timeout(40)
            r = pg.evaluate(CHECK)
            if r: bad.append((w, sid, r))
            if w == 667: pg.add_style_tag(content='.dstep{animation:none!important;opacity:1!important}'); pg.screenshot(path=str(out / (sid + '.png')))
        pg.close()
    b.close()
print('不通过', bad or '无'); sys.exit(1 if bad else 0)
