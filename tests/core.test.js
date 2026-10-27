const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js');

// ---------- 任务 1：题库、升级、限时 ----------
test('题库与 v1 一致：L1 110 张、L2 90 张、L3/L4 各 12 种题型', () => {
  assert.equal(C.unitsOf(0).length, 110);
  assert.equal(C.unitsOf(1).length, 90);
  assert.equal(C.unitsOf(2).length, 12);
  assert.equal(C.unitsOf(3).length, 12);
  assert.ok(C.BYID['3+4'] && C.BYID['3+4'].ans === 7);
  assert.ok(C.BYID['10-0'] && C.BYID['10-0'].ans === 10);
  assert.ok(C.BYID['L3:add1c'].gen);
});

test('题型生成的数字符合题型规则', () => {
  for (let i = 0; i < 200; i++) {
    const q = C.inst(C.BYID['L4:sub2c']);
    assert.ok(q.b > 10 && q.b < q.a && q.b % 10 > q.a % 10, JSON.stringify(q));
    assert.equal(q.ans, q.a - q.b);
  }
});

test('tryUp：只升不降、一天最多一级、淡红到深红隔 3 天', () => {
  const S = C.blank();
  assert.equal(C.tryUp(S, '3+4', '2026-10-01'), true);
  assert.equal(C.tryUp(S, '3+4', '2026-10-01'), false); // 同一天不再升
  assert.equal(C.tryUp(S, '3+4', '2026-10-02'), true);
  assert.equal(S.cards['3+4'].lv, 2);
  assert.equal(C.tryUp(S, '3+4', '2026-10-04'), false); // 只隔 2 天
  assert.equal(C.tryUp(S, '3+4', '2026-10-05'), true);
  assert.equal(S.cards['3+4'].lv, 3);
  assert.equal(C.tryUp(S, '3+4', '2026-10-20'), false);
});

test('fastLimit：口答用原限时，手写按位数加书写用时', () => {
  const u = C.BYID['3+4'];
  assert.equal(C.fastLimit(u, 7, 'oral', 800), 2000);
  assert.equal(C.fastLimit(u, 7, 'write'), 3000);          // 没测到速度按每位 1 秒
  assert.equal(C.fastLimit(u, 7, 'write', 800), 2800);
  assert.equal(C.fastLimit(C.BYID['8+5'], 13, 'write', 900), 3000 + 1800);
});

test('日期工具', () => {
  assert.equal(C.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(C.dayDiff('2026-10-01', '2026-10-05'), 4);
});

test('题目编号与线上 v1 index.html 逐个一致（旧进度不丢）', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf('const rnd = ');
  const end = html.indexOf('const BYID');
  assert.ok(start > 0 && end > start);
  const v1Units = new Function(html.slice(start, end) + '; return UNITS;')();
  assert.deepEqual(v1Units.map(u => u.id), C.UNITS.map(u => u.id));
});

// ---------- 任务 2：存储键与迁移 ----------
const memStore = (init) => {
  const m = Object.assign({}, init);
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m };
};
const v1With = (cards, extra) => JSON.stringify(Object.assign({v: 1, savedAt: 1, cards, boss: {}, log: {}, level: 0}, extra));
const lvCount = S => [0, 1, 2, 3].map(lv => Object.values(S.cards).filter(c => c.lv === lv).length);
const NOW = Date.parse('2026-10-25T10:00:00');

test('存储键：正式 / 预览 / 测试 分开，笔迹测试键独立', () => {
  assert.deepEqual(C.keysFor({}), {prog: 'speedmap.v2', ink: 'speedmap.ink'});
  assert.deepEqual(C.keysFor({preview: true}), {prog: 'speedmap.v2.preview', ink: 'speedmap.ink'});
  assert.deepEqual(C.keysFor({test: true}), {prog: 'speedmap.v2.test', ink: 'speedmap.ink.test'});
});

test('①预览期：v1 有新进度，下次打开预览就能看到', () => {
  const st = memStore({'speedmap.v1': v1With({'3+4': {lv: 1, d: ['2026-10-24'], seen: 1}})});
  let S = C.loadState(st, {preview: true}, NOW);
  assert.equal(S.cards['3+4'].lv, 1);
  st.setItem('speedmap.v1', v1With({'3+4': {lv: 2, d: ['2026-10-24', '2026-10-25'], seen: 2}}));
  S = C.loadState(st, {preview: true}, NOW);
  assert.equal(S.cards['3+4'].lv, 2);
});

