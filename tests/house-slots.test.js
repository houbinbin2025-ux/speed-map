// 家里的格子够不够放（中控 11-09 审查：地面只剩 2 格，新道具找不到空位会静默不摆，孩子永远看不到）
// 能摆的道具（全部获得时、不算盔甲部件）按地上 / 墙上分开数，不能多于对应的格子数；每件都要有图（画图单收尾后不再有等图的道具）
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm'), fs = require('fs'), path = require('path');
const H = require('../v2/home.js');
const ctx = {document: {createElement: () => ({getContext: () => new Proxy({}, {get: () => () => {}})})}, console};
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../v2/house.js'), 'utf8'), ctx);
const A = ctx.ART;

test('能摆的道具数不多于格子数（地上、墙上分开算）', () => {
  const items = H.ITEMS.filter(i => !i.part), n = {F: 0, W: 0};
  items.forEach(i => { const a = A.ITEM[i.id]; if (a) n[a.t]++; });
  assert.ok(n.F <= A.SLOTS_N.F, `地上道具 ${n.F} 件，地面格只有 ${A.SLOTS_N.F} 个：加格子（house.js 的 SLOTS_N.F）`);
  assert.ok(n.W <= A.SLOTS_N.W, `墙上道具 ${n.W} 件，墙面格只有 ${A.SLOTS_N.W} 个：加格子（house.js 的 SLOTS_N.W）`);
});
test('每件能摆的道具都有图，且只标地上或墙上', () => {
  const noArt = H.ITEMS.filter(i => !i.part && !A.ITEM[i.id]).map(i => i.id);
  assert.deepEqual(noArt, [], '这些道具还没画图（house.js 的 ITEM）：' + noArt.join(', '));
  H.ITEMS.filter(i => !i.part).forEach(i => assert.ok(['F', 'W'].includes(A.ITEM[i.id].t), i.id + ' 的 t 只能是 F 或 W'));
});
