const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../v2/gems.js');
const C = require('../v2/core.js');
const K = require('../v2/skills.js');
const E = require('../v2/engine.js');

const DAY = '2026-11-06';
const card = K.SKILLS.find(s => !s.speed && s.items.some(it => !it.gen)).items.find(it => !it.gen);
const inst = K.make(card.id);
const genSkill = K.SKILLS.find(s => s.items.filter(it => it.gen).length >= 1 && K.rawPool(s.items.find(it => it.gen).id) && K.rawPool(s.items.find(it => it.gen).id).length >= 3);
const genItem = genSkill.items.find(it => it.gen);
const q = i => { const x = K.rawPool(genItem.id)[i]; return {id: genItem.id, q: Object.assign({}, x.q), ans: x.ans}; };
const ans = (st, o) => G.answer(st, Object.assign({day: DAY, inst, ok: true, top: 1, lv: 3}, o));

test('答对普通题：小碎片；已学稳、低于当前级别。不传倍数按金色（×2）', () => {
  const st = G.blank();
  assert.deepEqual(ans(st, {top: 99}), ['b']);
  assert.deepEqual(st.inv, {a: 0, b: 1, g: 0, s: 0, m: 0, h: 0, l: 0});
});

test('没学过的格子：今天第一道答对给中碎片，同格后面的给小碎片；学过的格子不给', () => {
  const st = G.blank();
  assert.deepEqual(G.answer(st, {day: DAY, inst: q(0), ok: true, top: 99, lv: 0}), ['m']);
  assert.deepEqual(G.answer(st, {day: DAY, inst: q(1), ok: true, top: 99, lv: 0}), ['b']);
  assert.deepEqual(G.answer(G.blank(), {day: DAY, inst: q(0), ok: true, top: 99, lv: 1}), ['b'], '学过一点的格子：比例校准后不再给（Ben 11-07 要 2～3:1）');
  assert.deepEqual(st.inv, {a: 0, b: 1, g: 0, s: 0, m: 1, h: 0, l: 0});
});

test('当前级别的题：今天第一道答对给中碎片', () => {
  const st = G.blank();
  assert.deepEqual(G.answer(st, {day: DAY, inst: q(0), ok: true, top: K.levelOf(q(0)), lv: 3}), ['m']);
});

test('错题隔天答对：中碎片，不受同格限制', () => {
  const st = G.blank();
  G.answer(st, {day: DAY, inst: q(0), ok: true, top: 99, lv: 1});
  assert.deepEqual(G.answer(st, {day: DAY, inst: q(1), ok: true, top: 99, lv: 3, mistake: true}), ['m']);
});

test('每道题每天只有第一次作答算数；错了当天再做不给，隔天照常', () => {
  const st = G.blank();
  assert.equal(ans(st, {ok: false}), null);
  assert.deepEqual([...ans(st, {ok: true})], ['a'], '当天再做对：只给 1 个普通小碎片');
  assert.equal(st.days[DAY].ok, 0);
  assert.equal(st.days[DAY].bad, 1);
  assert.deepEqual(ans(st, {day: '2026-11-07', top: 99}), ['b']);
});

test('秒答不再多给小碎片（第 10.1 版）；闪电多 1 份中碎片，一天最多 20 次；倍数跟这一题一样', () => {
  const st = G.blank();
  assert.deepEqual(G.speedBonus(st, DAY, false), {extra: [], bolt: false});
  for (let i = 0; i < G.BOLT_DAY; i++) assert.deepEqual(G.speedBonus(st, DAY, true), {extra: ['m'], bolt: true});
  assert.deepEqual(G.speedBonus(st, DAY, true), {extra: [], bolt: false});
  assert.equal(st.inv.b, 0); assert.equal(st.inv.m, G.BOLT_DAY);
  assert.deepEqual(G.speedBonus(G.blank(), '2026-11-09', true, 1).extra, ['s'], '火苗灭：普通碎片');
  assert.deepEqual(G.speedBonus(G.blank(), '2026-11-09', true, 3).extra, ['m', 's'], '火苗亮 + 暴击时刻：金色加普通');
  assert.equal(G.speedBonus(st, '2026-11-07', true).bolt, true, '隔天重新算');
});

test('挑战题慢答：不算错，给 1 个金色小碎片，不算过', () => {
  const st = G.blank(), inst = {id: 'x', q: {a: 1}, ans: 1};
  assert.equal(G.challengeAnswer(st, {day: DAY, inst, ok: true, slow: true}), 'b');
  assert.equal(st.days[DAY].bad, 0); assert.equal(st.inv.b, 1); assert.equal(st.inv.m, 0);
});

test('当场改对：给 1 个普通小碎片（不翻倍、标 rep），不计正确率；看过答案、点不会不给；每天有上限', () => {
  const st = G.blank(), r = ans(st, {retry: true});
  assert.deepEqual([...r], ['a']); assert.equal(r.rep, true);
  assert.equal(st.days[DAY].ok, 0); assert.equal(st.days[DAY].n, 0);
  assert.equal(ans(st, {retry: true, peeked: true}), null); assert.equal(ans(st, {retry: true, dunno: true}), null); assert.equal(ans(st, {retry: true, ok: false}), null);
  for (let i = 0; i < 50; i++) ans(st, {retry: true});
  assert.equal(st.inv.a, G.TUNE.fillMax);
});
test('炼大碎片：合计正好 50 得 1 个大碎片；多了少了全部变废料；大碎片不能放；最多 30 个；空炉不开', () => {
  const st = G.blank(); Object.assign(st.inv, {b: 30, s: 10, l: 2, o3: 2, o7: 1});
  assert.deepEqual(G.forgeBig(st, {b: 20, s: 2}, DAY), {ok: true, big: 1, waste: 0});
  assert.equal(st.inv.l, 3); assert.equal(st.inv.b, 10); assert.equal(st.days[DAY].big, 1);
  assert.deepEqual(G.forgeBig(st, {s: 8, o3: 2, o7: 1}, DAY), {ok: true, big: 0, waste: 53}, '多了也全变废料');
  assert.deepEqual(G.forgeBig(st, {b: 5}, DAY), {ok: true, big: 0, waste: 10}, '少了全变废料');
  assert.equal(st.inv.l, 3); assert.equal(st.days[DAY].forged, 0, '不占炼宝石的上限');
  assert.equal(G.forgeBig(st, {l: 1}, DAY).why, 'lack'); assert.equal(G.forgeBig(st, {}, DAY).why, 'empty');
  const big = G.blank(); big.inv.a = 40; assert.equal(G.forgeBig(big, {a: 31}, DAY).why, 'full'); assert.equal(big.inv.a, 40);
  assert.equal(G.exactBig({b: 25}), true); assert.equal(G.exactBig({b: 24}), false);
  assert.equal(G.forgeBig(G.blank(), {constructor: 1}, DAY).why, 'lack', '原型属性名不能当碎片'); assert.equal(G.forge(G.blank(), {toString: 1}, DAY).why, 'lack');
  for (let i = 0; i < 20; i++) { const t = G.openBox(G.blank(), () => i / 40); assert.ok(['o3', 'o8', 'o12', 'o13'].includes(t), '宝箱的杂色和平时发的一样：' + t); }
});
test('首次答对不带改对标记（rep），秒答奖励、连对能量照常', () => {
  const r = ans(G.blank(), {top: 99}); assert.equal(r.rep, undefined); assert.ok(!r.rep);
});
test('有效时间：最多算这道题标准时间的 3 倍，10～30 秒', () => {
  assert.equal(G.effSecs(25, 5000), 15); assert.equal(G.effSecs(4, 5000), 4); assert.equal(G.effSecs(25, 2000), 10); assert.equal(G.effSecs(60, 20000), 30); assert.equal(G.effSecs(25), 25, '不知道标准时间：按 30 秒封顶');
  assert.equal(G.capOf(5000), 15); assert.equal(G.capOf(1000), 10); assert.equal(G.capOf(20000), 30);
});