test('②预览中练习、加错题：v1 一个字节都不变，错题本留在预览键', () => {
  const raw = v1With({'3+4': {lv: 1, d: ['2026-10-24'], seen: 1}});
  const st = memStore({'speedmap.v1': raw});
  const S = C.loadState(st, {preview: true}, NOW);
  C.tryUp(S, '3+4', '2026-10-25');
  C.addMistake(S, C.inst({id: '5+2'}), '2026-10-25');
  C.saveState(st, {preview: true}, S, NOW);
  assert.equal(st.getItem('speedmap.v1'), raw);
  const again = C.loadState(st, {preview: true}, NOW);
  assert.ok(again.mistakes['5+2']);           // 错题本在预览里保留
  assert.equal(again.cards['3+4'].lv, 1);     // 地图仍以 v1 为准
});

test('③正式首启：从 v1 迁移，颜色数一致，记迁移标记并立即写入 v2', () => {
  const cards = {'3+4': {lv: 3, d: [], seen: 5}, '5+2': {lv: 2, d: [], seen: 3}, '1+1': {lv: 1, d: [], seen: 1}, '2+2': {lv: 0, d: [], seen: 1}};
  const st = memStore({'speedmap.v1': v1With(cards, {level: 1, boss: {'0': '2026-10-01'}})});
  const S = C.loadState(st, {}, NOW);
  assert.deepEqual(lvCount(S), lvCount({cards}));
  assert.equal(S.level, 1);
  assert.equal(S.boss['0'], '2026-10-01');
  assert.equal(S.migratedFromV1At, NOW);
  assert.ok(st.getItem('speedmap.v2'));
});

test('④⑤迁移只发生一次：之后 v1 再被改也不影响 v2', () => {
  const st = memStore({'speedmap.v1': v1With({'3+4': {lv: 1, d: [], seen: 1}})});
  C.loadState(st, {}, NOW);
  st.setItem('speedmap.v1', v1With({'3+4': {lv: 3, d: [], seen: 9}}));
  const S = C.loadState(st, {}, NOW + 1000);
  assert.equal(S.cards['3+4'].lv, 1);
  assert.equal(S.migratedFromV1At, NOW);
});

test('没有任何旧数据：正式版从空白开始', () => {
  const S = C.loadState(memStore({}), {}, NOW);
  assert.deepEqual(S.cards, {});
  assert.deepEqual(S.mistakes, {});
});

test('⑥导出 → 导入（含换入口）：颜色数与错题一致，笔迹不在备份里', () => {
  const st = memStore({'speedmap.v1': v1With({'3+4': {lv: 3, d: [], seen: 5}, '5+2': {lv: 2, d: [], seen: 2}})});
  const S = C.loadState(st, {}, NOW);
  C.addMistake(S, C.inst({id: '6+3'}), '2026-10-25');
  const text = C.exportText(S);
  assert.ok(!/ink|templates/.test(text));
  const other = memStore({});                  // 另一个入口：空存储
  const T = C.importText(text);
  C.saveState(other, {}, T, NOW);
  const back = C.loadState(other, {}, NOW);
  assert.deepEqual(lvCount(back), lvCount(S));
  assert.ok(back.mistakes['6+3']);
});

test('⑦v1 备份也能导入；坏备份被拒', () => {
  const T = C.importText(v1With({'3+4': {lv: 2, d: [], seen: 2}}));
  assert.equal(T.cards['3+4'].lv, 2);
  assert.deepEqual(T.mistakes, {});
  assert.throws(() => C.importText('不是备份'));
  assert.throws(() => C.importText('{"a":1}'));
});

