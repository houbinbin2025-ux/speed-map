// 第三批趣味题的保险（docs/说明书-第三批.md §4.3「关掉 / 退回」，中控 11-09）：FUN_SEC = 0 时趣味技能完全不登记
// —— 不进 K.HARD / K.BY / K.ITEM，所以每日练习、自由加练、两种挑战（gems.js 从 K.HARD 选题）、开级、allOut、todayZone 都一道不出；
// 错题本里已有的趣味错题 K.ITEM 查不到就不回炉（同已剔除的题型），记录不丢。A 的趣味题型合进来之前，这条必须先在
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const K = require('../v2/skills.js'), C = require('../v2/core.js'), E = require('../v2/engine.js');

test('FUN_SEC 是常量，现在是 0（趣味题和 A、C 同一次上线时再改成 90）', { skip: Number(process.env.FUN_SEC) > 0 }, () => {
  assert.equal(typeof K.FUN_SEC, 'number'); assert.equal(K.FUN_SEC, 0);
});
test('登记闸门：fun 技能只有 FUN_SEC > 0 才登记；非 fun 技能不受影响', () => {
  assert.equal(K.funAllowed({fun: true}, 0), false); assert.equal(K.funAllowed({fun: true}, undefined), false);
  assert.equal(K.funAllowed({fun: true}, 90), true);
  assert.equal(K.funAllowed({}, 0), true); assert.equal(K.funAllowed({fun: false}, 0), true);
});
test('FUN_SEC = 0：题表里没有任何 fun 技能（练习、挑战、开级、allOut 都从这里取题）', { skip: Number(process.env.FUN_SEC) > 0 }, () => {
  assert.ok(K.SKILLS.concat(K.HARD).every(s => !s.fun));
  assert.ok(Object.values(K.BY).every(s => !s.fun));
  assert.ok(Object.values(K.ITEM).every(it => !(K.BY[it.skill] || {}).fun));
});
test('趣味题的秒答时间归「读题题」类（3–30 秒，放得下 12–25 秒）', () => {
  K.BY['fun:test'] = {id: 'fun:test', fun: true, input: 'write', items: []}; K.ITEM['fun:t:x'] = {id: 'fun:t:x', skill: 'fun:test'};
  try { assert.equal(K.fastClass('fun:t:x'), 'word'); assert.ok(K.FAST_CLASS.word.lo <= 12 && K.FAST_CLASS.word.hi >= 25); }
  finally { delete K.BY['fun:test']; delete K.ITEM['fun:t:x']; }
});
test('错题本里有趣味题（关掉以后留下的）：不回炉、不报错、记录不丢', () => {
  const S = C.blank(); S.placedAt = 1;
  S.mistakes['fun:t:x|1'] = {key: 'fun:t:x|1', uid: 'fun:t:x', src: 'dock', q: {view: 'story', text: '□', say: '植树'}, ans: 5, passes: 0, due: '2026-11-01', added: '2026-10-30', last: '2026-10-30'};
  const s = E.session(S, '2026-11-02', {rnd: () => 0.5}); const seen = [];
  for (let x = s.next(), g = 0; x && g < 200; x = s.next(), g++) if (x.kind === 'q') { seen.push(x.inst.id); s.answer({ok: true, fast: true, secs: 3}); }
  assert.ok(!seen.includes('fun:t:x'), '不回炉'); assert.ok(S.mistakes['fun:t:x|1'], '记录还在');
});

test('关掉时前置里写了趣味技能也不崩：所有技能（含高级题）的前置都只留登记了的（审查 R1）', () => {
  K.SKILLS.concat(K.HARD).forEach(s => s.pre.forEach(p => assert.ok(K.BY[p], `${s.id} 的前置 ${p} 没登记`)));
});
test('测试开关：环境变量 FUN_SEC 只在 node 里生效（npm test 时 FUN_SEC=90 可以提前跑打开后的路径），网页里永远按代码里的常量', () => {
  assert.equal(K.FUN_SEC, Number(process.env.FUN_SEC) > 0 ? Number(process.env.FUN_SEC) : 0);
});

// 第三批存档字段（B 写记录一侧；合并、清洗归 F，见交接 F-审-第三批存档字段合并规则.md）：S.stats[日].funSec、S.stats[日].fun = {题型: [作答, 不会]}，和习惯记录 h 并列
test('趣味题作答记录：funSec 累加实际用时（再来一次也算，管 90 秒）；fun[题型] 记作答数和「不会」数（再来一次、看过提示不算）', () => {
  const real = K.ITEM['dock:g7:bar'].skill;   // 借一个真题型的题面，临时把它的技能标成趣味技能
  const sk = K.BY[real], was = sk.fun; sk.fun = true;
  try {
    const S = C.blank(); S.placedAt = 1; const day = '2026-11-03';
    const inst = K.make('dock:g7:bar', () => 0.3), x = {kind: 'q', seg: 'new', inst};
    E.settle(S, x, {ok: true, fast: true, secs: 14.2}, day);
    E.settle(S, x, {ok: false, dunno: true, secs: 3}, day);
    E.settle(S, Object.assign({}, x, {retry: 1}), {ok: true, fast: false, secs: 20, peeked: true}, day);
    E.settle(S, x, {ok: false, fast: false, secs: 6, peeked: true}, day);
    const st = S.stats[day];
    assert.equal(st.funSec, 43.2, '四次都算时间');
    assert.deepEqual(st.fun, {[real]: [2, 1]}, '再来一次、看过提示的不算作答');
    assert.ok(!st.h || !('funSec' in st.h || 'fun' in st.h), '不放进习惯记录 h');
  } finally { sk.fun = was; }
});
test('不是趣味题：不写 funSec / fun（旧存档、计算题照旧）', () => {
  const S = C.blank(); S.placedAt = 1; const day = '2026-11-03', inst = K.make('dock:g7:bar', () => 0.3);
  E.settle(S, {kind: 'q', seg: 'new', inst}, {ok: true, fast: true, secs: 5}, day);
  assert.ok(!('funSec' in S.stats[day]) && !('fun' in S.stats[day]));
});
