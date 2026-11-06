// 空空数学岛 · 技能图谱（纯逻辑，无 DOM）：理解数的 19 个技能 + 秒答地图各级，出题、显示、判题、前置关系
// 浏览器里挂到 window.SKILLS（依赖 window.SM），node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./bank.js'), require('./hardbank.js'), require('./placebank.js'));
  else root.SKILLS = factory(root.SM, root.BANK, root.HARDBANK, root.PLACEBANK);
})(typeof self !== 'undefined' ? self : this, function (C, B, HB, NB) {
  'use strict';

  const rint = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const SK = [], BY = {}, ITEM = {};
  // kind：card 一道固定题一个格子 / type8 题型（最近 8 次合格 ≥ 7）/ day5 秒答题型（同一天合格 5 次，同 v2）
  // timedFrom：从第几档开始要求"快"（0 = 一开始就要快，秒答；1 = 淡黄以后，先对后快；null = 不计时）
  function skill(o) {
    const s = Object.assign({timedFrom: null, input: 'write', pre: [], items: []}, o);
    s.items = s.items.filter(Boolean); if (!s.items.length) return null;   // 题全被剔除的技能（如 5 以内分合）不再存在
    s.items.forEach(it => { it.skill = s.id; ITEM[it.id] = it; });
    SK.push(s); BY[s.id] = s; return s;
  }
  // 题目都来自题库（bank.js）：卡 = 题库里这个技能的固定题；题型 = 从题库池里发牌（一轮发完再洗，同一轮不重复）
  const cards = sid => B.cards[sid].filter(c => !C.isLow(c.q)).map(c => ({id: c.id, q: c.q, ans: c.ans}));
  const POOL = {}, pool = id => POOL[id] || (POOL[id] = B.pools[id].filter(x => !C.isLow(x.q)));
  const fromPool = id => r => { const p = pool(id), x = p[C.deal(id, p.length, r)]; return {q: Object.assign({}, x.q), ans: x.ans}; };
  const type = id => (pool(id).length ? {id, gen: fromPool(id)} : null);
  // 三个新地方（docs/意图-v6-三个新关卡.md）：题在 placebank.js，不计时，排在各自前置学完之后
  const place = (id, group, name, pre, ids, input) => skill({id, group, name, nb: true, kind: 'type8', input: input || 'write', pre, items: ids.map(i => ({id: i, gen: r => { const p = NB.pools[i], x = p[C.deal(i, p.length, r)]; return {q: Object.assign({}, x.q), ans: x.ans}; }}))});

  // ---------- 看数（一眼看出有几个，不计时） ----------
  skill({id: 'look1', group: 'look', name: '骰子点', kind: 'card', items: cards('look1')});
  skill({id: 'look2', group: 'look', name: '乱点', kind: 'card', items: cards('look2')});
  skill({id: 'cmp1', group: 'cmp', name: '10 以内谁大', kind: 'type8', timedFrom: 1, input: 'pick', items: [type('cmp:t:10')]});
  skill({id: 'look3', group: 'look', name: '一个十格框', kind: 'card', pre: ['look1'], items: cards('look3')});
  place('gardenA', 'garden', '接方块', ['look3'], ['garden:t:next'], 'pick');
  // ---------- 分合（分合图：整体在上，两部分在下；先卡后题型） ----------
  skill({id: 'bond1', group: 'bond', name: '5 以内分合', kind: 'card', timedFrom: 1, pre: ['look3'], items: cards('bond1').concat([type('bond:t:whole5')])});
  skill({id: 'look4', group: 'look', name: '两个十格框', kind: 'card', pre: ['look3'], items: cards('look4')});
  skill({id: 'bond2', group: 'bond', name: '6–9 分合', kind: 'card', timedFrom: 1, pre: ['bond1'], items: cards('bond2').concat([type('bond:t:whole9')])});
  place('dockA', 'dock', '装到一起', ['bond2'], ['dock:t:join']);
  place('dockB', 'dock', '拿走', ['bond2'], ['dock:t:take']);
  skill({id: 'line1', group: 'line', name: '0—10 数线', kind: 'type8', input: 'line', pre: ['cmp1'], items: [type('line:t:10')]});
  place('clockA', 'market', '整点', ['line1'], ['market:t:hour']);
  place('clockB', 'market', '半点', ['clockA'], ['market:t:half'], 'pick');
  skill({id: 'bond3', group: 'bond', name: '凑十', kind: 'card', timedFrom: 1, pre: ['bond2'], items: cards('bond3')});
  place('money1', 'market', '付钱', ['bond3'], ['market:t:pay']);
  skill({id: 'cmp2', group: 'cmp', name: '20 以内谁大', kind: 'type8', timedFrom: 1, input: 'pick', pre: ['cmp1', 'look4'], items: [type('cmp:t:20')]});
  // 缺数四种：□+a=b（答 b−a）、a+□=b（答 b−a）、□−a=b（答 a+b）、a−□=b（答 a−b）
  skill({id: 'bond4', group: 'bond', name: '缺数算式', kind: 'type8', timedFrom: 1, pre: ['bond3'],
    items: ['addL', 'addR', 'subL', 'subR'].map(f => type('bond:t:' + f))});
  place('dockC', 'dock', '还差几个', ['bond4'], ['dock:t:need']);
  place('money2', 'market', '找零', ['bond4'], ['market:t:change']);
  // 过十准备：k + a = 10 + □（和在 11–17）
  skill({id: 'bond5', group: 'bond', name: '过十准备', kind: 'type8', timedFrom: 1, pre: ['bond3', 'look4'], items: [9, 8, 7].map(k => type('bond:t:to10-' + k))});
  place('dockD', 'dock', '比多少', ['bond4', 'cmp2'], ['dock:t:more']);
  skill({id: 'line2', group: 'line', name: '0—20 数线', kind: 'type8', input: 'line', pre: ['line1', 'cmp2'], items: [type('line:t:20')]});
  // ---------- 数位（几个十和几个一） ----------
  skill({id: 'place1', group: 'place', name: '看十和一写数', kind: 'type8', pre: ['look4'],
    items: [type('place:t:read')]});
  place('gardenB', 'garden', '跳着数', ['place1'], ['garden:t:skip']);
  place('gardenC', 'garden', '找错的', ['gardenB'], ['garden:t:bad'], 'pick');
  skill({id: 'place2', group: 'place', name: '几个十几个一', kind: 'type8', pre: ['place1'],
    items: [type('place:t:split')]});
  skill({id: 'cmp3', group: 'cmp', name: '两位数谁大', kind: 'type8', timedFrom: 1, input: 'pick', pre: ['cmp2', 'place2'],
    items: [type('cmp:t:100'), type('cmp:t:swap')]});
  skill({id: 'cmp4', group: 'cmp', name: '前后数', kind: 'type8', timedFrom: 1, pre: ['cmp3'],
    items: ['p1', 'm1', 'p10', 'm10'].map(k => type('cmp:t:' + k))});
  skill({id: 'line3', group: 'line', name: '0—100 整十', kind: 'type8', input: 'line', pre: ['line2', 'cmp3'], items: [type('line:t:100t')]});
  skill({id: 'line4', group: 'line', name: '0—100 任意', kind: 'type8', input: 'line', pre: ['line3'], items: [type('line:t:100')]});

  const LINE_TOL = {10: 0.5, 20: 1, 100: 5, '100a': 10, 1000: 50, '1000a': 100};
  const tolOf = (q, settings) => { const key = q.any ? q.max + 'a' : q.max; return (settings && settings.lineTol && settings.lineTol[key]) || LINE_TOL[key]; };

  // ---------- 秒答地图接进图谱：L1 / L2 每个世界一个技能（卡），L3 / L4 加法、减法各一个技能（同一天合格 5 次） ----------
  const speedPre = (L, w) => {
    if (L === 0) return w === 5 ? ['bond3'] : w <= 1 || w === 6 ? [] : ['bond2'];   // 世界 2（6 以内）是零进度时第一个能练的秒答
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
  SK.forEach(s => { s.pre = s.pre.filter(p => BY[p]); });   // 被剔除的技能不再是前置

  // ---------- 高级别题（不进 SK：现有地图、奖状、伙伴不受影响。说明书-难度分级） ----------
  const HARD = [];
  const hard = o => { const s = Object.assign({hard: true, kind: 'type8', timedFrom: null, input: 'write', pre: []}, o); s.items = o.ids.map(id => ({id, skill: s.id, gen: r => { const p = HB.pools[id], x = p[C.deal(id, p.length, r)]; return {q: Object.assign({}, x.q), ans: x.ans}; }})); s.items.forEach(it => { ITEM[it.id] = it; }); BY[s.id] = s; HARD.push(s); };
  hard({id: 'lookH1', group: 'look', name: '几排几个', ids: ['look:h:grid']});
  hard({id: 'lookH2', group: 'look', name: '百格图数数', pre: ['lookH1'], ids: ['look:h:h100']});
  hard({id: 'bondH1', group: 'bond', name: '整十分合', timedFrom: 1, ids: ['bond:h:tens']});
  hard({id: 'bondH2', group: 'bond', name: '凑一百', timedFrom: 1, pre: ['bondH1'], ids: ['bond:h:to100']});
  hard({id: 'placeH1', group: 'place', name: '看百十个写数', ids: ['place:h:read']});
  hard({id: 'placeH2', group: 'place', name: '几个百几个十', pre: ['placeH1'], ids: ['place:h:split']});
  hard({id: 'cmpH1', group: 'cmp', name: '算式谁大', timedFrom: 1, input: 'pick', ids: ['cmp:h:expr']});
  hard({id: 'cmpH2', group: 'cmp', name: '三位数谁大', timedFrom: 1, input: 'pick', pre: ['cmpH1'], ids: ['cmp:h:1000']});
  hard({id: 'lineH1', group: 'line', name: '0—1000 整百', input: 'line', ids: ['line:h:1000t']});
  hard({id: 'lineH2', group: 'line', name: '0—1000 任意', input: 'line', pre: ['lineH1'], ids: ['line:h:1000']});
  hard({id: 'speedH1', group: 'speedH', name: '连加连减', timedFrom: 1, ids: ['speed:h:chain']});
  hard({id: 'speedH2', group: 'speedH', name: '两位数加减两位数', timedFrom: 1, pre: ['speedH1'], ids: ['speed:h:two']});
  hard({id: 'speedH3', group: 'speedH', name: '乘法 2、5、10', timedFrom: 1, pre: ['speedH2'], ids: ['speed:h:mul']});
  // 11-06 分 15 级补的题（说明书-难度分级）；旧的挑战题也并进分级，家长选难度才出或自动开放
  hard({id: 'bondH3', group: 'bond', name: '20 以内分合', timedFrom: 1, ids: ['bond:h:20']});
  hard({id: 'dockH1', group: 'dock', name: '20 以内应用题', ids: ['dock:h:20']});
  hard({id: 'dockH2', group: 'dock', name: '50 以内应用题', pre: ['dockH1'], ids: ['dock:h:50']});
  hard({id: 'dockH3', group: 'dock', name: '100 以内应用题', pre: ['dockH2'], ids: ['dock:h:100']});
  hard({id: 'dockH4', group: 'dock', name: '乘法应用题 2、5、10', ids: ['dock:h:mul2']});
  hard({id: 'dockH5', group: 'dock', name: '乘法应用题', pre: ['dockH4'], ids: ['dock:h:mul']});
  hard({id: 'dockH6', group: 'dock', name: '除法应用题', pre: ['dockH5'], ids: ['dock:h:div']});
  hard({id: 'marketH1', group: 'market', name: '50 元以内付钱', ids: ['market:h:pay']});
  hard({id: 'marketH2', group: 'market', name: '大钱找零', pre: ['marketH1'], ids: ['market:h:change']});
  hard({id: 'marketH3', group: 'market', name: '几点几分', ids: ['market:h:clock']});
  hard({id: 'gardenH1', group: 'garden', name: '3 和 4 跳着数', ids: ['garden:h:skip']});
  hard({id: 'gardenH2', group: 'garden', name: '倒着跳', pre: ['gardenH1'], ids: ['garden:h:down']});
  hard({id: 'speedH4', group: 'speedH', name: '表内乘法', timedFrom: 1, pre: ['speedH3'], ids: ['speed:h:mul2']});
  hard({id: 'speedH5', group: 'speedH', name: '表内除法', timedFrom: 1, pre: ['speedH4'], ids: ['speed:h:div']});

  // ---------- 15 级难度（说明书-难度分级）：每道题一个级别，按题算，题库数据不改 ----------
  const LEVELS = [
    ['10 以内的数', '看数、比大小、数线、接方块'], ['10 以内分合', '6–9 分合、8 以内加减、整点'], ['凑十', '凑十、缺数算式、9 和 10 的加减'],
    ['20 以内的数', '十格框、比大小、数线、十几加减几'], ['20 以内进位加', '过十准备、9/8/7/6 加几、付钱'], ['20 以内退位减', '十几减几、找零、半点、应用题'],
    ['100 以内的数', '数位、两位数比大小、前后数、跳着数'], ['两位数加减一位数', '不进退位、整十、付钱'], ['进位退位', '进退位、连加连减、整十分合、应用题'],
    ['两位数加减两位数', '不进退位、凑一百、百格图、几点几分'], ['两位数进位退位', '进退位、100 以内应用题、找零'], ['三位数', '百十个、比大小、0—1000 数线'],
    ['乘法入门', '2、5、10 的乘法、应用题'], ['表内乘法', '3、4、6、7、8、9 的乘法、应用题'], ['表内除法', '除法、应用题'],
  ].map(([name, what], i) => ({n: i + 1, name, what}));
  const SKILL_LEVEL = {look1: 1, look3: 1, look4: 4, cmp1: 1, cmp2: 4, cmp3: 7, cmp4: 7, line1: 1, line2: 4, line3: 7, line4: 7, bond2: 2, bond3: 3, bond4: 3, bond5: 5, place1: 7, place2: 7,
    gardenA: 1, gardenB: 7, gardenC: 7, clockA: 2, clockB: 6, money2: 6,
    lookH1: 7, lookH2: 10, bondH1: 9, placeH1: 12, placeH2: 12, cmpH1: 9, cmpH2: 12, lineH1: 12, lineH2: 12, speedH1: 9, speedH2: 11, speedH3: 13, speedH4: 14, speedH5: 15,
    dockH1: 6, dockH2: 9, dockH3: 11, dockH4: 13, dockH5: 14, dockH6: 15, marketH1: 9, marketH2: 11, marketH3: 10, gardenH1: 9, gardenH2: 10};
  const SPEED_L1 = {1: 2, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3}, SPEED_L2 = {0: 4, 1: 5, 2: 5, 3: 5, 4: 6, 5: 6, 6: 6, 7: 6};
  const SPEED_TYPE = {add10: 8, addT: 8, sub10: 8, subT: 8, add1n: 8, sub1n: 8, add1c: 9, sub1c: 9, add2n: 10, sub2n: 10, add2c: 11, sub2c: 11};
  function levelOfQ(id, q, ans) {
    const it = ITEM[id], s = BY[it.skill];
    if (s.speed) { const u = C.BYID[id]; return u.L === 0 ? SPEED_L1[u.w] : u.L === 1 ? SPEED_L2[u.w] : SPEED_TYPE[id.split(':')[1]]; }
    if (SKILL_LEVEL[s.id]) return SKILL_LEVEL[s.id];
    if (s.id === 'money1') return ans <= 10 ? 5 : 8;
    if (s.id === 'bondH2') return /^\d*0 \+/.test(q.text) ? 10 : 11;                     // 凑一百：整十第 10 级，要退位的第 11 级
    if (s.id === 'bondH3') { const a = +q.text.match(/= (\d+)/)[1]; return a >= 10 || ans >= 10 ? 4 : 6; }   // 20 以内分合：含十的第 4 级，要过十的第 6 级
    if (s.group === 'dock') return Math.max(q.a || 0, q.b || 0, ans) <= 8 ? 2 : 3;   // 故事码头原来的题：8 以内第 2 级，9、10 第 3 级
    return 0;
  }
  const levelOf = inst => levelOfQ(inst.id, inst.q || {}, inst.ans);
  // 一格里有哪几级的题（只算一次）
  const IL = {};
  function itemLevels(id) {
    if (IL[id]) return IL[id];
    const it = ITEM[id], s = BY[it.skill], set = new Set();
    if (!it.gen) set.add(levelOfQ(id, it.q, it.ans));
    else if (s.speed) set.add(levelOfQ(id, {}, 0));
    else (rawPool(id) || []).forEach(x => set.add(levelOfQ(id, x.q, x.ans)));
    return (IL[id] = [...set].sort((a, b) => a - b));
  }

  // 输入：write → 写的数字；pick → 点的那个数；line → 放的位置（数值）
  function judge(item, inst, input, settings) {
    const s = BY[item.skill];
    if (s.input === 'line') { const err = Math.abs(input - inst.ans); return {ok: err < tolOf(inst.q, settings) || err === 0, err}; }
    return {ok: input === inst.ans};
  }
  const rawPool = id => (ITEM[id].gen && !B.pools[id] && !HB.pools[id] && !NB.pools[id]) ? null : (B.pools[id] ? pool(id) : HB.pools[id] || NB.pools[id]);
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
    const p = rawPool(itemId); if (p) return {id: itemId, q: Object.assign({}, p[0].q), ans: p[0].ans};
    const u = C.BYID[itemId], [a, b] = B.speedPools[itemId].pool[0]; return {id: itemId, q: {a, op: u.op, b}, ans: u.op === '+' ? a + b : a - b};
  }
  const isType = itemId => !!ITEM[itemId].gen;

  // 前置关系检查（测试用）：所有前置都存在、没有环
  function topoOk() {
    const seen = new Set(), stack = new Set();
    const visit = id => { if (stack.has(id)) return false; if (seen.has(id)) return true; stack.add(id); const ok = BY[id].pre.every(p => BY[p] && visit(p)); stack.delete(id); seen.add(id); return ok; };
    return SK.every(s => visit(s.id));
  }

  return {LEVELS, levelOf, levelOfQ, itemLevels, pool, rawPool, SKILLS: SK, HARD, BY, ITEM, judge, make, mkey, isType, example, topoOk, tolOf, LINE_TOL,
    understand: SK.filter(s => !s.speed), speed: SK.filter(s => s.speed)};
});
