# 小数加减写完整得数（A 9afb562 + B，docs/说明书-小数加减写完整得数.md）
# 手机写字板真写「14.3」「3.82」：小数点当误碰不算、不切错数、不弹「一格只写一个数」，判对；漏写小数点也判对；写错显示带小数点
# 答对 / 答错 / 描红 / 口答都按 q.dp 显示小数点；iPad 蓝框答案格印固定小数点、真写判对、正确写法带小数点
# 用法：python3 tools/e2e/e2e-dec.py <项目根> <截图目录>
import sys, json, pathlib
src = pathlib.Path(__file__).with_name('e2e-vert.py').read_text().split('\nwith sync_playwright()')[0]
exec(src)   # 复用 e2e-vert 的标准笔画 D、写数字、SETUP（装标准字模）、hit() 等
def one(pg, x0, y0, h, d):
    w = h * .6
    for st in D[d]:
        pts = [(x0 + x * w / .6, y0 + y * h) for x, y in st]
        pg.mouse.move(*pts[0]); pg.mouse.down()
        for p in pts[1:]: pg.mouse.move(*p, steps=2)
        pg.mouse.up()
def pad_write(pg, text, dot=True):
    b = pg.locator('#qPad').bounding_box(); nd = sum(c != '.' for c in text); h = min(b['height'] * .42, 130, (b['width'] - 48) / (nd * .85 + .35)); x = b['x'] + 24; y0 = b['y'] + (b['height'] - h) / 2
    for ch in text:
        if ch == '.':
            if dot: pg.mouse.move(x + 4, y0 + h - 4); pg.mouse.down(); pg.mouse.move(x + 6, y0 + h - 3); pg.mouse.up()
            x += h * .35
        else:
            one(pg, x, y0, h, int(ch)); x += h * .85
def go(pg, items, oral=False):
    pg.evaluate(f"(() => {{ const s = ({SETUP})([]); const L = {json.dumps(items)}; __sm.S.oral = {str(oral).lower()}; __sm.startQ('free', {{sess: {{next: () => L.length ? {{kind: 'q', seg: 'new', inst: L.shift()}} : null, answer: () => undefined}}, group: 'speedH'}}); }})()")
    pg.wait_for_timeout(500)
def item(pg, id, text):
    return pg.evaluate(f"(() => {{ const x = __sm.K.rawPool({json.dumps(id)}).find(y => y.q.text === {json.dumps(text)}); return x && {{id: {json.dumps(id)}, q: x.q, ans: x.ans}}; }})()")
def pick(pg, id, dp, want):   # 找一道答案正好是 want 的题；没有就用池里第一道
    return pg.evaluate(f"(() => {{ const P = __sm.K.rawPool({json.dumps(id)}); const x = P.find(y => y.ans === {want}) || P[0]; return {{id: {json.dumps(id)}, q: x.q, ans: x.ans}}; }})()")
