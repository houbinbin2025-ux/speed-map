const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js');

const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const itemsOf = g => K.understand.filter(s => s.group === g).flatMap(s => s.items);

test('理解技能数量与编号：看数 31 卡、分合 45 卡 + 9 题型、数位 2、比大小 8、数线 4', () => {
  const n = g => [itemsOf(g).filter(i => !i.gen).length, itemsOf(g).filter(i => i.gen).length];
  assert.deepEqual(n('look'), [31, 0]);
  assert.deepEqual(n('bond'), [45, 9]);
  assert.deepEqual(n('place'), [0, 2]);
  assert.deepEqual(n('cmp'), [0, 8]);
  assert.deepEqual(n('line'), [0, 4]);
  assert.equal(K.understand.length, 19);
  assert.ok(K.ITEM['look:tf2:20'] && K.ITEM['bond:7=3+_'] && K.ITEM['bond:10=9+_'] && K.ITEM['cmp:t:swap'] && K.ITEM['line:t:100']);
});

test('秒答地图每个世界 / 题型组都接进了图谱，题目编号和 v1 完全一样', () => {
  const ids = K.speed.flatMap(s => s.items.map(i => i.id)).sort();
  assert.deepEqual(ids, C.UNITS.map(u => u.id).sort());
  assert.equal(K.speed.length, 7 + 8 + 2 + 2);
});

test('全部编号不重复，也不和秒答的 Boss 键撞', () => {
  const all = K.SKILLS.flatMap(s => s.items.map(i => i.id));
  assert.equal(new Set(all).size, all.length);
  const boss = [];
  C.LEVELS.forEach((LV, L) => { LV.worlds.forEach((w, i) => boss.push(L === 0 ? String(i) : LV.key + ':' + i)); boss.push(LV.boss.key); });
  boss.forEach(k => assert.ok(!all.includes(k), k));
});

test('前置关系：都存在、没有环；理解技能只依赖理解技能', () => {
  assert.ok(K.topoOk());
  K.understand.forEach(s => s.pre.forEach(p => assert.ok(!K.BY[p].speed, s.id + ' → ' + p)));
});

test('每个题型出 500 道题：答案合法，判题能判对、能判错', () => {
  const r = seeded(7);
  K.SKILLS.forEach(s => s.items.forEach(it => {
    for (let k = 0; k < (it.gen ? 500 : 1); k++) {
      const q = K.make(it.id, r);
      assert.ok(Number.isInteger(q.ans) && q.ans >= 0, it.id + ' ' + JSON.stringify(q));
      assert.equal(K.judge(it, q, q.ans).ok, true, it.id);
      if (s.input !== 'line') assert.equal(K.judge(it, q, q.ans + 1).ok, false, it.id);
    }
  }));
});

test('题目数据都在范围内（分合、缺数、过十、数位、比大小、数线）', () => {
  const r = seeded(11);
  for (let k = 0; k < 500; k++) {
    let x = K.make('bond:t:subL', r); assert.ok(x.q.a >= 1 && x.q.b >= 1 && x.ans <= 10);           // □ − a = b
    x = K.make('bond:t:subR', r); assert.ok(x.q.a - x.ans === x.q.b && x.q.b >= 1);                 // a − □ = b
    x = K.make('bond:t:addL', r); assert.ok(x.ans + x.q.a === x.q.b && x.q.b <= 10);                 // □ + a = b
    x = K.make('bond:t:to10-8', r); assert.ok(8 + x.q.a >= 11 && 8 + x.q.a <= 17 && x.ans === 8 + x.q.a - 10);
    x = K.make('place:t:split', r); assert.ok(x.ans >= 0 && x.ans <= 9);
    x = K.make('cmp:t:swap', r); assert.equal(String(x.q.a).split('').reverse().join(''), String(x.q.b));
    x = K.make('cmp:t:m10', r); assert.ok(x.ans >= 0 && x.ans === x.q.n - 10);
    x = K.make('line:t:100t', r); assert.ok(x.ans % 10 === 0 && x.ans > 0 && x.ans < 100);
  }
});

test('数线合格误差：小于误差算对，等于或超过不算（x.5 不会两头都对）', () => {
  const it = K.ITEM['line:t:10'], q = {q: {max: 10, target: 7}, ans: 7};
  assert.equal(K.judge(it, q, 7.49).ok, true);
  assert.equal(K.judge(it, q, 7.5).ok, false);
  const it2 = K.ITEM['line:t:100'], q2 = {q: {max: 100, target: 47, any: true}, ans: 47};
  assert.equal(K.judge(it2, q2, 56.9).ok, true);
  assert.equal(K.judge(it2, q2, 57).ok, false);
  assert.equal(K.judge(it2, q2, 57, {lineTol: {'100a': 12}}).ok, true); // 家长区可调
});

test('错题编号：卡用卡编号；题型带上题目数据，两道不同数的数线错题是两条', () => {
  assert.equal(K.mkey(K.make('look:tf:7')), 'look:tf:7');
  const a = K.mkey({id: 'line:t:100', q: {max: 100, target: 47}}), b = K.mkey({id: 'line:t:100', q: {max: 100, target: 52}});
  assert.notEqual(a, b);
  const fixed = K.make('line:t:100', null, {q: {max: 100, target: 47}, ans: 47});
  assert.equal(fixed.q.target, 47);
});
