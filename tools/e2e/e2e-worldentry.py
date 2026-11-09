# 方块世界入口不招人（Ben 11-09：「方块世界的入口淡 50%，可以点击，但是不容易查看到，不引诱空空一直进入」）
# 入口只在 iPad App 里（ios/world-entry.js 打包时插进页面）：这里把它注进岛首页查——
# 透明度 0.5、没有动画和阴影、旁边没有「可玩 N 分钟」状态条、热区 68×68、点了跳去 world/index.html；手机和 iPad 尺寸 × 中英文。
# 用法：python3 tools/e2e/e2e-worldentry.py <项目根> <截图目录> [入口脚本，默认 ios/world-entry.js]
import sys, json, pathlib, datetime
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
entry = pathlib.Path(sys.argv[3]) if len(sys.argv) > 3 else root / 'ios' / 'world-entry.js'
url = (root / 'v2' / 'index.html').as_uri() + '#test'
fails, errs = [], []
def check(ok, msg):
    if not ok: fails.append(msg)
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for (W, H, scr) in [(667, 375, None), (844, 390, None), (932, 651, (1194, 834)), (1165, 814, (1194, 834))]:
        for en in (False, True):
            name = f'{W}x{H}-{"en" if en else "zh"}'
            kw = {'viewport': {'width': W, 'height': H}}
            if scr: kw['screen'] = {'width': scr[0], 'height': scr[1]}
            pg = b.new_page(**kw); pg.on('pageerror', lambda e: errs.append(str(e)))
            day = (0 if datetime.date.today().day % 2 == 1 else 1) if en else 0
            seed = {'v': 2, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'placedAt': 1, 'known': {}, 'settings': {'bilingual': en}, 'testDays': day}
            pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(600)
            pg.add_script_tag(path=str(entry)); pg.wait_for_timeout(400)
            r = pg.evaluate("""(() => { const b = document.getElementById('worldEntry'); if (!b) return null; const c = getComputedStyle(b), r = b.getBoundingClientRect();
              return {op: +c.opacity, anim: c.animationName, shadow: c.boxShadow, run: b.getAnimations({subtree: true}).length, w: r.width, h: r.height, x: r.left, y: r.top,
                chip: !!document.getElementById('worldChip') && getComputedStyle(document.getElementById('worldChip')).display !== 'none',
                hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) && b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)),
                badge: [...b.querySelectorAll('*')].some(e => /dot|badge|new/i.test(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className)) }; })()""")
            if not r: fails.append(f'{name}：没有方块世界入口'); pg.close(); continue
            check(abs(r['op'] - 0.5) < 0.01, f"{name}：入口透明度 {r['op']}，应 0.5")
            check(r['anim'] == 'none' and r['run'] == 0, f"{name}：入口有动画 {r['anim']} {r['run']}")
            check(r['shadow'] == 'none', f"{name}：入口还有立体阴影 {r['shadow']}")
            check(not r['chip'], f'{name}：入口旁还有「可玩 N 分钟」状态条')
            check(not r['badge'], f'{name}：入口上有角标 / 红点')
            check(r['w'] >= 68 and r['h'] >= 68, f"{name}：热区缩小了 {r['w']}x{r['h']}")
            check(r['hit'], f'{name}：入口中心点不到（被别的东西挡住）')
            pg.screenshot(path=str(out / f'{name}-island.png'))
            reqs = []; pg.on('request', lambda q: reqs.append(q.url))
            pg.click('#worldEntry'); pg.wait_for_timeout(500)
            check(any(u.split('#')[0].endswith('/world/index.html') for u in reqs) or pg.url.split('#')[0].endswith('/world/index.html'), f'{name}：点了没跳去方块世界 {reqs[-3:]}')
            pg.close()
    b.close()
print('错误', errs[:5] or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
