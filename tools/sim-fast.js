// 秒答时间校准 · 门 2 最大风险验证 + 门 7 改前改后对比（说明书-秒答时间校准）
// 用真实排课（E.session）+ 真实秒答线（K.fastMs / K.boltMs）+ 真实记录（E.noteThink），孩子按「想的时间」模型作答。
// 用法：node tools/sim-fast.js [天数=20] [种子数=8] [情形=ben]
//   情形 ben：按 Ben 的反馈——简单类（口算卡、短题、点选）空空实际比估计快很多、读题也比估计快，难类（读题题、三四年级算式、笔算）想的时间比估计慢
//   情形 even：估计值本来就准（检查个人化不会把准的线改坏）
// 改前 = 一律用估计值（S.ftime 不传给秒答线）；改后 = 技能攒够样本后按空空自己的速度定线、闪电按自己的第 25 百分位
'use strict';
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), G = require('../v2/gems.js');
const DAYS = +(process.argv[2] || 20), SEEDS = +(process.argv[3] || 8), CASE = process.argv[4] || 'ben';
const day0 = '2026-11-02', D = n => C.addDays(day0, n);
const mkRnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const gauss = rnd => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// 想的时间 ÷ 估计想的时间：刚学 s，练熟 f，按这个技能答过的题数指数靠近（推论，等第 1 步的真实数据回填）
const TRUTH = {
  ben:  {card: [0.9, 0.35], short: [0.9, 0.4], pick: [0.9, 0.45], line: [0.9, 0.6], word: [1.4, 0.85], multi: [1.3, 0.8], column: [1.5, 0.9]},
  even: {card: [1.1, 0.6], short: [1.1, 0.6], pick: [1.1, 0.6], line: [1.1, 0.6], word: [1.1, 0.6], multi: [1.1, 0.6], column: [1.1, 0.6]},
}[CASE];
const SIGMA = 0.35, SPEED = 900, READ = CASE === 'even' ? 1 : 0.6;   // 读题：估计每字 0.4 秒；情形 ben 假设空空实际读得快（0.6 倍，推论）   // 想的时间对数正态波动；写一个数字 0.9 秒
const EASY = ['card', 'short', 'pick', 'line'], HARD = ['word', 'multi', 'column'];
const kids = [['强', 0.8, 0.9], ['一般', 1, 0.82], ['弱', 1.25, 0.72]];   // 名字、时间倍数、正确率
const BACKUP = process.env.BACKUP;   // 进度备份（家长区导出的 json）：从空空的真实进度起步，级别按存档自己的设置
const BANDS = BACKUP ? [null] : [[2], [5], [9], [12], [14]];   // 新孩子：分级别跑，七类都练得到

function child(mul, acc, rnd) {
  const n = {};
  return inst => {
    const sid = K.ITEM[inst.id].skill, k = n[sid] = (n[sid] || 0) + 1, [s, f] = TRUTH[K.fastClass(inst.id)];
    const o = {speed: SPEED}, th = K.thinkMs(inst), rd = K.readMs(inst, o), wr = K.writeMs(inst, o);
    const ratio = (f + (s - f) * Math.exp(-k / 15)) * mul * Math.exp(SIGMA * gauss(rnd) - SIGMA * SIGMA / 2);
    return {ok: rnd() < acc, ms: wr * (0.9 + 0.2 * rnd()) + rd * READ * mul * (0.85 + 0.3 * rnd()) + th * ratio, k};
  };
}

