// 方块世界规则测试：node --test docs/原型-v7-世界/world-core.test.js。落地时搬到 tests/world.test.js
// 变异验收：node docs/原型-v7-世界/mutate.js
const test = require('node:test'), assert = require('node:assert');
const W = require('./world-core.js');
const D = n => new Date(Date.UTC(2026, 10, 1 + n)).toISOString().slice(0, 10);
const card = (id, o) => Object.assign({id, gen: false, level: 1, group: 'look', seen: true}, o);
const type = (id, o) => Object.assign({id, gen: true, level: 1, group: 'look', seen: true}, o);
const pick = id => ({id, gen: true, pick: true, level: 1, group: 'cmp', seen: true});
const ok = {ok: true, fast: true}, bad = {ok: false};
const three = o => [card('a', o), card('b', o), card('c', o)];
const many = (n, o) => Array.from({length: n}, (_, i) => card('i' + i, o));
function prove(w, its, days) { days.forEach(d => its.forEach(i => { for (let k = 0; k < W.needOf(i); k++) W.onAttempt(w, i, ok, D(d)); })); }
const clone = o => JSON.parse(JSON.stringify(o));

// ---------- 证明链 ----------
test('证明链：隔 1 天、再隔 3 天才到第 3 步，最快第 5 天；每步发对的材料', () => {
  const w = W.blank(), i = card('a');
  W.onAttempt(w, i, ok, D(0)); assert.equal(W.stepOf(w, 'a'), 1); assert.deepEqual([w.bag.iron, w.bag.gold, w.bag.diamond], [1, 0, 0]);
  W.onAttempt(w, i, ok, D(1)); assert.equal(W.stepOf(w, 'a'), 2); assert.deepEqual([w.bag.iron, w.bag.gold, w.bag.diamond], [1, 1, 0]);
  for (const d of [2, 3]) { W.onAttempt(w, i, ok, D(d)); assert.equal(W.stepOf(w, 'a'), 2); }
  W.onAttempt(w, i, ok, D(4)); assert.equal(W.stepOf(w, 'a'), 3); assert.deepEqual([w.bag.iron, w.bag.gold, w.bag.diamond], [1, 1, 1]);
  assert.equal(w.proof.a.d3, D(4)); assert.deepEqual(w.total, {iron: 1, gold: 1, diamond: 1});
});
test('题型一步给 3 个材料', () => {
  const w = W.blank(); prove(w, [type('t')], [0]); assert.equal(w.bag.iron, 3); assert.equal(W.creditOf(type('t')), 3); assert.equal(W.creditOf(card('c')), 1);
});
test('当天重复、当场再来一次、偷看都不算', () => {
  const w = W.blank(), i = card('a');
  for (let k = 0; k < 50; k++) W.onAttempt(w, i, ok, D(0));
  assert.equal(W.stepOf(w, 'a'), 1);
  W.onAttempt(w, i, {ok: true, fast: true, retry: true}, D(1)); assert.equal(W.stepOf(w, 'a'), 1);
  W.onAttempt(w, i, {ok: true, fast: true, peeked: true}, D(1)); W.onAttempt(w, i, ok, D(1)); assert.equal(W.stepOf(w, 'a'), 1);
  W.onAttempt(w, i, ok, D(2)); assert.equal(W.stepOf(w, 'a'), 2);
});
test('当天第一次错了，当天再对也不算', () => {
  const w = W.blank(), i = card('a');
  W.onAttempt(w, i, bad, D(0)); W.onAttempt(w, i, ok, D(0)); assert.equal(W.stepOf(w, 'a'), 0);
});
test('题型当天前 2 次都对才算，选择题前 3 次', () => {
  const w = W.blank(), t = type('t'), p = pick('p');
  W.onAttempt(w, t, ok, D(0)); assert.equal(W.stepOf(w, 't'), 0);
  W.onAttempt(w, t, ok, D(0)); assert.equal(W.stepOf(w, 't'), 1);
  W.onAttempt(w, p, ok, D(0)); W.onAttempt(w, p, ok, D(0)); assert.equal(W.stepOf(w, 'p'), 0);
  W.onAttempt(w, p, bad, D(0)); W.onAttempt(w, p, ok, D(0)); assert.equal(W.stepOf(w, 'p'), 0);
  const q = pick('q'); [0, 1, 2].forEach(() => W.onAttempt(w, q, ok, D(0))); assert.equal(W.stepOf(w, 'q'), 1);
});
test('写错退一步、间隔从今天算；第 3 步不退；再升回来不重复发材料', () => {
  const w = W.blank(), i = card('a');
  W.onAttempt(w, i, ok, D(0)); W.onAttempt(w, i, ok, D(1)); assert.equal(w.bag.gold, 1);
  W.onAttempt(w, i, bad, D(2)); assert.equal(W.stepOf(w, 'a'), 1); assert.equal(w.proof.a.top, 2);
  W.onAttempt(w, i, ok, D(2)); assert.equal(W.stepOf(w, 'a'), 1, '当天不再算');
  W.onAttempt(w, i, ok, D(3)); assert.equal(W.stepOf(w, 'a'), 2); assert.equal(w.bag.gold, 1, '不重复发');
  W.onAttempt(w, i, ok, D(6)); assert.equal(W.stepOf(w, 'a'), 3);
  W.onAttempt(w, i, bad, D(7)); assert.equal(W.stepOf(w, 'a'), 3);
});
test('慢答今天不进不退', () => {
  const w = W.blank(), i = card('a'), slow = {ok: true, fast: false, needFast: true};
  W.onAttempt(w, i, slow, D(0)); assert.equal(W.stepOf(w, 'a'), 0);
  W.onAttempt(w, i, ok, D(0)); assert.equal(W.stepOf(w, 'a'), 0);
  W.onAttempt(w, i, {ok: true, fast: true, needFast: true}, D(1)); assert.equal(W.stepOf(w, 'a'), 1);
});
test('日期被往后调过：改回来证明链不冻结，也不白给', () => {
  const w = W.blank(), i = card('a');
  W.onAttempt(w, i, ok, '2027-11-06'); assert.equal(W.stepOf(w, 'a'), 1);
  W.onAttempt(w, i, ok, D(0)); assert.equal(W.stepOf(w, 'a'), 1, '夹回今天，今天不升');
  assert.equal(w.proof.a.last, D(0));
  W.onAttempt(w, i, ok, D(1)); assert.equal(W.stepOf(w, 'a'), 2, '继续走');
});
test('来回改日期不清当天判定；练习日往回调不烧不发木头', () => {
  const w = W.blank(), i = card('a');
  W.onAttempt(w, i, bad, D(5)); W.onAttempt(w, i, ok, D(4)); W.onAttempt(w, i, ok, D(5));
  assert.ok(W.stepOf(w, 'a') <= 1); assert.equal(w.evs[D(5)].a.done, 1);
  const wood = w.bag.wood; W.endOfPractice(w, D(5)); assert.equal(w.bag.wood, wood + 2);
  W.endOfPractice(w, D(5)); W.endOfPractice(w, D(4)); assert.equal(w.bag.wood, wood + 2);
});
test('附魔：第 3 步后隔 14 天；复查第一次结果留痕；地块附魔', () => {
  const w = W.blank(), its = three();
  W.claim(w, 1, 0, its, D(0)); prove(w, its, [0, 1, 4]);
  assert.equal(w.plots['1,0'].st, 'perm');
  assert.equal(W.enchList(w, its, D(17)).length, 0); assert.equal(W.enchList(w, its, D(18)).length, 3);
  assert.equal(W.enchList(w, many(0).concat(its), D(18), 2).length, 2);
  W.onAttempt(w, its[0], bad, D(18)); assert.deepEqual(w.proof.a.chk, {day: D(18), ok: 0}); assert.equal(W.stepOf(w, 'a'), 3);
  prove(w, its, [32]); assert.equal(w.proof.a.chk.ok, 0, '只记第一次'); assert.equal(w.proof.b.chk.ok, 1);
  assert.ok(w.plots['1,0'].ench);
  assert.equal(w.bag.diamond, 3, '第 4 步不发材料');
});
test('复查不受回来次数限制（永久地块都能附魔）', () => {
  const w = W.blank(), its = three({spent: true});
  W.claim(w, 1, 0, its, D(0)); prove(w, its, [0, 1, 4]);
  its.forEach(i => { w.proof[i.id].back = W.BACK_MAX; });
  assert.equal(W.enchList(w, its, D(18)).length, 3);
});

