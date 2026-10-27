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
