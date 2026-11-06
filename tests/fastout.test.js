// Ben 11-05：累计秒答 4 次的题不再出；错题穿插进练习；答错的题当场多练
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js');
const blank = () => ({v: 2, cards: {}, boss: {}, log: {}, mistakes: {}, level: 0, placedAt: 1, known: {}, settings: {}, skills: {}});
const rnd = (seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; })(9);
const addDays = (d, n) => C.addDays(d, n);
const card = K.SKILLS.flatMap(s => s.items).find(it => !it.gen && K.BY[it.skill].pre.length === 0);
const genIt = K.SKILLS.flatMap(s => s.items).find(it => K.ITEM[it.id].gen && K.BY[it.skill].nb);

test('卡：累计秒答 4 次变深红、之后不再出', () => {
  const S = blank(); let day = '2026-11-05';
  for (let d = 0; d < 2; d++) {
    const inst = K.make(card.id, rnd);
    for (let i = 0; i < 2; i++) { const s = E.session(S, day, {rnd}); s.inject({kind: 'q', inst, seg: 'fluency'}); s.answer({ok: true, fast: true, secs: 2}); }
    day = addDays(day, 1);
  }
  assert.equal(E.lv(S, card.id), 3);
  assert.ok(E.outOf(S, card.id));
  const s = E.free(S, day, K.ITEM[card.id].skill); const seen = [];
  for (let x = s.next(); x; x = s.next()) { if (x.kind === 'q') { seen.push(x.inst.id); s.answer({ok: true, fast: true, secs: 2}); } }
  assert.ok(!seen.includes(card.id), '下架的卡又出现了');
});

test('新卡正好 4 次秒答才下架，3 次不下架（首次作答不重复计数）', () => {
  const S = blank(), inst = K.make(card.id, rnd); let day = '2026-11-05';
  const hit = () => { const s = E.session(S, day, {rnd}); s.inject({kind: 'q', inst, seg: 'new'}); s.answer({ok: true, fast: true, secs: 2}); };
  hit(); hit(); day = addDays(day, 1); hit();
  assert.equal(S.fast[K.mkey(inst)][0], 3); assert.ok(!E.outOf(S, card.id));
  hit();
  assert.equal(S.fast[K.mkey(inst)][0], 4); assert.equal(E.lv(S, card.id), 3);
});

test('一天最多记 2 次：同一天秒答 10 次也不下架（底线：至少跨两天）', () => {
  const S = blank(), day = '2026-11-05', inst = K.make(card.id, rnd);
  for (let i = 0; i < 10; i++) { const s = E.session(S, day, {rnd}); s.inject({kind: 'q', inst, seg: 'fluency'}); s.answer({ok: true, fast: true, secs: 2}); }
  assert.ok(!E.outOf(S, card.id));
});

test('答对但不够快、再来一次、偷看都不算秒答', () => {
  const S = blank(), inst = K.make(card.id, rnd); let day = '2026-11-05';
  for (let d = 0; d < 6; d++) {
    for (const [x, res] of [[{kind: 'q', inst, seg: 'new'}, {ok: true, fast: false, secs: 9}], [{kind: 'q', inst, seg: 'new', retry: 1}, {ok: true, fast: true, secs: 1}], [{kind: 'q', inst, seg: 'new'}, {ok: true, fast: true, peeked: true, secs: 1}]]) {
      const s = E.session(S, day, {rnd}); s.inject(x); s.answer(res);
    }
    day = addDays(day, 1);
  }
  assert.ok(!S.fast || !S.fast[K.mkey(inst)], '不该记秒答次数');
});

test('题型：只下架答过的那一道，别的题还出；全部下架后这一格深红', () => {
  const S = blank(), pool = K.rawPool(genIt.id); let day = '2026-11-05';
  for (const p of pool) (S.fast = S.fast || {})[K.mkey({id: genIt.id, q: p.q})] = [4, '2026-11-01', 0];
  const keep = pool[0]; S.fast[K.mkey({id: genIt.id, q: keep.q})] = [1, '2026-11-01', 0];
  const s = E.free(S, day, K.ITEM[genIt.id].skill); const qs = [];
  for (let x = s.next(); x; x = s.next()) { if (x.kind === 'q') { if (x.inst.id === genIt.id) qs.push(K.mkey(x.inst)); s.answer({ok: true, fast: false, secs: 2}); } }
  assert.ok(qs.length > 0 && qs.every(k => k === K.mkey({id: genIt.id, q: keep.q})), '只该出还没下架的题');
  S.fast[K.mkey({id: genIt.id, q: keep.q})] = [4, '2026-11-01', 0];
  const s2 = E.free(S, addDays(day, 1), K.ITEM[genIt.id].skill);
  for (let x = s2.next(); x; x = s2.next()) if (x.kind === 'q') { assert.notEqual(x.inst.id, genIt.id); s2.answer({ok: true, fast: false, secs: 2}); }
  assert.equal(E.lv(S, genIt.id), 3);
});

