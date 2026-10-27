const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js');

const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-01', n);
const ok = {ok: true, fast: true, secs: 6}, slow = {ok: true, fast: false, secs: 9}, bad = {ok: false, fast: false, secs: 9};
// 跑一次今日练习：answerFn(题) → 结果
function play(S, day, answerFn, opts) {
  const s = E.session(S, day, Object.assign({rnd: seeded(3)}, opts)), log = [];
  for (let x = s.next(), guard = 0; x && guard < 500; x = s.next(), guard++) {
    log.push(x);
    if (x.kind === 'q') s.answer(answerFn(x));
  }
  return {s, log, qs: log.filter(x => x.kind === 'q')};
}

// ---------- 升级 ----------
test('卡：灰 → 淡黄只看对（先对后快）；淡黄以后要快；一天最多一级；淡红到深红隔 ≥ 3 天', () => {
  const S = C.blank();
  assert.equal(E.record(S, 'bond:7=3+_', slow, D(0)).up, true);         // 慢也能亮淡黄
  assert.equal(E.lv(S, 'bond:7=3+_'), 1);
  assert.equal(E.record(S, 'bond:7=3+_', ok, D(0)).up, false);          // 同一天不再升
  assert.equal(E.record(S, 'bond:7=3+_', slow, D(1)).up, false);        // 淡黄以后慢了不升
  assert.equal(E.record(S, 'bond:7=3+_', ok, D(1)).up, true);           // 淡红
  assert.equal(E.record(S, 'bond:7=3+_', ok, D(3)).up, false);          // 隔 2 天不够
  assert.equal(E.record(S, 'bond:7=3+_', ok, D(4)).up, true);           // 深红
  assert.equal(E.lv(S, 'bond:7=3+_'), 3);
});

test('不计时的技能（看数、数线）慢也合格', () => {
  const S = C.blank();
  E.record(S, 'look:tf:7', slow, D(0));
  assert.equal(E.record(S, 'look:tf:7', slow, D(1)).up, true);
  assert.equal(E.lv(S, 'look:tf:7'), 2);
});

test('题型：最近 8 次（可以跨天）合格 ≥ 7 才升；6/8 不升；升级后重新数', () => {
  const S = C.blank(), id = 'cmp:t:100';
  [ok, ok, ok, bad, ok, ok].forEach(r => E.record(S, id, r, D(0)));
  assert.equal(E.lv(S, id), 0);
  E.record(S, id, ok, D(1));
  assert.equal(E.lv(S, id), 0);                                         // 7 次里 6 次合格，还不够 8 次
  assert.equal(E.record(S, id, ok, D(1)).up, true);                     // 第 8 次：最近 8 次里 7 次合格 → 升
  assert.equal(E.lv(S, id), 1);
  for (let k = 0; k < 8; k++) E.record(S, id, ok, D(1));
  assert.equal(E.lv(S, id), 1);                                         // 同一天不再升
  for (let k = 0; k < 7; k++) E.record(S, id, ok, D(2));
  assert.equal(E.lv(S, id), 1);                                         // 升级后清空，只攒了 7 次
  E.record(S, id, ok, D(2));
  assert.equal(E.lv(S, id), 2);
});

test('秒答题型沿用 v2：同一天合格 5 次升一级，且一开始就要快', () => {
  const S = C.blank(), id = 'L3:add1c';
  for (let k = 0; k < 4; k++) E.record(S, id, ok, D(0));
  E.record(S, id, slow, D(0));
  assert.equal(E.lv(S, id), 0);
  E.record(S, id, ok, D(0));
  assert.equal(E.lv(S, id), 1);
  assert.equal(S.cards[id].fday, D(0));                                 // 存在 v2 原来的位置，旧页面也认
});

test('秒答卡存在 S.cards（和 v1 / v2 同一个地方），理解技能存在 S.skills', () => {
  const S = C.blank();
  E.record(S, '3+4', ok, D(0));
  E.record(S, 'look:dice:3', ok, D(0));
  assert.equal(S.cards['3+4'].lv, 1);
  assert.equal(S.skills['look:dice:3'].lv, 1);
  assert.equal(S.cards['look:dice:3'], undefined);
});

