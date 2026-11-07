// 级别只升不降（docs/说明书-到四年级第二批.md §6）：S.lvMax、迁移、导入、清空
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js');
const D = n => C.addDays('2026-11-01', n);
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const ALL = K.SKILLS.concat(K.HARD);
const blank = () => { const S = C.blank(); S.placedAt = 1; S.demoSeen = Object.fromEntries(ALL.map(s => [s.id, true])); return S; };
const setLv = (S, it, lv) => Object.assign(E.prog(S, it.id), {lv, d: [D(-9), D(-8), D(-5)].slice(0, lv), seen: 3, lastDay: D(-1)});
const fill = (S, lv, keep) => ALL.forEach(s => s.items.forEach(it => { if (!keep || keep(s, it)) setLv(S, it, lv); }));

test('冻结格子：引入 lvMax 时已有的格子数不变（之后加的技能必须标 late）', () => {
  assert.equal(ALL.filter(s => !s.late).flatMap(s => s.items).length, 340);
});

test('迁移：lvTop=9、只看格子能到 15 级的旧存档，升级后仍是第 9 级，不能变 15', () => {
  const S = blank(); fill(S, 3); S.lvTop = 9; S.lvTopDay = D(0); delete S.lvMax;
  assert.equal(E.autoLevel(S), 9, '第一次练习前');
  E.session(S, D(1), {rnd: seeded(1)});
  assert.equal(S.lvMax, 9); assert.equal(E.autoLevel(S), 9);
});

test('迁移只算一次；第 9 级以下的孩子也写 lvMax', () => {
  const S = blank(); fill(S, 1, s => K.itemLevels(s.items[0].id)[0] <= 3);
  E.session(S, D(0), {rnd: seeded(1)});
  const L = S.lvMax; assert.ok(L >= 2 && L <= 9, '写了 ' + L);
  S.lvMax = 7; E.session(S, D(1), {rnd: seeded(1)}); assert.ok(S.lvMax >= 7, '不会重新迁移');
});

test('级别不降：现算的级别掉下去，用 lvMax 兜住；手选不受影响', () => {
  const S = blank(); fill(S, 1, s => K.itemLevels(s.items[0].id)[0] <= 8);
  E.session(S, D(0), {rnd: seeded(1)}); const L = E.autoLevel(S); assert.equal(S.lvMax, L);
  // 模拟新题上线：把低一级的格子全打回灰（现算级别会掉）
  ALL.forEach(s => s.items.forEach(it => { if (K.itemLevels(it.id)[0] === L - 2) setLv(S, it, 0); }));
  assert.equal(E.autoLevel(S), L, '不掉级'); E.session(S, D(1), {rnd: seeded(1)}); assert.equal(S.lvMax, L);
  S.settings = {levels: [3], levelsV: 2}; assert.equal(E.levelOn(S, K.make('cmp:t:20', seeded(1))), true);
});

test('导入备份：lvMax 取大；两边都没有就不写，等下次练习迁移', () => {
  const a = blank(), b = blank(); a.lvMax = 6; b.lvMax = 8;
  assert.equal(C.importMerge(a, JSON.stringify(b)).lvMax, 8);
  assert.equal(C.importMerge(b, JSON.stringify(a)).lvMax, 8);
  const c = blank(), d = blank(); delete c.lvMax; delete d.lvMax;
  assert.equal(C.importMerge(c, JSON.stringify(d)).lvMax, undefined);
});

test('整份替换成没有 lvMax 的旧备份：下次练习开始时迁移', () => {
  const old = blank(); fill(old, 3); old.lvTop = 9; old.lvTopDay = D(0); delete old.lvMax;
  const S = C.upgrade(JSON.parse(JSON.stringify(old)));
  assert.equal(S.lvMax, undefined); E.session(S, D(1), {rnd: seeded(1)}); assert.equal(S.lvMax, 9);
});

test('清空进度：lvMax 一起清掉', () => {
  const S = blank(); S.lvMax = 8; assert.equal(C.resetProgress(S).lvMax, undefined);
});

test('导入一份进度更少、没有 lvMax 的备份后，下次练习不掉级（代码审查 R1 第 1 条）', () => {
  const a = blank(); fill(a, 1, s => K.itemLevels(s.items[0].id)[0] <= 8); delete a.lvMax;
  const L = E.autoLevel(a); assert.ok(L >= 9, '原来 ' + L);
  const b = blank(); b.lvMax = 3;
  const M = C.importMerge(a, JSON.stringify(b)); E.session(M, D(0), {rnd: seeded(1)});
  assert.ok(E.autoLevel(M) >= L, `导入后 ${E.autoLevel(M)}，原来 ${L}`);
});

test('lvMax 是坏值（存档损坏）：当没有，照常按冻结格子算，题照样出得来', () => {
  const S = blank(); fill(S, 1, s => K.itemLevels(s.items[0].id)[0] <= 5); S.lvMax = NaN;
  assert.ok(E.autoLevel(S) >= 5); const s = E.session(S, D(0), {rnd: seeded(1)}); assert.ok(Number.isFinite(S.lvMax)); assert.ok(s.next());
});
