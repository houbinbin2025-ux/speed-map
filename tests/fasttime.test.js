// 每道题都有秒答时间（说明书-秒答时间）：只有秒答才算学会
'use strict';
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), G = require('../v2/gems.js'), R = require('../v2/render.js');
const ALL = K.SKILLS.concat(K.HARD);
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const DAY = '2026-11-07';
const blank = () => { const S = C.blank(); S.settings = S.settings || {}; S.settings.levels = K.LEVELS.map(l => l.n); return S; };

test('每个题型都定了秒答时间（新增题型不定就拦）', () => {
  ALL.forEach(s => s.items.forEach(it => { const t = K.fastThink(it.id); assert.ok(t > 0 && t <= 60, it.id + ' 没定秒答时间：' + t); }));
});

test('题库每一道题算得出秒答时间；答错的题型也不会没有', () => {
  ALL.forEach(s => s.items.forEach(it => {
    const inst = K.make(it.id, seeded(7));
    [{}, {oral: true}, {speed: 1500}].forEach(o => { const ms = K.fastMs(inst, o); assert.ok(Number.isFinite(ms) && ms >= 2000, it.id + ' ' + ms); });
  }));
});

test('秒答时间 = 想 + 读题 + 写字：应用题读得多就多给，答案位数多就多给，口答不算写字', () => {
  const word = K.make('dock:t:join', seeded(1)), say = (word.q.say.match(/[一-鿿]/g) || []).length;
  assert.ok(say > 0);
  assert.equal(K.fastMs(word, {oral: true}), K.fastThink(word.id) * 1000 + say * 400);
  assert.equal(K.fastMs(word, {oral: true, en: true}), K.fastThink(word.id) * 1000 + say * 600, '英文日读题多给一半');
  assert.equal(K.fastMs(word, {speed: 800}), K.fastThink(word.id) * 1000 + say * 400 + 800 * C.digits(word.ans));
});

test('秒答卡和原来的时限一样，老孩子不被卡得更紧', () => {
  C.UNITS.filter(u => K.ITEM[u.id]).forEach(u => { assert.equal(K.fastThink(u.id) * 1000, u.fast); });
  const u = C.UNITS.find(x => !x.gen && K.ITEM[x.id]), inst = {id: u.id, q: {a: u.a, op: u.op, b: u.b}, ans: u.ans};
  assert.equal(K.fastMs(inst, {speed: 900}), C.fastLimit(u, u.ans, 'write', 900));
});

test('任何题答对但慢都不算合格，也不能点亮', () => {
  ALL.forEach(s => s.items.forEach(it => {
    const S = blank(), out = E.record(S, it.id, {ok: true, fast: false}, DAY);
    assert.equal(out.pass, false, it.id); assert.equal(out.up, false, it.id); assert.equal(E.lv(S, it.id), 0, it.id);
  }));
});

test('答对且快才合格', () => {
  const S = blank(), id = K.BY.bond2.items[0].id;
  assert.equal(E.record(S, id, {ok: true, fast: true}, DAY).pass, true);
  assert.equal(E.lv(S, id), 1);
});

test('慢答不进错题宝箱，不计入下架次数（三四年级新题也一样）', () => {
  const S = blank(), s = E.session(S, DAY, {rnd: seeded(3)}), inst = K.make('dock:g10:remain', seeded(2));
  s.inject({kind: 'q', inst, seg: 'fluency'});
  s.answer({ok: true, fast: false, secs: 20});
  assert.equal(Object.keys(S.mistakes).length, 0);
  assert.equal((S.fast || {})[E.qkey(inst)], undefined);
  s.inject({kind: 'q', inst, seg: 'fluency'});
  s.answer({ok: true, fast: true, secs: 5});
  assert.equal(S.fast[E.qkey(inst)][0], 1);
});

test('错题复习答对但慢：不过关，明天再来', () => {
  const S = blank(), inst = K.make('dock:t:join', seeded(2)), key = E.addMistake(S, inst, '2026-11-06');
  const s = E.session(S, DAY, {rnd: seeded(3)});
  s.inject({kind: 'q', inst, seg: 'review', mkey: key});
  s.answer({ok: true, fast: false, secs: 20});
  assert.equal(S.mistakes[key].passes, 0);
  assert.equal(S.mistakes[key].due, '2026-11-08');
});

test('深红的维持复习答得慢：间隔从头算', () => {
  const S = blank(), id = K.BY.bond2.items[0].id, p = E.prog(S, id);
  Object.assign(p, {lv: 3, d: ['2026-09-01', '2026-09-02', '2026-09-06'], keep: 2});
  const s = E.session(S, DAY, {rnd: seeded(3)});
  s.inject({kind: 'q', inst: K.make(id, seeded(1)), seg: 'fluency', keep: true});
  s.answer({ok: true, fast: false, secs: 20});
  assert.equal(E.peek(S, id).keep, 0);
  assert.equal(E.lv(S, id), 3, '只升不降');
});

