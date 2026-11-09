# 孩子「错题宝箱」页（11-09 Ben 确认简化）：一个「开始复习」大按钮 + 今天要复习 / 过几天再来 / 已经学会三栏
# 查：三栏分组和 F 的 MISTVIEW.shelves 一致（多于 12 道折成「还有 N 道」）；按钮和三栏标题不用滚动就看得见、不超宽；
#     页面上不再有规则说明和统计；英文日没有中文；点「开始复习」进复习，第一题是今天要复习的题；
#     从地点卡片「这里的错题」进来只看这一块、有「看全部错题」；今天没有要复习的 → 按钮灰掉、写「今天没有要复习的」
# 用法：python3 tools/e2e/e2e-mistkid.py <项目根> <截图目录>
import sys, json, pathlib, subprocess
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '#test'
fails, errs = [], []
def check(ok, msg):
    if not ok: fails.append(msg)

# 种子错题：秒答 20 道（今天 9 / 过几天 6 / 学会 5）+ 拼数地点 6 道（今天 2 / 过几天 2 / 学会 2）
GEN = r"""
const K = require('./v2/skills.js'), E = require('./v2/engine.js'), C = require('./v2/core.js');
const [day, mode] = process.argv.slice(1);
const S = {v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, placedAt: 1, known: {}, skills: {}, stats: {},
  settings: {bilingual: mode === 'en', levelsV: 2}};
const plain = (ids, f) => ids.map(i => K.ITEM[i]).filter(i => i && i.q && !i.gen && !C.isLow(i.q)).slice(0, f);
const sp = plain(Object.keys(K.ITEM).filter(i => /^speed:L[12]:/.test(K.ITEM[i].skill)), 20);
const bd = plain(Object.keys(K.ITEM).filter(i => K.ITEM[i].skill === 'bond2'), 6);
const put = (arr, n1, n2) => arr.forEach((it, i) => { const k = E.addMistake(S, {id: it.id, q: it.q, ans: it.ans}, C.addDays(day, -10)), m = S.mistakes[k];
  if (mode === 'none' || (i >= n1 && i < n1 + n2)) { m.passes = 1; m.due = C.addDays(day, 3); }
  else if (i >= n1 + n2) { m.passes = 5; m.due = null; }
  else m.due = C.addDays(day, -i % 3); });
put(sp, 9, 6); put(bd, 2, 2);
process.stdout.write(JSON.stringify(S));
"""
def seed(pg, mode):
    pg.goto(url); pg.wait_for_timeout(200)
    day = pg.evaluate("__sm.today()")
    if mode == 'en' and int(day[8:10]) % 2 == 0:   # 英文日 = 单日：往后挪一天
        tdays = 1
    else: tdays = 0
    d2 = pg.evaluate(f"SM.addDays(__sm.today(), {tdays})")
    S = json.loads(subprocess.run(['node', '-e', GEN, d2, mode], cwd=root, capture_output=True, text=True, check=True).stdout)
    S['testDays'] = tdays
    pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(S))}); localStorage.setItem('speedmap.ink.test', JSON.stringify({{done: true, samples: [], speed: 800}}))"); pg.reload(); pg.wait_for_timeout(400)

def inview(pg, sel, W, H, name):
    b = pg.locator(sel).first.bounding_box()
    check(b and b['x'] >= -1 and b['y'] >= -1 and b['x'] + b['width'] <= W + 1 and b['y'] + b['height'] <= H + 1, f'{name}：{sel} 不在屏内 {b}')
    return b

