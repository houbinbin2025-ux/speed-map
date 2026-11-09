// 高级别题（原挑战题，说明书-难度分级）：不进技能表、答案对、每道题都能画；选难度的行为在 levels.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), R = require('../v2/render.js'), H = require('../v2/home.js'), HB = require('../v2/hardbank.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-01', n), ok = {ok: true, fast: true, secs: 6}, bad = {ok: false, fast: false, secs: 9};
const BOARDS = ['look', 'bond', 'place', 'cmp', 'line', 'speed'];
const fresh = () => { const S = C.blank(); S.placedAt = 1; S.demoSeen = Object.fromEntries(K.SKILLS.concat(K.HARD).map(s => [s.id, true])); return S; };
function play(S, day, f) { const s = E.session(S, day, {rnd: seeded(3)}), qs = []; for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') { qs.push(x); s.answer(f ? f(x) : ok); } return qs; }

test('挑战题（三四年级）不进技能表；家里的伙伴按级别算：每一级一只（C 方案 11-09）', () => {
  assert.ok(K.HARD.length >= 12);
  K.HARD.forEach(s => { assert.ok(s.hard); assert.ok(!K.SKILLS.includes(s)); assert.ok(K.BY[s.id]); });
  assert.equal(H.MEDALS.length, K.SKILLS.length * 2 + H.HARD_LV.length * 2);
});
test('三四年级练会了也有奖励：每一级一对奖状、一只伙伴，格子算进铁锭 / 金锭 / 钻石（C 方案 11-09；原来练了拿不到）', () => {
  const S = fresh(); K.HARD.forEach(s => s.items.forEach(i => Object.assign(E.prog(S, i.id), {lv: 3, d: [D(-9), D(-5), D(-1)]})));
  H.sync(S, D(0)); const e = H.earned(S), n = H.HARD_LV.length;
  assert.equal(e.certs.filter(c => c.lv).length, n * 2, '每级两张奖状');
  assert.equal(e.medals.filter(m => m.lv).length, n * 2, '每级一只伙伴（含附魔）');
  assert.equal(e.medals.filter(m => !m.lv).length, 0, '基础技能的伙伴不受影响');
  assert.equal(H.stats(S).diamond, K.HARD.reduce((k, s) => k + s.items.length, 0));
});
test('三四年级只学会一部分：这一级的奖状不发；没开放的级别不进「下一个目标」', () => {
  const S = fresh(), top = s => Math.max(...s.items.map(i => Math.max(...K.itemLevels(i.id)))), lv6 = K.HARD.filter(s => top(s) === 6);
  lv6.slice(1).forEach(s => s.items.forEach(i => Object.assign(E.prog(S, i.id), {lv: 1, d: [D(-1)]})));
  H.sync(S, D(0)); assert.ok(!H.earned(S).certs.some(c => c.id === 'c:lv:6:1'), '差一个不发');
  assert.ok(!H.next(S, 50).some(x => x.r.lv && !H.opened(S, x.r.lv)), '没开放的级别不提示');
});
test('答案对：另写算法从题面重算', () => {
  const calc = t => { const [l, r] = t.split('='); const ev = s => { const m = s.trim().split(' '); let v = +m[0]; for (let i = 1; i < m.length; i += 2) { const y = +m[i + 1]; v = m[i] === '+' ? v + y : m[i] === '−' ? v - y : v * y; } return v; }; return {l, r, ev}; };
  Object.entries(HB.pools).forEach(([id, p]) => p.forEach(x => {
    const q = x.q, a = x.ans;
    if (/:g\d+:/.test(id) || ['story', 'clock5'].includes(q.view) || id.startsWith('garden:') || id === 'bond:h:20' || id === 'speed:h:div') return;   // 这几类在 levels.test.js、grade34.test.js 另算
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
      assert.equal(v.input, s.input); assert.ok(v.input === 'line' || v.html); if (s.input === 'pick') assert.equal(v.pick.length, x.q.view === 'choice' ? x.q.opts.length : 2);   // 选择题（第二批 2a）3 个选项，比大小 2 个
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
// 审查 11-09：下面几条专门拦「规则写错但测试照过」
const topLv = s => Math.max(...s.items.map(i => Math.max(...K.itemLevels(i.id))));
const setLv = (S, s, lv) => s.items.forEach(i => Object.assign(E.prog(S, i.id), {lv, d: [D(-9), D(-5), D(-1)].slice(0, lv)}));
test('一格算在它出题最高的那一级；第 4、5 级合成一组', () => {
  const g6 = K.HARD.filter(s => topLv(s) === 6), S = fresh();
  g6.forEach(s => setLv(S, s, 1));
  assert.deepEqual(H.BY['c:lv:6:1'].need(H.stats(S)), [g6.length, g6.length], '第 6 级奖状只数最高级是 6 的技能');
  const g45 = K.HARD.filter(s => topLv(s) <= 5);
  assert.equal(H.BY['c:lv:5:1'].need(H.stats(fresh()))[1], g45.reduce((n, s) => n + s.items.length, 0), '第 4–5 级一组');
  assert.ok(!H.BY['c:lv:4:1'], '第 4 级不单独发');
});
test('伙伴和奖状一样：差一格不发；全部淡红不给附魔', () => {
  const g6 = K.HARD.filter(s => topLv(s) === 6), S = fresh();
  g6.slice(1).forEach(s => setLv(S, s, 3)); H.sync(S, D(0));
  let got = Object.keys(S.home.got); assert.ok(!got.includes('m:lv:6:1') && !got.includes('c:lv:6:1'), '差一格：奖状、伙伴都不发');
  const S2 = fresh(); g6.forEach(s => setLv(S2, s, 2)); H.sync(S2, D(0)); got = Object.keys(S2.home.got);
  assert.ok(got.includes('m:lv:6:1') && got.includes('c:lv:6:1'), '全部点亮：发');
  assert.ok(!got.includes('m:lv:6:3') && !got.includes('c:lv:6:3'), '全部淡红：不给附魔');
});
test('家长只选了第 8 级：第 4–7 级的奖状不进「下一个目标」；得到过的照常显示', () => {
  const S = fresh(); S.settings = Object.assign(S.settings || {}, {levels: [8], levelsV: 2});
  assert.deepEqual(E.chosen(S), [8], '测试前提：家长手选第 8 级');
  const lvs = H.next(S, 99).filter(x => x.r.lv).map(x => x.r.lv);
  assert.ok(lvs.every(v => v === 8), '只提示第 8 级：' + lvs);
  S.home.got['c:lv:6:1'] = D(-3); assert.ok(H.shown(S, H.BY['c:lv:6:1']), '没选中但得到过：照常显示');
  assert.ok(!H.shown(S, H.BY['c:lv:7:1']), '没选中、没得到：不显示');
});
test('「学会 N 个技能」「岛上 N 个地方」算上三四年级', () => {
  const S = fresh(), sp = K.HARD.find(s => s.group === 'speedH'), dk = K.HARD.find(s => s.group === 'dock');
  setLv(S, sp, 1); setLv(S, dk, 1); const t = H.stats(S);
  assert.equal(t.learned, 2); assert.equal(t.started, 2, '秒答类三四年级算「秒答」那个地方');
});
