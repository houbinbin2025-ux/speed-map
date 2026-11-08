// 错题记录：错几次、最近 5 次经过、按技能累计、每日新增 / 过关（docs/方案-错题数据字段.md，中控 11-08 批准）
// 只记录，不影响排课；这一版只有函数，B 接入作答流程后才会被调用
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js');
const D = n => C.addDays('2026-11-01', n);
const clone = o => JSON.parse(JSON.stringify(o));
const blank = () => { const S = C.blank(); S.placedAt = 1; S.demoSeen = Object.fromEntries(K.SKILLS.concat(K.HARD).map(s => [s.id, true])); return S; };
const typeIt = K.SKILLS.find(s => s.nb && s.input === 'write').items[0];
const rnd = x => () => (x = (x * 16807) % 2147483647) / 2147483647;
const instN = n => K.make(typeIt.id, rnd(n + 7));
const SK = 'sk-a';
// 一道新错题：E.addMistake 进本 + noteMistake 记一笔
function wrong(S, i, day, ev) {
  const k0 = K.mkey(i), fresh = !S.mistakes[k0] || S.mistakes[k0].due === null;
  const key = E.addMistake(S, i, day); C.noteMistake(S, key, Object.assign({k: 'w', w: '7', s: 4.2, skill: SK, fresh}, ev), day); return key;
}
// 一道题复习 5 次全对 → 过关
function passAll(S, key, from) {
  let d = from; for (let n = 0; n < C.INTERVALS.length; n++) { d = S.mistakes[key].due; C.reviewMistake(S, key, 'fast', d); }
  C.notePassed(S, key, d, SK); return d;
}

test('T1 旧存档（错题没有新字段）读进来不报错，错题原样；带新字段时排课和不带完全一样（只记录）', () => {
  const S = blank(); [1, 2, 3].forEach(n => E.addMistake(S, instN(n), D(0)));
  const old = clone(S), up = C.upgrade(clone(old));
  assert.deepEqual(up.mistakes, old.mistakes); assert.equal(up.mistStat, undefined);
  const withNew = clone(old); Object.values(withNew.mistakes).forEach(m => { m.wrongs = 3; m.hist = [{d: D(0), k: 'w', w: '9', s: 3}]; });
  withNew.mistStat = {[SK]: {w: 3, d: 0, s: 0, p: 0, last: D(0)}};
  const pick = S0 => { const R0 = Math.random; Math.random = rnd(11); try { return pick0(S0); } finally { Math.random = R0; } };
  const pick0 = S0 => { const s = E.session(C.upgrade(clone(S0)), D(1), {rnd: rnd(5)}), out = []; for (let x = s.next(), g = 0; x && g < 80; x = s.next(), g++) { if (x.kind !== 'q') continue; out.push(x.inst.id + (x.mkey ? '|' + x.mkey : '')); s.answer({ok: true, fast: true, secs: 2}); } return out; };
  assert.deepEqual(pick(withNew), pick(old));
  assert.deepEqual(E.dueMistakes(C.upgrade(clone(withNew)), D(1)).map(m => m.key), E.dueMistakes(C.upgrade(clone(old)), D(1)).map(m => m.key));
});

test('T2 新进错题：wrongs = 1、经过 1 条、技能累计 w = 1、当天新增 1', () => {
  const S = blank(), key = wrong(S, instN(1), D(0));
  const m = S.mistakes[key];
  assert.equal(m.wrongs, 1); assert.deepEqual(m.hist, [{d: D(0), k: 'w', w: '7', s: 4.2}]);
  assert.deepEqual(S.mistStat[SK], {w: 1, d: 0, s: 0, p: 0, last: D(0)});
  assert.equal(S.stats[D(0)].mn, 1);
  assert.equal(m.passes, 0); assert.equal(m.due, D(1));   // 原行为不变
});

test('T3 同一道题又错：wrongs = 2、passes 归 0、不算新增；已过关的题又错算新增、wrongs 接着加', () => {
  const S = blank(), i = instN(1), key = wrong(S, i, D(0));
  C.reviewMistake(S, key, 'fast', D(1)); assert.equal(S.mistakes[key].passes, 1);
  wrong(S, i, D(1), {k: 'd', w: null});
  assert.equal(S.mistakes[key].wrongs, 2); assert.equal(S.mistakes[key].passes, 0);
  assert.equal(S.stats[D(1)] && S.stats[D(1)].mn, undefined);
  assert.equal(S.mistStat[SK].d, 1);
  const end = passAll(S, key, D(1)); assert.equal(S.mistakes[key].due, null);
  const day = C.addDays(end, 3); wrong(S, i, day);
  assert.equal(S.mistakes[key].wrongs, 3); assert.equal(S.stats[day].mn, 1);
});