test('点不会：不给也不算错，但当天已作答', () => {
  const st = G.blank();
  assert.equal(ans(st, {ok: false, dunno: true}), null);
  assert.equal(st.days[DAY].bad, 0);
  assert.equal(st.days[DAY].n, 1);
  assert.deepEqual([...ans(st, {ok: true})], ['a'], '再答对只给 1 个普通小碎片');
});

test('再看一次后答对：不给碎片，不计正确率', () => {
  const st = G.blank();
  assert.equal(ans(st, {peeked: true}), null);
  assert.equal(st.days[DAY].ok, 0);
  assert.equal(st.days[DAY].bad, 0);
});

test('口答模式完全不算', () => {
  const st = G.blank();
  assert.equal(ans(st, {oral: true}), null);
  assert.equal(st.days[DAY], undefined);
  assert.deepEqual(ans(st, {top: 99}), ['b'], '口答没有占掉当天的第一次作答');
});

test('老秒答流程和新流程同一题 key 相同（asInst 没有 op）', () => {
  const sp = K.SKILLS.find(s => s.speed && s.items.some(it => it.gen)), it = sp.items.find(i => i.gen);
  const made = K.make(it.id, () => 0.5);
  const noOp = {id: it.id, q: {a: made.q.a, b: made.q.b}, ans: made.ans};
  assert.equal(G.key(made), G.key(noOp));
  const st = G.blank();
  G.answer(st, {day: DAY, inst: made, ok: true, top: 99, lv: 3});
  assert.equal(G.answer(st, {day: DAY, inst: noOp, ok: true, top: 99, lv: 3}).rep, true, '算同一题：只给 1 个普通小碎片');
});

test('认真奖励：公式、只加不扣、基数不含奖励和挑战', () => {
  const st = G.blank();
  for (let i = 0; i < 40; i++) G.answer(st, {day: DAY, inst: {id: `c${i}`, q: {}, ans: 1}, ok: true, top: 99, lv: 0, cell: `c${i}`});
  assert.deepEqual(G.settle(st, DAY), {bonus: 10, stars: 3});   // 40 × 0.25 × 1（第 10 版从 0.1 改回 0.25）
  assert.equal(st.inv.m, 50);
  assert.deepEqual(G.settle(st, DAY), {bonus: 0, stars: 3}, '再结算不重复发');
  for (let i = 0; i < 40; i++) G.answer(st, {day: DAY, inst: {id: `w${i}`, q: {}, ans: 1}, ok: false, top: 99, lv: 1, cell: `w${i}`});
  assert.equal(G.settle(st, DAY).bonus, 0);
  assert.equal(st.inv.m, 50, '正确率掉了也不扣');
});

test('认真奖励的星级和 70% 门槛', () => {
  const mk = (ok, bad) => { const st = G.blank(); st.days[DAY] = {ok, bad, n: ok + bad, m: 20, paid: 0, forged: 0, waste: 0}; return G.settle(st, DAY); };
  assert.deepEqual(mk(70, 30), {bonus: 0, stars: 0});
  assert.equal(mk(80, 20).stars, 1);
  assert.equal(mk(85, 15).stars, 2);
  assert.equal(mk(95, 5).stars, 3);
  assert.equal(mk(85, 15).bonus, 3);   // round(20 × 0.25 × 0.5) = 3
});

test('锻造：你的例子，1 大 8 中 = 宝石 1，废料 30', () => {
  const st = G.blank(); st.inv = {s: 0, m: 8, l: 1};
  assert.deepEqual(G.forge(st, {s: 0, m: 8, l: 1}, DAY), {ok: true, gems: 1, waste: 30});
  assert.deepEqual(st.inv, {s: 0, m: 0, l: 0});
  assert.equal(st.days[DAY].forged, 1);
  assert.equal(st.days[DAY].waste, 30);
});

test('锻造：常见配方都正好 100', () => {
  for (const r of [{s: 0, m: 10, l: 0}, {s: 4, m: 8, l: 0}, {s: 10, m: 0, l: 1}, {s: 0, m: 0, l: 2}, {s: 0, m: 5, l: 1}]) {
    const st = G.blank(); st.inv = Object.assign({}, r);
    assert.deepEqual(G.forge(st, r, DAY), {ok: true, gems: 1, waste: 0});
  }
});

test('锻造：不够 100 也能开炉，碎片全部变废料，不算炼出宝石', () => {
  const st = G.blank(); st.inv = {s: 14, m: 1, l: 0};
  assert.equal(G.enough({s: 12, m: 0, l: 0}), false);
  assert.equal(G.enough({s: 0, m: 10, l: 0}), true);
  assert.deepEqual(G.forge(st, {s: 12, m: 0, l: 0}, DAY), {ok: true, gems: 0, waste: 60});
  assert.deepEqual(st.inv, {s: 2, m: 1, l: 0});
  assert.equal(st.days[DAY].forged, 0, '没炼出来不算一颗，也不占每天上限');
  assert.equal(st.days[DAY].waste, 60);
  assert.equal(G.items(st, DAY), '', '没炼出来，领宝石没有东西可报');
});

