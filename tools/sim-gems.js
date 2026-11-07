// 宝石比例模拟：引擎和碎片规则都是真代码（v2/engine.js、v2/gems.js），起点是 iPad 真实进度。孩子怎么作答是模型，结果不是空空的真实数据
// 用法：node tools/sim-gems.js <进度备份.json> [天数=10] [种子=4]；环境变量 TUNE='{"midLv":1}' 可试参数
'use strict';
const fs = require('fs');
let seed = 1; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; Math.random = rnd;
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), G = require('../v2/gems.js');
if (process.env.TUNE) Object.assign(G.TUNE, JSON.parse(process.env.TUNE));
const S0 = JSON.parse(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))['speedmap.v2']);
const DAYS = +process.argv[3] || 10, SEEDS = +process.argv[4] || 4;
const input = i => K.BY[K.ITEM[i.id].skill].input;
const t = (a, b) => () => a + rnd() * (b - a), flat = b => () => b;
const guess = x => ({pick: 0.45, line: 0.3, write: 0.1}[input(x.inst)]);
const today = (S, d, r) => r(E.session(S, d, {}), {ticket: 1});
const more = (S, d, r, n) => { for (let i = 0; i < n; i++) r(E.session(S, d, {extra: 300}), {ticket: 1}); };
const ALLG = ['bond', 'place', 'cmp', 'line', 'dock', 'market', 'garden', 'speed:L3', 'speed:L4'];
const free = (S, d, r, gs, n) => { for (let i = 0; i < n; i++) for (const g of gs) r(E.free(S, d, g), {}); };
const KIDS = {
  '正确率70': {p: flat(0.7), s: t(5, 8), plan: today, ch: 0.45, take: 0.6},
  '正确率80': {p: flat(0.8), s: t(5, 8), plan: today, ch: 0.55, take: 0.8},
  '正确率90': {p: flat(0.9), s: t(5, 8), plan: today, ch: 0.7, take: 0.8},
  '正确率95': {p: flat(0.95), s: t(5, 8), plan: today, ch: 0.75, take: 0.8},
  '正确率99': {p: flat(0.99), s: t(4, 7), plan: today, ch: 0.85, take: 0.9},
  '练15分钟': {p: flat(0.9), s: t(5, 8), ch: 0.7, take: 0.8, plan: (S, d, r) => { today(S, d, r); more(S, d, r, 1); }},
  '练20分钟': {p: flat(0.9), s: t(5, 8), ch: 0.7, take: 0.8, plan: (S, d, r) => { today(S, d, r); more(S, d, r, 2); }},
  '练30分钟': {p: flat(0.9), s: t(5, 8), ch: 0.7, take: 0.8, plan: (S, d, r) => { today(S, d, r); more(S, d, r, 2); free(S, d, r, ALLG, 1); }},
  '不理弹窗': {p: flat(0.9), s: t(5, 8), plan: today, ch: 0.7, take: 0},
  '全接弹窗': {p: flat(0.9), s: t(5, 8), plan: today, ch: 0.7, take: 1},
  '绕开今日只刷块': {p: flat(0.9), s: t(5, 8), take: 0.8, plan: (S, d, r) => free(S, d, r, ['bond', 'place', 'cmp', 'line', 'dock', 'market', 'garden'], 2)},
  '刷_乱猜': {p: guess, s: t(2.5, 4), plan: today, ch: 0.2, take: 1},
  '刷_选择题乱猜': {p: guess, s: t(2, 3), plan: (S, d, r) => free(S, d, r, ['cmp'], 15), take: 1},
  '只答会的': {dunno: () => rnd() < 0.5, p: flat(0.98), s: t(4, 7), plan: today, ch: 0.5, take: 0.8},
};
// 锻造：优先凑准 100、尽量多用小的；凑不准就用最少的多余。不够就留着
function bestForge(inv) {
  const types = Object.keys(G.VALUE).filter(k => (inv[k] || 0) > 0).sort((x, y) => G.VALUE[x] - G.VALUE[y]);
  let dp = new Map([['0|0', {s: 0, n: 0, r: {}}]]);   // 同一合计、同一格数只留一个
  for (const k of types) for (let c = 0; c < Math.min(inv[k], 12); c++) {
    const nx = new Map(dp);
    dp.forEach(v => { const ns = v.s + G.VALUE[k]; if (ns > 150 || v.n >= 12 || (v.r[k] || 0) !== c) return; const key = ns + '|' + (v.n + 1); if (!nx.has(key)) nx.set(key, {s: ns, n: v.n + 1, r: Object.assign({}, v.r, {[k]: c + 1})}); });
    dp = nx;
  }
  let best = null;
  dp.forEach(v => { if (v.s >= 100 && (!best || v.s < best.s || (v.s === best.s && v.n > best.n))) best = v; });
  return best && best.r;
}
// 一关挑战：真实出题和真实难度算法；孩子按自己的正确率和速度答。稍难的题正确率打 8 折
function round(st, S, day, kind, retry, kid, top) {
  const tg = G.evTarget(st, kind), qs = G.pickEv(S, st, tg.n * 2 + 6, top, rnd);
  if (qs.length < tg.n) return {t: 0, won: false};
  G.evStart(st, day, kind, retry);
  let t = 0, done = 0; const earned = {};
  for (const inst of qs) {
    let s1 = kid.s(); const hard = K.levelOf(inst) > top || E.lv(S, inst.id) === 0, p = kid.p({inst}) * (hard ? 0.8 : 1), ok = rnd() < p; if (!ok) s1 += 4;
    if (t + s1 > tg.T) { t = tg.T; break; }
    t += s1; G.addSec(st, day, Math.min(30, s1)); G.notePace(st, s1, ok);
    const got = G.answer(st, {day, inst, ok, top, lv: G.levelOfCell(st, S, inst.id), rand: rnd}); if (got) earned[got] = (earned[got] || 0) + 1;
    if (ok) done++;
    if (done >= tg.n) break;
  }
  const r = G.evEnd(st, day, {kind, n: tg.n, done, earned, retry});
  return {t, won: r.won};
}
let qcT = 0, qcW = 0, dbT = 0, dbW = 0;
const fmt = x => Math.round(x * 10) / 10;
const out = {};
for (const name of Object.keys(KIDS)) {
  const kid = KIDS[name]; let eff = 0, gems = 0, qn = 0, crit = 0, ticketsN = 0, lastN = 0; qcT = qcW = dbT = dbW = 0;
  for (let sd = 1; sd <= SEEDS; sd++) {
    seed = sd * 7919;
    const S = JSON.parse(JSON.stringify(S0)), st = G.blank(); G.sync(st, S, E.autoLevel(S));
    for (let d = 0; d < DAYS; d++) {
      const day = C.addDays('2026-11-08', d); let tickets = 0, clock = 0;
      const run = (sess, o) => {
        G.sync(st, S, E.autoLevel(S)); const top = G.top(st, E.autoLevel(S)), R = {}; let cnt = 0;
        for (let x = sess.next(), g = 0; x && g < 700; x = sess.next(), g++) {
          if (x.kind !== 'q') continue; cnt++;
          const du = kid.dunno && kid.dunno(x) && !x.retry, p = x.retry && kid.p !== guess ? Math.max(0.9, kid.p(x)) : kid.p(x), ok = !du && rnd() < p;
          let s1 = kid.s(); if (!ok) s1 += du ? 2 : 4;
          const secs = Math.min(30, s1); clock += s1; const effNow = G.addSec(st, day, secs); eff += secs; qn++; if (!x.retry) G.notePace(st, secs, ok);
          const e = G.eventStep(st, day, R, effNow, clock, rnd);
          if (e.offer && rnd() < (kid.take || 0)) { const k = G.acceptOffer(R, clock); if (k) { let r2 = false; for (;;) { const w = round(st, S, day, k, r2, kid, top); eff += w.t; clock += w.t; if (k === 'qc') { qcT++; if (w.won) qcW++; } else { dbT++; if (w.won) dbW++; } if (w.won || k !== 'dbl' || r2 || rnd() > 0.8) break; r2 = true; } } }
          const got = G.answer(st, {day, inst: x.inst, ok, top, lv: G.levelOfCell(st, S, x.inst.id), dunno: du, retry: x.retry, mistake: !!x.mkey, rand: rnd});
          sess.answer({ok, fast: ok && rnd() < 0.75, secs});
        }
        if (o.ticket && sess.done && cnt >= 10 && G.earnTicket(st, {done: true, n: cnt})) tickets++;
      };
      kid.plan(S, day, run);
      if (kid.ch) while (st.tickets > 0 && G.startChallenge(st)) {
        ticketsN++; const qs = G.pickChallenge(S, G.top(st, E.autoLevel(S)), rnd, st); let w = 0;
        for (const inst of qs) { const secs = Math.min(30, kid.s() * 1.5); G.addSec(st, day, secs); eff += secs; if (G.challengeAnswer(st, {day, inst, ok: rnd() < kid.ch})) w++; }
        G.finishChallenge(st, {won: w, n: qs.length === G.CH_N ? G.CH_N : 0});
      }
      G.settle(st, day);
      for (let i = 0, r; i < 200 && (r = bestForge(st.inv)); i++) if (!G.forge(st, r, day).ok) break;
      crit += st.days[day].crit || 0; gems += st.days[day].forged;
    }
  }
  const D = DAYS * SEEDS;
  out[name] = {min: fmt(eff / D / 60), q: Math.round(qn / D), gem: fmt(gems / D), ratio: gems ? fmt(eff / 60 / gems) : null, crit: fmt(crit / D), dbl: `${fmt(dbT / D)}次/${dbT ? Math.round(dbW / dbT * 100) : '-'}%`, qc: `${fmt(qcT / D)}次/${qcT ? Math.round(qcW / qcT * 100) : '-'}%`};
}
console.log('练法\t有效分钟\t题\t宝石\t比例\t暴击\t双倍挑战(完成率)\t限时挑战(完成率)');
for (const n in out) { const r = out[n]; console.log([n, r.min, r.q, r.gem, r.ratio + ':1', r.crit, r.dbl, r.qc].join('\t')); }
