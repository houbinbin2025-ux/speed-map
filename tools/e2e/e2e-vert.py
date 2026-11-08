# iPad 竖式答题（docs/说明书-iPad竖式.md）：iPad 尺寸（Safari 1194×834；App 网页 932 宽、屏幕 1194×834）竖式题换成竖式版面；
# 第一次见先看示范（从个位一步一步）；逐格真写判对 / 判错 / 不会 / 最高位写 0 / 没写；答错出正确写法和「一步一步看」；iPhone 不变；英文日全是英文
# 用法：python3 tools/e2e/e2e-vert.py <项目根> <截图目录>
import sys, json, pathlib, math
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '#test'
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': {}, 'settings': {'bilingual': False}}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
# 标准写法（和 ink.js 的 STD 同一套坐标，0.6 × 1）
def arc(cx, cy, rx, ry, a0, a1, n=18): return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / (n - 1))), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / (n - 1)))) for i in range(n)]
D = {0: [arc(.3, .5, .3, .5, -90, 270, 30)], 1: [[(.05, .2), (.3, 0), (.3, 1)]], 2: [arc(.3, .27, .3, .27, 190, 390, 14) + [(0, 1), (.6, 1)]],
     3: [arc(.28, .25, .28, .25, 210, 450, 14) + arc(.28, .73, .32, .27, 270, 510, 16)], 4: [[(.45, 0), (0, .68), (.6, .68)], [(.45, 0), (.45, 1)]],
     5: [[(.55, 0), (.08, 0), (.04, .42)] + arc(.28, .7, .32, .3, 230, 510, 16)[1:]], 6: [arc(.42, .35, .42, .35, 290, 180, 8) + arc(.3, .72, .3, .28, 180, 540, 18)],
     7: [[(0, 0), (.6, 0), (.2, 1)]], 8: [arc(.3, .24, .24, .24, 90, 450, 16) + arc(.3, .74, .3, .26, -90, 270, 18)], 9: [arc(.3, .28, .3, .28, 0, 360, 18) + [(.6, .28), (.5, 1)]]}
def write(pg, el, d):
    b = el.bounding_box(); h = b['height'] * .62; w = h * .6; x0 = b['x'] + (b['width'] - w) / 2; y0 = b['y'] + (b['height'] - h) / 2
    for st in D[d]:
        pts = [(x0 + x * w / .6, y0 + y * h) for x, y in st]
        pg.mouse.move(*pts[0]); pg.mouse.down()
        for p in pts[1:]: pg.mouse.move(*p, steps=2)
        pg.mouse.up()
def answer(pg, s, start=None):
    cells = pg.locator('.vcell'); n = cells.count(); s = str(s)
    for i, ch in enumerate(s): write(pg, cells.nth((n - len(s) if start is None else start) + i), int(ch))
IDS = ['speed:g10:add3', 'speed:g10:sub3', 'speed:g11:mul', 'speed:g12:mul2', 'speed:g11:div', 'speed:g13:div2', 'speed:g13:mul3']
SETUP = """(ids) => { const {K, INK: _} = window.__sm; const I = window.INK, S = window.__sm.S, INKS = window.__sm.INK;
  Object.keys(I.STD).forEach(d => I.STD[d].forEach(form => I.addTemplate(INKS, d, form.map(st => { const o = []; for (let i = 0; i + 1 < st.length; i++) for (let k = 0; k < 8; k++) { const t = k / 8; o.push({x: (st[i][0] + t * (st[i + 1][0] - st[i][0])) * 100, y: (st[i][1] + t * (st[i + 1][1] - st[i][1])) * 100, t: 0}); } const z = st[st.length - 1]; o.push({x: z[0] * 100, y: z[1] * 100, t: 0}); return o; }))));
  INKS.done = true; INKS.speed = 900;
  const list = ids.map(id => { const P = K.rawPool(id), x = id === 'speed:g11:div' ? P.find(y => String(y.ans).length < String(y.q.text).split(' ')[0].length) : P[0]; return {kind: 'q', seg: 'new', inst: {id, q: x.q, ans: x.ans}}; });
  window.__vlist = list.map(x => x.inst);
  return {next: () => list.shift() || null, answer: () => undefined}; }"""