test('锻造：超过 12 格、碎片不够、空炉都不行', () => {
  const st = G.blank(); st.inv = {s: 20, m: 20, l: 2};
  assert.equal(G.forge(st, {s: 13, m: 0, l: 0}, DAY).why, 'full');
  assert.equal(G.forge(st, {s: 0, m: 0, l: 3}, DAY).why, 'lack');
  assert.equal(G.forge(st, {s: 0, m: 0, l: 0}, DAY).why, 'empty');
  assert.equal(G.forge(st, {s: -1, m: 11, l: 0}, DAY).why, 'lack');
  assert.deepEqual(st.inv, {s: 20, m: 20, l: 2});
});

test('锻造：一天最多 30 颗，碎片留到明天', () => {
  const st = G.blank(); st.inv = {s: 0, m: 320, l: 0};
  for (let i = 0; i < 30; i++) assert.equal(G.forge(st, {s: 0, m: 10, l: 0}, DAY).ok, true);
  assert.equal(G.forge(st, {s: 0, m: 10, l: 0}, DAY).why, 'daily');
  assert.equal(G.dayFull(st, DAY), true); assert.equal(G.dayFull(st, '2026-11-07'), false);
  { const n = st.inv.s; st.inv.s = n + 1; assert.equal(G.forge(st, {s: 1, m: 0, l: 0}, DAY).why, 'daily', '炼满后不够 100 也不开炉，碎片不扣'); assert.equal(st.inv.s, n + 1); st.inv.s = n; }
  assert.equal(st.inv.m, 20);
  assert.equal(G.forge(st, {s: 0, m: 10, l: 0}, '2026-11-07').ok, true);
});

test('最优配方提示（测试和模拟用）：尽量多用小碎片', () => {
  assert.deepEqual(G.bestRecipe({s: 20, m: 20, l: 0}), {s: 4, m: 8, l: 0});
  assert.deepEqual(G.bestRecipe({s: 20, m: 20, l: 1}), {s: 10, m: 0, l: 1});
  assert.equal(G.bestRecipe({s: 12, m: 0, l: 0}), null);
});

test('挑战券：今日练习做完且至少 10 题才发，口答不发', () => {
  const st = G.blank();
  assert.equal(G.earnTicket(st, {done: false, n: 50}), false);
  assert.equal(G.earnTicket(st, {done: true, n: 9}), false);
  assert.equal(G.earnTicket(st, {done: true, n: 50, oral: true}), false);
  assert.equal(st.tickets, 0);
  assert.equal(G.earnTicket(st, {done: true, n: 10}), true);
  assert.equal(st.tickets, 1);
});

test('挑战：进入就扣券，退出不退；没券进不去', () => {
  const st = G.blank();
  assert.equal(G.startChallenge(st), false);
  st.tickets = 1;
  assert.equal(G.startChallenge(st), true);
  assert.equal(st.tickets, 0);
  assert.equal(G.startChallenge(st), false);
});

test('挑战：答对给中碎片，5 题全对加大碎片；重复的题不算全对', () => {
  const st = G.blank(), day = DAY, mk = i => ({id: `h${i}`, q: {}, ans: 1});
  const r = [0, 1, 2, 3, 4].map(i => G.challengeAnswer(st, {day, inst: mk(i), ok: true}));
  assert.deepEqual(r, ['m', 'm', 'm', 'm', 'm']);
  assert.deepEqual(G.finishChallenge(st, {won: r.filter(Boolean).length, n: 5}), {big: true});
  assert.deepEqual(st.inv, {a: 0, b: 0, g: 0, s: 0, m: 5, h: 0, l: 1});
  assert.equal(st.days[day].m, 0, '挑战的中碎片不进认真奖励基数');
  assert.equal(st.days[day].ok, 5, '但正确率算挑战题');
  assert.equal(G.challengeAnswer(st, {day, inst: mk(0), ok: true}), null, '当天重复不给');
  assert.deepEqual(G.finishChallenge(st, {won: 4, n: 5}), {big: false});
});

test('挑战出题：高 1～2 级、没下架、不重复，到顶封顶', () => {
  const S = C.loadState({getItem: () => null, setItem() {}, removeItem() {}}, {}, Date.now());
  S.settings = S.settings || {};
  let i = 0; const rnd = () => { i = (i * 16807 + 12345) % 2147483647; return i / 2147483647; };
  for (const [top, lo, hi] of [[7, 8, 9], [8, 9, 9], [9, 9, 9], [10, 11, 12], [13, 14, 15], [14, 14, 15], [15, 14, 15]]) {
    const qs = G.pickChallenge(S, top, rnd, G.blank());
    assert.equal(qs.length, 5, `第 ${top} 级要能出 5 题`);
    assert.equal(new Set(qs.map(G.key)).size, 5);
    qs.forEach(x => { const L = K.levelOf(x); assert.ok(L >= lo && L <= hi, `第 ${top} 级挑战出了第 ${L} 级`); assert.equal(E.spent(S, x), false); });
  }
});

test('档位和历史最高级别：清空进度不重置', () => {
  const st = G.blank();
  const S = {cards: {}, skills: {}};
  S.skills[genItem.id] = {lv: 3, d: [], seen: 1};
  G.sync(st, S, 7);
  assert.equal(st.best, 7);
  assert.equal(st.lvMax[genItem.id], 3);
  G.sync(st, {cards: {}, skills: {}}, 2);
  assert.equal(st.best, 7);
  assert.equal(G.levelOfCell(st, {cards: {}, skills: {}}, genItem.id), 3);
  assert.equal(G.top(st, 2), 7);
});

test('领取：报近 7 天每天炼出的宝石，新的在前，没炼的不报', () => {
  const st = G.blank();
  st.days['2026-11-06'] = {ok: 66, bad: 9, n: 75, m: 0, paid: 0, forged: 6, waste: 0};
  st.days['2026-11-05'] = {ok: 40, bad: 12, n: 52, m: 0, paid: 0, forged: 4, waste: 0};
  st.days['2026-11-04'] = {ok: 5, bad: 0, n: 5, m: 0, paid: 0, forged: 0, waste: 0};
  st.days['2026-10-20'] = {ok: 5, bad: 0, n: 5, m: 0, paid: 0, forged: 3, waste: 0};
  assert.equal(G.items(st, '2026-11-06'), '20261106.6.66.75,20261105.4.40.52');
  assert.equal(G.items(G.blank(), '2026-11-06'), '');
});

