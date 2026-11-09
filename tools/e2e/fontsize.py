# 字号审查（中控 11-09，Ben：「英文界面看着很多文字都过于小……审查所有的字体大小」）：
# 孩子看得见的每个文字，按真机上的物理大小（iOS pt）量，低于 docs/视觉规范.md 第 2.3 节的下限就报出来。
#   显示字号 = CSS 字号 × 页面里实际缩放（CSS zoom、transform、fitBody 缩小、SVG viewBox 都算进去）× 设备换算
#   设备换算：手机网页 1 CSS px = 1 pt；iPad App 只给 1 CSS px ≥ 1 pt 的界面大小档，按最坏的 1 pt 算（docs/视觉规范.md 2.3）
# 两部分：
#   A 题型：每个技能的每种题（题面、答错图解、选项）塞进练习页逐个量（同 overflow.py 的办法）
#   B 页面：借现有走查脚本当「导游」（岛、地点卡片、校准、今日练习、结算、错题宝箱、技能地图、秒答、家、图鉴、奖状、
#           思维地点、炉子和碎片弹窗、挑战、摸底、iPad 竖式、讲解卡、趣味题……），页面里挂采样器，边走边量；强制设备尺寸和语言
# 家长区、题库、崩溃页、测试条不查（同 i18n 的不翻译范围，加家长「错题分析」#mistp）。
# 用法：python3 tools/e2e/fontsize.py <项目根> <输出目录> [--only phone-en,ipad-zh,...] [--skip-b] [--skip-a]
#   输出目录里写 report.json（每条：设备-语言、档、显示字号、下限、所在页面、元素、文字）和 summary.txt；有不达标的退出码 1
import sys, json, pathlib, subprocess, os, time, re
HERE = pathlib.Path(__file__).resolve().parent

# ---------- 标准（docs/视觉规范.md 2.3）：物理大小，iOS pt ----------
MIN = {'题目': 22, '正文': 17, '按钮': 17, '说明': 15, '角标': 13}
PROFILES = {   # 视口、屏幕、1 CSS px = 多少 pt
    'phone': {'viewport': {'width': 667, 'height': 375}, 'screen': {'width': 667, 'height': 375}, 'k': 1.0},
    # iPad App 的标准档：App 只给「网页宽 ≤ 屏幕点宽」的界面大小，最坏 1 CSS px = 1 pt；版面按 100% 的 932 宽量（题面缩得最狠）
    'ipad': {'viewport': {'width': 932, 'height': 651}, 'screen': {'width': 1194, 'height': 834}, 'k': 1.0},
    # 只做对比（不进标准）：空空的 iPad Pro 11 在 60%（11-09 前）和 80%（新的最小档）
    'ipad60': {'viewport': {'width': 1553, 'height': 1085}, 'screen': {'width': 1194, 'height': 834}, 'k': 1194 / 1553},
    'ipad80': {'viewport': {'width': 1165, 'height': 814}, 'screen': {'width': 1194, 'height': 834}, 'k': 1194 / 1165},
}

