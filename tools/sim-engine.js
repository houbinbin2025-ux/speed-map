// 门 2 · 最大风险验证：用真实排课代码（v2/engine.js）模拟每天一次今日练习
// 用法：node tools/sim-engine.js [天数=120] [种子数=8] [备份文件.json（Ben 从家长区导出的进度，可选）]
'use strict';
const fs = require('node:fs');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js');
const DAYS = +(process.argv[2] || 120), SEEDS = +(process.argv[3] || 8), BACKUP = process.argv[4];
const SEC = {understand: 8, speed: 5};                       // 每题用时（含反馈）；门 5 空空实测后回填

const day0 = '2026-11-02', D = n => C.addDays(day0, n);
const mkRnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

// 起点：有备份用备份；没有就假设"秒答 L1 全深红、L2 一半淡黄"
function start() {
  if (BACKUP) return C.importText(fs.readFileSync(BACKUP, 'utf8'));
  const S = C.blank();
  C.UNITS.forEach((u, i) => {
    if (u.L === 0) S.cards[u.id] = {lv: 3, intro: true, d: [D(-40), D(-35), D(-30)], seen: 9, last: '', lastDay: D(-3)};
    if (u.L === 1 && i % 2) S.cards[u.id] = {lv: 1, intro: true, d: [D(-2)], seen: 3, last: '', lastDay: D(-2)};
  });
  return S;
}

// 孩子：每个技能练得越多越准；隔得越久越容易忘（每天 ×0.98）；计时题另有"够快"的概率
function child(p0, pmax, rnd) {
  const n = {}, last = {};
  return {
    answer(S, inst, day) {
      const sid = K.ITEM[inst.id].skill, k = n[sid] || 0, gap = last[sid] ? C.dayDiff(last[sid], day) : 0;
      const p = Math.min(pmax, p0 + 0.012 * k) * Math.pow(0.98, Math.min(gap, 30));
      const fast = Math.min(0.95, 0.5 + 0.015 * k);
      n[sid] = k + 1; last[sid] = day;
      const ok = rnd() < p;
      return {ok, fast: ok && rnd() < fast, secs: K.BY[sid].speed ? SEC.speed : SEC.understand};
    },
  };
}

function run(p0, pmax, seed) {
  const S = start(), rnd = mkRnd(seed), kid = child(p0, pmax, rnd);
  const pl = E.placement(S, D(0), {rnd});                    // 第一次：摸底
  for (let x = pl.next(); x; x = pl.next()) pl.answer(kid.answer(S, x.inst, D(0)));
  const lastSeen = {}, mins = [];
  let gapMax = 0, overMax = 0, overDays = 0, doneDay = null;
  for (let t = 0; t < DAYS; t++) {
    const day = D(t), s = E.session(S, day, {rnd});
    for (let x = s.next(), g = 0; x && g < 400; x = s.next(), g++) {
      if (x.kind !== 'q') continue;
      lastSeen[K.ITEM[x.inst.id].skill] = t;
      s.answer(kid.answer(S, x.inst, day));
    }
    mins.push(s.elapsed / 60);
    const st = S.stats[day] || {over: 0}; overMax = Math.max(overMax, st.over); if (st.over > 0) overDays++;
    K.understand.forEach(sk => {
      if (lastSeen[sk.id] !== undefined && sk.items.some(it => E.lv(S, it.id) < 3)) gapMax = Math.max(gapMax, t - lastSeen[sk.id]);
    });
    if (doneDay === null && K.understand.every(sk => sk.items.every(it => E.lv(S, it.id) === 3))) doneDay = t + 1;
  }
  const speedRed = K.speed.filter(sk => sk.items.every(it => E.lv(S, it.id) === 3)).length;
  const before = mins.slice(0, doneDay || DAYS);             // 理解技能全部深红之前（之后内容练完了，变短是正常的）
  const sorted = before.slice().sort((a, b) => a - b);
  return {doneDay, medMin: sorted[sorted.length >> 1], short: before.filter(m => m < 9).length, gapMax, overMax, overDays, speedRed};
}

const kids = [['强', 0.85, 0.98], ['一般', 0.7, 0.92], ['弱', 0.55, 0.85]];
const fmt = (xs, k) => {
  const v = xs.map(x => x[k] === null ? Infinity : x[k]).sort((a, b) => a - b);
  const show = n => n === Infinity ? '未达成' : Number.isInteger(n) ? n : n.toFixed(1);
  return `${show(v[v.length >> 1])}（最差 ${show(v[v.length - 1])}）`;
};
console.log(`# 今日练习模拟 · ${DAYS} 天 × ${SEEDS} 个种子 · 起点：${BACKUP ? '备份 ' + BACKUP : '假设（秒答 L1 全深红、L2 一半淡黄）'}`);
console.log('孩子 | 19 个理解技能全部深红（天） | 全部深红之前：每天用时中位数（分） | 其中不满 9 分钟的天数 | 在学技能最长几天没出现 | 练完后剩下的到期错题最多 | 有剩下的天数 | 秒答技能全部深红（共 19 个）');
kids.forEach(([name, p0, pmax]) => {
  const rs = []; for (let s = 1; s <= SEEDS; s++) rs.push(run(p0, pmax, 1000 + s * 7919));
  console.log([name, ...['doneDay', 'medMin', 'short', 'gapMax', 'overMax', 'overDays', 'speedRed'].map(k => fmt(rs, k))].join(' | '));
});