test('旧存档：卡已深红直接不出；淡黄淡红折算已有次数；没有 fast 字段不崩', () => {
  const S = blank(); S.skills[card.id] = {lv: 2, d: ['2026-11-03', '2026-11-04'], seen: 3, lastDay: '2026-11-04', win: []};
  const inst = K.make(card.id, rnd); let day = '2026-11-05';
  let s = E.session(S, day, {rnd}); s.inject({kind: 'q', inst, seg: 'fluency'}); s.answer({ok: true, fast: true, secs: 2});
  assert.ok(E.lv(S, card.id) < 3, '2+1 次还不够');
  day = addDays(day, 1); s = E.session(S, day, {rnd}); s.inject({kind: 'q', inst, seg: 'fluency'}); s.answer({ok: true, fast: true, secs: 2});
  assert.equal(E.lv(S, card.id), 3, '2+2 次下架');
});

function seedMistakes(n, day) {
  const S = blank(); const its = K.SKILLS.flatMap(s => s.items).filter(it => K.ITEM[it.id].gen && !K.BY[it.skill].speed).slice(0, n);
  its.forEach(it => { E.addMistake(S, K.make(it.id, rnd), C.addDays(day, -1)); });
  return S;
}
test('今日练习：错题穿插，不集中在开头，第一题不是错题', () => {
  const day = '2026-11-05', S = seedMistakes(6, day); const s = E.session(S, day, {rnd}); const seq = [];
  for (let x = s.next(); x && seq.length < 40; x = s.next()) { if (x.kind !== 'q') continue; seq.push(x.mkey ? 'm' : 'o'); s.answer({ok: true, fast: false, secs: 6}); }
  assert.equal(seq[0], 'o');
  assert.ok(seq.includes('m'), '错题没有出现');
  assert.ok(!/mm/.test(seq.join('').slice(0, seq.join('').lastIndexOf('o'))), '还有别的题时错题不该连着：' + seq.join(''));
});

test('答错的题当场再来两次：隔 3 题一次、再隔 8 题一次', () => {
  const S = blank(), day = '2026-11-05', s = E.session(S, day, {rnd}); let first = null, n = 0; const at = [];
  for (let x = s.next(); x && n < 30; x = s.next()) {
    if (x.kind !== 'q') continue; n++;
    if (!first) { first = K.mkey(x.inst); at.push(n); s.answer({ok: false, secs: 3}); continue; }
    if (K.mkey(x.inst) === first && x.retry) { at.push(n); }
    s.answer({ok: true, fast: false, secs: 3});
  }
  assert.equal(at.length, 3, '出现位置：' + at);
  assert.ok(at[1] - at[0] >= 3 && at[2] - at[1] >= 8, '位置：' + at);
});

test('10 分钟里前 15 天简单题不再占绝大多数（模拟）', () => {
  const S = blank(); let day = '2026-11-05'; const big = x => Math.max(x.inst.ans || 0, ...Object.values(x.inst.q || {}).filter(v => typeof v === 'number'));
  let low = 0, all = 0;
  for (let d = 0; d < 15; d++) {
    const s = E.session(S, day, {rnd}); let n = 0;
    for (let x = s.next(); x && n < 300; x = s.next()) { if (x.kind !== 'q') continue; n++; if (d >= 7) { all++; if (big(x) <= 10) low++; } const ok = rnd() < .9; s.answer({ok, fast: ok && rnd() < .6, secs: 6}); }
    day = addDays(day, 1);
  }
  assert.ok(low / all < .7, '第 8—15 天 10 以内占 ' + Math.round(low / all * 100) + '%（改前约 85%）');
});

test('练这一块：12 题不被第一个技能占满，能练的技能都出现', () => {
  const S = blank(); K.SKILLS.filter(s => s.group === 'bond').forEach(s => s.pre.forEach(p => K.BY[p].items.forEach(it => { const q = E.prog(S, it.id); q.lv = 1; q.d = ['2026-11-01']; })));
  S.settings = {levels: [2, 3, 5]};
  const rd = K.SKILLS.filter(s => s.group === 'bond' && E.ready(S, s.id) && s.items.some(it => E.itemOn(S, it.id))).map(s => s.id);
  assert.ok(rd.length >= 2);
  const s = E.free(S, '2026-11-05', 'bond', {rnd}), seen = new Set();
  for (let x = s.next(); x; x = s.next()) { if (x.kind !== 'q') continue; seen.add(K.ITEM[x.inst.id].skill); s.answer({ok: true, fast: false, secs: 5}); }
  rd.slice(-3).forEach(id => assert.ok(seen.has(id), id + ' 没出现，只出了 ' + [...seen]));
});