# 页面里的采样器：FORCE = 'en' / 'zh' 强制语言；结果交给 __fsReport
SAMPLER = r"""(() => {
  if (window.__fsOn) return; window.__fsOn = 1;
  const FORCE = %(force)s, K = %(k)s;
  if (FORCE) { let real; Object.defineProperty(window, 'I18N', {configurable: true, get() { return real; }, set(v) { real = v; if (v && v.isEn) v.isEn = () => FORCE === 'en'; }}); }
  const SKIP = '#parent,#bankv,#habit,#ovQ,#ovCrash,#testBar,#mistp,[data-i18n-skip]';
  const QSEL = '#qBody,#qWide,#q,#think .say,#think .eq,#think .clues,#think .target,#think .grid,#think .cells,#think .shownbox,#think .scalewrap';
  const MAIN = '.eq,#q,.pickcard,.vg,.vcell,.vls,.vfillv,#think .eq,#think .target b';   // 题目档：主算式、选项、竖式格
  const BTN = 'button,.btn,.gobig,[role=button],a,label';
  const CJK = /[㐀-鿿]/g;
  const vis = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; } const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight; };
  const scaleOf = el => {
    if (el instanceof SVGElement) { const m = el.getScreenCTM && el.getScreenCTM(); return m ? Math.hypot(m.c, m.d) : 1; }   // 纵向：英文压紧只压横向
    let e = el; while (e && !(e.offsetWidth > 0)) e = e.parentElement;   // display:contents / 空宽：找最近有布局宽的祖先
    if (!e) return 1; const r = e.getBoundingClientRect(); return r.width / e.offsetWidth;
  };
  const area = el => { let e = el; while (e.parentElement && e.parentElement !== document.body) e = e.parentElement; return e.id ? '#' + e.id : (e.className && e.className.baseVal === undefined ? '.' + String(e.className).split(' ')[0] : e.tagName.toLowerCase()); };
  const sig = el => { const a = el.closest('[id]'), own = el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''); return (a && a !== el ? '#' + a.id + ' ' : '') + (el.id ? '#' + el.id : own); };
  const tierOf = (el, t) => {
    const inQ = el.closest(QSEL), num = /^[\s\d+\-−×x÷=.,/%%:：✓✗★·…()（）□?？<>]{1,6}$/.test(t);
    const n = (t.match(CJK) || []).length, words = t.split(/\s+/).filter(w => /[a-z]/i.test(w)).length, sentence = n >= 9 || words >= 6 || /[，。？！；]|[.?!]$/.test(t.replace(/\d[.,]\d/g, ''));   // 句子：中文 ≥ 9 字、英文 ≥ 6 词或带标点（中英判法一致，名字和短标签算说明）
    if (inQ) return el.closest(MAIN) && !el.closest('svg') && !el.closest('.vs') ? '题目' : num ? '角标' : sentence ? '正文' : '说明';   // 题区：题干和讲解的句子算正文，图里的短标注算说明、数字刻度算角标
    if (num && t.replace(/\s/g, '').length <= 4) return '角标';
    const bt = el.closest(BTN); if (bt) return bt === el || /^(B|STRONG)$/.test(el.tagName) ? '按钮' : '说明';   // 按钮里的副标题小字算说明
    if (el.closest('.qtag,.chip,.chip2,.zsk,.mq,.tag,.dcap')) return '说明';   // 标签、小签：不管几个词都算说明
    return sentence ? '正文' : '说明';
  };
  const sample = () => {
    const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      const t = n.data.replace(/\s+/g, ' ').trim(); if (!t) continue;
      const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE', 'TEXTAREA', 'TITLE'].includes(el.tagName) || el.closest(SKIP) || !vis(el)) continue;
      const r = document.createRange(); r.selectNodeContents(n); const rr = r.getBoundingClientRect(); if (!(rr.width > 0) || rr.right <= 0 || rr.left >= innerWidth || rr.bottom <= 0 || rr.top >= innerHeight) continue;
      const css = parseFloat(getComputedStyle(el).fontSize), px = css * scaleOf(el);
      out.push({area: area(el), sig: sig(el), tier: tierOf(el, t), text: t.slice(0, 60), css: Math.round(css * 10) / 10, px: Math.round(px * 10) / 10, pt: Math.round(px * K * 10) / 10, lang: document.documentElement.lang});
    }
    if (window.__fsReport) window.__fsReport(out);
  };
  let tm = 0; const later = () => { clearTimeout(tm); tm = setTimeout(sample, 120); };
  addEventListener('DOMContentLoaded', () => { new MutationObserver(later).observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'style']}); later(); setInterval(sample, 900); });
  window.__fsSample = sample;
})()"""

def key_of(x): return (x['area'], x['sig'], x['tier'], re.sub(r'\d+', '#', x['text']))

