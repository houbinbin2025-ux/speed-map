# 思维模块走查（v2 岛上）：从岛上走进每个地点、每个技能：答错 / 不会 / 做对；不会后停住等「继续」；连点只进一题；不叠字、不出屏；
# 进度写进存档、回岛后木牌变化、刷新不丢；旧存档不受影响。尺寸含 Safari 横屏矮屏 874×297 和 iPad。用法：python3 tools/e2e/e2e-v8.py . <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '#test'
SIZES = [(932, 430), (844, 390), (667, 375), (874, 297), (1180, 820)]
known = {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}
seed = {'v': 2, 'savedAt': 0, 'cards': {'keep': {'lv': 2}}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': known, 'oral': True, 'settings': {'bilingual': False}}
ALL = {'balance': [3, 3, 3, 3], 'target': [3, 3, 3], 'clue': [3, 3, 3, 3], 'block': [3, 3, 3, 3]}
fails, errs = [], []
def check(ok, msg):
    if not ok: fails.append(msg); print('不通过', msg)
LAYOUT = """() => { const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1, st = document.querySelector('#think .tstage');
  const items = []; const w = document.createTreeWalker(st, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode, p = n.parentElement; if (!n.textContent.trim() || !p.offsetParent || p.closest('svg') || p.classList.contains('empty')) continue;
    const r = document.createRange(); r.selectNodeContents(n); for (const b of r.getClientRects()) items.push({t: n.textContent.trim().slice(0, 16), b}); }
  const pairs = []; items.forEach((a, i) => items.slice(i + 1).forEach(c => { if (a.t !== c.t && hit(a.b, c.b)) pairs.push(a.t + ' × ' + c.t); }));
  const clip = []; st.querySelectorAll('button,.say,.fb,.sub,.eq,.found').forEach(e => { if (!e.offsetParent) return; const b = e.getBoundingClientRect(); if (b.width && (b.bottom > innerHeight + 1 || b.right > innerWidth + 1 || b.top < -1 || b.left < -1)) clip.push(e.id || e.className || e.tagName); });
  const main = st.querySelector('#main'), over = [];
  if (main) { const m = main.getBoundingClientRect(); main.querySelectorAll('*').forEach(e => { if (e.closest('svg')) return; const b = e.getBoundingClientRect(); if (b.height && b.bottom > m.bottom + 1) over.push(e.id || e.className || e.tagName); }); }
  let small = 0; st.querySelectorAll('button').forEach(b => { const r = b.getBoundingClientRect(); if (r.height && r.height < 36 && !b.closest('.grid,.cells')) small++; });
  return {pairs, clip, over: [...new Set(over)].slice(0, 5), small}; }"""
def layout(pg, tag):
    r = pg.evaluate(LAYOUT)
    for k in ('pairs', 'clip', 'over'): check(not r[k], f'{tag} {k}: {r[k]}')
    check(r['small'] == 0, f"{tag} 按钮太矮 {r['small']} 个")
T = '#think '
def tap(pg, sel): pg.click(T + sel)
def q(pg): return pg.evaluate('JSON.parse(JSON.stringify(__sm.TH.G.q))')
def done(pg): return pg.evaluate('__sm.TH.G.done')
def ore(pg): return pg.evaluate('__sm.TH.G.ore')
def solve(pg, mod):
    x = q(pg)
    if mod == 'balance':
        if x['kind'] == 'judge': tap(pg, '#yes' if x['equal'] else '#no')
        elif x['kind'] == 'fill': tap(pg, f'[data-n="{x["answer"]}"]')
        elif x['kind'] == 'blind': tap(pg, f'[data-n="{x["answer"]}"]'); tap(pg, '#weigh')
        else:
            a, c = pg.evaluate('PUZZLES.altPair(__sm.TH.G.q)'); tap(pg, f'[data-n="{a}"]'); tap(pg, f'[data-n="{c}"]')
    elif mod == 'target':
        s = x['solutions'][0]; idx = lambda n: x['cards'].index(n)
        for n in s['plus']: tap(pg, f'[data-i="{idx(n)}"]')
        for n in s['minus']: tap(pg, '#sm'); tap(pg, f'[data-i="{idx(n)}"]')
        tap(pg, '#chk')
    elif x['kind'] == 'grid':
        for i, v in enumerate(x['givens']):
            if not v: tap(pg, f'[data-c="{i}"]'); tap(pg, f'[data-n="{x["solution"][i]}"]')
    elif x['kind'] == 'dog': tap(pg, f'[data-b="{x["answer"]}"]')
    elif x['kind'] == 'mirror':
        for i in x['want']: tap(pg, f'[data-c="{i}"]')
        tap(pg, '#mirrorOk')
    else: tap(pg, f'[data-o="{[k for k, o in enumerate(x["options"]) if o["ok"]][0]}"]')
    pg.wait_for_timeout(120)
def wrong(pg, mod):
    x = q(pg)
    if mod == 'balance' and x['kind'] == 'fill': tap(pg, f'[data-n="{x["answer"] % 12 + 1}"]')
    elif mod == 'balance' and x['kind'] == 'blind': tap(pg, f'[data-n="{x["answer"] % 12 + 1}"]'); tap(pg, '#weigh')
    elif mod == 'balance' and x['kind'] == 'two': tap(pg, '[data-n="1"]'); tap(pg, f'[data-n="{x["total"] % 12 + 1}"]')
    elif mod == 'target':
        pair = next(c for c in ([x['cards'][i], x['cards'][j]] for i in range(4) for j in range(i + 1, 4)) if sum(c) != x['target'])
        tap(pg, f'[data-i="{x["cards"].index(pair[0])}"]'); tap(pg, f'[data-i="{x["cards"].index(pair[1])}"]'); tap(pg, '#chk'); pg.wait_for_timeout(120)
        layout(pg, 'target 算错'); tap(pg, '#undo'); tap(pg, '#undo'); return True
    elif x.get('kind') == 'dog': tap(pg, f'[data-b="{[n for n in x["boxes"] if n != x["answer"]][0]}"]')
    elif x.get('kind') == 'rotate': tap(pg, f'[data-o="{[k for k, o in enumerate(x["options"]) if not o["ok"]][0]}"]')
    elif x.get('kind') == 'mirror': tap(pg, '#mirrorOk')
    elif x.get('kind') == 'grid':
        i = [k for k, v in enumerate(x['givens']) if not v][0]; tap(pg, f'[data-c="{i}"]'); tap(pg, f'[data-n="{x["solution"][i] % x["n"] + 1}"]')
    else: return False
    pg.wait_for_timeout(120); return True
def seedPage(pg, think=None):
    S = dict(seed)
    if think: S['think'] = think
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(S))})"); pg.reload(); pg.wait_for_timeout(500)
def enter(pg, mod):
    pg.click(f'.w-mini button[data-z="{mod}"]'); pg.wait_for_timeout(700)
    check(pg.is_visible('#zGo') and pg.inner_text('#zName'), f'{mod} 卡片打开')
    check(not pg.is_visible('#zMap') and not pg.is_visible('#zMist'), f'{mod} 卡片不显示格子和错题入口')
    pg.click('#zGo'); pg.wait_for_function("!document.getElementById('think').hidden", timeout=9000); pg.wait_for_timeout(650)
