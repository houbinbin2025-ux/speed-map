// 每类题答对都有碎片（Ben 11-08：「所有的作业都有激励」）：摸底、Boss、口答模式原来不给，现在都给
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const G = require('../v2/gems.js');
const K = require('../v2/skills.js');
const inst = (() => { const s = K.SKILLS.find(s => s.items && s.items.length && !s.speed); const it = s.items[0]; return {id: it.id, q: it.q || {}, ans: it.ans}; })();
const DAY = '2026-11-08';

test('口答模式答对也给碎片（家长点的，不算秒答：1 个小碎片）', () => {
  const st = G.blank();
  const got = G.answer(st, {day: DAY, inst, ok: true, slow: false, top: 15, lv: 0, oral: true});
  assert.ok(got && got.length >= 1, '口答答对给碎片');
  assert.equal(G.answer(G.blank(), {day: DAY, inst, ok: false, oral: true}), null, '口答答错不给');
});

test('页面上每类题判完都会走到碎片模块（接线没有条件）', () => {
  const h = fs.readFileSync(require.resolve('../v2/index.html'), 'utf8'), ui = fs.readFileSync(require.resolve('../v2/gemui.js'), 'utf8'), th = fs.readFileSync(require.resolve('../v2/thinking.js'), 'utf8');
  assert.match(h, /\n\s+P\.gain = GM\.answerP\(/, '老流程（今日练习、Boss、摸底）判完调 answerP');
  assert.match(h, /\n\s+const gain = GM\.answerQ\(/, '新流程（练这一块、复习、挑战、摸底新版）判完调 answerQ');
  assert.match(h, /gem: o => GM\.answerThink\(o\)/, '思维地点接上');
  assert.match(th, /if \(o\.gem\) o\.gem\(/, 'thinking.js 答对处调 gem');
  // 碎片模块里不再按题型挡掉
  assert.doesNotMatch(ui, /kind === 'boss'|kind === 'scan'|kind === 'final'|kind === 'place'/, 'gemui 里不再按 Boss / 摸底挡碎片');
  assert.doesNotMatch(ui, /function answerThink[\s\S]{0,120}S\(\)\.oral/, '思维地点口答也给');
});
