// 家的奖励节奏：用真实排课代码跑（说明书-v5-家）。改奖励门槛后跑：node tools/sim-home.js
const C = require('../v2/core.js'), E = require('../v2/engine.js'), H = require('../v2/home.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-01', n), DAYS = 180, SEEDS = 8;
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
for (const acc of [0.95, 0.85, 0.7]) {
  const gaps = [], snap = {};
  for (let seed = 1; seed <= SEEDS; seed++) {
    const S = C.blank(); S.placedAt = 1; const r = seeded(seed * 7919); let last = 0, gap = 0;
    for (let d = 0; d < DAYS; d++) {
      const s = E.session(S, D(d), {rnd: seeded(seed * 1000 + d)});
      for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') { const ok = r() < acc; s.answer({ok, fast: ok && r() < 0.8, secs: ok ? 6 : 10}); }
      if (H.sync(S, D(d)).length) { gap = Math.max(gap, d - last); last = d; }
      [3, 7, 30, 90, 180].forEach(n => { if (d === n - 1) (snap[n] = snap[n] || []).push(Object.keys(S.home.got).length); });
    }
    gaps.push(Math.max(gap, DAYS - 1 - last));
  }
  console.log(`正确率 ${acc * 100}%：` + Object.keys(snap).map(n => `第${n}天 ${med(snap[n])}[${Math.min(...snap[n])}]`).join(' · ') + ` · 最长空窗 ${med(gaps)}/${Math.max(...gaps)} 天`);
}
