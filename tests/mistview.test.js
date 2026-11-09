// 家长「错题分析」统计（docs/说明书-错题分析.md §3–§6）
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), R = require('../v2/render.js'), MV = require('../v2/mistview.js');
const T = '2026-11-20', D = n => C.addDays(T, n);
const blank = () => { const S = C.blank(); S.placedAt = 1; S.demoSeen = Object.fromEntries(K.SKILLS.concat(K.HARD).map(s => [s.id, true])); return S; };
const rnd = x => () => (x = (x * 16807) % 2147483647) / 2147483647;
const SUB = '6-1', ADD = '1+5', TYPE = K.SKILLS.find(s => s.nb && s.input === 'write').items[0].id;
// 记一道秒答错题：evs = [[天, 'w'|'d'|'s', 写的]]，第一条算新进
function speed(S, id, evs) {
  let key; evs.forEach(([d, k, w], i) => {
    if (k !== 's') key = C.addMistake(S, C.inst({id}), D(d)); else C.reviewMistake(S, key, 'slow', D(d));
    C.noteMistake(S, key, {k, w, s: 5, skill: K.ITEM[id].skill, fresh: i === 0}, D(d));
  }); return key;
}
function typed(S, n, evs) {
  const inst = K.make(TYPE, rnd(n + 3)); let key;
  evs.forEach(([d, k, w], i) => { key = E.addMistake(S, inst, D(d)); C.noteMistake(S, key, {k, w, skill: K.ITEM[TYPE].skill, fresh: i === 0}, D(d)); });
  return key;
}
const pass = (S, key, d) => { const m = S.mistakes[key]; m.passes = 5; m.due = null; C.notePassed(S, key, D(d), K.ITEM[m.uid].skill); };

test('没有错题：结论写「近 14 天没有错题」，四个数不报错', () => {
  const v = MV.build(blank(), T);
  assert.equal(v.summary, '近 14 天没有错题'); assert.deepEqual(v.cats, []); assert.equal(v.kpi.due, 0); assert.equal(v.kpi.newW, null); assert.deepEqual(v.advice, []);
});

test('筛选：还没学会的都上；学会超过 14 天的、秒答下架的、题库里没有的不上', () => {
  const S = blank(), a = speed(S, SUB, [[-3, 'w', '7']]), b = speed(S, ADD, [[-30, 'w', '5']]);
  pass(S, b, -20);
  const c = speed(S, '2+4', [[-2, 'w', '5']]); S.mistakes[c].due = null; S.mistakes[c].out = 1;
  S.mistakes.ghost = {key: 'ghost', uid: 'nope', due: D(1), passes: 0};
  const v = MV.build(S, T), keys = v.cats.flatMap(x => x.items.map(i => i.key));
  assert.deepEqual(keys, [a]);
});

test('分组按 K.mistCat；需要讲解 / 写错较多 / 速度慢 / 在好转 / 记录不全 各一例；排序：好转和记录不全在最后', () => {
  const S = blank();
  typed(S, 1, [[-2, 'd', null], [-1, 'd', null]]);                 // 不会多 → 需要讲解
  speed(S, SUB, [[-3, 'w', '7'], [-2, 'w', '8']]);                  // 写错 → 写错较多
  const v1 = MV.build(S, T);
  assert.deepEqual(v1.cats.map(c => [c.name, c.tagText]), [[K.mistCat(TYPE), '需要讲解'], [K.mistCat(SUB), '写错较多']]);
  // 速度慢：只有复习时的慢
  const S2 = blank(), k = speed(S2, SUB, [[-12, 'w', '7'], [-3, 's'], [-2, 's'], [-1, 's']]);
  assert.equal(MV.build(S2, T).cats[0].tagText, '速度慢');
  // 在好转：近 7 天没错，已过 2 次复习
  const S3 = blank(), k3 = speed(S3, SUB, [[-12, 'w', '7']]); S3.mistakes[k3].passes = 2; S3.mistakes[k3].due = D(2);
  assert.equal(MV.build(S3, T).cats[0].tagText, '在好转');
  // 记录不全：旧错题（没有 hist / wrongs）
  const S4 = blank(); C.addMistake(S4, C.inst({id: SUB}), D(-1));
  const v4 = MV.build(S4, T); assert.equal(v4.cats[0].tagText, '记录不全'); assert.equal(v4.cats[0].items[0].part, true); assert.equal(v4.cats[0].atLeast, true);
  // 排序：在好转排到写错较多后面
  const S5 = blank(); speed(S5, '2+4', [[-12, 'w', '5']]); const kk = Object.keys(S5.mistakes)[0]; S5.mistakes[kk].passes = 2; S5.mistakes[kk].due = D(3);
  typed(S5, 2, [[-1, 'w', '3']]);
  assert.deepEqual(MV.build(S5, T).cats.map(c => c.tagText), ['写错较多', '在好转']);
});

