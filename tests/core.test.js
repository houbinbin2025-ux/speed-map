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

// ---------- 任务 2：存储键与迁移 ----------
const memStore = (init) => {
  const m = Object.assign({}, init);
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m };
};
const v1With = (cards, extra) => JSON.stringify(Object.assign({v: 1, savedAt: 1, cards, boss: {}, log: {}, level: 0}, extra));
const lvCount = S => [0, 1, 2, 3].map(lv => Object.values(S.cards).filter(c => c.lv === lv).length);
const NOW = Date.parse('2026-10-25T10:00:00');

test('存储键：正式 / 预览 / 测试 分开，笔迹测试键独立', () => {
  assert.deepEqual(C.keysFor({}), {prog: 'speedmap.v2', ink: 'speedmap.ink'});
  assert.deepEqual(C.keysFor({preview: true}), {prog: 'speedmap.v2.preview', ink: 'speedmap.ink'});
  assert.deepEqual(C.keysFor({test: true}), {prog: 'speedmap.v2.test', ink: 'speedmap.ink.test'});
});

test('①预览期：v1 有新进度，下次打开预览就能看到', () => {
  const st = memStore({'speedmap.v1': v1With({'3+4': {lv: 1, d: ['2026-10-24'], seen: 1}})});
  let S = C.loadState(st, {preview: true}, NOW);
  assert.equal(S.cards['3+4'].lv, 1);
  st.setItem('speedmap.v1', v1With({'3+4': {lv: 2, d: ['2026-10-24', '2026-10-25'], seen: 2}}));
  S = C.loadState(st, {preview: true}, NOW);
  assert.equal(S.cards['3+4'].lv, 2);
});

test('②预览中练习、加错题：v1 一个字节都不变，错题本留在预览键', () => {
  const raw = v1With({'3+4': {lv: 1, d: ['2026-10-24'], seen: 1}});
  const st = memStore({'speedmap.v1': raw});
  const S = C.loadState(st, {preview: true}, NOW);
  C.tryUp(S, '3+4', '2026-10-25');
  C.addMistake(S, C.inst({id: '5+2'}), '2026-10-25');
  C.saveState(st, {preview: true}, S, NOW);
  assert.equal(st.getItem('speedmap.v1'), raw);
  const again = C.loadState(st, {preview: true}, NOW);
  assert.ok(again.mistakes['5+2']);           // 错题本在预览里保留
  assert.equal(again.cards['3+4'].lv, 1);     // 地图仍以 v1 为准
});

test('③正式首启：从 v1 迁移，颜色数一致，记迁移标记并立即写入 v2', () => {
  const cards = {'3+4': {lv: 3, d: [], seen: 5}, '5+2': {lv: 2, d: [], seen: 3}, '1+1': {lv: 1, d: [], seen: 1}, '2+2': {lv: 0, d: [], seen: 1}};
  const st = memStore({'speedmap.v1': v1With(cards, {level: 1, boss: {'0': '2026-10-01'}})});
  const S = C.loadState(st, {}, NOW);
  assert.deepEqual(lvCount(S), lvCount({cards}));
  assert.equal(S.level, 1);
  assert.equal(S.boss['0'], '2026-10-01');
  assert.equal(S.migratedFromV1At, NOW);
  assert.ok(st.getItem('speedmap.v2'));
});

test('④⑤迁移只发生一次：之后 v1 再被改也不影响 v2', () => {
  const st = memStore({'speedmap.v1': v1With({'3+4': {lv: 1, d: [], seen: 1}})});
  C.loadState(st, {}, NOW);
  st.setItem('speedmap.v1', v1With({'3+4': {lv: 3, d: [], seen: 9}}));
  const S = C.loadState(st, {}, NOW + 1000);
  assert.equal(S.cards['3+4'].lv, 1);
  assert.equal(S.migratedFromV1At, NOW);
});

test('没有任何旧数据：正式版从空白开始', () => {
  const S = C.loadState(memStore({}), {}, NOW);
  assert.deepEqual(S.cards, {});
  assert.deepEqual(S.mistakes, {});
});

test('⑥导出 → 导入（含换入口）：颜色数与错题一致，笔迹不在备份里', () => {
  const st = memStore({'speedmap.v1': v1With({'3+4': {lv: 3, d: [], seen: 5}, '5+2': {lv: 2, d: [], seen: 2}})});
  const S = C.loadState(st, {}, NOW);
  C.addMistake(S, C.inst({id: '6+3'}), '2026-10-25');
  const text = C.exportText(S);
  assert.ok(!/ink|templates/.test(text));
  const other = memStore({});                  // 另一个入口：空存储
  const T = C.importText(text);
  C.saveState(other, {}, T, NOW);
  const back = C.loadState(other, {}, NOW);
  assert.deepEqual(lvCount(back), lvCount(S));
  assert.ok(back.mistakes['6+3']);
});

test('⑦v1 备份也能导入；坏备份被拒', () => {
  const T = C.importText(v1With({'3+4': {lv: 2, d: [], seen: 2}}));
  assert.equal(T.cards['3+4'].lv, 2);
  assert.deepEqual(T.mistakes, {});
  assert.throws(() => C.importText('不是备份'));
  assert.throws(() => C.importText('{"a":1}'));
});
