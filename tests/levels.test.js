// 15 级难度（说明书-难度分级）：每道题有级别、每级够题、不越级、新题答案对
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), HB = require('../v2/hardbank.js'), E = require('../v2/engine.js'), R = require('../v2/render.js');
const blank = () => { const S = C.blank(); S.placedAt = 1; S.demoSeen = Object.fromEntries(K.SKILLS.concat(K.HARD).map(s => [s.id, true])); return S; };
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const play = (S, day, ans, n = 400) => { const s = E.session(S, day, {rnd: seeded(5)}), qs = []; for (let x = s.next(), g = 0; x && g < n; x = s.next(), g++) if (x.kind === 'q') { qs.push(x.inst); s.answer(ans ? ans(x) : {ok: true, fast: true, secs: 5}); } return qs; };
const D = n => C.addDays('2026-11-01', n);
const all = K.SKILLS.concat(K.HARD);
const each = fn => all.forEach(s => s.items.forEach(it => {
  if (!it.gen) return fn(s, it, {id: it.id, q: it.q, ans: it.ans});
  const p = K.rawPool(it.id);
  if (p) return p.forEach(x => fn(s, it, {id: it.id, q: x.q, ans: x.ans}));
  const seen = new Set(); for (let k = 0; k < 2500; k++) { const i = K.make(it.id); const key = i.q.a + ',' + i.q.b; if (!seen.has(key)) { seen.add(key); fn(s, it, i); } }
}));
test('一共 15 级，每级有名字和说明', () => {
  assert.equal(K.LEVELS.length, 15); K.LEVELS.forEach((l, i) => { assert.equal(l.n, i + 1); assert.ok(l.name && l.what); });
});
test('每道题都有 1–15 的级别；每级至少 40 道题、至少 2 个技能', () => {
  const n = {}, sk = {};
  each((s, it, i) => { const L = K.levelOf(i); assert.ok(L >= 1 && L <= 15, `${i.id} ${JSON.stringify(i.q)} 级别 ${L}`); n[L] = (n[L] || 0) + 1; (sk[L] = sk[L] || new Set()).add(s.id); });
  K.LEVELS.forEach(l => { assert.ok(n[l.n] >= 40, `第 ${l.n} 级只有 ${n[l.n]} 道`); assert.ok(sk[l.n].size >= 2, `第 ${l.n} 级只有 ${[...sk[l.n]]}`); });
});
test('不越级：低级别的题数字不超过这一级的范围', () => {
  const cap = {1: 10, 2: 10, 3: 20, 4: 20};
  each((s, it, i) => { const L = K.levelOf(i); if (!cap[L] || i.q.view === 'clock' || i.q.view === 'pat') return; const big = Math.max(i.ans || 0, ...Object.values(i.q).filter(v => typeof v === 'number' && v < 200)); assert.ok(big <= cap[L] || s.group === 'line', `${i.id} 第 ${L} 级出现 ${big}`); });
});
test('秒答世界 7（6 + 0、10 − 0、7 − 7）剔除；前置和伙伴不受影响', () => {
  assert.ok(!K.BY['speed:L1:6']);
  C.unitsOf(0).forEach(u => assert.ok(u.a && u.b && !(u.op === '-' && u.a === u.b), u.id));
});
test('新题答案用另写的算法重算', () => {
  const P = HB.pools;
  const num = t => t.match(/\d+/g).map(Number);
  ['dock:h:20', 'dock:h:50', 'dock:h:100', 'dock:h:mul2', 'dock:h:mul', 'dock:h:div', 'market:h:change'].forEach(id => P[id].forEach(x => {
    const [a, b] = num(x.q.text), op = x.q.text.match(/[+−×÷]/)[0];
    assert.equal(x.ans, op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b, x.q.say);
    num(x.q.say).forEach(v => assert.ok(num(x.q.text).includes(v) || id.startsWith('dock:h:mul') || id === 'dock:h:div' || id === 'market:h:change', x.q.say));
    assert.ok(x.ans > 0 && Number.isInteger(x.ans), x.q.say);
  }));
  P['market:h:pay'].forEach(x => { const t = [...x.q.say.matchAll(/(\d+) 张 (\d+) 元/g)].reduce((s, m) => s + m[1] * m[2], 0); assert.equal(x.ans, t, x.q.say); assert.ok(!/\b2 元/.test(x.q.say), '没有 2 元'); });
  P['market:h:clock'].forEach(x => { assert.equal(x.ans, x.q.m); assert.ok(x.q.m % 5 === 0 && x.q.m !== 30); });
  ['garden:h:skip', 'garden:h:down'].forEach(id => P[id].forEach(x => { const [a, b, c] = num(x.q.text); assert.equal(b - a, c - b); assert.equal(x.ans, c + (c - b)); assert.ok(x.ans >= 0); }));
  P['speed:h:mul2'].forEach(x => { const [a, b] = num(x.q.text); assert.equal(x.ans, a * b); });
  P['speed:h:div'].forEach(x => { const [a, b] = num(x.q.text); assert.equal(x.ans, a / b); });
  assert.equal(P['speed:h:mul2'].length, 48); assert.equal(P['speed:h:div'].length, 64);
});
test('题目不重复', () => {
  Object.entries(HB.pools).forEach(([id, l]) => { const k = l.map(x => JSON.stringify(x.q)); assert.equal(new Set(k).size, k.length, id); });
});

