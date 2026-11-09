// 方案 7（中控 11-09 批准）：趣味题答对给「谜题水晶」（只收藏、不进锻造），每个题型答对 3 道得徽章。
// 存在碎片存档 st.puzzle = {n: 累计水晶, by: {题型: 答对数}}；合并规则由 F 定（11-09）：by 按题型取大（不相加），n = max(本机, 备份, by 的总和)；
// 清洗：不是对象当没有；by 里不是非负整数的删掉；n 不是非负整数当 0；跳过 __proto__；查不到的题型保留。旧存档没有就从 0 开始，不补发
const test = require('node:test'), assert = require('node:assert/strict');
const G = require('../v2/gems.js');
const sum = by => Object.values(by).reduce((a, b) => a + b, 0);

test('答对一道趣味题给 1 颗水晶；同一题型第 3 道得徽章，只报一次', () => {
  const st = G.blank();
  assert.equal(st.puzzle, undefined, '新存档没有这个字段（第一次答对才建）');
  const r = [1, 2, 3, 4].map(() => G.puzzleAnswer(st, 'g34:g4:pyr'));
  assert.deepEqual(r.map(x => x.badge), [false, false, true, false]);
  assert.deepEqual(st.puzzle, {n: 4, by: {'g34:g4:pyr': 4}});
  assert.equal(G.PUZZLE_BADGE, 3);
  assert.deepEqual(G.puzzleBadges(st, ['g34:g4:pyr', 'g34:g5:saw']), [{sid: 'g34:g4:pyr', n: 4, got: true}, {sid: 'g34:g5:saw', n: 0, got: false}]);
});

test('① 旧碎片存档（没有 puzzle）读进来不报错、水晶 0、不补发', () => {
  const old = JSON.stringify(Object.assign(G.blank(), {inv: {a: 5, b: 0, g: 0, s: 0, m: 0, h: 0, l: 0}}));
  const st = G.parse(old);
  assert.ok(st); assert.equal(st.puzzle, undefined); assert.equal(G.puzzleCount(st), 0);
  assert.deepEqual(G.puzzleBadges(st, ['g34:g4:pyr']).map(b => b.got), [false]);
  assert.equal(st.inv.a, 5);
});

test('② 同一份导两次不翻倍', () => {
  const a = G.blank(), b = G.blank();
  for (let i = 0; i < 4; i++) G.puzzleAnswer(b, 'g34:g4:pyr');
  const once = G.mergeBackup(a, JSON.parse(JSON.stringify(b))), twice = G.mergeBackup(once, JSON.parse(JSON.stringify(b)));
  assert.deepEqual(twice.puzzle, {n: 4, by: {'g34:g4:pyr': 4}});
});

test('③ 两台设备各练不同题型：合并后两边都在，n 等于 by 的总和；同一题型取大不相加', () => {
  const phone = G.blank(), ipad = G.blank();
  for (let i = 0; i < 3; i++) G.puzzleAnswer(phone, 'g34:g4:pyr');
  for (let i = 0; i < 5; i++) G.puzzleAnswer(ipad, 'g34:g5:saw');
  G.puzzleAnswer(phone, 'g34:g5:saw'); G.puzzleAnswer(phone, 'g34:g5:saw');
  const M = G.mergeBackup(phone, JSON.parse(JSON.stringify(ipad)));
  assert.deepEqual(M.puzzle.by, {'g34:g4:pyr': 3, 'g34:g5:saw': 5});
  assert.equal(M.puzzle.n, 8);
  const back = G.mergeBackup(ipad, JSON.parse(JSON.stringify(M)));
  assert.deepEqual(back.puzzle, M.puzzle, '反过来再发一次，两边一样');
  // 本机 n 比各题型加起来还大（比如题型编号后来改了）：保留大的
  const big = G.blank(); big.puzzle = {n: 20, by: {x: 2}};
  assert.equal(G.mergeBackup(big, JSON.parse(JSON.stringify(ipad))).puzzle.n, 20);
});

test('④ 坏值读档时洗掉，碎片本身不受影响', () => {
  const raw = Object.assign(G.blank(), {inv: {a: 7, b: 0, g: 0, s: 0, m: 0, h: 0, l: 0}});
  assert.equal(G.parse(JSON.stringify(Object.assign({}, raw, {puzzle: 3}))).puzzle, undefined, 'puzzle 不是对象当没有');
  const st = G.parse(JSON.stringify(Object.assign({}, raw, {puzzle: {n: 'q', by: {x: -1, y: 'a', z: 1.5, ok: 2, 'gone:skill': 4}}})));
  assert.deepEqual(st.puzzle, {n: 6, by: {ok: 2, 'gone:skill': 4}}, '坏的删掉，查不到的题型保留，n 不能比总和小');
  assert.equal(st.inv.a, 7);
  const bad = G.parse('{"inv":{"a":1,"b":0,"g":0,"s":0,"m":0,"h":0,"l":0},"puzzle":{"n":1,"by":{"__proto__":{"polluted":5},"ok":1}}}');
  assert.deepEqual(Object.keys(bad.puzzle.by), ['ok']); assert.equal(({}).polluted, undefined, '没有污染原型');
  assert.equal(G.parse(JSON.stringify(Object.assign({}, raw, {puzzle: {by: 'x'}}))).puzzle.n, 0, 'by 不是对象当空');
});

