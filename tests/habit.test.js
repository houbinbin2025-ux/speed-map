// 习惯记录（docs/说明书-习惯记录.md）：只记录；熟题失误、不会、再来一次、书写评分
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), I = require('../v2/ink.js');
const D = n => C.addDays('2026-11-01', n);
const blank = () => { const S = C.blank(); S.placedAt = 1; S.demoSeen = Object.fromEntries(K.SKILLS.concat(K.HARD).map(s => [s.id, true])); return S; };
// 真实排课：按 ans 给的规则答完一次今日练习，返回出过的题
function play(S, day, ans, n = 300) {
  const s = E.session(S, day, {rnd: (x => () => (x = (x * 16807) % 2147483647) / 2147483647)(5)}), qs = [];
  for (let x = s.next(), g = 0; x && g < n; x = s.next(), g++) { if (x.kind !== 'q') continue; qs.push(x); s.answer(Object.assign({secs: 3}, ans(x))); }
  return qs;
}
const typeIt = K.SKILLS.find(s => s.nb && s.input === 'write').items[0];
const inst = () => K.make(typeIt.id, () => 0);

test('旧存档没有记录字段：汇总全是 0，不报错', () => {
  const h = E.habit(blank(), D(0));
  assert.equal(h.now.a, 0); assert.equal(h.now.ks, 0); assert.equal(h.now.days, 0); assert.deepEqual(h.slips, []);
});
test('作答计入：答对、答错、不会分开算', () => {
  const S = blank(), i = inst();
  E.noteAnswer(S, D(0), i, {ok: true, secs: 4}, false);
  E.noteAnswer(S, D(0), i, {ok: false, secs: 4}, false);
  E.noteAnswer(S, D(0), i, {ok: false, dunno: true, secs: 4}, false);
  const h = S.stats[D(0)].h;
  assert.equal(h.a, 3); assert.equal(h.r, 1); assert.equal(h.d, 1);
});
test('熟题答错才算失误；点「不会」和还没会的题不算', () => {
  const S = blank(), i = inst();
  E.noteAnswer(S, D(0), i, {ok: false}, true);
  E.noteAnswer(S, D(0), i, {ok: false, dunno: true}, true);
  E.noteAnswer(S, D(0), i, {ok: false}, false);
  E.noteAnswer(S, D(0), i, {ok: true}, true);
  const h = S.stats[D(0)].h;
  assert.equal(h.k, 2); assert.equal(h.ks, 1); assert.equal(S.slips.length, 1);
});
test('熟题的定义：格子到淡红，或这道题在不同的日子算过 2 次秒答', () => {
  const S = blank(), i = inst();
  assert.equal(E.isKnown(S, i, 0), false);
  assert.equal(E.isKnown(S, i, 1), false);
  assert.equal(E.isKnown(S, i, 2), true);
  E.addFast(S, i, D(0), 0); assert.equal(E.isKnown(S, i, 0), false);
  E.addFast(S, i, D(0), 0); assert.equal(E.isKnown(S, i, 0), false, '同一天 2 次不算');
  E.addFast(S, i, D(1), 0); assert.equal(E.isKnown(S, i, 0), true, '第 3 次一定跨天');
  const S2 = blank(); E.addFast(S2, i, D(0), 0); E.addFast(S2, i, D(1), 0); assert.equal(E.isKnown(S2, i, 0), true, '两天各 1 次');
});
test('isKnown 只读：不创建进度和秒答记录', () => {
  const S = blank(), before = JSON.stringify(S); E.isKnown(S, inst(), 0); assert.equal(JSON.stringify(S), before);
});
test('秒答失误保留加减号，错题标签不变号', () => {
  const R = require('../v2/render.js'), S = blank(), id = C.unitsOf(0).find(u => u.op === '+' && !u.gen).id;
  E.noteAnswer(S, D(0), {id, q: {a: 3, op: '+', b: 6}, ans: 9}, {ok: false}, true);
  assert.equal(S.slips[0].op, '+'); assert.match(R.mistLabel(E.habit(S, D(0)).slips[0]), /3 \+ 6/);
});
test('文字题用时优先用不含反馈的时间', () => {
  const S = blank(), i = {id: typeIt.id, q: {say: '一共几个？'}, ans: 3};
  E.noteAnswer(S, D(0), i, {ok: false, secs: 13, readSecs: 10}, false); assert.equal(S.stats[D(0)].h.ws, 10);
});
test('坏数据不让汇总报错', () => {
  const S = blank(); S.slips = {}; assert.deepEqual(E.habit(S, D(0)).slips, []);
  E.noteAnswer(S, D(0), inst(), {ok: false}, true);   // 不抛错
});
test('导入合并：习惯记录按天取大，最近失误合并去重，其他统计不变', () => {
  const a = blank(), b = blank();
  a.stats = {[D(0)]: {sec: 5, n: 1, ups: 0, over: 0, gap: 0, h: {a: 2, ks: 1, ds: {5: [3, 240]}}}}; a.slips = [{d: D(0), uid: 'x'}];
  b.stats = {[D(0)]: {sec: 9, n: 9, ups: 0, over: 0, gap: 0, h: {a: 1, ks: 3, ds: {5: [1, 90], 3: [2, 150]}}}, [D(1)]: {sec: 7, n: 2, ups: 0, over: 0, gap: 0, h: {a: 4}}, [D(2)]: {sec: 7, n: 2, ups: 0, over: 0, gap: 0}}; b.slips = [{d: D(0), uid: 'x'}, {d: D(1), uid: 'y'}];
  const M = C.importMerge(a, JSON.stringify(b));
  assert.deepEqual(M.stats[D(0)].h, {a: 2, ks: 3, ds: {5: [3, 240], 3: [2, 150]}}); assert.equal(M.stats[D(0)].sec, 5, '原有统计不合并');
  assert.deepEqual(M.stats[D(1)].h, {a: 4}); assert.equal(M.stats[D(1)].sec, 0); assert.equal(M.stats[D(2)], undefined);
  assert.equal(M.slips.length, 2); assert.equal(M.slips[1].uid, 'y');
});
test('最近失误最多留 30 道，留新的；能给错题标签用', () => {
  const S = blank(), i = inst();
  for (let k = 0; k < 40; k++) E.noteAnswer(S, D(k), i, {ok: false}, true);
  assert.equal(S.slips.length, 30); assert.equal(S.slips[29].d, D(39)); assert.equal(S.slips[0].uid, i.id);
});
test('真实练习：作答被记录；再来一次和看提示不计', () => {
  const S = blank();
  const qs = play(S, D(0), () => ({ok: false, fast: false}));
  const h = S.stats[D(0)].h, first = qs.filter(x => !x.retry).length;
  assert.ok(first > 0); assert.equal(h.a, first, '再来一次不计入作答');
  const S2 = blank(); play(S2, D(0), () => ({ok: true, fast: true, peeked: true}));
  assert.equal(((S2.stats[D(0)] || {}).h || {}).a || 0, 0, '看过提示不计入作答');
});
test('文字题记录用时；近 14 天汇总，和前 14 天比', () => {
  const S = blank(), i = {id: typeIt.id, q: {say: '一共几个？'}, ans: 3};
  E.noteAnswer(S, D(0), i, {ok: true, secs: 10}, false);
  E.noteAnswer(S, D(20), i, {ok: true, secs: 20}, true);
  E.noteAnswer(S, D(20), i, {ok: false, secs: 30}, true);
  const h = E.habit(S, D(20));
  assert.equal(h.now.a, 2); assert.equal(h.now.r, 1); assert.equal(h.now.k, 2); assert.equal(h.now.ks, 1); assert.equal(h.now.days, 1); assert.equal(h.now.ws, 50); assert.equal(h.now.wn, 2);
  assert.equal(h.prev.a, 1); assert.equal(h.prev.days, 1);
});
test('书写和朗读计入当天', () => {
  const S = blank();
  E.noteInk(S, D(0), [80, 60], true, ['5', '3']); E.noteInk(S, D(0), [40], false, ['5']); E.noteSay(S, D(0));
  const h = S.stats[D(0)].h;
  assert.deepEqual(h.ds, {5: [2, 120], 3: [1, 60]}, '按数字分别记');
  assert.deepEqual(E.habit(S, D(0)).now.ds, {5: [2, 120], 3: [1, 60]});
  assert.equal(h.in, 3); assert.equal(h.is, 180); assert.equal(h.ia, 2); assert.equal(h.ic, 1); assert.equal(h.say, 1);
});
// ---------- 书写评分 ----------
const strokesOf = (poly, jitter = 0) => { let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647 - 0.5; return poly.map(st => { const o = []; for (let i = 0; i + 1 < st.length; i++) for (let k = 0; k < 8; k++) { const t = k / 8; o.push({x: 100 * (st[i][0] + t * (st[i + 1][0] - st[i][0])) + jitter * r(), y: 100 * (st[i][1] + t * (st[i + 1][1] - st[i][1])) + jitter * r(), t: 0}); } const e = st[st.length - 1]; o.push({x: 100 * e[0] + jitter * r(), y: 100 * e[1] + jitter * r(), t: 0}); return o; }); };
test('书写评分：规范字形接近满分，抖得厉害明显低', () => {
  for (const d of '0123456789') {
    const a = I.legibility(strokesOf(I.STD[d][0]), d), c = I.legibility(strokesOf(I.STD[d][0], 70), d);
    assert.ok(a >= 90, `${d} 规范字 ${a}`); assert.ok(a - c >= 20, `${d}：${a} ${c}`);
  }
});
test('书写评分：拿别的数字的字形比，分明显低', () => {
  for (const d of '0123456789') for (const x of '0123456789') if (d !== x) assert.ok(I.legibility(strokesOf(I.STD[d][0]), x) < 75, `${d} 当 ${x}`);
});
test('书写评分：4、7、1 的常见写法都认', () => {
  ['4', '7', '1'].forEach(d => { assert.ok(I.STD[d].length >= 2); I.STD[d].forEach(f => assert.ok(I.legibility(strokesOf(f), d) >= 90)); });
});
test('书写评分：数字不在 0–9 或笔画为空，返回 null，不报错', () => {
  assert.equal(I.legibility([], '3'), null); assert.equal(I.legibility(strokesOf(I.STD[3][0]), 'x'), null);
});
test('最近写的字：留 14 天，每天留开头 3 个和结尾 3 个，满档约 12 KB', () => {
  const raw = strokesOf(I.STD[8][0]).concat(strokesOf(I.STD[3][0]));
  const g = I.sketch(raw);
  g.forEach(st => assert.ok(st.length <= 32, '每笔最多 16 个点'));
  assert.ok(g.flat().every(n => Number.isInteger(n) && n >= 0 && n <= 100));
  let list = []; for (let k = 0; k < 30; k++) for (let i = 0; i < 10; i++) list = I.pushRecent(list, {d: D(k), a: String(i), s: [80, 70], g});
  assert.equal(new Set(list.map(x => x.d)).size, 14); assert.equal(list.length, 84); assert.equal(list[83].d, D(29));
  assert.deepEqual(list.filter(x => x.d === D(29)).map(x => x.a), ['0', '1', '2', '7', '8', '9']);
  assert.ok(JSON.stringify(list).length < 40000, JSON.stringify(list).length);
  assert.equal(I.pushRecent({}, {d: D(0), a: '1', s: [], g: []}).length, 1, '坏数据不报错');
});
test('写空笔画也能简化，不报错', () => {
  assert.deepEqual(I.sketch([]), []);
});
