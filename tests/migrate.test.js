// 说明书 6.5 迁移测试：三处按格子取高合并、上线首启、写回 v1、回滚不丢、导入取高、存档损坏、好存档不被坏数据覆盖、旧预览页停写
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js');

const memStore = (init, opts) => {
  const m = Object.assign({}, init), o = opts || {};
  return {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { if (o.full && o.full(k)) throw new Error('QuotaExceededError'); m[k] = String(v); },
    removeItem: k => { delete m[k]; }, _m: m,
  };
};
const v1With = (cards, extra) => JSON.stringify(Object.assign({v: 1, savedAt: 1, cards, boss: {}, log: {}, level: 0}, extra));
const lit = cards => Object.values(cards).filter(c => c.lv > 0).length;
const colors = S => [1, 2, 3].map(lv => Object.values(S.cards).filter(c => c.lv === lv).length);
const NOW = Date.parse('2026-11-10T10:00:00'), DAY = 864e5;
const LIVE = {known: id => !!K.ITEM[id]}, PRE = {preview: true, known: id => !!K.ITEM[id]};
const Y = d => ({lv: 1, d: [d], seen: 1}), R = d => ({lv: 2, d: ['2026-11-01', d], seen: 3});

test('M1 v2 预览存档（没有 skills）载入 v3：秒答颜色数不变、错题都是秒答、skills 为空、会摸底', () => {
  const pre = {v: 2, cards: {'3+4': R('2026-11-02'), '5+2': Y('2026-11-01')}, boss: {}, log: {}, level: 0, mistakes: {'6+3': {key: '6+3', uid: '6+3', a: 6, op: '+', b: 3, ans: 9, L: 0, passes: 0, due: '2026-11-03', added: '2026-11-02', last: '2026-11-02'}}};
  const st = memStore({'speedmap.v2.preview': JSON.stringify(pre), 'speedmap.v1': v1With({})});
  const S = C.loadState(st, PRE, NOW);
  assert.deepEqual(colors(S), [1, 1, 0]);
  assert.ok(Object.values(S.mistakes).every(m => m.L !== undefined));
  assert.deepEqual(S.skills || {}, {});
  assert.ok(!S.placedAt, '还没摸底');
});

test('M2 预览期：预览里练到淡红的卡重新载入仍是淡红；v1 另一张新进度也在；v1 字节不变', () => {
  const raw = v1With({'3+4': Y('2026-11-01'), '1+1': R('2026-11-05')});
  const st = memStore({'speedmap.v1': raw});
  const S = C.loadState(st, PRE, NOW);
  S.cards['3+4'] = R('2026-11-09');
  C.saveState(st, PRE, S, NOW);
  st.setItem('speedmap.v1', v1With({'3+4': Y('2026-11-01'), '1+1': R('2026-11-05'), '2+2': Y('2026-11-10')}));
  const raw2 = st.getItem('speedmap.v1');
  const T = C.loadState(st, PRE, NOW + 1000);
  assert.equal(T.cards['3+4'].lv, 2);
  assert.equal(T.cards['2+2'].lv, 1);
  C.saveState(st, PRE, T, NOW + 2000);
  assert.equal(st.getItem('speedmap.v1'), raw2, '预览期不写 v1');
});

