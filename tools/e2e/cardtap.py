# 讲解卡（第二批）每一张、每一页：右下「下一步 / 试一试」按钮中心点得到（elementFromPoint 命中按钮本身），
# 喇叭和说明句不压按钮、不出屏（捣蛋鬼第 1 轮第 2、8 条：线段图第 5 页喇叭压在「试一试」正中，点了翻不过去）。
# 尺寸：iPhone 568×320、667×375、844×390、874×297，iPad App 932×651（screen 1194×834）；中文、英文各一遍。
# 用法：python3 tools/e2e/cardtap.py <项目根> [截图目录]
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
if out: out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '#test'
SIZES = [(568, 320, None), (667, 375, None), (844, 390, None), (874, 297, None), (932, 651, (1194, 834))]
fails = []
def check(ok, msg):
    if not ok: fails.append(msg); print('不通过', msg)
START = """c => { const {K} = window.__sm; const id = Object.keys(K.ITEM).find(i => { const s = K.BY[K.ITEM[i].skill]; return s && s.concept === c; });
  const sk = K.ITEM[id].skill, x = K.rawPool(id)[0], list = [{kind: 'demo', concept: c, skill: sk}, {kind: 'q', seg: 'new', inst: {id, q: x.q, ans: x.ans}}];
  window.__sm.startQ('free', {sess: {next: () => list.shift() || null, answer: () => undefined}, group: K.BY[sk].group}); }"""
PROBE = """() => { const a = document.getElementById('ack'), r = a.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = document.elementFromPoint(cx, cy), bad = [], vw = innerWidth, vh = innerHeight;
  if (!hit || !(hit === a || a.contains(hit))) bad.push('按钮中心点到 ' + (hit ? (hit.id || hit.className || hit.tagName) : '空'));
  if (r.right > vw + 1 || r.bottom > vh + 1) bad.push('按钮出屏');
  const ov = b => b.width && b.right > r.left + 1 && b.left < r.right - 1 && b.bottom > r.top + 1 && b.top < r.bottom - 1;
  document.querySelectorAll('#demoBox .cline .spk, #demoBox .cline .nbsay > span').forEach(e => { const b = e.getBoundingClientRect();
    if (ov(b)) bad.push((e.classList.contains('spk') ? '喇叭' : '说明句') + '压按钮');
    if (b.right > vw + 1 || b.bottom > vh + 1) bad.push((e.classList.contains('spk') ? '喇叭' : '说明句') + '出屏'); });
  return bad; }"""
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for en in (False, True):
        for W, H, scr in SIZES:
            ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=True)
            if scr: ctx.add_init_script(f"Object.defineProperty(screen,'width',{{get:()=>{scr[0]}}});Object.defineProperty(screen,'height',{{get:()=>{scr[1]}}})")
            pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(url)
            pg.evaluate("en => localStorage.setItem('speedmap.v2.test', JSON.stringify({v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, settings: {bilingual: en}, testDays: en && !I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 1 : 0}))", en)
            pg.reload(); pg.wait_for_timeout(300)
            tag = f"{W}x{H}{' App' if scr else ''} {'英' if en else '中'}"
            check((pg.evaluate("document.documentElement.lang") == 'en') == en, f'{tag} 语言没切对')
            for c in pg.evaluate("window.__sm.R.CONCEPTS"):
                pg.evaluate(START, c); pg.wait_for_timeout(250)
                n = pg.evaluate("__sm.Q.card && __sm.Q.card.n") or 0
                check(n > 0, f'{tag} {c} 没出讲解卡')
                for i in range(n):
                    pg.wait_for_function("!document.getElementById('ack').disabled", timeout=4000)
                    bad = pg.evaluate(PROBE); check(not bad, f'{tag} {c} 第 {i + 1} 页 {bad}')
                    if out and bad: pg.screenshot(path=str(out / f"{W}x{H}{'A' if scr else ''}-{'en' if en else 'zh'}-{c}-{i + 1}.png"))
                    bb = pg.locator('#ack').bounding_box(); pg.touchscreen.tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(250)
                    want = i + 1 if i + 1 < n else None
                    got = pg.evaluate("__sm.Q && __sm.Q.card ? __sm.Q.card.p : null")
                    check(got == want, f'{tag} {c} 第 {i + 1} 页点按钮中心没翻页（停在 {got}）')
                    if want is None: break
                pg.evaluate("window.__sm.Q && window.__sm.Q.x && (window.__sm.Q.sess = {next: () => null, answer: () => undefined})")
            check(not errs, f'{tag} 页面报错 {errs[:2]}')
            ctx.close()
    b.close()
print('不通过', fails if fails else '无')
sys.exit(1 if fails else 0)