test('典型错法：减法算成加法；写错多为差 1', () => {
  const S = blank(); speed(S, SUB, [[-3, 'w', '7'], [-2, 'w', '7']]);   // 6 - 1 写成 7
  assert.equal(MV.build(S, T).cats[0].note, '减法算成了加法');
  const S2 = blank(); speed(S2, SUB, [[-3, 'w', '4'], [-2, 'w', '6']]);  // 答案 5，差 1
  assert.equal(MV.build(S2, T).cats[0].note, '写错多为差 1');
  const S3 = blank(); speed(S3, SUB, [[-3, 'w', '9']]);
  assert.equal(MV.build(S3, T).cats[0].note, null);
});

test('明细：写的取最近一次写错或「不会」，错几次、状态', () => {
  const S = blank(), k = speed(S, SUB, [[-3, 'w', '7'], [-1, 'd', null]]);
  const it = MV.build(S, T).cats[0].items[0];
  assert.deepEqual(it.typed, {k: 'd', w: null, s: 5, o: false}); assert.equal(it.wrongs, 2); assert.equal(it.state, 'due');   // 前一天进本，今天到期
  S.mistakes[k].due = D(2); assert.equal(MV.build(S, T).cats[0].items[0].state, 'doing');
});

test('四个数和结论：新增、学会较上周；反复错；今日复习和孩子看到的一致；建议最多 3 条', () => {
  const S = blank();
  speed(S, SUB, [[-2, 'w', '7'], [-1, 'w', '7']]);          // 本周新增 1，错 2 次
  speed(S, ADD, [[-9, 'w', '5']]); speed(S, '2+4', [[-10, 'w', '5']]);   // 上周新增 2
  typed(S, 1, [[-1, 'd', null]]);
  const v = MV.build(S, T);
  assert.equal(v.kpi.newW, 2); assert.equal(v.kpi.newP, 2); assert.equal(v.kpi.rep, 1);
  assert.equal(v.kpi.due, E.dueMistakes(S, T).length);
  assert.equal(v.kpi.passW, null);   // 没有学会记录
  assert.match(v.summary, /^主要卡在「.+」（.+）/); assert.match(v.summary, /本周新增错题与上周持平$/);
  assert.ok(v.advice.length >= 1 && v.advice.length <= 3);
  const S2 = blank(); for (let n = 0; n < 6; n++) typed(S2, n, [[-1, 'd', null]]); speed(S2, SUB, [[-1, 'w', '9']]);
  assert.ok(MV.build(S2, T).advice.length <= 3);
});

test('难度设置暂停的错题照样列出，并计数', () => {
  const S = blank(); speed(S, SUB, [[-1, 'w', '7']]);
  S.settings = {levels: [15], levelsV: 2};
  const v = MV.build(S, T);
  assert.equal(E.mistOn(S, Object.values(S.mistakes)[0]), false);   // 前提：只选第 15 级时，10 以内加减的错题暂停
  assert.equal(v.paused, 1); assert.equal(v.cats[0].items[0].state, 'paused'); assert.equal(v.kpi.due, 0);
});

test('旧存档、坏数据不报错', () => {
  const S = blank(); S.mistakes.x = null; S.mistakes.y = {key: 'y', uid: SUB, a: 6, op: '-', b: 1, ans: 5, passes: 0, due: D(1), hist: 'bad', wrongs: 'q'};
  S.stats = {[D(0)]: {mn: 'x'}};
  assert.doesNotThrow(() => MV.build(S, T));
  assert.equal(MV.build(S, T).cats[0].tagText, '记录不全');
});

