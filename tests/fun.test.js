// 第三批趣味题的保险（docs/说明书-第三批.md §4.3「关掉 / 退回」，中控 11-09）：FUN_SEC = 0 时趣味技能完全不登记
// —— 不进 K.HARD / K.BY / K.ITEM，所以每日练习、自由加练、两种挑战（gems.js 从 K.HARD 选题）、开级、allOut、todayZone 都一道不出；
// 错题本里已有的趣味错题 K.ITEM 查不到就不回炉（同已剔除的题型），记录不丢。A 的趣味题型合进来之前，这条必须先在
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const K = require('../v2/skills.js'), C = require('../v2/core.js'), E = require('../v2/engine.js');

test('FUN_SEC 是常量，现在是 0（趣味题和 A、C 同一次上线时再改成 90）', () => {
  assert.equal(typeof K.FUN_SEC, 'number'); assert.equal(K.FUN_SEC, 0);
});
test('登记闸门：fun 技能只有 FUN_SEC > 0 才登记；非 fun 技能不受影响', () => {
  assert.equal(K.funAllowed({fun: true}, 0), false); assert.equal(K.funAllowed({fun: true}, undefined), false);
  assert.equal(K.funAllowed({fun: true}, 90), true);
  assert.equal(K.funAllowed({}, 0), true); assert.equal(K.funAllowed({fun: false}, 0), true);
});
test('FUN_SEC = 0：题表里没有任何 fun 技能（练习、挑战、开级、allOut 都从这里取题）', () => {
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
