# v8 思维模块原型走查：每个模块每个技能，答错 / 不会 / 做对；不会后停住等「继续」；连点只进一题；不叠字、不出屏
# 尺寸含 Safari 横屏矮屏 874×297（11-01 模拟器实测）和 iPad。用法：python3 tools/e2e/e2e-v8.py . <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'docs' / '原型-v8-思维' / '思维模块.html').as_uri() + '?seed=7'
SIZES = [(932, 430), (844, 390), (667, 375), (874, 297), (1180, 820)]
fails, errs = [], []
def check(ok, msg):
    if not ok: fails.append(msg); print('不通过', msg)
LAYOUT = """() => { const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const items = []; const w = document.createTreeWalker(document.getElementById('stage'), NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode, p = n.parentElement; if (!n.textContent.trim() || !p.offsetParent || p.closest('svg') || p.classList.contains('empty')) continue;
    const r = document.createRange(); r.selectNodeContents(n); for (const b of r.getClientRects()) items.push({t: n.textContent.trim().slice(0, 16), b}); }
  const pairs = []; items.forEach((a, i) => items.slice(i + 1).forEach(c => { if (a.t !== c.t && hit(a.b, c.b)) pairs.push(a.t + ' × ' + c.t); }));
  const clip = []; document.querySelectorAll('#stage button, #stage .say, #stage .fb, #stage .sub, #stage .eq, #stage .found').forEach(e => { if (!e.offsetParent) return; const b = e.getBoundingClientRect(); if (b.width && (b.bottom > innerHeight + 1 || b.right > innerWidth + 1 || b.top < -1 || b.left < -1)) clip.push(e.id || e.className || e.tagName); });
  const s = document.getElementById('stage').getBoundingClientRect(); const main = document.getElementById('main'); const over = [];
  if (main) { const m = main.getBoundingClientRect(); main.querySelectorAll('*').forEach(e => { if (e.closest('svg')) return; const b = e.getBoundingClientRect(); if (b.height && b.bottom > m.bottom + 1) over.push(e.id || e.className || e.tagName); }); }
  let small = 0; document.querySelectorAll('#stage button').forEach(b => { const r = b.getBoundingClientRect(); if (r.height && r.height < 36 && !b.closest('.grid,.cells')) small++; });
  return {pairs, clip, over: [...new Set(over)].slice(0, 5), small}; }"""
def layout(pg, tag):
    r = pg.evaluate(LAYOUT)
    for k in ('pairs', 'clip', 'over'):
        check(not r[k], f'{tag} {k}: {r[k]}')
    check(r['small'] == 0, f"{tag} 按钮太矮 {r['small']} 个")
def q(pg): return pg.evaluate('JSON.parse(JSON.stringify(window.__v8.q, (k, v) => typeof v === "function" ? undefined : v))')
def done(pg): return pg.evaluate('window.__v8.done')
def solve(pg, mod, t):
    x = q(pg)
    if mod == 'balance':
        if x['kind'] == 'judge': pg.click('#yes' if x['equal'] else '#no')
        elif x['kind'] == 'fill': pg.click(f'[data-n="{x["answer"]}"]')
        elif x['kind'] == 'blind': pg.click(f'[data-n="{x["answer"]}"]'); pg.click('#weigh')
        else:
            a, c = pg.evaluate('Puzzles.altPair(window.__v8.q)'); pg.click(f'[data-n="{a}"]'); pg.click(f'[data-n="{c}"]')
    elif mod == 'target':
        s = x['solutions'][0]; idx = lambda n: x['cards'].index(n)
        for n in s['plus']: pg.click(f'[data-i="{idx(n)}"]')
        for n in s['minus']: pg.click('#sm'); pg.click(f'[data-i="{idx(n)}"]')
        pg.click('#chk')
    elif x['kind'] == 'grid':
        for i, v in enumerate(x['givens']):
            if not v: pg.click(f'[data-c="{i}"]'); pg.click(f'[data-n="{x["solution"][i]}"]')
    elif x['kind'] == 'dog':
        pg.click(f'[data-b="{x["answer"]}"]')
    elif x['kind'] == 'mirror':
        for i in x['want']: pg.click(f'[data-c="{i}"]')
        pg.click('#check')
    else:
        i = [k for k, o in enumerate(x['options']) if o['ok']][0]; pg.click(f'[data-o="{i}"]')
    pg.wait_for_timeout(120)
def wrong(pg, mod):   # 做错一次：应留在原题（平不平除外，它一答就讲解）
    x = q(pg)
    if mod == 'balance' and x['kind'] == 'fill': pg.click(f'[data-n="{x["answer"] % 12 + 1}"]')
    elif mod == 'balance' and x['kind'] == 'blind': pg.click(f'[data-n="{x["answer"] % 12 + 1}"]'); pg.click('#weigh')
    elif mod == 'balance' and x['kind'] == 'two': pg.click('[data-n="1"]'); pg.click(f'[data-n="{x["total"] % 12 + 1}"]')
    elif mod == 'target':
        ok = [sorted(s['plus']) for s in x['solutions'] if not s['minus']]
        pair = next(c for c in ([x['cards'][i], x['cards'][j]] for i in range(4) for j in range(i + 1, 4)) if sum(c) != x['target'])
        pg.click(f'[data-i="{x["cards"].index(pair[0])}"]'); pg.click(f'[data-i="{x["cards"].index(pair[1])}"]'); pg.click('#chk')
        pg.wait_for_timeout(120); pg.evaluate("window.__wrongShot = true"); layout(pg, 'target 算错'); pg.click('#undo'); pg.click('#undo'); return True
    elif x.get('kind') == 'dog':
        pg.click(f'[data-b="{[n for n in x["boxes"] if n != x["answer"]][0]}"]')
    elif x.get('kind') == 'rotate':
        i = [k for k, o in enumerate(x['options']) if not o['ok']][0]; pg.click(f'[data-o="{i}"]')
    elif x.get('kind') == 'mirror': pg.click('#check')
    elif x.get('kind') == 'grid':
        i = [k for k, v in enumerate(x['givens']) if not v][0]; good = x['solution'][i]; pg.click(f'[data-c="{i}"]'); pg.click(f'[data-n="{good % x["n"] + 1}"]')
    else: return False
    pg.wait_for_timeout(120); return True