function run(after, mul, acc, seed, band) {
  const S = BACKUP ? JSON.parse(JSON.parse(require('node:fs').readFileSync(BACKUP, 'utf8'))['speedmap.v2']) : C.blank();   // 同 sim-gems：localStorage 整份导出
  if (!BACKUP) { S.placedAt = 1; S.settings = Object.assign(S.settings || {}, {levels: band}); }
  const rnd = mkRnd(seed), kid = child(mul, acc, rnd), r2 = mkRnd(seed + 1);
  C._setRnd((lo, hi) => lo + Math.floor(r2() * (hi - lo + 1)));
  const by = {}, add = (c, key) => { by[c] = by[c] || {ok: 0, fast: 0, bolt: 0, early: 0, earlyFast: 0, late: 0, lateFast: 0}; by[c][key]++; };
  let bolts = 0, capDays = 0, shards = 0;
  for (let t = 0; t < DAYS; t++) {
    const day = D(t), s = E.session(S, day, {rnd}); let dayBolt = 0;
    for (let x = s.next(), g = 0; x && g < 400; x = s.next(), g++) {
      if (x.kind !== 'q') continue;
      const inst = x.inst, a = kid(inst), o = {speed: SPEED, ft: after ? S.ftime : null};
      const fast = a.ok && a.ms <= K.fastMs(inst, o), bolt = fast && a.ms <= K.boltMs(inst, o, G.BOLT) && dayBolt < G.BOLT_DAY;
      if (a.ok) {
        const c = K.fastClass(inst.id); add(c, 'ok'); if (fast) add(c, 'fast'); if (bolt) add(c, 'bolt');
        if (a.k <= 15) { add(c, 'early'); if (fast) add(c, 'earlyFast'); } else if (a.k > 30) { add(c, 'late'); if (fast) add(c, 'lateFast'); }
      }
      if (bolt) { dayBolt++; bolts++; }
      if (a.ok && !x.retry) shards += fast ? (bolt ? 3 : 2) : 1;   // 粗算：慢 1 小、秒答再 + 1、闪电再 + 1 中（只比改前改后，不算宝石）
      s.answer({ok: a.ok, fast, secs: Math.round(a.ms / 100) / 10, think: a.ok ? K.thinkRatio(inst, a.ms, {speed: SPEED}) : null});
    }
    if (dayBolt >= G.BOLT_DAY) capDays++;
  }
  const lit = Object.keys(K.ITEM).filter(id => E.lv(S, id) > 0).length;
  return {by, bolts: bolts / DAYS, capDays, shards: shards / DAYS, lit};
}

const pct = (a, b) => b ? Math.round(100 * a / b) : null;
const med = xs => { const v = xs.filter(x => x !== null).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; };
const worst = (xs, up) => { const v = xs.filter(x => x !== null).sort((a, b) => a - b); return v.length ? (up ? v[0] : v[v.length - 1]) : null; };
const show = (xs, up) => { const m = med(xs); return m === null ? '—' : `${m}%（最差 ${worst(xs, up)}%）`; };

// ---------- 一、定点对比：同一个孩子身上，「已熟」和「只是会」的技能各量一遍（直接回答 Ben 的两句话） ----------
// 每类挑 4 个技能：3 个陪练技能已熟（简单类倍数 0.35），1 个被测技能按情形给倍数；被测技能先攒 10 条，再答 400 题，样本随答随滚动
// 倍数 = (用时 − 写字) ÷ 估计的「读题 + 想」，每题按对数正态波动 SIGMA
function spot() {
  const rnd = mkRnd(4242), cases = [
    ['简单题 · 已熟（不用想）', EASY, 0.35], ['简单题 · 只是会（每次在算）', EASY, 0.8],
    ['难题 · 已熟，但比估计慢', HARD, 1.3], ['难题 · 已熟，比估计快', HARD, 0.6], ['难题 · 还在磨（很慢）', HARD, 2.2]];
  const draw = m => m * Math.exp(SIGMA * gauss(rnd) - SIGMA * SIGMA / 2);
  console.log('\n## 一、定点对比（每类 400 题，答对的里面）');
  console.log('情形 | 类 | 改前秒答率 | 改后秒答率 | 改前闪电率 | 改后闪电率');
  // 中控点名的两类（10 以内口算卡、分与合）单独列：[情形, 类, 倍数, 被测技能]
  const named = [['10 以内口算卡 · 已熟', 'card', 0.35, 'speed:L1:3'], ['10 以内口算卡 · 只是会', 'card', 0.8, 'speed:L1:3'], ['分与合（6–9）· 已熟', 'short', 0.35, 'bond2'], ['分与合（6–9）· 只是会', 'short', 0.8, 'bond2']];
  const all = named.concat([].concat(...cases.map(([label, classes, m]) => classes.map(cls => [label, cls, m, null]))));
  all.forEach(([label, cls, m, tid]) => {
    const of = s => s.items.filter(it => K.fastClass(it.id) === cls), sks = K.SKILLS.concat(K.HARD).filter(s => of(s).length);
    if (sks.length < 2) return;
    const T = tid ? K.BY[tid] : sks[sks.length >> 1], ft = {}; sks.filter(s => s !== T).slice(0, 3).forEach(s => { ft[s.id] = Array.from({length: 10}, () => Math.round(draw(0.35) * 100) / 100); });
    ft[T.id] = Array.from({length: 10}, () => Math.round(draw(m) * 100) / 100);
    const n = {fb: 0, fa: 0, bb: 0, ba: 0};
    for (let i = 0; i < 400; i++) {
      const its = of(T), it = its[Math.floor(rnd() * its.length)], inst = K.make(it.id, rnd), o = {speed: SPEED};
      const core = K.thinkMs(inst) + K.readMs(inst, o), r = draw(m), ms = K.writeMs(inst, o) + core * r, oa = {speed: SPEED, ft};
      const fb = ms <= K.fastMs(inst, o), fa = ms <= K.fastMs(inst, oa);
      n.fb += fb; n.fa += fa; n.bb += fb && ms <= K.boltMs(inst, o, G.BOLT); n.ba += fa && ms <= K.boltMs(inst, oa, G.BOLT);
      const t = K.thinkRatio(inst, ms, o); if (t !== null) E.noteThink({ftime: ft}, T.id, t);
    }
    const P = k => Math.round(n[k] / 4) + '%';
    console.log([label, K.FAST_CLASS[cls].name.replace(/（.*/, ''), P('fb'), P('fa'), P('bb'), P('ba')].join(' | '));
  });
}
if (process.env.SPOT !== '0') spot();
if (process.env.SPOT === '1') process.exit(0);