test('标记已发送：只决定按钮怎么显示，不影响报什么', () => {
  const st = G.blank();
  st.days[DAY] = {ok: 1, bad: 0, n: 1, m: 0, paid: 0, forged: 2, waste: 0};
  assert.equal(G.unsent(st, DAY), 2);
  G.markSent(st, DAY);
  assert.equal(G.unsent(st, DAY), 0);
  assert.equal(G.items(st, DAY), '20261106.2.1.1');
  st.days[DAY].forged = 3;
  assert.equal(G.unsent(st, DAY), 1);
});

test('存取：损坏或缺字段时不崩，旧日子裁掉但当天保留', () => {
  assert.deepEqual(G.parse(null), G.blank());
  assert.equal(G.parse('{坏的'), null, '损坏返回 null，由调用方用副本恢复');
  const st = G.parse(JSON.stringify({inv: {s: 3}}));
  assert.deepEqual(st.inv, {a: 0, b: 0, g: 0, s: 3, m: 0, h: 0, l: 0});
  assert.deepEqual(G.parse(JSON.stringify({inv: {p: 4, b: 1, g: 2}})).inv.b, 5, '11-07 的小碎片 2 并进金色小碎片 2');
  assert.equal(st.tickets, 0);
  const big = G.blank();
  for (let d = 1; d <= 28; d++) big.days[`2026-10-${String(d).padStart(2, '0')}`] = {ok: 0, bad: 0, n: 0, m: 0, paid: 0, forged: 0, waste: 0};
  G.prune(big, '2026-10-28');
  assert.equal(Object.keys(big.days).length, 14);
  assert.ok(big.days['2026-10-28']);
});

test('隔天换题：当天作答记录只留当天', () => {
  const st = G.blank();
  ans(st, {top: 99});
  assert.equal(st.seen.day, DAY);
  ans(st, {day: '2026-11-07', top: 99});
  assert.equal(st.seen.day, '2026-11-07');
  assert.equal(Object.keys(st.seen.keys).length, 1);
});

test('存档字段类型不对算损坏：不让练习崩溃', () => {
  for (const t of ['null', '[1]', '{"days":null}', '{"inv":{"s":"x"}}', '{"inv":[]}', '{"seen":{"keys":null}}', '{"days":{"2026-11-06":null}}', '{"lvMax":3}', '{"sent":[]}', '{"tickets":"a"}'])
    assert.equal(G.parse(t), null, t);
  assert.deepEqual(G.parse('{}'), G.blank());
});

test('去重 key 和引擎的秒答编号是同一个', () => {
  assert.equal(G.key(q(0)), E.qkey(q(0)));
  assert.equal(G.key(inst), E.qkey(inst));
});

test('碎片和锻造台的文字都有英文（单日显示英文）', () => {
  const I18N = require('../v2/i18n.js');
  for (const s of ['小碎片', '中碎片', '大碎片', '这次的碎片', '背包', '去锻造', '锻造', '领宝石', '再领一次', '今天炼出', '挑战 · 大碎片', '挑战结束', '先放碎片', '暂时没有挑战题', '没有找到空空矿场', '再练一会', '再练一会 · 得 1 张挑战券', '认真奖励 ★★', '挑战券 +1', '挑战券 3', '大碎片 +1', '答对 5 / 5 题', '炉子最多放 12 个', '没有炼出宝石，废料 60', '得到宝石 1，废料 30', '今天已炼 30 颗，碎片留到明天', '领 6 颗宝石', '返回', '回到岛上'])
    assert.ok(!I18N.ZH.test(I18N.text(s)), `没有英文：${s}`);
  assert.equal(I18N.text('挑战 · 大碎片'), 'Challenge · Big shard');
  assert.equal(I18N.text('再练一会 · 得 1 张挑战券'), 'Practice more · Earn 1 challenge ticket');
  assert.equal(I18N.text('挑战结束'), 'Challenge over');
  assert.equal(I18N.text('得到宝石 1，废料 30'), 'Got 1 gem, 30 scrap');
  assert.equal(I18N.text('没有炼出宝石，废料 60'), 'No gem. 60 scrap');
  for (const s of ['碎片不够，炼不出宝石', '开始锻造后，炉子里的碎片都会变成废料，不退回', '先不炼', '仍然锻造']) assert.notEqual(I18N.text(s), s, s);
});

test('近 14 天炼出：含今天共 14 个日历日，更早的不算，炼不成的不算', () => {
  const st = G.blank(); const put = (d, n) => { st.days[d] = {ok: 0, bad: 0, n: 0, m: 0, paid: 0, forged: n, waste: 0}; };
  assert.equal(G.recentForged(st, '2026-11-07'), 0);
  put('2026-11-07', 2); put('2026-10-25', 3); put('2026-10-24', 100); put('2026-11-08', 50);
  assert.equal(G.recentForged(st, '2026-11-07'), 5, '10-25 是第 14 天；10-24 太早，11-08 是将来');
  assert.equal(G.RECENT_DAYS, 14);
  st.inv = {s: 1, m: 0, l: 0}; G.forge(st, {s: 1, m: 0, l: 0}, '2026-11-07');
  assert.equal(G.recentForged(st, '2026-11-07'), 5, '没炼成不计');
});
test('近 14 天炼出的文字有英文', () => {
  const I18N = require('../v2/i18n.js');
  assert.equal(I18N.text('近 14 天 5'), 'Last 14 days: 5');
});