K.LEVELS.forEach(l => test(`手选第 ${l.n} 级：今日练习只出这一级，有题可练`, () => {
  const S = blank(); S.settings = {levels: [l.n]};
  const qs = play(S, D(0));
  assert.ok(qs.length >= 10, `只有 ${qs.length} 题`);
  qs.forEach(i => assert.equal(K.levelOf(i), l.n, i.id));
  assert.ok(qs.length > 0);
}));
test('手选几级：练这一块也只出这几级；前置不管；没有题的地方标出来', () => {
  const S = blank(); S.settings = {levels: [12, 15]};
  const s = E.free(S, D(0), 'place', {rnd: seeded(1)}); let n = 0;
  for (let x = s.next(); x; x = s.next()) if (x.kind === 'q') { n++; assert.ok([12, 15].includes(K.levelOf(x.inst))); s.answer({ok: true, fast: false, secs: 5}); }
  assert.equal(n, 12);
  assert.ok(E.groupEmpty(S, 'look')); assert.ok(!E.groupEmpty(S, 'dock'));
});
test('手选后错题只回来选中级别的，其他暂停不丢；改回自动都回来', () => {
  const S = blank(); E.addMistake(S, K.make('cmp:t:10', seeded(1)), D(-3)); E.addMistake(S, K.make('speed:h:mul', seeded(1)), D(-3));
  S.settings = {levels: [8]};
  assert.deepEqual(E.dueMistakes(S, D(0)).map(m => m.uid), ['speed:h:mul']);
  S.settings = {levels: [1]};
  assert.deepEqual(E.dueMistakes(S, D(0)).map(m => m.uid), ['cmp:t:10']);
  assert.equal(Object.keys(S.mistakes).length, 2);
  S.settings = {levels: null}; assert.deepEqual(E.dueMistakes(S, D(0)).map(m => m.uid), ['cmp:t:10']);
});
test('自动：零进度开放到第 2 级，不出高级别题；10 分钟用得满', () => {
  const S = blank(); assert.equal(E.autoLevel(S), 2);
  const qs = play(S, D(0)); qs.forEach(i => assert.ok(K.levelOf(i) <= 2, i.id));
  assert.ok(qs.length >= 40, '只有 ' + qs.length + ' 题');
});
test('自动：不会卡死，好孩子一路开到第 15 级，每一级的题都能出', () => {
  const S = blank(), seen = new Set(); let d = 0;
  for (; d < 400 && (E.autoLevel(S) < 15 || seen.size < 15); d++) play(S, D(d)).forEach(i => seen.add(K.levelOf(i)));
  assert.equal(E.autoLevel(S), 15, `第 ${d} 天还在第 ${E.autoLevel(S)} 级`);
  assert.equal(seen.size, 15, '出现过的级别 ' + [...seen]);
});
test('自动：三四年级开得慢（第 10 级起每级至少隔 25 个练习日），手选不受限', () => {
  const S = blank(), first = {}; let d = 0;
  for (; d < 400 && E.autoLevel(S) < 15; d++) { play(S, D(d)); const t = E.autoLevel(S); if (!first[t]) first[t] = d; }
  for (let L = 11; L <= 15; L++) assert.ok(first[L] - first[L - 1] >= 25, `第 ${L} 级只隔 ${first[L] - first[L - 1]} 天`);
  assert.ok(first[15] >= 150, `第 ${first[15]} 天就到第 15 级`);
  const P = blank(); P.settings = {levels: [15], levelsV: 2}; assert.ok(play(P, D(0)).every(i => K.levelOf(i) === 15));
});
test('自动：没练够的孩子（只淡黄，没到深红）开不到第 10 级', () => {
  const S = blank(); K.SKILLS.concat(K.HARD).forEach(s => s.items.forEach(it => Object.assign(E.prog(S, it.id), {lv: 1, d: [D(-5)], seen: 3, lastDay: D(-1)})));
  S.lvTop = 15; assert.ok(E.autoLevel(S) <= 10, '开放到 ' + E.autoLevel(S));
});
test('自动：摸底全对的孩子不用从第 1 级起', () => {
  const S = blank(); S.known = Object.fromEntries(K.understand.filter(s => !s.nb).map(s => [s.id, true]));   // 真实摸底只测理解，不测秒答
  assert.ok(E.autoLevel(S) >= 5, '开放到 ' + E.autoLevel(S));
  const seen = play(S, D(0)).slice(0, 30).map(i => K.levelOf(i)); assert.ok(Math.max(...seen) >= 3, '前 30 题还是低级别：' + seen);
});
test('旧存档：没有 settings.levels 或还留着 settings.hard 都不报错；选择跟着备份走', () => {
  const O = blank(); delete O.settings; assert.ok(play(O, D(0)).length);
  const H = blank(); H.settings = {hard: {look: true}}; assert.ok(play(H, D(0)).length);
  const T = blank(); T.settings = {levels: [3, 5], levelsV: 2}; assert.deepEqual(C.importText(C.exportText(T)).settings.levels, [3, 5]);
});
test('每道新题都能画题面和图解，不露答案', () => {
  ['dock:h:20', 'dock:h:div', 'market:h:pay', 'market:h:clock', 'garden:h:skip', 'speed:h:div'].forEach(id => HB.pools[id].slice(0, 5).forEach(x => {
    const inst = {id, q: x.q, ans: x.ans}, v = R.question(inst); assert.ok(v.html.length > 5); assert.equal(v.input, 'write'); assert.ok(R.explain(inst).includes(String(x.ans)));
    assert.ok(!/undefined/.test(v.html + R.explain(inst)));
    assert.ok(!R.mistLabel({src: 1, uid: id, q: x.q}).includes('undefined'));
  }));
  K.HARD.forEach(s => assert.ok(R.demo(s.id).length > 20, s.id));
});

