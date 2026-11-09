// 第三批趣味题的保险（docs/说明书-第三批.md §4.3「关掉 / 退回」，中控 11-09）：趣味技能登记进 K.BY / K.ITEM，但永远不进 K.HARD（单独放 K.FUN），
// 每日练习、自由加练、两种挑战（gems.js 从 K.HARD 选题）、开级、allOut、todayZone 都从 HARD 取题，所以一道不出；只走插入通道且要 FUN_SEC > 0。
// 关掉时：错题本里的趣味错题不回炉、级别说明不写趣味内容词。A 的趣味题型合进来之前，这条必须先在
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const K = require('../v2/skills.js'), C = require('../v2/core.js'), E = require('../v2/engine.js');

test('FUN_SEC 是常量，网页里是 90（Ben 11-09 拍板打开）', { skip: process.env.FUN_SEC != null && process.env.FUN_SEC !== '' }, () => {
  assert.equal(typeof K.FUN_SEC, 'number'); assert.equal(K.FUN_SEC, 90);
});
test('登记闸门：fun 技能只有 FUN_SEC > 0 才登记；非 fun 技能不受影响', () => {
  assert.equal(K.funAllowed({fun: true}, 0), false); assert.equal(K.funAllowed({fun: true}, undefined), false);
  assert.equal(K.funAllowed({fun: true}, 90), true);
  assert.equal(K.funAllowed({}, 0), true); assert.equal(K.funAllowed({fun: false}, 0), true);
});
test('趣味技能永远不进 K.SKILLS / K.HARD（练习、挑战、开级、allOut 都从这里取题），单独在 K.FUN 里', () => {
  assert.ok(K.SKILLS.concat(K.HARD).every(s => !s.fun));
  assert.ok(K.FUN.length > 0 && K.FUN.every(s => s.fun && K.BY[s.id] === s && s.items.every(it => K.ITEM[it.id])));
});
test('关掉时：级别说明里没有只属于趣味技能的内容词', { skip: K.FUN_SEC > 0 }, () => {
  const funWords = new Set(K.FUN.map(s => K.TOPIC[s.id]).filter(w => !K.SKILLS.concat(K.HARD).some(t => K.TOPIC[t.id] === w)));
  K.LEVELS.forEach(L => L.topics.forEach(w => assert.ok(!funWords.has(w), `第 ${L.n} 级说明里有趣味内容词「${w}」`)));
});
test('关掉时：每日练习、自由加练、复习、挑战选题的全集里没有趣味题，趣味错题不回炉', { skip: K.FUN_SEC > 0 }, () => {
  const S = C.blank(); S.placedAt = 1; S.settings = {levels: [4, 5, 7, 9], levelsV: 2};
  const f = K.FUN[0], it = f.items[0], inst = K.make(it.id, () => 0.4), key = K.mkey(inst);
  S.mistakes[key] = {key, uid: it.id, src: f.group, q: inst.q, ans: inst.ans, passes: 0, due: '2026-11-01', added: '2026-10-30', last: '2026-10-30'};
  const seen = new Set();
  [E.session(S, '2026-11-02', {rnd: () => 0.5}), E.free(S, '2026-11-02', f.group), E.review(S, '2026-11-02', f.group)].forEach(s => {
    for (let x = s.next(), g = 0; x && g < 300; x = s.next(), g++) if (x.kind === 'q') { seen.add(x.inst.id); s.answer({ok: true, fast: true, secs: 3}); }
  });
  const funIds = new Set(K.FUN.flatMap(s => s.items.map(i => i.id)));
  assert.ok(![...seen].some(id => funIds.has(id)), '出了趣味题：' + [...seen].filter(id => funIds.has(id)));
  assert.ok(S.mistakes[key], '趣味错题记录还在');
});
test('趣味题的秒答时间归「读题题」类（3–30 秒，放得下 12–25 秒）', () => {
  K.BY['fun:test'] = {id: 'fun:test', fun: true, input: 'write', items: []}; K.ITEM['fun:t:x'] = {id: 'fun:t:x', skill: 'fun:test'};
  try { assert.equal(K.fastClass('fun:t:x'), 'word'); assert.ok(K.FAST_CLASS.word.lo <= 12 && K.FAST_CLASS.word.hi >= 25); }
  finally { delete K.BY['fun:test']; delete K.ITEM['fun:t:x']; }
});
test('错题本里有查不到题型的错题：不回炉、不报错、记录不丢', () => {
  const S = C.blank(); S.placedAt = 1;
  S.mistakes['fun:t:x|1'] = {key: 'fun:t:x|1', uid: 'fun:t:x', src: 'dock', q: {view: 'story', text: '□', say: '植树'}, ans: 5, passes: 0, due: '2026-11-01', added: '2026-10-30', last: '2026-10-30'};
  const s = E.session(S, '2026-11-02', {rnd: () => 0.5}); const seen = [];
  for (let x = s.next(), g = 0; x && g < 200; x = s.next(), g++) if (x.kind === 'q') { seen.push(x.inst.id); s.answer({ok: true, fast: true, secs: 3}); }
  assert.ok(!seen.includes('fun:t:x'), '不回炉'); assert.ok(S.mistakes['fun:t:x|1'], '记录还在');
});

test('关掉时前置里写了趣味技能也不崩：所有技能（含高级题）的前置都只留登记了的（审查 R1）', () => {
  K.SKILLS.concat(K.HARD).forEach(s => s.pre.forEach(p => assert.ok(K.BY[p], `${s.id} 的前置 ${p} 没登记`)));
});
test('测试开关：环境变量 FUN_SEC 只在 node 里生效（FUN_SEC=0 npm test 跑关掉时的路径），网页里永远按代码里的常量 90', () => {
  const e = process.env.FUN_SEC; assert.equal(K.FUN_SEC, e != null && e !== '' ? Math.max(0, Number(e) || 0) : 90);
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../v2/skills.js'), 'utf8');
  assert.match(src, /const FUN_ON = 90;/, '网页默认值');   // 网页里没有 process，走 FUN_ON
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
