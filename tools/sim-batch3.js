// 第三批 门 2 最大风险验证（docs/说明书-第三批.md §三）：用真实排课引擎 E.session 跑每天 10 分钟，按级统计题数和每题用时，
// 再估算「趣味题穿插」占掉的时间、挤掉的计算题、题池多久被用完。8 个随机种子，报中位数和最差值。
// 用法：node tools/sim-batch3.js [--backup <progress-backup.json>]
//   带备份时：起点用真实存档（iPad 外壳的 progress-backup.json：{"speedmap.v2": "<进度 JSON 文字>", …}，或家长区导出的文字），
//   多跑一行「自动」= 不手选级别、按存档自己开到的级别出题（门 2 要求的真实起点）
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34], DAY0 = '2026-11-10', LVS = [1, 4, 7, 9, 11, 13, 15];
const PACE = 0.8;   // 孩子答对时用时 = 秒答时间的 0.8（刚好算秒答的一侧）
const BK = process.argv.indexOf('--backup'), START = BK > 0 ? (() => { const raw = require('fs').readFileSync(process.argv[BK + 1], 'utf8'); let t = raw; try { const m = JSON.parse(raw); if (m && typeof m['speedmap.v2'] === 'string') t = m['speedmap.v2']; } catch (e) {} return C.importText(t); })() : null;
const med = l => { const a = l.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
function day(n, seed) {
  let S;
  if (START) { S = JSON.parse(JSON.stringify(START)); S.settings = S.settings || {}; if (n !== 'real') S.settings.levels = n === 'auto' ? null : [n]; S.daily = null; }   // real = 保留存档里家长的设置
  else { S = C.blank(); S.placedAt = 1; S.settings = S.settings || {}; S.settings.levels = [n]; S.known = {}; }
  S.demoSeen = Object.assign({}, S.demoSeen, Object.fromEntries(K.SKILLS.concat(K.HARD).map(s => [s.id, true])));
  const r = seeded(seed), s = E.session(S, DAY0, {rnd: r}); let q = 0, sec = 0;
  for (let x = s.next(), g = 0; x && g < 600; x = s.next(), g++) {
    if (x.kind !== 'q') continue;
    const t = K.fastMs(x.inst, {speed: 800}) / 1000 * PACE; q++; sec += t;
    s.answer({ok: true, fast: true, secs: t});
  }
  return {q, sec};
}
// 趣味题：秒答时间按现有同类题定（读题 400 毫秒一字，题干约 25 字 = 10 秒；想 12–25 秒，对照 dock:g15 的 20–30 秒）
const FUN = [{name: '短的（日历、植树）', sec: 22}, {name: '长的（逻辑排序、和差）', sec: 35}];
const out = [];
if (START) { LVS.unshift('real', 'auto'); console.log('家长设置：', JSON.stringify(START.settings && START.settings.levels)); console.log('起点：真实存档，自动开到第', E.autoLevel(START), '级'); }
for (const n of LVS) {
  const runs = SEEDS.map(sd => day(n, sd)), q = runs.map(r => r.q), a = runs.map(r => r.sec / r.q);
  const row = {T: Math.round(Math.min(...runs.map(r => r.sec))), lv: n, qMed: med(q), qMin: Math.min(...q), secPerQ: +med(a).toFixed(1), secPerQMax: +Math.max(...a).toFixed(1)};
  FUN.forEach((f, i) => {
    // 每 6 题 1 道趣味题：5 道普通 + 1 道趣味为一组，10 分钟 = 600 秒
    // 一天用掉的时间 T：用满 10 分钟就是 600 秒；新技能有上限、题出完了提前结束的天按实际秒数算
    const T = Math.min(600, Math.min(...runs.map(r => r.sec))), per = 5 * Math.max(...a) + f.sec, groups = T / per, funShare = groups * f.sec / T, lost = 1 - groups * 5 / Math.min(...q);
    row['fun' + i] = {share: Math.round(funShare * 100) + '%', perDay: +groups.toFixed(1), calcLost: Math.round(lost * 100) + '%'};
  });
  out.push(row);
}
console.log('级 | 每天题数 中位/最少 | 每题秒数 中位/最慢 | 趣味题（短 22 秒）占时 · 每天几道 · 挤掉普通题 | 趣味题（长 35 秒）同上');
out.forEach(r => console.log(`${r.lv}（${r.T} 秒） | ${r.qMed} / ${r.qMin} | ${r.secPerQ} / ${r.secPerQMax} | ${r.fun0.share} · ${r.fun0.perDay} · ${r.fun0.calcLost} | ${r.fun1.share} · ${r.fun1.perDay} · ${r.fun1.calcLost}`));
// 带真实存档时：用存档里每天的真实题数和用时（S.stats）再算一次，不靠「秒答时间 × 0.8」的假设
if (START && START.stats) {
  const st = Object.entries(START.stats).filter(([, v]) => v.n > 0).sort();
  st.forEach(([d, v]) => console.log(`真实 ${d}：${v.n} 题、${Math.round(v.sec)} 秒、每题 ${(v.sec / v.n).toFixed(1)} 秒`));
  const per = st.map(([, v]) => v.sec / v.n), lo = Math.min(...per), hi = Math.max(...per);
  FUN.forEach(f => [lo, hi].forEach(p => console.log(`  按真实每题 ${p.toFixed(1)} 秒、${f.name} 按 1/6 穿插：趣味题占时 ${Math.round(f.sec / (5 * p + f.sec) * 100)}%`)));
}
// 题池会不会被用完：每级约 65 个练习日（规划 §3：980 天 / 15 级），每道趣味题秒答 3 次下架、平均答 4 次
const perLv = out.map(r => r.fun0.perDay), days = 65;
console.log(`\n题池：每级 ${days} 天 × 每天 ${Math.min(...perLv)}–${Math.max(...perLv)} 道趣味题 ÷ 每题约 4 次 = 每级要 ${Math.round(days * Math.min(...perLv) / 4)}–${Math.round(days * Math.max(...perLv) / 4)} 道不重样的题（固定题），或用题型生成`);
module.exports = {day};