test('T4 复习「对但慢」：经过记 k:s，wrongs 不变，技能累计 s +1', () => {
  const S = blank(), key = wrong(S, instN(1), D(0));
  C.reviewMistake(S, key, 'slow', D(1)); C.noteMistake(S, key, {k: 's', w: '8', s: 11, skill: SK}, D(1));
  const m = S.mistakes[key];
  assert.equal(m.wrongs, 1); assert.deepEqual(m.hist[1], {d: D(1), k: 's', w: '8', s: 11}); assert.equal(S.mistStat[SK].s, 1);
});

test('T5 经过最多 5 条；过关后剪到 1 条，技能累计 p、当天过关 +1；同一天重复调用不重复算', () => {
  const S = blank(), i = instN(1), key = wrong(S, i, D(0));
  for (let n = 1; n <= 6; n++) wrong(S, i, D(0), {w: String(n)});
  assert.equal(S.mistakes[key].wrongs, 7); assert.equal(S.mistakes[key].hist.length, 5); assert.equal(S.mistakes[key].hist[4].w, '6');
  const end = passAll(S, key, D(0));
  assert.equal(S.mistakes[key].hist.length, 1); assert.equal(S.mistStat[SK].p, 1); assert.equal(S.stats[end].mp, 1);
  C.notePassed(S, key, end, SK); assert.equal(S.mistStat[SK].p, 1); assert.equal(S.stats[end].mp, 1);
  C.notePassed(S, wrong(S, instN(2), D(0)), D(0), SK); assert.equal(S.mistStat[SK].p, 1);   // 还没过关：不算
});

test('T6 题型错题只留 3 道，被删掉的那些仍算在技能累计里', () => {
  const S = blank(); for (let n = 1; n <= 5; n++) wrong(S, instN(n), D(0));
  assert.equal(Object.values(S.mistakes).filter(m => m.uid === typeIt.id).length, 3);
  assert.equal(S.mistStat[SK].w, 5); assert.equal(S.stats[D(0)].mn, 5);
});

test('T7 坏字段读档后被清洗：错题和排课照常', () => {
  const S = blank(), key = wrong(S, instN(1), D(0)), k2 = wrong(S, instN(2), D(0));
  const bad = clone(S);
  bad.mistakes[key].wrongs = 'x'; bad.mistakes[key].hist = {}; bad.mistakes[k2].wrongs = -2;
  bad.mistakes[k2].hist = [null, 3, {d: D(0), k: 'zz'}, {d: D(0), k: 'w', w: 'x'.repeat(40), s: 999}, {d: D(0), k: 'd', w: null, s: 'a', o: 'y'}];
  bad.mistStat = 3; bad.stats[D(0)].mn = 'n';
  const up = C.upgrade(bad);
  assert.equal(up.mistakes[key].wrongs, undefined); assert.equal(up.mistakes[key].hist, undefined);
  assert.equal(up.mistakes[k2].wrongs, undefined);
  assert.deepEqual(up.mistakes[k2].hist, [{d: D(0), k: 'w', w: 'x'.repeat(16), s: 120}, {d: D(0), k: 'd', w: null, o: 1}]);
  assert.equal(up.mistStat, undefined); assert.equal(up.stats[D(0)].mn, undefined);
  assert.equal(up.mistakes[key].due, D(1)); assert.equal(up.mistakes[key].passes, 0);
  const odd = C.upgrade({v: 2, mistakes: {}, mistStat: {a: null, b: {w: 'q', d: 2, x: 9, last: 5}}});
  assert.deepEqual(odd.mistStat, {b: {w: 0, d: 2, s: 0, p: 0}});
  C.noteMistake(odd, 'nope', {k: 'w', skill: 'b'}, D(0));   // 没这道错题：什么都不记
  assert.deepEqual(odd.mistStat, {b: {w: 0, d: 2, s: 0, p: 0}});
  assert.doesNotThrow(() => C.noteMistake(blank(), 'nope', null, D(0)));
});

