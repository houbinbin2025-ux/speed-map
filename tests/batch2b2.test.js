// 第二批 2b-2 分步作答题池（tools/grade34d-pools.js，还没接进题库）：每格答案唯一、按文字存，用独立算法重算
const test = require('node:test'), assert = require('node:assert');
const P = require('../tools/grade34d-pools.js');

test('只有两个题池：商和余数、假分数化带分数；30–300 道，编号和题面不重复，每题有讲解', () => {
  assert.deepEqual(Object.keys(P).sort(), ['speed:g10:divrem2', 'speed:g15:mixed']);
  for (const id in P) { const p = P[id]; assert.ok(p.length >= 30 && p.length <= 300, id);
    assert.equal(new Set(p.map(x => x.q.qk)).size, p.length); assert.equal(new Set(p.map(x => x.q.text)).size, p.length);
    p.forEach(x => { assert.ok(x.q.why && x.q.view === 'eq'); assert.equal((x.q.text.match(/□/g) || []).length, 2, x.q.text);
      assert.ok(Array.isArray(x.ans) && x.ans.length === 2 && x.ans.every(a => /^[1-9]\d{0,2}$/.test(a)), `${x.q.text} 每格是不以 0 开头的 1–3 位数字文字`); }); }
});

test('商和余数：被除数 = 除数 × 商 + 余数，0 < 余数 < 除数，商不为 0', () => {
  P['speed:g10:divrem2'].forEach(x => { const [, a, b] = /^(\d+) ÷ (\d+) = □ 余 □$/.exec(x.q.text).map(Number), [q, r] = x.ans.map(Number);
    assert.equal(a, b * q + r, x.q.text); assert.ok(r > 0 && r < b && q > 0, x.q.text); });
});

test('假分数化带分数：分子 = 整数 × 分母 + 余下的分子，0 < 余下 < 分母（能整除的剔除），分母不变；朗读用「几分之几」', () => {
  P['speed:g15:mixed'].forEach(x => { const [, n, d, d2] = /^(\d+)\/(\d+) = □ 又 □\/(\d+)$/.exec(x.q.text).map(Number), [w, r] = x.ans.map(Number);
    assert.equal(d, d2); assert.equal(n, w * d + r, x.q.text); assert.ok(r > 0 && r < d && w > 0, x.q.text); assert.ok(n % d !== 0);
    assert.ok(/分之/.test(x.q.read) && !/\d|\//.test(x.q.read), x.q.read); });
});