test('日期往回调：不升级', () => {
  const S = C.blank();
  E.record(S, 'look:tf:7', ok, D(5));
  assert.equal(E.record(S, 'look:tf:7', ok, D(2)).up, false);
  assert.equal(E.lv(S, 'look:tf:7'), 1);
});

test('「再看一次」以后答对：记作练过但不升级；答错照常进错题本', () => {
  const S = C.blank();
  E.record(S, 'look:tf:7', ok, D(0));
  assert.equal(E.record(S, 'look:tf:7', Object.assign({peeked: true}, ok), D(1)).up, false);
  const s = E.session(S, D(1), {rnd: seeded(1)});
  s.inject({kind: 'q', inst: K.make('look:tf:7'), seg: 'fluency'});
  s.answer(Object.assign({peeked: true}, bad));
  assert.ok(E.dueMistakes(S, D(2)).some(m => m.uid === 'look:tf:7'));
});

// ---------- 今日练习 ----------
test('空白存档：先学没有前置的技能、先放示范卡；一天最多开始 3 个新技能', () => {
  const S = C.blank(); S.placedAt = 1;
  const {log, qs} = play(S, D(0), () => ok);
  const order = [...new Set(qs.filter(x => x.seg === 'new').map(x => K.ITEM[x.inst.id].skill))];
  const skills = new Set(order);
  assert.ok(skills.size <= 3, order.join());
  order.slice(0, 2).forEach(sk => assert.deepEqual(K.BY[sk].pre, [], '最先学的两个没有前置'));
  const firstQ = {};
  log.forEach((x, i) => { if (x.kind === 'demo') firstQ[x.skill] = firstQ[x.skill] ?? i; });
  skills.forEach(sk => {
    const qi = log.findIndex(x => x.kind === 'q' && K.ITEM[x.inst.id].skill === sk);
    assert.ok(firstQ[sk] !== undefined && firstQ[sk] < qi, '示范卡在第一题之前：' + sk);
  });
  const again = play(S, D(1), () => ok).log.filter(x => x.kind === 'demo').map(x => x.skill);
  skills.forEach(sk => assert.ok(!again.includes(sk), '示范卡只放一次'));
});

test('一次练习：时间到就停；同一张卡最多 2 次、同一题型最多 6 次；同一技能不连续超过 3 题', () => {
  const S = C.blank(); S.placedAt = 1;
  for (let d = 0; d < 20; d++) {
    const {s, qs} = play(S, D(d), x => (x.inst.ans % 7 ? ok : bad));
    assert.ok(s.elapsed <= 600 + 15, '第 ' + d + ' 天 ' + s.elapsed);
    const n = {};
    qs.forEach(x => { n[x.inst.id] = (n[x.inst.id] || 0) + 1; });
    Object.entries(n).forEach(([id, c]) => assert.ok(c <= (K.isType(id) ? 6 : 2), id + ' 出了 ' + c + ' 次'));
    let run = 1, over = 0;
    for (let i = 1; i < qs.length; i++) {
      run = K.ITEM[qs[i].inst.id].skill === K.ITEM[qs[i - 1].inst.id].skill ? run + 1 : 1;
      if (run > 3) over++;
    }
    const kinds = new Set(qs.map(x => K.ITEM[x.inst.id].skill)).size;
    if (kinds > 2) assert.ok(over <= Math.max(3, Math.ceil(qs.length * 0.05)), `同一技能连续超过 3 题的有 ${over} 题（共 ${qs.length}）`);   // 只剩一个技能可出时才允许
  }
});

