// 第三批趣味题排课（docs/说明书-第三批.md §4.3，B）：单独的插入通道、每日练习 90 秒封顶、两道之间至少 5 道普通题、前置按点亮判、
// 每天最多开始 1 个新趣味题型、答错只回来一次（5 道之后）且不进错题本（说明书 §4.3 第 162–163 行，中控 11-09）、不占计算讲解卡名额、自由加练按组另封顶 90 秒、FUN_SEC = 0 时一道不出
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-01', n);
const FUNIDS = new Set(K.FUN.flatMap(s => s.items.map(it => it.id)));
const isFun = x => x.kind === 'q' && FUNIDS.has(x.inst.id);
// 打开趣味题跑 fn（K.FUN_SEC 是导出的值，引擎每次现读）
const withFun = (sec, fn) => { const was = K.FUN_SEC; K.FUN_SEC = sec; try { return fn(); } finally { K.FUN_SEC = was; } };
// 前置都会的存档：所有技能摸底判会（S.known），手选第 4–9 级让计算题有得出
const ready = () => { const S = C.blank(); S.placedAt = 1; S.settings = {levels: [4, 5, 6, 7, 8, 9], levelsV: 2}; S.known = {}; K.SKILLS.concat(K.HARD).forEach(s => { S.known[s.id] = true; }); return S; };
// 跑一个练习对象，记下每一步；answer(x) → 作答结果
function run(sess, answer, max) {
  const log = [];
  for (let x = sess.next(), g = 0; x && g < (max || 400); x = sess.next(), g++) {
    log.push(x); if (x.kind === 'q') { const r = answer(x); sess.answer(r); }
  }
  return log;
}
const secs = x => (isFun(x) ? 20 : 4);
const okAll = x => ({ok: true, fast: true, secs: secs(x)});

test('关掉（FUN_SEC = 0）：每日练习、自由加练、复习都一道趣味题不出', { skip: Number(process.env.FUN_SEC) > 0 }, () => {
  const S = ready();
  const a = run(E.session(S, D(0), {rnd: seeded(1)}), okAll), b = run(E.free(S, D(0), 'dock', {rnd: seeded(2)}), okAll);
  assert.ok(!a.concat(b).some(isFun));
});

test('每日练习：趣味题合计不超过 90 秒（按实际用时，最多超出一道），两道之间至少 5 道普通题', () => withFun(90, () => {
  const S = ready(), log = run(E.session(S, D(0), {rnd: seeded(3)}), okAll).filter(x => x.kind === 'q');
  const fun = log.filter(isFun); assert.ok(fun.length >= 2, '应该出了几道趣味题：' + fun.length);
  let used = 0, gap = Infinity;
  log.forEach(x => {
    if (isFun(x)) { assert.ok(used < 90, '已用 ' + used + ' 秒还出趣味题'); assert.ok(gap >= 5, '两道趣味题之间只隔了 ' + gap + ' 道'); used += 20; gap = 0; } else gap++;
  });
  assert.equal(S.stats[D(0)].funSec, used);
}));

test('前置没点亮（没学会、没摸底判会）：不出趣味题', () => withFun(90, () => {
  const S = C.blank(); S.placedAt = 1; S.settings = {levels: [4, 5, 6, 7], levelsV: 2};
  assert.ok(!run(E.session(S, D(0), {rnd: seeded(4)}), okAll).some(isFun));
}));

test('每天最多开始 1 个新的趣味题型；趣味题的示范卡、讲解卡不占计算讲解卡名额', () => withFun(90, () => {
  const S = ready(), log = run(E.session(S, D(0), {rnd: seeded(5)}), okAll);
  const types = new Set(log.filter(isFun).map(x => K.ITEM[x.inst.id].skill));
  assert.equal(types.size, 1, '第一天开了 ' + [...types]);
  const funConcepts = new Set(K.FUN.map(s => s.concept).filter(Boolean));
  assert.ok(!(S.daily.cards || []).some(c => funConcepts.has(c)), '计算讲解卡名额里有趣味概念：' + S.daily.cards);
}));

test('趣味题答错：只回来一次，而且至少隔 5 道普通题；不进错题本（不长期回炉）', () => withFun(90, () => {
  const S = ready(); let first = null;
  const log = run(E.session(S, D(0), {rnd: seeded(6)}), x => (isFun(x) && !first ? (first = x.inst, {ok: false, fast: false, secs: 15}) : okAll(x))).filter(x => x.kind === 'q');
  assert.ok(first, '要出过趣味题');
  const idx = log.map((x, i) => (x.inst === first || (isFun(x) && JSON.stringify(x.inst.q) === JSON.stringify(first.q)) ? i : -1)).filter(i => i >= 0);
  assert.equal(idx.length, 2, '原题 + 回来一次：' + idx);
  assert.ok(log.slice(idx[0] + 1, idx[1]).filter(x => !isFun(x)).length >= 5, '回来前至少 5 道普通题');
  assert.ok(!Object.values(S.mistakes).some(m => FUNIDS.has(m.uid)), '趣味题不进错题本');
}));

test('关掉时不记间隔计数（和改动前的存档完全一样）', { skip: Number(process.env.FUN_SEC) > 0 }, () => {
  const S = ready(); run(E.session(S, D(0), {rnd: seeded(7)}), okAll);
  assert.ok(!('sinceFun' in S.daily) && !('funSec' in S.daily));
});

test('再练一会和每日练习共用 90 秒', () => withFun(90, () => {
  const S = ready(); run(E.session(S, D(0), {rnd: seeded(9)}), okAll);
  const before = S.daily.funSec || 0;
  const more = run(E.session(S, D(0), {rnd: seeded(10), extra: 300}), okAll).filter(isFun).length;
  assert.ok(before + more * 20 <= 90 + 20, `共用：之前 ${before} 秒，再练一会又出 ${more} 道`);
}));

test('自由加练：只出这块地的趣味题，隔 5 道，这一次另外封顶 90 秒；不影响每日练习的 90 秒', () => withFun(90, () => {
  const S = ready(), log = run(E.free(S, D(0), 'dock', {rnd: seeded(11), n: 60}), okAll).filter(x => x.kind === 'q');
  const fun = log.filter(isFun); assert.ok(fun.length >= 1, '出了趣味题');
  assert.ok(fun.every(x => K.BY[K.ITEM[x.inst.id].skill].group === 'dock'), '只出这块地的');
  let gap = Infinity, used = 0; log.forEach(x => { if (isFun(x)) { assert.ok(gap >= 5); assert.ok(used < 90); used += 20; gap = 0; } else gap++; });
  assert.ok(!S.daily.funSec, '自由加练不占每日练习的 90 秒');
  const daily = run(E.session(S, D(0), {rnd: seeded(12)}), okAll).filter(isFun);
  assert.ok(daily.length >= 1, '每日练习照样能出');
}));

test('开级不算趣味格子：趣味题全点亮也不影响自动级别', () => withFun(90, () => {
  const S = C.blank(); S.placedAt = 1; const lv0 = E.autoLevel ? E.autoLevel(S) : null;
  K.FUN.forEach(s => s.items.forEach(it => Object.assign(E.prog(S, it.id), {lv: 3, d: [D(-9), D(-5), D(-1)], seen: 9})));
  if (lv0 !== null) assert.equal(E.autoLevel(S), lv0);
  assert.ok(K.HARD.every(s => !s.fun), '趣味技能不在 HARD（开级从 HARD 算）');
}));
