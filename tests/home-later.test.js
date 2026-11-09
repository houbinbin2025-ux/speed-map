// 方案 4 乙丙（中控 11-09 批准）：错题真的会了加 100 / 200 / 400 三档道具；第 90 天以后摆设加密（100、128、142、158、172 天）。
// 新摆设只能接在末尾：编号按位置（deco0…），往中间插会让已经发出去的摆设换名字
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../v2/core.js'), H = require('../v2/home.js');
const deco = H.ITEMS.filter(i => i.deco), day = i => i.need({days: 9999})[1];

test('原来的 15 件摆设编号和天数不变（已经发出去的不换名字）', () => {
  assert.deepEqual(deco.slice(0, 15).map(i => [i.id, day(i), i.name]), [[3, '花盆'], [10, '地毯'], [20, '挂画'], [25, '小旗'], [40, '时钟'], [60, '窗帘'], [70, '小熊'], [80, '地球仪'], [90, '画架'], [110, '鱼缸'], [120, '吊灯'], [135, '留声盒'], [150, '船模'], [165, '星星灯'], [180, '城堡模型']].map(([n, name], i) => ['deco' + i, n, name]));
});

test('新加的 5 件接在末尾，第 90 天以后相邻两件最多隔 10 天', () => {
  assert.deepEqual(deco.slice(15).map(i => [i.id, day(i)]), [['deco15', 100], ['deco16', 128], ['deco17', 142], ['deco18', 158], ['deco19', 172]]);
  const days = deco.map(day).filter(n => n >= 90).sort((a, b) => a - b);
  for (let i = 1; i < days.length; i++) assert.ok(days[i] - days[i - 1] <= 10, `${days[i - 1]} → ${days[i]} 隔太久`);
});

test('错题真的会了 100 / 200 / 400 道各给一件；只学会 150 道只拿到第一件', () => {
  const S = C.blank(); S.placedAt = 1;
  for (let i = 0; i < 150; i++) S.mistakes['k' + i] = {key: 'k' + i, uid: 'look1', due: null, out: 1, passes: 0};
  const got = H.sync(S, '2026-11-10').map(r => r.id);
  assert.ok(got.includes('fix100')); assert.ok(!got.includes('fix200') && !got.includes('fix400'));
});
