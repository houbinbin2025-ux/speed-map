// C 方案 4 甲（中控、F 11-09 批准）：家里「错题真的会了」= 复习满 5 次，或秒答满 3 次被下架（m.out）。
// 原来只认复习满 5 次，而错题总是先被秒答下架，金苹果（5 道）、熔炉师傅（10 道）、炼金大师（50 道）谁都拿不到（模拟 180 天 0 道；空空真实进度 16 道下架、0 道满 5 次）
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../v2/core.js'), H = require('../v2/home.js');
const mist = (k, o) => Object.assign({key: k, uid: 'look1', src: 'look', q: {}, ans: 1, passes: 0, due: '2026-11-12', added: '2026-11-01', last: '2026-11-08'}, o);
const kid = list => { const S = C.blank(); S.placedAt = 1; list.forEach((m, i) => { S.mistakes['k' + i] = mist('k' + i, m); }); return S; };

test('秒答下架的、复习满 5 次的都算；还在复习的不算', () => {
  const S = kid([{due: null, out: 1, passes: 1}, {due: null, passes: 5}, {passes: 3}, {passes: 0}]);
  assert.equal(H.stats(S).solved, 2);
});

test('5 道下架的错题：第一次打开就补发金苹果；10 道补发熔炉师傅', () => {
  const S = kid(Array.from({length: 10}, () => ({due: null, out: 1, passes: 0})));
  const got = H.sync(S, '2026-11-10').map(r => r.id);
  assert.ok(got.includes('apple') && got.includes('c:fix:10'), got.join(','));
  assert.ok(!got.includes('c:fix:50'));
});

test('只增不减：下架的错题后来又答错（回到复习），已经发的奖励不收回', () => {
  const S = kid(Array.from({length: 5}, () => ({due: null, out: 1})));
  H.sync(S, '2026-11-10'); assert.ok(S.home.got.apple);
  Object.values(S.mistakes).forEach(m => { delete m.out; m.due = '2026-11-12'; m.passes = 0; });
  assert.equal(H.stats(S).solved, 0); H.sync(S, '2026-11-11');
  assert.ok(S.home.got.apple, '金苹果还在');
});