// ---------- 孩子错题宝箱三栏（E 调用，中控 11-09）----------
test('shelves：今天要复习 = E.dueMistakes；过几天再来按日期排；已经学会最近的在前；暂停和全 ≤ 5 的简单题不进三栏', () => {
  const S = blank();
  const a = speed(S, SUB, [[-1, 'w', '7']]);                       // 今天到期
  const b = speed(S, ADD, [[-1, 'w', '5']]); S.mistakes[b].due = D(4);
  const c = speed(S, '2+4', [[-1, 'w', '5']]); S.mistakes[c].due = D(2);
  const d = speed(S, '3+4', [[-30, 'w', '6']]); pass(S, d, -10);
  const e = speed(S, '3+5', [[-30, 'w', '6']]); pass(S, e, -2);
  const f = speed(S, '4+5', [[-30, 'w', '6']]); S.mistakes[f].due = null; S.mistakes[f].out = 1;   // 秒答下架也算学会
  const sh = MV.shelves(S, T);
  assert.deepEqual(sh.today.map(m => m.key), E.dueMistakes(S, T).map(m => m.key));
  assert.deepEqual(sh.today.map(m => m.key), [a]);
  assert.deepEqual(sh.later.map(m => m.key), [c, b]);
  assert.deepEqual(sh.done.map(m => m.key).slice(0, 2), [e, d]); assert.ok(sh.done.some(m => m.key === f));
  assert.equal(MV.build(S, T).kpi.due, sh.today.length);   // 家长页的「今日复习」和孩子页一致
  // 简单题：题型错题的题面全 ≤ 5 → 不进
  const S2 = blank(); assert.equal(C.isLow({a: 1, b: 2}), true);   // 前提
  S2.mistakes.lowq = {key: 'lowq', uid: TYPE, src: K.ITEM[TYPE].skill, q: {a: 1, b: 2}, ans: 3, passes: 0, due: D(0), added: D(-1), last: D(-1)};
  S2.mistakes.okq = Object.assign({}, S2.mistakes.lowq, {key: 'okq', q: {a: 7, b: 8}, ans: 15});
  const sh2 = MV.shelves(S2, T), all2 = sh2.today.concat(sh2.later, sh2.done).map(m => m.key);
  assert.ok(!all2.includes('lowq')); assert.ok(all2.includes('okq'));
  assert.ok(!MV.build(S2, T).cats.some(c => c.items.some(i => i.key === 'lowq')));
  // 暂停：只选第 15 级
  S.settings = {levels: [15], levelsV: 2};
  const sh3 = MV.shelves(S, T);
  assert.deepEqual(sh3.today, []); assert.deepEqual(sh3.later, []);
  assert.equal(MV.build(S, T).kpi.due, 0);
});

test('shelves 按组：speed:L1 只看秒答第 1 级；地点组看 m.src；不传组 = 全部', () => {
  const S = blank(); const a = speed(S, SUB, [[-1, 'w', '7']]); const t = typed(S, 1, [[-1, 'd', null]]);
  const src = S.mistakes[t].src;
  assert.deepEqual(MV.shelves(S, T, 'speed:L1').today.map(m => m.key), [a]);
  assert.deepEqual(MV.shelves(S, T, src).today.map(m => m.key), [t]);
  assert.deepEqual(MV.shelves(S, T, 'speed:L2').today, []);
  assert.equal(MV.shelves(S, T).today.length, 2);
  assert.ok(MV.inGroup(S.mistakes[a], 'speed:L1') && !MV.inGroup(S.mistakes[a], src) && MV.inGroup(S.mistakes[t], null));
});

test('byCat：按 K.MIST_GROUPS 顺序分组，找不到的归「其他」放最后', () => {
  const S = blank(); speed(S, SUB, [[-1, 'w', '7']]); typed(S, 1, [[-1, 'd', null]]);
  const ms = Object.values(S.mistakes).concat([{uid: 'zz:none'}]);
  const g = MV.byCat(ms), names = g.map(x => x.name), order = K.MIST_GROUPS.map(x => x[0]);
  assert.equal(names[names.length - 1], '其他');
  assert.ok(order.indexOf(names[0]) < order.indexOf(names[1]));
  assert.equal(g.reduce((n, x) => n + x.items.length, 0), ms.length);
});

test('shelves：进度里混了坏条目不报错', () => {
  const S = blank(); speed(S, SUB, [[-1, 'w', '7']]); S.mistakes.bad = null; S.mistakes.bad2 = 3;
  assert.doesNotThrow(() => MV.shelves(S, T));
  assert.equal(MV.shelves(S, T).today.length, 1);
});