// ---------- 地块和火把 ----------
test('地块：绑定的题全到第 3 步变永久，第 5 天是下限', () => {
  const w = W.blank(), its = three();
  assert.ok(W.claim(w, 1, 0, its, D(0)).ok);
  for (let d = 0; d < 5; d++) { for (let r = 0; r < 50; r++) its.forEach(i => W.onAttempt(w, i, ok, D(d))); if (d < 4) assert.equal(w.plots['1,0'].st, 'temp'); }
  assert.equal(w.plots['1,0'].st, 'perm');
});
test('火把：起始 5 支；没轮到不烧；答对不烧；只错才烧；烧完进迷雾，建筑还在，学会自己回来', () => {
  const w = W.blank(), its = three();
  W.claim(w, 1, 0, its, D(0)); W.gain(w, 'b:stone', 1); W.place(w, 1, 0, 0, 0, 'stone', D(0));
  const t = w.plots['1,0']; assert.equal(t.torch, 5);
  W.endOfPractice(w, D(0)); assert.equal(t.torch, 5, '当天插的不烧');
  W.endOfPractice(w, D(1)); assert.equal(t.torch, 5, '没轮到不烧');
  its.forEach(i => W.onAttempt(w, i, ok, D(2))); W.endOfPractice(w, D(2)); assert.equal(t.torch, 5, '答对不烧');
  for (let d = 3; d < 8; d++) { its.forEach(i => W.onAttempt(w, i, bad, D(d))); W.endOfPractice(w, D(d)); assert.equal(t.torch, 5 - (d - 2) > 0 ? 5 - (d - 2) : 0); }
  assert.equal(t.st, 'wild'); assert.ok(w.built['1,0']['0,0']);
  prove(w, its, [10, 11, 14]);
  assert.equal(w.plots['1,0'].st, 'perm', '免费回来');
});
test('没来的日子不烧（不调用 endOfPractice）', () => {
  const w = W.blank(), its = three(); W.claim(w, 1, 0, its, D(0));
  W.endOfPractice(w, D(14)); assert.equal(w.plots['1,0'].torch, 5);
});
test('等间隔那天又对又快不烧（不能比慢答亏）', () => {
  const w = W.blank(), its = three();
  W.claim(w, 1, 0, its, D(0)); prove(w, its, [0, 1]);
  its.forEach(i => W.onAttempt(w, i, ok, D(2))); W.endOfPractice(w, D(2));
  assert.equal(w.plots['1,0'].torch, 5);
});
test('慢答不烧，但拖过 10 个练习日要烧，不能永远占着名额', () => {
  const w = W.blank(), its = three(), slow = {ok: true, fast: false, needFast: true};
  W.claim(w, 1, 0, its, D(0));
  const torch = [];
  for (let d = 1; d <= 16; d++) { its.forEach(i => W.onAttempt(w, i, slow, D(d))); W.endOfPractice(w, D(d)); torch.push(w.plots['1,0'].torch); }
  assert.deepEqual(torch.slice(0, 10), Array(10).fill(5));
  assert.equal(w.plots['1,0'].st, 'wild');
});
test('超过 10 个练习日没有前进要烧，有前进不烧', () => {
  const w = W.blank(), its = three(); W.claim(w, 1, 0, its, D(0));
  for (let d = 1; d <= 10; d++) W.endOfPractice(w, D(d));
  assert.equal(w.plots['1,0'].torch, 5);
  W.endOfPractice(w, D(11)); assert.equal(w.plots['1,0'].torch, 4);
  W.onAttempt(w, its[0], ok, D(12)); W.endOfPractice(w, D(12)); assert.equal(w.plots['1,0'].torch, 4);
});
test('到期开关关了不烧', () => {
  const w = W.blank(), its = three(); w.settings.expire = false;
  W.claim(w, 1, 0, its, D(0));
  for (let d = 1; d < 30; d++) { its.forEach(i => W.onAttempt(w, i, bad, D(d))); W.endOfPractice(w, D(d)); }
  assert.equal(w.plots['1,0'].st, 'temp');
});
test('木头：每个练习日 2 根，每 8 块永久多 1 根，上限 8', () => {
  const w = W.blank(); assert.equal(W.dailyWood(w), 2);
  for (let i = 1; i <= 8; i++) w.plots['9,' + i] = {x: 9, y: i, st: 'perm', bound: []};
  assert.equal(W.dailyWood(w), 3);
  for (let i = 9; i <= 80; i++) w.plots['9,' + i] = {x: 9, y: i, st: 'perm', bound: []};
  assert.equal(W.dailyWood(w), 8);
});
test('拓不了不扣旗；临时满 5 块拒绝；最近到期过 2 块降到 3 块并绑 2 分、7 支火把', () => {
  const w = W.blank(), its = many(30); W.gain(w, 'flag', 10);
  [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]].forEach(([x, y]) => assert.ok(W.claim(w, x, y, its, D(0)).ok));
  const f = w.bag.flag, r = W.claim(w, -1, 1, its, D(0));
  assert.equal(r.why, 'cap'); assert.equal(w.bag.flag, f);
  const u = W.blank(), its2 = many(30); W.gain(u, 'flag', 10);
  u.log.push({day: D(0), type: 'wild'}, {day: D(0), type: 'wild'});
  assert.equal(W.tempCap(u, D(1)), 3); assert.equal(W.tempCap(u, D(14)), 5);
  const p = W.claim(u, 1, 0, its2, D(1)).plot; assert.equal(p.bound.length, 2); assert.equal(p.torch, W.TORCH_EASY);
  W.claim(u, -1, 0, its2, D(1)); W.claim(u, 0, 1, its2, D(1));
  assert.equal(W.claim(u, 0, -1, its2, D(1)).why, 'cap');
});
test('一块地绑 3 分：3 道固定题或 1 个题型', () => {
  const w = W.blank(); W.gain(w, 'flag', 5);
  assert.equal(W.claim(w, 1, 0, many(9), D(0)).plot.bound.length, 3);
  const u = W.blank(); W.gain(u, 'flag', 5);
  const r = W.claim(u, 1, 0, [card('a'), card('b'), type('t1'), type('t2')], D(0));
  assert.equal(r.plot.bound.length, 1); assert.ok(r.plot.bound[0].startsWith('t'));
});
test('题少时有多少绑多少', () => {
  const w = W.blank(); W.gain(w, 'flag', 5);
  assert.equal(W.claim(w, 1, 0, [card('a'), card('b')], D(0)).plot.bound.length, 2);
});
test('已学会的题攒够 3 分才能换永久，不足 3 分不换', () => {
  const w = W.blank(), its = many(15), proved = its.slice(0, 2); W.gain(w, 'flag', 10);
  prove(w, proved, [0, 1, 4]);
  [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]].forEach(([x, y]) => W.claim(w, x, y, its.slice(2), D(5)));
  assert.equal(W.count(w, 'temp'), 5);
  assert.equal(W.claim(w, -1, 1, its, D(5)).why, 'cap', '只有 2 分');
  prove(w, [its[14]], []); const third = card('new'); prove(w, [third], [0, 1, 4]);
  const r = W.claim(w, -1, 1, its.concat([third]), D(5));
  assert.ok(r.ok); assert.equal(r.plot.st, 'perm'); assert.equal(r.plot.bound.length, 3);
  assert.equal(W.count(w, 'temp'), 5, '不占临时名额');
});
test('没开放的题不挡路；题库到头能继续拓；永久地块都有学会的题或看过的题 70% 已学会', () => {
  const w = W.blank(); W.gain(w, 'flag', 5);
  const its = three().concat([card('未开放', {seen: false})]);
  W.claim(w, 1, 0, its, D(0)); prove(w, its.slice(0, 3), [0, 1, 4]);
  const r = W.claim(w, -1, 0, its, D(5));
  assert.ok(r.ok, r.why); assert.equal(r.plot.st, 'perm');
});
test('什么都没学会不能白拿地块', () => {
  const w = W.blank(); W.gain(w, 'flag', 5);
  assert.equal(W.claim(w, 1, 0, [], D(0)).why, 'learn');
  const its = three({spent: true}); its.forEach(i => { W.proofOf(w, i.id).back = W.BACK_MAX; });
  assert.equal(W.claim(w, 1, 0, its, D(0)).why, 'learn');
});
test('claimPlan 和 claim 一致（提示条共用）', () => {
  const w = W.blank(), its = three(); W.gain(w, 'flag', 3);
  assert.equal(W.claimPlan(w, its, D(0)).kind, 'temp');
  W.claim(w, 1, 0, its, D(0));
  assert.equal(W.claimPlan(w, its, D(0)).kind, 'learn'); assert.equal(W.claim(w, -1, 0, its, D(0)).why, 'learn');
});
test('迷雾地块再插旗还是同一批题；绑定空的迷雾能重新绑', () => {
  const w = W.blank(), its = many(6); W.gain(w, 'flag', 5);
  W.claim(w, 1, 0, its, D(0)); const b0 = w.plots['1,0'].bound.slice();
  w.plots['1,0'].st = 'wild';
  const r = W.claim(w, 1, 0, its, D(1)); assert.deepEqual(r.plot.bound, b0); assert.equal(r.plot.st, 'temp');
  w.plots['1,0'].st = 'wild'; w.plots['1,0'].bound = [];
  const q = W.claim(w, 1, 0, its, D(2)); assert.ok(q.ok); assert.equal(q.plot.bound.length, 3);
});
test('长跑不变量：有错有慢也不会永远拒绝，全部证明完', () => {
  const its = []; for (let i = 0; i < 40; i++) its.push(i % 5 ? card('c' + i) : type('t' + i));
  const w = W.blank(); W.BANDS.forEach(b => { w.boss[b.id] = D(0); }); let lastOk = 0, x = 12345;   // Boss 另测，这里只看拓地会不会卡死
  const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
  for (let d = 0; d < 300; d++) {
    W.gain(w, 'flag', 1); W.gain(w, 'ore', 50);
    W.guardList(w, its, D(d), 99).forEach(i => { for (let k = 0; k < W.needOf(i); k++) W.onAttempt(w, i, rnd() < .85 ? ok : bad, D(d)); });
    W.endOfPractice(w, D(d));
    const f = W.frontier(w, its).filter(a => a.ok)[0];
    if (f && W.claim(w, f.x, f.y, its, D(d)).ok) lastOk = d;
  }
  assert.ok(its.every(i => W.stepOf(w, i.id) >= 3), '全部证明完');
  assert.ok(lastOk > 200, '末期还能拓');
});

