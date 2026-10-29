// 题库（v2/bank.js）：「够学会」五条标准 S1–S5 + 旧进度、旧错题不丢（说明书-题库 §2、§6）
const test = require('node:test'), assert = require('node:assert');
const B = require('../v2/bank.js'), C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), R = require('../v2/render.js');
const OLD = require('./fixtures/items-before.json');
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const key = q => JSON.stringify(Object.keys(q).sort().map(k => [k, q[k]]));

// 每个理解题型"能出的全部题"——照原来的生成器规则在测试里另写一遍（不用 bank 的代码）
const pairs = (lo, hi) => range(lo, hi).flatMap(a => range(lo, hi).filter(b => b !== a).map(b => ({a, b})));
const DOMAIN = {
  'bond:t:whole5': range(2, 5).flatMap(n => range(1, n - 1).map(a => ({n, a, b: n - a, blank: 'whole'}))),
  'bond:t:whole9': range(6, 9).flatMap(n => range(1, n - 1).map(a => ({n, a, b: n - a, blank: 'whole'}))),
  'cmp:t:10': pairs(1, 10), 'cmp:t:20': pairs(1, 20), 'cmp:t:100': pairs(10, 99),
  'cmp:t:swap': range(1, 9).flatMap(t => range(1, 9).filter(o => o !== t).map(o => ({a: t * 10 + o, b: o * 10 + t}))),
  'line:t:10': range(1, 9).map(t => ({max: 10, target: t})), 'line:t:20': range(1, 19).map(t => ({max: 20, target: t})),
  'line:t:100t': range(1, 9).map(k => ({max: 100, target: k * 10})), 'line:t:100': range(1, 99).map(t => ({max: 100, target: t, any: true})),
  'bond:t:addL': range(2, 10).flatMap(b => range(1, b - 1).map(a => ({form: 'addL', a, b}))),
  'bond:t:addR': range(2, 10).flatMap(b => range(1, b - 1).map(a => ({form: 'addR', a, b}))),
  'bond:t:subL': range(1, 9).flatMap(a => range(1, 10 - a).map(b => ({form: 'subL', a, b}))),
  'bond:t:subR': range(2, 10).flatMap(a => range(1, a - 1).map(x => ({form: 'subR', a, b: a - x}))),
  'bond:t:to10-9': range(2, 8).map(a => ({k: 9, a})), 'bond:t:to10-8': range(3, 9).map(a => ({k: 8, a})), 'bond:t:to10-7': range(4, 9).map(a => ({k: 7, a})),
  'place:t:read': range(20, 99).map(n => ({n, tens: Math.floor(n / 10), ones: n % 10})),
  'place:t:split': range(11, 99).flatMap(n => [{n, ask: 'tens'}, {n, ask: 'ones'}]),
  'cmp:t:p1': range(10, 98).map(n => ({n, d: 1})), 'cmp:t:m1': range(11, 99).map(n => ({n, d: -1})),
  'cmp:t:p10': range(10, 89).map(n => ({n, d: 10})), 'cmp:t:m10': range(20, 99).map(n => ({n, d: -10})),
};
// 答案：另写一遍算法
function answerOf(id, q) {
  if (id.startsWith('bond:t:whole')) return q.n;
  if (id.startsWith('cmp:t:') && 'a' in q) return Math.max(q.a, q.b);
  if (id.startsWith('line:')) return q.target;
  if (id.startsWith('bond:t:to10')) return q.k + q.a - 10;
  if (q.form === 'addL' || q.form === 'addR') return q.b - q.a;
  if (q.form === 'subL') return q.a + q.b;
  if (q.form === 'subR') return q.a - q.b;
  if (id === 'place:t:read') return q.tens * 10 + q.ones;
  if (id === 'place:t:split') return q.ask === 'tens' ? Math.floor(q.n / 10) : q.n % 10;
  if ('d' in q) return q.n + q.d;
  throw new Error('没有算法：' + id);
}
// S1 难点覆盖下限（说明书 §3 表格）
const NEED = {
  'cmp:t:10': {'差 1': 18, '差 2–3': 30},
  'cmp:t:20': {'十几比十几': 72, '十几比一位数 · 13 和 3': 18, '十几比一位数': 100, '10、20 比一位数 · 20 和 2': 4, '10、20 比十几': 36, '一位数比一位数': 72},
  'place:t:read': {'整十': 8},
  'place:t:split': {'问几个十 · 整十': 8, '问几个一 · 整十': 8, '问几个十 · 十几': 9, '问几个一 · 十几': 9, '问几个一 · 两位一样': 8},
  'cmp:t:100': {'十位相同 · 个位差 1': 12, '十位相同 · 个位差 2–4': 12, '十位相同 · 个位差 5 以上': 12, '十位大、个位小': 42, '十位大、个位也大': 30, '有整十': 12},
  'cmp:t:p1': {'跨十': 8}, 'cmp:t:m1': {'跨十': 8},
};
// 秒答抽样题型的难点题下限（凑成整十 / 被减数是整十 / 得数是一位数）
const HARD = {add2c: x => x.ans % 10 === 0, sub2c: x => x.a % 10 === 0, sub2n: x => x.ans < 10};