test('再看一次不算数，但不清维持复习的间隔', () => {
  const S = blank(), id = K.BY.bond2.items[0].id, p = E.prog(S, id);
  Object.assign(p, {lv: 3, d: ['2026-09-01', '2026-09-02', '2026-09-06'], keep: 2});
  const s = E.session(S, DAY, {rnd: seeded(3)});
  s.inject({kind: 'q', inst: K.make(id, seeded(1)), seg: 'fluency', keep: true});
  const out = s.answer({ok: true, fast: true, peeked: true, secs: 2});
  assert.equal(out.pass, false); assert.equal(E.peek(S, id).keep, 2);
  assert.deepEqual(R.okWords(K.make(id, seeded(1)), out, 3), {big: '✓ 对了', small: ''});
});

test('摸底答对但慢不算会', () => {
  const S = C.blank(), pl = E.placement(S, DAY, {rnd: seeded(5)});
  for (let x = pl.next(), g = 0; x && g < 200; x = pl.next(), g++) pl.answer({ok: true, fast: false, secs: 1});
  assert.equal(Object.keys(S.known).length, 0);
  assert.equal(K.SKILLS.filter(s => s.items.some(it => E.lv(S, it.id) > 0)).length, 0);
});

test('摸底答对且快照常算会', () => {
  const S = C.blank(), pl = E.placement(S, DAY, {rnd: seeded(5)});
  for (let x = pl.next(), g = 0; x && g < 200; x = pl.next(), g++) pl.answer({ok: true, fast: true, secs: 1});
  assert.ok(Object.keys(S.known).length > 0);
});

test('习惯记录按天记秒答次数', () => {
  const S = blank(), s = E.session(S, DAY, {rnd: seeded(3)}), inst = K.make('dock:t:join', seeded(2));
  s.inject({kind: 'q', inst, seg: 'fluency'}); s.answer({ok: true, fast: true, secs: 3});
  s.inject({kind: 'q', inst: K.make('dock:t:join', seeded(9)), seg: 'fluency'}); s.answer({ok: true, fast: false, secs: 30});
  const h = E.habit(S, DAY).now; assert.equal(h.f, 1); assert.equal(h.r, 2);
});

test('慢答只给 1 个小碎片，不算答错；即使这格本该给中碎片', () => {
  const st = G.blank ? G.blank() : {}, inst = K.make('dock:t:join', seeded(2));
  const base = {day: DAY, inst, top: 15, lv: 0};
  assert.equal(G.answer(st, Object.assign({ok: true, slow: true}, base)), 's');
  assert.equal(st.inv.s, 1); assert.equal(st.inv.m, 0);
  const D = st.days ? st.days[DAY] : null; if (D) { assert.equal(D.ok, 1); assert.equal(D.bad, 0); }
  assert.ok(G.answer(st, Object.assign({}, base, {ok: true, inst: K.make(K.BY.dockB.items[0].id, seeded(4))})));
});

test('答对的字：秒答写清得了什么碎片，闪电秒答写清多得的', () => {
  const inst = K.make('bond:t:whole9', seeded(1));
  assert.deepEqual(R.okWords(inst, {pass: true}, 0, null, {got: 'm', extra: 1, bolt: false}), {big: '⚡ 秒答！', small: '+1 中碎片 · +1 小碎片'});
  assert.deepEqual(R.okWords(inst, {pass: true, up: true}, 0, null, {got: 's', extra: 2, bolt: true}), {big: '⚡⚡ 闪电秒答！', small: '点亮了 · +1 小碎片 · +1 小碎片 · +1 小碎片'});
  assert.equal(R.okWords(inst, {pass: false}, 0, {used: 8200, limit: 5400}, {got: 's', extra: 0}).small, '这次 9 秒，秒答要 5 秒内 · +1 小碎片');
});

test('答对的字：秒答统一说秒答；慢了说清楚这次和秒答要几秒', () => {
  const inst = K.make('bond:t:whole9', seeded(1));
  assert.equal(R.okWords(inst, {pass: true, up: false}, 0).big, '⚡ 秒答！');
  const w = R.okWords(inst, {pass: false, up: false}, 0, {used: 8200, limit: 5400});
  assert.equal(w.big, '✓ 对了'); assert.equal(w.small, '这次 9 秒，秒答要 5 秒内');
  assert.equal(R.okWords(inst, {pass: false, up: false}, 0).small, '再快一点才算学会');
  const line = K.make(K.BY.line1.items[0].id, seeded(1));
  assert.equal(R.okWords(line, {pass: true}, 0).big, '⚡ 秒答！');
  assert.equal(R.okWords(line, {pass: false}, 0).big, '✓ 很接近');
});
