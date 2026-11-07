// 故事码头、规律花园、钟楼集市（docs/意图-v6-三个新关卡.md）
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), R = require('../v2/render.js'), H = require('../v2/home.js'), NB = require('../v2/placebank.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-01', n), ok = {ok: true, fast: true, secs: 6};
const G = ['dock', 'garden', 'market'];

test('3 个新地方，11 个技能（4 + 3 + 4），都在技能表和板块表里', () => {
  assert.deepEqual(G.map(g => K.SKILLS.filter(s => s.group === g).length), [4, 3, 4]);
  G.forEach(g => assert.ok(R.GROUPS.find(x => x.id === g)));
  assert.equal(K.SKILLS.length, 45); assert.ok(K.topoOk());
});
test('前置：很早就能开始规律，故事题在分合之后，比多少最后', () => {
  assert.deepEqual(K.BY.gardenA.pre, ['look3']);
  assert.deepEqual(K.BY.dockA.pre, ['bond2']);
  assert.deepEqual(K.BY.dockD.pre, ['bond4', 'cmp2']);
  assert.deepEqual(K.BY.money2.pre, ['bond4']);
});
test('答案从题面重算；选项里有正确答案；没有 5 以内的题', () => {
  const low = (q, ans) => C.isLow(q) && ans <= 5;
  Object.entries(NB.pools).forEach(([id, p]) => {
    assert.ok(p.length >= 9, id); const ks = p.map(x => JSON.stringify(x.q)); assert.equal(new Set(ks).size, ks.length, id);
    p.forEach(({q, ans}) => {
      if (q.view === 'join') { assert.equal(ans, q.a + q.b); assert.ok(ans > 5); }
      else if (q.view === 'take' || q.view === 'need' || q.view === 'more') { assert.equal(ans, q.a - q.b); assert.ok(q.a > 5 && ans > 0); }
      else if (q.view === 'pat') { assert.ok(q.opts.includes(ans)); assert.equal(new Set(q.opts).size, 3); const n = q.seq.length; for (let per = 1; per <= 4; per++) { if (q.seq.every((c, i) => i < per || c === q.seq[i - per])) { assert.equal(q.seq[n - per], ans); break; } } }
      else if (q.view === 'seq') assert.equal(ans, q.l[2] + (q.l[1] - q.l[0]));
      else if (q.view === 'bad') { const st = Math.min(...q.l.slice(1).map((v, i) => Math.abs(v - q.l[i]))); assert.ok(q.l.includes(ans)); const bad = q.l.filter((v, i) => (v - q.l[0]) % ((q.l[4] - q.l[0]) / 4) !== 0); assert.deepEqual(bad, [ans]); assert.ok(st > 0); }
      else if (q.view === 'clock') { if (q.m === 0) assert.equal(ans, q.h); else { assert.equal(ans, q.h * 10 + 3); assert.ok(q.opts.includes(ans)); } }
      else if (q.view === 'pay') assert.equal(ans, q.bills.reduce((a, b) => a + b, 0));
      else if (q.view === 'change') assert.equal(ans, 10 - q.p);
      else assert.fail(q.view);
    });
  });
});
test('每道题都能画题面和图解；示范卡、错题名、标签齐全；点选题给够选项', () => {
  K.SKILLS.filter(s => G.includes(s.group)).forEach(s => {
    assert.ok(R.demo(s.id).length > 20, s.id);
    s.items.forEach(it => NB.pools[it.id].forEach(({q, ans}) => {
      const inst = {id: it.id, q, ans}, v = R.question(inst);
      assert.equal(v.input, s.input); assert.ok(v.html);
      if (s.input === 'pick') { assert.ok(v.pick.length >= 3); assert.ok(v.pick.includes(ans)); assert.equal(v.pickText.length, v.pick.length); assert.ok(v.pick.every(n => Number.isFinite(n))); }
      const txt = JSON.stringify(v) + R.explain(inst) + R.mistLabel({src: s.group, uid: it.id, q});
      assert.ok(!/undefined|NaN/.test(txt), it.id + txt.slice(0, 80));
      assert.ok(v.html.includes('spk'), '有朗读按钮');
    }));
  });
});
test('错了进错题本；判对错；不计时', () => {
  K.SKILLS.filter(s => G.includes(s.group)).forEach(s => { assert.equal(E.kindOf(s.items[0].id), 'type8'); });
  const inst = K.make('dock:t:join', seeded(1)); assert.ok(K.judge(K.ITEM['dock:t:join'], inst, inst.ans).ok); assert.ok(!K.judge(K.ITEM['dock:t:join'], inst, inst.ans + 1).ok);
  const S = C.blank(); E.addMistake(S, inst, D(0)); assert.equal(Object.values(S.mistakes)[0].src, 'dock');
});
test('旧进度不受影响：看数学完后，排课会排到规律花园', () => {
  const S = C.blank(); S.placedAt = 1; S.demoSeen = Object.fromEntries(K.SKILLS.map(s => [s.id, true]));
  ['look1', 'look3'].forEach(sid => K.BY[sid].items.forEach(it => Object.assign(E.prog(S, it.id), {lv: 1, d: [D(-1)], seen: 1, lastDay: D(-1)})));
  const seen = new Set(); for (let d = 0; d < 12; d++) { const s = E.session(S, D(d), {rnd: seeded(d + 1)}); for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') { seen.add(K.ITEM[x.inst.id].skill); s.answer(ok); } }
  assert.ok(seen.has('gardenA'));
});
test('奖励：每个新地方两张奖状（称号 + 画面），每个技能一只不重复的伙伴', () => {
  G.forEach(g => { const cs = H.CERTS.filter(c => c.place === g); assert.equal(cs.length, 2); cs.forEach(c => assert.equal(c.scene, g)); });
  const idx = K.SKILLS.map(s => H.creatureOf(s.id)); idx.forEach(v => assert.ok(v >= 0)); assert.equal(new Set(idx).size, idx.length);
});
