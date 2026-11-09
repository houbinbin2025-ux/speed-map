// 家长「错题分析」的统计（docs/说明书-错题分析.md，F 模块）：只读进度，不改任何数据；纯函数，node 可测
// 数据来自 docs/方案-错题数据字段.md 的 wrongs / hist / stats.mn / mp（v130 起记录）；旧错题没有这些字段 → 「记录不全」
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./skills.js'), require('./engine.js'));
  else root.MISTVIEW = factory(root.SM, root.SKILLS, root.ENGINE);
})(typeof self !== 'undefined' ? self : this, function (C, K, E) {
  'use strict';
  const OTHER = '其他', TAGS = {few: '记录不全', better: '在好转', teach: '需要讲解', slow: '速度慢', wrong: '写错较多'};
  const STATE_ORDER = {due: 0, doing: 1, paused: 2, done: 3};
  const ADVICE = {teach: c => `「${c}」：先陪做 1–2 道，讲清思路，再让孩子独立做`, wrong: c => `「${c}」：会做但易错，提醒写完检查一遍`, slow: c => `「${c}」：会做但不够快，正常练习即可，不需要讲`};
  const posInt = x => Number.isInteger(x) && x > 0;
  const histOf = m => (Array.isArray(m.hist) ? m.hist.filter(e => e && typeof e.d === 'string') : []);
  const catOrder = (() => { const o = {}; (K.MIST_GROUPS || []).forEach(([c], i) => { o[c] = i; }); return o; })();
  const sum = (st, days, f) => days.reduce((n, d) => n + (st[d] && Number.isInteger(st[d][f]) ? st[d][f] : 0), 0);
  const has = (st, days, f) => days.some(d => st[d] && Number.isInteger(st[d][f]));

  function stateOf(S, m, day) {
    if (m.due === null) return 'done';
    if (!E.mistOn(S, m)) return 'paused';
    return m.due <= day ? 'due' : 'doing';
  }
  // 写的：最近一次写错或「不会」
  function typedOf(m) {
    const e = histOf(m).filter(x => x.k === 'w' || x.k === 'd').pop();
    if (!e) return null;
    return {k: e.k, w: e.k === 'd' ? null : e.w, s: typeof e.s === 'number' ? e.s : null, o: !!e.o};
  }
  // 典型错法：差 1；减法算成加法；加法算成减法（只看有 a/op/b 的秒答题和题面带 a、b 的题）
  function patternOf(items, from) {
    let n = 0, off1 = 0, flipSub = 0, flipAdd = 0;
    items.forEach(({m}) => {
      const ans = Number(m.ans), q = m.src ? (m.q || {}) : m, a = Number(q.a), b = Number(q.b), op = q.op;
      histOf(m).filter(e => e.k === 'w' && e.d >= from && e.w !== null && e.w !== '').forEach(e => {
        const w = Number(e.w); if (!isFinite(w)) return; n++;
        if (isFinite(ans) && Math.abs(w - ans) === 1) off1++;
        if (op === '-' && isFinite(a) && isFinite(b) && w === a + b) flipSub++;
        if (op === '+' && isFinite(a) && isFinite(b) && w === Math.abs(a - b)) flipAdd++;
      });
    });
    if (flipSub >= 1 && flipSub * 2 >= n) return '减法算成了加法';
    if (flipAdd >= 1 && flipAdd * 2 >= n) return '加法算成了减法';
    if (off1 >= 2 && off1 * 2 >= n) return '写错多为差 1';
    return null;
  }

  function build(S, day) {
    const st = S.stats || {}, days = n0 => Array.from({length: 7}, (_, i) => C.addDays(day, -(n0 + i)));
    const week = days(0), prev = days(7), from14 = C.addDays(day, -13), from7 = C.addDays(day, -6);
    const cats = {}; let paused = 0;
    for (const key in S.mistakes || {}) {
      const m = S.mistakes[key];
      if (!m || typeof m !== 'object' || !K.ITEM[m.uid] || m.out) continue;
      if (m.due === null && String(m.pd || m.last || '') < from14) continue;
      const state = stateOf(S, m, day); if (state === 'paused') paused++;
      const cat = K.mistCat(m.uid) || OTHER, c = cats[cat] = cats[cat] || {name: cat, items: []};
      c.items.push({key, m, state, wrongs: posInt(m.wrongs) ? m.wrongs : null, part: !!m.part || !posInt(m.wrongs), typed: typedOf(m), passes: m.passes || 0});
    }
    const list = Object.values(cats).map(c => {
      const r = {w: 0, d: 0, s: 0}, r7 = {w: 0, d: 0};
      c.items.forEach(({m}) => histOf(m).forEach(e => { if (e.d >= from14 && r[e.k] !== undefined) r[e.k]++; if (e.d >= from7 && r7[e.k] !== undefined) r7[e.k]++; }));
      const total = r.w + r.d + r.s, done = c.items.filter(i => i.state === 'done').length, open = c.items.length - done;
      const tag = !total && !done ? 'few'
        : (!r7.w && !r7.d && (done > 0 || c.items.some(i => i.passes >= 2))) ? 'better'
        : r.d * 2 >= total && r.d > 0 ? 'teach'
        : r.s * 2 >= total && r.s > 0 ? 'slow' : 'wrong';
      c.items.sort((x, y) => STATE_ORDER[x.state] - STATE_ORDER[y.state] || (y.wrongs || 1) - (x.wrongs || 1));
      const wrongs = c.items.reduce((n, i) => n + (i.wrongs || 1), 0), atLeast = c.items.some(i => !i.wrongs);
      return {name: c.name, items: c.items, n: c.items.length, done, open, wrongs, atLeast, reasons: r, tag, tagText: TAGS[tag],
        score: r.w + 2 * r.d + 0.5 * r.s + open, note: patternOf(c.items, from14)};
    });
    const low = t => t === 'better' || t === 'few';
    list.sort((x, y) => (low(x.tag) - low(y.tag)) || (y.score - x.score) || ((x.name in catOrder ? catOrder[x.name] : 1e9) - (y.name in catOrder ? catOrder[y.name] : 1e9)) || x.name.localeCompare(y.name));
    // 四个数
    const kpi = {
      newW: has(st, week.concat(prev), 'mn') ? sum(st, week, 'mn') : null, newP: has(st, week.concat(prev), 'mn') ? sum(st, prev, 'mn') : null,
      due: (() => { try { return E.dueMistakes(S, day).length; } catch (e) { return list.reduce((n, c) => n + c.items.filter(i => i.state === 'due').length, 0); } })(),   // 和孩子看到的一致；进度里混了坏条目时用自己的计数
      rep: list.reduce((n, c) => n + c.items.filter(i => i.state !== 'done' && i.wrongs >= 2).length, 0),
      passW: has(st, week.concat(prev), 'mp') ? sum(st, week, 'mp') : null, passP: has(st, week.concat(prev), 'mp') ? sum(st, prev, 'mp') : null,
    };
    // 结论
    const top = list.filter(c => !low(c.tag)).slice(0, 2);
    let summary = !list.length ? '近 14 天没有错题'
      : top.length ? `主要卡在${top.map(c => `「${c.name}」（${c.tagText}）`).join('和')}` : '错题都在好转';
    if (list.length && kpi.newW !== null) { const d = kpi.newW - kpi.newP; summary += d < 0 ? `；本周新增错题较上周少 ${-d} 道` : d > 0 ? `；本周新增错题较上周多 ${d} 道` : '；本周新增错题与上周持平'; }
    const advice = list.filter(c => ADVICE[c.tag]).slice(0, 3).map(c => ADVICE[c.tag](c.name));
    return {summary, kpi, cats: list, advice, paused};
  }
  // 家长区格子里的一句概况
  function brief(S, day) { const v = build(S, day); return {due: v.kpi.due, newW: v.kpi.newW, n: v.cats.reduce((n, c) => n + c.open, 0)}; }
  return {build, brief, TAGS, OTHER};
});