// ---------- 任务 3：错题本 + 配题合并 ----------
const T0 = '2026-10-25';
test('错题间隔 1/2/4/7/15，过 5 关算掌握；慢了留原档；错了回第 1 关', () => {
  const S = C.blank();
  const key = C.addMistake(S, C.inst({id: '8+5'}), T0);
  assert.equal(key, '8+5');
  assert.equal(S.mistakes[key].due, '2026-10-26');
  let t = '2026-10-26';
  const expectGap = [2, 4, 7, 15];
  for (let i = 0; i < 4; i++) {
    C.reviewMistake(S, key, 'fast', t);
    assert.equal(S.mistakes[key].passes, i + 1);
    assert.equal(C.dayDiff(t, S.mistakes[key].due), expectGap[i]);
    t = S.mistakes[key].due;
  }
  C.reviewMistake(S, key, 'slow', t);
  assert.equal(S.mistakes[key].passes, 4);
  assert.equal(S.mistakes[key].due, C.addDays(t, 1));
  C.reviewMistake(S, key, 'fast', C.addDays(t, 1));
  assert.equal(S.mistakes[key].due, null);   // 已掌握
  const k2 = C.addMistake(S, C.inst({id: '6+3'}), T0);
  C.reviewMistake(S, k2, 'fast', '2026-10-26');
  C.reviewMistake(S, k2, 'wrong', '2026-10-28');
  assert.equal(S.mistakes[k2].passes, 0);
  assert.equal(S.mistakes[k2].due, '2026-10-29');
});

test('题型级别错题按具体数字记，复习时用原来的数字', () => {
  const S = C.blank();
  const q = Object.assign(C.inst({id: 'L4:add2c'}), {a: 27, b: 15, ans: 42});
  const key = C.addMistake(S, q, T0);
  assert.equal(key, 'L4:add2c|27+15');
  const again = C.inst({id: 'L4:add2c', mkey: key, fixed: {a: 27, b: 15, ans: 42}});
  assert.equal(C.show(again), '27 + 15');
});

test('今天新进的错题明天才到期；复习过的当天不再到期', () => {
  const S = C.blank();
  const key = C.addMistake(S, C.inst({id: '8+5'}), T0);
  assert.equal(C.dueMistakes(S, T0, 1).length, 0);
  assert.equal(C.dueMistakes(S, '2026-10-26', 1).length, 1);
  C.reviewMistake(S, key, 'wrong', '2026-10-26');
  assert.equal(C.dueMistakes(S, '2026-10-26', 1).length, 0);
});

// 造一个级别 1（20 以内，一题一卡）的状态：nErr 道到期错题（会的卡）+ nLearn 张练习中的卡 + 其余部分会
function scenario(nErr, nLearn, series) {
  const S = C.blank();
  const pool = C.unitsOf(1).filter(u => C.seriesOk(series, u.op));
  const yesterday = '2026-10-24';
  pool.slice(40, 60).forEach(u => { Object.assign(C.cs(S, u.id), {lv: 2, d: ['2026-10-20', '2026-10-24'], seen: 3, last: '2026-10-24T00:00'}); });
  pool.slice(0, nLearn).forEach((u, i) => { Object.assign(C.cs(S, u.id), {lv: 0, seen: 2, last: '2026-10-2' + i + 'T00:00'}); });
  pool.slice(20, 20 + nErr).forEach(u => { Object.assign(C.cs(S, u.id), {lv: 3, d: [], seen: 5, last: '2026-10-24T00:00'}); C.addMistake(S, C.inst({id: u.id}), yesterday); });
  return {S, pool};
}
const seq = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test('配题合并：错题 0/3/6/10 × 练习中 0/1/3/5，每批难题 ≤8 题次、错题不重复、补满不含难题', () => {
  for (const nErr of [0, 3, 6, 10]) for (const nLearn of [0, 1, 3, 5]) for (const seed of [1, 7, 42]) {
    const {S, pool} = scenario(nErr, nLearn, 'mix');
    const deck = C.buildDaily(S, pool, T0, {rnd: seq(seed), series: 'mix', L: 1});
    const learnIds = new Set(pool.filter(u => S.cards[u.id] && S.cards[u.id].lv === 0 && S.cards[u.id].seen > 0).map(u => u.id));
    const isHard = p => learnIds.has(p.id) || !!p.mkey;
    const hard = deck.filter(isHard).length;
    const tag = `错题${nErr} 练习中${nLearn} seed${seed}`;
    assert.ok(hard <= 8, `${tag}：难题 ${hard}`);
    const mkeys = deck.filter(p => p.mkey).map(p => p.mkey);
    assert.equal(new Set(mkeys).size, mkeys.length, `${tag}：错题重复`);
    assert.ok(deck.length <= 20, tag);
    // 难题名额够用时应全部用上：错题先占 ≤4，练习中每张 2 次
    const expectLearn = Math.min(nLearn, 4), wantHard = Math.min(8, nErr + expectLearn * 2);
    assert.equal(hard, wantHard, `${tag}：难题应为 ${wantHard}，实际 ${hard}`);
    if (nErr > 0) assert.ok(mkeys.length >= Math.min(4, nErr), `${tag}：错题至少先占 min(4, 错题数)`);
    // 同一张一题一卡的卡在一批里最多出 2 次
    const cnt = {}; deck.forEach(p => { cnt[p.id] = (cnt[p.id] || 0) + 1; });
    assert.ok(Object.values(cnt).every(n => n <= 2), `${tag}：同卡超过 2 次`);
  }
});