with sync_playwright() as p:
    b = p.chromium.launch()
    for W, H in SIZES:
        pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True)
        pg.on('pageerror', lambda e: errs.append(f'{W}x{H} ' + str(e)))
        seedPage(pg, ALL)
        pg.screenshot(path=str(out / f'{W}x{H}-island.png'))
        vis = pg.evaluate("[...document.querySelectorAll('.w-mini button')].length"); check(vis == 14, f'{W}x{H} 快捷栏 14 个地点 {vis}')
        mh = pg.evaluate("document.querySelector('.w-mini').getBoundingClientRect().height"); check(mh < 112, f'{W}x{H} 快捷栏不超过两行 {mh}')
        for mod, n in [('balance', 4), ('target', 3), ('clue', 4), ('block', 4)]:
            enter(pg, mod)
            if W == 874: pg.screenshot(path=str(out / f'{W}x{H}-{mod}-enter.png'))
            lv = pg.evaluate(f"[...document.querySelectorAll('#think .tabs .tlv')].map(e => [e.textContent, e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().right <= e.closest('button').getBoundingClientRect().right + 1])")
            want = pg.evaluate(f"SKILLS.THINK_LEVEL['{mod}'].map(n => '建议第 ' + n + ' 级起')")
            check([x[0] for x in lv] == want and all(x[1] for x in lv), f'{W}x{H} {mod} 每档标建议级别、放得下：{lv}')
            for t in range(n):
                if pg.evaluate('__sm.TH.G.tier') != t: tap(pg, f'[data-t="{t}"]'); pg.wait_for_timeout(650)
                tag = f'{W}x{H} {mod}{t}'; layout(pg, tag + ' 题面')
                k0 = json.dumps(q(pg))
                if wrong(pg, mod):
                    if mod == 'balance' and t in (1, 3): check('≠' in pg.inner_text(T + '#eq'), tag + ' 填错写不等号')
                    layout(pg, tag + ' 答错'); check(not done(pg) and json.dumps(q(pg)) == k0, tag + ' 答错留在原题')
                dx, dy = pg.evaluate("(() => { const r = document.querySelector('#think #dunno').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
                pg.mouse.click(dx, dy); pg.wait_for_timeout(120); pg.mouse.click(dx, dy); pg.wait_for_timeout(1200)
                check(done(pg) and json.dumps(q(pg)) == k0 and pg.is_visible(T + '#cont'), tag + ' 不会后停住等继续')
                layout(pg, tag + ' 不会')
                if W == 874: pg.screenshot(path=str(out / f'{W}x{H}-{mod}{t}-dunno.png'))
                x, y = pg.evaluate("(() => { const r = document.querySelector('#think #cont').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
                ore0 = ore(pg); pg.mouse.click(x, y); pg.wait_for_timeout(90); pg.mouse.click(x, y); pg.wait_for_timeout(250)
                check(not done(pg) and json.dumps(q(pg)) != k0, tag + ' 连点继续只进一题')
                pg.wait_for_timeout(550)
                solve(pg, mod)
                check(done(pg) and ore(pg) == ore0 + 1, tag + ' 做对得矿石')
                layout(pg, tag + ' 做对'); pg.wait_for_timeout(650)
                if mod == 'target' and t == 2:
                    x = q(pg)
                    for sol in x['solutions'][1:]:
                        tap(pg, '#more'); pg.wait_for_timeout(600); idx = lambda n: x['cards'].index(n)
                        for n in sol['plus']: tap(pg, f'[data-i="{idx(n)}"]')
                        for n in sol['minus']: tap(pg, '#sm'); tap(pg, f'[data-i="{idx(n)}"]')
                        tap(pg, '#chk'); pg.wait_for_timeout(600)
                    check(ore(pg) == ore0 + 1, tag + ' 多种凑法不多给矿石')
                    box = pg.evaluate("(() => { const c = document.querySelector('#think .found').parentElement.getBoundingClientRect(); let m = 0, b = 0; document.querySelectorAll('#think .found span').forEach(e => { const r = e.getBoundingClientRect(); m = Math.max(m, r.right); b = Math.max(b, r.bottom); }); return [m, c.right, b, c.bottom]; })()")
                    check(box[0] <= box[1] + 1 and box[2] <= box[3] + 1, f'{tag} 已找到的算式伸出左栏 {box}'); layout(pg, tag + ' 全部找到')
            tap(pg, '#back'); pg.wait_for_timeout(300); check(pg.is_visible('#island'), f'{W}x{H} {mod} 返回到岛上')
        pg.close()
    # 进度：新存档从第一个技能开始，后面的技能点不了；做 3 题开放下一个；矿石进总数；回岛木牌变；刷新不丢；原有数据不动
    pg = b.new_page(viewport={'width': 932, 'height': 430}, has_touch=True); pg.on('pageerror', lambda e: errs.append('进度 ' + str(e)))
    seedPage(pg)
    check(pg.evaluate('__sm.S.think') is None, '打开岛不写 think 字段')
    ore0 = pg.evaluate('(__sm.S.home && __sm.S.home.ore) || 0')
    enter(pg, 'balance')
    check(pg.is_disabled(T + '[data-t="1"]'), '没学会前下一个技能点不了')
    for i in range(3):
        solve(pg, 'balance'); pg.wait_for_timeout(600)
        if i == 2:
            check('下一个：填一个数' in pg.inner_text(T + '#fb'), '第 3 题提示学会了'); check(not pg.is_disabled(T + '[data-t="1"]'), '标签马上开放'); layout(pg, '学会提示')
            pg.screenshot(path=str(out / 'learned.png'))
        tap(pg, '#cont'); pg.wait_for_timeout(650)
    check(pg.evaluate('__sm.TH.G.tier') == 1 and not pg.is_disabled(T + '[data-t="1"]'), '做对 3 题进入下一个技能')
    check('✓' in pg.inner_text(T + '[data-t="0"]'), '学会的技能打勾')
    check(pg.evaluate('__sm.S.think.balance') == [3, 0, 0, 0], '进度写进存档')
    check(pg.evaluate('__sm.S.home.ore') == ore0 + 3, '矿石进总数')
    tap(pg, '#back'); pg.wait_for_timeout(300)
    check(pg.locator('.w-sign[data-z="balance"] .row i.l1').count() == 1, '回岛后木牌亮 1 格')
    pg.screenshot(path=str(out / 'island-after.png'))
    pg.reload(); pg.wait_for_timeout(500)
    check(pg.evaluate('__sm.S.think.balance') == [3, 0, 0, 0], '刷新后进度还在')
    check(pg.evaluate('__sm.S.cards.keep && __sm.S.cards.keep.lv') == 2, '原有进度不动')
    # 进过工坊（对称题）后，页面其他地方按 id 取元素不能拿到思维页的按钮
    enter(pg, 'block'); tap(pg, '#back'); pg.wait_for_timeout(300)
    dup = pg.evaluate("[...document.querySelectorAll('[id]')].map(e => e.id).filter((x, i, a) => a.indexOf(x) !== i)")
    check(not dup, f'页面有重名 id {dup}')
    # 做对 1.5 秒自动下一题（Ben 11-07）；不到 1.5 秒不切，切题后防连点，中途离开不切，「再找一种」能拦住
    enter(pg, 'balance'); k1 = json.dumps(q(pg)); solve(pg, 'balance'); pg.wait_for_timeout(900)
    check(done(pg) and json.dumps(q(pg)) == k1, '做对后不到 1.5 秒不切题'); pg.wait_for_timeout(1000)
    check(not done(pg) and json.dumps(q(pg)) != k1, '做对 1.5 秒后自动进下一题')
    k1 = json.dumps(q(pg)); solve(pg, 'balance'); tap(pg, '#back'); pg.wait_for_timeout(2300)
    check(pg.is_visible('#island') and json.dumps(q(pg)) == k1, '做对后离开，回岛不再切题')
    enter(pg, 'balance'); k1 = json.dumps(q(pg)); pg.wait_for_timeout(600); tap(pg, '#dunno'); pg.wait_for_timeout(2600)
    check(done(pg) and json.dumps(q(pg)) == k1, '不会：停住等继续，不自动切'); tap(pg, '#back'); pg.wait_for_timeout(300)
    # 凑数矿还有别的解：1.5 秒内点「再找一种」留在这题；没点也自动走
    enter(pg, 'target'); more = 0
    for _ in range(40):
        if len(q(pg)['solutions']) > 1: break
        solve(pg, 'target'); tap(pg, '#cont'); pg.wait_for_timeout(650)
    check(len(q(pg)['solutions']) > 1, '凑数矿找到多解题')
    k1 = json.dumps(q(pg)); solve(pg, 'target'); pg.wait_for_timeout(600); tap(pg, '#more'); pg.wait_for_timeout(2300)
    check(not done(pg) and json.dumps(q(pg)) == k1, '点「再找一种」后不自动切题')
    tap(pg, '#back'); pg.wait_for_timeout(300)
    # 右滑返回
    enter(pg, 'clue'); pg.evaluate('history.back()'); pg.wait_for_timeout(500); check(pg.is_visible('#island'), '右滑回到岛上'); pg.close()
    # 英文日：四个地点全部技能，题面 / 不会 / 做对都不能有中文、不能叠字出屏；朗读文字也是英文
    ZHA = "(() => { const ZH = /[\\u3000-\\u303f\\u3400-\\u9fff\\uff00-\\uffef]/, out = []; const w = document.createTreeWalker(document.getElementById('think'), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (ZH.test(n.data) && n.parentElement.offsetParent) out.push(n.data.trim()); document.querySelectorAll('#think [data-say],#think [aria-label]').forEach(el => ['data-say', 'aria-label'].forEach(a => { const v = el.getAttribute(a); if (v && ZH.test(v)) out.push(a + ':' + v); })); return out; })()"
    for W, H in [(844, 390), (874, 297)]:
        pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=True); pg.on('pageerror', lambda e: errs.append('英文 ' + str(e)))
        S = {k: v for k, v in seed.items() if k != 'settings'}; S['think'] = ALL
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(S))})"); pg.reload(); pg.wait_for_timeout(500)
        en = pg.evaluate("document.documentElement.lang") == 'en'
        if not en:   # 今天是双日：测试条往后调 1 天
            pg.evaluate("[...document.querySelectorAll('#testBar button')].find(x => x.textContent.includes('+1')).click()"); pg.wait_for_timeout(600)
        check(pg.evaluate("document.documentElement.lang") == 'en', f'{W}x{H} 没进英文日')
        for mod, n in [('balance', 4), ('target', 3), ('clue', 4), ('block', 4)]:
            enter(pg, mod)
            for t in range(n):
                if pg.evaluate('__sm.TH.G.tier') != t: tap(pg, f'[data-t="{t}"]'); pg.wait_for_timeout(650)
                tag = f'英文 {W}x{H} {mod}{t}'; pg.wait_for_timeout(120); layout(pg, tag + ' 题面'); z = pg.evaluate(ZHA); check(not z, f'{tag} 题面有中文 {z[:4]}')
                pg.screenshot(path=str(out / f'en-{W}-{mod}{t}-q.png'))
                wrong(pg, mod); pg.wait_for_timeout(120); z = pg.evaluate(ZHA); check(not z, f'{tag} 答错有中文 {z[:4]}'); layout(pg, tag + ' 答错')
                if not done(pg): tap(pg, '#dunno'); pg.wait_for_timeout(700)
                z = pg.evaluate(ZHA); check(not z, f'{tag} 不会有中文 {z[:4]}'); layout(pg, tag + ' 不会'); pg.screenshot(path=str(out / f'en-{W}-{mod}{t}-dunno.png'))
                tap(pg, '#cont'); pg.wait_for_timeout(650); solve(pg, mod); pg.wait_for_timeout(120)
                z = pg.evaluate(ZHA); check(not z, f'{tag} 做对有中文 {z[:4]}'); layout(pg, tag + ' 做对'); pg.wait_for_timeout(550)
            tap(pg, '#back'); pg.wait_for_timeout(300)
        pg.close()
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
