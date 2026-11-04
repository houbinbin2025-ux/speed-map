# 10-31 回归：点选（比大小）、数线是宽版（右栏收起），答错 / 不会后停住等「继续」
# 3 种 iPhone 横屏尺寸：「继续」看得见、点得到、≥56 高；左栏任何字不互相叠、不被按钮盖、不出屏
# 用法：python3 tools/e2e/e2e5.py <截图目录>   （在项目根目录运行）
import sys, json, pathlib, time
exec(pathlib.Path('tools/e2e/e2e.py').read_text().split('\nwith sync_playwright()')[0].replace("root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)", "root = pathlib.Path('.').resolve(); out = pathlib.Path(sys.argv[1])"))
CHK = """() => {
  const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const btn = document.getElementById('qNext'), br = btn.getBoundingClientRect(), note = document.getElementById('qNote');
  // 看得见的每一段字（按字形的真实范围）和每个图形
  const boxes = [], w = document.createTreeWalker(document.querySelector('#qplay .ql'), NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim() || !n.parentElement.offsetParent || n.parentElement.closest('.qtop')) continue; const r = document.createRange(); r.selectNodeContents(n); [...r.getClientRects()].forEach(b => boxes.push({b, t: n.textContent.trim().slice(0, 16), inBtn: btn.contains(n), inNote: note.contains(n)})); }
  document.querySelectorAll('#qplay .ql i, #qplay .ql svg, #qplay .ql canvas, #qplay .ql .pickcard').forEach(e => { if (e.offsetParent || e.tagName === 'svg') { const b = e.getBoundingClientRect(); if (b.width && b.height) boxes.push({b, t: '<' + e.tagName + '.' + (e.getAttribute('class') || '') + '>', inBtn: false, inNote: false}); } });
  const overBtn = boxes.filter(x => !x.inBtn && hit(x.b, br)).map(x => x.t);
  const pairs = []; const txt = boxes.filter(x => !x.t.startsWith('<') && !x.inBtn);
  txt.forEach((a, i) => txt.slice(i + 1).forEach(b => { if (hit(a.b, b.b)) pairs.push(a.t + ' × ' + b.t); }));
  const clip = boxes.filter(x => x.b.bottom > innerHeight + 1 || x.b.right > innerWidth + 1 || x.b.top < 0).map(x => x.t);
  const top = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
  return {visible: !!btn.offsetParent && br.width > 0 && br.bottom <= innerHeight && br.right <= innerWidth, clickable: top === btn || btn.contains(top), size: [Math.round(br.width), Math.round(br.height)], overBtn, overText: pairs, clip};
}"""
bad = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for W, H in [(932, 430), (844, 390), (667, 375)]:
        pg = b.new_page(viewport={'width': W, 'height': H})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(500)
        pg.click('#btnStart'); pg.wait_for_timeout(300); pg.click('#piGo'); pg.wait_for_timeout(400)
        k = 0
        while k < 60 and state(pg)['cur'] != 'placeResult':
            st = state(pg)
            if st['cur'] == 'qplay' and st.get('phase') == 'q': answer(pg, st, True); k += 1
            pg.wait_for_timeout(120)
        for z in ['cmp', 'line']:
            pg.goto(url); pg.reload(); pg.wait_for_timeout(800)
            pg.click(f'.w-mini button[data-z="{z}"]'); pg.wait_for_timeout(600); pg.click('#zGo'); pg.wait_for_timeout(3000)
            seen = set(); t0 = time.time()
            while time.time() - t0 < 60 and len(seen) < 2:
                st = state(pg)
                if st['cur'] == 'demo': pg.wait_for_selector('#ack:not([disabled])', timeout=15000); pg.click('#ack'); continue
                if st['cur'] == 'qplay' and st.get('phase') == 'q' and st.get('input') in ('pick', 'line') and st['input'] not in seen:
                    answer(pg, st, False); pg.wait_for_timeout(700)
                    r = pg.evaluate(CHK); name = f"{W}x{H}-{z}-{st['input']}"
                    pg.screenshot(path=str(out / (name + '.png'))); print(name, r)
                    if not (r['visible'] and r['clickable'] and not r['overBtn'] and not r['overText'] and not r['clip'] and r['size'][1] >= 56): bad.append(name)
                    seen.add(st['input']); pg.click('#qNext'); pg.wait_for_timeout(400)
                    continue
                if st['cur'] == 'qplay' and st.get('phase') == 'q': answer(pg, st, True)
                if st['cur'] == 'qplay' and st.get('phase') in ('wait', 'trace') and pg.is_visible('#qNext'): pg.click('#qNext')
                pg.wait_for_timeout(200)
        pg.close()
    b.close()
print('不通过', bad or '无'); print('错误', errs or '无')
sys.exit(1 if bad or errs else 0)