test('三段顺序：到期错题先出（复习最多 5 分钟），然后学新的，然后熟练', () => {
  const S = C.blank(); S.placedAt = 1;
  play(S, D(0), () => ok);
  play(S, D(1), x => (x.seg === 'new' ? bad : ok));
  // 第 1 天学会的卡在第 2 天答错 → 第 3 天到期
  const S2 = C.blank(); S2.placedAt = 1;
  play(S2, D(0), () => ok);
  play(S2, D(1), x => (x.seg === 'fluency' ? bad : ok));
  const due = E.dueMistakes(S2, D(2)).length;
  assert.ok(due > 0);
  const {qs} = play(S2, D(2), () => ok);
  const firstNonReview = qs.findIndex(x => x.seg !== 'review');
  assert.ok(qs.slice(0, Math.min(due, firstNonReview)).every(x => x.seg === 'review'));
  const segs = qs.map(x => x.seg).filter((v, i, a) => a[i - 1] !== v);
  assert.deepEqual(segs.filter(s => s !== 'review').slice(0, 2).join(), segs.includes('new') ? 'new,fluency' : 'fluency');
});

test('学新的时（还是灰色）答错不进错题本；学会以后再错才进', () => {
  const S = C.blank(); S.placedAt = 1;
  play(S, D(0), x => (x.seg === 'new' ? bad : ok));
  assert.equal(E.dueMistakes(S, D(1)).length, 0);
});

test('复习后还剩 > 10 道到期错题：当天不学新的', () => {
  const S = C.blank(); S.placedAt = 1;
  for (let k = 1; k <= 30; k++) { E.record(S, 'bond:' + (k % 8 + 2) + '=1+_', ok, D(-9)); }
  K.understand.filter(s => s.group === 'look').forEach(s => s.items.forEach(it => { E.record(S, it.id, ok, D(-9)); E.addMistake(S, K.make(it.id), D(-2)); }));
  const {qs} = play(S, D(0), () => ({ok: true, fast: true, secs: 20}));           // 每题 20 秒，复习做不完
  assert.ok(E.dueMistakes(S, D(0)).length > 10);
  assert.equal(qs.filter(x => x.seg === 'new').length, 0);
});

test('复习过关按当前阶段：灰的只看对，淡黄以后慢了不过关', () => {
  const S = C.blank(); S.placedAt = 1;
  E.record(S, 'bond:7=3+_', ok, D(0));
  E.addMistake(S, K.make('bond:7=3+_'), D(0));
  const s = E.session(S, D(1), {rnd: seeded(1)});
  const x = s.next();
  assert.equal(x.seg, 'review');
  s.answer(slow);
  const m = E.dueMistakes(S, D(2)).find(m => m.uid === 'bond:7=3+_');
  assert.ok(m && m.passes === 0, '慢了不过关，明天再来');
});

test('没有新内容、没有到期的也有东西练：深红的格子按 7/14/30/60 天做维持复习；全都没有就提前结束', () => {
  const S = C.blank(); S.placedAt = 1;
  K.SKILLS.forEach(s => s.items.forEach(it => { const p = E.prog(S, it.id); p.lv = 3; p.d = [D(-40), D(-35), D(-30)]; p.last = D(-30); p.seen = 9; }));
  const {qs, s} = play(S, D(0), () => ok);
  assert.ok(qs.length > 0 && qs.every(x => x.seg === 'fluency'));
  assert.ok(s.elapsed >= 590, '满 10 分钟');
  K.SKILLS.forEach(s => s.items.forEach(it => { E.prog(S, it.id).lastDay = D(4); }));   // 全都刚复习过
  const again = play(S, D(5), () => ok);
  assert.equal(again.qs.length, 0, '没有可练的就提前结束');
  assert.equal(S.daily.done, true);
});

test('秒答 L2 后 4 个世界的新卡：要等「过十准备」学会后才出', () => {
  const S = C.blank(); S.placedAt = 1;
  for (let d = 0; d < 6; d++) {
    const {qs} = play(S, D(d), () => ok);
    if (!E.learned(S, 'bond5')) assert.ok(!qs.some(x => x.seg === 'new' && /^speed:L2:[1-7]$/.test(K.ITEM[x.inst.id].skill)));
  }
});