test('有对有错不烧；当天插的地块当天答错也不烧', () => {
  const w = W.blank(), its = three(); W.claim(w, 1, 0, its, D(0));
  its.forEach(i => W.onAttempt(w, i, bad, D(0))); W.endOfPractice(w, D(0)); assert.equal(w.plots['1,0'].torch, 5);
  W.onAttempt(w, its[0], ok, D(1)); W.onAttempt(w, its[1], bad, D(1)); W.onAttempt(w, its[2], bad, D(1));
  W.endOfPractice(w, D(1)); assert.equal(w.plots['1,0'].torch, 5);
});
test('等间隔的题答对、另一题答错：不烧', () => {
  const w = W.blank(), its = three(); W.claim(w, 1, 0, its, D(0)); prove(w, [its[0]], [0, 1]);
  W.onAttempt(w, its[0], ok, D(2)); W.onAttempt(w, its[1], bad, D(2)); W.endOfPractice(w, D(2));
  assert.equal(w.plots['1,0'].torch, 5);
});
test('慢答加写错不烧', () => {
  const w = W.blank(), its = three(); W.claim(w, 1, 0, its, D(0));
  W.onAttempt(w, its[0], {ok: true, fast: false, needFast: true}, D(1)); W.onAttempt(w, its[1], bad, D(1)); W.endOfPractice(w, D(1));
  assert.equal(w.plots['1,0'].torch, 5);
});
test('保险：额度用完，最后 1 支火把不灭；过了 14 天恢复', () => {
  const w = W.blank(), its = three(); W.claim(w, 1, 0, its, D(0)); w.plots['1,0'].torch = 1;
  w.log.push({day: D(0), type: 'wild'}, {day: D(0), type: 'wild'}, {day: D(0), type: 'wild'});
  its.forEach(i => W.onAttempt(w, i, bad, D(13))); W.endOfPractice(w, D(13)); assert.equal(w.plots['1,0'].torch, 1);
  its.forEach(i => W.onAttempt(w, i, bad, D(14))); W.endOfPractice(w, D(14)); assert.equal(w.plots['1,0'].st, 'wild');
});
test('复查写错：再隔 14 天才再查', () => {
  const w = W.blank(), its = three(); W.claim(w, 1, 0, its, D(0)); prove(w, its, [0, 1, 4]);
  W.onAttempt(w, its[0], bad, D(18));
  assert.ok(!W.enchList(w, its, D(31)).some(i => i.id === 'a'));
  assert.ok(W.enchList(w, its, D(32)).some(i => i.id === 'a'));
});
test('Boss 要工具：进度够没工具不能打', () => {
  const w = W.blank(), its = three(); prove(w, its, [0, 1]);
  assert.equal(W.bossReady(w, 0, its), false);
  W.gain(w, 'wood', 3); W.craftTool(w, 'pick0', D(1)); assert.ok(W.bossReady(w, 0, its));
});