test('迁移：卡的编号、题目、答案和改造前一模一样（理解 76 张 + 秒答 200 张，顺序也一样）', () => {
  const now = {};
  Object.values(K.ITEM).filter(it => !it.gen).forEach(it => { now[it.id] = {skill: it.skill, q: it.q, ans: it.ans}; });
  assert.deepStrictEqual(now, OLD.cards);
  const sc = {}; C.UNITS.filter(u => !u.gen).forEach(u => { sc[u.id] = {L: u.L, w: u.w, a: u.a, op: u.op, b: u.b, ans: u.ans, fast: u.fast}; });
  assert.deepStrictEqual(Object.keys(sc), Object.keys(OLD.speedCards)); assert.deepStrictEqual(sc, OLD.speedCards);
});
test('迁移：题型编号一个不差，每个题型出的题字段和改造前一样（旧错题按「编号|题目数据」能对上）', () => {
  const now = Object.values(K.ITEM).filter(it => it.gen).map(it => it.id).sort();
  assert.deepStrictEqual(now, Object.keys(OLD.types).sort());
  // 字段顺序也要一样：理解题的错题键 = 编号|JSON.stringify(q)，顺序一变同一道题就成了两条错题
  Object.entries(OLD.types).forEach(([id, o]) => { for (let i = 0; i < 30; i++) assert.deepStrictEqual(Object.keys(K.make(id, Math.random).q), o.qkeys, id); });
  // 原来生成器出的错题，在新版本里拼出的错题键逐字一样
  Object.entries(OLD.types).filter(([id]) => !K.BY[K.ITEM[id].skill].speed).forEach(([id, o]) => o.mkeys.forEach(mk => {
    const q = JSON.parse(mk.slice(id.length + 1)); assert.strictEqual(K.mkey({id, q}), mk);
    const inPool = (B.pools[id] || []).find(x => JSON.stringify(x.q) === JSON.stringify(q)); if (inPool) assert.strictEqual(K.mkey({id, q: K.make(id, null, inPool).q}), mk);
  }));
});
test('迁移：不在题库池里的旧错题（原来随机出的数）照常能出题、画题面、判对错', () => {
  const old = [['cmp:t:100', {a: 47, b: 43}, 47], ['place:t:split', {n: 58, ask: 'ones'}, 8], ['cmp:t:20', {a: 7, b: 3}, 7]];
  old.forEach(([id, q, ans]) => {
    const inst = K.make(id, null, {q, ans}); assert.ok(R.question(inst).html || R.question(inst).pick, id); assert.ok(R.explain(inst).length > 20, id);
    assert.ok(K.judge(K.ITEM[id], inst, ans).ok); assert.ok(!K.judge(K.ITEM[id], inst, ans + 1).ok);
  });
  const L4 = C.BYID['L4:add2c'], g = {a: 37, b: 48}; assert.ok(L4.gen && C.TYPES.find(t => t.k === 'add2c').ok(g.a, g.b));
});
test('S2 数量：能出的题 ≤ 400 种（FULL_MAX）的题型全收；更多的抽 120 道（SAMPLE）；池里没有重复', () => {
  Object.entries(DOMAIN).forEach(([id, all]) => {
    const pool = B.pools[id], keys = pool.map(x => key(x.q));
    assert.strictEqual(new Set(keys).size, keys.length, id + ' 有重复');
    if (all.length <= B.meta.FULL_MAX) assert.deepStrictEqual(keys.slice().sort(), all.map(key).sort(), id + ' 应该全收');
    else assert.strictEqual(pool.length, B.meta.SAMPLE, id);
  });
  assert.deepStrictEqual(Object.keys(B.pools).sort(), Object.keys(DOMAIN).sort());
  Object.entries(B.speedPools).forEach(([k, p]) => {
    const keys = p.pool.map(x => x.join(','));
    assert.strictEqual(new Set(keys).size, keys.length, k);
    assert.strictEqual(p.pool.length, p.all <= B.meta.FULL_MAX ? p.all : B.meta.SAMPLE, k);
  });
});
test('S3 答案对：每道题的答案用另写的算法重算一遍', () => {
  Object.entries(B.pools).forEach(([id, pool]) => pool.forEach(x => assert.strictEqual(x.ans, answerOf(id, x.q), id + ' ' + JSON.stringify(x.q))));
  Object.values(B.cards).flat().forEach(c => assert.strictEqual(c.ans, c.q.layout ? c.q.n : c.q.n - c.q.a, c.id));
  C.UNITS.filter(u => !u.gen).forEach(u => assert.strictEqual(u.ans, u.op === '+' ? u.a + u.b : u.a - u.b, u.id));
});
test('S5 不越级：每道题都在原来的出题范围里（理解题 = 原来能出的题；秒答 = 原来的题型规则、范围、L4 至少一个数 > 50）', () => {
  Object.entries(DOMAIN).forEach(([id, all]) => { const ok = new Set(all.map(key)); B.pools[id].forEach(x => assert.ok(ok.has(key(x.q)), id + ' 越界 ' + JSON.stringify(x.q))); });
  Object.entries(B.speedPools).forEach(([k, p]) => {
    const [L, tk] = k.split(':'), t = C.TYPES.find(x => x.k === tk), R0 = L === 'L3' ? 50 : 100;
    p.pool.forEach(([a, b]) => { const ans = t.op === '+' ? a + b : a - b;
      assert.ok(t.ok(a, b) && ans >= 0 && ans <= R0 && a <= R0 && b <= R0 && (R0 === 50 || Math.max(a, b, ans) > 50), k + ` ${a}${t.op}${b}`); });
  });
});
test('S1 比大小点选：每个题型大数在左、在右各占 40%–60%（一直点一边升不了级）', () => {
  ['cmp:t:10', 'cmp:t:20', 'cmp:t:100', 'cmp:t:swap'].forEach(id => {
    const p = B.pools[id], left = p.filter(x => x.q.a > x.q.b).length / p.length;
    assert.ok(left >= 0.4 && left <= 0.6, `${id} 大数在左 ${(left * 100).toFixed(0)}%`);
  });
});
test('S1 情况齐全：有标签的题型，每道题都归进一种情况（没有"其他"）；全收的题型每种情况都在', () => {
  Object.entries(B.pools).forEach(([id, p]) => {
    const tagged = p.filter(x => x.tag).length; assert.ok(tagged === 0 || tagged === p.length, id + ' 有的题没标情况');
    assert.ok(!p.some(x => x.tag && x.tag.includes('其他')), id + ' 有"其他"类');
  });
});
test('S1 秒答抽样题型：第二个数的个位，凡是规则允许的每个值都出现；难点题至少 20 道', () => {
  Object.entries(B.speedPools).filter(([, p]) => p.all > B.meta.FULL_MAX).forEach(([k, p]) => {
    const [L, tk] = k.split(':'), t = C.TYPES.find(x => x.k === tk), R0 = L === 'L3' ? 50 : 100, ones = new Set();
    let hard = 0;
    for (let a = 1; a <= R0; a++) for (let b = 1; b <= R0; b++) { const ans = t.op === '+' ? a + b : a - b; if (ans >= 0 && ans <= R0 && t.ok(a, b) && (R0 === 50 || Math.max(a, b, ans) > 50)) { ones.add(b % 10); if (HARD[tk] && HARD[tk]({a, b, ans})) hard++; } }
    const got = new Set(p.pool.map(([, b]) => b % 10)); ones.forEach(d => assert.ok(got.has(d), `${k} 第二个数个位 ${d} 一道都没有`));
    if (HARD[tk]) { const n = p.pool.filter(([a, b]) => HARD[tk]({a, b, ans: t.op === '+' ? a + b : a - b})).length; assert.ok(n >= Math.min(20, hard), `${k} 难点题 ${n}`); }
  });
});
test('S1 覆盖：每个难点情况的题量不少于下限；秒答抽样题型每个十位都有题', () => {
  Object.entries(NEED).forEach(([id, need]) => {
    const n = {}; B.pools[id].forEach(x => { n[x.tag] = (n[x.tag] || 0) + 1; });
    Object.entries(need).forEach(([tag, min]) => assert.ok((n[tag] || 0) >= min, `${id} · ${tag}：${n[tag] || 0} < ${min}`));
  });
  Object.entries(B.speedPools).filter(([, p]) => p.all > B.meta.FULL_MAX).forEach(([k, p]) => {
    const [L, tk] = k.split(':'), t = C.TYPES.find(x => x.k === tk), R0 = L === 'L3' ? 50 : 100, tens = new Set();
    for (let a = 1; a <= R0; a++) for (let b = 1; b <= R0; b++) { const ans = t.op === '+' ? a + b : a - b; if (ans >= 0 && ans <= R0 && t.ok(a, b) && (R0 === 50 || Math.max(a, b, ans) > 50)) tens.add(Math.floor(a / 10)); }
    const got = new Set(p.pool.map(([a]) => Math.floor(a / 10)));
    tens.forEach(d => assert.ok(got.has(d), `${k} 缺 ${d}0 多的题`));
  });
});
test('S4 有讲解：题库里每一道题都能画出题面和答错图解；每个理解技能都有示范卡和给家长的说明', () => {
  Object.values(K.ITEM).forEach(it => {
    const list = it.gen ? (B.pools[it.id] || []).map(x => ({id: it.id, q: x.q, ans: x.ans})) : [{id: it.id, q: it.q, ans: it.ans}];
    if (it.gen && !B.pools[it.id]) list.push(K.make(it.id, Math.random));
    list.forEach(inst => { const q = R.question(inst); assert.ok((q.html && q.html.length > 10) || q.pick, it.id); assert.ok(R.explain(inst).length > 20, it.id + ' 没有图解'); });
  });
  K.understand.forEach(s => { assert.ok(R.demo(s.id) && R.demo(s.id).length > 20, s.id + ' 没有示范卡'); assert.ok(B.text[s.id] && B.text[s.id][0] && B.text[s.id][1], s.id + ' 没有家长说明'); });
  ['speedL1', 'speedL2', 'speedL3', 'speedL4'].forEach(k => assert.ok(B.text[k], k));
});
test('出题：发牌——同一题型一轮把池里的题发完才重来（一轮里不重复），换轮时也不连着出同一道', () => {
  C._resetDecks();
  ['cmp:t:10', 'line:t:100t', 'bond:t:to10-7', 'cmp:t:100', 'place:t:split'].forEach(id => {
    const n = B.pools[id].length, got = [];
    for (let i = 0; i < n * 3; i++) got.push(key(K.make(id, Math.random).q));
    for (let r = 0; r < 3; r++) assert.strictEqual(new Set(got.slice(r * n, r * n + n)).size, n, id + ' 第 ' + (r + 1) + ' 轮有重复');
    for (let i = 1; i < got.length; i++) assert.notStrictEqual(got[i], got[i - 1], id + ' 连着出了同一道');
  });
  const u = C.BYID['L4:add2c'], n = B.speedPools['L4:add2c'].pool.length, seen = new Set();
  for (let i = 0; i < n; i++) { const g = u.gen(); seen.add(g.a + '+' + g.b); }
  assert.strictEqual(seen.size, n, '秒答题型一轮里有重复');
});
test('S4 秒答讲解：20 以内及以上的进位、退位题都有一句讲解，讲解最后的得数就是答案', () => {
  const all = C.UNITS.filter(u => !u.gen).map(u => [u.a, u.op, u.b, u.L]);
  Object.entries(B.speedPools).forEach(([k, p]) => p.pool.forEach(([a, b]) => all.push([a, C.BYID[k].op, b, 9])));
  all.forEach(([a, op, b, L]) => {
    const ans = op === '+' ? a + b : a - b, w = R.speedWhy(a, op, b), carry = op === '+' ? a % 10 + b % 10 >= 10 : b % 10 > a % 10;
    if (carry && L > 0) assert.ok(w, `${a}${op}${b} 没有讲解`);
    if (w) assert.ok(w.endsWith(' ' + ans), `${a}${op}${b} 讲解是「${w}」`);
  });
  assert.strictEqual(R.speedWhy(40, '-', 3), '40 拿出 1 个十：10 − 3 = 7，30 + 7 = 37');
  assert.strictEqual(R.speedWhy(28, '+', 5), '28 先加 2 凑成 30，再加 3，是 33');
  assert.strictEqual(R.speedWhy(20, '-', 11), '先减几个十：20 − 10 = 10；再减 1：10 − 1 = 9');
  assert.strictEqual(R.speedWhy(2, '+', 9), '从大的 9 开始：9 先加 1 凑成 10，再加 1，是 11');
});
test('发牌进度跟着存档走：发到一半关掉重开（存档序列化再读回），这一轮剩下的接着发，整轮不重复', () => {
  ['cmp:t:100', 'L4:add2c'].forEach(id => {
    const deck = C.useDecks({}), n = id.startsWith('L4') ? B.speedPools[id].pool.length : B.pools[id].length, got = [];
    const draw = () => { if (id.startsWith('L4')) { const g = C.BYID[id].gen(); got.push(g.a + '+' + g.b); } else got.push(key(K.make(id, Math.random).q)); };
    for (let i = 0; i < 50; i++) draw();
    C.useDecks(JSON.parse(JSON.stringify(deck)));            // = 关掉页面，下次从存档读回
    for (let i = 50; i < n; i++) draw();
    assert.strictEqual(new Set(got).size, n, id + ' 重开后这一轮有重复');
    draw(); assert.notStrictEqual(got[n], got[n - 1], id + ' 换轮时连着出了同一道');
  });
  C.useDecks({});
});
test('比大小、前后数答错图解：两个数挨得近时，标签不叠在一起（只画那几个十，太近就把左边的标到上一层）', () => {
  [[35, -1], [39, 1], [47, 10]].forEach(([n, d]) => { const h = R.explain({id: d === 1 ? 'cmp:t:p1' : d === -1 ? 'cmp:t:m1' : 'cmp:t:p10', q: {n, d}, ans: n + d}); if (Math.abs(d) === 1) assert.ok(/mk [a-z]* ?up|mk up|class="mk from up"|class="mk win up"/.test(h), `${n}${d > 0 ? '+' : ''}${d} 两个数没错开`); });
  [[21, 17], [44, 45], [12, 13], [98, 89], [3, 4]].forEach(([a, b]) => {
    const h = R.explain({id: a > 20 || b > 20 ? 'cmp:t:100' : a > 10 || b > 10 ? 'cmp:t:20' : 'cmp:t:10', q: {a, b}, ans: Math.max(a, b)});
    const ends = [...h.matchAll(/class="end [lr]">(\d+)</g)].map(m => +m[1]), lo = Math.min(a, b), hi = Math.max(a, b);
    assert.ok(ends[0] <= lo && hi <= ends[1], `${a} 和 ${b} 不在线上`);
    if ((hi - lo) / (ends[1] - ends[0]) < 0.14) assert.ok(/class="mk up"/.test(h), `${a} 和 ${b} 太近却没错开`);
    if (hi > 20) assert.ok(ends[1] - ends[0] <= 30, `${a} 和 ${b} 画了整条 0—100`);
  });
});
test('示范卡用固定例题：前面出过什么题都不影响', () => {
  const a = R.demo('cmp3'); for (let i = 0; i < 7; i++) K.make('cmp:t:100', Math.random); assert.strictEqual(R.demo('cmp3'), a);
});
test('页面按 bank → core → ink → skills → engine → render → world 的顺序加载；没有题库时 core 明确报错', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '../v2/index.html'), 'utf8');
  const order = [...html.matchAll(/<script src="([a-z]+)\.js\?v=\d+"><\/script>/g)].map(m => m[1]);
  assert.deepStrictEqual(order, ['bank', 'core', 'ink', 'skills', 'engine', 'render', 'world']);
  const src = require('fs').readFileSync(require('path').join(__dirname, '../v2/core.js'), 'utf8'), sandbox = {};
  assert.throws(() => new Function('self', 'module', src)(sandbox, undefined), /题库 bank\.js 没有加载/);
});
test('前置：50 以内进位加法要先会 20 以内进位加法，退位减法同理（28 + 5 用到 8 + 5）', () => {
  assert.deepStrictEqual(K.BY['speed:L3:0'].pre, ['place2', 'speed:L2:1', 'speed:L2:2', 'speed:L2:3']);
  assert.deepStrictEqual(K.BY['speed:L3:1'].pre, ['place2', 'speed:L2:4', 'speed:L2:5', 'speed:L2:6', 'speed:L2:7']);
  assert.ok(K.topoOk());
});