def start(pg, ids):
    pg.evaluate(f"(() => {{ const s = ({SETUP})({json.dumps(ids)}); window.__sm.startQ('free', {{sess: s, group: 'speedH'}}); }})()"); pg.wait_for_timeout(400)
def right(pg): b = pg.inner_text('#qBody'); return '对了' in b or '秒答' in b
# 按钮真在屏幕里、中心点上点得到（Playwright 的 click 会自动滚动，查不出被裁掉的按钮）
def hit(pg, sel): return pg.evaluate("s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); if (r.bottom > innerHeight || r.right > innerWidth || r.top < 0) return false; const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === e || e.contains(h)); }", sel)
def phase(pg): return pg.evaluate("window.__sm.Q && window.__sm.Q.phase")
def inst(pg): return pg.evaluate("window.__sm.Q.x.inst")
def fit_ok(pg):
    return pg.evaluate("""(() => { const a = document.querySelector('.vq .varea').getBoundingClientRect(), c = document.querySelector('.vq .vcard').getBoundingClientRect();
      return c.left >= a.left - 1 && c.right <= a.right + 1 && c.top >= a.top - 1 && c.bottom <= a.bottom + 1 && c.right <= innerWidth && c.bottom <= innerHeight; })()""")
with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- iPad Safari 1194×834 ----------
    pg = b.new_page(viewport={'width': 1194, 'height': 834}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(500)
    start(pg, IDS)
    check(pg.evaluate("__sm.Q.v.input") == 'vert' and pg.locator('#qplay.vert').count() == 1, '三位数加减在 iPad 上用竖式版面')
    check(pg.locator('.vdemo').is_visible(), '第一次见加法竖式先看示范')
    hid = pg.evaluate("[...document.querySelectorAll('.vdemo .vqa')].every(e => e.classList.contains('vhid'))")
    check(hid, '示范开始时答案都还没写')
    pg.wait_for_timeout(1800); tip = pg.inner_text('.vdemo .vtip'); check(tip.startswith('个位'), f'示范第一步算个位：{tip}')
    pg.screenshot(path=str(out / 'demo-add.png'))
    t_demo = pg.evaluate("performance.now() - __sm.Q.t0")
    pg.click('.vdemo .vgo'); pg.wait_for_timeout(200)
    check(pg.evaluate("performance.now() - __sm.Q.t0") < t_demo, '看示范的时间不算进用时')
    check(fit_ok(pg), '竖式卡片在框里放得下')
    # 没写就点「写好了」：提示，不判
    pg.click('.vdone'); pg.wait_for_timeout(200)
    check(phase(pg) == 'q' and '蓝框' in pg.inner_text('.vnote'), '没写答案点「写好了」只提示不判')
    c0 = pg.locator('.vcell').nth(0).bounding_box(); pg.mouse.click(c0['x'] + 30, c0['y'] + 30); pg.wait_for_timeout(100)
    pg.click('.vdone'); pg.wait_for_timeout(200)
    check(phase(pg) == 'q' and '蓝框' in pg.inner_text('.vnote') and pg.locator('.vcell.bad').count() == 0, '手指误碰一个点不算写字，不标红')
    pg.click('.vclear'); write(pg, pg.locator('.vcell').nth(1), 5); write(pg, pg.locator('.vcell').nth(2), 5)
    pg.click('.vclear'); pg.wait_for_timeout(100)
    check(pg.evaluate("__sm.Q.vc.cells().map(s => s.length)")[1:3] == [1, 0] or pg.evaluate("__sm.Q.vc.cells().map(s => s.length)")[2] == 0, '「擦一笔」只撤最后一笔')
    while pg.evaluate("__sm.Q.vc.cells().some(s => s.length)"): pg.click('.vclear')
    q = inst(pg); ore0 = pg.evaluate('__sm.Q.ore')
    answer(pg, q['ans']); pg.screenshot(path=str(out / 'add-write.png'))
    pg.click('.vdone'); pg.wait_for_timeout(300)
    body = pg.inner_text('#qBody')
    check(right(pg) and phase(pg) == 'a', f'{q["q"]["text"]} 写对 {q["ans"]} 判对：{body!r}')
    check(pg.evaluate('__sm.Q.ore') == ore0 + 1, '答对有矿石')
    check(pg.locator('.vcell.ok').count() > 0, '答对格子变绿')
    pg.screenshot(path=str(out / 'add-ok.png'))
    pg.wait_for_timeout(2600)
    # 减法：新示范；写错 → 正确写法 + 一步一步看 + 继续
    q = inst(pg); check(q['id'] == 'speed:g10:sub3' and pg.locator('.vdemo').is_visible(), '减法第一次也先看示范（借位）')
    pg.click('.vdemo .vgo'); pg.wait_for_timeout(150)
    answer(pg, q['ans'] + 1); pg.click('.vdone'); pg.wait_for_timeout(500)
    res = pg.inner_text('.vres')
    check(phase(pg) == 'wait' and '你写的是' in res and '正确写法' in res, f'写错出正确写法：{res[:80]!r}')
    check(pg.locator('.vres #qNext').is_visible(), '「继续」在讲解栏里')
    check(pg.locator('#qGhost').is_hidden(), '竖式题不描红')
    pg.screenshot(path=str(out / 'sub-bad.png'))
    check(hit(pg, '.vres #qNext') and hit(pg, '.vres .vstep'), '讲解栏的「继续」「一步一步看」点得到')
    pg.click('.vres .vstep'); pg.wait_for_timeout(1700)
    check(pg.locator('.vdemo').is_visible() and '这道题' in pg.inner_text('.vdemo h2'), '「一步一步看」按这道题重放')
    pg.screenshot(path=str(out / 'sub-step.png'))
    pg.click('.vdemo .vgo'); pg.wait_for_timeout(150)
    pg.click('#qNext'); pg.wait_for_timeout(400)
    # 乘一位数：不会
    q = inst(pg); check(q['id'] == 'speed:g11:mul', '点继续到下一题')
    pg.click('.vdemo .vgo'); pg.wait_for_timeout(150)
    pg.click('.vdunno'); pg.wait_for_timeout(400)
    check('正确写法' in pg.inner_text('.vres') and '没关系' in pg.inner_text('.vres'), '不会：出正确写法')
    pg.screenshot(path=str(out / 'mul-dunno.png'))
    pg.click('#qNext'); pg.wait_for_timeout(400)
    # 乘两位数：写对（示范按个位、十位、相加）
    q = inst(pg); check(q['id'] == 'speed:g12:mul2' and not pg.locator('.vdemo').is_visible(), '乘法示范看过一次，乘两位数不再自动出')
    check(fit_ok(pg), '乘两位数版面放得下')
    pg.screenshot(path=str(out / 'mul2.png'))
    answer(pg, q['ans']); pg.click('.vdone'); pg.wait_for_timeout(300)
    check(right(pg), f'乘两位数写对判对 {q["ans"]}：{pg.inner_text("#qBody")!r} {pg.evaluate("__sm.Q.v && __sm.Q.phase")} {pg.inner_text(".vres")[:60]!r}')
    pg.wait_for_timeout(2600)
    # 除法：商最高位写 0 → 判错提示
    q = inst(pg); check(q['id'] == 'speed:g11:div' and pg.locator('.vdemo').is_visible(), '除法第一次先看示范')
    pg.click('.vdemo .vgo'); pg.wait_for_timeout(150)
    n = pg.locator('.vcell').count(); s = str(q['ans']).rjust(n, '0')
    answer(pg, s, 0); pg.click('.vdone'); pg.wait_for_timeout(400)
    check('最高位不写 0' in pg.inner_text('.vres'), f'商最高位写 0 判错并提示（写了 {s}）')
    pg.screenshot(path=str(out / 'div-zero.png'))
    pg.click('#qNext'); pg.wait_for_timeout(400)
    q = inst(pg); check(q['id'] == 'speed:g13:div2' and fit_ok(pg), '两位除数版面放得下')
    answer(pg, q['ans']); pg.click('.vdone'); pg.wait_for_timeout(300)
    check(right(pg), f'两位除数写对判对 {q["ans"]}')
    pg.screenshot(path=str(out / 'div2-ok.png'))
    pg.wait_for_timeout(2600)
    q = inst(pg); check(q['id'] == 'speed:g13:mul3' and fit_ok(pg), '三位数乘两位数版面放得下'); pg.screenshot(path=str(out / 'mul3.png'))
    # 再看示范
    pg.click('.vdemoB'); pg.wait_for_timeout(200); check(pg.locator('.vdemo').is_visible(), '「看示范」能再看'); pg.click('.vdemo .vgo')
    # 英文日
    pg.evaluate("I18N.set(true)"); start(pg, ['speed:g10:sub3']); pg.wait_for_timeout(200)
    txt = pg.inner_text('.vq')
    check('Done' in txt and 'Answer' in txt and not any('一' <= ch <= '鿿' for ch in txt), f'英文日竖式版面全英文：{txt[:120]!r}')
    pg.click('.vdemoB'); pg.wait_for_timeout(1800); t2 = pg.inner_text('.vdemo')
    check(not any('一' <= ch <= '鿿' for ch in t2), f'英文示范：{t2[:160]!r}')
    pg.screenshot(path=str(out / 'en-demo.png'))
    pg.close()
    # ---------- iPad App：网页 932 宽、屏幕 1194×834 ----------
    pg = b.new_page(viewport={'width': 932, 'height': 651}, screen={'width': 1194, 'height': 834}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); localStorage.setItem('speedmap.vertdemo', '{{\"add\":1,\"sub\":1,\"mul\":1,\"div\":1}}')"); pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.removeItem('speedmap.test.vertdemo')")
    for qid in ['speed:g13:mul3', 'speed:g13:div2', 'speed:g12:mul2', 'speed:g11:div']:
        start(pg, [qid]); pg.wait_for_timeout(200)
        if not pg.locator('.vdemo').is_visible(): pg.click('.vdemoB'); pg.wait_for_timeout(200)   # 同一种（乘 / 除）示范只自动放一次
        check(pg.locator('.vdemo').is_visible() and hit(pg, '.vdemo .vgo'), f'App 尺寸 {qid} 示范的「我会了」在屏幕里点得到')
        pg.wait_for_timeout(2800 * 14); check(hit(pg, '.vdemo .vagain') and hit(pg, '.vdemo .vgo'), f'App 尺寸 {qid} 示范放完「再看一遍」「我会了」点得到')
        pg.screenshot(path=str(out / f'app-demo-{qid.split(":")[-1]}.png'))
        pg.click('.vdemo .vgo'); pg.wait_for_timeout(150)
        pg.click('.vdunno'); pg.wait_for_timeout(500)
        check(hit(pg, '.vres #qNext') and hit(pg, '.vres .vstep'), f'App 尺寸 {qid} 讲解栏的按钮点得到')
        pg.screenshot(path=str(out / f'app-res-{qid.split(":")[-1]}.png'))
        pg.click('.vres .vstep'); pg.wait_for_timeout(400); check(hit(pg, '.vdemo .vgo'), f'App 尺寸 {qid} 「一步一步看」能关')
        pg.click('.vdemo .vgo'); pg.wait_for_timeout(100)
    start(pg, ['speed:g10:add3']); q = inst(pg)
    if pg.locator('.vdemo').is_visible(): pg.click('.vdemo .vgo'); pg.wait_for_timeout(150)
    answer(pg, q['ans'], 0); pg.click('.vdone'); pg.wait_for_timeout(400)
    check('最右边' in pg.inner_text('.vres') and '_' not in pg.inner_text('.vres .badline') and '□' not in pg.inner_text('.vres .badline'), f'个位没写在最右格：提示，右边空的格子不显示成空框')
    pg.click('#qNext'); pg.wait_for_timeout(300)
    start(pg, ['speed:g13:mul3', 'speed:g10:add3'])
    check(pg.evaluate("__sm.Q.v.input") == 'vert' and fit_ok(pg), 'App 里（932 宽）也是竖式，放得下')
    cw = pg.evaluate("Math.min(...[...document.querySelectorAll('.vcell')].map(c => c.getBoundingClientRect().width))")
    check(cw * 1194 / 932 >= 60, f'App 里答案格换算到屏幕上够手指写（{cw * 1194 / 932:.0f} 点）')
    q = inst(pg); answer(pg, q['ans']); pg.click('.vdone'); pg.wait_for_timeout(300)
    check(right(pg), f'App 尺寸三位数乘两位数写对判对 {q["ans"]}')
    pg.wait_for_timeout(400); check(fit_ok(pg), '答对后上面多了一行，卡片仍在屏幕里')
    pg.screenshot(path=str(out / 'app-mul3.png'))
    # ---------- 递等式 / 填空 / 应用题（Ben 11-08）：App 尺寸 ----------
    pg.wait_for_timeout(2600); pg.evaluate("I18N.set(false)")   # 等上一题自动换题走完再开新一组
    start(pg, ['speed:g13:order', 'speed:g12:dec', 'dock:g10:two', 'speed:g10:quo', 'dock:g15:legs', 'market:g14:unit'])
    check(pg.locator('.vdemo').is_visible(), '递等式第一次先看示范')
    pg.wait_for_timeout(1700); check(pg.inner_text('.vdemo .vtip') == '先算 4 × 6 = 24' and pg.locator('.vdemo .vls div:not(.vhid)').count() == 2, f'递等式示范一行一步、说先算什么：{pg.inner_text(".vdemo .vtip")!r}')
    check(hit(pg, '.vdemo .vgo'), '递等式示范按钮点得到'); pg.screenshot(path=str(out / 'step-demo.png'))
    pg.click('.vdemo .vgo'); pg.wait_for_timeout(150)
    check(fit_ok(pg) and pg.locator('.veq').count() == 2, '递等式版面：两行「=」草稿，放得下')
    q = inst(pg); check('−' in pg.inner_text('.vbq') or '+' in pg.inner_text('.vbq'), '递等式题面在版面上方')
    pg.screenshot(path=str(out / 'step.png'))
    pg.click('.vdunno'); pg.wait_for_timeout(400)
    res = pg.inner_text('.vres'); check('正确写法' in res and f'= {q["ans"]}' in res and hit(pg, '.vres .vstep'), f'递等式不会：一行一行的正确写法：{res[:120]!r}')
    pg.screenshot(path=str(out / 'step-res.png'))
    pg.click('#qNext'); pg.wait_for_timeout(400)
    q = inst(pg); check(q['id'] == 'speed:g12:dec' and not pg.locator('.vdemo').is_visible() and pg.locator('.vcell').count() == 1, '小数填空：没有示范，一个蓝框')
    check(not pg.locator('.vdemoB').is_visible() or pg.evaluate("getComputedStyle(document.querySelector('.vdemoB')).visibility") == 'hidden', '没有示范的版面不显示「看示范」')
    pg.screenshot(path=str(out / 'fill.png'))
    answer(pg, q['ans']); pg.click('.vdone'); pg.wait_for_timeout(300); check(right(pg), f'小数填空写对判对 {q["ans"]}')
    pg.wait_for_timeout(2600)
    q = inst(pg); check(q['id'] == 'dock:g10:two' and pg.locator('.vbq .spk').count() >= 1 and fit_ok(pg), '应用题：题干和喇叭在上方，放得下')
    pg.screenshot(path=str(out / 'word.png'))
    answer(pg, q['ans'] + 1); pg.click('.vdone'); pg.wait_for_timeout(400)
    check('你写的是' in pg.inner_text('.vres') and pg.locator('.vres .vstep').count() == 0 and hit(pg, '.vres #qNext'), '应用题写错：出讲解，没有「一步一步看」')
    pg.screenshot(path=str(out / 'word-bad.png'))
    pg.click('#qNext'); pg.wait_for_timeout(400)
    q = inst(pg); answer(pg, q['ans']); pg.click('.vdone'); pg.wait_for_timeout(300); check(right(pg), f'{q["q"]["text"]} 写对判对')
    pg.wait_for_timeout(2600)
    q = inst(pg); check(fit_ok(pg), f'{q["id"]} 放得下'); pg.wait_for_timeout(100)
    answer(pg, q['ans']); pg.click('.vdone'); pg.wait_for_timeout(300); check(right(pg), f'鸡兔同笼写对判对 {q["ans"]}')
    pg.wait_for_timeout(2600)
    pg.evaluate("I18N.set(true)"); q = inst(pg)
    start(pg, ['market:g14:unit', 'dock:g13:unit']); pg.wait_for_timeout(300)
    txt = pg.inner_text('.vq'); check(not any('\u4e00' <= ch <= '\u9fff' for ch in txt) and fit_ok(pg), f'英文日应用题全英文、放得下：{txt[:100]!r}')
    pg.screenshot(path=str(out / 'word-en.png'))
    pg.close()
    # ---------- iPhone：不变 ----------
    pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(500)
    start(pg, ['speed:g10:add3'])
    check(pg.evaluate("__sm.Q.v.input") == 'write' and pg.locator('.vq').count() == 0, 'iPhone 还是写字板')
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