test('M3 上线首启：预览键正常 / 不存在 / 读不了 → 秒答 = v1 和预览取高；技能分别是带来 / 空 / 空 + broken 有原文', () => {
  const v1 = v1With({'3+4': R('2026-11-05'), '5+2': Y('2026-11-01')});
  const pre = JSON.stringify({v: 2, cards: {'5+2': R('2026-11-06'), '1+1': Y('2026-11-02')}, boss: {}, log: {}, level: 0, mistakes: {},
    skills: {'look:tf:7': {lv: 2, d: ['2026-11-01', '2026-11-03'], seen: 4}, 'zzz:gone': {lv: 3, d: [], seen: 1}}, placedAt: 5, demoSeen: {look1: true}});
  // 正常
  let st = memStore({'speedmap.v1': v1, 'speedmap.v2.preview': pre});
  let S = C.loadState(st, LIVE, NOW);
  assert.equal(S.cards['3+4'].lv, 2); assert.equal(S.cards['5+2'].lv, 2); assert.equal(S.cards['1+1'].lv, 1);
  assert.equal(S.skills['look:tf:7'].lv, 2);
  assert.ok(!S.skills['zzz:gone'], 'M6 不认识的编号丢掉');
  assert.equal(S.placedAt, 5); assert.equal(S.migratedFromV1At, NOW);
  assert.ok(st.getItem('speedmap.v2'), '写入正式键');
  // 不存在
  st = memStore({'speedmap.v1': v1});
  S = C.loadState(st, LIVE, NOW);
  assert.equal(S.cards['3+4'].lv, 2); assert.deepEqual(S.skills || {}, {}); assert.ok(!S.placedAt);
  // 读不了
  st = memStore({'speedmap.v1': v1, 'speedmap.v2.preview': '{坏了'});
  const info = C.load(st, LIVE, NOW);
  assert.equal(info.S.cards['3+4'].lv, 2); assert.deepEqual(info.S.skills || {}, {});
  assert.equal(st.getItem('speedmap.v2.preview.broken'), '{坏了');
  assert.ok(info.notes.includes('previewBroken'));
});

test('M4 上线后：旧 v1 页往 v1 写了新进度 → 下次启动合进来；v3 保存后 v1 的秒答颜色 = v3 的', () => {
  const st = memStore({'speedmap.v1': v1With({'3+4': Y('2026-11-01')})});
  const S = C.loadState(st, LIVE, NOW);
  S.cards['5+2'] = R('2026-11-09');
  C.saveState(st, LIVE, S, NOW);
  const v1 = JSON.parse(st.getItem('speedmap.v1'));
  assert.equal(v1.cards['5+2'].lv, 2, '保存时写回 v1');
  assert.equal(v1.v, 1);
  v1.cards['9+9'] = Y('2026-11-10'); st.setItem('speedmap.v1', JSON.stringify(v1));   // 旧 v1 页练了一张
  const T = C.loadState(st, LIVE, NOW + DAY);
  assert.equal(T.cards['9+9'].lv, 1);
  assert.equal(T.cards['5+2'].lv, 2);
  C.saveState(st, LIVE, T, NOW + DAY);
  assert.deepEqual(colors(JSON.parse(st.getItem('speedmap.v1'))), colors(T));
});

test('M5 回滚演练：旧 v1 页把 v1 整份写旧了，"加了合并的 v1"读回来秒答颜色不少；家长清空后 v1 也是清空的', () => {
  const st = memStore({'speedmap.v1': v1With({'3+4': Y('2026-11-01')})});
  const S = C.loadState(st, LIVE, NOW);
  S.cards['3+4'] = R('2026-11-08'); S.cards['5+2'] = Y('2026-11-08');
  C.saveState(st, LIVE, S, NOW);
  const before = colors(S);
  st.setItem('speedmap.v1', v1With({'3+4': Y('2026-11-01')}));                  // 旧 v1 页整份写旧
  const rolled = C.rollbackV1(st);                                              // 回滚版 v1 启动时做的那一行合并
  assert.deepEqual(colors(rolled), before);
  // 清空
  const T = C.loadState(st, LIVE, NOW);
  const E = C.resetProgress(T);
  C.saveState(st, LIVE, E, NOW);
  assert.deepEqual(JSON.parse(st.getItem('speedmap.v1')).cards, {});
  assert.deepEqual(C.loadState(st, LIVE, NOW + DAY).cards, {}, '清空后不被 v1 顶回来');
});

test('M7 正式版已上线：预览页启动就停止写入（12f）', () => {
  const st = memStore({'speedmap.v1': v1With({}), 'speedmap.v2': JSON.stringify({v: 2, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}})});
  const info = C.load(st, PRE, NOW);
  assert.equal(info.S.stopped, true);
  assert.equal(C.superseded(st, PRE), true);
  assert.equal(C.superseded(st, LIVE), false);
  const before = JSON.stringify(st._m);
  assert.equal(C.saveState(st, PRE, info.S, NOW), false);
  assert.equal(JSON.stringify(st._m), before);
});

