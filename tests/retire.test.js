// 11-05 Ben：「整个项目 5 以内加减及这个级别最简单的题目从题库里剔除」。规则：题里所有数字都 ≤ 5 的不再出；旧进度不丢
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), R = require('../v2/render.js'), H = require('../v2/home.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-01', n), ok = {ok: true, fast: true, secs: 6};
const nums = q => Object.values(q).filter(v => typeof v === 'number');

test('技能图谱里一道所有数字都 ≤ 5 的题也没有（卡、题型池、秒答）', () => {
  K.SKILLS.forEach(s => s.items.forEach(it => {
    if (it.gen) { if (s.speed) return; if (s.nb) return; K.pool(it.id).forEach(x => assert.ok(Math.max(...nums(x.q)) > 5, it.id + JSON.stringify(x.q))); }
    else { const v = nums(it.q).concat(it.ans); assert.ok(Math.max(...v) > 5, it.id); }
  }));
  ['1+1', '5-4', '2+3', '4+1'].forEach(id => { assert.ok(C.BYID[id].retired); assert.ok(!K.ITEM[id]); });
  assert.ok(!C.BYID['3+4'].retired); assert.ok(K.ITEM['3+4']);
});
test('真实排 30 天，出的题都没有 5 以内', () => {
  const S = C.blank(); S.placedAt = 1;
  for (let d = 0; d < 30; d++) { const s = E.session(S, D(d), {rnd: seeded(d + 1)}); for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') { assert.ok(K.BY[K.ITEM[x.inst.id].skill].nb || Math.max(...nums(x.inst.q), x.inst.ans) > 5, x.inst.id + JSON.stringify(x.inst.q)); s.answer(ok); } }
});
test('旧存档：被剔除题的进度原样留着，不崩；旧错题不再回来', () => {
  const S = C.blank(); S.placedAt = 1;
  S.cards['1+1'] = {lv: 3, d: [D(-9), D(-8), D(-3)], seen: 9}; S.skills = {'look:dice:2': {lv: 2, d: [D(-9), D(-8)], seen: 4, lastDay: D(-8), win: []}};
  S.mistakes['1+1'] = {key: '1+1', uid: '1+1', a: 1, op: '+', b: 1, ans: 2, L: 0, passes: 0, due: D(-1), added: D(-2), last: D(-2)};
  S.mistakes['cmp:t:10|x'] = {key: 'cmp:t:10|x', uid: 'cmp:t:10', src: 'cmp', q: {a: 3, b: 5}, ans: 5, passes: 0, due: D(-1), added: D(-2), last: D(-2)};
  S.mistakes['look:dice:2'] = {key: 'look:dice:2', uid: 'look:dice:2', src: 'look', q: {n: 2, layout: 'dice'}, ans: 2, passes: 0, due: D(-1), added: D(-2), last: D(-2)};
  assert.equal(E.dueMistakes(S, D(0)).length, 0); assert.equal(C.dueMistakes(S, D(0), 0).length, 0);
  const s = E.session(S, D(0), {rnd: seeded(2)}); for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') s.answer(ok);
  assert.equal(S.cards['1+1'].lv, 3); assert.equal(S.skills['look:dice:2'].lv, 2);
  const T = C.importText(C.exportText(S)); assert.equal(T.cards['1+1'].lv, 3);
  H.sync(S, D(0)); assert.ok(H.stats(S));
});
test('被剔除的技能不再是前置；前置都存在；每个技能都有题和示范卡', () => {
  assert.ok(!K.BY.bond1 && !K.BY.look2 && !K.BY['speed:L1:0']);
  assert.ok(K.topoOk()); K.SKILLS.forEach(s => { assert.ok(s.items.length, s.id); s.pre.forEach(p => assert.ok(K.BY[p], s.id + '→' + p)); assert.ok(R.demo(s.id).length > 20, s.id); });
  assert.deepEqual(K.BY.bond2.pre, []);
});
test('伙伴：受欢迎的最先解锁，每个技能一只不重复', () => {
  const idx = K.SKILLS.map(s => H.creatureOf(s.id)); idx.forEach((v, i) => assert.ok(v >= 0, K.SKILLS[i].id)); assert.equal(new Set(idx).size, idx.length);
  assert.equal(H.creatureOf('look1'), 0);
});
