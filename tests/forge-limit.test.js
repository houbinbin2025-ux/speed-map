// 锻造室每天只能进 5 次（Ben 11-09：「锻造每天只有 5 次机会，每次从其他界面切换到锻造室就算一次，提醒还有几次。现在页面很多时间都在无效时间」）
// 进了不炼也算一次；第 6 次进不去，碎片留着明天炼；次数记在碎片存档的当天记录里（st.days[日].fin），跟碎片一起导出、合并取大
const test = require('node:test'), assert = require('node:assert/strict');
const G = require('../v2/gems.js');

test('每天 5 次：每进一次返回还剩几次，第 6 次进不去', () => {
  const st = G.blank(), day = '2026-11-10';
  assert.equal(G.FORGE_DAY, 5);
  assert.equal(G.forgeLeft(st, day), 5, '今天还没进过');
  assert.deepEqual([1, 2, 3, 4, 5].map(() => G.forgeEnter(st, day)), [4, 3, 2, 1, 0].map(left => ({ok: true, left})));
  assert.deepEqual(G.forgeEnter(st, day), {ok: false, left: 0});
  assert.equal(st.days[day].fin, 5, '进不去的那次不记');
  assert.equal(G.forgeLeft(st, day), 0);
});

test('第二天重新有 5 次', () => {
  const st = G.blank();
  for (let i = 0; i < 6; i++) G.forgeEnter(st, '2026-11-10');
  assert.deepEqual(G.forgeEnter(st, '2026-11-11'), {ok: true, left: 4});
});

test('旧存档的当天记录没有这个字段：当 0 次，不报错', () => {
  const st = G.blank(); st.days['2026-11-10'] = {ok: 3, bad: 0, n: 3, m: 0, paid: 0, forged: 1, waste: 0};
  assert.equal(G.forgeLeft(st, '2026-11-10'), 5);
  assert.deepEqual(G.forgeEnter(st, '2026-11-10'), {ok: true, left: 4});
  assert.equal(st.days['2026-11-10'].forged, 1, '别的字段不动');
});

test('两台设备合并：同一天的次数取大（手机进了 3 次、iPad 进了 2 次 → 合并后算 3 次，不会变多出来的机会）', () => {
  const a = G.blank(), b = G.blank(), day = '2026-11-10';
  for (let i = 0; i < 3; i++) G.forgeEnter(a, day);
  for (let i = 0; i < 2; i++) G.forgeEnter(b, day);
  const M = G.mergeBackup(b, JSON.parse(JSON.stringify(a)));
  assert.equal(G.forgeLeft(M, day), 2);
});

test('坏值（负数、字符串）当 0 次处理，不会多给也不会卡死', () => {
  const st = G.blank(), day = '2026-11-10';
  st.days[day] = Object.assign({}, st.days[day] || {ok: 0, bad: 0, n: 0, m: 0, paid: 0, forged: 0, waste: 0}, {fin: -3});
  assert.equal(G.forgeLeft(st, day), 5);
  st.days[day].fin = 'x'; assert.equal(G.forgeLeft(st, day), 5);
  st.days[day].fin = 99; assert.equal(G.forgeLeft(st, day), 0);
});

test('存档读回、清理旧日子后次数还在（关掉再开不会重新有 5 次）', () => {
  const st = G.blank(), day = '2026-11-10'; G.forgeEnter(st, day); G.forgeEnter(st, day);
  const r = G.parse(JSON.stringify(st)); G.prune(r, day);
  assert.equal(G.forgeLeft(r, day), 3);
});
