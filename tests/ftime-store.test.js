// 逐题用时 S.ftime 的存储一侧（F）：读档清洗、导入合并、整份替换、清空（迁移测试第 3、4、5、7 条；第 1、2、6 条在 ftime.test.js，B 写）
// 格式（B 定、F 11-09 同意）：S.ftime = {技能编号: [倍数, …]}，两位小数，最旧在前，每技能 ≤ 10 条，> 10 倍不记
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js');
const clone = o => JSON.parse(JSON.stringify(o));
const base = ft => Object.assign(C.blank(), {placedAt: 1, known: {look1: true}}, ft === undefined ? {} : {ftime: ft});
const ten = (from) => Array.from({length: 10}, (_, i) => Math.round((from + i * 0.05) * 100) / 100);

test('第 3 条 同一份文件导入两次：样本不重复、不变多', () => {
  const S = base({add20: [0.62, 1.1, 0.85], sub20: ten(0.5)});
  let M = C.importMerge(clone(S), C.exportText(S));
  M = C.importMerge(M, C.exportText(S));
  assert.deepEqual(M.ftime, S.ftime);
});

test('第 4 条 两台设备各有一部分：同一技能整组取样本多的一边、一样多取本机；只有一边有的照搬；不超过 10 条', () => {
  const A = base({add20: [0.6, 0.7], sub20: [1.0, 1.1, 1.2], bond: [0.9]});
  const B = base({add20: [0.5, 0.55, 0.58], sub20: [2.0, 2.1, 2.2], cmp: ten(0.3)});
  const M = C.importMerge(clone(A), C.exportText(B));
  assert.deepEqual(M.ftime.add20, [0.5, 0.55, 0.58]);   // 备份样本多
  assert.deepEqual(M.ftime.sub20, [1.0, 1.1, 1.2]);     // 一样多：本机
  assert.deepEqual(M.ftime.bond, [0.9]);                // 只有本机有
  assert.deepEqual(M.ftime.cmp, ten(0.3));              // 只有备份有
  assert.ok(Object.values(M.ftime).every(a => a.length <= 10));
  assert.deepEqual(A.ftime.add20, [0.6, 0.7]);          // 不改本机对象
  // 旧备份（没有 ftime）→ 本机的留着；新备份 → 旧本机：带进来
  assert.deepEqual(C.importMerge(clone(A), C.exportText(base())).ftime, A.ftime);
  assert.deepEqual(C.importMerge(base(), C.exportText(B)).ftime, B.ftime);
  assert.equal(C.importMerge(base(), C.exportText(base())).ftime, undefined);   // 两边都没有：不凭空加字段
});

test('第 5 条 坏值读档时被清洗（和 B 判线 ftOf、写入 noteThink 同口径），进度其他部分不受影响', () => {
  const bad = base({add20: [0.6, 'x', -1, 0, 11, NaN, null, 1.2], sub20: 'zz', many: ten(0.2).concat([0.9, 0.95]), empty: ['a'], ok: [1]});
  const S = C.upgrade(JSON.parse(JSON.stringify(bad)));   // NaN 存进 JSON 后是 null
  assert.deepEqual(S.ftime, {add20: [0.6, 1.2], many: ten(0.2).slice(2).concat([0.9, 0.95]), ok: [1]});
  assert.equal(S.known.look1, true); assert.equal(S.placedAt, 1);
  for (const v of [3, 'x', null, [1, 2]]) assert.equal(C.upgrade(base(v)).ftime, undefined, JSON.stringify(v));
  // 走真读档：坏 ftime 不让存档变成「读不了」
  const mem = {}, store = {getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }};
  store.setItem('speedmap.v2.test', JSON.stringify(Object.assign(base(), {ftime: {add20: [0.5, 99]}})));
  const r = C.load(store, {test: true});
  assert.deepEqual(r.S.ftime, {add20: [0.5]}); assert.ok(!r.notes.includes('broken'));
  // 备份里只有备份有的坏数组：导入合并后也是干净的
  assert.deepEqual(C.importMerge(base(), JSON.stringify(base({x: [5, 50, 'q']}))).ftime, {x: [5]});
  // 备份里的 __proto__ 键不污染
  C.importMerge(base({a: [1]}), '{"v":2,"cards":{},"mistakes":{},"ftime":{"__proto__":[1,2]}}');
  assert.equal(({}).length, undefined); assert.equal(Object.prototype[0], undefined);
});

test('第 7 条 清空进度把 ftime 一起清掉；整份替换以备份为准并过清洗', () => {
  const S = base({add20: [0.6]});
  assert.equal(C.resetProgress(S).ftime, undefined);
  const R = C.importText(JSON.stringify(base({sub20: [0.7, 20]})));
  assert.deepEqual(R.ftime, {sub20: [0.7]});
  assert.equal(C.importText(JSON.stringify(base())).ftime, undefined);
});
