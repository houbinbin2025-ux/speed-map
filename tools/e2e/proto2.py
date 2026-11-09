# 第二批原型走查（docs/原型-第二批/index.html）：6 种尺寸截图讲解卡和每道题；真在写字板上画数字笔画；
# 走完整流程（写对、写错、不会、分步两格、选择题、连点；答错后「继续」有 0.5 秒防连点，脚本像真人一样停 0.6 秒再点），查溢出、报错和结果记录。用法：python3 tools/e2e/proto2.py . <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'docs' / '原型-第二批' / 'index.html').as_uri()
SIZES = [(932, 430), (844, 390), (812, 375), (667, 375), (874, 297), (1180, 820)]
fails, errs = [], []
def check(ok, msg):
    if not ok: fails.append(msg); print('不通过', msg)
# 用 ink.js 的规范字形画数字：digit 第 i 位画在写字板第 i 个位置
DRAW = """async (digits) => {
  const cv = document.querySelector('#pad canvas'), r = cv.getBoundingClientRect(), S = window.INK.STD, h = r.height * 0.5, w = h * 0.6;
  const arcs = []; let id = 1;
  for (let i = 0; i < digits.length; i++) {
    const form = S[digits[i]][0], x0 = r.left + 30 + i * (w + h * 0.45), y0 = r.top + r.height * 0.18;
    for (const st of form) {
      const pts = []; for (let k = 0; k + 1 < st.length; k++) for (let j = 0; j < 6; j++) { const t = j / 6; pts.push([st[k][0] + t * (st[k + 1][0] - st[k][0]), st[k][1] + t * (st[k + 1][1] - st[k][1])]); } pts.push(st[st.length - 1]);
      const ev = (type, p) => cv.dispatchEvent(new PointerEvent(type, {pointerId: id, bubbles: true, clientX: x0 + p[0] / 0.6 * w, clientY: y0 + p[1] * h, pointerType: 'touch', isPrimary: true}));
      ev('pointerdown', pts[0]); for (const p of pts.slice(1)) ev('pointermove', p); ev('pointerup', pts[pts.length - 1]); id++;
    }
  }
}"""
LAYOUT = """(vert) => { const vw = innerWidth, vh = innerHeight, bad = [];
  document.querySelectorAll('.scr:not([hidden]) *').forEach(e => { if (!e.offsetParent && e.tagName !== 'svg') return; const b = e.getBoundingClientRect(); if (!b.width) return;
    if (b.right > vw + 1 || (vert && b.bottom > vh + 1) || b.left < -1 || (vert && b.top < -1)) bad.push((e.id || e.className.baseVal || e.className || e.tagName) + ' ' + Math.round(b.right) + 'x' + Math.round(b.bottom)); });
  const fig = document.querySelector('.scr:not([hidden]) .fig svg'); const small = fig ? fig.getBoundingClientRect().height : null;
  const pad = document.querySelector('#pad'), ph = pad && pad.offsetParent ? pad.getBoundingClientRect().height : null;
  const btns = [...document.querySelectorAll('.scr:not([hidden]) button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 40).map(b => b.textContent);
  return {bad: [...new Set(bad)].slice(0, 5), fig: small, pad: ph, btns}; }"""
def lay(pg, tag, minfig=60, vert=True):   # vert=False：页面本身可以上下滑（结果页给家长看），只查横向出屏
    r = pg.evaluate(LAYOUT, vert)
    check(not r['bad'], f'{tag} 出屏 {r["bad"]}')
    if r['fig'] is not None: check(r['fig'] >= minfig, f'{tag} 图太小 {r["fig"]:.0f}px')
    if r['pad'] is not None: check(r['pad'] >= 120, f'{tag} 写字板太矮 {r["pad"]:.0f}px')
    check(not r['btns'], f'{tag} 按钮太矮 {r["btns"]}')