test('M8 导出 → 导入：颜色数、错题数一致；用更旧的备份导入不降低已有的高颜色', () => {
  const st = memStore({'speedmap.v1': v1With({'3+4': R('2026-11-05')})});
  const S = C.loadState(st, LIVE, NOW);
  S.skills = {'look:tf:7': {lv: 3, d: ['2026-11-01', '2026-11-02', '2026-11-06'], seen: 9}};
  S.mistakes['6+3'] = {key: '6+3', uid: '6+3', a: 6, op: '+', b: 3, ans: 9, L: 0, passes: 1, due: '2026-11-12', added: '2026-11-01', last: '2026-11-09'};
  const text = C.exportText(S);
  const old = C.exportText(Object.assign({}, S, {cards: {'3+4': Y('2026-11-01')}, skills: {'look:tf:7': Y('2026-11-01')}, mistakes: {}}));
  const back = C.importMerge(C.blank(), text);
  assert.deepEqual(colors(back), colors(S)); assert.equal(Object.keys(back.mistakes).length, 1);
  const kept = C.importMerge(S, old);
  assert.equal(kept.cards['3+4'].lv, 2); assert.equal(kept.skills['look:tf:7'].lv, 3); assert.ok(kept.mistakes['6+3']);
  assert.throws(() => C.importMerge(S, '不是备份'));
});

test('M10 主存档损坏：有 good → 恢复、broken 有原文；没有 good → 走"没有存档"；复制失败 → 主键原样、只读、save 不写', () => {
  const good = JSON.stringify({v: 2, cards: {'3+4': R('2026-11-05')}, boss: {}, log: {}, level: 0, mistakes: {}, goodAt: NOW - DAY});
  // 有 good
  let st = memStore({'speedmap.v2': '{"cards":坏', 'speedmap.v2.good': good, 'speedmap.v1': v1With({})});
  let info = C.load(st, LIVE, NOW);
  assert.equal(info.S.cards['3+4'].lv, 2);
  assert.equal(st.getItem('speedmap.v2.broken'), '{"cards":坏');
  assert.equal(info.restoredAt, NOW - DAY);
  assert.equal(st.getItem('speedmap.v2'), '{"cards":坏', '不自动覆盖原主存档（下次保存才写）');
  // 缺 cards 也算读不了
  st = memStore({'speedmap.v2': '{"v":2}', 'speedmap.v1': v1With({'1+1': Y('2026-11-01')})});
  info = C.load(st, LIVE, NOW);
  assert.equal(info.S.cards['1+1'].lv, 1, '没有 good：按"没有存档"走（从 v1 带秒答）');
  assert.equal(st.getItem('speedmap.v2.broken'), '{"v":2}');
  // 复制失败 → 只读
  st = memStore({'speedmap.v2': '{坏', 'speedmap.v2.good': good, 'speedmap.v1': v1With({})}, {full: k => k.endsWith('.broken')});
  info = C.load(st, LIVE, NOW);
  assert.equal(info.S.readOnly, true);
  assert.equal(info.S.cards['3+4'].lv, 2, '内存里用 good');
  assert.equal(C.saveState(st, LIVE, info.S, NOW), false);
  assert.equal(st.getItem('speedmap.v2'), '{坏');
  // 家长导出并删除 broken 后恢复正常保存
  st = memStore({'speedmap.v2': '{坏', 'speedmap.v2.broken': '旧的坏档', 'speedmap.v1': v1With({})});
  C.dropBroken(st, LIVE);
  assert.equal(st.getItem('speedmap.v2.broken'), null);
});