test('跨午夜：一次练习按开始那天记录；中途关掉，按今天已练的秒数接着算', () => {
  const S = C.blank(); S.placedAt = 1;
  const s = E.session(S, D(0), {rnd: seeded(2)});
  for (let k = 0; k < 5;) { const x = s.next(); if (x.kind === 'q') { s.answer(ok); k++; } }
  assert.equal(S.daily.day, D(0));
  const sec = S.daily.sec;
  assert.ok(sec >= 30 && sec <= 40);                                    // 5 题 × 6 秒 + 示范卡
  const s2 = E.session(S, D(0), {rnd: seeded(2)});
  assert.equal(s2.elapsed, sec);                                        // 关掉再开：接着算
  const s3 = E.session(S, D(1), {rnd: seeded(2)});
  assert.equal(s3.elapsed, 0);                                          // 第二天重新算
});

test('统计：每天用时、题数、新点亮数、练完后剩下的到期错题，保留 400 天', () => {
  const S = C.blank(); S.placedAt = 1;
  const {s} = play(S, D(0), () => ok);
  const st = S.stats[D(0)];
  assert.ok(st.sec === s.elapsed && st.n > 0 && st.ups > 0 && st.over === 0 && st.gap === 0);
  const S2 = C.blank(); Object.assign(E.prog(S2, 'look:dice:1'), {seen: 1, lv: 1, lastDay: D(-5)});
  assert.equal(E.gapNow(S2, D(0)), 5);                                  // 开始学了 5 天没练
  K.BY.look1.items.forEach(it => Object.assign(E.prog(S2, it.id), {seen: 1, lv: 3, lastDay: D(-9)}));
  assert.equal(E.gapNow(S2, D(0)), 0);                                  // 全部深红的不算"在学"
  for (let d = 1; d <= 410; d++) S.stats[D(d)] = {sec: 1, n: 1, ups: 0, over: 0};
  E.trimStats(S);
  assert.equal(Object.keys(S.stats).length, 400);
});

// ---------- 摸底 ----------
function place(S, day, isRight) {
  const p = E.placement(S, day, {rnd: seeded(5)}), asked = [];
  for (let x = p.next(), g = 0; x && g < 100; x = p.next(), g++) { asked.push(x); p.answer({ok: isRight(x), secs: 6}); }
  return asked;
}
test('摸底：最难的技能 3 题全对 → 测过的格子点亮淡黄，同组更简单的技能标为"会"（不放示范卡）；不跨组', () => {
  const S = C.blank();
  const asked = place(S, D(0), x => K.ITEM[x.inst.id].skill.startsWith('line'));
  assert.ok(S.placedAt);
  assert.ok(asked.length <= 40);
  assert.ok(asked.some(x => x.inst.id === 'line:t:100'));
  assert.equal(E.lv(S, 'line:t:100'), 1);
  assert.equal(S.known.line1, true);
  assert.ok(!S.known.cmp1 && !S.known.look1, '不跨组点亮');
  assert.equal(E.lv(S, 'look:dice:1'), 0);
});

test('摸底：不全对就往下测更简单的；全不会就停在最简单的；只点亮不变灰', () => {
  const S = C.blank();
  E.record(S, 'look:tf2:15', ok, D(-5)); E.record(S, 'look:tf2:15', ok, D(-4));
  const asked = place(S, D(0), x => /^look:(dice|scat)/.test(x.inst.id));
  const lookSkills = [...new Set(asked.map(x => K.ITEM[x.inst.id].skill).filter(s => s.startsWith('look')))];
  assert.deepEqual(lookSkills, ['look4', 'look2', 'look3']);              // 先测最难的，再二分往下找
  assert.equal(E.lv(S, 'look:tf2:15'), 2, '已有颜色不变');
  assert.equal(S.known.look1, true);
  assert.equal(S.known.look2, true);
});

test('摸底最多 5 分钟 / 40 题；中途关掉下次接着测', () => {
  const S = C.blank();
  const p = E.placement(S, D(0), {rnd: seeded(5)});
  for (let k = 0; k < 7; k++) { p.next(); p.answer({ok: false, secs: 6}); }
  assert.ok(!S.placedAt && S.placement);
  const rest = place(S, D(0), () => false);
  assert.ok(7 + rest.length <= 40);
  assert.ok(S.placedAt);
  const slowP = C.blank(), q = place(slowP, D(0), () => true);
  assert.ok(q.length * 6 <= 300 + 6);
});

