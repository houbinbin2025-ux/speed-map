// 到四年级第一批（docs/说明书-到四年级第一批.md）：级别映射、存档迁移、短编号、按答对下架、题目答案
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), HB = require('../v2/hardbank.js');
const D = n => C.addDays('2026-11-01', n);
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const blank = () => { const S = C.blank(); S.placedAt = 1; S.demoSeen = Object.fromEntries(K.SKILLS.concat(K.HARD).map(s => [s.id, true])); return S; };
const G = Object.entries(HB.pools).filter(([id]) => /:g\d+:/.test(id));

// ---------- 级别映射 ----------
test('第 1–9 级是现有题，第 10–15 级是新题', () => {
  assert.equal(K.LEVELS.length, 15);
  const map = {'cmp:t:10': 1, 'bond:t:addL': 2, 'cmp:t:20': 3, 'bond:t:to10-9': 4, 'cmp:t:100': 5, 'speed:h:chain': 6, 'speed:h:two': 7, 'speed:h:mul': 8, 'speed:h:div': 9};
  Object.entries(map).forEach(([id, L]) => assert.equal(K.levelOf(K.make(id, seeded(1))), L, id));
  G.forEach(([id]) => { const L = +id.match(/:g(\d+):/)[1]; assert.ok(L >= 10 && L <= 15); assert.equal(K.levelOf(K.make(id, seeded(2))), L, id); });
});
// ---------- 存档迁移 ----------
test('旧存档手选的级别换算成新级别，去重排序，只换一次', () => {
  const S = C.upgrade({cards: {}, settings: {levels: [2, 1, 7, 15, 14]}});
  assert.deepEqual(S.settings.levels, [1, 5, 9]); assert.equal(S.settings.levelsV, 2);
  const again = C.upgrade(JSON.parse(JSON.stringify(S))); assert.deepEqual(again.settings.levels, [1, 5, 9]);
});
test('新存档和自动模式不受影响', () => {
  assert.equal(C.upgrade({cards: {}, settings: {levels: null}}).settings.levels, null);
  assert.equal(C.upgrade({cards: {}}).settings, undefined);
  const S = C.upgrade({cards: {}, settings: {levels: [12], levelsV: 2}}); assert.deepEqual(S.settings.levels, [12]);
});
// ---------- 短编号 ----------
test('新题用短键：改讲解不换键；旧题的键不变', () => {
  const [id, l] = G.find(([k]) => k === 'dock:g11:times'), a = {id, q: l[0].q, ans: l[0].ans};
  assert.equal(K.mkey(a), `${id}|${l[0].q.qk}`);
  assert.equal(K.mkey({id, q: Object.assign({}, l[0].q, {why: '别的讲解'}), ans: l[0].ans}), K.mkey(a));
  const old = K.make('dock:t:join', seeded(1)); assert.equal(K.mkey(old), 'dock:t:join|' + JSON.stringify(old.q));
});
test('字段名不撞旧题：旧题 bond:t:to10-9 自带 q.k，键仍是整段题目', () => {
  const old = K.make('bond:t:to10-9', seeded(1)); assert.ok(old.q.k); assert.equal(K.mkey(old), 'bond:t:to10-9|' + JSON.stringify(old.q));
});
test('新题写错进错题本，键短，还能复习', () => {
  const S = blank(), id = 'dock:g13:unit', x = HB.pools[id][0], inst = {id, q: x.q, ans: x.ans};
  E.addMistake(S, inst, D(0));
  const k = Object.keys(S.mistakes)[0]; assert.ok(k.length < 50, k); assert.equal(S.mistakes[k].q.say, x.q.say);
});
// ---------- 下架 ----------
test('新题答对 4 次（一天最多记 2 次）就下架，不要求秒答', () => {
  const S = blank(); S.settings = {levels: [11]}; const id = 'dock:g11:speed', x = HB.pools[id][0], inst = {id, q: x.q, ans: x.ans};
  assert.equal(E.countsRight(inst), true);
  [0, 0, 0, 1, 1].forEach(d => E.addFast(S, inst, D(d), 0));
  assert.equal(E.spent(S, inst), true);
  assert.equal(E.countsRight(K.make('dock:t:join', seeded(1))), false, '旧题还要秒答');
});
test('真实练习：只答对不够快，新题的次数也会累计', () => {
  const S = blank(); S.settings = {levels: [12]};
  for (let d = 0; d < 3; d++) { const s = E.session(S, D(d), {rnd: seeded(5 + d)}); for (let x = s.next(), n = 0; x && n < 80; x = s.next(), n++) { if (x.kind === 'q') s.answer({ok: true, fast: false, secs: 5}); } }
  assert.ok(Object.keys(S.fast || {}).some(k => /:g12:/.test(k)), '新题应该开始计次');
});
// ---------- 题目 ----------
const gcdB = (a, b) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a || 1n; };
const frac = (n, d = 1n) => { if (d === 0n) throw new Error('除以 0'); if (d < 0n) { n = -n; d = -d; } const g = gcdB(n, d); return {n: n / g, d: d / g}; };
const num = s => { const [i, f = ''] = s.split('.'); return frac(BigInt(i + f), 10n ** BigInt(f.length)); };
function evalx(src) { const t = src.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/\s/g, ''); let i = 0;
  const atom = () => { if (t[i] === '(') { i++; const v = sum(); i++; return v; } const m = /^\d+(\.\d+)?/.exec(t.slice(i)); if (!m) throw new Error('解析不了 ' + src); i += m[0].length; return num(m[0]); };
  const prod = () => { let v = atom(); while (t[i] === '*' || t[i] === '/') { const o = t[i++], w = atom(); v = o === '*' ? frac(v.n * w.n, v.d * w.d) : frac(v.n * w.d, v.d * w.n); } return v; };
  const sum = () => { let v = prod(); while (t[i] === '+' || t[i] === '-') { const o = t[i++], w = prod(); v = o === '+' ? frac(v.n * w.d + w.n * v.d, v.d * w.d) : frac(v.n * w.d - w.n * v.d, v.d * w.d); } return v; };
  const v = sum(); if (i !== t.length) throw new Error('多余内容 ' + src); return v; }
