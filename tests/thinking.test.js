// v8 思维模块原型：出的题必须有解，要求唯一解的题确实唯一
const {test} = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const P = require(path.join(__dirname, '..', 'docs', '原型-v8-思维', 'puzzles.js'));
const N = 400;
const each = (fn) => { const r = P.rng(20261106); for (let i = 0; i < N; i++) fn(r, i); };

test('天平桥：填对两边相等，题里的数字不超出按键范围', () => {
  each(r => {
    const a = P.balance(r, 0);
    assert.strictEqual(P.sum(a.left) === P.sum(a.right), a.equal);
    assert.ok(a.left.concat(a.right).every(x => x >= 1));
    for (const tier of [1, 3]) {
      const q = P.balance(r, tier);
      assert.ok(q.answer >= 1 && q.answer <= 12, 'answer ' + q.answer);
      assert.strictEqual(P.balanced(q, [q.answer]).diff, 0);
      assert.notStrictEqual(P.balanced(q, [q.answer + 1]).diff, 0);
    }
    const q = P.balance(r, 2);
    assert.strictEqual(P.sum(q.right), q.total);
    const alt = P.altPair(q);
    assert.strictEqual(P.balanced(q, alt).diff, 0);
    assert.ok(!P.isCopy(q, alt));
    assert.ok(P.isCopy(q, q.right) && P.isCopy(q, q.right.slice().reverse()));
    assert.ok(alt.every(x => x >= 1 && x <= 12));
  });
});
test('凑数矿：解数达标，每个解都算得出目标，只用加的技能没有减法', () => {
  each(r => [0, 1, 2].forEach(t => {
    const q = P.target(r, t);
    assert.ok(q.solutions.length >= (t === 2 ? 3 : 2));
    assert.ok(!q.cards.includes(q.target));
    assert.strictEqual(new Set(q.cards).size, q.cards.length);
    q.solutions.forEach(s => {
      assert.strictEqual(P.sum(s.plus) - P.sum(s.minus), q.target);
      if (!q.minus) assert.strictEqual(s.minus.length, 0);
    });
    if (q.minus) assert.ok(q.solutions.some(s => s.minus.length), '加和减的题要有一种解用到减法');
  }));
});
test('线索营地：答案本身合规，留空后只有唯一解', () => {
  each(r => [0, 1, 2].forEach(t => {
    const q = P.grid(r, t);
    assert.strictEqual(P.conflicts(q, q.solution).size, 0);
    assert.strictEqual(P.countGrid(q, q.givens.slice()), 1);
    assert.ok(q.givens.filter(x => !x).length >= (t === 0 ? 3 : 5), '留空太少');
    q.givens.forEach((v, i) => { if (v) assert.strictEqual(v, q.solution[i]); });
  }));
});
test('小狗在哪：线索用完只剩答案，每条线索都用得上，至少两条', () => {
  each(r => {
    const q = P.dog(r);
    assert.deepStrictEqual(q.boxes.filter(x => q.clues.every(c => P.clueOk(c, x))), [q.answer]);
    assert.ok(q.clues.length >= 2);
    q.clues.forEach(c => assert.ok(q.boxes.filter(x => q.clues.filter(k => k !== c).every(k => P.clueOk(k, x))).length > 1, '多余线索 ' + c));
    q.clues.forEach(c => assert.ok(q.boxes.filter(x => P.clueOk(c, x)).length > 1, '一条就定了 ' + c));
  });
});
test('方块工坊：对称答案落在另半边；转一转只有一个对，另两个是镜像', () => {
  each(r => {
    for (const a of ['v', 'h']) {
      const q = P.mirror(r, a);
      assert.strictEqual(new Set(q.want).size, q.given.length);
      q.want.forEach(i => assert.ok(!q.given.includes(i), '答案落在给定半边'));
      q.want.forEach(i => assert.ok(i >= 0 && i < q.rows * q.cols));
    }
    [0, 1].forEach(level => {
      const q = P.rotate(r, level);
      const rots = []; let c = q.shown; for (let k = 0; k < 4; k++) { rots.push(c); c = P.rot(c); }
      assert.strictEqual(q.options.filter(o => o.ok).length, 1);
      q.options.forEach(o => assert.strictEqual(rots.some(x => P.same(x, o.cells)), o.ok));
      const ok = q.options.find(o => o.ok); assert.ok(!P.same(ok.cells, q.shown), '答案不能和题目同一朝向');
    });
  });
});
test('页面脚本语法正确（11-06 踩坑：注释写进单行函数，整页白屏，出题测试抓不到）', () => {
  const html = require('node:fs').readFileSync(path.join(__dirname, '..', 'docs', '原型-v8-思维', '思维模块.html'), 'utf8');
  const code = html.match(/<script>\s*'use strict';([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(code));
  assert.match(code, /\$s\.style\.transform/);
});