with sync_playwright() as p:
    b = p.chromium.launch()
    for W, H in SIZES:
        pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(150); layout(pg, f'{W}x{H} 首屏')
        if (W, H) == SIZES[3]: pg.screenshot(path=str(out / 'home.png'))
        mods = pg.evaluate('Puzzles.MODULES.map(m => [m.id, m.tiers.length])')
        for mod, n in mods:
            mx, my = pg.evaluate(f"(() => {{ const r = document.querySelector('[data-m={mod}]').getBoundingClientRect(); return [r.left + r.width * .75, r.bottom - 8]; }})()")
            pg.mouse.click(mx, my); pg.wait_for_timeout(120); pg.mouse.click(mx, my); pg.wait_for_timeout(100)   # 连点进模块不能误触第一题
            check(not done(pg), f'{W}x{H} {mod} 连点进入不触发第一题的按钮'); pg.wait_for_timeout(550)
            for t in range(n):
                pg.click(f'[data-t="{t}"]'); pg.wait_for_timeout(650)
                tag = f'{W}x{H} {mod}{t}'; layout(pg, tag + ' 题面')
                pg.screenshot(path=str(out / f'{W}x{H}-{mod}{t}-q.png'))
                k0 = json.dumps(q(pg))
                if wrong(pg, mod):
                    if mod == 'balance' and t in (1, 3): check('≠' in pg.inner_text('#eq'), tag + ' 填错时算式应写不等号')
                    layout(pg, tag + ' 答错'); check(not done(pg) and json.dumps(q(pg)) == k0, tag + ' 答错后应留在原题')
                    pg.screenshot(path=str(out / f'{W}x{H}-{mod}{t}-wrong.png'))
                dx, dy = pg.evaluate("(() => { const r = document.getElementById('dunno').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
                pg.mouse.click(dx, dy); pg.wait_for_timeout(120); pg.mouse.click(dx, dy); pg.wait_for_timeout(1200)   # 连点「不会」不能跳过讲解
                check(done(pg) and json.dumps(q(pg)) == k0 and pg.is_visible('#cont'), tag + ' 不会后停住等继续')
                layout(pg, tag + ' 不会'); pg.screenshot(path=str(out / f'{W}x{H}-{mod}{t}-dunno.png'))
                x, y = pg.evaluate("(() => { const r = document.getElementById('cont').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
                ore0 = pg.evaluate('window.__v8.ore'); pg.mouse.click(x, y); pg.wait_for_timeout(90); pg.mouse.click(x, y); pg.wait_for_timeout(250)
                check(not done(pg) and json.dumps(q(pg)) != k0, tag + ' 连点继续只进一题')
                if mod == 'balance' and t == 2:   # 照抄右边不算
                    y = q(pg); pg.wait_for_timeout(550); pg.click(f'[data-n="{y["right"][0]}"]'); pg.click(f'[data-n="{y["right"][1]}"]'); pg.wait_for_timeout(100); check(not done(pg), tag + ' 照抄右边不算对')
                pg.wait_for_timeout(550)
                solve(pg, mod, t)
                check(done(pg) and pg.evaluate('window.__v8.ore') == ore0 + 1, tag + ' 做对后得矿石并等继续')
                layout(pg, tag + ' 做对'); pg.wait_for_timeout(650)
                if mod == 'target' and t == 2:   # 把凑法全找完，已找到的算式不能伸出左栏
                    x = q(pg)
                    for sol in x['solutions'][1:]:
                        pg.click('#more'); pg.wait_for_timeout(600); idx = lambda n: x['cards'].index(n)
                        for n in sol['plus']: pg.click(f'[data-i="{idx(n)}"]')
                        for n in sol['minus']: pg.click('#sm'); pg.click(f'[data-i="{idx(n)}"]')
                        pg.click('#chk'); pg.wait_for_timeout(600)
                    box = pg.evaluate("(() => { const c = document.querySelector('.found').parentElement.getBoundingClientRect(); let m = 0, b = 0; document.querySelectorAll('.found span').forEach(e => { const r = e.getBoundingClientRect(); m = Math.max(m, r.right); b = Math.max(b, r.bottom); }); return [m, c.right, b, c.bottom]; })()")
                    check(box[0] <= box[1] + 1 and box[2] <= box[3] + 1, f'{tag} 已找到的算式伸出左栏 {box}'); layout(pg, tag + ' 全部找到')
                if W == 874 or W == 932: pg.wait_for_timeout(1900); pg.screenshot(path=str(out / f'{W}x{H}-{mod}{t}-ok.png'))
            pg.click('#back'); pg.wait_for_timeout(100)
        pg.close()
    # 竖屏提示
    pg = b.new_page(viewport={'width': 402, 'height': 874}); pg.goto(url); check(pg.is_visible('#turn'), '竖屏应提示横过来'); pg.close()
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