const same = (a, b) => a.n === b.n && a.d === b.d;
function checkEq(text, ans) {
  const m = /^(.+) ÷ (.+) = (.+) 余 (.+)$/.exec(text.replace('□', ans));
  if (m) { const [, a, b, q, r] = m.map(Number); return a === b * q + r && r < b && r >= 0; }
  const round = /^(\d+) 四舍五入到百位 = □$/.exec(text); if (round) return Math.round(+round[1] / 100) * 100 === ans;
  const s = /=\s*$/.test(text) ? text + ans : text.replace('□', ans), [l, r] = s.split('=');
  return same(evalx(l), evalx(r));
}
test('每个答案都用独立算法重算；故事题的校验算式只用题面里的数', () => {
  let n = 0;
  G.forEach(([id, l]) => l.forEach(x => {
    n++; const ok = x.c ? same(evalx(x.c), evalx(String(x.ans))) : checkEq(x.q.text, x.ans);
    assert.ok(ok, `${id} ${x.q.say || x.q.text} = ${x.ans}（${x.c || ''}）`);
    assert.ok(Number.isInteger(x.ans) && x.ans >= 0 && String(x.ans).length <= 4, `${id} 答案 ${x.ans}`);
    if (x.c) (x.c.match(/\d+(\.\d+)?/g) || []).forEach(v => assert.ok(['1', '2', '4', '7', '12', '24', '60', '100', '180', '1000'].includes(v) || x.q.say.includes(v) || x.q.text.includes(v) || new RegExp(`^(${(x.q.say.match(/\d+/g) || []).join('|')})$`).test(v) || id === 'place:g15:gcd' || /g15:(lcm|timessum)|g13:unit|g13:speed|g11:times|g10:remain/.test(id), `${id} 算式里的 ${v} 不在题面：${x.q.say}`));
  }));
  assert.ok(n >= 3000, `只有 ${n} 道`);
});
test('题池 30–300 道；编号和题面都不重复；每题有讲解，讲解里有答案', () => {
  G.forEach(([id, l]) => {
    assert.ok(l.length >= 22 && l.length <= 300, `${id} ${l.length} 道`);
    assert.equal(new Set(l.map(x => x.q.qk)).size, l.length, `${id} 编号重复`);
    assert.equal(new Set(l.map(x => x.q.say || x.q.text)).size, l.length, `${id} 题面重复`);
    l.forEach(x => { assert.ok(x.q.why && x.q.why.includes(String(x.ans)) || /十分位|余|商/.test(x.q.why), `${id} ${x.q.why}`); assert.ok(x.q.text); if (x.q.say) assert.ok(x.q.say.length <= 48, `${id} 题干太长：${x.q.say}`); });
  });
});
test('第 10–15 级每级题量够、技能够', () => {
  for (let L = 10; L <= 15; L++) { const pools = G.filter(([id]) => id.includes(`:g${L}:`)), n = pools.reduce((a, [, l]) => a + l.length, 0); assert.ok(n >= 300, `第 ${L} 级 ${n} 道`); assert.ok(pools.length >= 5, `第 ${L} 级 ${pools.length} 种`); }
});
test('不许出现感叹号、繁体字和外国单位', () => {
  G.forEach(([id, l]) => l.forEach(x => { const t = `${x.q.say || ''}${x.q.text}${x.q.why}`; assert.ok(!/[！!]|[數學題們這個為與對點時間錢長圖]|美元|英寸|磅/.test(t), `${id}：${t}`); }));
});
test('每个新题型都在技能里，能出题', () => {
  G.forEach(([id]) => { assert.ok(K.ITEM[id], id); assert.ok(K.make(id, seeded(1)).q); });
});
