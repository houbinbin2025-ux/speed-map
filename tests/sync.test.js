// 家长一键同步（中控 11-08 派单，Ben 拍板选 B）：一台「发送进度」生成文件，另一台「接收进度」只增不减合并。
// 文件内容 = 现有导出格式（进度 JSON + 顶层 gems），数据结构不改。这里测：互相发一次两边一致、同一份导两次不翻倍、旧格式能收、结果一句话
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../v2/gems.js');
const C = require('../v2/core.js');

const sk = (lv, day) => ({lv, d: [day], seen: 3, lastDay: day, win: []});
const mist = (key, day) => ({key, uid: key.split(':')[0], src: 'g', q: '1+1', ans: 2, passes: 0, due: day, added: day, last: day});
function phone() {   // 手机：练了 look1、cmp1，有 1 道错题，碎片 a×5
  const S = Object.assign(C.blank(), {skills: {look1: sk(2, '2026-11-01'), cmp1: sk(1, '2026-11-02')}, mistakes: {'cmp1:a': mist('cmp1:a', '2026-11-09')}});
  const g = Object.assign(G.blank(), {inv: {a: 5, b: 0, g: 0, s: 0, m: 0, h: 0, l: 0}});
  return {S, g};
}
function ipad() {   // iPad：练了 look1（更高档）、look3，有 2 道别的错题，碎片 s×4
  const S = Object.assign(C.blank(), {skills: {look1: sk(3, '2026-11-05'), look3: sk(2, '2026-11-06')}, mistakes: {'look3:a': mist('look3:a', '2026-11-10'), 'look3:b': mist('look3:b', '2026-11-10')}});
  const g = Object.assign(G.blank(), {inv: {a: 1, b: 0, g: 0, s: 4, m: 0, h: 0, l: 0}});
  return {S, g};
}
// 模拟页面上的「接收进度」：进度走 importMerge，碎片走 mergeBackup（和家长区导入同一条路）
function receive(dev, text) {
  const gems = C.gemsOf(text), before = dev.S;
  dev.S = C.importMerge(dev.S, text);
  if (gems) dev.g = G.mergeBackup(dev.g, gems);
  return C.syncDiff(before, dev.S);
}
const send = dev => C.exportText(dev.S, dev.g);
const lv = S => Object.fromEntries(Object.entries(S.skills).map(([k, v]) => [k, v.lv]));

test('互相发一次：两边的格子、错题、碎片一致', () => {
  const A = phone(), B = ipad();
  receive(B, send(A));
  receive(A, send(B));
  assert.deepEqual(lv(A.S), lv(B.S));
  assert.deepEqual(lv(A.S), {look1: 3, cmp1: 1, look3: 2}, '每格取高的那一档');
  assert.deepEqual(Object.keys(A.S.mistakes).sort(), Object.keys(B.S.mistakes).sort());
  assert.equal(Object.keys(A.S.mistakes).length, 3);
  assert.deepEqual(A.g.inv, B.g.inv);
  assert.deepEqual(A.g.inv, {a: 5, b: 0, g: 0, s: 4, m: 0, h: 0, l: 0}, '碎片按种类取大');
});

test('同一份文件收两次：不翻倍，第二次没有新内容', () => {
  const A = phone(), B = ipad(), file = send(A);
  const snap = () => JSON.stringify([Object.entries(B.S.skills).map(([k, v]) => [k, v.lv, v.d.length]), Object.keys(B.S.mistakes).sort(), B.g.inv]);   // 合并时会补齐 intro 之类的字段，只比档位、达标天数、错题、碎片
  const d1 = receive(B, file), once = snap();
  const d2 = receive(B, file);
  assert.equal(snap(), once);
  assert.deepEqual(d1, {lit: 1, up: 0, mist: 1, mistUp: 0});
  assert.deepEqual(d2, {lit: 0, up: 0, mist: 0, mistUp: 0});
});

test('旧格式文件（没有碎片的导出文字）也能收：进度合并，碎片不动', () => {
  const A = phone(), B = ipad(), old = C.exportText(A.S), inv = Object.assign({}, B.g.inv);
  const d = receive(B, old);
  assert.deepEqual(d, {lit: 1, up: 0, mist: 1, mistUp: 0});
  assert.deepEqual(B.g.inv, inv);
});