def body(pg): return pg.inner_text('#qBody')
NODEMO = "localStorage.setItem('speedmap.test.vertdemo', JSON.stringify({add: 1, sub: 1, mul: 1, div: 1, law: 1}))"
with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- 手机 844×390 写字板 ----------
    pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); {NODEMO}"); pg.reload(); pg.wait_for_timeout(500)
    for id, dp, want in [('speed:g12:dec', 1, 143), ('speed:g14:dec2', 2, 382)]:
        it = pick(pg, id, dp, want); full = f"{it['ans'] / 10 ** dp:.{dp}f}"
        for k, dot in enumerate([True, True, False]):
            go(pg, [it]); check(pg.evaluate("__sm.Q.v.input") == 'write', f'{id} 手机上是写字板')
            pad_write(pg, full, dot); pg.wait_for_timeout(2600)
            st = pg.evaluate("({phase: __sm.Q && __sm.Q.phase, confirm: !document.getElementById('qConfirm').hidden})")
            if st['confirm']: pg.screenshot(path=str(out / f'phone-{id.replace(":", "_")}-{k}-confirm.png'))
            t = body(pg)
            check(not st['confirm'] and ('对了' in t or '秒答' in t) and full in t, f'手机写「{full}」{"带" if dot else "不带"}小数点判对、答对显示 {full}：{t[:60]!r} {st}')
            check('一格只写一个数' not in t, '不弹「一格只写一个数」')
            pg.screenshot(path=str(out / f'phone-{id.replace(":", "_")}-{k}.png'))
            pg.wait_for_timeout(1200)
        # 写错：显示带小数点，描红带小数点
        wrong = f"{(it['ans'] + 1) / 10 ** dp:.{dp}f}"
        go(pg, [it]); pad_write(pg, wrong); pg.wait_for_timeout(2600)
        if not pg.locator('#qConfirm').is_hidden(): pg.click('#qcA'); pg.wait_for_timeout(400)
        t = body(pg); g = pg.get_attribute('#qGhost svg', 'aria-label') if pg.locator('#qGhost svg').count() else None
        check(f'你写的是 {wrong}' in t.replace('\n', ' ') and full in t, f'手机写错「{wrong}」：显示带小数点、给出 {full}：{t[:80]!r}')
        check(g == full and pg.locator('#qGhost svg circle').count() == 1, f'描红带小数点：{g}')
        pg.screenshot(path=str(out / f'phone-{id.replace(":", "_")}-wrong.png'))
        pg.click('#qNext') if hit(pg, '#qNext') else None; pg.wait_for_timeout(600)
        # 口答
        go(pg, [it], oral=True); pg.click('#qOral'); pg.wait_for_timeout(200)
        check(pg.inner_text('#qOral').strip() == f'答案是 {full}', f'口答显示：{pg.inner_text("#qOral")!r}')
        pg.click('#qOralNext'); pg.wait_for_timeout(1500)
        pg.evaluate("__sm.S.oral = false")
    pg.close()
    # ---------- iPad 1194×834 蓝框：固定小数点 ----------
    for name, kw in [('Safari', {'viewport': {'width': 1194, 'height': 834}}), ('App', {'viewport': {'width': 932, 'height': 651}, 'screen': {'width': 1194, 'height': 834}})]:
        pg = b.new_page(has_touch=True, **kw); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); {NODEMO}"); pg.reload(); pg.wait_for_timeout(500)
        for id, dp, want in [('speed:g12:dec', 1, 143), ('speed:g14:dec2', 2, 382)]:
            it = pick(pg, id, dp, want); full = f"{it['ans'] / 10 ** dp:.{dp}f}"; digits = str(it['ans'])
            go(pg, [it, it]); check(pg.evaluate("__sm.Q.v.input") == 'vert', f'{name} {id} 是蓝框版面')
            lay = pg.evaluate("(() => { const cs = [...document.querySelectorAll('.vcell')], d = document.querySelector('.vdotc'); if (!d) return null; const x = d.getBoundingClientRect().left; return {n: cs.length, after: cs.filter(c => c.getBoundingClientRect().left > x).length}; })()")
            check(lay and lay['after'] == dp and lay['n'] == pg.evaluate(f"Math.max(...__sm.K.rawPool({json.dumps(id)}).map(x => String(x.ans).length))") + 1, f'{name} {id} 小数点印在倒数第 {dp} 格前：{lay}')
            check(fit_ok(pg), f'{name} {id} 版面放得下')
            pg.screenshot(path=str(out / f'ipad-{name}-{id.replace(":", "_")}.png'))
            answer(pg, digits); pg.click('.vdone'); pg.wait_for_timeout(500)
            try: pg.wait_for_selector('.vcell.ok', timeout=3000)   # 机器忙时格子变绿会慢一拍
            except Exception: pass
            t = body(pg); check(('对了' in t or '秒答' in t) and pg.locator('.vcell.ok').count() > 0 and pg.locator('.vdotc').is_visible(), f'{name} 蓝框写 {digits}（不写点）判对，格子变绿、小数点还在：{t[:60]!r}')
            pg.wait_for_timeout(2600)
            c = pg.locator('.vcell'); write(pg, c.nth(c.count() - 1), (it['ans'] + 1) % 10); pg.click('.vdone'); pg.wait_for_timeout(600)
            r = pg.inner_text('.vres'); check('正确写法' in r and full in r, f'{name} {id} 答错：正确写法带小数点 {full}：{r[:80]!r}')
            pg.screenshot(path=str(out / f'ipad-{name}-{id.replace(":", "_")}-wrong.png'))
            pg.click('.vres #qNext'); pg.wait_for_timeout(700)
        pg.close()
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