def q(pg): return pg.evaluate('window.__p2.Q && {id: __p2.Q.id, done: __p2.Q.done, k: __p2.Q.k, got: __p2.Q.got}')
def cardnext(pg): pg.click('#cNext'); pg.wait_for_timeout(560)
def write(pg, s): pg.evaluate(DRAW, s); pg.wait_for_timeout(1100)
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for W, H in SIZES:
        pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True); pg.on('pageerror', lambda e: errs.append(f'{W}x{H} ' + str(e)))
        pg.on('console', lambda m: errs.append(f'{W}x{H} console ' + m.text) if m.type == 'error' else None)
        pg.goto(url); pg.wait_for_timeout(300); tag = f'{W}x{H}'
        check('标准字形' in pg.inner_text('#inkInfo'), f'{tag} 没有本机笔迹时提示用标准字形'); lay(pg, tag + ' 说明页')
        pg.click('#startBtn'); pg.wait_for_timeout(300)
        # 线段图讲解卡：连点「下一步」只翻一页
        pg.click('#cNext'); pg.click('#cNext'); pg.wait_for_timeout(100)
        check(pg.evaluate('__p2.CARD.p') == 1, f'{tag} 连点下一步只翻一页'); pg.wait_for_timeout(500)
        pg.click('#cBack'); pg.wait_for_timeout(560); check(pg.evaluate('__p2.CARD.p') == 0 and not pg.is_visible('#cBack'), f'{tag} 上一步回到第 1 页，第 1 页不显示上一步'); pg.click('#cNext'); pg.wait_for_timeout(560)
        n = 1
        while pg.evaluate('!!__p2.CARD'):
            p0 = pg.evaluate('__p2.CARD.p'); k = pg.evaluate('__p2.CARD.key')
            lay(pg, f'{tag} 卡 {k}{p0}', 50); pg.screenshot(path=str(out / f'{W}-card-{k}{p0}.png')); cardnext(pg); n += 1
            if n > 8: break
        # bar1：写对 14
        check(q(pg)['id'] == 'bar1', f'{tag} 讲解卡后进第一题'); lay(pg, tag + ' bar1'); pg.screenshot(path=str(out / f'{W}-q-bar1.png'))
        write(pg, '14'); r = q(pg); check(r['done'] and r['got'] == ['14'], f'{tag} bar1 写 14 判对 {r}'); pg.wait_for_timeout(1400)
        # bar2：写错 7 → 图解 → 继续
        lay(pg, tag + ' bar2'); pg.screenshot(path=str(out / f'{W}-q-bar2.png')); write(pg, '7'); r = q(pg)
        check(r['done'] and r['got'] == ['7'] and pg.is_visible('#qNext'), f'{tag} bar2 写错停住等继续 {r}'); lay(pg, tag + ' bar2 图解'); pg.screenshot(path=str(out / f'{W}-q-bar2-bad.png'))
        pg.wait_for_timeout(600); pg.click('#qNext'); pg.wait_for_timeout(560)
        # 条形图讲解卡
        while pg.evaluate('!!__p2.CARD'):
            p0 = pg.evaluate('__p2.CARD.p'); lay(pg, f'{tag} 卡 chart{p0}', 50); pg.screenshot(path=str(out / f'{W}-card-chart{p0}.png')); cardnext(pg)
        lay(pg, tag + ' chart1'); pg.screenshot(path=str(out / f'{W}-q-chart1.png')); write(pg, '7'); r = q(pg); check(r['done'] and r['got'] == ['7'], f'{tag} chart1 写 7 判对 {r} {pg.inner_text("#qFb")}'); pg.wait_for_timeout(1400)
        # chart2：点「不会」
        pg.wait_for_timeout(100); pg.wait_for_timeout(600); pg.click('#qDunno'); pg.wait_for_timeout(200); r = q(pg); check(r['done'] and pg.is_visible('#qNext') and '9 − 6 = 3' in pg.inner_text('#qFig'), f'{tag} chart2 不会停住，看得到 9 − 6 = 3'); lay(pg, tag + ' chart2 不会'); pg.screenshot(path=str(out / f'{W}-q-chart2-dunno.png'))
        pg.wait_for_timeout(600); pg.click('#qNext'); pg.wait_for_timeout(560)
        while pg.evaluate('!!__p2.CARD'):
            p0 = pg.evaluate('__p2.CARD.p'); lay(pg, f'{tag} 卡 area{p0}', 50); pg.screenshot(path=str(out / f'{W}-card-area{p0}.png')); cardnext(pg)
        lay(pg, tag + ' area1'); pg.screenshot(path=str(out / f'{W}-q-area1.png')); write(pg, '15'); pg.wait_for_timeout(1400)
        write(pg, '14'); pg.wait_for_timeout(1400)
        # 分步：47
        r = q(pg); check(r['id'] == 'step1' and r['k'] == 0, f'{tag} 进分步题 {r}'); lay(pg, tag + ' step1'); pg.screenshot(path=str(out / f'{W}-q-step1.png'))
        write(pg, '47'); pg.wait_for_timeout(1700); r = q(pg); check(r['k'] == 0 and r['got'] == [] and '一个方框写一个数' in pg.inner_text('#qFb'), f'{tag} 第 1 格写两位数要重写 {r}')
        write(pg, '4'); r = q(pg); check(r['k'] == 1 and r['got'] == ['4'] and not r['done'], f'{tag} 第 1 格写完跳到第 2 格 {r}'); pg.screenshot(path=str(out / f'{W}-q-step1-k2.png'))
        pg.wait_for_timeout(600); write(pg, '7'); r = q(pg); check(r['done'] and r['got'] == ['4', '7'], f'{tag} 分步两格判对 {r}'); pg.wait_for_timeout(1400)
        # step2：60，第 2 格写错 8
        write(pg, '6'); pg.wait_for_timeout(600); pg.click('#qClear'); pg.wait_for_timeout(100); r = q(pg); check(r['k'] == 0 and r['got'] == [], f'{tag} 第 2 格空着点擦掉回到第 1 格 {r}')
        write(pg, '6'); pg.wait_for_timeout(600); write(pg, '8'); r = q(pg); check(r['done'] and pg.is_visible('#qNext'), f'{tag} 分步写错停住 {r}'); lay(pg, tag + ' step2 错'); pg.screenshot(path=str(out / f'{W}-q-step2-bad.png'))
        pg.wait_for_timeout(600); pg.click('#qNext'); pg.wait_for_timeout(560)
        # 选择题
        lay(pg, tag + ' pick1'); pg.screenshot(path=str(out / f'{W}-q-pick1.png')); pg.click('#qOpts [data-i="0"]'); pg.wait_for_timeout(1400)
        pg.click('#qOpts [data-i="2"]'); pg.wait_for_timeout(200); lay(pg, tag + ' pick2 错'); pg.screenshot(path=str(out / f'{W}-q-pick2-bad.png')); pg.wait_for_timeout(600); pg.click('#qNext'); pg.wait_for_timeout(400)
        check(pg.is_visible('#done'), f'{tag} 到结果页'); check(pg.evaluate("getComputedStyle(document.getElementById('done')).overflowY") == 'auto', f'{tag} 结果页能上下滑'); lay(pg, tag + ' 结果', 0, False); pg.screenshot(path=str(out / f'{W}-done.png'))
        L = pg.evaluate('__p2.LOG'); res = [(x['id'], x['ok'], x['dunno']) for x in L['qs']]
        exp = [('bar1', True, False), ('bar2', False, False), ('chart1', True, False), ('chart2', False, True), ('area1', True, False), ('area2', True, False), ('step1', True, False), ('step2', False, False), ('pick1', True, False), ('pick2', False, False)]
        check(res == exp, f'{tag} 结果记录 {res}'); check(len(L['cards']) == 3, f'{tag} 记了 3 张讲解卡')
        check(pg.evaluate("localStorage.getItem('speedmap.v2') === null && localStorage.getItem('speedmap.ink') === null"), f'{tag} 没写正式版存档')
        pg.close()
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