test('M11 好存档每天写一次；点亮格子数比 good 少 10 个以上就不覆盖；家长清空后基准重置', () => {
  const many = {}; for (let a = 1; a <= 9; a++) for (let b = 1; b <= 2; b++) many[a + '+' + b] = Y('2026-11-01');
  const st = memStore({'speedmap.v1': v1With(many)});
  let info = C.load(st, LIVE, NOW);
  C.saveState(st, LIVE, info.S, NOW);
  assert.equal(lit(JSON.parse(st.getItem('speedmap.v2.good')).cards), 18);
  // 第二天：只剩 5 格（坏数据），good 不被覆盖
  const bad = Object.assign({}, info.S, {cards: {'1+1': Y('2026-11-01')}});
  st.setItem('speedmap.v2', JSON.stringify(bad)); st.setItem('speedmap.v1', v1With({}));
  info = C.load(st, LIVE, NOW + DAY);
  C.saveState(st, LIVE, info.S, NOW + DAY);
  assert.equal(lit(JSON.parse(st.getItem('speedmap.v2.good')).cards), 18);
  assert.ok(info.notes.includes('goodKept'));
  // 家长清空：基准重置，good 跟着变
  const E = C.resetProgress(info.S);
  C.saveState(st, LIVE, E, NOW + 2 * DAY);
  info = C.load(st, LIVE, NOW + 3 * DAY);
  C.saveState(st, LIVE, info.S, NOW + 3 * DAY);
  assert.equal(lit(JSON.parse(st.getItem('speedmap.v2.good')).cards), 0);
});

test('M 存不了进度：主存档写入报错 → saveState 返回 false；备份键写失败不算存不了', () => {
  const st = memStore({'speedmap.v1': v1With({})}, {full: k => k === 'speedmap.v2'});
  const info = C.load(st, LIVE, NOW);
  assert.equal(C.saveState(st, LIVE, info.S, NOW), false);
  const st2 = memStore({'speedmap.v1': v1With({})}, {full: k => k.endsWith('.good')});
  const i2 = C.load(st2, LIVE, NOW);
  assert.equal(C.saveState(st2, LIVE, i2.S, NOW), true);
});

test('R6-1 正式期 v3 页一直开着、旧 v1 页又练了几题：v3 收到 v1 的变化先按格子取高合进来，保存后 v1 的进步还在', () => {
  const st = memStore({'speedmap.v1': v1With({'3+4': Y('2026-11-01')})});
  const S = C.loadState(st, LIVE, NOW);
  const v1 = JSON.parse(st.getItem('speedmap.v1')); v1.cards['9+9'] = R('2026-11-10'); st.setItem('speedmap.v1', JSON.stringify(v1));   // 旧 v1 页练的
  C.mergeV1(st, LIVE, S);
  S.cards['5+2'] = Y('2026-11-10');
  C.saveState(st, LIVE, S, NOW + 1000);
  assert.equal(JSON.parse(st.getItem('speedmap.v1')).cards['9+9'].lv, 2);
  assert.equal(S.cards['9+9'].lv, 2);
  const P = C.loadState(memStore({'speedmap.v1': v1With({'1+1': R('2026-11-05')})}), PRE, NOW);
  assert.equal(C.mergeV1(memStore({'speedmap.v1': v1With({'2+2': Y('2026-11-05')})}), PRE, P), false, '预览期启动时已合并，不在这里合');
});

test('R6-2 只读状态下家长清空：仍是只读，不覆盖那份没备份成功的原主存档', () => {
  const good = JSON.stringify({v: 2, cards: {'3+4': R('2026-11-05')}, boss: {}, log: {}, level: 0, mistakes: {}, goodAt: NOW - DAY});
  const st = memStore({'speedmap.v2': '{坏', 'speedmap.v2.good': good, 'speedmap.v1': v1With({})}, {full: k => k.endsWith('.broken')});
  const info = C.load(st, LIVE, NOW);
  const E = C.resetProgress(info.S);
  assert.equal(E.readOnly, true);
  assert.equal(C.saveState(st, LIVE, E, NOW), false);
  assert.equal(st.getItem('speedmap.v2'), '{坏');
});