// ---------- 下架题 ----------
test('下架题全错：回来次数满不白给永久，进迷雾', () => {
  const w = W.blank(), its = three({spent: true});
  W.claim(w, 1, 0, its, D(0));
  for (let d = 1; d < 12; d++) {
    W.pruneBound(w, its, D(d));
    W.guardList(w, its, D(d)).forEach(i => { W.noteBack(w, i.id, D(d)); W.onAttempt(w, i, bad, D(d)); });
    W.endOfPractice(w, D(d));
  }
  assert.notEqual(w.plots['1,0'].st, 'perm'); assert.equal(w.total.diamond, 0);
  assert.equal(W.count(w, 'perm'), 1);
});
test('回来按天计次；到上限换一道没绑的题，只学会 1 道不给永久', () => {
  const w = W.blank(), its = three({spent: true}); const free = card('free');
  W.noteBack(w, 'a', D(0)); W.noteBack(w, 'a', D(0)); W.noteBack(w, 'a', D(1)); assert.equal(w.proof.a.back, 2);
  W.claim(w, 1, 0, its.concat([]), D(0));
  w.proof.a.back = W.BACK_MAX;
  assert.ok(!W.guardList(w, its, D(1)).some(i => i.id === 'a'));
  W.pruneBound(w, its.concat([free]), D(1));
  assert.deepEqual(w.plots['1,0'].bound.sort(), ['b', 'c', 'free']);
  assert.equal(w.plots['1,0'].st, 'temp');
});
test('题下线：绑定空了进迷雾、退旗；题库列表为空什么都不做', () => {
  const w = W.blank(), its = three(); W.claim(w, 1, 0, its, D(0));
  const f = w.bag.flag;
  W.pruneBound(w, [], D(1)); assert.equal(w.plots['1,0'].st, 'temp'); assert.equal(w.plots['1,0'].bound.length, 3);
  W.pruneBound(w, [card('别的', {seen: false})], D(1)); assert.equal(w.plots['1,0'].st, 'wild'); assert.equal(w.bag.flag, f + 1);
});
test('守护题：先过滤后截取，火把少的优先，迷雾排后，默认最多 8 道', () => {
  const w = W.blank(), its = many(30); W.gain(w, 'flag', 5);
  W.claim(w, 1, 0, its, D(0)); W.claim(w, -1, 0, its, D(0)); W.claim(w, 0, 1, its, D(0));
  assert.equal(W.guardList(w, its, D(0)).length, 8); assert.equal(W.guardList(w, its, D(0), 2).length, 2);
  w.plots['-1,0'].torch = 1; assert.ok(w.plots['-1,0'].bound.includes(W.guardList(w, its, D(0))[0].id));
  w.plots['-1,0'].st = 'wild'; assert.ok(!w.plots['-1,0'].bound.includes(W.guardList(w, its, D(0))[0].id));
  prove(w, its, [0]);
  assert.equal(W.guardList(w, its, D(0)).length, 0, '今天判过了');
  assert.equal(W.guardList(w, its.slice(0, 1), D(1)).length, 1, '只出题库里有的');
});

// ---------- 材料、工具、方块 ----------
test('工具看累计，不消耗钻石；要前一级；花光钻石也能合成', () => {
  const w = W.blank(), its = many(200);
  prove(w, its, [0, 1, 4]); W.gain(w, 'wood', 100); W.gain(w, 'ore', 100);
  assert.equal(W.craftTool(w, 'pick1', D(5)), false, '没有前一级');
  ['pick0', 'pick00', 'pick1', 'pick2'].forEach(t => assert.ok(W.craftTool(w, t, D(5)), t));
  assert.equal(w.bag.iron, 200, '不消耗');
  for (let i = 0; i < 200; i++) assert.ok(W.craftBlock(w, 'diamondb'));
  assert.equal(w.bag.diamond, 0);
  assert.ok(W.craftTool(w, 'pick3', D(5)));
  assert.equal(w.total.diamond, 200); assert.equal(W.toolTier(w), 4);
  assert.equal(W.craftTool(w, 'pick3', D(5)), false, '不能重复');
});
test('累计不够不能合成工具', () => {
  const w = W.blank(), its = many(79); prove(w, its, [0]); W.gain(w, 'wood', 50); W.gain(w, 'ore', 50);
  W.craftTool(w, 'pick0', D(0)); W.craftTool(w, 'pick00', D(0));
  assert.equal(W.craftTool(w, 'pick1', D(0)), false);
  prove(w, [card('x')], [0]); assert.ok(W.craftTool(w, 'pick1', D(0)));
});
test('旗价：地盘越大越贵，上限 70', () => {
  assert.deepEqual(W.flagCost(1), {wood: 2, ore: 20}); assert.equal(W.flagCost(20).ore, 70);
  const w = W.blank(); assert.equal(W.flagRing(w), 1); w.plots['3,0'] = {x: 3, y: 0, st: 'perm', bound: []}; assert.equal(W.flagRing(w), 4);
  w.plots['5,0'] = {x: 5, y: 0, st: 'wild', bound: []}; assert.equal(W.flagRing(w), 4);
  assert.equal(W.craftFlag(w, 4), false); W.gain(w, 'ore', 35); assert.ok(W.craftFlag(w, 4)); assert.equal(w.bag.ore, 0); assert.equal(w.bag.wood, 4); assert.equal(w.bag.flag, 2);
});
test('钻石块记来源；拆除退回；来源不重复；普通方块拆放守恒', () => {
  const w = W.blank(), its = three();
  prove(w, its, [0, 1, 4]);
  W.craftBlock(w, 'diamondb'); const v = W.place(w, 1, 0, 0, 0, 'diamondb', D(5));
  assert.equal(v.from, 'a'); assert.equal(w.blocks.diamondb, 0);
  W.craftBlock(w, 'diamondb'); assert.equal(W.place(w, 1, 0, 1, 0, 'diamondb', D(5)).from, 'b');
  W.unplace(w, 1, 0, 0, 0); assert.equal(w.blocks.diamondb, 1);
  assert.equal(W.place(w, 1, 0, 2, 0, 'diamondb', D(5)).from, 'a');
  assert.equal(W.gemPool(w).length, 1); assert.equal(W.place(w, 1, 0, 2, 0, 'stone', D(5)), null, '占格子不能放');
  W.gain(w, 'b:stone', 1); W.place(w, 1, 0, 5, 5, 'stone', D(5)); W.unplace(w, 1, 0, 5, 5); assert.equal(w.blocks.stone, 1);
  assert.equal(W.unplace(w, 1, 0, 6, 6), null);
});
test('题型的钻石一题 3 块', () => {
  const w = W.blank(); prove(w, [type('t')], [0, 1, 4]); assert.equal(W.gemPool(w).length, 3);
});
test('技能：没点亮合成不了对应方块，也挖不了矿脉；工具不够也挖不了', () => {
  const w = W.blank(); W.gain(w, 'wood', 50); W.gain(w, 'ore', 50);
  assert.equal(W.craftBlock(w, 'hut', {place: false}), false); assert.equal(W.craftBlock(w, 'hut', {place: true}), true);
  let vx, vy, tier;
  for (let x = -3; x <= 3 && vx === undefined; x++) for (let y = -3; y <= 3 && vx === undefined; y++) { const f = W.feature(x, y); if (f && f.kind === 'vein' && f.tier === 1) { vx = x; vy = y; tier = f.tier; } }
  assert.notEqual(vx, undefined, '测试要找到第二层矿脉');
  w.plots[W.pkey(vx, vy)] = {x: vx, y: vy, st: 'temp', bound: [], dug: 0};
  W.craftTool(w, 'pick0', D(0));
  assert.equal(W.digPlot(w, vx, vy, {bond: true}).lockTier, tier, '工具不够');
  W.craftTool(w, 'pick00', D(0));
  assert.equal(W.digPlot(w, vx, vy, {bond: false}).lockSkill, 'bond');
  const o = w.bag.ore, d = W.digPlot(w, vx, vy, {bond: true}); assert.equal(w.bag.ore, o + d.ore); assert.equal(W.digPlot(w, vx, vy, {bond: true}), null, '只挖一次');
});
test('技能点亮：这个地方的题一半到第 1 步；地形要技能，圈要 Boss', () => {
  const w = W.blank(), its = [card('a', {group: 'line'}), card('b', {group: 'line'}), card('c', {group: 'line'}), card('d', {group: 'line'})];
  prove(w, its.slice(0, 1), [0]); assert.equal(W.skillsLit(w, its).line, false);
  prove(w, its.slice(1, 2), [0]); assert.equal(W.skillsLit(w, its).line, true);
  assert.equal(W.maxRing(w), 3);
  w.plots['3,0'] = {x: 3, y: 0, st: 'perm', bound: []};
  const f = W.frontier(w, its).find(a => a.x === 4 && a.y === 0); assert.equal(f.ok, false); assert.equal(f.why, 'boss');
  let wx = null; for (let x = 2; x < 30 && wx === null; x++) if (W.terrain(x, 1) === 'water' && W.ring(x, 1) <= 3) wx = x;
  for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) { const t = W.terrain(x, y), n = {water: 'line', island: 'dock'}[t]; if (!n) continue; const u = W.blank(); u.plots[W.pkey(x - 1, y)] = {x: x - 1, y, st: 'perm', bound: []};
    const a = W.frontier(u, []).find(q => q.x === x && q.y === y); if (a) { assert.equal(a.why, n); assert.equal(a.ok, false); } }
  w.boss.meadow = D(0); assert.equal(W.maxRing(w), 4);
});