test('奇数名额：错题 3 + 练习中 3 → 练习中出 2、2、1 次', () => {
  const {S, pool} = scenario(3, 3, 'mix');
  const deck = C.buildDaily(S, pool, T0, {rnd: seq(3), series: 'mix', L: 1});
  const learn = pool.slice(0, 3).map(u => deck.filter(p => p.id === u.id).length);
  assert.deepEqual(learn, [2, 2, 1]);
});

test('去重：练习中的卡本身就是到期错题 → 不另出，挂在它第 1 次出现上', () => {
  const S = C.blank();
  const pool = C.unitsOf(1);
  const u = pool[0];
  Object.assign(C.cs(S, u.id), {lv: 0, seen: 3, last: '2026-10-24T00:00'});
  C.addMistake(S, C.inst({id: u.id}), '2026-10-24');
  const deck = C.buildDaily(S, pool, T0, {rnd: seq(5), series: 'mix', L: 1});
  const hits = deck.map((p, i) => [p, i]).filter(([p]) => p.id === u.id);
  assert.equal(hits.length, 2);
  assert.equal(hits.filter(([p]) => p.mkey).length, 1);
  assert.ok(hits[0][0].mkey, '错题挂在第 1 次出现上');
});

test('系列过滤：加法练习只出加法（含错题）', () => {
  const {S, pool} = scenario(6, 3, 'add');
  C.addMistake(S, C.inst({id: '13-8'}), '2026-10-24'); // 减法错题不该出现
  const deck = C.buildDaily(S, pool, T0, {rnd: seq(9), series: 'add', L: 1});
  assert.ok(deck.every(p => C.BYID[p.id].op === '+'));
  assert.ok(!deck.some(p => p.mkey === '13-8'));
});

test('题型级别：补满只用非难题；所属题型在练习中的错题顶替一次该题型出题', () => {
  const S = C.blank();
  const pool = C.unitsOf(3);
  pool.forEach((u, i) => Object.assign(C.cs(S, u.id), i < 2 ? {lv: 0, seen: 3, last: '2026-10-2' + i + 'T00:00'} : {lv: 2, d: ['2026-10-20', '2026-10-24'], seen: 9, last: '2026-10-24T00:00'}));
  const learnType = pool[0];
  const key = C.addMistake(S, Object.assign(C.inst({id: learnType.id}), {a: 60, b: 20, ans: 80}), '2026-10-24');
  const deck = C.buildDaily(S, pool, T0, {rnd: seq(11), series: 'mix', L: 3});
  assert.equal(deck.filter(p => p.id === learnType.id).length, 2, '该题型仍只出 2 次');
  assert.equal(deck.filter(p => p.mkey === key).length, 1);
  const hard = deck.filter(p => p.id === pool[0].id || p.id === pool[1].id || p.mkey).length;
  assert.ok(hard <= 8);
  assert.equal(deck.length, 20);
});

test('题型级别刚开始、全是练习中：本批可以不满 20，不拿难题补满', () => {
  const S = C.blank();
  const pool = C.unitsOf(2);
  pool.forEach((u, i) => { if (i < 12) Object.assign(C.cs(S, u.id), {lv: 0, seen: 1, last: '2026-10-24T00:0' + (i % 10)}); });
  const deck = C.buildDaily(S, pool, T0, {rnd: seq(13), series: 'mix', L: 2});
  assert.ok(deck.length <= 8, `应 ≤8 题，实际 ${deck.length}`);
});

test('热身：会的题足够时，开头 3 道不是难题', () => {
  const {S, pool} = scenario(4, 2, 'mix');
  const deck = C.buildDaily(S, pool, T0, {rnd: seq(17), series: 'mix', L: 1});
  const learnIds = new Set(pool.slice(0, 2).map(u => u.id));
  deck.slice(0, 3).forEach(p => assert.ok(!p.mkey && !learnIds.has(p.id)));
});

