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

test('答对普通题：小碎片；已学稳、低于当前级别', () => {
  const st = G.blank();
  assert.equal(ans(st, {top: 99}), 's');
  assert.deepEqual(st.inv, {s: 1, m: 0, l: 0});
});

test('格子没学稳：今天第一道答对给中碎片，同格后面的给小碎片', () => {
  const st = G.blank();
  assert.equal(G.answer(st, {day: DAY, inst: q(0), ok: true, top: 99, lv: 1}), 'm');
  assert.equal(G.answer(st, {day: DAY, inst: q(1), ok: true, top: 99, lv: 1}), 's');
  assert.deepEqual(st.inv, {s: 1, m: 1, l: 0});
});

test('当前级别的题：今天第一道答对给中碎片', () => {
  const st = G.blank();
  assert.equal(G.answer(st, {day: DAY, inst: q(0), ok: true, top: K.levelOf(q(0)), lv: 3}), 'm');
});

test('错题隔天答对：中碎片，不受同格限制', () => {
  const st = G.blank();
  G.answer(st, {day: DAY, inst: q(0), ok: true, top: 99, lv: 1});
  assert.equal(G.answer(st, {day: DAY, inst: q(1), ok: true, top: 99, lv: 3, mistake: true}), 'm');
});

test('每道题每天只有第一次作答算数；错了当天再做不给，隔天照常', () => {
  const st = G.blank();
  assert.equal(ans(st, {ok: false}), null);
  assert.equal(ans(st, {ok: true}), null);
  assert.equal(st.days[DAY].ok, 0);
  assert.equal(st.days[DAY].bad, 1);
  assert.equal(ans(st, {day: '2026-11-07', top: 99}), 's');
});

test('当场再来一次不给碎片，也不计正确率', () => {
  const st = G.blank();
  assert.equal(ans(st, {retry: true}), null);
  assert.equal((st.days[DAY] || {ok: 0}).ok, 0);
});

test('点不会：不给也不算错，但当天已作答', () => {
  const st = G.blank();
  assert.equal(ans(st, {ok: false, dunno: true}), null);
  assert.equal(st.days[DAY].bad, 0);
  assert.equal(st.days[DAY].n, 1);
  assert.equal(ans(st, {ok: true}), null);
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
  assert.equal(ans(st, {top: 99}), 's', '口答没有占掉当天的第一次作答');
});

test('老秒答流程和新流程同一题 key 相同（asInst 没有 op）', () => {
  const sp = K.SKILLS.find(s => s.speed && s.items.some(it => it.gen)), it = sp.items.find(i => i.gen);
  const made = K.make(it.id, () => 0.5);
  const noOp = {id: it.id, q: {a: made.q.a, b: made.q.b}, ans: made.ans};
  assert.equal(G.key(made), G.key(noOp));
  const st = G.blank();
  G.answer(st, {day: DAY, inst: made, ok: true, top: 99, lv: 3});
  assert.equal(G.answer(st, {day: DAY, inst: noOp, ok: true, top: 99, lv: 3}), null);
});

test('认真奖励：公式、只加不扣、基数不含奖励和挑战', () => {
  const st = G.blank();
  for (let i = 0; i < 40; i++) G.answer(st, {day: DAY, inst: {id: `c${i}`, q: {}, ans: 1}, ok: true, top: 99, lv: 1, cell: `c${i}`});
  assert.deepEqual(G.settle(st, DAY), {bonus: 10, stars: 3});   // 40 × 0.25 × 1
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
  assert.equal(mk(85, 15).bonus, 3);   // round(20 × 0.25 × 0.5) = 3（2.5 四舍五入）
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

test('锻造：12 个小碎片炼不出来，还差 40，碎片不动', () => {
  const st = G.blank(); st.inv = {s: 12, m: 0, l: 0};
  assert.deepEqual(G.forge(st, {s: 12, m: 0, l: 0}, DAY), {ok: false, why: 'short', short: 40});
  assert.deepEqual(st.inv, {s: 12, m: 0, l: 0});
});

test('锻造：超过 12 格、碎片不够、空炉都不行', () => {
  const st = G.blank(); st.inv = {s: 20, m: 20, l: 2};
  assert.equal(G.forge(st, {s: 13, m: 0, l: 0}, DAY).why, 'full');
  assert.equal(G.forge(st, {s: 0, m: 0, l: 3}, DAY).why, 'lack');
  assert.equal(G.forge(st, {s: 0, m: 0, l: 0}, DAY).why, 'short');
  assert.equal(G.forge(st, {s: -1, m: 11, l: 0}, DAY).why, 'lack');
  assert.deepEqual(st.inv, {s: 20, m: 20, l: 2});
});

test('锻造：一天最多 30 颗，碎片留到明天', () => {
  const st = G.blank(); st.inv = {s: 0, m: 320, l: 0};
  for (let i = 0; i < 30; i++) assert.equal(G.forge(st, {s: 0, m: 10, l: 0}, DAY).ok, true);
  assert.equal(G.forge(st, {s: 0, m: 10, l: 0}, DAY).why, 'daily');
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
  assert.deepEqual(st.inv, {s: 0, m: 5, l: 1});
  assert.equal(st.days[day].m, 0, '挑战的中碎片不进认真奖励基数');
  assert.equal(st.days[day].ok, 5, '但正确率算挑战题');
  assert.equal(G.challengeAnswer(st, {day, inst: mk(0), ok: true}), null, '当天重复不给');
  assert.deepEqual(G.finishChallenge(st, {won: 4, n: 5}), {big: false});
});

test('挑战出题：高 1～2 级、没下架、不重复，到顶封顶', () => {
  const S = C.loadState({getItem: () => null, setItem() {}, removeItem() {}}, {}, Date.now());
  S.settings = S.settings || {};
  let i = 0; const rnd = () => { i = (i * 16807 + 12345) % 2147483647; return i / 2147483647; };
  for (const [top, lo, hi] of [[7, 8, 9], [13, 14, 15], [14, 14, 15], [15, 14, 15]]) {
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
  assert.deepEqual(st.inv, {s: 3, m: 0, l: 0});
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
  for (const s of ['小碎片', '中碎片', '大碎片', '这次的碎片', '背包', '去锻造', '锻造', '领宝石', '再领一次', '今天炼出', '挑战 · 大碎片', '挑战结束', '先放碎片', '暂时没有挑战题', '没有找到空空矿场', '再练一会', '再练一会 · 得 1 张挑战券', '认真奖励 ★★', '挑战券 +1', '挑战券 3', '大碎片 +1', '答对 5 / 5 题', '炉子最多放 12 个', '还差 40，碎片退回', '得到宝石 1，废料 30', '今天已炼 30 颗，碎片留到明天', '领 6 颗宝石', '返回', '回到岛上'])
    assert.ok(!I18N.ZH.test(I18N.text(s)), `没有英文：${s}`);
  assert.equal(I18N.text('挑战 · 大碎片'), 'Challenge · Big shard');
  assert.equal(I18N.text('再练一会 · 得 1 张挑战券'), 'Practice more · Earn 1 challenge ticket');
  assert.equal(I18N.text('挑战结束'), 'Challenge over');
  assert.equal(I18N.text('得到宝石 1，废料 30'), 'Got 1 gem, 30 scrap');
});
