// 宝石规则 10.2（Ben 11-08，中控派单）：双倍挑战 3 分钟 + 答得非常好再来一次；思维地点答对给碎片、算有效时间；碎片不够写差多少
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../v2/gems.js');
const DAY = '2026-11-08';

test('双倍挑战 3 分钟；赢了且正确率 ≥ 90% 可以再来一次，不占每天 4 次，每天有上限', () => {
  assert.equal(G.TUNE.dblSec, 180);
  const st = G.blank();
  G.evStart(st, DAY, 'dbl', false);
  const r1 = G.evEnd(st, DAY, {kind: 'dbl', n: 10, done: 10, ans: 11, earned: {s: 2}});
  assert.equal(r1.won, true); assert.equal(r1.chain, true, '10/11 = 91%：答得非常好');
  assert.equal(G.evEnd(st, DAY, {kind: 'dbl', n: 10, done: 10, ans: 12, earned: {}}).chain, false, '10/12 = 83%：不够');
  assert.equal(G.evEnd(st, DAY, {kind: 'dbl', n: 10, done: 9, ans: 9, earned: {}}).chain, false, '没完成：不给');
  assert.equal(G.evEnd(st, DAY, {kind: 'qc', n: 10, done: 10, ans: 10, earned: {}}).chain, false, '限时挑战没有这个');
  const d0 = st.days[DAY].dbl;
  G.evStart(st, DAY, 'dbl', 'chain');
  assert.equal(st.days[DAY].dbl, d0, '再来一次不占每天的次数'); assert.equal(st.days[DAY].dblChain, 1);
  for (let i = 1; i < G.TUNE.dblChainMax; i++) G.evStart(st, DAY, 'dbl', 'chain');
  assert.equal(G.evEnd(st, DAY, {kind: 'dbl', n: 10, done: 10, ans: 10, earned: {}}).chain, false, '每天上限到了：不再给');
  assert.equal(G.evEnd(G.blank(), DAY, {kind: 'dbl', n: 10, done: 10, earned: {}}).chain, false, '没记答题数（旧调用）：不给');
});

test('思维地点：答对按一道题给，至少 1 个小碎片；同一题当天再做、或试错后才对，只给普通小碎片；不按秒答多给；不计入当天正确率；有效时间按用时、最多 30 秒（同练习页）', () => {
  const st = G.blank();
  const g1 = G.thinkAnswer(st, {day: DAY, key: 'balance:0:a', secs: 75});
  assert.deepEqual(g1, ['b'], '答对：小碎片（其他练习按金色算，2）');
  assert.equal(st.days[DAY].sec, 30, '想了 75 秒，有效时间按 30 秒（和练习页上限一样）');
  assert.equal(st.days[DAY].ok || 0, 0, '不计入正确率（思维地点答错不记，计入会越做越高）'); assert.equal(st.days[DAY].n || 0, 0);
  G.thinkAnswer(st, {day: DAY, key: 'balance:0:b', secs: 4});
  assert.equal(st.days[DAY].sec, 34, '很快做对：按实际 4 秒');
  const again = G.thinkAnswer(st, {day: DAY, key: 'balance:0:a', secs: 20});
  assert.deepEqual([...again], ['a'], '今天做过的同一题：普通小碎片'); assert.equal(again.rep, true);
  assert.equal(st.days[DAY].n || 0, 0, '始终不算作答数');
  const tried = G.thinkAnswer(st, {day: DAY, key: 'balance:0:c', wrong: 3, secs: 30});
  assert.deepEqual([...tried], ['a'], '试错 3 次后才对：普通小碎片（同练习页「答错后改对」）'); assert.equal(tried.rep, true);
  assert.equal(st.inv.b, 2); assert.equal(st.inv.a, 2);
});

test('碎片不够：算出差多少（炼宝石凑 100；炼大碎片凑准 50，多了也说）', () => {
  assert.deepEqual(G.forgeGap({s: 10, b: 3}, 'gem'), {sum: 56, need: 100, short: 44, over: 0});
  assert.deepEqual(G.forgeGap({h: 1, s: 4}, 'big'), {sum: 45, need: 50, short: 5, over: 0});
  assert.deepEqual(G.forgeGap({h: 1, s: 7}, 'big'), {sum: 60, need: 50, short: 0, over: 10});
});