test('⑤ 整份替换以备份为准，并过清洗', () => {
  const backup = Object.assign(G.blank(), {puzzle: {n: 2, by: {ok: 2, bad: -3}}});
  const st = G.parse(JSON.stringify(backup));   // 家长区「整份替换」走的就是 G.parse（gemui.js importBackup）
  assert.deepEqual(st.puzzle, {n: 2, by: {ok: 2}});
});

test('⑥ 清空进度：和碎片一样不碰（家长区「确认清空」只重置学习进度，不删碎片存档、不改 GEMUI 状态）', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'v2', 'index.html'), 'utf8');
  const m = html.match(/\$\('btnResetYes'\)\.addEventListener\('click', \(\) => \{([^\n]*)\}\);/);
  assert.ok(m, '找不到「确认清空」的处理');
  assert.ok(!/gems|GEMS\.|removeItem|localStorage\.clear/.test(m[1]), '确认清空碰到了碎片存档：' + m[1]);
  assert.deepEqual((m[1].match(/GM\.\w+/g) || []), ['GM.syncNow'], '只允许先同步一次碎片，不许清');
});

test('合并时备份坏了不影响本机', () => {
  const st = G.blank(); G.puzzleAnswer(st, 'a');
  const M = G.mergeBackup(st, Object.assign(G.blank(), {puzzle: 'x'}));
  assert.deepEqual(M.puzzle, {n: 1, by: {a: 1}});
});

test('F 审查：备份里题型编号叫 constructor / toString / hasOwnProperty 时，合并后 n 和 by 都是数字', () => {
  const st = G.blank(); st.puzzle = {n: 2, by: {x: 2}};
  const backup = JSON.parse('{"inv":{"a":0,"b":0,"g":0,"s":0,"m":0,"h":0,"l":0},"puzzle":{"n":6,"by":{"x":1,"constructor":2,"toString":3,"hasOwnProperty":1}}}');
  const M = G.mergeBackup(st, backup);
  assert.ok(Number.isInteger(M.puzzle.n), 'n 是 ' + M.puzzle.n);
  Object.keys(M.puzzle.by).forEach(k => assert.ok(Number.isInteger(M.puzzle.by[k]), `${k} 是 ${M.puzzle.by[k]}`));
  assert.deepEqual(JSON.parse(JSON.stringify(M.puzzle)), {n: 8, by: {x: 2, constructor: 2, toString: 3, hasOwnProperty: 1}});
});

test('徽章名单和趣味技能一一对应，英文徽章名齐全（以后加趣味题型时拦住漏名字，审查建议 6）', () => {
  process.env.FUN_SEC = process.env.FUN_SEC > 0 ? process.env.FUN_SEC : '90';
  for (const k of ['../v2/skills.js', '../v2/i18n.js', '../v2/gemui.js']) delete require.cache[require.resolve(k)];
  const K = require('../v2/skills.js'), I = require('../v2/i18n.js');
  global.window = {}; require('../v2/gemui.js'); const names = global.window.GEMUI.puzzleNames();
  assert.deepEqual(Object.keys(names).sort(), K.FUN.map(s => s.id).sort());
  Object.values(names).forEach(n => assert.notEqual(I.text('新徽章 ' + n), '新徽章 ' + n, `「${n}」没有英文`));
  assert.equal(I.text('谜题水晶 +1'), 'Puzzle crystal +1'); assert.equal(I.text('谜题水晶 +2'), 'Puzzle crystals +2');
});

test('中控 11-09：水晶每天最多 10 颗；到上限后不给水晶、不记题型（碎片照常，另测），第二天重新有；合并按天取大', () => {
  const st = G.blank(), d1 = '2026-11-10', d2 = '2026-11-11';
  assert.equal(G.PUZZLE_DAY, 10);
  const got = Array.from({length: 12}, () => G.puzzleAnswer(st, 'g34:g4:pyr', d1));
  assert.equal(got.filter(Boolean).length, 10); assert.equal(got[10], null); assert.equal(got[11], null);
  assert.deepEqual(st.puzzle, {n: 10, by: {'g34:g4:pyr': 10}});
  assert.equal(st.days[d1].pz, 10);
  assert.ok(G.puzzleAnswer(st, 'g34:g5:saw', d2), '第二天重新有');
  const other = G.blank(); for (let i = 0; i < 4; i++) G.puzzleAnswer(other, 'g34:g5:saw', d1);
  const M = G.mergeBackup(other, JSON.parse(JSON.stringify(st)));
  assert.equal(M.days[d1].pz, 10, '同一天按天取大，合并后不会多出机会');
  assert.equal(G.puzzleAnswer(M, 'x', d1), null);
});