// ---------- 审查 R1 补充 ----------
// 题型错题：按 id 造一道，答错一次（写的 = typed）
function typeMist(S, id, typed, n = 1) {
  const inst = K.make(id, rnd(n)), key = E.addMistake(S, inst, D(-1));
  C.noteMistake(S, key, {k: 'w', w: typed, skill: K.ITEM[id].skill, fresh: true}, D(-1)); return S.mistakes[key];
}
test('正确答案和「写的」同一口径：选择题显示选项文字，不显示内部编号；秒答、小数、手写照常', () => {
  const S = blank();
  const half = typeMist(S, 'market:t:half', '4 点半'), dec = typeMist(S, 'cmp:g12:deccmp', '3.3'), pat = typeMist(S, 'garden:t:next', '红色');
  const vh = R.question(K.make(half.uid, null, {q: half.q, ans: half.ans}));
  assert.equal(MV.ansOf(half, R), String(vh.pickText[vh.pick.indexOf(half.ans)]));
  assert.match(MV.ansOf(half, R), /点/);
  assert.equal(MV.ansOf(dec, R), String(dec.q.opts[dec.ans])); assert.match(MV.ansOf(dec, R), /^\d+\.\d$/);
  assert.match(MV.ansOf(pat, R), /色$/); assert.doesNotMatch(MV.ansOf(pat, R), /</);
  const sp = S.mistakes[speed(S, SUB, [[-1, 'w', '7']])]; assert.equal(MV.ansOf(sp, R), '5');
  assert.equal(MV.ansOf({src: 'x', uid: 'nope', q: {}, ans: 3}, R), '3');   // 找不到题型：按手写显示
});

test('典型错法：加法算成了减法；小数题差 1 也认；选择题不报「差 1」', () => {
  const S = blank(); speed(S, '2+4', [[-3, 'w', '2'], [-2, 'w', '2']]);   // 2 + 4 写成 2
  assert.equal(MV.build(S, T).cats[0].note, '加法算成了减法');
  const S2 = blank(), m = typeMist(S2, 'cmp:g12:deccmp', '0', 1);   // 选择题
  m.hist.push({d: D(-1), k: 'w', w: String(Number(m.ans) + 1)}); m.hist.push({d: D(-1), k: 'w', w: String(Number(m.ans) - 1)});
  assert.equal(MV.build(S2, T).cats[0].note, null);
  const S3 = blank(), x = speed(S3, SUB, [[-2, 'w', '4']]);   // 手写小数题：答案 143（dp 1）= 14.3
  Object.assign(S3.mistakes[x], {src: 'speed', q: {a: 100, b: 43, op: '+', dp: 1}, ans: 143, hist: [{d: D(-2), k: 'w', w: '15.3'}, {d: D(-1), k: 'w', w: '13.3'}]});
  assert.equal(MV.build(S3, T).cats[0].note, '写错多为差 1');
});

test('结论和建议的文字：错题都在好转；较上周少 / 多；三种建议', () => {
  const S = blank(), k = speed(S, SUB, [[-12, 'w', '7']]); S.mistakes[k].passes = 2; S.mistakes[k].due = D(2);
  assert.match(MV.build(S, T).summary, /^错题都在好转/); assert.deepEqual(MV.build(S, T).advice, []);
  const S2 = blank(); speed(S2, SUB, [[-9, 'w', '7']]); speed(S2, ADD, [[-10, 'w', '5']]); speed(S2, '2+4', [[-1, 'w', '5']]);
  assert.match(MV.build(S2, T).summary, /本周新增错题较上周少 1 道$/);
  const S3 = blank(); speed(S3, SUB, [[-1, 'w', '7']]); speed(S3, ADD, [[-2, 'w', '5']]); speed(S3, '2+4', [[-9, 'w', '5']]);
  assert.match(MV.build(S3, T).summary, /本周新增错题较上周多 1 道$/);
  const S4 = blank(); typed(S4, 1, [[-1, 'd', null]]);
  assert.deepEqual(MV.build(S4, T).advice, [`「${K.mistCat(TYPE)}」：先陪做 1–2 道，讲清思路，再让孩子独立做`]);
  const S5 = blank(); speed(S5, SUB, [[-1, 'w', '9']]);
  assert.deepEqual(MV.build(S5, T).advice, [`「${K.mistCat(SUB)}」：会做但易错，提醒写完检查一遍`]);
  const S6 = blank(); speed(S6, SUB, [[-12, 'w', '7'], [-2, 's'], [-1, 's']]);
  assert.deepEqual(MV.build(S6, T).advice, [`「${K.mistCat(SUB)}」：会做但不够快，正常练习即可，不需要讲`]);
});
