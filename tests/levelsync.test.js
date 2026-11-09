// 分级同步（docs/审查/2026-11-09-分级与模块同步审查.md 第 7 条）：15 级分级和每个学习模块对得上。
// 新加一个技能、一个级别、一个思维地点的档，漏接哪个模块就在这里拦住：
// ① 每个技能都在岛上某块地（或秒答高塔）里；② 每一级能出的题，岛上都看得到（地块卡片 / 秒答地图 / 高塔挑战）；
// ③ 家的奖励把每个技能的格子都算进去；④ 思维地点的建议级别在范围内、不倒退；⑤ 每一级至少有一块地有题、说明词岛上找得到。
// 不在这里管的：摸底（优先级低）、挑战选题（按设计可高 1–2 级）、错题（tests/mistcat.test.js）。
// 界面那一层（卡片放得下、高塔换图、思维地点停档）由 E 的 tools/e2e/e2e-levelsync.py 真点。
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), R = require('../v2/render.js');
const HOME = require('../v2/home.js'), PZ = require('../v2/puzzles.js'), WORLD = require('../v2/world.js');
// 趣味技能（第三批）登记在 K.FUN、永远不进 K.HARD（B 的保险）；开关 FUN_SEC 打开时算进来——`FUN_SEC=90 npm test` 提前查打开后各模块接上没有
const FUN = K.FUN_SEC > 0 ? (K.FUN || []) : [], ALL = K.SKILLS.concat(K.HARD, FUN), LV = K.LEVELS.length;
const LAND = R.GROUPS.map(g => g.id).filter(g => g !== 'speed');   // 岛上的学习地（卡片走 R.skillsOf）
const chosen = L => { const S = C.blank(); S.placedAt = 1; S.settings = {levels: [L], levelsV: 2}; return S; };

test('① 每个技能都归岛上的一块地或秒答高塔（秒答地图 / 挑战），岛上真有这块地', () => {
  const zones = WORLD.ZONES.map(z => z.id);
  ALL.forEach(s => {
    const g = s.speed ? 'speed' : s.group;
    assert.ok(g === 'speedH' || R.GROUPS.some(x => x.id === g), `${s.id} 的组 ${g} 不在 R.GROUPS`);
    assert.ok(zones.includes(g === 'speedH' ? 'speed' : g), `${s.id} 的组 ${g} 在岛上没有地方`);
  });
});

test('② 手选每一级：能出题的每个技能，岛上都看得到——学习地卡片（R.skillsOf）、老秒答技能（秒答地图）或高塔挑战（speedH）', () => {
  for (let L = 1; L <= LV; L++) {
    const S = chosen(L), shown = new Set();
    LAND.concat('speed', 'speedH').forEach(g => R.skillsOf(S, g).forEach(s => shown.add(s.id)));
    const playable = ALL.filter(s => s.items.some(it => E.itemOn(S, it.id)) && (!s.fun || E.funReady(S, s)));   // 趣味技能还要前置已点亮（自由加练的插入通道同一判断）
    playable.forEach(s => assert.ok(shown.has(s.id), `第 ${L} 级 ${s.id}（${s.name}）能出题，岛上看不到`));
    // 卡片里的高级技能都在这一级能出题（不显示没开放的）
    LAND.concat('speedH').forEach(g => R.skillsOf(S, g).filter(s => s.hard || s.fun).forEach(s => assert.ok(playable.includes(s), `第 ${L} 级 ${g} 卡片多了没开放的 ${s.id}`)));
    // 秒答地图（index.html 的 zoneSkills / anyMap 同一判断）：能出题的老秒答技能都在 4 张图之一、那张图在这一级有题（高塔换图有地方可去）；
    // 4 张图都没题时高塔卡片改列挑战，挑战里能出题的技能都在
    const mapOn = m => K.speed.some(s => s.L === m && s.items.some(it => E.itemOn(S, it.id))), anyMap = C.LEVELS.some((_, m) => mapOn(m));
    playable.filter(s => s.speed).forEach(s => assert.ok(s.L >= 0 && s.L < C.LEVELS.length && mapOn(s.L), `第 ${L} 级 ${s.id} 不在有题的秒答地图上`));
    if (!anyMap) K.HARD.filter(s => s.group === 'speedH' && playable.includes(s)).forEach(s => assert.ok(R.skillsOf(S, 'speedH').includes(s), `第 ${L} 级秒答地图没题，高塔挑战缺 ${s.id}`));
  }
});