(function () {
  const inst = n => ({id: 'odd-test-' + n});
  const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
  test('杂色碎片：价值 3、4、6、7、8、12、13（4 是旧版留下的）；金色小碎片换 3，金色中碎片换 8、12、13；普通碎片不换', () => {
    assert.deepEqual(G.ODD.map(t => G.VALUE[t]).sort((a, b) => a - b), [3, 4, 6, 7, 8, 12, 13]);
    assert.equal(G.ODD_RATE, 0.1);
    assert.deepEqual(G.oddFor('b', seq(0.05, 0)), 'o3');
    assert.deepEqual(G.oddFor('b', seq(0.05, 0.99)), 'o3');
    assert.deepEqual(G.oddFor('m', seq(0.05, 0)), 'o8');
    assert.deepEqual(G.oddFor('m', seq(0.05, 0.99)), 'o13');
    assert.equal(G.oddFor('b', seq(0.1)), 'b', '10% 之外还是原来的');
    assert.equal(G.oddFor('m', seq(0.5)), 'm');
    assert.equal(G.oddFor('b'), 'b', '不给随机数就不出杂色');
    assert.equal(G.oddFor('l', seq(0)), 'l', '大碎片不换');
    assert.equal(G.oddFor('s', seq(0)), 's', '普通碎片不换');
    assert.deepEqual(G.answer(G.blank(), {day: DAY, inst: inst(9), ok: true, top: 0, lv: 0, rand: seq(0), mult: 1}), ['s'], '火苗灭时不出杂色');
  });
  test('杂色碎片：答对时进背包，中碎片的认真奖励计数不变', () => {
    const st = G.blank(), base = {day: DAY, ok: true, top: 0, lv: 0};
    assert.deepEqual(G.answer(st, Object.assign({}, base, {inst: inst(1), rand: seq(0, 0.99)})), ['o13']);
    assert.equal(st.inv.o13, 1); assert.equal(st.inv.m, 0); assert.equal(st.days[DAY].m, 1);
    assert.deepEqual(G.answer(st, Object.assign({}, base, {inst: inst(2), top: 99, lv: 3, rand: seq(0.99)})), ['b']);
    assert.equal(st.inv.b, 1);
  });
  test('杂色碎片：能和普通碎片一起炼，凑准 100 没有废料；数量不够不能放', () => {
    const st = G.blank(); Object.assign(st.inv, {o13: 2, o7: 1, o12: 1, o8: 1, l: 1});
    assert.deepEqual(G.forge(st, {o13: 1, o7: 1, l: 1, o12: 1, o8: 2}, DAY).why, 'lack');
    assert.equal(G.enough({o13: 2, o12: 1, o7: 1, o8: 1, s: 0}), false, '13+13+12+7+8 = 53，不够');
    assert.deepEqual(G.forge(st, {o13: 1, o7: 1, o12: 1, o8: 1, l: 1}, DAY), {ok: true, gems: 0, waste: 90}, '13+7+12+8+50 = 90，不够');
    assert.equal(st.inv.o13, 1); assert.equal(st.inv.l, 0);
    const b = G.blank(); Object.assign(b.inv, {o13: 2, o12: 1, l: 1, o6: 2}); b.inv.o7 = 0;
    assert.deepEqual(G.forge(b, {o13: 2, o12: 1, l: 1, s: 0, o6: 2}, DAY), {ok: true, gems: 1, waste: 0}, '13+13+12+50+6+6 = 100');
    assert.equal(G.forge(G.blank(), {zz: 1}, DAY).why, 'lack', '不认识的碎片不能放');
  });
  test('杂色碎片：旧存档照常读；杂色数量损坏算坏数据；领宝石不受影响', () => {
    assert.ok(G.parse(JSON.stringify({inv: {s: 1, m: 2, l: 3}})));
    assert.equal(G.parse(JSON.stringify({inv: {s: 1, m: 2, l: 3, o7: 2}})).inv.o7, 2);
    assert.equal(G.parse(JSON.stringify({inv: {s: 1, m: 2, l: 3, o7: 'x'}})), null);
    assert.equal(G.parse(JSON.stringify({inv: {s: 1, m: 2, l: 3, o7: -1}})), null);
  });
  test('杂色碎片的名字有英文', () => {
    const I18N = require('../v2/i18n.js');
    assert.equal(I18N.text('杂色碎片'), 'Odd shards');
  });
})();

