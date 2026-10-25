const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../v2/ink.js');

// 程序生成的「标准数字」：每个数字是若干笔，每笔是一串点（坐标在约 100×160 的格子里）
const arc = (cx, cy, rx, ry, a0, a1, n = 18) => Array.from({length: n}, (_, i) => {
  const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180;
  return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
});
const line = (x0, y0, x1, y1, n = 10) => Array.from({length: n}, (_, i) => [x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1)]);
const DIGITS = {
  0: [arc(50, 80, 40, 75, -90, 270, 30)],
  1: [line(35, 25, 55, 5, 5).concat(line(55, 5, 55, 155, 14))],
  2: [arc(50, 45, 38, 40, 200, 360 + 20, 16).concat(line(84, 60, 12, 155, 10), line(12, 155, 92, 155, 8))],
  3: [arc(48, 42, 36, 37, 210, 450, 16).concat(arc(48, 115, 40, 40, 270, 500, 18))],
  4: [line(70, 5, 8, 110, 10).concat(line(8, 110, 95, 110, 8)), line(72, 40, 72, 158, 10)],
  5: [line(85, 8, 25, 8, 6), line(25, 8, 20, 70, 6).concat(arc(50, 110, 40, 45, 230, 500, 18))],
  6: [arc(60, 60, 45, 58, 280, 180, 10).concat(arc(52, 115, 38, 40, 180, 540, 22))],
  7: [line(10, 8, 90, 8, 8).concat(line(90, 8, 40, 158, 12))],
  8: [arc(50, 42, 32, 36, 90, 450, 18).concat(arc(50, 118, 40, 40, -90, 270, 20))],
  9: [arc(50, 48, 38, 40, 0, 360, 20).concat(line(88, 48, 80, 158, 10))],
};
const seq = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// 变形：缩放、旋转、平移、抖动，并加时间戳
function sample(d, r, ox = 0) {
  const s = 0.6 + r() * 0.8, rot = (r() - 0.5) * 16 * Math.PI / 180, dx = ox + r() * 30, dy = r() * 30;
  let t = 0;
  return DIGITS[d].map(stroke => stroke.map(([x, y]) => {
    const jx = x + (r() - 0.5) * 8, jy = y + (r() - 0.5) * 8;
    const X = (jx * Math.cos(rot) - jy * Math.sin(rot)) * s + dx, Y = (jx * Math.sin(rot) + jy * Math.cos(rot)) * s + dy;
    return {x: X, y: Y, t: (t += 16)};
  }));
}

function calibrated(seed) {
  const r = seq(seed), store = I.blankStore();
  for (let d = 0; d <= 9; d++) for (let k = 0; k < 3; k++) I.addTemplate(store, d, sample(d, r));
  return store;
}

test('分组：「13」分 2 组，两笔的「4」「5」各算 1 组，左到右排列', () => {
  const r = seq(3);
  const one = sample(1, r, 0), three = sample(3, r, 160);
  assert.equal(I.groupStrokes(one.concat(three)).length, 2);
  assert.equal(I.groupStrokes(three.concat(one)).length, 2);         // 写的顺序不影响
  assert.equal(I.groupStrokes(sample(4, r)).length, 1);
  assert.equal(I.groupStrokes(sample(5, r)).length, 1);
  const g = I.groupStrokes(three.concat(one));
  assert.ok(g[0][0][0].x < g[1][0][0].x, '左边那组在前');
});

test('识别：校准 3 遍后，变形样本认对率 ≥95%', () => {
  const store = calibrated(101), r = seq(202);
  let ok = 0, n = 0;
  for (let d = 0; d <= 9; d++) for (let k = 0; k < 30; k++) {
    const res = I.recognize(sample(d, r), store);
    n++; if (res.text === String(d)) ok++;
  }
  assert.ok(ok / n >= 0.95, `认对率 ${(ok / n * 100).toFixed(1)}%`);
});

test('识别两位数：「13」「40」拼成正确数字，候选只来自笔迹（返回前两名）', () => {
  const store = calibrated(5), r = seq(9);
  assert.equal(I.recognize(sample(1, r, 0).concat(sample(3, r, 170)), store).text, '13');
  assert.equal(I.recognize(sample(4, r, 0).concat(sample(0, r, 170)), store).text, '40');
  const res = I.recognize(sample(7, r), store);
  assert.equal(res.digits[0].cands.length, 2);
  assert.notEqual(res.digits[0].cands[0].d, res.digits[0].cands[1].d);
});

test('没校准时不识别；空白不识别', () => {
  const r = seq(4);
  assert.equal(I.recognize(sample(3, r), I.blankStore()).text, null);
  assert.equal(I.recognize([], calibrated(1)).text, null);
});

test('模板每个数字最多 15 个，新换旧', () => {
  const store = I.blankStore(), r = seq(8);
  for (let k = 0; k < 20; k++) I.addTemplate(store, 7, sample(7, r));
  assert.equal(store.t['7'].length, 15);
});

test('书写速度：取每个数字用时的中位数', () => {
  assert.equal(I.medianSpeed([900, 400, 600, 2000, 700]), 700);
  assert.equal(I.medianSpeed([]), null);
  const s = sample(3, seq(1));
  assert.ok(I.writeMs(s) > 0);
});

test('杂笔：旁边多碰出一个点或很小的一划，不影响识别', () => {
  const store = calibrated(21), r = seq(31);
  const one = sample(1, r, 0);
  const dot = [[{x: 200, y: 60, t: 1}]];                          // 轻点一下
  const tiny = [[{x: 260, y: 40, t: 1}, {x: 262, y: 41, t: 2}]];  // 手掌蹭到的一小划
  assert.equal(I.recognize(one.concat(dot), store).text, '1');
  assert.equal(I.recognize(one.concat(tiny), store).text, '1');
  assert.equal(I.recognize(dot, store).text, null);               // 只有一个点：不算写了
});

test('分组：笔直的一竖落在另一笔范围内（如「4」）算同一个数字；两个分开的「1」算两个', () => {
  const P = pts => pts.map(([x, y], i) => ({x, y, t: i}));
  const four = [P([[70, 5], [40, 60], [8, 110], [50, 110], [95, 110]]), P([[72, 40], [72, 100], [72, 158]])];
  assert.equal(I.groupStrokes(four).length, 1);
  const elevens = [P([[50, 5], [50, 80], [50, 158]]), P([[130, 5], [130, 80], [130, 158]])];
  assert.equal(I.groupStrokes(elevens).length, 2);
  const oneThree = [P([[50, 5], [50, 158]]), P([[90, 20], [150, 40], [110, 80], [150, 120], [90, 150]])];
  assert.equal(I.groupStrokes(oneThree).length, 2);
});
