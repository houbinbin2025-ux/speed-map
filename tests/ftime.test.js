// 秒答校准第一步：只记逐题用时（中控 11-09 拍板两步走；存储按 F《F-逐题用时-存储要求.md》，键名见交接 B-给F-逐题用时键名.md）
// S.ftime = {技能编号: [想的时间 ÷ 估计想的时间, …]}，两位小数，最旧在前，每技能最多 10 条。只记录，不改任何判断。
// 迁移测试第 1、2、6 条（B 一侧）；合并和清洗（第 3、4、5、7 条）归 F。
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-01', n);
// 自由加练：每道题按 fn 作答，返回答过的题
function run(S, day, group, fn, n = 40) {
  const f = E.free(S, day, group, {rnd: seeded(7)}), xs = [];
  for (let x = f.next(), g = 0; x && g < n; x = f.next(), g++) { if (x.kind !== 'q') continue; xs.push(x); f.answer(fn(x, xs.length)); }
  return xs;
}

test('thinkRatio：用时正好等于秒答线 → 1；少一半想的时间 → 0.5；想得极快 → 0.05；离谱慢（> 10 倍）→ null', () => {
  const id = Object.keys(K.ITEM).find(i => K.fastClass(i) === 'short' && K.BY[K.ITEM[i].skill].input === 'write');
  const inst = K.make(id, seeded(5)), o = {speed: 900};
  const lim = K.fastMs(inst, o), th = K.thinkMs(inst);
  assert.equal(K.thinkRatio(inst, lim, o), 1);
  assert.equal(K.thinkRatio(inst, lim - th / 2, o), 0.5);
  assert.equal(K.thinkRatio(inst, 1, o), 0.05);
  assert.equal(K.thinkRatio(inst, lim + th * 10, o), null);
  assert.equal(K.thinkRatio(inst, NaN, o), null);
});

test('答对记进 S.ftime[技能]：两位小数；答错、再来一次、看过提示、口答不记', () => {
  const S = C.blank(); S.placedAt = 1;
  const xs = run(S, D(0), 'bond', (x, i) => i === 1 ? {ok: false, fast: false, secs: 5, think: 0.7}
    : i === 2 ? {ok: true, fast: true, secs: 3, think: 0.8, peeked: true}
    : i === 3 ? {ok: true, fast: true, secs: 3, think: 0.9, oral: true}
    : {ok: true, fast: true, secs: 3, think: 0.333}, 8);
  const all = [].concat(...Object.values(S.ftime || {}));
  assert.ok(all.length > 0, '有记录');
  assert.ok(all.every(v => v === 0.33), '只有正常答对的 0.333 → 0.33：' + JSON.stringify(S.ftime));
  const retries = xs.filter(x => x.retry).length, normal = xs.filter((x, i) => i >= 3 && !x.retry).length;
  assert.equal(all.length, normal, `答对 ${normal} 道（再来一次 ${retries} 道不算）`);
});

test('每技能最多 10 条，留最新的；没有 think 字段（老页面）不记、也不报错', () => {
  const S = C.blank();
  for (let i = 1; i <= 13; i++) E.noteThink(S, 'add10', i / 10);
  assert.deepEqual(S.ftime.add10, [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3]);
  const T = C.blank(); T.placedAt = 1;
  run(T, D(0), 'bond', () => ({ok: true, fast: true, secs: 3}), 6);
  assert.equal(T.ftime, undefined);
});

test('数组里原有坏值（字符串、负数、超 10 倍、NaN）、不是数组：写入前先洗掉', () => {
  const S = C.blank(); S.ftime = {a: ['x', -1, 12, null, 0.5], b: 'oops'};
  E.noteThink(S, 'a', 0.6); E.noteThink(S, 'b', 0.7);
  assert.deepEqual(S.ftime, {a: [0.5, 0.6], b: [0.7]});
  const T = C.blank(); T.ftime = 'bad'; E.noteThink(T, 'a', 1);
  assert.deepEqual(T.ftime, {a: [1]});
});

test('迁移 1：同一份存档、同一道题，带不带 think 结算结果完全一样（进度、颜色、错题、统计、返回值），只多出 ftime', () => {
  const S = C.blank(); S.placedAt = 1; let n = 0;
  const ans = i => i % 4 === 0 ? {ok: false, fast: false, secs: 6} : {ok: true, fast: i % 3 !== 0, secs: 3};
  for (let d = 0; d < 4; d++) run(S, D(d), 'bond', (x, i) => {
    const res = ans(i), A = JSON.parse(JSON.stringify(S)), B = JSON.parse(JSON.stringify(S));
    const oa = E.settle(A, x, res, D(d)), ob = E.settle(B, x, Object.assign({think: 0.8}, res), D(d));
    if (B.ftime && JSON.stringify(B.ftime) !== JSON.stringify(A.ftime)) n++;
    delete A.ftime; delete B.ftime;
    assert.deepEqual(B, A); assert.deepEqual(ob, oa);
    return res;
  });
  assert.ok(n > 10, `有 ${n} 道题记了用时`);
});

test('迁移 2：秒答线只看估计值——有没有 ftime、样本多少，K.fastMs 都不变（第一步不改判断）', () => {
  const ids = Object.keys(K.ITEM).filter((_, i) => i % 7 === 0);
  const insts = ids.map(id => K.make(id, seeded(9))), before = insts.map(x => K.fastMs(x, {speed: 800}));
  const S = C.blank(); ids.forEach(id => { for (let i = 0; i < 12; i++) E.noteThink(S, K.ITEM[id].skill, 0.1); });
  assert.deepEqual(insts.map(x => K.fastMs(x, {speed: 800})), before);
});

test('存档往返：saveState / loadState 带上 ftime；满载体积 ≤ 12KB', () => {
  const m = {}, st = {getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }};
  const ctx = {test: true, known: id => !!K.ITEM[id]}, S = C.loadState(st, ctx, 1);
  const skills = [...new Set(Object.values(K.ITEM).map(x => x.skill))];
  skills.forEach(s => { for (let i = 0; i < 12; i++) E.noteThink(S, s, 1.23 + i / 100); });
  C.saveState(st, ctx, S, 2);
  const T = C.loadState(st, ctx, 3);
  assert.deepEqual(T.ftime, S.ftime);
  const size = JSON.stringify(S.ftime).length;
  assert.ok(size <= 12 * 1024, `满载 ${skills.length} 个技能 × 10 条 = ${size} 字节`);
});