K.LEVELS.forEach(l => test(`手选第 ${l.n} 级：一天能练满 10 分钟`, () => {
  const S = blank(); S.settings = {levels: [l.n]};
  const s = E.session(S, D(0), {rnd: seeded(9)}); let n = 0;
  for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') { n++; s.answer({ok: true, fast: true, secs: 6}); }
  assert.ok(s.elapsed >= 590, `第 ${l.n} 级只练了 ${s.elapsed} 秒、${n} 题`);
}));
test('手选时第一次遇到新题有示范卡', () => {
  const S = C.blank(); S.placedAt = 1; S.settings = {levels: [15]};
  const s = E.session(S, D(0), {rnd: seeded(2)}); assert.equal(s.next().kind, 'demo');
});
test('放错级修正：过十的 20 以内分合第 4 级；凑一百第 7 级；50 以内应用题没有两位数加减两位数；倒着跳不到三位数', () => {
  HB.pools['bond:h:20'].forEach(x => { const a = +x.q.text.match(/= (\d+)/)[1], L = K.levelOf({id: 'bond:h:20', q: x.q, ans: x.ans}); assert.equal(L, a >= 10 || x.ans >= 10 ? 3 : 4); });
  HB.pools['bond:h:to100'].forEach(x => { const a = +x.q.text.match(/^\d+/)[0]; assert.equal(K.levelOf({id: 'bond:h:to100', q: x.q, ans: x.ans}), 7); });
  HB.pools['dock:h:50'].forEach(x => { const [a, b] = x.q.text.match(/\d+/g).map(Number); assert.ok(Math.min(a, b) < 10, x.q.say); });
  HB.pools['garden:h:down'].forEach(x => assert.ok(x.q.text.match(/\d+/g).every(v => +v <= 100), x.q.text));
});
test('量词对：应用题不出现「个箭」「个小鱼」「个钻石」「用掉」', () => {
  Object.entries(HB.pools).filter(([k]) => k.startsWith('dock:')).forEach(([, l]) => l.forEach(x => assert.ok(!/个(箭|小鱼|钻石|石块|金币)|用掉/.test(x.q.say), x.q.say)));
});

test('20 以内分合要先会凑十（捣蛋鬼第 1 轮第 6 条）', () => {
  const K = require('../v2/skills.js');
  assert.deepEqual(K.BY.bondH3.pre, ['bond3']); assert.ok(K.topoOk());
});
