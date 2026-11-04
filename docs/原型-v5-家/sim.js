// 门 2 模拟：用真实排课代码（v2/engine.js）跑，看奖励节奏。用法：node sim.js
const C = require('../../v2/core.js'), K = require('../../v2/skills.js'), E = require('../../v2/engine.js'), H = require('./rewards.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const D = n => C.addDays('2026-11-01', n), DAYS = 180, SEEDS = 8;
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], fmt = n => (n === Infinity ? '—' : n);
for (const acc of [0.95, 0.85, 0.7]) {
  const first = {}, gaps = [], perWeek = [], w1 = [], snap = {};
  for (let seed = 1; seed <= SEEDS; seed++) {
    const S = C.blank(); S.placedAt = 1; S.home = {ore: 0}; const r = seeded(seed * 7919), got = {}; let last = 0, gap = 0;
    for (let d = 0; d < DAYS; d++) {
      const s = E.session(S, D(d), {rnd: seeded(seed * 1000 + d)});
      for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') { const ok = r() < acc; if (ok) S.home.ore++; s.answer({ok, fast: ok && r() < 0.8, secs: ok ? 6 : 10}); }
      const e = H.earned(S); let fresh = 0;
      e.certs.concat(e.items, e.medals).forEach(x => { if (got[x.id] == null) { got[x.id] = d; fresh++; (first[x.id] = first[x.id] || []).push(d + 1); } });
      if (fresh) { gap = Math.max(gap, d - last); last = d; }
      if (d === 6) w1.push(Object.keys(got).length);
      if (d < 90) { const wk = d >> 2; }
      [3, 30, 90, 180].forEach(n => { if (d === n - 1) (snap[n] = snap[n] || []).push(Object.keys(got).length); });
    }
    gaps.push(Math.max(gap, DAYS - 1 - last));
  }
  console.log(`\n=== 正确率 ${acc * 100}%（${SEEDS} 个种子，每天 10 分钟，共 ${H.CERTS.length + H.ITEMS.length + H.MEDALS.length} 件）`);
  console.log('累计件数 中位[最少]：', Object.keys(snap).map(n => `第${n}天 ${med(snap[n])}[${Math.min(...snap[n])}]`).join(' · '));
  console.log('最长空窗（天）中位/最差：', med(gaps), '/', Math.max(...gaps));
  const rows = H.CERTS.concat(H.ITEMS.filter(i => !i.deco)).map(x => ({n: x.title || x.name, d: first[x.id] ? med(first[x.id]) : Infinity, c: (first[x.id] || []).length})).sort((a, b) => a.d - b.d);
  console.log(rows.map(x => `${x.n}:${fmt(x.d)}${x.c < SEEDS && x.c ? '*' : ''}`).join(' | '));
}
