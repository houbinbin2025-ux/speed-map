// 错题记录接进作答流程（B，docs/方案-错题数据字段.md §6，中控 11-08）：F 的 C.noteMistake / C.notePassed 由 engine.js settle 调
// 只记录，不改排课；再来一次、看过提示的不记；孩子写了什么从 res.typed 来
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-01', n);
// 自由加练：第一道题按 first 答，其余答对
function once(S, day, group, first, rest) {
  const f = E.free(S, day, group, {rnd: seeded(7)}); let id = null;
  for (let x = f.next(), g = 0; x && g < 60; x = f.next(), g++) {
    if (x.kind !== 'q') continue;
    if (!id) { id = x; f.answer(first(x)); } else f.answer(rest ? rest(x) : {ok: true, fast: true, secs: 3});
  }
  return id;
}
const keyOf = (S, x) => Object.keys(S.mistakes).find(k => S.mistakes[k].uid === x.inst.id || k === K.mkey(x.inst) || S.mistakes[k].key === K.mkey(x.inst));

test('新进错题：wrongs = 1，经过记一条（写了什么、几秒），技能累计 +1，当天新增 +1', () => {
  const S = C.blank(); S.placedAt = 1;
  const x = once(S, D(0), 'bond', () => ({ok: false, fast: false, secs: 7.25, typed: '22'}));
  const k = Object.keys(S.mistakes)[0], m = S.mistakes[k], sk = K.ITEM[x.inst.id].skill;
  assert.equal(m.wrongs, 1);
  assert.deepEqual(m.hist, [{d: D(0), k: 'w', w: '22', s: 7.3}]);
  assert.equal(S.mistStat[sk].w, 1); assert.equal(S.stats[D(0)].mn, 1);
});

test('点「不会」记 k:d、不记写了什么；口答记 o:1、不记写了什么', () => {
  const S = C.blank(); S.placedAt = 1;
  once(S, D(0), 'bond', () => ({ok: false, fast: false, dunno: true, secs: 2, typed: '5'}));
  const h = Object.values(S.mistakes)[0].hist[0]; assert.equal(h.k, 'd'); assert.equal(h.w, null);
  const T = C.blank(); T.placedAt = 1;
  once(T, D(0), 'bond', () => ({ok: false, fast: false, secs: 4, oral: true}));
  const o = Object.values(T.mistakes)[0].hist[0]; assert.equal(o.k, 'w'); assert.equal(o.w, null); assert.equal(o.o, 1);
});

test('再来一次、看过提示的错不记（错题照常进本，只是不记经过）', () => {
  const S = C.blank(); S.placedAt = 1;
  once(S, D(0), 'bond', () => ({ok: false, fast: false, secs: 3, peeked: true, typed: '9'}));
  Object.values(S.mistakes).forEach(m => { assert.ok(!m.hist && !m.wrongs, '看过提示不记'); });
  assert.ok(!(S.stats[D(0)] || {}).mn);
});

test('复习：对但慢记 k:s、wrongs 不变；再错 wrongs +1 但不算当天新增；过最后一关记一次过关', () => {
  const S = C.blank(); S.placedAt = 1;
  const x = once(S, D(0), 'bond', () => ({ok: false, fast: false, secs: 5, typed: '3'})), k = Object.keys(S.mistakes)[0], sk = K.ITEM[x.inst.id].skill;
  const rv = (day, res) => { const f = E.review(S, day, 'bond', {rnd: seeded(2)}); for (let y = f.next(), g = 0; y && g < 30; y = f.next(), g++) if (y.kind === 'q') f.answer(y.mkey === k ? res : {ok: true, fast: true, secs: 3}); };
  let day = S.mistakes[k].due; rv(day, {ok: true, fast: false, secs: 20, typed: '4'});
  assert.equal(S.mistakes[k].wrongs, 1); assert.equal(S.mistakes[k].hist.slice(-1)[0].k, 's');
  day = S.mistakes[k].due; rv(day, {ok: false, fast: false, secs: 6, typed: '8'});
  assert.equal(S.mistakes[k].wrongs, 2); assert.equal(S.stats[day].mn || 0, 0, '本来就在本里，不算新增');
  // 过关：秒答满 3 次会先被「下架」（out，不算复习过关，方案 §6），所以直接造到差最后一关，答对一次就过关
  S.mistakes[k].passes = C.INTERVALS.length - 1; day = S.mistakes[k].due; rv(day, {ok: true, fast: true, secs: 2});
  assert.equal(S.mistakes[k].due, null); assert.ok(!S.mistakes[k].out); assert.equal(S.mistStat[sk].p, 1); assert.equal(S.stats[day].mp, 1);
  assert.equal(S.mistakes[k].hist.length, 1, '过关后经过只留 1 条');
});

test('秒答下架的题又进错题本时清掉 out', () => {
  const S = C.blank(); S.placedAt = 1;
  const inst = K.make('cmp:t:p10', seeded(1)), key = K.mkey(inst);
  S.mistakes[key] = {key, uid: inst.id, q: inst.q, ans: inst.ans, passes: 2, due: null, out: 1, added: D(0), last: D(0)};
  E.addMistake(S, inst, D(4));
  assert.ok(!S.mistakes[key].out, '重新进本清掉 out'); assert.equal(S.mistakes[key].due, C.addDays(D(4), C.INTERVALS[0]));
});

test('sweep 下架时写 last = 当天（两台设备合并时不会把已下架的题带回复习）', () => {
  const S = C.blank(); S.placedAt = 1;
  const inst = K.make('cmp:t:p10', seeded(1)), key = E.addMistake(S, inst, D(0));
  // 让这道题「秒答下架」：按 E.FAST_OUT 次秒答记满
  for (let i = 0; i < E.FAST_OUT + 2 && !E.spent(S, inst); i++) E.addFast(S, inst, D(i), 3);
  assert.ok(E.spent(S, inst), '造出已下架');
  E.sweep(S, D(5));
  assert.equal(S.mistakes[key].due, null); assert.equal(S.mistakes[key].out, 1); assert.equal(S.mistakes[key].last, D(5));
});
