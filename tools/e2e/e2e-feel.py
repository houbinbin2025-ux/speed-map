# 碎片条（火苗、能量、小目标）浮在练习页右上角（捣蛋鬼第 1 轮第 5 条；审查 R1：放题签行会截掉题签）
# 每种尺寸 × 中英文 × 普通/宽版/竖式 × 三种最挤的状态，查它压没压住长按结束、铁轨、矿石数、题签（全部题型，含「再来一次」）、挑战条，题签有没有被截；
# 写字板顶上出提示（描红、你写的是几、对勾、笔迹提示）或宽版出警告条时，碎片条要藏起来（审查 R2）
# 用法：python3 tools/e2e/e2e-feel.py <项目根> <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'
known = {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}
CASES = [('667x375', dict(viewport={'width': 667, 'height': 375})), ('844x390', dict(viewport={'width': 844, 'height': 390})),
         ('ipadapp', dict(viewport={'width': 932, 'height': 651}, screen={'width': 1194, 'height': 834}))]
M = """([feel, mode]) => { const {K, R} = window.__sm, $ = id => document.getElementById(id), qp = $('qplay');
  qp.classList.toggle('wide', mode !== 'normal'); qp.classList.toggle('vert', mode === 'vert');
  const box = $('qFeel'); box.hidden = false; $('qFire').querySelector('b').textContent = '×2'; $('qFire').classList.add('on');
  const cb = $('qCombo'); if (feel === 1) { cb.classList.remove('crit'); cb.innerHTML = Array.from({length: 12}, (_, i) => `<i${i < 5 ? ' class="on"' : ''}></i>`).join(''); } else { cb.classList.add('crit'); cb.innerHTML = '<span>暴击时刻 20</span>'; }
  const g = $('qGoal'); g.hidden = feel !== 3; g.textContent = '目标 暴击时刻';
  $('qMined').querySelector('b').textContent = '1288';
  const ev = $('gemEv'); ev.hidden = false; ev.textContent = '双倍挑战 · 12 题 · 点这里进入 · 18';
  I18N.flush();
  const r = e => e.getBoundingClientRect(), ov = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  const F = r(box), res = {mode, feel, F: [F.left, F.top, F.right, F.bottom].map(Math.round), hits: [], trunc: 0, n: 0, off: F.right > innerWidth || F.bottom > innerHeight || F.left < 0 };
  for (const id of ['qQuit', 'qBar', 'qMined', 'gemEv']) if (ov(F, r($(id)))) res.hits.push(id);
  const tag = $('qTag');
  for (const id of Object.keys(K.ITEM)) { let inst; try { inst = K.make(id); } catch (e) { continue; } const v = R.question(inst);
    for (const suf of ['', ' · 再来一次']) { tag.textContent = v.tag + suf; I18N.flush(); res.n++;
      if (tag.scrollWidth > tag.clientWidth + 1) res.trunc++; if (ov(F, r(tag)) && !res.hits.includes('qTag')) { res.hits.push('qTag'); res.tagHit = tag.textContent; } } }
  ev.hidden = true;
  // 写字板顶上的提示、确认、对勾、笔迹提示，宽版的警告条：出现时碎片条要藏起来（审查 R2）
  res.hideFail = [];
  const pairs = mode === 'normal' ? ['qPadTip', 'qCheck', 'qConfirm', 'qGhost'] : ['qWarn'];
  for (const id of pairs) { const e = $(id), was = e.hidden; e.hidden = false; if (id === 'qWarn') e.textContent = '这次练习存不下来，请家长看一下';
    if (getComputedStyle(box).visibility !== 'hidden') res.hideFail.push(id); e.hidden = was; }
  if (getComputedStyle(box).visibility === 'hidden') res.hideFail.push('提示收起后碎片条没回来');
  return res; }"""
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, opt in CASES:
        for en in (False, True):
            ctx = b.new_context(has_touch=True, **opt); pg = ctx.new_page()
            ctx.add_init_script("addEventListener('DOMContentLoaded', () => { if (window.GEMS) GEMS.TUNE.exitRate = 0; })")
            seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': known, 'settings': {'bilingual': en}}
            pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))}); localStorage.setItem('speedmap.ink.test', JSON.stringify({{done:true,samples:[],speed:800}}))"); pg.reload(); pg.wait_for_timeout(800)
            pg.evaluate(f"I18N.set({'true' if en else 'false'})")
            pg.click('#btnStart', force=True); pg.wait_for_timeout(1800)
            for _ in range(5):
                if pg.evaluate("[...document.querySelectorAll('.scr')].filter(e=>!e.hidden).map(e=>e.id)[0]") == 'demo': pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(400)
            for mode in ('normal', 'wide', 'vert'):
                for feel in (1, 2, 3):
                    rr = pg.evaluate(M, [feel, mode])
                    ok = not rr['hits'] and not rr['off'] and rr['trunc'] == 0 and not rr['hideFail']
                    bad += not ok
                    print(('ok  ' if ok else 'BAD '), name, 'en' if en else 'zh', mode, 'feel%d' % feel, rr['F'], 'hits', rr['hits'], rr.get('tagHit', ''), 'trunc', rr['trunc'], '/', rr['n'], 'off', rr['off'], 'hideFail', rr['hideFail'])
                    if feel == 3: pg.screenshot(path=str(out / f'{name}-{"en" if en else "zh"}-{mode}.png'))
            ctx.close()
    b.close()
print('BAD', bad); sys.exit(1 if bad else 0)