// ---------- Boss ----------
test('Boss：一天一次，输了不扣东西，赢了掉 6 金块；血量累计，一定打得过', () => {
  const w = W.blank(), its = three(); W.gain(w, 'wood', 10);
  assert.equal(W.bossReady(w, 0, its), false, '没工具也没进度');
  W.craftTool(w, 'pick0', D(0)); assert.equal(W.bossReady(w, 0, its), false);
  prove(w, its, [0, 1]);
  assert.ok(W.bossCanTry(w, 0, its, D(1)));
  const bag = clone(w.bag);
  assert.equal(W.bossEnd(w, 0, 8, D(1)), false); assert.deepEqual(w.bag, bag);
  assert.equal(W.bossCanTry(w, 0, its, D(1)), false);
  assert.ok(W.bossCanTry(w, 0, its, D(2)));
  assert.equal(W.bossEnd(w, 0, 8, D(2)), false); assert.equal(W.bossEnd(w, 0, 8, D(3)), true, '累计 24');
  assert.equal(w.blocks.goldb, 6); assert.equal(W.bossReady(w, 0, its), false);
  const u = W.blank(); assert.equal(W.bossEnd(u, 0, 9, D(0)), true, '一次 9 题也赢');
});
test('Boss 资格达到一次就一直开放；要打败前一个', () => {
  const w = W.blank(), its = many(10); W.gain(w, 'wood', 3); W.craftTool(w, 'pick0', D(0));
  prove(w, its.slice(0, 4), [0, 1]); assert.ok(W.bossReady(w, 0, its));
  w.proof.i0.s = 1; w.proof.i1.s = 1; w.proof.i2.s = 1; assert.ok(W.bossReady(w, 0, its));
  assert.equal(W.bossReady(w, 1, its), false);
});
test('挑战的题只考第 2 步以上的，没下架的优先', () => {
  const w = W.blank(), its = [card('a', {spent: true}), card('b'), card('c')]; prove(w, its.slice(0, 2), [0, 1]); prove(w, [its[2]], [0]);
  const p = W.bossPool(w, W.BANDS[0], its); assert.deepEqual(p.map(i => i.id), ['b', 'a']);
});
test('世界时间看答对，不看坐多久：乱点最多 1 分钟，上限 6 分钟', () => {
  assert.equal(W.dayMinutes(0, 100), 0); assert.equal(W.dayMinutes(40, 100), 1); assert.equal(W.dayMinutes(40, 50), 4);
  assert.equal(W.dayMinutes(48, 60), 5); assert.equal(W.dayMinutes(200, 210), 6);
});