// ---------- 第 2 轮审查（v3R3-R2）找出的问题：先写会失败的测试 ----------
// 已经在学很多技能的存档（都开始过、还是灰色）：不受"一天最多开始 3 个新技能"限制，内容充足
const rich = () => { const S = C.blank(); S.placedAt = 1; K.understand.forEach(s => s.items.forEach(it => { E.prog(S, it.id).seen = 1; })); S.demoSeen = Object.fromEntries(K.SKILLS.map(s => [s.id, true])); return S; };
test('R2-B1 维持复习：一天里答对几题只往后推一档（7 → 14），不会一下跳到 60 天', () => {
  const S = C.blank(); S.placedAt = 1;
  K.SKILLS.forEach(s => s.items.forEach(it => Object.assign(E.prog(S, it.id), {lv: 3, d: [D(-40), D(-35), D(-30)], seen: 9, lastDay: D(-1)})));
  Object.assign(E.prog(S, 'cmp:t:100'), {lastDay: D(-8)});
  play(S, D(0), () => ok);
  assert.equal(E.prog(S, 'cmp:t:100').keep, 1);
});

test('R2-B2 分合"求整体"是题型：按"最近 8 次对 7 次"升级，不是对 1 次就亮', () => {
  const S = C.blank();
  E.record(S, 'bond:t:whole5', ok, D(0));
  assert.equal(E.lv(S, 'bond:t:whole5'), 0);
  assert.equal(E.kindOf('bond:t:whole5'), 'type8');
  assert.equal(E.kindOf('bond:5=2+_'), 'card');
});

test('R2-B3 秒答 L3 题型在"学新的"里一次出够 5 题（能凑够同一天合格 5 次）', () => {
  const S = C.blank(); S.placedAt = 1;
  K.understand.forEach(s => s.items.forEach(it => Object.assign(E.prog(S, it.id), {lv: 3, d: [D(-40), D(-35), D(-30)], seen: 9, lastDay: D(-1)})));
  C.UNITS.filter(u => u.L < 2).forEach(u => Object.assign(E.prog(S, u.id), {lv: 3, d: [D(-40), D(-35), D(-30)], seen: 9, lastDay: D(-1)}));
  const {qs} = play(S, D(0), x => ({ok: true, fast: true, secs: 6}));
  const n = qs.filter(x => x.seg === 'new' && x.inst.id === 'L3:add10').length;
  assert.ok(n >= 5, '出了 ' + n + ' 次');
  assert.ok(E.lv(S, 'L3:add10') >= 1);
});

test('R2-B4 数线 0—100 任意：目标是整十时也按 ±10 判，家长区调的误差生效', () => {
  const it = K.ITEM['line:t:100'], q = K.make('line:t:100', null, {q: {max: 100, target: 40, any: true}, ans: 40});
  assert.equal(K.judge(it, q, 47).ok, true);
  assert.equal(K.judge(it, q, 47, {lineTol: {'100a': 5}}).ok, false);
  const r = seeded(9);
  for (let k = 0; k < 200; k++) assert.equal(K.make('line:t:100', r).q.any, true);
});

test('R2-B5 学新的：刚点亮的卡这次不再出', () => {
  const S = C.blank(); S.placedAt = 1;
  const {qs} = play(S, D(0), () => ok);
  const cards = qs.filter(x => x.seg === 'new' && !K.isType(x.inst.id)).map(x => x.inst.id);
  assert.equal(new Set(cards).size, cards.length, '有重复：' + cards.join());
});

test('R2-B6 学新的段：题出完了但还没到 3 分钟，接着补新的', () => {
  const S = rich();
  const {qs} = play(S, D(0), () => ok);
  const newSec = qs.filter(x => x.seg === 'new').length * 6;
  assert.ok(newSec >= 170, '学新的只用了 ' + newSec + ' 秒');
});

test('R2-B7 摸底用时计入当天 10 分钟', () => {
  const S = C.blank();
  place(S, D(0), () => true);
  assert.ok(S.daily && S.daily.day === D(0) && S.daily.sec > 0);
  const s = E.session(S, D(0), {rnd: seeded(1)});
  assert.equal(s.elapsed, S.daily.sec);
});