# ---------- B：在子进程里跑一个走查脚本，打上补丁 ----------
def drive(prof, lang, outjson, script, args):
    from playwright.sync_api import Browser, BrowserContext
    P = PROFILES[prof]; seen = {}
    js = SAMPLER % {'force': json.dumps(lang), 'k': P['k']}
    def report(src, items):
        for x in items:
            k = key_of(x)
            if k not in seen or x['px'] < seen[k]['px']: seen[k] = x
    orig_ctx = Browser.new_context
    def new_context(self, *a, **kw):
        kw['viewport'] = dict(P['viewport']); kw['screen'] = dict(P['screen'])
        ctx = orig_ctx(self, *a, **kw); ctx.add_init_script(js); ctx.expose_binding('__fsReport', report); return ctx
    def new_page(self, *a, **kw):
        ctx = new_context(self, *a, **kw); pg = ctx.new_page(); return pg
    Browser.new_context = new_context; Browser.new_page = new_page
    def dump():
        pathlib.Path(outjson).write_text(json.dumps(list(seen.values()), ensure_ascii=False))
    import atexit; atexit.register(dump)
    sys.argv = [script] + args
    try:
        src = (HERE / script).read_text()
        exec(compile(src, str(HERE / script), 'exec'), {'__name__': '__main__', '__file__': str(HERE / script)})
    except SystemExit: pass
    except Exception as e: print('导游脚本中途出错（只影响覆盖面）：', script, repr(e)[:200], file=sys.stderr)
    dump()

# 导游：脚本名 + 参数（{root} {out} 会替换）；超时秒数
GUIDES = [
    ('e2e-en.py', ['{root}', '{out}']),          # 岛、地点卡片、校准、今日练习（对 / 错 / 不会）、结算、错题宝箱、技能地图、秒答地图和练习、家、图鉴、奖状
    ('e2e.py', ['{root}', '{out}']),             # 首次 → 摸底 → 今日练习 → 示范卡 → Boss
    ('e2e-gems.py', ['{root}', '{out}']),        # 碎片条、小目标弹窗（Goal done）、炉子、锻造确认
    ('e2e-qsum.py', ['{root}', '{out}']),        # 结算页（信息最多）
    ('e2e-v8.py', ['{root}', '{out}']),          # 四个思维地点
    ('e2e7.py', ['{root}', '{out}']),            # 家：开箱、奖状、图鉴、告示牌、摆放
    ('e2e13.py', ['{root}', '{out}']),           # 讲解卡、四年级题型
    ('e2e-fun.py', ['{root}', '{out}']),         # 趣味题和它们的讲解卡
    ('e2e-vert.py', ['{root}', '{out}']),        # iPad 竖式
    ('demofit.py', ['{root}', '{out}']),         # 示范卡
]

# ---------- A：题型逐个量 ----------
SCAN_A = r"""async () => { const {K, R} = window.__sm, $ = id => document.getElementById(id), res = [];
  ['island','placeIntro','placeResult','qplay','demo','qsum','skillmap','home','calib','play','summary','mist','parent'].forEach(k => { $(k).hidden = k !== 'qplay'; });
  const take = () => new Promise(ok => { const prev = window.__fsReport; window.__fsReport = items => { res.push(...items.filter(x => x.area === '#qplay')); }; window.__fsSample(); window.__fsReport = prev; ok(); });
  for (const id of Object.keys(K.ITEM)) {
    const inst = K.make(id), v = R.question(inst), wide = v.input !== 'write';
    $('qplay').classList.toggle('wide', wide); $('qPad').hidden = wide; $('qTag').textContent = v.tag; $('qNote').textContent = v.note || '';
    $('qBody').innerHTML = v.html; $('qWide').innerHTML = v.input === 'pick' ? `<div class="pickgrid" style="grid-template-columns:repeat(${v.pick.length},minmax(0,1fr))">${v.pick.map((n, i) => `<button class="pickcard${v.pickText ? ' expr' : ''}">${v.pickText ? v.pickText[i] : n}</button>`).join('')}</div>` : '';
    I18N.flush(); if (window.__fitSvg) window.__fitSvg(); window.__sm.fitBody(); await take();
    $('qBody').innerHTML = ''; $('qWide').innerHTML = ''; (wide ? $('qWide') : $('qBody')).innerHTML = R.explain(inst); I18N.flush(); if (window.__fitSvg) window.__fitSvg(); window.__sm.fitBody(); await take();
    res.forEach(x => { if (!x.item) x.item = id; });
  }
  return res; }"""

