// 家的奖励节奏：用真实排课代码跑（说明书-v5-家）。改奖励门槛后跑：node tools/sim-home.js [进度备份.json] [天数]
// 不带参数：新孩子从第 1 级起，自动开级，跑 3 种正确率；带备份：从真实进度接着跑（三四年级奖励看这个，C 方案 11-09）
const fs = require('fs');
const C = require('../v2/core.js'), E = require('../v2/engine.js'), H = require('../v2/home.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-09', n), med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
const isLv = id => /^[cm]:lv:/.test(id);
function run(S0, days, acc, seed) {
  const S = JSON.parse(JSON.stringify(S0)), r = seeded(seed * 7919); let last = 0, gap = 0; const lvGot = [], snap = {};
  H.sync(S, D(-1)); const base = new Set(Object.keys(S.home.got));
  for (let d = 0; d < days; d++) {
    const s = E.session(S, D(d), {rnd: seeded(seed * 1000 + d)});
    for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') { const ok = r() < acc; s.answer({ok, fast: ok && r() < 0.8, secs: ok ? 6 : 10}); }
    const news = H.sync(S, D(d));
    if (news.length) { gap = Math.max(gap, d - last); last = d; }
    news.filter(x => isLv(x.id)).forEach(x => lvGot.push(`${x.id}@${d + 1}`));
    [7, 30, 90, 180].forEach(n => { if (d === n - 1) snap[n] = Object.keys(S.home.got).filter(k => !base.has(k)).length; });
  }
  return {gap: Math.max(gap, days - 1 - last), lvGot, snap, top: E.autoLevel(S), chosen: E.chosen(S)};
}
const file = process.argv[2], days = +(process.argv[3] || (file ? 90 : 180));
if (file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')), S0 = JSON.parse(raw['speedmap.v2'] || raw);
  for (const acc of [0.95, 0.85, 0.7]) {
    const rs = [1, 2, 3].map(seed => run(S0, days, acc, seed));
    console.log(`真实进度 · 正确率 ${acc * 100}%：新得奖励 ` + Object.keys(rs[0].snap).map(n => `第${n}天 ${med(rs.map(x => x.snap[n]))}`).join(' · ') + ` · 最长空窗 ${med(rs.map(x => x.gap))} 天 · 级别 ${JSON.stringify(rs[0].chosen || rs[0].top)}`);
    console.log('  三四年级奖状 / 伙伴（种子 1）：' + (rs[0].lvGot.join(' ') || '无'));
  }
} else {
  for (const acc of [0.95, 0.85, 0.7]) {
    const rs = [1, 2, 3, 4, 5, 6, 7, 8].map(seed => { const S = C.blank(); S.placedAt = 1; return run(S, days, acc, seed); });
    console.log(`新孩子 · 正确率 ${acc * 100}%：` + Object.keys(rs[0].snap).map(n => `第${n}天 ${med(rs.map(x => x.snap[n]))}`).join(' · ') + ` · 最长空窗 ${med(rs.map(x => x.gap))}/${Math.max(...rs.map(x => x.gap))} 天 · 到第 ${med(rs.map(x => x.top))} 级`);
    console.log('  三四年级奖状 / 伙伴（种子 1）：' + (rs[0].lvGot.join(' ') || '无'));
  }
}