test('R2-B8 从 v1 迁来的深红卡没有 lastDay：按升到深红那天算，不会第一天全是维持复习', () => {
  const S = C.blank(); S.placedAt = 1;
  C.UNITS.filter(u => u.L === 0).forEach(u => { S.cards[u.id] = {lv: 3, intro: true, d: [D(-6), D(-5), D(-2)], seen: 9, last: ''}; });
  const {qs} = play(S, D(0), () => ok);
  const keepN = qs.filter(x => x.keep).length;
  assert.equal(keepN, 0, '维持复习 ' + keepN + ' 题');
});

test('R2-B9 同一天关掉重开：出题上限接着算；「再练一会」多给 5 分钟', () => {
  const S = rich();
  const a = E.session(S, D(0), {rnd: seeded(1)});
  let first = null;
  for (let k = 0; k < 8;) { const x = a.next(); if (x.kind === 'q') { first = first || x.inst.id; a.answer(ok); k++; } }
  assert.ok(S.daily.asked[first] >= 1);
  const T = C.blank(); T.placedAt = 1;                                   // 「再练一会」：用有维持复习内容的存档
  K.SKILLS.forEach(s => s.items.forEach(it => Object.assign(E.prog(T, it.id), {lv: 3, d: [D(-40), D(-35), D(-30)], seen: 9, lastDay: D(-30)})));
  play(T, D(0), () => ok);
  assert.equal(T.daily.done, true);
  const more = play(T, D(0), () => ok, {extra: 300});
  assert.ok(more.qs.length > 0 && more.s.elapsed > 600 && more.s.elapsed <= 900 + 15);
});

test('R2-B10 自由加练：只出选的技能组，12 题，计入用时统计但不计入今日练习', () => {
  const S = C.blank(); S.placedAt = 1;
  const f = E.free(S, D(0), 'look', {rnd: seeded(1)}), seen = [];
  for (let x = f.next(), g = 0; x && g < 50; x = f.next(), g++) { if (x.kind === 'q') { seen.push(x.inst.id); f.answer(ok); } }
  assert.equal(seen.length, 12);
  assert.ok(seen.every(id => K.ITEM[id].skill.startsWith('look')));
  assert.equal(S.stats[D(0)].sec, 72 + 5 * Object.keys(S.demoSeen).length);   // 12 题 × 6 秒 + 示范卡每张 5 秒
  assert.ok(!S.daily || S.daily.sec === 0);
});

test('R2-B11 统计用时是累加：今日练习 + 自由加练', () => {
  const S = C.blank(); S.placedAt = 1;
  const {s} = play(S, D(0), () => ok);
  const demos = Object.keys(S.demoSeen).length;
  const f = E.free(S, D(0), 'look', {rnd: seeded(1)});
  for (let x = f.next(); x; x = f.next()) if (x.kind === 'q') f.answer(ok);
  assert.equal(S.stats[D(0)].sec, s.elapsed + 72 + 5 * (Object.keys(S.demoSeen).length - demos));
});

test('R2-B12 学新的：理解技能和秒答新卡并行，前置学会后秒答新卡不用等全部理解技能', () => {
  const S = C.blank(); S.placedAt = 1;
  ['look1', 'look3', 'bond1'].forEach(sid => K.BY[sid].items.forEach(it => Object.assign(E.prog(S, it.id), {lv: 1, d: [D(-1)], seen: 1, lastDay: D(-1)})));
  const {qs} = play(S, D(0), () => ok);
  assert.ok(qs.some(x => x.seg === 'new' && K.BY[K.ITEM[x.inst.id].skill].speed), '秒答 L1 世界 1 的新卡应该出现');
});

test('R2-B14 题型淡红 → 深红：只数隔 3 天以后的作答', () => {
  const S = C.blank(), id = 'cmp:t:20';
  for (let k = 0; k < 8; k++) E.record(S, id, ok, D(0));
  for (let k = 0; k < 8; k++) E.record(S, id, ok, D(1));
  assert.equal(E.lv(S, id), 2);
  for (let k = 0; k < 8; k++) E.record(S, id, ok, D(2));
  E.record(S, id, ok, D(4));
  assert.equal(E.lv(S, id), 2, '第 4 天对 1 题不够');
  for (let k = 0; k < 7; k++) E.record(S, id, ok, D(4));
  assert.equal(E.lv(S, id), 3);
});

