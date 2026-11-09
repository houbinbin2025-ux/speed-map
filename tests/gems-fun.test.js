// 趣味题打开后的碎片层保险（Ben 11-09「先打开，补完再升级」；C 对中控的承诺）：
// ① 两种挑战（弹出的双倍 / 限时挑战 pickEv、挑战券 pickChallenge）只从 K.SKILLS + K.HARD 选题，趣味题一道不出——趣味题只走插入通道，每天 90 秒
// ② 趣味题答对照样给碎片（碎片层不按题型挡）
// 本文件按「趣味题打开」跑：先把环境变量 FUN_SEC 设成 90 再加载题库（node --test 每个文件单独一个进程，不影响别的测试）
'use strict';
process.env.FUN_SEC = process.env.FUN_SEC || '90';
const test = require('node:test'), assert = require('node:assert/strict');
const K = require('../v2/skills.js'), C = require('../v2/core.js'), E = require('../v2/engine.js'), G = require('../v2/gems.js');
const open = Array.isArray(K.FUN) && K.FUN.length > 0;   // main 上第三批合进来之前 K.FUN 还是空的
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const funIds = () => new Set((K.FUN || []).flatMap(s => s.items.map(i => i.id)));
// 一个什么都学过的孩子：家长选全部 15 级，所有格子（含趣味题）都点亮过，趣味题要是混进候选一定选得到
function kid() {
  const S = C.blank(); S.placedAt = 1; S.settings = {levels: Array.from({length: 15}, (_, i) => i + 1), levelsV: 2};
  S.known = Object.fromEntries(K.SKILLS.concat(K.HARD, K.FUN || []).map(s => [s.id, true]));
  return S;
}
function picked(S) {
  const out = [];
  for (let top = 0; top <= 15; top++) for (let sd = 1; sd <= 6; sd++) {
    const st = G.blank();
    out.push(...G.pickChallenge(S, top, seeded(sd * 31 + top), st), ...G.pickEv(S, st, 14, top, seeded(sd * 57 + top)));
  }
  return out;
}

test('趣味题打开时：两种挑战选出来的题里没有趣味题', {skip: !open && 'main 上还没有趣味题（第三批合进来后自动生效）'}, () => {
  assert.ok(K.FUN_SEC > 0, '本文件按打开跑');
  const qs = picked(kid()), fun = funIds();
  assert.ok(qs.length > 300, `选出的题太少，测不到东西：${qs.length}`);
  assert.deepEqual(qs.filter(x => fun.has(x.id)).map(x => x.id), []);
});

test('这条测试拦得住：要是趣味技能混进 K.HARD，挑战就会出趣味题', {skip: !open && 'main 上还没有趣味题'}, () => {
  const n = K.HARD.length; K.HARD.push(...K.FUN);
  try { const fun = funIds(); assert.ok(picked(kid()).some(x => fun.has(x.id)), '混进去了却没选到，上面那条测不出问题'); }
  finally { K.HARD.length = n; }
});

test('趣味题答对照样给碎片，答错不给', {skip: !open && 'main 上还没有趣味题'}, () => {
  const S = kid(), st = G.blank(), day = '2026-11-10'; G.sync(st, S, 15);
  K.FUN.forEach((s, i) => {
    const inst = K.make(s.items[0].id, seeded(i + 1));
    const ok = G.answer(st, {day, inst, ok: true, slow: false, top: 15, lv: 0, rand: seeded(i + 7)});
    assert.ok(ok && ok.length > 0, `${s.id} 答对没给碎片`);
    const bad = G.answer(st, {day, inst: K.make(s.items[0].id, seeded(i + 99)), ok: false, top: 15, lv: 0, rand: seeded(i + 9)});
    assert.ok(!bad || !bad.length, `${s.id} 答错给了碎片`);
  });
});