test('结果一句话：点亮、升级、新错题、错题进度、碎片个数；没有变化只说没有新内容', () => {
  assert.equal(C.syncText({lit: 3, up: 1, mist: 2, mistUp: 1}, 40), '已合并：新点亮 3 格、升级 1 格、新错题 2 道、错题进度更新 1 道、碎片 +40 个');
  assert.equal(C.syncText({lit: 1, up: 0, mist: 0, mistUp: 0}, 0), '已合并：新点亮 1 格');
  assert.equal(C.syncText({lit: 0, up: 2, mist: 0, mistUp: 0}, null), '已合并：升级 2 格', '只升了档位（审查 R1）');
  assert.equal(C.syncText({lit: 0, up: 0, mist: 0, mistUp: 0}, 40), '已合并：碎片 +40 个');
  assert.equal(C.syncText({lit: 0, up: 0, mist: 0, mistUp: 0}, 0), '已合并：没有新内容');
  assert.equal(C.syncText({lit: 0, up: 0, mist: 0, mistUp: 0}, null), '已合并：没有新内容', '碎片关着：不提碎片');
});

test('只升了档位：算升级，不算没有新内容（审查 R1）', () => {
  const A = phone(), B = ipad();
  A.S.skills = {look1: sk(1, '2026-11-01')}; A.S.mistakes = {};
  B.S.skills = {look1: sk(3, '2026-11-05')}; B.S.mistakes = {};
  assert.deepEqual(receive(A, send(B)), {lit: 0, up: 1, mist: 0, mistUp: 0});
});

test('同一道错题两边状态不同：取最近一次复习的那条，互发一次两边一致（审查 R1）', () => {
  const A = phone(), B = ipad();
  const passed = Object.assign(mist('cmp1:a', '2026-11-05'), {due: null, passes: 5, last: '2026-11-05'});
  const review = Object.assign(mist('cmp1:a', '2026-11-02'), {passes: 1, last: '2026-11-02'});
  A.S.mistakes = {'cmp1:a': passed}; B.S.mistakes = {'cmp1:a': review};
  const d = receive(B, send(A));
  assert.equal(B.S.mistakes['cmp1:a'].due, null, 'iPad 收到手机上已过关的：过关');
  assert.equal(d.mistUp, 1);
  receive(A, send(B));
  assert.deepEqual(A.S.mistakes['cmp1:a'], B.S.mistakes['cmp1:a'], '两边一样');
  // 之后 iPad 上又答错（last 更晚）：手机收到后跟着回到复习
  B.S.mistakes['cmp1:a'] = Object.assign({}, review, {passes: 0, due: '2026-11-08', last: '2026-11-07'});
  receive(A, send(B));
  assert.equal(A.S.mistakes['cmp1:a'].due, '2026-11-08');
  // 同一天两边结果不同：没过关的、过的关少的优先（同一天有一次答错就按答错算，审查 R2）
  assert.equal(C.newerMistake({last: '2026-11-08', due: null, passes: 5}, {last: '2026-11-08', due: 'x', passes: 0}, '2026-11-08').due, 'x');
  assert.equal(C.newerMistake({last: '2026-11-08', due: 'x', passes: 3}, {last: '2026-11-08', due: 'y', passes: 0}, '2026-11-08').passes, 0);
  const same = {last: '2026-11-08', due: 'x', passes: 1}; assert.equal(C.newerMistake(same, Object.assign({}, same), '2026-11-08'), same, '完全一样留本机');
  // 晚于今天的 last 当今天：时钟错的设备不能一直赢（审查 R2）
  assert.equal(C.newerMistake({last: '2026-11-08', due: 'x', passes: 0}, {last: '9999-01-01', due: null, passes: 5}, '2026-11-08').due, 'x');
});

test('文件名带日期；「上次同步」几天前', () => {
  assert.equal(C.syncName('2026-11-08'), '空空数学岛-进度-2026-11-08.json');
  const now = Date.parse('2026-11-08T20:00:00+08:00');
  assert.equal(C.syncAgo(null, now), null);
  assert.equal(C.syncAgo(now - 3600e3, now), 0);
  assert.equal(C.syncAgo(now - 4 * 864e5, now), 4);
  assert.equal(C.syncAgo(Date.parse('2026-11-07T23:00:00+08:00'), Date.parse('2026-11-08T08:00:00+08:00')), 1, '按日历天：昨晚同步、今早看是 1 天前（审查 R1）');
  assert.equal(C.syncAgo(-5, now), null, '坏值当没同步过');
  assert.equal(C.syncAgo(now + 864e5, now), null, '未来时间当没同步过');
});