test('到期早的错题优先进这一批', () => {
  const S = C.blank(), pool = C.unitsOf(1);
  pool.slice(40, 70).forEach(u => Object.assign(C.cs(S, u.id), {lv: 2, d: ['2026-10-20', '2026-10-24'], seen: 3, last: '2026-10-24T00:00'}));
  pool.slice(0, 6).forEach((u, i) => { Object.assign(C.cs(S, u.id), {lv: 3, d: [], seen: 5}); C.addMistake(S, C.inst({id: u.id}), '2026-10-1' + (5 - i)); }); // 越靠后越早到期
  const deck = C.buildDaily(S, pool, T0, {rnd: seq(2), series: 'mix', L: 1});
  const got = deck.filter(p => p.mkey).map(p => p.mkey).sort();
  const expect = pool.slice(0, 6).map(u => u.id).slice(-6).sort();
  assert.equal(got.length, 6);
  assert.deepEqual(got, expect);
  // 名额只有 4 个时（加 2 张练习中，各占 2 次）：应该是到期最早的 4 道
  pool.slice(10, 12).forEach((u, i) => Object.assign(C.cs(S, u.id), {lv: 0, seen: 2, last: '2026-10-2' + i + 'T00:00'}));
  const deck2 = C.buildDaily(S, pool, T0, {rnd: seq(2), series: 'mix', L: 1});
  assert.deepEqual(deck2.filter(p => p.mkey).map(p => p.mkey).sort(), pool.slice(2, 6).map(u => u.id).sort());
});

// ---------- v3：秒答进度在 v1 / 预览 / 正式三处按格子取高合并（只升不降，所以取高永远安全） ----------
test('mergeCards：每张卡取颜色高的；同色取练得多的；v3 才有的字段不被 v1 冲掉', () => {
  const a = {'3+4': {lv: 2, d: ['2026-11-01', '2026-11-02'], seen: 5, last: '2026-11-02T08:00:00.000Z', lastDay: '2026-11-02', keep: 1},
    '5-1': {lv: 1, d: ['2026-11-01'], seen: 2, last: ''}, 'L3:add1c': {lv: 0, d: [], seen: 4, fday: '2026-11-03', fn: 3}};
  const b = {'3+4': {lv: 2, d: ['2026-11-01', '2026-11-04'], seen: 9, last: '2026-11-05T08:00:00.000Z'},
    '5-1': {lv: 3, d: ['2026-10-01', '2026-10-02', '2026-10-06'], seen: 9, last: ''}, '6+1': {lv: 1, d: ['2026-11-01'], seen: 1, last: ''},
    'L3:add1c': {lv: 0, d: [], seen: 2, fday: '2026-11-03', fn: 4}};
  const m = C.mergeCards(a, b);
  assert.equal(m['5-1'].lv, 3);
  assert.deepEqual(m['5-1'].d, b['5-1'].d);
  assert.equal(m['6+1'].lv, 1);
  assert.equal(m['3+4'].seen, 9);
  assert.equal(m['3+4'].lastDay, '2026-11-02');
  assert.equal(m['3+4'].keep, 1);
  assert.equal(m['3+4'].last, '2026-11-05T08:00:00.000Z');
  assert.equal(m['L3:add1c'].fn, 4);
  assert.deepEqual(C.mergeCards(b, a), m, '和顺序无关');
  assert.equal(a['5-1'].lv, 1, '不改原对象');
});

test('mergeProgress：Boss 取并集、每日记录合并；合并两次结果不变', () => {
  const A = Object.assign(C.blank(), {cards: {'3+4': {lv: 1, d: ['2026-11-01'], seen: 1, last: ''}}, boss: {'0': true}, log: {'2026-11-01': {ups: ['3+4'], n: 3}}});
  const B = Object.assign(C.blank(), {cards: {'3+4': {lv: 2, d: ['2026-11-01', '2026-11-02'], seen: 3, last: ''}}, boss: {'L2:0': true}, log: {'2026-11-01': {ups: ['5-1'], n: 5}}});
  const M = C.mergeProgress(A, B);
  assert.equal(M.cards['3+4'].lv, 2);
  assert.deepEqual(Object.keys(M.boss).sort(), ['0', 'L2:0']);
  assert.deepEqual(M.log['2026-11-01'].ups.sort(), ['3+4', '5-1']);
  assert.equal(M.log['2026-11-01'].n, 5);
  assert.deepEqual(C.mergeProgress(M, B), M);
});
