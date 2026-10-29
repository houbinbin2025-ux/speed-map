// 空空数学岛 · 技能图谱（纯逻辑，无 DOM）：理解数的 19 个技能 + 秒答地图各级，出题、显示、判题、前置关系
// 浏览器里挂到 window.SKILLS（依赖 window.SM），node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./bank.js'));
  else root.SKILLS = factory(root.SM, root.BANK);
})(typeof self !== 'undefined' ? self : this, function (C, B) {
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
  // 题目都来自题库（bank.js）：卡 = 题库里这个技能的固定题；题型 = 从题库池里发牌（一轮发完再洗，同一轮不重复）
  const cards = sid => B.cards[sid].map(c => ({id: c.id, q: c.q, ans: c.ans}));
  const fromPool = id => r => { const p = B.pools[id], x = p[C.deal(id, p.length, r)]; return {q: Object.assign({}, x.q), ans: x.ans}; };
  const type = id => ({id, gen: fromPool(id)});

  // ---------- 看数（一眼看出有几个，不计时） ----------
  skill({id: 'look1', group: 'look', name: '骰子点', kind: 'card', items: cards('look1')});
  skill({id: 'look2', group: 'look', name: '乱点', kind: 'card', items: cards('look2')});
  skill({id: 'cmp1', group: 'cmp', name: '10 以内谁大', kind: 'type8', timedFrom: 1, input: 'pick', items: [type('cmp:t:10')]});
  skill({id: 'look3', group: 'look', name: '一个十格框', kind: 'card', pre: ['look1'], items: cards('look3')});
  // ---------- 分合（分合图：整体在上，两部分在下；先卡后题型） ----------
  skill({id: 'bond1', group: 'bond', name: '5 以内分合', kind: 'card', timedFrom: 1, pre: ['look3'], items: cards('bond1').concat([type('bond:t:whole5')])});
  skill({id: 'look4', group: 'look', name: '两个十格框', kind: 'card', pre: ['look3'], items: cards('look4')});
  skill({id: 'bond2', group: 'bond', name: '6–9 分合', kind: 'card', timedFrom: 1, pre: ['bond1'], items: cards('bond2').concat([type('bond:t:whole9')])});
  skill({id: 'line1', group: 'line', name: '0—10 数线', kind: 'type8', input: 'line', pre: ['cmp1'], items: [type('line:t:10')]});
  skill({id: 'bond3', group: 'bond', name: '凑十', kind: 'card', timedFrom: 1, pre: ['bond2'], items: cards('bond3')});
  skill({id: 'cmp2', group: 'cmp', name: '20 以内谁大', kind: 'type8', timedFrom: 1, input: 'pick', pre: ['cmp1', 'look4'], items: [type('cmp:t:20')]});
  // 缺数四种：□+a=b（答 b−a）、a+□=b（答 b−a）、□−a=b（答 a+b）、a−□=b（答 a−b）
  skill({id: 'bond4', group: 'bond', name: '缺数算式', kind: 'type8', timedFrom: 1, pre: ['bond3'],
    items: ['addL', 'addR', 'subL', 'subR'].map(f => type('bond:t:' + f))});
  // 过十准备：k + a = 10 + □（和在 11–17）
  skill({id: 'bond5', group: 'bond', name: '过十准备', kind: 'type8', timedFrom: 1, pre: ['bond3', 'look4'], items: [9, 8, 7].map(k => type('bond:t:to10-' + k))});
  skill({id: 'line2', group: 'line', name: '0—20 数线', kind: 'type8', input: 'line', pre: ['line1', 'cmp2'], items: [type('line:t:20')]});
  // ---------- 数位（几个十和几个一） ----------
  skill({id: 'place1', group: 'place', name: '看十和一写数', kind: 'type8', pre: ['look4'],
    items: [type('place:t:read')]});
  skill({id: 'place2', group: 'place', name: '几个十几个一', kind: 'type8', pre: ['place1'],
    items: [type('place:t:split')]});
  skill({id: 'cmp3', group: 'cmp', name: '两位数谁大', kind: 'type8', timedFrom: 1, input: 'pick', pre: ['cmp2', 'place2'],
    items: [type('cmp:t:100'), type('cmp:t:swap')]});
  skill({id: 'cmp4', group: 'cmp', name: '前后数', kind: 'type8', timedFrom: 1, pre: ['cmp3'],
    items: ['p1', 'm1', 'p10', 'm10'].map(k => type('cmp:t:' + k))});
  skill({id: 'line3', group: 'line', name: '0—100 整十', kind: 'type8', input: 'line', pre: ['line2', 'cmp3'], items: [type('line:t:100t')]});
  skill({id: 'line4', group: 'line', name: '0—100 任意', kind: 'type8', input: 'line', pre: ['line3'], items: [type('line:t:100')]});

  const LINE_TOL = {10: 0.5, 20: 1, 100: 5, '100a': 10};
  const tolOf = (q, settings) => { const key = q.any ? '100a' : q.max; return (settings && settings.lineTol && settings.lineTol[key]) || LINE_TOL[key]; };

  // ---------- 秒答地图接进图谱：L1 / L2 每个世界一个技能（卡），L3 / L4 加法、减法各一个技能（同一天合格 5 次） ----------
  const speedPre = (L, w) => {
    if (L === 0) return w === 5 ? ['bond3'] : w === 0 || w === 6 ? ['bond1'] : ['bond2'];
    if (L === 1) return w === 0 ? ['look4'] : ['bond5'];
    if (L === 2) return ['place2'].concat((w === 0 ? [1, 2, 3] : [4, 5, 6, 7]).map(k => 'speed:L2:' + k)); // 50 以内进位 / 退位要先会 20 以内的进位 / 退位（28+5 用到 8+5）
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
  // 固定例题（示范卡用，不受发牌影响）：卡 = 卡本身；题型 = 题库池第 1 道；秒答题型 = 池第 1 道
  function example(itemId) {
    const it = ITEM[itemId]; if (!it.gen) return {id: itemId, q: it.q, ans: it.ans};
    const p = B.pools[itemId]; if (p) return {id: itemId, q: Object.assign({}, p[0].q), ans: p[0].ans};
    const u = C.BYID[itemId], [a, b] = B.speedPools[itemId].pool[0]; return {id: itemId, q: {a, op: u.op, b}, ans: u.op === '+' ? a + b : a - b};
  }
  const isType = itemId => !!ITEM[itemId].gen;

  // 前置关系检查（测试用）：所有前置都存在、没有环
  function topoOk() {
    const seen = new Set(), stack = new Set();
    const visit = id => { if (stack.has(id)) return false; if (seen.has(id)) return true; stack.add(id); const ok = BY[id].pre.every(p => BY[p] && visit(p)); stack.delete(id); seen.add(id); return ok; };
    return SK.every(s => visit(s.id));
  }

  return {SKILLS: SK, BY, ITEM, judge, make, mkey, isType, example, topoOk, tolOf, LINE_TOL,
    understand: SK.filter(s => !s.speed), speed: SK.filter(s => s.speed)};
});
