// 讲解卡（docs/说明书-到四年级第二批.md §2、§3、§6）：按概念出、每天最多 2 张、计时最多 90 秒、讲解卡后前 5 题只记录
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), R = require('../v2/render.js');
const D = n => C.addDays('2026-11-01', n);
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const ALL = K.SKILLS.concat(K.HARD);
// 手选第 8、9 级的新存档：会碰到条形图、周长、倍、线段图四个概念
const fresh = () => { const S = C.blank(); S.placedAt = 1; S.settings = {levels: [8, 9], levelsV: 2}; return S; };
function run(S, day, o) {
  o = o || {}; const sess = o.free ? E.free(S, D(day), o.free) : E.session(S, D(day), {rnd: seeded(3)}), demos = [];
  for (let i = 0; i < 300; i++) {
    const x = sess.next(); if (!x) break;
    if (x.kind === 'demo') { demos.push(x); if (o.secs !== undefined && x.concept) sess.demoTime(o.secs); continue; }
    sess.answer(o.answer ? o.answer(x) : {ok: true, fast: true, secs: 3});
  }
  return demos;
}

test('每个概念都有讲解卡（3–5 页，每页有图和一句话）；挂了概念的技能都对得上', () => {
  R.CONCEPTS.forEach(c => { const k = R.card(c); assert.ok(k.pages.length >= 3 && k.pages.length <= 5, c); k.pages.forEach((p, i) => { assert.ok(p.fig.length > 20 && p.line, `${c} ${i}`); assert.ok(R.cardPage(c, i).includes(p.line)); }); });
  const used = new Set(ALL.filter(s => s.concept).map(s => s.concept));
  used.forEach(c => assert.ok(R.CONCEPTS.includes(c), c));
  assert.deepEqual([...used].sort(), R.CONCEPTS.slice().sort(), '没有用不上的讲解卡');
});

test('第一次碰到概念出讲解卡；同一概念的其他技能不再出；一天最多 2 张，超出的技能第二天再开始', () => {
  const S = fresh(), d0 = run(S, 0), c0 = d0.filter(x => x.concept).map(x => x.concept);
  assert.equal(c0.length, 2, JSON.stringify(c0));
  assert.ok(d0.some(x => !x.concept && K.BY[x.skill].concept && c0.includes(K.BY[x.skill].concept)), '同概念的第二个技能出普通示范卡');
  c0.forEach(c => assert.equal(S.demoSeen['c:' + c], true));
  const d1 = run(S, 1), c1 = d1.filter(x => x.concept).map(x => x.concept);
  assert.ok(c1.length >= 1 && c1.length <= 2 && c1.every(c => !c0.includes(c)), JSON.stringify(c1));
});

test('讲解卡满 2 张时，要讲解的新技能当天连题都不出（不先做题后讲解）', () => {
  const S = fresh(), seenQ = []; run(S, 0, {answer: x => { seenQ.push(K.ITEM[x.inst.id].skill); return {ok: true, fast: true, secs: 3}; }});
  const later = ALL.filter(s => s.concept && !S.demoSeen['c:' + s.concept] && s.items.some(it => E.itemOn(S, it.id))).map(s => s.id);
  assert.ok(later.length > 0); later.forEach(sid => assert.ok(!seenQ.includes(sid), sid));
});

test('自由加练也算在每天 2 张里', () => {
  const S = fresh(); run(S, 0);
  const extra = run(S, 0, {free: 'dock'}); assert.equal(extra.filter(x => x.concept).length, 0);
});

test('讲解卡按实际停留计时：最多 90 秒；短的照常', () => {
  const a = fresh(); run(a, 0, {secs: 600}); const b = fresh(); run(b, 0, {secs: 5});
  assert.ok(a.stats[D(0)].sec - b.stats[D(0)].sec <= 2 * 85 + 1, `${a.stats[D(0)].sec} / ${b.stats[D(0)].sec}`);
});

test('讲解卡后这个概念的前 5 题：记题数、答对、不会；记满 5 题不再记', () => {
  const S = fresh(), sess = E.session(S, D(0), {rnd: seeded(3)}); let afterCard = false;
  for (let i = 0; i < 300; i++) {
    const x = sess.next(); if (!x) break;
    if (x.kind === 'demo') { afterCard = !!x.concept; continue; }
    sess.answer(afterCard ? {ok: false, dunno: true, secs: 3} : {ok: true, fast: true, secs: 3}); afterCard = false;   // 讲解卡后的第一题点「不会」
  }
  const st = Object.entries(S.introStat); assert.equal(st.length, 2);
  st.forEach(([c, [n, ok, dunno]]) => { assert.ok(n >= 1 && n <= 5, c); assert.equal(dunno, 1, c); assert.equal(ok, n - 1, c); });
  const full = JSON.parse(JSON.stringify(S.introStat)); run(S, 1); run(S, 2);
  Object.entries(full).forEach(([c, v]) => { const now = S.introStat[c]; assert.ok(now[0] <= 5 && now[0] >= v[0], c); if (v[0] === 5) assert.deepEqual(now, v, c); });
});

test('导入备份：讲解卡记录按概念取题数多的；看过的概念合并', () => {
  const a = fresh(), b = fresh(); a.introStat = {bar: [2, 2, 0]}; a.demoSeen = {'c:bar': true}; b.introStat = {bar: [5, 4, 1], area: [1, 1, 0]}; b.demoSeen = {'c:area': true};
  const M = C.importMerge(a, JSON.stringify(b)); assert.deepEqual(M.introStat, {bar: [5, 4, 1], area: [1, 1, 0]}); assert.ok(M.demoSeen['c:bar'] && M.demoSeen['c:area']);
  assert.equal(C.resetProgress(M).introStat, undefined);
});
