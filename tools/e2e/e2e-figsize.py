# iPad 看图题版面不能缩得太小（A 方案，中控 11-09）：13 个看图 / 分数手写题在 iPad App 932×651（屏幕 1194×834，×1.28）和 Safari 1194×834 下，
# 答案格宽 ≥ 60 点（够手指写）、题干字 ≥ 24 点（和应用题同级）。单位是屏幕上的点。
# 用法：python3 tools/e2e/e2e-figsize.py <项目根> <截图目录>
import sys, json, pathlib
src = pathlib.Path(__file__).with_name('e2e-vert.py').read_text().split('\nwith sync_playwright()')[0]
exec(src)
IDS = ['dock:g7:bar', 'dock:g8:chart', 'place:g8:side', 'dock:g9:chart2', 'dock:g9:times', 'dock:g9:sumtimes', 'dock:g10:chart5', 'dock:g11:perim2', 'place:g12:area2', 'dock:g15:barsum',
       'dock:g11:fracbar', 'speed:g12:fracadd', 'speed:g15:equiv',
       'garden:g4:pyr', 'garden:g7:pyr2', 'garden:g7:magic', 'dock:g5:tree', 'dock:g5:saw', 'dock:g7:tree2', 'dock:g9:tree3', 'dock:g7:cipher', 'dock:g7:riddle', 'dock:g9:riddle2']   # 第三批趣味题
NODEMO = "localStorage.setItem('speedmap.test.vertdemo', JSON.stringify({add: 1, sub: 1, mul: 1, div: 1, law: 1}))"
# 题干字高：文字那一行的实际高度 ÷ 行高（像素）= 一路缩放下来的倍数，再乘字号
MEAS = """(k) => { const q = document.querySelector('.vbq'), el = q.querySelector('.nbsay span, .say2, .eq') || q;
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t = null; while (w.nextNode()) if (w.currentNode.textContent.trim()) { t = w.currentNode; break; }
  const cs = getComputedStyle(t ? t.parentElement : el), fs = parseFloat(cs.fontSize), lh = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight);
  const r = document.createRange(); if (t) r.selectNodeContents(t); const rect = t ? r.getClientRects()[0] : el.getBoundingClientRect();
  const cell = document.querySelector('.vcell').getBoundingClientRect();
  return {font: Math.round(fs * rect.height / lh * k), cell: Math.round(cell.width * k)}; }"""
def go(pg, it):
    pg.evaluate(f"(() => {{ const s = ({SETUP})([]); const L = [{json.dumps(it)}]; __sm.startQ('free', {{sess: {{next: () => L.length ? {{kind: 'q', seg: 'new', inst: L.shift()}} : null, answer: () => undefined}}, group: 'speedH'}}); }})()")
    pg.wait_for_timeout(600)
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for name, kw, k in [('App', {'viewport': {'width': 932, 'height': 651}, 'screen': {'width': 1194, 'height': 834}}, 1194 / 932), ('Safari', {'viewport': {'width': 1194, 'height': 834}}, 1)]:
        pg = b.new_page(has_touch=True, **kw); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); {NODEMO}"); pg.reload(); pg.wait_for_timeout(500)
        for id in IDS:
            it = pg.evaluate(f"(() => {{ const x = __sm.K.rawPool({json.dumps(id)})[3]; return {{id: {json.dumps(id)}, q: x.q, ans: x.ans}}; }})()")
            go(pg, it); m = pg.evaluate(MEAS, k)
            check(m['cell'] >= 60, f'{name} {id} 答案格 {m["cell"]} 点（≥ 60）')
            check(m['font'] >= 24, f'{name} {id} 题干 {m["font"]} 点（≥ 24）')
            check(fit_ok(pg), f'{name} {id} 整块放得下')
            # 写错后：左边孩子写的（标签、答案格）还看得清（E 核对第 2 条、台账第 16 条）
            pg.click('.vdunno'); pg.wait_for_timeout(700)
            w = pg.evaluate("""(k) => { const f = document.querySelector('.vfit'), sc = f.getBoundingClientRect().width / f.offsetWidth, lab = f.querySelector('.vlab'), cell = f.querySelector('.vcell');
              return {label: Math.round(parseFloat(getComputedStyle(lab).fontSize) * sc * k), cell: Math.round(cell.getBoundingClientRect().width * k), inside: cell.getBoundingClientRect().right <= document.querySelector('.vres').getBoundingClientRect().left + 1}; }""", k)
            check(w['label'] >= 12 and w['cell'] >= 60 and w['inside'], f'{name} {id} 写错后左边：标签 {w["label"]} 点（≥ 12）、答案格 {w["cell"]} 点（≥ 60）、不被讲解栏盖住')
            if id in ('dock:g8:chart', 'dock:g7:bar', 'dock:g11:fracbar', 'garden:g4:pyr', 'garden:g7:magic', 'dock:g5:tree', 'dock:g7:cipher', 'dock:g7:riddle'): pg.screenshot(path=str(out / f'{name}-{id.replace(":", "_")}.png'))
        pg.close()
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