SIZES = [(667, 375), (844, 390), (874, 297), (932, 430), (932, 651), (1194, 834)]
with sync_playwright() as p:
    br = p.chromium.launch()
    for (W, H) in SIZES:
        for mode in (['zh', 'en'] if W in (667, 874, 1194) else ['zh']):
            name = f'{W}x{H}-{mode}'
            pg = br.new_page(viewport={'width': W, 'height': H}, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
            seed(pg, mode); pg.click('#btnMist'); pg.wait_for_timeout(300)
            check(not pg.locator('#mist').is_hidden(), f'{name}：错题宝箱没打开')
            exp = pg.evaluate("(() => { const s = MISTVIEW.shelves(__sm.S, __sm.today()); return [s.today.length, s.later.length, s.done.length]; })()")
            check(exp == [11, 8, 7], f'{name}：种子分组不对 {exp}')
            got = pg.evaluate("[...document.querySelectorAll('#mShelves .mshelf')].map(s => [s.querySelectorAll('.mq').length, (s.querySelector('.mmore') || {}).textContent || ''])")
            check(len(got) == 3, f'{name}：应有三栏，实际 {len(got)}')
            for i, (n, more) in enumerate(got):
                check(n == min(exp[i], 12), f'{name}：第 {i + 1} 栏 {n} 道，应 {min(exp[i], 12)}')
                check((exp[i] > 12) == bool(more), f'{name}：第 {i + 1} 栏「还有」行不对 {more!r}')
            go = inview(pg, '#mistGo', W, H, name)
            check(go and go['height'] >= 44, f'{name}：开始复习按钮太矮 {go}')
            check(pg.evaluate("!document.getElementById('mistGo').disabled"), f'{name}：有要复习的题，按钮却灰着')
            for k in range(3): inview(pg, f'#mShelves .mshelf:nth-child({k + 1}) > b', W, H, f'{name} 第 {k + 1} 栏标题')
            check(pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), f'{name}：横向超宽')
            txt = pg.inner_text('#mist')
            for w in ['复习规则', '隔', '一共', '共 ', '道错题']:   # 「3 天后」是过几天再来那栏每道题的标签，不算
                check(w not in txt, f'{name}：孩子页还有规则或统计字样「{w}」')
            if mode == 'en':
                zh = pg.evaluate("[...document.querySelectorAll('#mist *')].filter(e => e.offsetParent && !e.children.length && I18N.ZH.test(e.textContent)).map(e => e.textContent)")
                check(not zh, f'{name}：英文日还有中文 {zh[:5]}')
            else:
                for w in ['开始复习', '今天要复习', '过几天再来', '已经学会']: check(w in txt, f'{name}：没有「{w}」')
            pg.screenshot(path=str(out / f'{name}.png'))
            if W == 844:
                # 开始复习：进练习页，第一题是今天要复习的题
                due = pg.evaluate("MISTVIEW.shelves(__sm.S, __sm.today()).today.map(m => m.uid)")
                pg.click('#mistGo'); pg.wait_for_timeout(1500)
                for _ in range(20):
                    c = pg.evaluate("['qplay','demo'].find(k => !document.getElementById(k).hidden) || ''")
                    if c == 'demo': pg.click('#ack'); pg.wait_for_timeout(600); continue
                    if c == "qplay" and pg.evaluate("!!(__sm.Q && __sm.Q.x && __sm.Q.x.inst)"): break
                    pg.wait_for_timeout(300)
                check(pg.evaluate("__sm.Q && __sm.Q.kind") == 'review', f'{name}：点开始复习没进复习 {pg.evaluate("__sm.Q && __sm.Q.kind")}')
                uid = pg.evaluate("__sm.Q && __sm.Q.x && __sm.Q.x.inst && __sm.Q.x.inst.id")
                check(uid in due, f'{name}：第一题 {uid} 不在今天要复习里')
                pg.screenshot(path=str(out / f'{name}-review.png'))
                # 从拼数地点的卡片进来：只看这一块
                seed(pg, mode)
                pg.evaluate("document.querySelector('.w-mini button[data-z=\"bond\"]').click()"); pg.wait_for_timeout(700)
                pg.click('#zMist'); pg.wait_for_timeout(400)
                got = pg.evaluate("[...document.querySelectorAll('#mShelves .mshelf')].map(s => s.querySelectorAll('.mq').length)")
                check(got == [2, 2, 2], f'{name}：拼数地点的错题应是 2/2/2，实际 {got}')
                check(pg.is_visible('#mistAll'), f'{name}：从地点进来没有「看全部错题」')
                pg.screenshot(path=str(out / f'{name}-bond.png'))
                pg.click('#mistAll'); pg.wait_for_timeout(300)
                got = pg.evaluate("[...document.querySelectorAll('#mShelves .mshelf')].map(s => s.querySelectorAll('.mq').length)")
                check(got == [11, 8, 7], f'{name}：看全部错题后应是 11/8/7（前 12），实际 {got}')
                check(not pg.is_visible('#mistAll'), f'{name}：看全部时还有「看全部错题」')
                # 今天没有要复习的
                seed(pg, 'none'); pg.click('#btnMist'); pg.wait_for_timeout(300)
                check(pg.evaluate("document.getElementById('mistGo').disabled"), f'{name}：没有要复习的题，按钮没灰')
                check('今天没有要复习的' in pg.inner_text('#mistGo'), f'{name}：按钮没写「今天没有要复习的」')
                pg.screenshot(path=str(out / f'{name}-none.png'))
            pg.close()
    br.close()
print('错误', errs[:5] or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
