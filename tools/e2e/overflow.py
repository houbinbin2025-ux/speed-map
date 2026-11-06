# 遮盖扫描：每个技能的每种题（题面 + 答错图解）塞进今日练习页，几种 iPhone 横屏尺寸下检查有没有东西超出左栏、钻到写字板下面或屏幕外
# 用法：python3 tools/e2e/overflow.py <项目根> [每个题型随机几次，默认 30] [en]   加 en = 强制英文日跑一遍，英文长了也不许溢出
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); N = int(sys.argv[2]) if len(sys.argv) > 2 else 30; EN = 'en' in sys.argv[3:]
url = (root / 'v2' / 'index.html').as_uri() + '#test'
SIZES = [(956, 440), (932, 430), (852, 393), (844, 390), (812, 375), (667, 375)]
seed = {'v': 2, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'placedAt': 1, 'known': {}, 'settings': {'bilingual': bool(EN)}}
SCAN = """async ([n]) => { const {K, R} = window.__sm, $ = id => document.getElementById(id), bad = [];
  ['island','placeIntro','placeResult','qplay','demo','qsum','skillmap','home','calib','play','summary','mist','parent'].forEach(k => { $(k).hidden = k !== 'qplay'; });
  const check = (inst, what, v) => { I18N.flush(); const wide = v.input !== 'write'; $('qplay').classList.toggle('wide', wide); $('qWide').hidden = !wide;
    $('qPad').hidden = wide; window.__sm.fitBody();
    const lim = wide ? {l: 0, r: innerWidth} : (() => { const p = $('qPad').getBoundingClientRect(); return {l: 0, r: p.left}; })();
    const box = $('qBody').getBoundingClientRect();
    const tag = $('qTag'); tag.textContent = v.tag; I18N.flush(); const tb = tag.getBoundingClientRect(); if (tb.right > lim.r + 1) bad.push({id: inst.id, what: '标签', cls: 'qtag', right: Math.round(tb.right), lim: Math.round(lim.r), bottom: 0});
    const nt = $('qNote'); nt.textContent = v.note || ''; I18N.flush(); if (nt.getBoundingClientRect().right > lim.r + 1) bad.push({id: inst.id, what: '提示', cls: 'qnote', right: Math.round(nt.getBoundingClientRect().right), lim: Math.round(lim.r), bottom: 0});
    for (const el of $('qBody').querySelectorAll('*')) { const b = el.getBoundingClientRect(); if (!b.width) continue;
      if (b.right > lim.r + 1 || b.left < -1 || b.bottom > innerHeight + 1) { bad.push({id: inst.id, what, cls: el.className || el.tagName, right: Math.round(b.right), lim: Math.round(lim.r), bottom: Math.round(b.bottom)}); return; } } };
  for (const id of Object.keys(K.ITEM)) { const seen = new Set();
    for (let i = 0; i < n; i++) { const inst = K.make(id); const key = JSON.stringify(inst.q); if (seen.has(key)) continue; seen.add(key);
      const v = R.question(inst); $('qBody').innerHTML = v.html; check(inst, '题面', v);
      if (v.input === 'write') { $('qBody').innerHTML = R.explain(inst); check(inst, '图解', v); }
      if (v.input === 'pick') {   // 选项卡片和答错图解都要在屏幕内；选项不许矮到点不准，文字里不许混进标记
        $('qWide').innerHTML = `<div class="pickgrid" style="grid-template-columns:repeat(${v.pick.length},minmax(0,1fr))">${v.pick.map((n, i) => `<button class="pickcard${v.pickText ? ' expr' : ''}" aria-label="${v.pickAria ? v.pickAria[i] : v.pickText ? v.pickText[i] : n}">${v.pickText ? v.pickText[i] : n}</button>`).join('')}</div>`; window.__sm.fitBody(); I18N.flush();
        for (const c of $('qWide').querySelectorAll('.pickcard')) { const b = c.getBoundingClientRect(); if (b.bottom > innerHeight + 1 || b.height < 60 || c.scrollWidth > c.clientWidth + 1 || c.textContent.includes('>')) { bad.push({id: inst.id, what: '选项', cls: 'pickcard', bottom: Math.round(b.bottom), lim: Math.round(b.height), right: 0}); break; } }
        $('qBody').innerHTML = ''; $('qWide').innerHTML = R.explain(inst); I18N.flush();
        for (const el of $('qWide').querySelectorAll('*')) { const b = el.getBoundingClientRect(); if (b.width && (b.bottom > innerHeight + 1 || b.right > innerWidth + 1)) { bad.push({id: inst.id, what: '点选图解', cls: el.className || el.tagName, bottom: Math.round(b.bottom), right: Math.round(b.right), lim: innerHeight}); break; } } }
      if (!K.ITEM[id].gen) break; } }
  return bad; }"""
out = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in SIZES:
        pg = b.new_page(viewport={'width': w, 'height': h})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(300)
        if EN:
            pg.evaluate("__sm.S.testDays = I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 0 : 1; I18N.set(I18N.isEn(__sm.S.settings, __sm.today()))")
            assert pg.evaluate("document.documentElement.lang") == 'en'
        bad = pg.evaluate(SCAN, [N])
        uniq = {}
        for x in bad: uniq.setdefault((x['id'], x['what']), x)
        out[f'{w}x{h}'] = {'问题数': len(uniq), '类别': sorted({':'.join(k[0].split(':')[:2]) + ' ' + k[1] for k in uniq}), '例子': list(uniq.values())[:3], '错误': errs[:3], **({'没翻译到': pg.evaluate("[...I18N.misses].slice(0, 10)")} if EN else {})}
        pg.close()
    b.close()
print(json.dumps(out, ensure_ascii=False, indent=1))
sys.exit(1 if any(v['问题数'] or v['错误'] or v.get('没翻译到') for v in out.values()) else 0)
