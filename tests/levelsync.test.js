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
    const playable = ALL.filter(s => s.items.some(it => E.itemOn(S, it.id)));
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
