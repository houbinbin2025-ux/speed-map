# 趣味题打开后的碎片（C 对中控的承诺，Ben 11-09「先打开，补完再升级」）：真页面里 11 个趣味题型各答对一题给碎片、答错不给；页面里两种挑战选题没有趣味题
# 方案 7：答对 1 道给 1 颗谜题水晶（答错不给），结算页有「谜题水晶 +1」；同一题型第 3 道答对，结算页出「新徽章 <名字>」，GEMUI.puzzle() 里这个徽章拿到了
# 用法：python3 tools/e2e/e2e-fun-gems.py <项目根> <截图目录>。开关 K.FUN_SEC 还是 0 时只打印「跳过」并退出 0（打开那次上线起自动生效）
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': {}, 'settings': {'bilingual': False, 'levels': list(range(1, 16)), 'levelsV': 2}}
ink = {'done': True, 'samples': [], 'speed': 800}
START = """(id => { const {K} = window.__sm; const x = K.rawPool(id)[0];
  window.__sm.startQ('free', {sess: {next: (() => { let n = 0; return () => (n++ ? null : {kind: 'q', seg: 'new', inst: {id, q: x.q, ans: x.ans}}); })(), answer: () => undefined}, group: K.BY[K.ITEM[id].skill].group}); })"""
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
total = "GEMUI.total()"
with sync_playwright() as p:
    b = __import__('quiet').launch(p); ctx = b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg = ctx.new_page(); pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); localStorage.setItem('speedmap.ink.test', {json.dumps(json.dumps(ink))})")
    pg.close(); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(url); pg.wait_for_timeout(900)
    if not pg.evaluate("__sm.K.FUN_SEC > 0"): print('跳过：趣味题开关还关着（K.FUN_SEC = 0）'); b.close(); sys.exit(0)
    ids = pg.evaluate("__sm.K.FUN.map(s => s.items[0].id)")
    check(len(ids) >= 11, f'开关打开，趣味题型 {len(ids)} 个')
    for i, id in enumerate(ids):
        for ok in (True, False):
            pg.evaluate(START, id); pg.wait_for_timeout(400)
            for _ in range(30):
                if pg.evaluate("!!(__sm.Q && __sm.Q.phase === 'q')"): break
                if pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]") == 'demo':
                    pg.evaluate("(()=>{const a=document.getElementById('ack');a.disabled=false;a.click()})()")
                pg.wait_for_timeout(300)
            t0 = pg.evaluate(total); kind = pg.evaluate("__sm.Q && __sm.Q.x && __sm.Q.x.inst.id"); z0 = pg.evaluate("GEMUI.puzzle().n")
            pg.evaluate(f"__sm.Q.t0 = performance.now(); __sm.Q.ms = 4000; __sm.resolve({{ok: {'true' if ok else 'false'}, fast: true}})"); pg.wait_for_timeout(250)
            t1 = pg.evaluate(total)
            z1 = pg.evaluate("GEMUI.puzzle().n")
            if ok: check(kind == id and t1 > t0 and z1 == z0 + 1, f'{id} 答对给碎片 {t0}→{t1}、谜题水晶 {z0}→{z1}')
            else: check(t1 == t0 and z1 == z0, f'{id} 答错不给 碎片 {t0}→{t1}、水晶 {z0}→{z1}')
            if i == 0 and ok: pg.screenshot(path=str(out / 'fun-ok.png'))
            pg.wait_for_timeout(1500); pg.evaluate("(()=>{const b=document.getElementById('qNext');b&&!b.hidden&&b.click()})()"); pg.wait_for_timeout(600)
            if i == 0 and ok:
                qs = pg.evaluate("(()=>{const e=document.getElementById('qsum');return e&&!e.hidden?e.innerText:''})()")
                check('谜题水晶 +1' in qs, f'结算页有「谜题水晶 +1」：{qs[-120:]!r}')
                if '谜题水晶' in qs: pg.screenshot(path=str(out / 'fun-qsum.png'))
    # 同一题型再答对 2 道（第 1 个题型前面已答对 1 道）：第 3 道的结算页出「新徽章」
    first = ids[0]; name = pg.evaluate(f"GEMUI.puzzle().badges.find(b => b.sid === __sm.K.ITEM['{first}'].skill).name")
    for k in range(2):
        pg.evaluate(START, first); pg.wait_for_timeout(400)
        for _ in range(30):
            if pg.evaluate("!!(__sm.Q && __sm.Q.phase === 'q')"): break
            if pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]") == 'demo':
                pg.evaluate("(()=>{const a=document.getElementById('ack');a.disabled=false;a.click()})()")
            pg.wait_for_timeout(300)
        pg.evaluate("__sm.Q.t0 = performance.now(); __sm.Q.ms = 4000; __sm.resolve({ok: true, fast: true})"); pg.wait_for_timeout(1500)
        pg.evaluate("(()=>{const b=document.getElementById('qNext');b&&!b.hidden&&b.click()})()"); pg.wait_for_timeout(700)
    qs = pg.evaluate("(()=>{const e=document.getElementById('qsum');return e&&!e.hidden?e.innerText:''})()")
    got = pg.evaluate(f"GEMUI.puzzle().badges.find(b => b.sid === __sm.K.ITEM['{first}'].skill)")
    check(f'新徽章 {name}' in qs and got['got'] and got['n'] == 3, f'第 3 道答对：结算页「新徽章 {name}」、徽章拿到 {got}')
    pg.screenshot(path=str(out / 'fun-badge.png'))
    pz = pg.evaluate("GEMUI.puzzle()")
    check(len(pz['badges']) == 11 and pz['n'] == 13 and not pz['master'] and sum(b['got'] for b in pz['badges']) == 1 and all('shiny' in b for b in pz['badges']), f'家里徽章册的数据：水晶 {pz["n"]}、得到 {sum(b["got"] for b in pz["badges"])} 枚、解谜大师 {pz["master"]}')
    leak = pg.evaluate("""(() => { const {K, S} = window.__sm, G = window.GEMS, fun = new Set(K.FUN.flatMap(s => s.items.map(i => i.id))); let n = 0, bad = [];
      for (let top = 0; top <= 15; top++) for (let k = 0; k < 5; k++) { const st = G.blank(); const qs = G.pickChallenge(S, top, Math.random, st).concat(G.pickEv(S, st, 14, top, Math.random)); n += qs.length; qs.forEach(q => fun.has(q.id) && bad.push(q.id)); }
      return {n, bad}; })()""")
    check(leak['n'] > 100 and not leak['bad'], f'页面里两种挑战选题 {leak["n"]} 道，趣味题 {leak["bad"]}')
    b.close()
print('页面报错:', errs[:3])
if fails or errs: print('FAIL', len(fails)); sys.exit(1)
print('PASS 开关打开：趣味题答对给碎片和谜题水晶、第 3 道得徽章、挑战不出趣味题')
