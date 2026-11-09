# 2a 看图题、2b-1 分数手写题进 iPad 蓝框（中控 11-08）+ 手机上分数题答对显示整道式子（上下结构）
# iPad Safari 1194×834、App 932×651（screen 1194×834）中英文：13 个题型逐个 —— 是蓝框、题面图 / 分数在上方且放得下、真写判对、写错讲解栏放得下
# 用法：python3 tools/e2e/e2e-board2.py <项目根> <截图目录>
import sys, json, pathlib
src = pathlib.Path(__file__).with_name('e2e-vert.py').read_text().split('\nwith sync_playwright()')[0]
exec(src)   # 复用 e2e-vert 的标准笔画、写数字、SETUP、hit()、fit_ok() 等
FRAC = ['dock:g11:fracbar', 'speed:g12:fracadd', 'speed:g15:equiv']
FUNB = ['garden:g4:pyr', 'garden:g7:pyr2', 'garden:g7:magic', 'dock:g5:tree', 'dock:g5:saw', 'dock:g7:tree2', 'dock:g9:tree3', 'dock:g7:cipher', 'dock:g7:riddle', 'dock:g9:riddle2']   # 第三批趣味题（中控 11-09）
FIG = ['dock:g7:bar', 'dock:g8:chart', 'place:g8:side', 'dock:g9:chart2', 'dock:g9:times', 'dock:g9:sumtimes', 'dock:g10:chart5', 'dock:g11:perim2', 'place:g12:area2', 'dock:g15:barsum']
NODEMO = "localStorage.setItem('speedmap.test.vertdemo', JSON.stringify({add: 1, sub: 1, mul: 1, div: 1, law: 1}))"
def go(pg, items):
    pg.evaluate(f"(() => {{ const s = ({SETUP})([]); const L = {json.dumps(items)}; __sm.startQ('free', {{sess: {{next: () => L.length ? {{kind: 'q', seg: 'new', inst: L.shift()}} : null, answer: () => undefined}}, group: 'speedH'}}); }})()")
    pg.wait_for_timeout(500)
def first(pg, id): return pg.evaluate(f"(() => {{ const x = __sm.K.rawPool({json.dumps(id)})[3]; return {{id: {json.dumps(id)}, q: x.q, ans: x.ans}}; }})()")
QFIT = """() => { const a = document.querySelector('.vq .varea').getBoundingClientRect(), q = document.querySelector('.vq .vbq');
  const kids = [...q.querySelectorAll('svg, .frac, .eq, .nbsay')].map(e => e.getBoundingClientRect()).filter(b => b.width);
  return {n: kids.length, inside: kids.every(b => b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1)}; }"""