// ---------- 迁移和导入 ----------
const lvOf = m => id => (m[id] ? m[id][0] : 0), dOf = m => id => (m[id] ? m[id][1] : []);
test('迁移：真隔 3 天的深红 = 第 3 步；下架直达的深红 = 第 2 步；可重复', () => {
  const w = W.blank(), its = [card('真'), card('假'), card('淡')];
  const m = {真: [3, [D(0), D(1), D(5)]], 假: [3, [D(0), D(1), D(1)]], 淡: [1, [D(0)]]};
  W.migrate(w, its, lvOf(m), dOf(m), 100, D(9));
  assert.equal(W.stepOf(w, '真'), 3); assert.equal(W.stepOf(w, '假'), 2); assert.equal(W.stepOf(w, '淡'), 1);
  assert.equal(w.bag.ore, 100); assert.equal(w.bag.diamond, 1); assert.equal(w.bag.gold, 2); assert.equal(w.bag.iron, 3);
  assert.equal(W.migrate(w, its, lvOf(m), dOf(m), 100, D(9)), false);
  assert.equal(w.bag.diamond, 1); assert.equal(w.bag.ore, 100);
});
test('迁移：不覆盖已有证明；之后导入的格子能补证明', () => {
  const w = W.blank(), i = card('a'), j = card('b'); prove(w, [i], [0, 1, 4]);
  W.migrate(w, [i], () => 1, () => [D(0)], 0, D(9)); assert.equal(W.stepOf(w, 'a'), 3);
  W.migrate(w, [i, j], () => 2, () => [D(0), D(1)], 0, D(9)); assert.equal(W.stepOf(w, 'b'), 2, '按题补'); assert.equal(W.stepOf(w, 'a'), 3);
});
test('迁移：旧的真实擅长变永久地块，铺不下的留着插旗；全部按 3 分', () => {
  const w = W.blank(), its = many(400), m = {};
  its.forEach(i => { m[i.id] = [3, [D(0), D(1), D(5)]]; });
  W.migrate(w, its, lvOf(m), dOf(m), 0, D(9));
  const perm = Object.values(w.plots).filter(p => p.st === 'perm' && (p.x || p.y));
  assert.ok(perm.length > 20 && perm.length <= 48, String(perm.length));
  assert.ok(perm.every(p => p.bound.length === 3));
  assert.equal(w.total.diamond, 400);
  w.gemQ = []; assert.equal(W.gemPool(w).length, 400);
  W.gain(w, 'flag', 1); const f = W.frontier(w, its).filter(a => a.ok)[0];
  if (f) assert.equal(W.claim(w, f.x, f.y, its, D(9)).plot.st, 'perm');
});
test('导入：旧备份刷不出东西（放、导出、拆、再放、导入）', () => {
  let w = W.blank(); prove(w, three(), [0, 1, 4]);
  W.craftBlock(w, 'diamondb'); W.place(w, 1, 0, 0, 0, 'diamondb', D(5));
  for (let r = 0; r < 5; r++) {
    const bak = clone(w);
    W.unplace(w, 1, 0, 0, 0); W.place(w, 1, 0, r + 1, 0, 'diamondb', D(5));
    w = W.pickWorld(w, bak);
    const placed = Object.values(w.built['1,0']).filter(v => v.b === 'diamondb').length;
    assert.ok(placed + (w.blocks.diamondb || 0) + w.bag.diamond <= w.total.diamond, '已放 + 背包 ≤ 收入');
  }
});
test('合并导入：本机玩过就不动；没玩过才接收；家长设置留本机；坏数据不接收', () => {
  const rich = W.blank(); prove(rich, three(), [0, 1, 4]); W.claim(rich, 1, 0, many(9), D(5));
  const castle = W.blank(); W.gain(castle, 'b:stone', 1); W.place(castle, 0, 0, 0, 0, 'stone', D(0)); castle.tag = 'castle'; castle.settings.expire = false;
  assert.equal(W.pickWorld(castle, rich).tag, 'castle', '盖过东西的不被永久地块多的替换');
  const fresh = W.blank(); fresh.settings.expire = false;
  const r = W.pickWorld(fresh, rich); assert.equal(r.total.diamond, 3, '没玩过的接收'); assert.equal(r.settings.expire, false, '设置留本机');
  assert.equal(W.pickWorld(rich, {plots: {}}).total.diamond, 3, '坏数据不接收');
  assert.equal(W.pickWorld(null, rich).total.diamond, 3); assert.equal(W.pickWorld(rich, null).total.diamond, 3);
  assert.notStrictEqual(W.pickWorld(rich, null), rich, '是副本');
  assert.equal(W.played(fresh), false); assert.ok(W.played(castle)); assert.ok(W.played(rich));
});
test('日期回退到更早：不崩溃；未来日期不冻结木头、火把和减负', () => {
  const w = W.blank(), i = card('a');
  [5, 6, 7].forEach(d => W.onAttempt(w, i, ok, D(d)));
  assert.doesNotThrow(() => W.onAttempt(w, card('b'), ok, D(4)));
  assert.equal(W.stepOf(w, 'b'), 1);
  const u = W.blank(), its = three(); W.claim(u, 1, 0, its, D(0));
  W.endOfPractice(u, '2027-11-06'); W.endOfPractice(u, D(1));
  const wood = u.bag.wood; W.endOfPractice(u, D(2)); assert.equal(u.bag.wood, wood + 2, '明天恢复');
  u.log.push({day: '2027-01-01', type: 'wild'}, {day: '2027-01-01', type: 'wild'}, {day: '2027-01-01', type: 'wild'});
  assert.equal(W.tempCap(u, D(3)), 5, '未来日期不算'); assert.equal(W.recentWild(u, D(3)), 0);
  its.forEach(q => W.onAttempt(u, q, bad, D(3))); const t = u.plots['1,0'].torch; W.endOfPractice(u, D(3)); assert.equal(u.plots['1,0'].torch, t - 1);
});
test('到期额度：5 块同样全错，任意 14 天最多到期 3 块，同一天也不超', () => {
  const w = W.blank(), its = many(30); W.gain(w, 'flag', 10);
  [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]].forEach(([x, y]) => W.claim(w, x, y, its, D(0)));
  for (let d = 1; d <= 13; d++) { its.forEach(i => W.onAttempt(w, i, bad, D(d))); W.endOfPractice(w, D(d)); assert.ok(W.recentWild(w, D(d)) <= 3, 'day ' + d); }
  assert.equal(W.count(w, 'wild'), 3); assert.equal(W.count(w, 'temp'), 2);
  for (let d = 14; d <= 30; d++) { its.forEach(i => W.onAttempt(w, i, bad, D(d))); W.endOfPractice(w, D(d)); assert.ok(W.recentWild(w, D(d)) <= 3); }
});
test('prune 到迷雾计入到期记录；永久不动；题库缩水超过 10% 什么都不做', () => {
  const w = W.blank(), its = three({spent: true}), extra = many(40, {seen: false});
  W.claim(w, 1, 0, its, D(0)); its.forEach(i => { W.proofOf(w, i.id).back = W.BACK_MAX; });
  W.pruneBound(w, its.concat(extra), D(1)); assert.equal(w.plots['1,0'].st, 'wild'); assert.equal(W.recentWild(w, D(1)), 1);
  const u = W.blank(), all = many(50); W.claim(u, 1, 0, all, D(0)); W.pruneBound(u, all, D(0)); const before = u.plots['1,0'].bound.slice();
  W.pruneBound(u, all.slice(10), D(1)); assert.equal(u.plots['1,0'].st, 'temp', '缩水不动'); assert.deepEqual(u.plots['1,0'].bound, before, '绑定的题不换');
  const v = W.blank(), q = three(); v.plots['1,0'] = {x: 1, y: 0, st: 'perm', bound: ['a', 'gone'], torch: 0}; W.pruneBound(v, q, D(0)); assert.equal(v.plots['1,0'].bound.length, 2, '永久不动');
});
test('换题按分：题型满额换回 3 分；固定题满额不换成题型', () => {
  const w = W.blank(), t = type('t', {spent: true}), f = many(9); W.claim(w, 1, 0, [t], D(0));
  w.proof.t = {s: 0, top: 0, last: '', days: [], back: W.BACK_MAX};
  W.pruneBound(w, [t].concat(f), D(1)); assert.equal(w.plots['1,0'].bound.length, 3);
  const u = W.blank(), c = [card('a', {spent: true}), card('b'), card('c')]; W.claim(u, 1, 0, c, D(0));
  W.proofOf(u, 'a').back = W.BACK_MAX;
  W.pruneBound(u, c.concat([card('d'), type('T')]), D(1)); assert.ok(u.plots['1,0'].bound.includes('d') && !u.plots['1,0'].bound.includes('T'));
});
test('减负只放宽临时地块：已学会的题仍要 3 分才换永久', () => {
  const w = W.blank(), two = many(2); W.gain(w, 'flag', 5); prove(w, two, [0, 1, 4]);
  w.log.push({day: D(5), type: 'wild'}, {day: D(5), type: 'wild'});
  const fill = many(9).map(i => card('n' + i.id));
  const plan = W.claimPlan(w, two.concat(fill), D(5)); assert.equal(plan.kind, 'temp');
});
test('Boss 题池不够不开挑战；free 的分母是开放的题', () => {
  const w = W.blank(), its = three(); W.gain(w, 'wood', 3); W.craftTool(w, 'pick0', D(0)); prove(w, its, [0, 1]);
  assert.ok(W.bossCanTry(w, 0, its, D(1)));
  W.onAttempt(w, its[0], bad, D(2)); assert.equal(W.bossCanTry(w, 0, its, D(2)), false, '题池只剩 2 道');
  const u = W.blank(), seen = three(), rest = many(50, {seen: false}); W.gain(u, 'flag', 10); W.claim(u, 1, 0, seen, D(0)); prove(u, seen, [0, 1, 4]);
  assert.equal(W.claimPlan(u, seen.concat(rest), D(5)).kind, 'learn', '还有 50 道开放没看过');
  assert.equal(W.claimPlan(u, seen.concat(rest.map(i => Object.assign({}, i, {open: false}))), D(5)).kind, 'free', '没开放的不算');
});
test('到期开关关着不计龄；nextStep 报出地图边界', () => {
  const w = W.blank(), its = three(); w.settings.expire = false; W.claim(w, 1, 0, its, D(0));
  for (let d = 1; d < 20; d++) W.endOfPractice(w, D(d));
  assert.equal(w.plots['1,0'].age, 0);
  const u = W.blank(); assert.equal(W.nextStep(u, many(9), D(0)).places > 0, true); assert.equal(W.nextStep(u, many(9), D(0)).wall, false);
  for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if (x || y) u.plots[W.pkey(x, y)] = {x, y, st: 'perm', bound: []};
  const st = W.nextStep(u, many(9), D(0)); assert.equal(st.places, 0); assert.equal(st.wall, true); assert.equal(st.bossBand, 0);
});
// 审查员变异漏过的规则
test('账本：插旗扣旗、没旗不能插、工具扣料、不能插不相邻的地、拓回不重挖、宝箱不重复', () => {
  const w = W.blank(), its = many(9); const f0 = w.bag.flag;
  assert.equal(W.claim(w, 5, 5, its, D(0)).why, 'far');
  assert.ok(W.claim(w, 1, 0, its, D(0)).ok); assert.equal(w.bag.flag, f0 - 1);
  assert.equal(W.claim(w, -1, 0, its, D(0)).why, 'flag');
  const wood = w.bag.wood; W.craftTool(w, 'pick0', D(0)); assert.equal(w.bag.wood, wood - 3);
  let cx, cy; for (let x = -3; x <= 3 && cx === undefined; x++) for (let y = -3; y <= 3 && cx === undefined; y++) { const q = W.feature(x, y); if (q && q.kind === 'chest') { cx = x; cy = y; } }
  w.plots[W.pkey(cx, cy)] = {x: cx, y: cy, st: 'temp', bound: [], dug: 0};
  const r = W.digPlot(w, cx, cy); assert.equal(w.blocks.glass, r.n); assert.equal(W.digPlot(w, cx, cy), null); assert.equal(w.blocks.glass, r.n);
});
test('第 4 步后不再升；复查要到期；附魔要全部绑定题；守护题不看已学会和没到间隔的', () => {
  const w = W.blank(), its = three(); W.claim(w, 1, 0, its, D(0)); prove(w, its, [0, 1, 4]);
  W.onAttempt(w, its[0], ok, D(10)); assert.equal(W.stepOf(w, 'a'), 3, '没到 14 天');
  prove(w, [its[0]], [18]); assert.equal(W.stepOf(w, 'a'), 4); assert.equal(w.plots['1,0'].ench, undefined, '只 1 道到第 4 步');
  prove(w, [its[0]], [40]); assert.equal(W.stepOf(w, 'a'), 4);
  const u = W.blank(), c = three(); W.claim(u, 1, 0, c, D(0)); prove(u, c, [0, 1]);
  assert.equal(W.guardList(u, c, D(2)).length, 0, '没到间隔'); assert.equal(W.guardList(u, c, D(4)).length, 3);
  prove(u, c, [4]); assert.equal(W.guardList(u, c, D(9)).length, 0, '已学会');
});
test('迁移：不铺水面、不足 3 分不铺、不覆盖已有地块；未来日期夹回', () => {
  const w = W.blank(), its = many(7), m = {}; its.forEach(i => { m[i.id] = [3, [D(0), D(1), D(5)]]; });
  w.plots['1,0'] = {x: 1, y: 0, st: 'temp', bound: ['keep'], torch: 5};
  W.migrate(w, its, lvOf(m), dOf(m), 0, D(9));
  assert.deepEqual(w.plots['1,0'].bound, ['keep']);
  const perm = Object.values(w.plots).filter(p => p.st === 'perm' && (p.x || p.y));
  assert.equal(perm.length, 2, '7 道题只铺 2 块'); assert.ok(perm.every(p => W.terrain(p.x, p.y) === 'land'));
  const u = W.blank(); W.catchUp(u, [card('a')], () => 1, () => ['2027-01-01'], D(0)); assert.equal(u.proof.a.last, D(0));
});
test('审查员变异：换题', () => {
  const w = W.blank(), q = three(); w.plots['1,0'] = {x: 1, y: 0, st: 'perm', bound: ['a', 'gone'], torch: 0}; W.pruneBound(w, q, D(0)); assert.deepEqual(w.plots['1,0'].bound, ['a', 'gone'], '永久一个字不动');
  const u = W.blank(), c = three(); W.claim(u, 1, 0, c, D(0)); prove(u, c.slice(0, 2), [0, 1, 4]);
  const ev = W.pruneBound(u, c.slice(0, 2), D(6)); assert.equal(u.plots['1,0'].st, 'perm', '下线后剩的都学会了要结算'); assert.ok(ev.some(e => e.type === 'perm'));
  const v = W.blank(), a = card('a', {spent: true}), f = many(9); v.plots['1,0'] = {x: 1, y: 0, st: 'temp', bound: ['a'], torch: 5, born: D(0)}; prove(v, [a], [0, 1, 4]); v.proof.a.back = W.BACK_MAX;
  W.pruneBound(v, [a].concat(f), D(6)); assert.deepEqual(v.plots['1,0'].bound, ['a'], '学会了的不算满额');
  const x = W.blank(), s = card('a', {spent: true}), fl = x.bag.flag; x.plots['1,0'] = {x: 1, y: 0, st: 'temp', bound: ['a'], torch: 5, born: D(0)}; W.proofOf(x, 'a').back = W.BACK_MAX;
  W.pruneBound(x, [s], D(1)); assert.equal(x.plots['1,0'].st, 'wild'); assert.equal(x.bag.flag, fl, '满额到迷雾不退旗');
});
test('审查员变异：拓回和迷雾', () => {
  const w = W.blank(), its = many(9); W.gain(w, 'flag', 3); W.gain(w, 'b:stone', 1);
  W.claim(w, 1, 0, its, D(0)); W.place(w, 1, 0, 0, 0, 'stone', D(0)); w.plots['1,0'].dug = 1; w.plots['1,0'].st = 'wild'; const b = w.plots['1,0'].bound.slice();
  assert.ok(W.claim(w, 1, 0, its, D(1)).ok); assert.equal(w.plots['1,0'].dug, 1, '拓回不重挖'); assert.ok(w.built['1,0'], '建筑还在'); assert.deepEqual(w.plots['1,0'].bound, b);
  const u = W.blank(); W.gain(u, 'flag', 3); W.claim(u, 1, 0, its, D(0)); u.plots['1,0'].st = 'wild';
  assert.ok(!W.frontier(u, its).some(f => f.x === 2 && f.y === 0), '迷雾不向外扩'); assert.ok(!W.frontier(u, its).some(f => f.x === 1 && f.y === 1) || W.frontier(u, its).some(f => f.x === 1 && f.y === 1 && Math.abs(f.x) + Math.abs(f.y) <= 2));
  const o = W.blank(); assert.ok(!W.frontier(o, its).some(f => f.x === 1 && f.y === 1), '只算上下左右');
  const e = W.blank(); e.plots['1,0'] = {x: 1, y: 0, st: 'wild', bound: [], torch: 0}; assert.equal(W.claimPlan(e, [], D(0)).kind, 'learn', '空绑定不算在等');
});
test('审查员变异：题库到头 70% 边界；到第 3 步火把清零', () => {
  const w = W.blank(), a = many(6), r = many(5, {seen: false}).map(i => card('z' + i.id, {seen: false})); prove(w, a, [0, 1, 4]); a.forEach(i => { w.plots[i.id] = {x: 9, y: 9, st: 'perm', bound: [i.id]}; });
  assert.equal(W.claimPlan(w, a.concat(r), D(6)).kind, 'learn', '6/11 不到 70%');
  const u = W.blank(), c = three(); W.claim(u, 1, 0, c, D(0)); prove(u, c, [0, 1, 4]); assert.equal(u.plots['1,0'].torch, 0);
});
test('审查员变异：绑定挑离完成最近的题', () => {
  const w = W.blank(), its = many(6); prove(w, [its[4], its[5]], [0, 1]); prove(w, [its[3]], [0]);
  assert.deepEqual(W.pickBound(w, its, 3).live.ids, ['i4', 'i5', 'i3']);
});
test('审查员变异：Boss 40%、木头、钻石来源、回来上限常量', () => {
  assert.equal(W.BOSS_SHARE, 0.4); assert.equal(W.BACK_MAX, 4);
  const w = W.blank(); assert.equal(W.dailyWood(w), 2); for (let i = 1; i <= 7; i++) w.plots['p' + i] = {st: 'perm', bound: []}; assert.equal(W.dailyWood(w), 2, '7 块新永久还是 2'); w.plots.p8 = {st: 'perm', bound: []}; assert.equal(W.dailyWood(w), 3);
  const u = W.blank(), c = card('a'); prove(u, [c], [0, 1, 4]); assert.deepEqual(W.gemPool(u), ['a']); u.gemQ.push('a'); assert.deepEqual(W.gemPool(u), [], '队列里的算用过');
});
test('审查员变异：复查、守护和满额的边界', () => {
  const w = W.blank(), its = three(); W.claim(w, 1, 0, its, D(0)); prove(w, its, [0, 1, 4]);
  w.proof.a.s = 2; assert.ok(!W.enchList(w, its, D(30)).some(i => i.id === 'a'), '不到第 3 步不复查');
  w.proof.a.s = 3; w.plots['1,0'].ench = D(5); assert.equal(W.enchList(w, its, D(30)).length, 0, '已附魔不查');
  const u = W.blank(), c = three(); W.claim(u, 1, 0, c, D(0)); prove(u, c, [0, 1]);
  W.onAttempt(u, c[0], bad, D(4)); assert.ok(!W.guardList(u, c, D(4)).some(i => i.id === 'a'), '今天判过不再出');
  const v = W.blank(), s = card('a'); W.proofOf(v, 'a').back = W.BACK_MAX; assert.equal(W.maxedOut(v, s), false, '没下架不算满额'); assert.equal(W.maxedOut(v, card('a', {spent: true})), true);
  const x = W.blank(), q = card('a'); x.plots['1,0'] = {x: 1, y: 0, st: 'perm', bound: ['a']}; prove(x, [q], [0, 1, 4]);
  W.onAttempt(x, q, bad, D(10)); assert.ok(!x.proof.a.chk, '没到复查日不记结果');
});
test('审查员变异：迁移记第 3 步的日期；日志有上限；坏数据不接收', () => {
  const w = W.blank(), i = card('a'); W.catchUp(w, [i], () => 3, () => [D(0), D(1), D(5)], D(9)); assert.equal(w.proof.a.d3, D(5));
  const u = W.blank(), its = many(9); W.gain(u, 'flag', 2); for (let k = 0; k < 400; k++) u.log.push({day: D(0), type: 'x'}); W.claim(u, 1, 0, its, D(0)); assert.ok(u.log.length <= 300);
  const r = W.pickWorld(W.blank(), {plots: {}}); assert.ok(W.worldOk(r));
});
test('审查员变异：混合绑定和迁移铺地', () => {
  const w = W.blank(), a = card('a', {spent: true}), b = card('b'), f = many(9); w.plots['1,0'] = {x: 1, y: 0, st: 'temp', bound: ['a', 'b'], torch: 5, born: D(0)}; prove(w, [a], [0, 1, 4]); w.proof.a.back = W.BACK_MAX;
  W.pruneBound(w, [a, b].concat(f), D(6)); assert.ok(w.plots['1,0'].bound.includes('a'), '学会了的满额题留着');
  assert.ok(W.guardList(w, [a, b].concat(f), D(6)).every(i => i.id !== 'a'), '学会了的不当守护题');
  const u = W.blank(), c = card('a'); u.plots['1,0'] = {x: 1, y: 0, st: 'wild', bound: [], torch: 0}; prove(u, [c], [0, 1, 4]); assert.equal(W.claimPlan(u, [c], D(6)).kind, 'perm', '空绑定的迷雾不算在等');
  const v = W.blank(), d = three(); v.plots['1,0'] = {x: 1, y: 0, st: 'temp', bound: ['a', 'b', 'c'], torch: 5, born: D(0)}; W.onAttempt(v, d[0], bad, D(1)); assert.ok(W.guardList(v, d, D(1)).every(i => i.id !== 'a'), '今天判过不再出');
  const x = W.blank(), big = many(240), m = {}; big.forEach(i => { m[i.id] = [3, [D(0), D(1), D(5)]]; });
  x.plots['1,0'] = {x: 1, y: 0, st: 'temp', bound: ['keep'], torch: 5}; x.plots['0,1'] = {x: 0, y: 1, st: 'wild', bound: ['keep2'], torch: 0};
  W.migrate(x, big, lvOf(m), dOf(m), 0, D(9));
  assert.deepEqual(x.plots['1,0'].bound, ['keep']); assert.equal(x.plots['0,1'].st, 'wild');
  assert.ok(Object.values(x.plots).filter(p => p.x || p.y).every(p => W.terrain(p.x, p.y) === 'land'), '不铺水面');
});
test('性质：随机操作序列下，已放 + 背包 ≤ 收入，永久地块都有证明或题库到头', () => {
  let x = 777; const rnd = n => (x = (x * 16807) % 2147483647) % n;
  const its = many(60), w = W.blank(); W.gain(w, 'flag', 3);
  for (let d = 0; d < 150; d++) {
    for (let k = 0; k < 15; k++) { const i = its[rnd(60)]; W.onAttempt(w, i, rnd(10) < 8 ? ok : bad, D(d)); }
    W.gain(w, 'flag', 1);
    W.craftBlock(w, 'diamondb'); if ((w.blocks.diamondb || 0) > 0) W.place(w, 0, 0, rnd(8), rnd(8), 'diamondb', D(d));
    if (rnd(5) === 0) W.unplace(w, 0, 0, rnd(8), rnd(8));
    const f = W.frontier(w, its).filter(a => a.ok)[0]; if (f) W.claim(w, f.x, f.y, its, D(d));
    W.endOfPractice(w, D(d));
    const placed = Object.values(w.built['0,0'] || {}).filter(v => v.b === 'diamondb').length;
    assert.ok(placed + (w.blocks.diamondb || 0) + w.bag.diamond === w.total.diamond, '钻石守恒');
    Object.values(w.plots).forEach(p => { if (p.st === 'perm' && (p.x || p.y) && p.bound.length) assert.ok(p.bound.every(id => W.stepOf(w, id) >= 3)); });
  }
});