console.log(`\n## 二、真排课模拟（护栏：闪电次数、碎片、点亮进度） · 情形 ${CASE} · 每个级别 ${DAYS} 天 × ${SEEDS} 个种子 · 起点 ${BACKUP ? '备份 ' + BACKUP.split('/').pop() : '新孩子，级别 ' + BANDS.map(b => b[0]).join('/')}`);
const out = {};
kids.forEach(([name, mul, acc]) => {
  const rows = {before: [], after: []};
  ['before', 'after'].forEach(w => { for (let s = 1; s <= SEEDS; s++) BANDS.forEach(b => rows[w].push(run(w === 'after', mul, acc, 1000 + s * 7919, b))); });
  console.log(`\n## ${name}孩子（时间 × ${mul}，正确率 ${acc}）`);
  console.log('类 | 改前秒答率 | 改后秒答率 | 改前刚学（前 15 次）秒答率 | 改后 | 改前练熟（30 次后）秒答率 | 改后 | 改前闪电占答对 | 改后');
  Object.keys(K.FAST_CLASS).forEach(c => {
    const col = (w, a, b) => rows[w].map(r => r.by[c] ? pct(r.by[c][a], r.by[c][b]) : null);
    if (!rows.before.some(r => r.by[c])) return;
    console.log([K.FAST_CLASS[c].name.replace(/（.*/, ''), show(col('before', 'fast', 'ok')), show(col('after', 'fast', 'ok')), show(col('before', 'earlyFast', 'early')), show(col('after', 'earlyFast', 'early')),
      show(col('before', 'lateFast', 'late')), show(col('after', 'lateFast', 'late')), show(col('before', 'bolt', 'ok')), show(col('after', 'bolt', 'ok'))].join(' | '));
  });
  const avg = (w, k) => Math.round(rows[w].reduce((a, r) => a + r[k], 0) / rows[w].length * 10) / 10;
  console.log(`每天闪电：改前 ${avg('before', 'bolts')} → 改后 ${avg('after', 'bolts')} 次；顶到 20 次的天数（每 ${DAYS} 天）：${avg('before', 'capDays')} → ${avg('after', 'capDays')}；每天碎片（粗算）：${avg('before', 'shards')} → ${avg('after', 'shards')}；${DAYS} 天后点亮的题：${avg('before', 'lit')} → ${avg('after', 'lit')}`);
  const tot = (w, k) => rows[w].reduce((a, r) => a + Object.values(r.by).reduce((x, c) => x + c[k], 0), 0);
  ['before', 'after'].forEach(w => console.log(`${w === 'before' ? '改前' : '改后'}合计：答对里秒答 ${(tot(w, 'fast') / tot(w, 'ok')).toFixed(2)}，秒答里闪电 ${(tot(w, 'bolt') / tot(w, 'fast')).toFixed(2)}（喂 sim-gems：FAST、BOLTP）`));
  out[name] = rows;
});