(function () {
  const inst = n => ({id: 'ev-test-' + n}), seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
  const fresh = (sec, ok = 90, bad = 10) => { const st = G.blank(); st.days[DAY] = {ok, bad, n: ok + bad, m: 0, paid: 0, forged: 0, waste: 0, sec}; return st; };
  test('倍数：×1 普通、×2 金色、×3 金色加普通；面值正好翻倍', () => {
    assert.deepEqual([1, 2, 3].map(m => G.pieces('S', m)), [['a'], ['b'], ['b', 'a']]);
    assert.deepEqual([1, 2, 3].map(m => G.pieces('M', m)), [['s'], ['m'], ['m', 's']]);
    assert.deepEqual([1, 2, 3].map(m => G.pieces('L', m)), [['h'], ['l'], ['l', 'h']]);
    assert.deepEqual(['a', 's', 'h'].map(t => G.VALUE[t] * 2), ['b', 'm', 'l'].map(t => G.VALUE[t]));
    assert.equal(G.worth(G.pieces('M', 3)), 15);
    const st = G.blank(); assert.deepEqual(G.answer(st, {day: DAY, inst: inst(1), ok: true, top: 99, lv: 3, mult: 1}), ['a']);
    assert.deepEqual(G.answer(st, {day: DAY, inst: inst(2), ok: true, top: 99, lv: 3, slow: true, mult: 3}), ['b', 'a'], '慢答也跟倍数');
  });
  test('专注火苗：一进来就亮；发呆约 40 秒熄灭（先闪 5 秒）；认真答题又点亮；切后台的时间不算', () => {
    const F = G.focusNew(0), cap = 16;
    let t = 0; for (; t < 60; t += 0.5) { G.focusTick(F, t, cap); if (t % 6 === 0) G.focusAnswer(F, t); }
    assert.equal(F.lit, true); assert.ok(G.focusPct(F) > 0.95);
    G.focusAnswer(F, 60); let off = null;
    for (t = 60; t < 200 && off === null; t += 0.5) if (!G.focusTick(F, t, cap)) off = t;
    assert.ok(off > 60 + 19 + 30 && off < 60 + 19 + 60, `熄灭时间 ${off}`);
    let on = null;
    for (; t < 400 && on === null; t += 0.5) { if (t % 6 === 0) G.focusAnswer(F, t); if (G.focusTick(F, t, cap)) on = t; }
    assert.ok(on - off < 100, `重新点亮用了 ${on - off} 秒`);
    const H = G.focusNew(0); G.focusTick(H, 0.5, cap); G.focusTick(H, 600, cap); assert.ok(H.all < 3, '中间隔很久只算 2 秒');
  });
  test('专注火苗：快灭时答一题再保 5 秒', () => {
    const F = G.focusNew(0); G.focusAnswer(F, 0);
    let t = 0; while (!F.low && t < 200) { t += 0.5; G.focusTick(F, t, 16); }
    assert.ok(F.low && F.lit); G.focusTick(F, t + 4, 16); G.focusAnswer(F, t + 4); G.focusTick(F, t + 6, 16); assert.equal(F.lit, true, '答了一题');
    G.focusTick(F, t + 8, 16); G.focusTick(F, t + 9.5, 16); assert.equal(F.lit, false);
  });
  test('专注记录：存最近 30 次，太短的不记', () => {
    const st = G.blank(); G.noteFocus(st, DAY, {all: 10, act: 10, on: 10}); assert.equal(st.flog, undefined);
    for (let i = 0; i < 35; i++) G.noteFocus(st, DAY, {all: 100, act: 80, on: 60});
    assert.equal(st.flog.length, 30); assert.deepEqual(st.flog[0], {day: DAY, sec: 100, act: 80, on: 60});
  });
  test('连对能量：答对 +1、秒答 +2、答错掉一半、不会不变；攒满进 20 秒暴击时刻；练得越久格数越少；正确率低于 70% 不涨', () => {
    const st = fresh(0), C = G.comboNew();
    assert.equal(G.comboNeed(st.days[DAY]), 12); assert.equal(G.comboNeed(fresh(600).days[DAY]), 10); assert.equal(G.comboNeed(fresh(1200).days[DAY]), 8);
    for (let i = 0; i < 5; i++) G.comboStep(st, DAY, C, i, {ok: true});
    G.comboStep(st, DAY, C, 5, {ok: true, fast: true}); assert.equal(C.e, 7);
    G.comboStep(st, DAY, C, 6, {dunno: true}); assert.equal(C.e, 7);
    G.comboStep(st, DAY, C, 7, {ok: false}); assert.equal(C.e, 3);
    let hit = -1; for (let i = 0; i < 20 && hit < 0; i++) if (G.comboStep(st, DAY, C, 10 + i, {ok: true})) hit = 10 + i;
    assert.equal(hit, 18); assert.equal(C.e, 0); assert.equal(st.days[DAY].crit, 1);
    assert.equal(G.critOn(C, hit + 19.9), true); assert.equal(G.critOn(C, hit + 20), false);
    assert.equal(G.comboStep(st, DAY, C, hit + 1, {ok: true}), false); assert.equal(C.e, 0, '暴击时刻里不攒');
    const low = fresh(0, 60, 40), C2 = G.comboNew(); G.comboStep(low, DAY, C2, 0, {ok: true}); assert.equal(C2.e, 0);
  });
  test('弹出只在火苗亮、不在暴击时刻时', () => {
    const st = fresh(0), run = {};
    G.eventStep(st, DAY, run, 0, 0, () => 0.5);
    assert.equal(G.eventStep(st, DAY, run, 9999, 1, () => 0.5, false).offer, undefined);
    assert.ok(G.eventStep(st, DAY, run, 9999, 2, () => 0.5, true).offer);
  });
  test('弹出：发呆不弹；到点弹一次；20 秒不点就过期；每天次数存盘，新一次练习也不能多', () => {
    const st = fresh(0), run = {}; const r = seq(0.99);
    assert.deepEqual(G.eventStep(st, DAY, run, 0, 0, r), {});
    assert.deepEqual(G.eventStep(st, DAY, run, 100, 500, r), {}, '有效学习没到，时钟再走也不弹');
    const e = G.eventStep(st, DAY, run, 1000, 501, r);
    assert.equal(e.offer.kind, 'dbl'); assert.equal(e.offer.until, 521);
    assert.equal(G.acceptOffer(run, 521), null, '过了 20 秒点不到');
    assert.equal(G.eventStep(st, DAY, run, 1000, 521, r).missed, true);
    const st2 = fresh(0), run2 = {}; let n = 0, eff = 1000, t = 0;
    for (let i = 0; i < 200; i++) { eff += 400; t += 400; const x = G.eventStep(st2, DAY, run2, eff, t, seq(0)); if (x.offer) { n++; const k = G.acceptOffer(run2, t); G.evStart(st2, DAY, k, false); } }
    assert.equal(st2.days[DAY].qc, G.TUNE.qcMax, '限时挑战每天 2 次');
    assert.equal(st2.days[DAY].dbl, G.TUNE.dblMax, '双倍挑战每天 4 次');
    assert.equal(n, G.TUNE.qcMax + G.TUNE.dblMax);
    const run3 = {}; let more = 0; for (let i = 0; i < 20; i++) { eff += 400; t += 400; if (G.eventStep(st2, DAY, run3, eff, t, seq(0)).offer) more++; }
    assert.equal(more, 0, '换一次练习也不能多');
    G.evStart(st2, DAY, 'dbl', true); assert.equal(st2.days[DAY].dbl, G.TUNE.dblMax, '再挑战一次不占次数');
  });
  test('题数：按空空的速度和正确率定，有上下限；慢的孩子题少，快的题多', () => {
    const mk = (sec, acc) => { const st = G.blank(); st.ev = {sec, acc, h: {}, log: []}; return st; };
    assert.deepEqual(G.evTarget(mk(8, 0.9), 'dbl'), {T: 180, n: 17}, '双倍挑战 3 分钟（Ben 11-08，原 45 秒）');
    assert.deepEqual(G.evTarget(mk(4, 0.95), 'dbl'), {T: 180, n: 36});
    assert.equal(G.evTarget(mk(30, 0.5), 'dbl').n, G.TUNE.dblMinN);
    assert.deepEqual(G.evTarget(mk(8, 0.9), 'qc'), {T: 180, n: 17});
    assert.equal(G.evTarget(mk(2, 1), 'qc').n, G.TUNE.qcMaxN);
    assert.equal(G.evTarget(mk(30, 0.3), 'qc').n, G.TUNE.qcMinN);
  });
  test('难度算法：赢了略难、输了略易，长期完成率稳定在约 70%（约 30% 完不成）', () => {
    // 孩子每题 7 秒、正确率 88%：用真实算法跑 2000 次，只有随机数是模拟的
    let sd = 12345; const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (const [kind, sec, acc] of [['dbl', 5, 0.95], ['qc', 7, 0.88], ['qc', 10, 0.75]]) {
      const st = G.blank(); st.ev = {sec, acc, h: {}, log: []}; let won = 0, N = 0;
      for (let i = 0; i < 2000; i++) {
        const tg = G.evTarget(st, kind); let t = 0, done = 0;
        for (;;) { const ok = r() < acc, s = sec * (0.7 + r() * 0.6) + (ok ? 0 : 4); if (t + s > tg.T) break; t += s; if (ok) done++; if (done >= tg.n) break; }
        const w = G.evEnd(st, DAY, {kind, n: tg.n, done, earned: {}}).won; st.ev.sec = sec; st.ev.acc = acc;
        if (i >= 500) { N++; if (w) won++; }
      }
      const rate = won / N; assert.ok(rate > 0.6 && rate < 0.8, `${kind} ${sec} 秒 ${acc}：完成率 ${rate.toFixed(2)}`);
    }
  });
  test('挑战结果：限时挑战完成得 1 颗，到上限不多给；双倍挑战完成碎片再给一份；失败不扣；记录最多 60 条', () => {
    const st = fresh(600); st.inv.s = 3;
    assert.deepEqual(G.evEnd(st, DAY, {kind: 'qc', n: 5, done: 5, earned: {}}), {won: true, gem: 1, bonus: 0, chain: false});
    assert.equal(st.days[DAY].forged, 1); assert.equal(G.items(st, DAY).split('.')[1], '1', '领宝石能报这一颗');
    assert.deepEqual(G.evEnd(st, DAY, {kind: 'qc', n: 5, done: 4, earned: {}}), {won: false, gem: 0, bonus: 0, chain: false});
    assert.equal(st.days[DAY].forged, 1);
    assert.deepEqual(G.evEnd(st, DAY, {kind: 'dbl', n: 3, done: 3, earned: {s: 2, o7: 1}}), {won: true, gem: 0, bonus: 3, chain: false});
    assert.equal(st.inv.s, 5); assert.equal(st.inv.o7, 1);
    assert.deepEqual(G.evEnd(st, DAY, {kind: 'dbl', n: 3, done: 1, earned: {s: 1}}), {won: false, gem: 0, bonus: 0, chain: false});
    assert.equal(st.inv.s, 5, '失败不翻倍，也不扣');
    const full = fresh(0); full.days[DAY].forged = G.DAY_MAX; assert.equal(G.evEnd(full, DAY, {kind: 'qc', n: 1, done: 1}).gem, 0);
    for (let i = 0; i < 80; i++) G.evEnd(st, DAY, {kind: 'qc', n: 5, done: 0, earned: {}});
    assert.equal(st.ev.log.length, 60); assert.ok(G.evHard(st, 'qc') >= G.TUNE.hMin);
    const copy = G.parse(JSON.stringify(st)); assert.equal(copy.ev.log.length, 60, '存盘后还在');
    assert.ok(G.evStats(copy).n === 60);
  });
  test('出题：不重复、不出今天答过的、不超当前级别 +1；开头 2 道是会的', () => {
    const E2 = require('../v2/engine.js'), Kk = require('../v2/skills.js'), C2 = require('../v2/core.js');
    const S = C2.blank(); S.level = -1; const top = 3;
    Kk.SKILLS.forEach(s => s.items.forEach(it => { if (Kk.itemLevels(it.id).some(L => L <= top)) { if (s.speed) S.cards[it.id] = {lv: 1, d: [], seen: 1}; else (S.skills = S.skills || {})[it.id] = {lv: 1, d: [], seen: 1}; } }));
    let sd = 7; const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    const st = G.blank(), qs = G.pickEv(S, st, 16, top, r);
    assert.ok(qs.length >= 10, '出得够：' + qs.length);
    assert.equal(new Set(qs.map(q => G.key(q))).size, qs.length);
    assert.ok(qs.every(q => Kk.levelOf(q) <= top + 1));
    assert.ok(qs.slice(0, 2).every(q => Kk.levelOf(q) <= top && E2.lv(S, q.id) >= 1), '开头 2 道会的');
    st.seen = {day: DAY, keys: {[G.key(qs[0])]: 1}, cells: {}}; sd = 7;
    assert.ok(!G.pickEv(S, st, 16, top, r).some(q => G.key(q) === G.key(qs[0])), '今天答过的不出');
  });
  test('休息：连续 30 分钟要休息；存盘刷新跳不过；休息满或中途停够 5 分钟重新算；调时钟也不超过 5 分钟', () => {
    const st = G.blank();
    G.noteRest(st, 1799, 1000); assert.equal(G.restDue(st), false);
    G.noteRest(st, 2, 1001); assert.equal(G.restDue(st), true);
    assert.deepEqual(G.eventStep(st, DAY, {}, 1e6, 1, seq(0)), {}, '该休息了不再弹挑战');
    G.startRest(st, 2000); assert.equal(G.restLeft(st, 2100), 200); assert.equal(G.restDue(st), false);
    const copy = G.parse(JSON.stringify(st)); assert.equal(G.restLeft(copy, 2100), 200, '刷新后接着算');
    assert.equal(G.restLeft(st, 2300), 0);
    assert.equal(G.restLeft(st, 0), 0, '时钟回拨不能卡死');
    const bad = G.blank(); bad.rest = {sec: 'x', at: null, until: 'y'}; assert.equal(G.restLeft(bad, 10), 0, '坏数据不卡死'); bad.ev = {log: [null, {won: 1}]}; assert.equal(G.evStats(bad).n, 1, '坏记录不让家长区崩');
    const s2 = G.blank(); G.noteRest(s2, 1000, 100); G.noteRest(s2, 10, 100 + 299); assert.equal(s2.rest.sec, 1010);
    G.noteRest(s2, 10, 399 + 300); assert.equal(s2.rest.sec, 10, '中途自己停够 5 分钟，重新算');
  });
  test('退出挽留：20% 概率；差一点炼宝石 → 能量快满 → 宝箱；练满 25 分钟、该休息、连错 3 题、弹过都不弹', () => {
    const yes = () => 0, no = () => 0.5, base = {last: [true], perQ: 6, now: 0, rand: yes};
    const st = fresh(300); st.inv = {m: 9, g: 0};
    assert.deepEqual(G.exitHook(st, DAY, base), {kind: 'gem', gap: 10, n: 2});
    assert.equal(G.exitHook(st, DAY, Object.assign({}, base, {rand: no})), null, '80% 不弹');
    assert.equal(G.exitHook(st, DAY, Object.assign({}, base, {asked: true})), null);
    assert.equal(G.exitHook(st, DAY, Object.assign({}, base, {last: [false, false, false]})), null);
    assert.equal(G.exitHook(fresh(1500), DAY, base), null);
    const s2 = fresh(300); G.noteRest(s2, 1800, 1); assert.equal(G.exitHook(s2, DAY, base), null);
    const s3 = fresh(300); s3.inv = {s: 2};
    assert.deepEqual(G.exitHook(s3, DAY, Object.assign({}, base, {combo: {e: 10, until: 0}})), {kind: 'combo', n: 2});
    assert.deepEqual(G.exitHook(s3, DAY, Object.assign({}, base, {combo: {e: 5, until: 0}})), {kind: 'box', n: G.TUNE.boxN});
    const lowAcc = fresh(300, 6, 4); lowAcc.inv = {s: 2}; assert.equal(G.exitHook(lowAcc, DAY, Object.assign({}, base, {combo: {e: 10, until: 0}})).kind, 'box', '正确率不够能量不涨：不许诺连对');
    const s4 = fresh(300); s4.inv = {m: 9}; assert.equal(G.exitHook(s4, DAY, Object.assign({}, base, {perQ: 1})).kind, 'box', '要超过 5 题就不用这个理由');
  });
  test('离 1 颗宝石还差多少：按最好的配方，最多 12 个', () => {
    assert.equal(G.gapToGem({m: 10}), 0); assert.equal(G.gapToGem({m: 9}), 10); assert.equal(G.gapToGem({s: 20}), 40, '12 个 5 才 60');
    assert.equal(G.gapToGem({l: 1, g: 12}), 6); assert.equal(G.gapToGem({}), 100); assert.equal(G.gapToGem({h: 3, o13: 1, o12: 1}), 0);
  });
  test('宝箱：杂色一半、金色中碎片 40%、大碎片 10%，进背包', () => {
    const st = G.blank(); assert.ok(G.ODD.includes(G.openBox(st, () => 0.2))); assert.equal(G.openBox(st, () => 0.7), 'm'); assert.equal(G.openBox(st, () => 0.95), 'l'); assert.equal(st.inv.m, 1); assert.equal(st.inv.l, 1);
  });
  test('新文字都有英文', () => {
    const I18N = require('../v2/i18n.js');
    for (const s of ['连对 10', '3 分钟答对 17 题，碎片翻倍', '再来一次双倍', '答得非常好', '合计 56，还差 44，炼不出宝石', '合计 45，还差 5，炼不出大碎片', '合计 60，多了 10，炼不出大碎片', '暴击 2 次', '限时挑战宝石 +1', '45 秒答对 4 题，碎片翻倍', '3 分钟答对 15 题', '双倍挑战 3 / 4 · 0:21', '碎片翻倍 +4', '20 秒后休息 5 分钟', '休息时间', '连续练了 30 分钟，休息 5 分钟后再来', '再挑战一次', '继续练习', '双倍挑战完成', '双倍挑战结束', '锻造台', '限时挑战 · 3 分钟答对 15 题，额外 1 颗宝石 · 18', '限时挑战 5 / 15 · 2:10', '限时挑战结束', '继续答题', '结束',
      '碎片 +10 +4', '碎片 +2', '碎片 12', '暴击时刻 20 秒', '暴击时刻 13', '热身完成 · 暴击只要 10 格', '目标 2/3', '目标 暴击时刻', '双倍挑战 · 5 题 · 点这里进入 · 18', '火苗快灭了，答题保持火苗', '再得 12 碎片，可以炼 1 颗宝石', '再连对 3 题，开启暴击时刻', '再答 4 题，打开宝箱', '再答 3 题', '炼出的宝石可以到空空矿场换时间', '暴击时刻里，每题的碎片更多', '宝箱里有 1 个碎片', '目标完成', '宝箱打开了', '离 1 颗宝石还差 6 碎片', '背包里的碎片够炼 1 颗宝石了', '暴击时刻开始了', '没有新碎片', '这次专注 86%', '金色小碎片', '金色中碎片', '金色大碎片'])
      assert.ok(!I18N.ZH.test(I18N.text(s)), '没有英文：' + s);
  });
})();
// ---------- 伙伴罐（反例来自 minecraft-web/tools/pal-jar-sim.js） ----------
const jarDay = n => new Date(Date.UTC(2026, 10, 1 + n)).toISOString().slice(0, 10);
const jarSt = (forged, target) => { const st = G.blank(); forged.forEach((f, i) => { st.days[jarDay(i)] = Object.assign({ok: 1, n: 1}, {forged: f}); }); st.palJar = {bal: 0, moved: {}, target}; return st; };
const nets = (st, d) => G.items(st, d).split(',').map(s => +s.split('.')[1]);
test('伙伴罐：炼 5 留 2，领走 3，再炼 1 待领 1；花罐不影响矿场', () => {
  const st = jarSt([5], 2), d = jarDay(0);
  assert.equal(G.jarWant(st, d), 2, '预览和实际一致');
  assert.equal(G.reserve(st, d), 2); assert.equal(st.palJar.bal, 2);
  G.markSent(st, d); assert.deepEqual(nets(st, d), [3]);
  assert.equal(G.unsent(st, d), 0, '不是负数');
  st.days[d].forged = 6; assert.equal(G.unsent(st, d), 1);
  G.markSent(st, d); assert.deepEqual(nets(st, d), [4], '4 + 罐里 2 = 6，一颗不多');
  st.palJar.bal -= 2; assert.deepEqual(nets(st, d), [4]);
});
test('伙伴罐：已领走的留不了；同一天不再多留；攒 3 天待领 8 上限 4', () => {
  let st = jarSt([3], 5); G.markSent(st, jarDay(0)); assert.equal(G.reserve(st, jarDay(0)), 0);
  st = jarSt([4, 2, 2], 12);
  assert.equal(G.reserve(st, jarDay(2)), 4); assert.equal(G.reserve(st, jarDay(2)), 0);
  assert.equal(st.palJar.moved[jarDay(0)], 4, '从最早的日子移');
});
test('伙伴罐：只炼 1 颗全留，净值 0；没有目标不留，也不建罐', () => {
  const st = jarSt([1], 5), d = jarDay(0); G.reserve(st, d);
  assert.equal(st.palJar.bal, 1); assert.equal(G.netTotal(st, d), 0);
  const s2 = G.blank(); s2.days[d] = {forged: 3, ok: 1, n: 1};
  assert.equal(G.reserve(s2, d), 0); assert.equal(s2.palJar, undefined); assert.equal(G.unsent(s2, d), 3);
});
test('伙伴罐：删旧日子时一起删 moved；存读不丢', () => {
  const st = jarSt([4], 2), d = jarDay(0); G.reserve(st, d);
  const back = G.parse(JSON.stringify(st)); assert.equal(back.palJar.bal, 2); assert.equal(back.palJar.moved[d], 2);
  for (let i = 1; i <= 15; i++) st.days[jarDay(i)] = {forged: 1, ok: 1, n: 1};   // 记录只留最近 14 天
  G.prune(st, jarDay(15)); assert.equal(st.days[d], undefined); assert.equal(st.palJar.moved[d], undefined); assert.equal(st.palJar.bal, 2, '罐不过期');
});