// 趣味题不进家的奖励：第三批说明书 4.6「不加新奖励」、中控 11-09「趣味题不是核心技能」；要改由 C 定，改了这里跟着改
test('③ 家的奖励：铁锭金锭钻石数全部技能的格子（趣味题除外）；三四年级每个技能都落在某一级的奖状 / 伙伴组里', () => {
  const st = HOME.stats(C.blank()), cells = K.SKILLS.concat(K.HARD).flatMap(s => s.items).length;
  assert.equal(st.total, cells, `家只数了 ${st.total} 格，全部技能有 ${cells} 格`);
  const inGroups = HOME.HARD_LV.reduce((n, g) => n + st.lvAll(g).n, 0), hard = K.HARD.flatMap(s => s.items).length;
  assert.equal(inGroups, hard, `三四年级 ${hard} 格，奖状 / 伙伴组只覆盖 ${inGroups} 格`);
  const ids = HOME.CERTS.map(c => c.id), medals = HOME.MEDALS.map(m => m.id);
  HOME.HARD_LV.forEach(g => ['1', '3'].forEach(k => {   // 每组：全部点亮、全部深红各一张奖状、一只伙伴
    assert.ok(ids.includes(`c:lv:${g}:${k}`), `第 ${g} 级组缺奖状 c:lv:${g}:${k}`);
    assert.ok(medals.includes(`m:lv:${g}:${k}`), `第 ${g} 级组缺伙伴 m:lv:${g}:${k}`);
  }));
  // 每个三四年级技能的格子都在某一组伙伴里（伙伴按格子判解锁）
  const inMedal = new Set(HOME.MEDALS.filter(m => /^m:lv:\d+:1$/.test(m.id)).flatMap(m => m.skill.items.map(it => it.id)));
  K.HARD.forEach(s => s.items.forEach(it => assert.ok(inMedal.has(it.id), `${s.id} 的格子 ${it.id} 不在任何一组伙伴里`)));
});

test('④ 思维地点：建议级别在 1–15、后一档不比前一档低（地点和档数一一对应由 tests/levels.test.js 管）', () => {
  PZ.MODULES.forEach(m => {
    const lv = K.THINK_LEVEL[m.id] || [];
    lv.forEach((x, i) => { assert.ok(Number.isInteger(x) && x >= 1 && x <= LV, `${m.id} 第 ${i + 1} 档级别 ${x}`); if (i) assert.ok(x >= lv[i - 1], `${m.id} 第 ${i + 1} 档比前一档低`); });
  });
});

test('⑤ 每一级至少有一块学习地有题；每一级的说明词都能在岛上某块地找到', () => {
  for (let L = 1; L <= LV; L++) {
    const S = chosen(L), lands = LAND.concat('speed', 'speedH').filter(g => R.skillsOf(S, g).some(s => s.items.some(it => E.itemOn(S, it.id))));
    assert.ok(lands.length, `第 ${L} 级岛上没有一块地有题`);
    const topics = new Set(ALL.filter(s => s.items.some(it => E.itemOn(S, it.id))).map(s => K.topicOf(s, L)));
    K.LEVELS[L - 1].topics.forEach(t => assert.ok(topics.has(t), `第 ${L} 级说明里的「${t}」岛上找不到`));
  }
});

test('⑥ 趣味题开关：关着时卡片里一个趣味技能都没有；打开时卡片列的趣味技能 = 这一级开放且前置已点亮的（和自由加练同一个判断），前置都点亮后自由加练真能出', () => {
  for (let L = 1; L <= LV; L++) {
    const S = chosen(L);
    LAND.forEach(g => {
      const fun = R.skillsOf(S, g).filter(s => s.fun);
      if (!(K.FUN_SEC > 0)) { assert.equal(fun.length, 0, `开关关着，第 ${L} 级 ${g} 卡片列了趣味技能`); return; }
      const want = (K.FUN || []).filter(s => s.group === g && s.items.some(it => E.itemOn(S, it.id)) && E.funReady(S, s));
      assert.deepEqual(fun.map(s => s.id).sort(), want.map(s => s.id).sort(), `第 ${L} 级 ${g}`);
    });
  }
  if (!(K.FUN_SEC > 0)) return;
  // 前置全部点亮（摸底判会）后，每块地有趣味技能就列出来，自由加练多跑几轮至少出一道
  for (let L = 1; L <= LV; L++) {
    const S = chosen(L); S.known = Object.fromEntries(ALL.map(s => [s.id, true]));
    LAND.forEach(g => {
      const fun = R.skillsOf(S, g).filter(s => s.fun); if (!fun.length || E.groupEmpty(S, g)) return;   // 这块地这一级只有趣味题的情况另见 ⑦（待办）
      let got = false;
      for (let k = 0; k < 6 && !got; k++) { const sess = E.free(S, C.addDays('2026-11-10', k), g); for (let i = 0; i < 80; i++) { const x = sess.next(); if (!x) break; if (x.kind !== 'q') continue; if (fun.some(s => s.id === K.ITEM[x.inst.id].skill)) { got = true; break; } sess.answer({ok: true, fast: true, secs: 3}); } }
      assert.ok(got, `第 ${L} 级 ${g} 卡片列了趣味技能，自由加练 6 天都没出`);
    });
  }
});

