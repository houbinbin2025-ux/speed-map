const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js');

// ---------- 任务 1：题库、升级、限时 ----------
test('题库与 v1 一致：L1 110 张、L2 90 张、L3/L4 各 12 种题型', () => {
  assert.equal(C.unitsOf(0).length, 110);
  assert.equal(C.unitsOf(1).length, 90);
  assert.equal(C.unitsOf(2).length, 12);
  assert.equal(C.unitsOf(3).length, 12);
  assert.ok(C.BYID['3+4'] && C.BYID['3+4'].ans === 7);
  assert.ok(C.BYID['10-0'] && C.BYID['10-0'].ans === 10);
  assert.ok(C.BYID['L3:add1c'].gen);
});

test('题型生成的数字符合题型规则', () => {
  for (let i = 0; i < 200; i++) {
    const q = C.inst(C.BYID['L4:sub2c']);
    assert.ok(q.b > 10 && q.b < q.a && q.b % 10 > q.a % 10, JSON.stringify(q));
    assert.equal(q.ans, q.a - q.b);
  }
});

test('tryUp：只升不降、一天最多一级、淡红到深红隔 3 天', () => {
  const S = C.blank();
  assert.equal(C.tryUp(S, '3+4', '2026-10-01'), true);
  assert.equal(C.tryUp(S, '3+4', '2026-10-01'), false); // 同一天不再升
  assert.equal(C.tryUp(S, '3+4', '2026-10-02'), true);
  assert.equal(S.cards['3+4'].lv, 2);
  assert.equal(C.tryUp(S, '3+4', '2026-10-04'), false); // 只隔 2 天
  assert.equal(C.tryUp(S, '3+4', '2026-10-05'), true);
  assert.equal(S.cards['3+4'].lv, 3);
  assert.equal(C.tryUp(S, '3+4', '2026-10-20'), false);
});

test('fastLimit：口答用原限时，手写按位数加书写用时', () => {
  const u = C.BYID['3+4'];
  assert.equal(C.fastLimit(u, 7, 'oral', 800), 2000);
  assert.equal(C.fastLimit(u, 7, 'write'), 3000);          // 没测到速度按每位 1 秒
  assert.equal(C.fastLimit(u, 7, 'write', 800), 2800);
  assert.equal(C.fastLimit(C.BYID['8+5'], 13, 'write', 900), 3000 + 1800);
});

test('日期工具', () => {
  assert.equal(C.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(C.dayDiff('2026-10-01', '2026-10-05'), 4);
});

test('题目编号与线上 v1 index.html 逐个一致（旧进度不丢）', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf('const rnd = ');
  const end = html.indexOf('const BYID');
  assert.ok(start > 0 && end > start);
  const v1Units = new Function(html.slice(start, end) + '; return UNITS;')();
  assert.deepEqual(v1Units.map(u => u.id), C.UNITS.map(u => u.id));
});