test('审查 2 轮：下架时对应错题算过关，不再以错题回来；宝箱不再计', () => {
  const S = blank(), inst = K.make(card.id, rnd); let day = '2026-11-05';
  E.addMistake(S, inst, '2026-11-01');
  assert.equal(E.dueMistakes(S, day).length, 1);
  Object.assign(E.prog(S, card.id), {lv: 3, d: ['2026-10-01', '2026-10-02', '2026-10-06']});
  E.session(S, day, {rnd});
  assert.equal(E.dueMistakes(S, day).length, 0);
  assert.equal(Object.values(S.mistakes)[0].due, null);
});
test('审查 2 轮：导入备份保留秒答次数，按题取大', () => {
  const v = Object.assign(C.blank(), {fast: {a: [4, '2026-11-01', 1], b: [1, '2026-11-01', 1]}});
  const S = Object.assign(C.blank(), {fast: {b: [3, '2026-11-02', 2], c: [2, '2026-11-02', 1]}});
  const M = C.importMerge(S, JSON.stringify(v));
  assert.deepEqual(M.fast, {a: [4, '2026-11-01', 1], b: [3, '2026-11-02', 2], c: [2, '2026-11-02', 1]});
});
test('审查 2 轮：今日练习一天最多复习 15 道错题，多的顺延', () => {
  const day = '2026-11-05', S = blank(); K.SKILLS.flatMap(s => s.items).filter(it => it.gen && !K.BY[it.skill].speed).slice(0, 30).forEach(it => E.addMistake(S, K.make(it.id, rnd), '2026-11-01'));
  assert.ok(E.dueMistakes(S, day).length > 15);
  const s = E.session(S, day, {rnd}); let m = 0, n = 0;
  for (let x = s.next(); x && n < 400; x = s.next()) { if (x.kind !== 'q') continue; n++; if (x.mkey) m++; s.answer({ok: true, fast: false, secs: 4}); }
  assert.equal(m, 15);
  assert.ok(E.dueMistakes(S, day).length > 0, '多的留着');
});
test('审查 2 轮：全部下架 → groupOut / allOut 为真；今天不计练习天数', () => {
  const S = blank(), day = '2026-11-05';
  K.SKILLS.concat(K.HARD).flatMap(s => s.items).forEach(it => { Object.assign(E.prog(S, it.id), {lv: 3, d: ['2026-10-01', '2026-10-02', '2026-10-06']}); if (it.gen) E.prog(S, it.id).out = 1; });
  assert.ok(E.groupOut(S, 'bond', day)); assert.ok(E.allOut(S, day));
  const s = E.session(S, day, {rnd}); assert.equal(s.next(), null);
  assert.ok(!(S.stats[day] && S.stats[day].done), '0 题不算一天');
  const F = blank(); assert.ok(!E.groupOut(F, 'bond', day)); assert.ok(!E.allOut(F, day));
});
test('审查 2 轮：「练这一块」前置已满足的先出，不够 12 题才按从易到难带上后面的；不会一上来出最难的', () => {
  const day = '2026-11-05';
  for (const g of ['line', 'cmp', 'bond', 'dock', 'garden']) {
    const S = blank(), s = E.free(S, day, g, {rnd}), list = []; let n = 0;
    const order = K.SKILLS.filter(x => x.group === g && x.items.some(it => E.itemOn(S, it.id))).map(x => x.id);
    for (let x = s.next(); x; x = s.next()) { if (x.kind !== 'q') continue; n++; if (!x.retry) list.push(K.ITEM[x.inst.id].skill); s.answer({ok: true, fast: false, secs: 5}); }
    assert.equal(n, 12, g + ' 只有 ' + n + ' 题');
    const nr = order.filter(id => !E.ready(blank(), id)), firstNr = list.findIndex(id => nr.includes(id));
    if (firstNr >= 0) assert.ok(firstNr >= Math.min(3, list.filter(id => !nr.includes(id)).length), g + ' 没满足前置的排在了能练的前面：' + list);   // 防连续：同一技能连 3 题后可以先插别的
    const used = order.filter(id => list.includes(id)); assert.deepEqual(used, order.slice(0, used.length).filter(id => used.includes(id)));
    if (order.length > 2) assert.ok(!list.slice(0, 3).includes(order[order.length - 1]) || E.ready(blank(), order[order.length - 1]), g + ' 一上来出最难的：' + list);
  }
});

test('审查 3 轮：排着队时下架的题不再出；下架错题不算「过完 5 次复习」', () => {
  const H = require('../v2/home.js'), S = blank(), inst = K.make(card.id, rnd), day = '2026-11-05';
  E.addMistake(S, inst, '2026-11-01'); Object.assign(E.prog(S, card.id), {lv: 3, d: ['2026-10-01', '2026-10-02', '2026-10-06']});
  E.sweep(S); const m = Object.values(S.mistakes)[0];
  assert.equal(m.due, null); assert.equal(m.out, 1); assert.equal(H.stats(S).solved, 0);
  const seen = []; const s = E.session(S, day, {rnd});
  for (let x = s.next(), g = 0; x && g < 200; x = s.next(), g++) { if (x.kind !== 'q') continue; seen.push(x.inst.id); s.answer({ok: true, fast: true, secs: 3}); }
  assert.ok(!seen.includes(card.id));
});
