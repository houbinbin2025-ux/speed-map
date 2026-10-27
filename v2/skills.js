// 空空数学岛 · 技能图谱（纯逻辑，无 DOM）：理解数的 19 个技能 + 秒答地图各级，出题、显示、判题、前置关系
// 浏览器里挂到 window.SKILLS（依赖 window.SM），node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.SKILLS = factory(root.SM);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const rint = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const SK = [], BY = {}, ITEM = {};
  // kind：card 一道固定题一个格子 / type8 题型（最近 8 次合格 ≥ 7）/ day5 秒答题型（同一天合格 5 次，同 v2）
  // timedFrom：从第几档开始要求"快"（0 = 一开始就要快，秒答；1 = 淡黄以后，先对后快；null = 不计时）
  function skill(o) {
    const s = Object.assign({timedFrom: null, input: 'write', pre: [], items: []}, o);
    s.items.forEach(it => { it.skill = s.id; ITEM[it.id] = it; });
    SK.push(s); BY[s.id] = s; return s;
  }
  const card = (id, q, ans) => ({id, q, ans});
  const type = (id, gen) => ({id, gen});

  // ---------- 看数（一眼看出有几个，不计时） ----------
  const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
  skill({id: 'look1', group: 'look', name: '骰子点', kind: 'card', items: range(1, 6).map(n => card('look:dice:' + n, {n, layout: 'dice'}, n))});
  skill({id: 'look2', group: 'look', name: '乱点', kind: 'card', items: range(1, 5).map(n => card('look:scat:' + n, {n, layout: 'scat'}, n))});
  skill({id: 'cmp1', group: 'cmp', name: '10 以内谁大', kind: 'type8', timedFrom: 1, input: 'pick', items: [type('cmp:t:10', r => pair(r, 1, 10))]});
  skill({id: 'look3', group: 'look', name: '一个十格框', kind: 'card', pre: ['look1'], items: range(1, 10).map(n => card('look:tf:' + n, {n, layout: 'tf'}, n))});
  // ---------- 分合（分合图：整体在上，两部分在下；先卡后题型） ----------
  const bondCards = (lo, hi) => { const out = []; for (let n = lo; n <= hi; n++) for (let a = 1; a < n; a++) out.push(card(`bond:${n}=${a}+_`, {n, a, blank: 'part'}, n - a)); return out; };
  const whole = (lo, hi) => r => { const n = rint(r, lo, hi), a = rint(r, 1, n - 1); return {q: {n, a, b: n - a, blank: 'whole'}, ans: n}; };
  skill({id: 'bond1', group: 'bond', name: '5 以内分合', kind: 'card', timedFrom: 1, pre: ['look3'], items: bondCards(2, 5).concat([type('bond:t:whole5', whole(2, 5))])});
  skill({id: 'look4', group: 'look', name: '两个十格框', kind: 'card', pre: ['look3'], items: range(11, 20).map(n => card('look:tf2:' + n, {n, layout: 'tf2'}, n))});
  skill({id: 'bond2', group: 'bond', name: '6–9 分合', kind: 'card', timedFrom: 1, pre: ['bond1'], items: bondCards(6, 9).concat([type('bond:t:whole9', whole(6, 9))])});
  skill({id: 'line1', group: 'line', name: '0—10 数线', kind: 'type8', input: 'line', pre: ['cmp1'], items: [type('line:t:10', r => line(r, 10, 1))]});
  skill({id: 'bond3', group: 'bond', name: '凑十', kind: 'card', timedFrom: 1, pre: ['bond2'], items: range(1, 9).map(a => card(`bond:10=${a}+_`, {n: 10, a, blank: 'part'}, 10 - a))});
  skill({id: 'cmp2', group: 'cmp', name: '20 以内谁大', kind: 'type8', timedFrom: 1, input: 'pick', pre: ['cmp1', 'look4'], items: [type('cmp:t:20', r => pair(r, 1, 20))]});
  // 缺数四种：□+a=b（答 b−a）、a+□=b（答 b−a）、□−a=b（答 a+b）、a−□=b（答 a−b）
  const missing = form => r => {
    if (form === 'addL' || form === 'addR') { const b = rint(r, 2, 10), a = rint(r, 1, b - 1); return {q: {form, a, b}, ans: b - a}; }
    if (form === 'subL') { const a = rint(r, 1, 9), b = rint(r, 1, 10 - a); return {q: {form, a, b}, ans: a + b}; }
    const a = rint(r, 2, 10), x = rint(r, 1, a - 1); return {q: {form, a, b: a - x}, ans: x};
  };
  skill({id: 'bond4', group: 'bond', name: '缺数算式', kind: 'type8', timedFrom: 1, pre: ['bond3'],
    items: ['addL', 'addR', 'subL', 'subR'].map(f => type('bond:t:' + f, missing(f)))});
  // 过十准备：k + a = 10 + □（和在 11–17）
  const to10 = k => r => { const a = rint(r, 11 - k, Math.min(9, 17 - k)); return {q: {k, a}, ans: k + a - 10}; };
  skill({id: 'bond5', group: 'bond', name: '过十准备', kind: 'type8', timedFrom: 1, pre: ['bond3', 'look4'], items: [9, 8, 7].map(k => type('bond:t:to10-' + k, to10(k)))});
  skill({id: 'line2', group: 'line', name: '0—20 数线', kind: 'type8', input: 'line', pre: ['line1', 'cmp2'], items: [type('line:t:20', r => line(r, 20, 1))]});
  // ---------- 数位（几个十和几个一） ----------
  skill({id: 'place1', group: 'place', name: '看十和一写数', kind: 'type8', pre: ['look4'],
    items: [type('place:t:read', r => { const n = rint(r, 20, 99); return {q: {n, tens: Math.floor(n / 10), ones: n % 10}, ans: n}; })]});
  skill({id: 'place2', group: 'place', name: '几个十几个一', kind: 'type8', pre: ['place1'],
    items: [type('place:t:split', r => { const n = rint(r, 11, 99), ask = r() < 0.5 ? 'tens' : 'ones'; return {q: {n, ask}, ans: ask === 'tens' ? Math.floor(n / 10) : n % 10}; })]});
  skill({id: 'cmp3', group: 'cmp', name: '两位数谁大', kind: 'type8', timedFrom: 1, input: 'pick', pre: ['cmp2', 'place2'],
    items: [type('cmp:t:100', r => pair(r, 10, 99)), type('cmp:t:swap', r => swap(r))]});
  const near = (d) => r => { const n = d > 0 ? rint(r, 10, 99 - d) : rint(r, 10 - d, 99); return {q: {n, d}, ans: n + d}; };
  skill({id: 'cmp4', group: 'cmp', name: '前后数', kind: 'type8', timedFrom: 1, pre: ['cmp3'],
    items: [['p1', 1], ['m1', -1], ['p10', 10], ['m10', -10]].map(([k, d]) => type('cmp:t:' + k, near(d)))});
  skill({id: 'line3', group: 'line', name: '0—100 整十', kind: 'type8', input: 'line', pre: ['line2', 'cmp3'], items: [type('line:t:100t', r => line(r, 100, 10))]});
  skill({id: 'line4', group: 'line', name: '0—100 任意', kind: 'type8', input: 'line', pre: ['line3'], items: [type('line:t:100', r => line(r, 100, 1, true))]});

  function pair(r, lo, hi) { const a = rint(r, lo, hi); let b; do b = rint(r, lo, hi); while (b === a); return {q: {a, b}, ans: Math.max(a, b)}; }
  function swap(r) { let t, o; do { t = rint(r, 1, 9); o = rint(r, 1, 9); } while (t === o); const a = t * 10 + o, b = o * 10 + t; return r() < 0.5 ? {q: {a, b}, ans: Math.max(a, b)} : {q: {a: b, b: a}, ans: Math.max(a, b)}; }
  // any：0—100 任意整数那一组（目标碰巧是整十也按这一组的误差判）
  function line(r, max, step, any) { const k = rint(r, 1, max / step - 1), q = {max, target: k * step}; if (any) q.any = true; return {q, ans: k * step}; }
  const LINE_TOL = {10: 0.5, 20: 1, 100: 5, '100a': 10};
  const tolOf = (q, settings) => { const key = q.any ? '100a' : q.max; return (settings && settings.lineTol && settings.lineTol[key]) || LINE_TOL[key]; };

  // ---------- 秒答地图接进图谱：L1 / L2 每个世界一个技能（卡），L3 / L4 加法、减法各一个技能（同一天合格 5 次） ----------
  const speedPre = (L, w) => {
    if (L === 0) return w === 5 ? ['bond3'] : w === 0 || w === 6 ? ['bond1'] : ['bond2'];
    if (L === 1) return w === 0 ? ['look4'] : ['bond5'];
    if (L === 2) return ['place2'];
    return ['speed:L3:' + w];
  };
  C.LEVELS.forEach((LV, L) => {
    const byW = {};
    C.unitsOf(L).forEach(u => (byW[u.w] = byW[u.w] || []).push(u));
    Object.keys(byW).forEach(w => {
      w = +w;
      const name = L < 2 ? `${LV.name} · ${LV.worlds[w].name}` : `${LV.name} · ${w === 0 ? '加法' : '减法'}题型`;
      skill({id: `speed:L${L + 1}:${w}`, group: 'speed', name, kind: L < 2 ? 'card' : 'day5', timedFrom: 0, pre: speedPre(L, w),
        items: byW[w].map(u => u.gen ? {id: u.id, gen: () => { const g = u.gen(); return {q: {a: g.a, op: u.op, b: g.b}, ans: g.ans}; }} : {id: u.id, q: {a: u.a, op: u.op, b: u.b}, ans: u.ans}),
        speed: true, L});
    });
  });

  // ---------- 判题 ----------
  // 输入：write → 写的数字；pick → 点的那个数；line → 放的位置（数值）
  function judge(item, inst, input, settings) {
    const s = BY[item.skill];
    if (s.input === 'line') { const err = Math.abs(input - inst.ans); return {ok: err < tolOf(inst.q, settings) || err === 0, err}; }
    return {ok: input === inst.ans};
  }
  // 出一道题：卡用固定题，题型每次新数字；fixed 给错题复习用（原题原数）
  function make(itemId, r, fixed) {
    const it = ITEM[itemId];
    if (fixed) return {id: itemId, q: fixed.q, ans: fixed.ans};
    if (it.gen) { const g = it.gen(r || Math.random); return {id: itemId, q: g.q, ans: g.ans}; }
    return {id: itemId, q: it.q, ans: it.ans};
  }
  // 错题编号：卡 = 卡编号；题型 = 编号 | 题目数据
  const mkey = inst => ITEM[inst.id].gen ? inst.id + '|' + JSON.stringify(inst.q) : inst.id;
  const isType = itemId => !!ITEM[itemId].gen;

  // 前置关系检查（测试用）：所有前置都存在、没有环
  function topoOk() {
    const seen = new Set(), stack = new Set();
    const visit = id => { if (stack.has(id)) return false; if (seen.has(id)) return true; stack.add(id); const ok = BY[id].pre.every(p => BY[p] && visit(p)); stack.delete(id); seen.add(id); return ok; };
    return SK.every(s => visit(s.id));
  }

  return {SKILLS: SK, BY, ITEM, judge, make, mkey, isType, topoOk, tolOf, LINE_TOL,
    understand: SK.filter(s => !s.speed), speed: SK.filter(s => s.speed)};
});
