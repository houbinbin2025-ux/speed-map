// 第二批 2b-2 分步作答题池（tools/grade34d-pools.js）：答案存一个整数（各格拼起来），q.cells 记每格几位（B 方案 §6）。
// 按 cells 切开后：每格不以 0 开头、不为 0，格数 = 题面 □ 数；再用独立算法重算。另查接进题库、技能、级别、讲解卡、显示函数。
const test = require('node:test'), assert = require('node:assert');
const P = require('../tools/grade34d-pools.js'), K = require('../v2/skills.js'), R = require('../v2/render.js'), HB = require('../v2/hardbank.js');
const split = x => { const s = String(x.ans), out = []; let i = 0; x.q.cells.forEach(n => { out.push(s.slice(i, i + n)); i += n; }); assert.equal(i, s.length, `${x.q.text} cells 和答案位数对不上`); return out; };

test('只有两个题池：商和余数、假分数化带分数；30–300 道，编号和题面不重复，每题有讲解', () => {
  assert.deepEqual(Object.keys(P).sort(), ['speed:g10:divrem2', 'speed:g15:mixed']);
  for (const id in P) { const p = P[id]; assert.ok(p.length >= 30 && p.length <= 300, id);
    assert.equal(new Set(p.map(x => x.q.qk)).size, p.length); assert.equal(new Set(p.map(x => x.q.text)).size, p.length);
    p.forEach(x => { assert.ok(x.q.why && x.q.view === 'eq');
      assert.ok(Number.isInteger(x.ans) && x.ans > 0, `${x.q.text} 答案是正整数`);
      assert.ok(Array.isArray(x.q.cells) && x.q.cells.every(n => Number.isInteger(n) && n >= 1), x.q.text);
      assert.equal(x.q.cells.length, (x.q.text.match(/□/g) || []).length, `${x.q.text} 格数 = 方框数`);
      split(x).forEach(c => assert.ok(/^[1-9]\d*$/.test(c), `${x.q.text} 这一格「${c}」以 0 开头或为 0`)); }); }
});

test('商和余数：被除数 = 除数 × 商 + 余数，0 < 余数 < 除数，商不为 0', () => {
  P['speed:g10:divrem2'].forEach(x => { const [, a, b] = /^(\d+) ÷ (\d+) = □ 余 □$/.exec(x.q.text).map(Number), [q, r] = split(x).map(Number);
    assert.equal(a, b * q + r, x.q.text); assert.ok(r > 0 && r < b && q > 0, x.q.text); assert.ok(x.q.why.includes(String(r)), x.q.why); });
});

test('假分数化带分数：分子 = 整数 × 分母 + 余下的分子，0 < 余下 < 分母（能整除的剔除），分母不变；朗读用「几分之几」；不出所有数都 ≤ 5 的', () => {
  P['speed:g15:mixed'].forEach(x => { const [, n, d, d2] = /^(\d+)\/(\d+) = □ 又 □\/(\d+)$/.exec(x.q.text).map(Number), [w, r] = split(x).map(Number);
    assert.equal(d, d2); assert.equal(n, w * d + r, x.q.text); assert.ok(r > 0 && r < d && w > 0, x.q.text); assert.ok(n % d !== 0); assert.ok(n > 5, x.q.text);
    assert.ok(/分之/.test(x.q.read) && !/\d|\//.test(x.q.read), x.q.read); });
});

test('接进题库：hardbank 里的两个题池和生成脚本一致；技能登记、late、级别 = 编号里的 gN、挂讲解卡；内容词进级别说明', () => {
  for (const id in P) assert.deepEqual(HB.pools[id], P[id], `${id} hardbank 没重新生成`);
  [['speed:g10:divrem2', 10, 'rem'], ['speed:g15:mixed', 15, 'mixed']].forEach(([id, lv, c]) => {
    const s = K.BY[K.ITEM[id].skill]; assert.ok(s && s.late && s.hard, id);
    assert.deepEqual(K.itemLevels(id), [lv], id); assert.equal(s.concept, c, id); assert.ok(R.CONCEPTS.includes(c), c);
    assert.ok(K.LEVELS[lv - 1].topics.includes(K.TOPIC[s.id]), `${id} 内容词 ${K.TOPIC[s.id]} 不在第 ${lv} 级说明里`);
    assert.ok(K.mistCat(s.id), `${id} 没有错题类别`);
  });
});

test('R.cellsText：按 cells 把答案依次填进题面的方框，余数题「3 余 2」，带分数「3 又 2/5」（分数上下结构）', () => {
  const x = {q: {text: '17 ÷ 5 = □ 余 □', cells: [1, 1]}, ans: 32}, y = {q: {text: '17/5 = □ 又 □/5', cells: [1, 1]}, ans: 32};
  assert.equal(R.cellsText(x.q, x.ans), '3 余 2'); assert.equal(R.cellsText(y.q, y.ans), '3 又 2/5');
  assert.equal(R.cellsText({text: '50 ÷ 4 = □ 余 □', cells: [2, 1]}, 122), '12 余 2', '多位的格');
  for (const id in P) P[id].forEach(z => { const t = R.cellsText(z.q, z.ans); assert.ok(!t.includes('□') && t.split(/\D+/).filter(Boolean).length >= 2, t); });
});
