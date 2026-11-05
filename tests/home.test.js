// 空空的家：奖励只由进度算出、只增不减、旧存档不丢（说明书-v5-家 §6）
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), H = require('../v2/home.js');
const D = n => C.addDays('2026-11-01', n);
const lit = (S, sid, lv) => K.BY[sid].items.forEach(i => { const p = E.prog(S, i.id); p.lv = lv; p.d = [D(-9), D(-5), D(-1)].slice(0, lv); });
const ids = list => list.map(x => x.id);

test('没有 home 的旧存档：不报错，已达成的进战利品箱，格子颜色不变', () => {
  const S = C.blank(); S.placedAt = 1; lit(S, 'look1', 3); const before = JSON.stringify(S.skills);
  const news = H.sync(S, D(0));
  assert.ok(ids(news).includes('m:look1:1') && ids(news).includes('m:look1:3'));
  assert.deepEqual(S.home.loot, ids(news));
  assert.equal(S.home.got['m:look1:3'], D(0));
  assert.equal(JSON.stringify(S.skills), before);
});
test('再次 sync 不重复发；新达成的才进箱', () => {
  const S = C.blank(); lit(S, 'look1', 1); H.sync(S, D(0)); S.home.loot = [];
  assert.equal(H.sync(S, D(0)).length, 0);
  lit(S, 'look3', 1);
  assert.deepEqual(ids(H.sync(S, D(1))), ['m:look3:1']);
});
test('只增不减：统计被裁、错题被删、格子清零后，得到过的还在', () => {
  const S = C.blank(); S.stats = {}; for (let i = 0; i < 8; i++) S.stats[D(i)] = {sec: 700, n: 5, ups: 0, over: 0, gap: 0};
  H.sync(S, D(8)); const had = ids(H.earned(S).certs); assert.ok(had.includes('c:day:7'));
  S.stats = {}; H.sync(S, D(9));
  assert.deepEqual(ids(H.earned(S).certs), had);
});
test('累计天数同时认 v1 的 log（只用过 v1 的孩子也补发）', () => {
  const S = C.blank(); for (let i = 0; i < 7; i++) S.log[D(i)] = {ups: [], n: 12};
  H.sync(S, D(7)); assert.ok(ids(H.earned(S).certs).includes('c:day:7'));
});
test('同一天 stats 和 log 都有只算 1 天', () => {
  const S = C.blank(); S.log[D(0)] = {ups: [], n: 30}; S.stats = {[D(0)]: {sec: 400, n: 30}};
  assert.equal(H.stats(S).days, 1);
});
test('防刷：理解题没练满 5 分钟、秒答没满 10 题，都不算一天', () => {
  const S = C.blank(); S.stats = {}; for (let i = 0; i < 30; i++) S.stats[D(i)] = {sec: 8, n: 1}; S.log[D(0)] = {ups: [], n: 9};
  assert.equal(H.stats(S).days, 0);
  S.stats[D(1)] = {sec: 300, n: 30}; assert.equal(H.stats(S).days, 1);
  const V = C.blank(); V.log[D(0)] = {ups: [], n: 9}; assert.equal(H.stats(V).days, 0);
});
test('附魔奖状只看全部深红；淡红不算', () => {
  const S = C.blank(); K.understand.filter(s => s.group === 'look').forEach(s => lit(S, s.id, 2)); H.sync(S, D(0));
  const c = ids(H.earned(S).certs); assert.ok(c.includes('c:look:1')); assert.ok(!c.includes('c:look:3'));
  K.understand.filter(s => s.group === 'look').forEach(s => lit(S, s.id, 3)); H.sync(S, D(1));
  assert.ok(ids(H.earned(S).certs).includes('c:look:3'));
});
test('每张奖状都有称号、画面、说明；编号不重复；全部能拿到', () => {
  const S = C.blank(); K.SKILLS.forEach(s => lit(S, s.id, 3));
  S.stats = {}; for (let i = 0; i < 200; i++) S.stats[D(-i)] = {sec: 700, n: 5};
  S.mistakes = {}; for (let i = 0; i < 60; i++) S.mistakes['x' + i] = {key: 'x' + i, uid: 'x', due: null, passes: 5};
  H.sync(S, D(0)); const e = H.earned(S), t = e.t;
  assert.equal(e.certs.length, H.CERTS.length); assert.equal(e.items.length, H.ITEMS.length); assert.equal(e.medals.length, H.MEDALS.length);
  H.CERTS.forEach(c => { assert.ok(c.title && c.scene && c.text && c.say(t), c.id); });
  const all = ids(H.CERTS.concat(H.ITEMS, H.MEDALS)); assert.equal(new Set(all).size, all.length);
});
test('每个技能有自己的伙伴，互不重复（新增技能要补伙伴）', () => {
  const idx = K.SKILLS.map(s => H.creatureOf(s.id));
  idx.forEach((v, i) => assert.ok(Number.isInteger(v) && v >= 0, K.SKILLS[i].id));
  assert.equal(new Set(idx).size, K.SKILLS.length);
});
test('下一个目标：不含已得到的和隐藏的，最多 3 个', () => {
  const S = C.blank(); lit(S, 'look1', 1); H.sync(S, D(0));
  const n = H.next(S); assert.ok(n.length <= 3 && n.length > 0);
  n.forEach(x => { assert.ok(!S.home.got[x.r.id]); assert.ok(!x.r.hidden); });
});
test('矿石累计；负数和非数字不算', () => {
  const S = C.blank(); H.addOre(S, 5); H.addOre(S, -3); H.addOre(S, NaN); H.addOre(S, 2);
  assert.equal(S.home.ore, 7);
});
test('备份：导出再整份导入 home 不变', () => {
  const S = C.blank(); lit(S, 'look1', 1); H.sync(S, D(0)); H.addOre(S, 9); S.home.pets = ['look1'];
  const T = C.importText(C.exportText(S)); assert.deepEqual(T.home, S.home);
});
test('备份合并：got 取并集且日期取早、矿石取大、已开过的不再进箱', () => {
  const A = C.blank(), B = C.blank();
  A.home = {ore: 3, got: {a: D(5), b: D(1)}, loot: [], place: {torch: 'W1'}, pets: ['look1'], sec: 1, go: 0};
  B.home = {ore: 9, got: {a: D(2), c: D(3)}, loot: ['a', 'c'], place: {torch: 'W9'}, pets: null, sec: 5, go: 2};
  const M = C.importMerge(A, C.exportText(B));
  assert.deepEqual(M.home.got, {a: D(2), b: D(1), c: D(3)});
  assert.equal(M.home.ore, 9); assert.deepEqual(M.home.loot, ['c']);
  assert.equal(M.home.place.torch, 'W1'); assert.deepEqual(M.home.pets, ['look1']);
});
test('备份合并：两边都没有 home 不会凭空多字段；一边有就保留', () => {
  const M = C.importMerge(C.blank(), C.exportText(C.blank())); assert.equal(M.home, undefined);
  const B = C.blank(); B.home = {ore: 1, got: {x: D(0)}, loot: ['x']};
  assert.equal(C.importMerge(C.blank(), C.exportText(B)).home.ore, 1);
});
test('真实排课跑 30 天：奖励数只增不减，到第 7 天已有奖状', () => {
  const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const S = C.blank(); S.placedAt = 1; let last = 0;
  for (let d = 0; d < 30; d++) {
    const s = E.session(S, D(d), {rnd: seeded(d + 1)});
    for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') s.answer({ok: true, fast: true, secs: 6});
    H.sync(S, D(d)); const n = Object.keys(S.home.got).length; assert.ok(n >= last); last = n;
    if (d === 6) assert.ok(H.earned(S).certs.length >= 2);
  }
});
test('学得好的孩子不吃亏：今天的题全做完了，不满 5 分钟也算一天；中途退出不算', () => {
  const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const S = C.blank(); S.placedAt = 1; S.demoSeen = Object.fromEntries(K.SKILLS.map(s => [s.id, true]));
  K.SKILLS.forEach(s => s.items.forEach(i => Object.assign(E.prog(S, i.id), {lv: 3, d: [D(-60), D(-55), D(-50)], seen: 9, lastDay: D(0)})));
  const s = E.session(S, D(0), {rnd: seeded(5)});
  for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') s.answer({ok: true, fast: true, secs: 6});
  assert.ok(S.daily.done); assert.ok((S.stats || {})[D(0)] === undefined || S.stats[D(0)].sec < 300);
  assert.equal(H.stats(S).days, 1);
  const Q = C.blank(); Q.placedAt = 1; const q = E.session(Q, D(0), {rnd: seeded(6)});
  let x = q.next(); if (x.kind !== 'q') x = q.next(); q.answer({ok: true, fast: true, secs: 6});
  assert.equal(H.stats(Q).days, 0);
});

test('审查：进一次家（只记 home 秒数）或练 1 分钟理解题，不影响当天秒答满 10 题算一天', () => {
  const S = C.blank(); S.log[D(0)] = {ups: [], n: 30}; E.stat(S, D(0)).home = 5; S.stats[D(0)].sec = 60;
  assert.equal(H.stats(S).days, 1);
});
