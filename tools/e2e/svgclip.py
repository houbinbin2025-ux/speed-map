# 图里的字（第二批 2a：线段图、条形图、长方形、讲解卡）有没有被裁掉、有没有叠在一起（代码审查 R2：overflow.py 只量网页元素的外框，量不到图内部）
# 12 个题型的全部题（题面 + 答错图解）和 9 张讲解卡，中英文各画一遍，按左栏大小放进页面，量每个 <text> 的位置。用法：python3 tools/e2e/svgclip.py <项目根>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); url = (root / 'v2' / 'index.html').as_uri() + '#test'
SCAN = """async (en) => {
  const {K, R} = window.__sm, HB = window.HARDBANK || null, out = [], box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:0;top:0;width:360px;height:260px;display:flex;flex-direction:column;z-index:99;background:#1b1d22'; document.body.appendChild(box);
  const tr = h => (en ? I18N.html(h) : h);
  const check = (html, tag) => {
    box.innerHTML = tr(html); window.__fitSvg();
    box.querySelectorAll('svg.fig2').forEach(svg => {
      const vb = svg.viewBox.baseVal, ts = [...svg.querySelectorAll('text')];
      ts.forEach(t => { const b = t.getBBox(); if (b.x < vb.x - 1 || b.y < vb.y - 1 || b.x + b.width > vb.x + vb.width + 1 || b.y + b.height > vb.y + vb.height + 1) out.push(`${tag} 裁掉「${t.textContent}」`); });
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) { const a = ts[i].getBBox(), b = ts[j].getBBox(); if (Math.abs(a.y - b.y) < 2 && a.x < b.x + b.width - 2 && b.x < a.x + a.width - 2) out.push(`${tag} 叠在一起「${ts[i].textContent}」「${ts[j].textContent}」`); }
    });
  };
  let n = 0;
  K.HARD.filter(s => s.late).forEach(s => s.items.forEach(it => K.rawPool(it.id).forEach(x => { const inst = {id: it.id, q: x.q, ans: x.ans}; n++; check(R.question(inst).html, `${it.id} ${x.q.qk} 题面`); check(R.explain(inst), `${it.id} ${x.q.qk} 图解`); })));
  R.CONCEPTS.forEach(c => R.card(c).pages.forEach((p, i) => check(R.cardPage(c, i), `讲解卡 ${c} 第 ${i + 1} 页`)));
  box.remove(); return {n, bad: [...new Set(out)]};
}"""
fails = []
with sync_playwright() as p:
    b = __import__('quiet').launch(p); pg = b.new_page(viewport={'width': 844, 'height': 390}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(600)
    for en in (False, True):
        r = pg.evaluate(SCAN, en); tag = '英文' if en else '中文'
        print(f'{tag}：{r["n"]} 道题 + 讲解卡，问题 {len(r["bad"])} 处'); import collections; [print("  ", k, v) for k, v in collections.Counter(" ".join(x.split(" ")[i] for i in (0, 2)) + " " + ("叠" if "叠在" in x else "裁") for x in r["bad"]).most_common(20)]
        fails += r['bad']
    b.close()
print('错误', errs or '无'); print('不通过', len(fails) or '无')
sys.exit(1 if fails or errs else 0)