// 开关打开时，「这块地这一级只有趣味题」（第 4 级规律花园只有数塔、第 5 级故事码头只有植树 / 锯木头 / 排顺序）。
// 规则（B 定、中控认可，11-09）：E.groupEmpty 也算趣味题；自由加练这一组这一级没有普通题时，趣味题不用先隔 5 道、可以连着出，90 秒封顶不变
// （封顶算法：这一段已用秒数 + 这道的秒答时间 ≤ 90，所以断言不留余量）。
test('⑦ 开关打开时，只有趣味题的地块也能练：按钮不是「没有题」，自由加练连着出趣味题、不超过 90 秒', () => {
  if (!(K.FUN_SEC > 0)) return;
  let seen = 0;
  for (let L = 1; L <= LV; L++) {
    const S = chosen(L); S.known = Object.fromEntries(ALL.map(s => [s.id, true]));
    LAND.forEach(g => {
      const fun = R.skillsOf(S, g).filter(s => s.fun);
      const normal = R.skillsOf(S, g).filter(s => !s.fun && s.items.some(it => E.itemOn(S, it.id)));
      if (!fun.length || normal.length) return;   // 只看「这一级只有趣味题」的地块（现在是第 4 级规律花园、第 5 级故事码头）
      seen++;
      assert.equal(E.groupEmpty(S, g), false, `第 ${L} 级 ${g} 只有趣味题，按钮不该是「没有题」`);
      const sess = E.free(S, '2026-11-10', g); let n = 0, sec = 0, other = 0;
      for (let i = 0; i < 40; i++) { const x = sess.next(); if (!x) break; if (x.kind !== 'q') continue;
        const f = !!(K.BY[K.ITEM[x.inst.id].skill] || {}).fun, t = K.fastMs(x.inst, {speed: 900}) / 1000;
        if (f) { n++; sec += t; } else other++;
        sess.answer({ok: true, fast: true, secs: t}); }
      assert.ok(n >= 2, `第 ${L} 级 ${g} 自由加练只出了 ${n} 道趣味题（应能连着出）`);
      assert.ok(sec <= K.FUN_SEC, `第 ${L} 级 ${g} 趣味题用了 ${Math.round(sec)} 秒，超过 90 秒封顶`);
      assert.equal(other, 0, `第 ${L} 级 ${g} 没有普通题，却出了 ${other} 道普通题`);
    });
  }
  assert.ok(seen >= 2, '应该至少碰到第 4 级规律花园、第 5 级故事码头两处');
});

test('⑦ 开关关着时，只有趣味题的地块照旧显示没有题（和改动前一样）', () => {
  if (K.FUN_SEC > 0) return;
  [[4, 'garden'], [5, 'dock']].forEach(([L, g]) => {
    const S = chosen(L); S.known = Object.fromEntries(ALL.map(s => [s.id, true]));
    if (R.skillsOf(S, g).some(s => s.items.some(it => E.itemOn(S, it.id)))) return;   // 这一级其实有普通题：不是这条要管的情况
    assert.equal(E.groupEmpty(S, g), true, `第 ${L} 级 ${g}`);
  });
});


// 审查 R1（只有趣味题的地块）：按钮能点就一定出得了题；趣味题都练完了显示「全部通关」，不是「没有题」
test('⑦ 只有趣味题的地块：趣味题型深红但没下架时按钮不能点（全部通关），点得了就一定出题；全部下架时也是通关、不是没有题', () => {
  if (!(K.FUN_SEC > 0)) return;
  const at = (L, g, set) => { const S = chosen(L); S.known = Object.fromEntries(ALL.map(s => [s.id, true])); set(S); return S; };
  const its = (S, g) => R.skillsOf(S, g).filter(s => s.fun).flatMap(s => s.items).filter(it => E.itemOn(S, it.id));
  [[4, 'garden'], [5, 'dock']].forEach(([L, g]) => {
    const red = at(L, g, S => its(S, g).forEach(it => Object.assign(E.prog(S, it.id), {lv: 3, d: ['2026-11-01', '2026-11-03', '2026-11-07'], seen: 9, lastDay: '2026-11-07'})));
    assert.ok(its(red, g).length && its(red, g).every(it => !E.outOf(red, it.id)), `第 ${L} 级 ${g}：深红、没下架`);
    assert.equal(E.groupEmpty(red, g), false, `第 ${L} 级 ${g} 深红：不是「没有题」`);
    assert.equal(E.groupOut(red, g, '2026-11-10'), true, `第 ${L} 级 ${g} 深红：全部通关（按钮不能点）`);
    const out = at(L, g, S => its(S, g).forEach(it => Object.assign(E.prog(S, it.id), {lv: 3, out: 1})));
    assert.equal(E.groupEmpty(out, g), false, `第 ${L} 级 ${g} 全部下架：不是「没有题」`);
    assert.equal(E.groupOut(out, g, '2026-11-10'), true, `第 ${L} 级 ${g} 全部下架：全部通关`);
    // 只深红一部分：按钮能点，点进去一定出题
    const half = at(L, g, S => { const a = its(S, g); Object.assign(E.prog(S, a[0].id), {lv: 3, d: ['2026-11-01', '2026-11-03', '2026-11-07'], seen: 9, lastDay: '2026-11-07'}); });
    if (its(half, g).length > 1) { assert.equal(E.groupOut(half, g, '2026-11-10'), false); const x = E.free(half, '2026-11-10', g).next(); assert.ok(x, `第 ${L} 级 ${g} 按钮能点却出不了题`); }
  });
});