test('R2-B15 摸底中途关掉：重开后接着测原来那次探测，不改成测中间的', () => {
  const S = C.blank();
  const p = E.placement(S, D(0), {rnd: seeded(5)});
  const x = p.next(); p.answer({ok: true, secs: 6});
  const p2 = E.placement(S, D(0), {rnd: seeded(5)});
  assert.equal(K.ITEM[p2.next().inst.id].skill, K.ITEM[x.inst.id].skill);
});

test('R2-B16 「再看一次」答对不拉低合格率（不影响"有余力再学新的"）', () => {
  const S = C.blank(); S.placedAt = 1;
  const s = E.session(S, D(0), {rnd: seeded(1)});
  for (let k = 0; k < 6;) { const x = s.next(); if (x.kind === 'q') { s.answer(Object.assign({peeked: true}, ok)); k++; } }
  assert.equal(s.tally.n, 0);
});

test('R2-B17 排课速度：460 道错题、全部格子有记录时，next + answer 每题 ≤ 10 毫秒', () => {
  const S = C.blank(); S.placedAt = 1;
  K.SKILLS.forEach(s => s.items.forEach(it => Object.assign(E.prog(S, it.id), {lv: 2, d: [D(-9), D(-8)], seen: 5, lastDay: D(-8)})));
  const r = seeded(3);
  for (let k = 0; k < 460; k++) { const it = K.SKILLS[k % K.SKILLS.length].items[0]; E.addMistake(S, K.make(it.id, r), D(-1 - (k % 5))); }
  const s = E.session(S, D(0), {rnd: seeded(1)});
  let worst = 0;
  for (let k = 0; k < 60; k++) { const t0 = performance.now(); const x = s.next(); if (!x) break; if (x.kind === 'q') s.answer(ok); worst = Math.max(worst, performance.now() - t0); }
  assert.ok(worst <= 10, '最慢 ' + worst.toFixed(2) + ' 毫秒');
});

test('题型错题每种最多留最近 2 道（同一类题不堆成一串）；卡的错题不受影响', () => {
  const S = C.blank(), r = seeded(4);
  for (let k = 0; k < 6; k++) E.addMistake(S, K.make('cmp:t:p10', r), D(k));
  for (let k = 0; k < 6; k++) E.addMistake(S, {id: 'L3:add2c', q: {a: 20 + k, op: '+', b: 15}, ans: 35 + k}, D(k));
  const n = uid => Object.values(S.mistakes).filter(m => m.uid === uid).length;
  assert.equal(n('cmp:t:p10'), 2);
  assert.equal(n('L3:add2c'), 2);
  ['look:tf:3', 'look:tf:4', 'look:tf:5'].forEach(id => E.addMistake(S, K.make(id), D(0)));
  assert.equal(Object.values(S.mistakes).filter(m => m.src === 'look').length, 3);
});

test('防冷落：开始学了、5 天没练的技能，今天"学新的"排在最前', () => {
  const S = rich();
  ['look1', 'look3'].forEach(sid => K.BY[sid].items.forEach(it => Object.assign(E.prog(S, it.id), {lv: 1, d: [D(-1)], seen: 2, lastDay: D(-1)})));
  K.BY.look4.items.forEach(it => Object.assign(E.prog(S, it.id), {seen: 3, lastDay: D(-6)}));   // 两个十格框：排在图谱第 6 位，6 天没练
  const s = E.session(S, D(0), {rnd: seeded(1)}), first = [];
  for (let x = s.next(); x && first.length < 4; x = s.next()) if (x.kind === 'q' && x.seg === 'new') { first.push(K.ITEM[x.inst.id].skill); s.answer(ok); } else if (x.kind === 'q') s.answer(ok);
  assert.ok(first.includes('look4'), first.join());
  Object.values(S.skills).forEach(p => { if (p.lastDay === D(-6)) p.lastDay = D(-1); });
});