RES = """() => { const r = document.querySelector('.vres'), c = r.querySelector('.vresc'), rr = r.getBoundingClientRect();
  return {over: c.scrollHeight - c.clientHeight, clip: [...c.querySelectorAll('*')].map(e => e.getBoundingClientRect()).filter(b => b.width).some(b => b.bottom > rr.bottom + 1 || b.right > rr.right + 1), frac: r.querySelectorAll('.explain .frac').length}; }"""
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, kw in [('Safari', {'viewport': {'width': 1194, 'height': 834}}), ('App', {'viewport': {'width': 932, 'height': 651}, 'screen': {'width': 1194, 'height': 834}})]:
        for en in [False, True]:
            tag0 = name + (' 英文' if en else '')
            pg = b.new_page(has_touch=True, **kw); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); {NODEMO}"); pg.reload(); pg.wait_for_timeout(500)
            if en: pg.evaluate("__sm.S.testDays = I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 0 : 1; __sm.S.settings.bilingual = true; I18N.set(I18N.isEn(__sm.S.settings, __sm.today()))")
            for id in FRAC + FIG + FUNB:
                it = first(pg, id); go(pg, [it, it]); tag = f'{tag0} {id}'
                check(pg.evaluate("__sm.Q.v.input") == 'vert' and pg.locator('.vboard').count() == 1, f'{tag} 是蓝框版面')
                qf = pg.evaluate(QFIT); check(qf['n'] > 0 and qf['inside'] and fit_ok(pg), f'{tag} 题面（图 / 分数）在上方、整块放得下：{qf}')
                if id in FRAC: check(pg.locator('.vbq .frac').count() >= 1, f'{tag} 题面分数是上下结构')
                if id in ('speed:g12:fracadd', 'dock:g7:bar') and not en:   # 落笔后点喇叭不重新计时（审查 R1）
                    t0 = pg.evaluate('__sm.Q.t0'); pg.click('.vbq .spk'); pg.wait_for_timeout(100); check(pg.evaluate('__sm.Q.t0') > t0, f'{tag} 没落笔点喇叭：听题不算用时')
                    c0 = pg.locator('.vcell'); write(pg, c0.nth(c0.count() - 1), 1); t1 = pg.evaluate('__sm.Q.t0'); pg.click('.vbq .spk'); pg.wait_for_timeout(100)
                    check(pg.evaluate('__sm.Q.t0') == t1, f'{tag} 落笔后点喇叭不重新计时'); pg.click('.vclear')
                if not en and id in (FRAC + FIG[:2]): pg.screenshot(path=str(out / f'{name}-{id.replace(":", "_")}.png'))
                answer(pg, it['ans']); pg.click('.vdone'); pg.wait_for_timeout(500)
                try: pg.wait_for_selector('.vcell.ok', timeout=3000)   # 机器忙时格子变绿会慢一拍
                except Exception: pass
                t = pg.inner_text('#qBody'); check(any(w in t for w in ('对了', '秒答', 'fast', 'Fast', 'Right', 'right')) and pg.locator('.vcell.ok').count() > 0, f'{tag} 真写 {it["ans"]} 判对：{t[:40]!r}')
                pg.wait_for_timeout(2600)
                c = pg.locator('.vcell'); write(pg, c.nth(0), (it['ans'] + 1) % 10 if it['ans'] < 9 else 1); pg.click('.vdone'); pg.wait_for_timeout(600)
                if pg.locator('.vres.show').count() == 0: check(False, f'{tag} 写错出讲解栏'); continue
                rs = pg.evaluate(RES); check(rs['over'] <= 0 and not rs['clip'] and hit(pg, '.vres #qNext'), f'{tag} 写错：讲解栏不用滑、「继续」点得到：{rs}')
                if id in FRAC: check(rs['frac'] >= 1 and pg.locator('.vres .vwk').count() == 0, f'{tag} 讲解里是上下结构的整式，不再重复一张正确写法')
                if not en and id in (FRAC + FIG[:2]): pg.screenshot(path=str(out / f'{name}-{id.replace(":", "_")}-wrong.png'))
                pg.click('.vres #qNext'); pg.wait_for_timeout(700)
            pg.close()
    # ---------- 手机：分数题答对后左栏是整道式子（上下结构），不是只有一个数 ----------
    pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(500)
    for id in FRAC:
        it = first(pg, id); go(pg, [it])
        check(pg.evaluate("__sm.Q.v.input") == 'write', f'手机 {id} 是写字板')
        pg.evaluate("__sm.resolve({ok: true, fast: true})"); pg.wait_for_timeout(300)
        n = pg.locator('#qBody .eq .frac').count(); txt = pg.inner_text('#qBody .eq') if pg.locator('#qBody .eq').count() else ''
        check(n >= 1 and str(it['ans']) in txt and len(txt.replace('\n', '').replace(' ', '')) > len(str(it['ans'])), f'手机 {id} 答对显示整道式子（{n} 个上下结构分数）：{txt!r}')
        pg.screenshot(path=str(out / f'phone-ok-{id.replace(":", "_")}.png'))
        pg.wait_for_timeout(1200)
    pg.close()
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