def part_a(root, prof, lang):
    from playwright.sync_api import sync_playwright
    P = PROFILES[prof]; seen = {}
    url = (root / 'v2' / 'index.html').as_uri() + '#test'
    seed = {'v': 2, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'placedAt': 1, 'known': {}, 'settings': {'bilingual': lang == 'en'}}
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport=P['viewport'], screen=P['screen'])
        ctx.add_init_script(SAMPLER % {'force': json.dumps(lang), 'k': P['k']}); pg = ctx.new_page()
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(400)
        for x in pg.evaluate(SCAN_A):
            k = key_of(x) + (':'.join(x['item'].split(':')[:2]),)
            if k not in seen or x['px'] < seen[k]['px']: seen[k] = x
        b.close()
    return list(seen.values())

def main():
    if sys.argv[1] == '--drive':
        return drive(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6:])
    root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    only = next((a.split('=', 1)[1] if '=' in a else sys.argv[sys.argv.index(a) + 1] for a in sys.argv if a.startswith('--only')), 'phone-zh,phone-en,ipad-zh,ipad-en').split(',')
    rows = []
    for combo in only:
        prof, lang = combo.split('-')
        if '--skip-a' not in sys.argv:
            t0 = time.time(); a = part_a(root, prof, lang)
            for x in a: x.update(combo=combo, part='题型', guide='overflow 式')
            rows += a; print(f'{combo} 题型 量了 {len(a)} 种 · {time.time() - t0:.0f}s', flush=True)
        if '--skip-b' not in sys.argv:
            for g, args in GUIDES:
                f = out / f'raw-{combo}-{g}.json'; shots = out / 'shots' / combo / g.replace('.py', ''); shots.mkdir(parents=True, exist_ok=True)
                cmd = [sys.executable, str(HERE / 'fontsize.py'), '--drive', prof, lang, str(f), g] + [s.replace('{root}', str(root)).replace('{out}', str(shots)) for s in args]
                t0 = time.time()
                try: subprocess.run(cmd, cwd=root, timeout=900, capture_output=True)
                except subprocess.TimeoutExpired: print(f'{combo} {g} 超时（只影响覆盖面）', flush=True)
                b = json.loads(f.read_text()) if f.exists() else []
                for x in b: x.update(combo=combo, part='页面', guide=g)
                rows += b; print(f'{combo} {g} 量了 {len(b)} 种 · {time.time() - t0:.0f}s', flush=True)
    bad = [x for x in rows if x['pt'] < MIN[x['tier']] * 0.98]   # 2% 容差：缩放比按整数布局宽算，有舍入
    (out / 'bad-all.json').write_text(json.dumps(bad, ensure_ascii=False))   # 去重前的全部（修的时候按题型查）
    # 同一元素同一档只报一次（取最小）
    uniq = {}
    for x in bad:
        k = (x['combo'], x['area'], x['sig'], x['tier'])
        if k not in uniq or x['pt'] < uniq[k]['pt']: uniq[k] = x
    bad = sorted(uniq.values(), key=lambda x: (x['combo'], x['area'], x['tier'], x['pt']))
    (out / 'report.json').write_text(json.dumps({'标准pt': MIN, '设备': {k: v['k'] for k, v in PROFILES.items()}, '量过': len(rows), '不达标': bad}, ensure_ascii=False, indent=1))
    lines = [f'量过 {len(rows)} 种文字（去重后），不达标 {len(bad)} 处（同一元素同一档算一处）']
    by = {}
    for x in bad: by.setdefault(x['combo'], {}).setdefault(x['tier'], 0); by[x['combo']][x['tier']] += 1
    for c, d in sorted(by.items()): lines.append(f'  {c}: ' + '、'.join(f'{t} {n}' for t, n in d.items()))
    areas = {}
    for x in bad: areas.setdefault(x['area'], 0); areas[x['area']] += 1
    lines.append('按页面：' + '、'.join(f'{a} {n}' for a, n in sorted(areas.items(), key=lambda z: -z[1])))
    for x in bad[:400]: lines.append(f"  [{x['combo']}] {x['tier']} {x['pt']}pt < {MIN[x['tier']]}（css {x['css']}px ×缩放 → {x['px']}px）{x['area']} {x['sig']} 「{x['text'][:30]}」")
    (out / 'summary.txt').write_text('\n'.join(lines)); print('\n'.join(lines[:12]))
    sys.exit(1 if bad else 0)

if __name__ == '__main__': main()