test('T8 导入合并：新旧备份互导、导两次不翻倍、本机已过关仍剪到 1 条、两边各错一次次数不少算、只有 mn 的日子也合并', () => {
  const S = blank(), i = instN(1), key = wrong(S, i, D(0));
  const oldBk = clone(S); delete oldBk.mistStat; Object.values(oldBk.mistakes).forEach(m => { delete m.wrongs; delete m.hist; }); delete oldBk.stats;
  // 旧备份 → 新本机：新字段留着
  let M = C.importMerge(clone(S), JSON.stringify(oldBk));
  assert.equal(M.mistakes[key].wrongs, 1); assert.equal(M.mistakes[key].hist.length, 1); assert.equal(M.mistStat[SK].w, 1);
  // 新备份 → 旧本机：新字段进来
  M = C.importMerge(C.upgrade(clone(oldBk)), JSON.stringify(S));
  assert.equal(M.mistakes[key].wrongs, 1); assert.equal(M.mistakes[key].hist.length, 1); assert.equal(M.mistStat[SK].w, 1); assert.equal(M.stats[D(0)].mn, 1);
  // 同一份导两次：不翻倍、经过不重复
  M = C.importMerge(C.importMerge(clone(S), JSON.stringify(S)), JSON.stringify(S));
  assert.equal(M.mistakes[key].wrongs, 1); assert.equal(M.mistakes[key].hist.length, 1); assert.equal(M.mistStat[SK].w, 1); assert.equal(M.stats[D(0)].mn, 1);
  // 两台设备各错一次：经过合成 3 条，次数取大后不少于经过条数
  const A = clone(S), B = clone(S);
  wrong(A, i, D(1), {w: 'a'}); wrong(B, i, D(2), {w: 'b'});
  M = C.importMerge(A, JSON.stringify(B));
  assert.deepEqual(M.mistakes[key].hist.map(e => e.w), ['7', 'a', 'b']); assert.equal(M.mistakes[key].wrongs, 3);
  assert.equal(M.mistStat[SK].w, 2);   // 累计数按技能取大（两边各 2），宁少勿重
  // 本机已过关 + 备份里 5 条经过：合并后仍 1 条
  const P = clone(S); for (let n = 1; n <= 4; n++) wrong(P, i, D(0), {w: String(n)});
  const L = clone(P); passAll(L, key, D(0));
  M = C.importMerge(L, JSON.stringify(P));
  assert.equal(M.mistakes[key].due, null); assert.equal(M.mistakes[key].hist.length, 1); assert.equal(M.mistakes[key].wrongs, 5);
  // 当天只有新增数、没有习惯记录：照样按天取大
  const X = blank(), Y = blank(); Y.stats = {[D(5)]: {sec: 0, n: 0, ups: 0, over: 0, gap: 0, mn: 2, mp: 1}};
  M = C.importMerge(X, JSON.stringify(Y)); assert.equal(M.stats[D(5)].mn, 2); assert.equal(M.stats[D(5)].mp, 1);
  X.stats = {[D(5)]: {sec: 60, n: 5, ups: 0, over: 0, gap: 0, mn: 3}};
  M = C.importMerge(X, JSON.stringify(Y)); assert.equal(M.stats[D(5)].mn, 3); assert.equal(M.stats[D(5)].mp, 1); assert.equal(M.stats[D(5)].sec, 60);
});

test('T9 整份替换：以备份为准，并过一遍清洗', () => {
  const S = blank(), key = wrong(S, instN(1), D(0)), bk = clone(S);
  bk.mistakes[key].hist.push({d: D(0), k: 'bad'}); bk.mistStat[SK].w = 'x';
  const M = C.importText(JSON.stringify(bk));
  assert.equal(M.mistakes[key].hist.length, 1); assert.equal(M.mistStat[SK].w, 0); assert.equal(M.mistakes[key].wrongs, 1);
});

test('T10 回滚 v1 不带新字段', () => {
  const S = blank(); wrong(S, instN(1), D(0));
  const mem = {}, store = {getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }};
  store.setItem('speedmap.v2', JSON.stringify(S));
  const v1 = C.rollbackV1(store);
  assert.equal(v1.v, 1); assert.equal(v1.mistStat, undefined); assert.equal(JSON.stringify(v1).includes('"hist"'), false);
});

test('T11 清空进度：新字段一起清掉', () => {
  const S = blank(); wrong(S, instN(1), D(0));
  const R = C.resetProgress(S);
  assert.deepEqual(R.mistakes, {}); assert.equal(R.mistStat, undefined); assert.equal(R.stats, undefined);
});

test('T12 体积：460 道错题满记录 + 300 个技能累计，导出文字不超过 250 KB（实测 191 KB）', () => {
  const S = blank();
  for (let n = 0; n < 460; n++) {
    const key = 'k' + n; S.mistakes[key] = {key, uid: typeIt.id, src: 'x', q: {a: 12, b: 34}, ans: 46, passes: 0, due: D(1), added: D(0), last: D(0)};
    for (let j = 0; j < 7; j++) C.noteMistake(S, key, {k: j % 3 ? 'w' : 'd', w: j % 3 ? '123' : null, s: 12.3, skill: 'sk' + (n % 300), fresh: j === 0}, D(j));
  }
  const kb = C.exportText(S).length / 1024;
  assert.ok(Object.values(S.mistakes).every(m => m.hist.length === 5));
  assert.ok(kb < 250, `导出 ${kb.toFixed(0)} KB`);
});
