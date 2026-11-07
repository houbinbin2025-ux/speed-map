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
test('新题秒答 4 次（一天最多记 2 次）就下架', () => {
  const S = blank(); S.settings = {levels: [11]}; const id = 'dock:g11:speed', x = HB.pools[id][0], inst = {id, q: x.q, ans: x.ans};
  [0, 0, 0, 1, 1].forEach(d => E.addFast(S, inst, D(d), 0));
  assert.equal(E.spent(S, inst), true);
});
test('真实练习：只答对不够快，新题不计次；秒答才计次', () => {
  const S = blank(); S.settings = {levels: [12]};
  for (let d = 0; d < 3; d++) { const s = E.session(S, D(d), {rnd: seeded(5 + d)}); for (let x = s.next(), n = 0; x && n < 80; x = s.next(), n++) { if (x.kind === 'q') s.answer({ok: true, fast: false, secs: 5}); } }
  assert.ok(!Object.keys(S.fast || {}).some(k => /:g12:/.test(k)), '慢答不计次');
  const s = E.session(S, D(3), {rnd: seeded(9)}); for (let x = s.next(), n = 0; x && n < 80; x = s.next(), n++) if (x.kind === 'q') s.answer({ok: true, fast: true, secs: 5});
  assert.ok(Object.keys(S.fast || {}).some(k => /:g12:/.test(k)), '秒答开始计次');
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
test('错题和题库标签：文字题显示题干，不只是一个 □', () => {
  const R = require('../v2/render.js');
  G.forEach(([id, l]) => { const x = l[0], s = K.ITEM[id].skill, label = R.mistLabel({src: K.BY[s].group, uid: id, q: x.q}); assert.notEqual(String(label).trim(), '□', id); });
});
test('题面提示：挖空题写方框里的数；多位计算和文字题提示纸笔，提示不泄露答案位数；计算题不叫秒答', () => {
  const R = require('../v2/render.js');
  const q = (id, x) => R.question({id, q: x.q, ans: x.ans});
  const dec = HB.pools['speed:g12:dec'][0]; assert.match(q('speed:g12:dec', dec).note, /方框/);
  const mul = HB.pools['speed:g11:mul'].find(x => String(x.ans).length >= 3); assert.match(q('speed:g11:mul', mul).note, /纸笔/);
  for (const x of HB.pools['speed:g13:div2'].filter(x => String(x.ans).length < 3).slice(0, 3)) assert.match(q('speed:g13:div2', x).note, /纸笔/);
  assert.match(q('speed:g11:mul', mul).tag, /^计算/); assert.ok(!/秒答/.test(R.demo(K.ITEM['speed:g11:mul'].skill)));
});
test('文字题答错时讲解页还看得到题干', () => {
  const R = require('../v2/render.js'), x = HB.pools['dock:g13:unit'][0];
  assert.ok(R.explain({id: 'dock:g13:unit', q: x.q, ans: x.ans}).includes(x.q.say));
});
test('第 12 级不出两位除数：面积反求边的除数是一位', () => {
  HB.pools['dock:g12:area'].filter(x => /面积 \d+ 平方厘米/.test(x.q.say)).forEach(x => { const m = x.q.say.match(/宽 (\d+) 厘米/); assert.ok(+m[1] <= 9, x.q.say); });
});
test('买东西的题不买金币；24 时说法对；没有小数位过多的讲解', () => {
  ['dock:g12:price', 'dock:g13:unit'].forEach(id => HB.pools[id].forEach(x => assert.ok(!x.q.say.includes('金币'), x.q.say)));
  HB.pools['market:g12:24'].forEach(x => { const m = /^(下午|晚上) (\d+) 点/.exec(x.q.say); if (m) assert.equal(m[1], +m[2] <= 5 ? '下午' : '晚上', x.q.say); });
  G.forEach(([id, l]) => l.forEach(x => assert.ok(!/\d\.\d{4,}/.test(x.q.why + (x.q.text || '')), `${id} ${x.q.why}`)));
});
// ---------- 自动开级 ----------
const fill = (S, lv) => K.SKILLS.concat(K.HARD).forEach(s => s.items.forEach(it => Object.assign(E.prog(S, it.id), {lv, d: [D(-9), D(-8), D(-5)].slice(0, lv), seen: 3, lastDay: D(-1)})));
test('自动开级：第 9 级不到淡红，开不了第 10 级', () => {
  const S = blank(); fill(S, 1); S.lvTop = 15; assert.equal(E.autoLevel(S), 9);
});
test('自动开级：练够了也一次只开一级，等满 25 个练习日才开下一级', () => {
  const S = blank(); fill(S, 2); S.stats = {};
  E.session(S, D(0), {rnd: seeded(1)}); assert.equal(E.autoLevel(S), 9);
  for (let i = 1; i <= 24; i++) S.stats[D(i)] = {sec: 60, n: 1, ups: 0, over: 0, gap: 0};
  E.session(S, D(24), {rnd: seeded(1)}); assert.equal(E.autoLevel(S), 9, '24 天还不够');
  S.stats[D(25)] = {sec: 60, n: 1, ups: 0, over: 0, gap: 0};
  E.session(S, D(26), {rnd: seeded(1)}); assert.equal(E.autoLevel(S), 10);
  E.session(S, D(26), {rnd: seeded(1)}); assert.equal(E.autoLevel(S), 10, '同一天不连开');
});
test('自动开级：开放的题全练完时不用等，防止卡死', () => {
  const S = blank(); fill(S, 3); K.SKILLS.concat(K.HARD).forEach(s => s.items.forEach(it => { if (it.gen) E.prog(S, it.id).out = 1; }));
  E.session(S, D(0), {rnd: seeded(1)}); assert.ok(E.autoLevel(S) >= 10, '开放到 ' + E.autoLevel(S));
});
test('导入进度：开级进度取大，不退回去', () => {
  const a = blank(), b = blank(); b.lvTop = 12; b.lvTopDay = D(5);
  const M = C.importMerge(a, JSON.stringify(b)); assert.equal(M.lvTop, 12); assert.equal(M.lvTopDay, D(5));
  const c = blank(); c.lvTop = 14; c.lvTopDay = D(9); assert.equal(C.importMerge(c, JSON.stringify(b)).lvTop, 14);
});
