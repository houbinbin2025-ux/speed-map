// 定级审计：每一级实际出哪些技能 / 题型、各多少道，和 K.LEVELS 的说明对照（中控 11-08 派单，Ben：「新内容加入时定级没有增补和调整」）
// 用法：node tools/level-audit.js [--md]   输出按级的清单；tests/levels.test.js 用同一套统计查「说明和实际一致」
const K = require('../v2/skills.js'), C = require('../v2/core.js');
const ALL = [...K.SKILLS, ...K.HARD, ...(K.FUN_SEC > 0 ? K.FUN : [])];   // 趣味技能不在 HARD 里（B 的保险），打开时才出、才写进级别说明
// 一个技能每级有几道题：卡 = 1 道；有题池的题型按池子逐题定级；秒答题型按池子大小
function perLevel(s) {
  const out = {};
  for (const it of s.items) {
    const add = (lv, n) => { out[lv] = (out[lv] || 0) + n; };
    const p = K.rawPool(it.id);
    if (!K.isType(it.id)) add(K.levelOfQ(it.id, it.q, it.ans), 1);
    else if (s.speed) { const u = C.BYID[it.id]; if (u && u.retired) continue; add(K.levelOfQ(it.id, {}, 0), (p || []).length || 1); }
    else if (p) p.forEach(x => { if (!C.isLow(x.q)) add(K.levelOfQ(it.id, x.q, x.ans), 1); });
    else K.itemLevels(it.id).forEach(lv => add(lv, 1));
  }
  return out;
}
function audit() {
  const lv = K.LEVELS.map(l => ({n: l.n, name: l.name, what: l.what, skills: []}));
  ALL.forEach(s => { const pl = perLevel(s); Object.entries(pl).forEach(([n, c]) => { if (lv[n - 1]) lv[n - 1].skills.push({id: s.id, name: s.name, group: s.group, concept: s.concept, n: c}); }); });
  return lv;
}
module.exports = {audit, perLevel, ALL};
if (require.main === module) {
  const R = require('../v2/render.js');
  for (const l of audit()) {
    console.log(`\n## 第 ${l.n} 级 ${l.name}（说明：${l.what}）`);
    l.skills.forEach(s => console.log(`- ${R.GNAME[s.group] || s.group} · ${s.name}（${s.id}）${s.n} 道`));
  }
}
