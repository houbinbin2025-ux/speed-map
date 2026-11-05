// 挑战题（说明书-挑战题）：默认全关不影响旧行为；勾上才出；答案对；每道题都能画
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), R = require('../v2/render.js'), H = require('../v2/home.js'), HB = require('../v2/hardbank.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-01', n), ok = {ok: true, fast: true, secs: 6}, bad = {ok: false, fast: false, secs: 9};
const BOARDS = ['look', 'bond', 'place', 'cmp', 'line', 'speed'];
const fresh = () => { const S = C.blank(); S.placedAt = 1; S.demoSeen = Object.fromEntries(K.SKILLS.concat(K.HARD).map(s => [s.id, true])); return S; };
function play(S, day, f) { const s = E.session(S, day, {rnd: seeded(3)}), qs = []; for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') { qs.push(x); s.answer(f ? f(x) : ok); } return qs; }

test('挑战题不进技能表，不计入地图和奖励', () => {
  assert.ok(K.HARD.length >= 12);
  K.HARD.forEach(s => { assert.ok(s.hard); assert.ok(!K.SKILLS.includes(s)); assert.ok(K.BY[s.id]); });
  assert.equal(H.MEDALS.length, K.SKILLS.length * 2);
});
test('每个板块至少 2 个挑战技能，编号不撞', () => {
  BOARDS.forEach(b => assert.ok(K.HARD.filter(s => E.boardOf(s) === b).length >= 2, b));
  const ids = K.HARD.flatMap(s => s.items.map(i => i.id)); assert.equal(new Set(ids).size, ids.length);
});
test('默认全关：一道挑战题都不出', () => {
  assert.equal(play(fresh(), D(0)).filter(x => K.BY[K.ITEM[x.inst.id].skill].hard).length, 0);
  const fr = E.free(fresh(), D(0), 'look', {rnd: seeded(1)}); for (let x = fr.next(), g = 0; x && g < 50; x = fr.next(), g++) if (x.kind === 'q') { assert.ok(!K.BY[K.ITEM[x.inst.id].skill].hard); fr.answer(ok); }
});
BOARDS.forEach(b => test(`勾选 ${b}：今天就能出这个板块的挑战题，别的板块不出`, () => {
  const S = fresh(); S.settings = {hard: {[b]: true}};
  const qs = play(S, D(0)).filter(x => K.BY[K.ITEM[x.inst.id].skill].hard);
  assert.ok(qs.length > 0); qs.forEach(x => assert.equal(E.boardOf(K.BY[K.ITEM[x.inst.id].skill]), b));
}));
test('勾选后学新题时挑战题排最前', () => {
  const S = fresh(); S.settings = {hard: {cmp: true}};
  const first = play(S, D(0)).find(x => x.seg === 'new');
  assert.ok(K.BY[K.ITEM[first.inst.id].skill].hard);
});
test('「练这一块」：勾上后包含挑战题；秒答挑战题可以按 speedH 练', () => {
  const S = fresh(); S.settings = {hard: {look: true}}; const fr = E.free(S, D(0), 'look', {rnd: seeded(1)}); let n = 0;
  for (let x = fr.next(), g = 0; x && g < 50; x = fr.next(), g++) if (x.kind === 'q') { if (K.BY[K.ITEM[x.inst.id].skill].hard) n++; fr.answer(ok); }
  assert.ok(n > 0);
});
test('取消勾选：不再出，进度留着，错题暂停复习；再勾上继续', () => {
  const S = fresh(); S.settings = {hard: {bond: true}}; play(S, D(0), x => (K.BY[K.ITEM[x.inst.id].skill].hard ? bad : ok));
  const seen = Object.keys(S.skills).filter(k => k.includes(':h:')); assert.ok(seen.length);
  const m = E.dueMistakes(S, D(1)).filter(x => x.uid.includes(':h:')); assert.ok(m.length);
  S.settings.hard.bond = false;
  assert.equal(E.dueMistakes(S, D(1)).filter(x => x.uid.includes(':h:')).length, 0);
  assert.equal(play(S, D(1)).filter(x => K.BY[K.ITEM[x.inst.id].skill].hard).length, 0);
  seen.forEach(k => assert.ok(S.skills[k]));
  S.settings.hard.bond = true; assert.ok(E.dueMistakes(S, D(2)).some(x => x.uid.includes(':h:')));
});
test('挑战题升级不增加奖状、伙伴', () => {
  const S = fresh(); K.HARD.forEach(s => s.items.forEach(i => Object.assign(E.prog(S, i.id), {lv: 3, d: [D(-9), D(-5), D(-1)]})));
  H.sync(S, D(0)); const e = H.earned(S); assert.equal(e.certs.length, 0); assert.equal(e.medals.length, 0); assert.equal(H.stats(S).diamond, 0);
});
test('答案对：另写算法从题面重算', () => {
  const calc = t => { const [l, r] = t.split('='); const ev = s => { const m = s.trim().split(' '); let v = +m[0]; for (let i = 1; i < m.length; i += 2) { const y = +m[i + 1]; v = m[i] === '+' ? v + y : m[i] === '−' ? v - y : v * y; } return v; }; return {l, r, ev}; };
  Object.entries(HB.pools).forEach(([id, p]) => p.forEach(x => {
    const q = x.q, a = x.ans;
    if (q.view === 'grid') assert.equal(a, q.rows * q.cols);
    else if (q.view === 'h100') assert.equal(a, q.n);
    else if (q.view === 'hto') assert.equal(a, q.h * 100 + q.t * 10 + q.o);
    else if (q.view === 'pick') { assert.equal(a, Math.max(q.a, q.b)); assert.notEqual(q.a, q.b); if (q.la) { const v = s => s.split(' + ').reduce((m, n) => m + +n, 0); assert.equal(v(q.la), q.a); assert.equal(v(q.lb), q.b); } }
    else if (q.max) { assert.equal(a, q.target); assert.ok(q.target > 0 && q.target < q.max); }
    else if (q.text.includes('里有')) { const n = +q.text.split(' ')[0], u = q.text.slice(-1); assert.equal(a, u === '百' ? Math.floor(n / 100) : u === '十' ? Math.floor(n / 10) % 10 : n % 10); }
    else if (q.text.includes('□')) { const c = calc(q.text); const t = q.text; const m = t.match(/^(\d+) \+ □ = (\d+)$/), m2 = t.match(/^(\d+) = (\d+) \+ □$/); if (m) assert.equal(+m[1] + a, +m[2]); else if (m2) assert.equal(+m2[2] + a, +m2[1]); else assert.fail(t); }
    else { const c = calc(q.text); assert.equal(c.ev(c.l), a, q.text); assert.ok(a >= 0); }
  }));
});
test('难度真的更高：两位数加减都进退位；三位数 ≥ 100；数线到 1000', () => {
  HB.pools['speed:h:two'].forEach(x => { const m = x.q.text.match(/(\d+) (.) (\d+)/), a = +m[1], b = +m[3]; if (m[2] === '+') assert.ok(a % 10 + b % 10 >= 10 && a + b < 100); else assert.ok(a % 10 < b % 10 && a > b); });
  HB.pools['cmp:h:1000'].forEach(x => assert.ok(x.q.a >= 100 && x.q.b >= 100));
  HB.pools['line:h:1000'].forEach(x => assert.equal(x.q.max, 1000));
});
test('比大小挑战题：大数左右各占 40%–60%', () => {
  ['cmp:h:1000', 'cmp:h:expr'].forEach(id => { const p = HB.pools[id], l = p.filter(x => x.q.a > x.q.b).length / p.length; assert.ok(l >= .4 && l <= .6, id + ' ' + l); });
});
test('题目不重复，每个题型至少 9 道', () => {
  Object.entries(HB.pools).forEach(([id, p]) => { assert.ok(p.length >= 9, id); const k = p.map(x => JSON.stringify(x.q)); assert.equal(new Set(k).size, k.length, id); });
});
test('每道题都能画题面和图解，每个挑战技能都有示范卡、标签、错题名', () => {
  K.HARD.forEach(s => {
    assert.ok(R.demo(s.id).length > 20, s.id);
    s.items.forEach(it => HB.pools[it.id].forEach(x => {
      const inst = {id: it.id, q: x.q, ans: x.ans}, v = R.question(inst);
      assert.equal(v.input, s.input); assert.ok(v.input === 'line' || v.html); if (s.input === 'pick') assert.equal(v.pick.length, 2);
      assert.ok(!/undefined|NaN/.test(JSON.stringify(v) + R.explain(inst)), it.id);
      assert.ok(!/undefined/.test(R.mistLabel({src: s.group, uid: it.id, q: x.q})));
    }));
    assert.ok(R.label(s.items[0].id));
  });
});
test('数线 1000 的合格范围：整百 ±50 以内、任意 ±100 以内', () => {
  assert.ok(K.judge(K.ITEM['line:h:1000t'], {id: 'line:h:1000t', q: {max: 1000, target: 300}, ans: 300}, 345).ok);
  assert.ok(!K.judge(K.ITEM['line:h:1000t'], {id: 'line:h:1000t', q: {max: 1000, target: 300}, ans: 300}, 350).ok);
  assert.ok(K.judge(K.ITEM['line:h:1000'], {id: 'line:h:1000', q: {max: 1000, target: 370, any: true}, ans: 370}, 460).ok);
});
test('备份：勾选和挑战进度跟着走；旧存档没有 hard 字段不报错', () => {
  const S = fresh(); S.settings = {hard: {look: true}}; play(S, D(0));
  const T = C.importText(C.exportText(S)); assert.deepEqual(T.settings.hard, {look: true}); assert.deepEqual(T.skills, S.skills);
  const O = fresh(); delete O.settings; assert.ok(play(O, D(0)).length);
});
