// 思维模块：出的题必须有解，要求唯一解的题确实唯一；进度不碰旧存档
const {test} = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const P = require(path.join(__dirname, '..', 'v2', 'puzzles.js'));
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
  const T = require(path.join(__dirname, '..', 'v2', 'thinking.js'));
  assert.strictEqual(typeof T.create, 'function');
  const code = require('node:fs').readFileSync(path.join(__dirname, '..', 'v2', 'thinking.js'), 'utf8');
  assert.match(code, /\$s\.style\.transform = /);
  assert.ok(!/\/\/[^\n]*\$s\.style\.transform/.test(code), 'transform 那一行被注释吞了');
});
test('进度：旧存档没有 think 字段也能读，不写入任何东西；3 题开放下一个技能', () => {
  const old = {v: 2, cards: {}, mistakes: {}}, snap = JSON.stringify(old);
  const p0 = P.progress(old, 'balance');
  assert.deepStrictEqual(p0.n, [0, 0, 0, 0]); assert.strictEqual(p0.tier, 0); assert.strictEqual(p0.passed, 0);
  assert.strictEqual(JSON.stringify(old), snap, '读进度不能改存档');
  const S = {v: 2};
  assert.strictEqual(P.record(S, 'balance', 0), false); P.record(S, 'balance', 0);
  assert.strictEqual(P.record(S, 'balance', 0), true, '第 3 题刚好学会');
  assert.strictEqual(P.record(S, 'balance', 0), false, '再做不算又学会一次');
  assert.strictEqual(P.progress(S, 'balance').tier, 1);
  assert.strictEqual(P.progress(S, 'target').tier, 0, '模块之间互不影响');
  S.think.block = [9, 9, 9, 9];
  const all = P.progress(S, 'block'); assert.strictEqual(all.tier, 3); assert.strictEqual(all.passed, 4);
  assert.deepStrictEqual(P.progress({think: {clue: 'bad'}}, 'clue').n, [0, 0, 0, 0], '坏数据当 0');
});
test('岛：4 个新地点在岛内、互不重叠，id 不和练习板块冲突，排课不会把今天的地方指过去', () => {
  const W = require(path.join(__dirname, '..', 'v2', 'world.js'));
  const ids = P.MODULES.map(m => m.id);
  ids.forEach(id => { const z = W.ZONES.find(x => x.id === id); assert.ok(z && z.x < W.WW - 40, id); });
  assert.strictEqual(new Set(W.ZONES.map(z => z.id)).size, W.ZONES.length);
  assert.strictEqual(W.WW % 8, 0, '地面按 8 像素一列，宽度要能整除');
  const xs = W.ZONES.map(z => z.x); xs.forEach((x, i) => { if (i) assert.ok(x - xs[i - 1] >= 100, '地点太挤 ' + x); });
});
test('thinking.js 的 id 不和页面其他元素重名（11-06 审查：check 重名，进过工坊后秒答的对勾消失）', () => {
  const fs = require('node:fs'), dir = path.join(__dirname, '..', 'v2');
  const ids = f => new Set([...fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map(m => m[1]));
  const mine = ids('thinking.js');
  ['index.html', 'house.js', 'world.js'].forEach(f => { const dup = [...ids(f)].filter(x => mine.has(x)); assert.deepStrictEqual(dup, [], f + ' 里重名'); });
});
test('导入进度只增不减：思维进度按技能取大，本机和备份各自有的都保留（硬约束：进度绝不能丢）', () => {
  const C = require(path.join(__dirname, '..', 'v2', 'core.js'));
  const A = C.blank(), B = C.blank();
  A.think = {balance: [3, 0, 0, 0], target: [1, 0, 0]};
  B.think = {balance: [3, 3, 1, 0], clue: [3, 0, 0, 0]};
  const M = C.importMerge(A, C.exportText(B));
  assert.deepStrictEqual(M.think, {balance: [3, 3, 1, 0], target: [1, 0, 0], clue: [3, 0, 0, 0]});
  assert.strictEqual(C.importMerge(C.blank(), C.exportText(C.blank())).think, undefined, '都没有就不写字段');
  const N = C.blank(); N.think = {balance: [2, 0, 0, 0]};
  assert.deepStrictEqual(C.importMerge(C.blank(), C.exportText(N)).think, {balance: [2, 0, 0, 0]}, '新设备导入带上思维进度');
});
