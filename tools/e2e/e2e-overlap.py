# 弹窗不被别的东西压住（中控 11-09，字号审查对比图里发现）：刚进锻造室会在屏幕中间弹「今天还可进入 N 次」提示条（#gemToast），
# 这时马上点锻造，确认弹窗的说明句和按钮不能被提示条挡住——每行字、每个按钮的中心点用 elementFromPoint 取，必须落在弹窗里；
# 锻造室右上角侧栏（今天炼出、近 14 天）顶部不出屏；放了 6 种杂色碎片时右栏、返回、碎片按钮都不出屏。手机和 iPad App 尺寸 × 中文、英文。
# 用法：python3 tools/e2e/e2e-overlap.py <项目根> <截图目录>
import sys, json, pathlib, datetime
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'   # 碎片测试开关，同 e2e-gems
fails, errs = [], []
def check(ok, msg):
    if not ok: fails.append(msg)
COVER = """sel => { const box = document.querySelector(sel), bad = [];
  // 提示条是 pointer-events:none，elementFromPoint 会穿过它：量的时候把看得见（不透明、没隐藏）的这类元素临时设成能点中
  const seen = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; } return true; };
  const pe = [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).pointerEvents === 'none' && seen(e)); pe.forEach(e => e.style.setProperty('pointer-events', 'auto', 'important'));
  box.querySelectorAll('b,span,button').forEach(el => { const r = el.getBoundingClientRect(); if (!r.width) return;
    for (const [x, y] of [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 8, r.top + r.height / 2], [r.right - 8, r.top + r.height / 2]]) {
      const hit = document.elementFromPoint(x, y); if (!hit || !box.contains(hit)) { bad.push(el.textContent.trim().slice(0, 30) + ' ← ' + (hit ? (hit.id || hit.className || hit.tagName) : '无')); break; } } });
  pe.forEach(e => e.style.removeProperty('pointer-events')); return bad; }"""
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for (W, H, scr) in [(667, 375, None), (844, 390, None), (932, 651, (1194, 834)), (1165, 814, (1194, 834))]:
        for en in (False, True):
            name = f'{W}x{H}-{"en" if en else "zh"}'
            kw = {'viewport': {'width': W, 'height': H}}
            if scr: kw['screen'] = {'width': scr[0], 'height': scr[1]}
            pg = b.new_page(**kw); pg.on('pageerror', lambda e: errs.append(str(e)))
            day = 0 if not en else (0 if datetime.date.today().day % 2 == 1 else 1)
            seed = {'v': 2, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'placedAt': 1, 'known': {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}, 'settings': {'bilingual': en}, 'testDays': day}
            pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(600)
            if not pg.evaluate("!!(window.GEMUI && GEMUI.enabled() && GEMUI.state())"): fails.append(f'{name}：碎片没开'); pg.close(); continue
            pg.evaluate("Object.assign(GEMUI.state().inv,{s:20,m:20,l:2,o4:1,o6:2,o7:3,o8:1,o12:1,o13:2}); GEMUI.openForge('island')"); pg.wait_for_timeout(250)
            for _ in range(3): pg.locator('[data-add=s]').click(); pg.wait_for_timeout(20)
            pg.click('#forgeGo'); pg.wait_for_timeout(150)   # 提示条（1.5 秒）还在的时候弹窗出来
            check(pg.locator('#forgeWarn').is_visible(), f'{name}：锻造确认弹窗没出来')
            bad = pg.evaluate(COVER, '#forgeWarn .fwcard')
            check(not bad, f'{name}：锻造确认弹窗被挡住 {bad}')
            top = pg.evaluate("(() => { const r = document.getElementById('forgeToday').getBoundingClientRect(); return [r.top, r.bottom, innerHeight]; })()")
            check(top[0] >= 0 and top[1] <= top[2], f'{name}：锻造室侧栏出屏 {top}')
            oob = pg.evaluate("[...document.querySelectorAll('#forge button, #forgeToday, #forgeLeft')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 0.5 || r.left < -0.5 || r.bottom > innerHeight + 0.5); }).map(e => e.id || e.textContent.trim().slice(0, 20))")
            check(not oob, f'{name}：锻造室有东西出屏（右栏、返回、杂色碎片） {oob}')   # 667 宽英文日右栏曾超出 9px（字号审查 R2 前自查）
            pg.screenshot(path=str(out / f'{name}-warn.png'))
            pg.close()
    b.close()
print('错误', errs[:5] or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
