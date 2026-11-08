// 导出进度带上碎片、宝石、伙伴罐（捣蛋鬼第 1 轮第 11 条，中控 11-08 确认方案）
// 备份文字 = 原来的进度 JSON + 顶层 gems 字段；导入时先拿掉 gems，进度照原流程；碎片按「只增不减」合并
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../v2/gems.js');
const C = require('../v2/core.js');

const gemsSample = () => Object.assign(G.blank(), {
  inv: {a: 3, b: 0, g: 0, s: 10, m: 2, h: 1, l: 0, o8: 1}, tickets: 2, best: 5, lvMax: {c1: 2},
  days: {'2026-11-07': {ok: 30, bad: 2, n: 32, m: 1, paid: 0, forged: 2, waste: 10}},
  sent: {'2026-11-07': 1}, seen: {day: '2026-11-07', keys: {k1: 1}, cells: {x1: 1}},
  palJar: {bal: 4, moved: {'2026-11-07': 1}, target: 3, res: {day: '2026-11-07', n: 1}}, ev: {h: {}, log: []},
});

test('导出：带 gems 字段；不传碎片时和原来一样', () => {
  const S = C.blank(), g = gemsSample();
  const o = JSON.parse(C.exportText(S, g));
  assert.deepEqual(o.gems, g);
  assert.equal(JSON.parse(C.exportText(S)).gems, undefined, '碎片关着：不加字段');
  assert.equal(C.exportText(S), C.exportText(S, null));
});

test('导入：gems 不混进进度；gemsOf 取得出来；旧备份没有 gems', () => {
  const S = C.blank(), g = gemsSample(), text = C.exportText(S, g);
  assert.deepEqual(C.gemsOf(text), g);
  assert.equal(C.importText(text).gems, undefined, '整份替换：进度里没有 gems');
  assert.equal(C.importMerge(C.blank(), text).gems, undefined, '只增不减：进度里没有 gems');
  const old = C.exportText(S);
  assert.equal(C.gemsOf(old), null, '旧备份：没有碎片');
  assert.equal(C.gemsOf('不是备份'), null);
  assert.equal(C.gemsOf(JSON.stringify(Object.assign(C.blank(), {gems: [1, 2]}))), null, 'gems 不是对象：当没有');
  assert.doesNotThrow(() => C.importMerge(C.blank(), old));
});

test('合并：背包按种类取大，同一份导两次不翻倍', () => {
  const local = Object.assign(G.blank(), {inv: {a: 5, b: 0, g: 0, s: 1, m: 0, h: 0, l: 0}});
  const once = G.mergeBackup(local, gemsSample());
  assert.deepEqual(once.inv, {a: 5, b: 0, g: 0, s: 10, m: 2, h: 1, l: 0, o8: 1});
  const twice = G.mergeBackup(once, gemsSample());
  assert.deepEqual(twice.inv, once.inv, '导两次和导一次一样');
  assert.equal(local.inv.s, 1, '不改传入的本机数据');
});

test('合并：每天记录和已领记录按天按字段取大；伙伴罐余额取大；券、纪录、档位取大', () => {
  const local = Object.assign(G.blank(), {tickets: 5, best: 1, lvMax: {c1: 1, c2: 3},
    days: {'2026-11-07': {ok: 40, bad: 0, n: 40, m: 0, paid: 0, forged: 1, waste: 0}, '2026-11-08': {ok: 5, bad: 0, n: 5, m: 0, paid: 0, forged: 0, waste: 0}},
    sent: {'2026-11-07': 2}, palJar: {bal: 1, moved: {'2026-11-08': 2}, target: 6, res: {day: '2026-11-08', n: 2}}});
  const M = G.mergeBackup(local, gemsSample());
  assert.deepEqual(M.days['2026-11-07'], {ok: 40, bad: 2, n: 40, m: 1, paid: 0, forged: 2, waste: 10});
  assert.deepEqual(M.days['2026-11-08'], local.days['2026-11-08'], '备份里没有的日子不动');
  assert.equal(M.sent['2026-11-07'], 2);
  assert.equal(M.palJar.bal, 4, '罐余额取大（Ben/中控接受：旧备份会让花掉的宝石回来）');
  assert.deepEqual(M.palJar.moved, {'2026-11-07': 1, '2026-11-08': 2});
  assert.equal(M.palJar.target, 6, '目标和今天留过几颗按本机');
  assert.deepEqual(M.palJar.res, {day: '2026-11-08', n: 2});
  assert.equal(M.tickets, 5); assert.equal(M.best, 5); assert.deepEqual(M.lvMax, {c1: 2, c2: 3});
});

test('合并：今天发过碎片的题，同一天取并集，不同天留新的', () => {
  const same = G.mergeBackup(Object.assign(G.blank(), {seen: {day: '2026-11-07', keys: {k2: 1}, cells: {x2: 1}}}), gemsSample());
  assert.deepEqual(same.seen, {day: '2026-11-07', keys: {k2: 1, k1: 1}, cells: {x2: 1, x1: 1}});
  const newer = {day: '2026-11-08', keys: {k9: 1}, cells: {}};
  assert.deepEqual(G.mergeBackup(Object.assign(G.blank(), {seen: newer}), gemsSample()).seen, newer, '本机更新：留本机');
  assert.deepEqual(G.mergeBackup(G.blank(), gemsSample()).seen, gemsSample().seen, '本机空白：用备份的');
});

test('合并：统计类保留本机；本机没有的用备份的；备份坏了不动本机', () => {
  const local = Object.assign(G.blank(), {ev: {h: {x: 1}, log: [1]}});
  assert.deepEqual(G.mergeBackup(local, gemsSample()).ev, {h: {x: 1}, log: [1]});
  assert.deepEqual(G.mergeBackup(G.blank(), gemsSample()).ev, {h: {}, log: []});
  assert.equal(G.mergeBackup(local, {inv: 'x'}), null, '备份里的碎片读不了：返回 null，调用方不写');
  assert.equal(G.mergeBackup(local, null), null);
});
