# 遮盖扫描：每个技能的每种题（题面 + 答错图解）塞进今日练习页，几种 iPhone 横屏尺寸下检查有没有东西超出左栏、钻到写字板下面或屏幕外
# 用法：python3 tools/e2e/overflow.py <项目根> [每个题型随机几次，默认 30]
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); N = int(sys.argv[2]) if len(sys.argv) > 2 else 30
url = (root / 'v2' / 'index.html').as_uri() + '#test'
SIZES = [(956, 440), (932, 430), (852, 393), (844, 390), (812, 375), (667, 375)]
seed = {'v': 2, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'placedAt': 1, 'known': {}}
SCAN = """async ([n]) => { const {K, R} = window.__sm, $ = id => document.getElementById(id), bad = [];
  ['island','placeIntro','placeResult','qplay','demo','qsum','skillmap','home','calib','play','summary','mist','parent'].forEach(k => { $(k).hidden = k !== 'qplay'; });
  const check = (inst, what, v) => { const wide = v.input !== 'write'; $('qplay').classList.toggle('wide', wide); $('qWide').hidden = !wide;
    $('qPad').hidden = wide; window.__sm.fitBody();
    const lim = wide ? {l: 0, r: innerWidth} : (() => { const p = $('qPad').getBoundingClientRect(); return {l: 0, r: p.left}; })();
    const box = $('qBody').getBoundingClientRect();
    for (const el of $('qBody').querySelectorAll('*')) { const b = el.getBoundingClientRect(); if (!b.width) continue;
      if (b.right > lim.r + 1 || b.left < -1 || b.bottom > innerHeight + 1) { bad.push({id: inst.id, what, cls: el.className || el.tagName, right: Math.round(b.right), lim: Math.round(lim.r), bottom: Math.round(b.bottom)}); return; } } };
  for (const id of Object.keys(K.ITEM)) { const seen = new Set();
    for (let i = 0; i < n; i++) { const inst = K.make(id); const key = JSON.stringify(inst.q); if (seen.has(key)) continue; seen.add(key);
      const v = R.question(inst); $('qBody').innerHTML = v.html; check(inst, '题面', v);
      if (v.input === 'write') { $('qBody').innerHTML = R.explain(inst); check(inst, '图解', v); }
      if (!K.ITEM[id].gen) break; } }
  return bad; }"""
out = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in SIZES:
        pg = b.new_page(viewport={'width': w, 'height': h})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(300)
        bad = pg.evaluate(SCAN, [N])
        uniq = {}
        for x in bad: uniq.setdefault((x['id'], x['what']), x)
        out[f'{w}x{h}'] = {'问题数': len(uniq), '类别': sorted({':'.join(k[0].split(':')[:2]) + ' ' + k[1] for k in uniq}), '例子': list(uniq.values())[:3], '错误': errs[:3]}
        pg.close()
    b.close()
print(json.dumps(out, ensure_ascii=False, indent=1))
sys.exit(1 if any(v['问题数'] or v['错误'] for v in out.values()) else 0)
