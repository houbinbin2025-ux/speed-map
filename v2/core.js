// 空空数学岛 · 秒答地图板块 v2 · 纯逻辑（无 DOM）：题库、升级、限时、错题本、配题、存储迁移
// 浏览器里挂到 window.SM，node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./bank.js'));
  else root.SM = factory(root.BANK);
})(typeof self !== 'undefined' ? self : this, function (BANK) {
  'use strict';
  if (!BANK || !BANK.speedCards) throw new Error('题库 bank.js 没有加载（要放在 core.js 前面）');
  // 发牌：每个题型一副牌（题库池的下标），按种子洗好后一张张发，发完换新种子再洗；新一轮第一张不和上一轮最后一张一样
  // 只记 {s 种子, i 发到第几张, n 张数, last 上一张, sw 首张要不要换}，页面把它放进存档（S.decks），重新打开接着发
  let DECKS = {};
  const PERM = new Map();
  function perm(n, s) {
    const k = n + ':' + s; if (PERM.has(k)) return PERM.get(k);
    let x = s | 0; const r = () => { x = x + 0x6D2B79F5 | 0; let t = Math.imul(x ^ x >>> 15, 1 | x); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const p = Array.from({length: n}, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    PERM.set(k, p); return p;
  }
  function deal(key, n, r) {
    let d = DECKS[key];
    if (!d || d.n !== n || !(d.i < n)) {   // 题库改过（张数变了）或这一轮发完了 → 换新种子
      const last = d && d.n === n ? d.last : -1;
      d = DECKS[key] = {s: Math.floor(r() * 2147483647), i: 0, n, last};
      d.sw = n > 1 && perm(n, d.s)[0] === last;
    }
    const p = perm(n, d.s), i = d.sw ? (d.i === 0 ? n - 1 : d.i === n - 1 ? 0 : d.i) : d.i;
    d.i++; return (d.last = p[i]);
  }
  const useDecks = o => { DECKS = o && typeof o === 'object' ? o : {}; return DECKS; };

  // ---------- 日期 ----------
  const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dayOf = (now, shift) => fmt(new Date(now + (shift || 0) * 864e5));
  const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
  const addDays = (day, n) => { const d = new Date(day + 'T00:00'); d.setDate(d.getDate() + n); return fmt(d); };

  // ---------- 级别与题目（与 v1 完全一致，卡片编号不变，旧进度直接沿用） ----------
  let rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const LEVELS = [
    {key:'L1', name:'10 以内', word:'秒答', boss:{key:'dragon', name:'末影龙', n:30}, worlds:[
      {name:'世界 1 · 草地', c:'#5d9b3a'}, {name:'世界 2 · 森林', c:'#3f6e25'}, {name:'世界 3 · 沙漠', c:'#b8921c'},
      {name:'世界 4 · 雪山', c:'#4f8fc0'}, {name:'世界 5 · 矿洞', c:'#7d7d7d'}, {name:'世界 6 · 下界', c:'#a8322d'},
      {name:'世界 7 · 末地', c:'#5b4a9a'}]},
    {key:'L2', name:'20 以内', word:'秒答', boss:{key:'L2:final', name:'凋灵', n:30}, worlds:[
      {name:'十几加减几', c:'#5d9b3a'}, {name:'9 加几', c:'#3f6e25'}, {name:'8 加几', c:'#b8921c'}, {name:'7、6 加几', c:'#4f8fc0'},
      {name:'十几减 9', c:'#7d7d7d'}, {name:'十几减 8', c:'#a8322d'}, {name:'十几减 7、6', c:'#5b4a9a'}, {name:'十几减 5～2', c:'#2f6f73'}]},
    {key:'L3', name:'50 以内', word:'达标', boss:{key:'L3:final', name:'监守者', n:30}, R:50, worlds:[
      {name:'加法题型', c:'#3f6e25'}, {name:'减法题型', c:'#a8322d'}]},
    {key:'L4', name:'100 以内', word:'达标', boss:{key:'L4:final', name:'远古守卫者', n:30}, R:100, worlds:[
      {name:'加法题型', c:'#3f6e25'}, {name:'减法题型', c:'#a8322d'}]},
  ];
  const UNITS = []; // {id, L, w, op, fast, answerType, a,b,ans（卡）| gen,name,short（题型）}
  const card = (L, w, a, op, b, fast) => UNITS.push({id: a + op + b, L, w, a, op, b, ans: op === '+' ? a + b : a - b, fast, answerType: 'int'});
  // L1 / L2 的卡来自题库（bank.js，顺序和编号与 v1 一致）
  BANK.speedCards.forEach(c => card(c.L, c.w, c.a, c.op, c.b, c.fast));
  const TYPES = [
    {k:'add10', op:'+', name:'整十加整十', short:'30+20', fast:3000, ok:(a,b)=>a%10===0&&b%10===0&&a>=10&&b>=10},
    {k:'add1n', op:'+', name:'两位数加一位数 · 不进位', short:'23+4', fast:3000, ok:(a,b)=>a>=11&&a%10>0&&b<=9&&a%10+b<=9},
    {k:'add1c', op:'+', name:'两位数加一位数 · 进位', short:'28+5', fast:5000, ok:(a,b)=>a>=11&&b<=9&&a%10+b>=10},
    {k:'addT',  op:'+', name:'两位数加整十', short:'23+20', fast:3000, ok:(a,b)=>a>=11&&a%10>0&&b>=10&&b%10===0},
    {k:'add2n', op:'+', name:'两位数加两位数 · 不进位', short:'23+14', fast:3000, ok:(a,b)=>a>=11&&b>=11&&a%10>0&&b%10>0&&a%10+b%10<=9},
    {k:'add2c', op:'+', name:'两位数加两位数 · 进位', short:'27+15', fast:5000, ok:(a,b)=>a>=11&&b>=11&&a%10+b%10>=10},
    {k:'sub10', op:'-', name:'整十减整十', short:'50−20', fast:3000, ok:(a,b)=>a%10===0&&b%10===0&&b>=10&&a>b},
    {k:'sub1n', op:'-', name:'两位数减一位数 · 不退位', short:'27−4', fast:3000, ok:(a,b)=>a>=11&&b<=9&&a%10>=b},
    {k:'sub1c', op:'-', name:'两位数减一位数 · 退位', short:'32−5', fast:5000, ok:(a,b)=>a>=11&&b<=9&&b>a%10},
    {k:'subT',  op:'-', name:'两位数减整十', short:'47−20', fast:3000, ok:(a,b)=>a>=11&&a%10>0&&b>=10&&b%10===0&&b<a},
    {k:'sub2n', op:'-', name:'两位数减两位数 · 不退位', short:'47−23', fast:3000, ok:(a,b)=>b>=11&&b%10>0&&b<a&&a%10>=b%10},
    {k:'sub2c', op:'-', name:'两位数减两位数 · 退位', short:'52−27', fast:5000, ok:(a,b)=>b>=11&&b<a&&b%10>a%10},
  ];
  [2, 3].forEach(L => {
    const R = LEVELS[L].R;
    TYPES.forEach(t => UNITS.push({id: LEVELS[L].key + ':' + t.k, L, w: t.op === '+' ? 0 : 1, op: t.op, name: t.name, short: t.short, fast: t.fast, answerType: 'int',
      // 从题库池里抽一道（池子由 tools/build-bank.js 按 ok 规则挑出，测试会逐题复查）
      gen: () => { const key = LEVELS[L].key + ':' + t.k, p = BANK.speedPools[key].pool, [a, b] = p[deal(key, p.length, () => (rnd(0, 1e6 - 1)) / 1e6)]; return {a, b, ans: t.op === '+' ? a + b : a - b}; }}));
  });
  // Ben 11-05：题里所有数字都不超过 5 的题不再出（1+1、5−4、骰子 3 点、5 以内分合……）。编号和旧进度保留，只是不出、不计
  const isLow = q => { if (q && q.view) return false; const ns =   // 带 view 的是新关卡和挑战题，题库生成时已经把简单题剔除；它们的答案不在字段里，不能这样判
     Object.values(q || {}).filter(v => typeof v === 'number'); return ns.length > 0 && ns.every(v => v <= 5); };
  UNITS.forEach(u => { if (!u.gen && (isLow({a: u.a, b: u.b, ans: u.ans}) || u.a === 0 || u.b === 0 || (u.op === '-' && u.a === u.b))) u.retired = true; });   // 11-06：6 + 0、10 − 0、7 − 7 也算最简单
  const BYID = Object.fromEntries(UNITS.map(u => [u.id, u]));
  const unitsOf = L => UNITS.filter(u => u.L === L && !u.retired);
  const worldUnits = (L, w) => UNITS.filter(u => u.L === L && u.w === w && !u.retired);
  // 出题实例：题型每次生成新数字；带 fixed 的（错题复习）用错题原来的数字
  const inst = p => {
    const u = BYID[p.id] || p;
    const base = Object.assign({}, u, {mkey: p.mkey});
    if (p.fixed) return Object.assign(base, p.fixed);
    return u.gen ? Object.assign(base, u.gen()) : base;
  };
  const show = c => `${c.a} ${c.op === '+' ? '+' : '−'} ${c.b}`;
  const label = u => u.gen ? u.short : `${u.a}${u.op === '+' ? '+' : '−'}${u.b}`;
  const TYPE_NEED = 5;     // 题型：同一天达标 5 次才升一级
  const GAP_DAYS = 3;

  // ---------- 状态 ----------
  const blank = () => ({v: 2, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}, lastBackup: 0, oral: false});
  const cs = (S, id) => (S.cards[id] = S.cards[id] || {lv: 0, intro: false, d: [], seen: 0, last: ''});

  // 升级：达到熟练标准时调用；只升不降，一天最多一级
  function tryUp(S, id, t) {
    const c = cs(S, id);
    if (c.lv === 0) { c.lv = 1; c.d[0] = t; return true; }
    if (c.lv === 1 && c.d[0] !== t) { c.lv = 2; c.d[1] = t; return true; }
    if (c.lv === 2 && dayDiff(c.d[1], t) >= GAP_DAYS) { c.lv = 3; c.d[2] = t; return true; }
    return false;
  }

  // 限时：口答用原标准；手写 = 原标准 + 写一个数字的用时 × 答案位数（没测到按 1 秒）
  const digits = n => String(Math.abs(n)).length;
  const fastLimit = (u, ans, mode, speed) => mode === 'oral' ? u.fast : u.fast + (speed || 1000) * digits(ans);

  // ---------- 错题本：答错的具体算式，按 1/2/4/7/15 天回炉，过 5 关算掌握 ----------
  const INTERVALS = [1, 2, 4, 7, 15];
  const mkeyOf = q => BYID[q.id] && BYID[q.id].gen ? `${q.id}|${q.a}${q.op}${q.b}` : q.id;
  function addMistake(S, q, t) {
    const key = mkeyOf(q), m = S.mistakes[key];
    if (m) { m.passes = 0; m.due = addDays(t, INTERVALS[0]); m.last = t; return key; }
    S.mistakes[key] = {key, uid: q.id, a: q.a, op: q.op, b: q.b, ans: q.ans, L: q.L, passes: 0, due: addDays(t, INTERVALS[0]), added: t, last: t};
    return key;
  }
  // result：fast（对且快）→ 过一关；slow（对但慢 / 靠弹层认出）→ 留原档明天再来；wrong → 回第 1 关
  function reviewMistake(S, key, result, t) {
    const m = S.mistakes[key]; if (!m || m.due === null) return;
    m.last = t;
    if (result === 'fast') { m.passes++; m.due = m.passes >= INTERVALS.length ? null : addDays(t, INTERVALS[m.passes]); }
    else if (result === 'slow') m.due = addDays(t, 1);
    else { m.passes = 0; m.due = addDays(t, INTERVALS[0]); }
  }
  const seriesOk = (series, op) => series === 'mix' || !series || op === (series === 'add' ? '+' : '-');
  const dueMistakes = (S, t, L, series) => Object.values(S.mistakes || {})
    .filter(m => m.due !== null && m.due <= t && m.L === L && seriesOk(series, m.op) && !(BYID[m.uid] && BYID[m.uid].retired))
    .sort((x, y) => x.due.localeCompare(y.due) || x.added.localeCompare(y.added));
  const mistakeGroups = (S, t) => {
    const all = Object.values(S.mistakes || {}).filter(m => !(BYID[m.uid] && BYID[m.uid].retired));
    return {
      due: all.filter(m => m.due !== null && m.due <= t),
      doing: all.filter(m => m.due !== null && m.due > t),
      done: all.filter(m => m.due === null),
    };
  };

  // ---------- 错题记录：错几次、最近 5 次经过、按技能累计、每日新增 / 过关（docs/方案-错题数据字段.md，中控 11-08 批准）----------
  // 只记录，不影响排课（passes / due 只归 addMistake / reviewMistake 管）。B 在作答流程里调用 noteMistake / notePassed
  // m.wrongs 错了几次 · m.hist 最近 5 次 {d, k:'w'写错|'d'不会|'s'对但慢, w 写了什么, s 秒, o 口答} · m.part 旧错题记录不全 · m.pd 过关那天
  // S.mistStat[技能] = {w, d, s, p, last} · S.stats[日].mn 新增 / .mp 过关
  const HIST_MAX = 5, W_MAX = 16, MKIND = {w: 1, d: 1, s: 1}, MSTAT = ['w', 'd', 's', 'p'];
  const posInt = x => Number.isInteger(x) && x > 0;
  const dayStat = (S, d) => { S.stats = S.stats || {}; return (S.stats[d] = S.stats[d] || {sec: 0, n: 0, ups: 0, over: 0, gap: 0}); };
  function histItem(e) {   // 清洗一条经过，坏的返回 null
    if (!e || typeof e !== 'object' || typeof e.d !== 'string' || !MKIND[e.k]) return null;
    const o = {d: e.d, k: e.k, w: e.w === null || e.w === undefined ? null : String(e.w).slice(0, W_MAX)};
    if (typeof e.s === 'number' && Number.isFinite(e.s)) o.s = Math.round(Math.min(120, Math.max(0, e.s)) * 10) / 10;
    if (e.o) o.o = 1;
    return o;
  }
  const histKey = e => [e.d, e.k, e.w, e.s, e.o].join('|');
  function mistStatOf(S, skill, day) {
    if (typeof skill !== 'string' || !skill) return null;
    if (!S.mistStat || typeof S.mistStat !== 'object') S.mistStat = {};
    const t = S.mistStat[skill] = S.mistStat[skill] || {w: 0, d: 0, s: 0, p: 0}; t.last = day; return t;
  }
  // ev = {k, w, s, o, skill, fresh}；fresh：这次是新进错题本（原来没有，或已过关）
  function noteMistake(S, key, ev, day) {
    const m = S.mistakes && S.mistakes[key], e = ev && histItem(Object.assign({}, ev, {d: day})); if (!m || !e) return;
    if (e.k !== 's') { if (!posInt(m.wrongs) && !ev.fresh) m.part = 1; m.wrongs = (posInt(m.wrongs) ? m.wrongs : 0) + 1; }
    m.hist = (Array.isArray(m.hist) ? m.hist : []).concat(e).slice(-HIST_MAX);
    const t = mistStatOf(S, ev.skill, day); if (t) t[e.k]++;
    if (ev.fresh && e.k !== 's') { const st = dayStat(S, day); st.mn = (st.mn || 0) + 1; }
  }
  // 复习过关（due 变成 null）后调用一次；同一天重复调用不重复算
  function notePassed(S, key, day, skill) {
    const m = S.mistakes && S.mistakes[key]; if (!m || m.due !== null || m.out || m.pd === day) return;   // m.out：秒答下架（engine.js），不是复习过关
    m.pd = day;
    if (Array.isArray(m.hist)) m.hist = m.hist.slice(-1);
    const t = mistStatOf(S, skill, day); if (t) t.p++;
    const st = dayStat(S, day); st.mp = (st.mp || 0) + 1;
  }
  // 读档清洗：坏字段只丢这个字段，错题本身和排课不受影响
  function cleanMist(S) {
    for (const k in S.mistakes || {}) {
      const m = S.mistakes[k]; if (!m || typeof m !== 'object') continue;
      if ('wrongs' in m && !posInt(m.wrongs)) delete m.wrongs;
      if ('hist' in m) { const h = (Array.isArray(m.hist) ? m.hist : []).map(histItem).filter(Boolean).slice(-HIST_MAX); if (h.length) m.hist = m.due === null ? h.slice(-1) : h; else delete m.hist; }
      if ('part' in m && m.part !== 1) delete m.part;
      if ('pd' in m && typeof m.pd !== 'string') delete m.pd;
    }
    if ('mistStat' in S) {
      if (!S.mistStat || typeof S.mistStat !== 'object' || Array.isArray(S.mistStat)) delete S.mistStat;
      else for (const id in S.mistStat) {
        const t = S.mistStat[id]; if (!t || typeof t !== 'object' || Array.isArray(t)) { delete S.mistStat[id]; continue; }
        for (const f in t) if (!MSTAT.includes(f) && f !== 'last') delete t[f];
        MSTAT.forEach(f => { if (!(Number.isInteger(t[f]) && t[f] >= 0)) t[f] = 0; });
        if (typeof t.last !== 'string') delete t.last;
      }
    }
    for (const d in S.stats || {}) { const st = S.stats[d]; if (st && typeof st === 'object') ['mn', 'mp'].forEach(f => { if (f in st && !(Number.isInteger(st[f]) && st[f] >= 0)) delete st[f]; }); }
  }
  // 导入合并：错题整条仍以本机为准，只合并新字段（取大、并集去重，同一份导两次不翻倍）
  function mergeMist(M, S, v) {
    const a = S.mistakes || {}, b = v.mistakes || {};
    for (const k in M.mistakes) {
      const x = a[k], y = b[k]; if (!x || !y || typeof x !== 'object' || typeof y !== 'object') continue;
      const m = M.mistakes[k] = Object.assign({}, M.mistakes[k]), cnt = {};   // 以合并后选中的那条为准（整条选哪边归 importMerge：C 同步分支改成取 last 晚的，F 11-08 同意）
      // 同样内容的经过：每种取两边条数多的那边（同一天两次一模一样的「不会」是两条，不是重复）
      const side = arr => (Array.isArray(arr) ? arr : []).map(histItem).filter(Boolean), hx = side(x.hist), hy = side(y.hist);
      hy.forEach(e => { const id = histKey(e); cnt[id] = (cnt[id] || 0) + 1; });
      const h = hx.concat(hy.filter(e => { const id = histKey(e), inX = hx.filter(f => histKey(f) === id).length; if (cnt[id] > inX) { cnt[id]--; return true; } return false; }))
        .sort((p, q) => p.d.localeCompare(q.d));
      const nw = Math.max(posInt(x.wrongs) ? x.wrongs : 0, posInt(y.wrongs) ? y.wrongs : 0, h.filter(e => e.k !== 's').length);
      if (nw) m.wrongs = nw; else delete m.wrongs;
      const keep = m.due === null ? h.slice(-1) : h.slice(-HIST_MAX); if (keep.length) m.hist = keep; else delete m.hist;
      if (x.part || y.part) m.part = 1;
    }
    const sa = S.mistStat, sb = v.mistStat;
    if ((sa && typeof sa === 'object') || (sb && typeof sb === 'object')) {
      const out = {};
      [sa, sb].forEach(src => { if (!src || typeof src !== 'object') return; for (const id in src) { const t = src[id]; if (id === '__proto__' || !t || typeof t !== 'object') continue;
        const o = out[id] = out[id] || {w: 0, d: 0, s: 0, p: 0}; MSTAT.forEach(f => { if (Number.isInteger(t[f]) && t[f] > o[f]) o[f] = t[f]; });
        if (typeof t.last === 'string' && (!o.last || t.last > o.last)) o.last = t.last; } });
      M.mistStat = out;
    }
    for (const d in v.stats || {}) {   // 每日新增 / 过关按天取大（没有习惯记录的日子也合并）
      const vs = v.stats[d]; if (d === '__proto__' || !vs || typeof vs !== 'object') continue;
      ['mn', 'mp'].forEach(f => { if (Number.isInteger(vs[f]) && vs[f] > 0) { const st = dayStat(M, d); if (!(st[f] >= vs[f])) st[f] = vs[f]; } });
    }
  }

  // ---------- 出题（v1 规则 + 错题合并） ----------
  const shuffle = (a, r) => { r = r || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const DECK = 20, LEARN_MAX = 4, PROBE_MIN = 6, HARD_MAX = 8, ERR_FIRST = 4;
  const stOf = (S, id) => S.cards[id] || {lv: 0, seen: 0, d: [], last: ''};
  // 今天答对就能升级的卡
  const isDue = (s, t) => (s.lv === 1 && s.d[0] !== t) || (s.lv === 2 && dayDiff(s.d[1], t) >= GAP_DAYS);
  // 返回一批题：[{id, mkey?, fixed?, hard?}]；难题（到期错题 + 练习中）每批合计 ≤8 题次
  function buildDaily(S, CARDS, t, opts) {
    opts = opts || {};
    const r = opts.rnd || Math.random, st = c => stOf(S, c.id);
    const ids = new Set(CARDS.map(c => c.id));
    // 练过但还没达标的：最久没练的优先，每轮最多 4 个，每个出 2 次
    const backlog = CARDS.filter(c => st(c).lv === 0 && st(c).seen > 0)
      .sort((x, y) => (st(x).last || '').localeCompare(st(y).last || ''));
    const learning = backlog.slice(0, LEARN_MAX), learnIds = new Set(learning.map(c => c.id));
    // 到期错题：练习中的同一单位只挂一道在它第 1 次出现上，其余单独出
    const L = opts.L !== undefined ? opts.L : (CARDS[0] ? CARDS[0].L : 0);
    const attached = {}, free = [];
    dueMistakes(S, t, L, opts.series).filter(m => ids.has(m.uid)).forEach(m => {
      if (learnIds.has(m.uid) && !attached[m.uid]) attached[m.uid] = m;
      else if (!learnIds.has(m.uid) || BYID[m.uid].gen) free.push(m);
    });
    const errPick = m => ({id: m.uid, mkey: m.key, fixed: {a: m.a, b: m.b, ans: m.ans}, hard: true});
    const hard = free.splice(0, ERR_FIRST).map(errPick);
    let room = HARD_MAX - hard.length;
    learning.forEach(c => {
      const n = Math.min(2, room);
      for (let k = 0; k < n; k++) hard.push(Object.assign({id: c.id, hard: true}, k === 0 && attached[c.id] ? errPick(attached[c.id]) : {}));
      room -= n;
    });
    hard.push(...free.splice(0, Math.max(0, room)).map(errPick));
    // 非难题：同 v1（新题少量 → 今天能升级的 → 会的 → 更多新题）；已作为错题出的卡不再重复出
    const taken = new Set(hard.filter(p => !BYID[p.id].gen).map(p => p.id));
    const easyPool = f => CARDS.filter(c => !learnIds.has(c.id) && !taken.has(c.id) && f(c));
    const due = shuffle(easyPool(c => isDue(st(c), t)), r);
    const probeCap = backlog.length < 3 ? DECK : 0;
    const unseen = [];
    for (let w = 0; unseen.length < DECK && w < 10; w++) unseen.push(...shuffle(easyPool(c => c.w === w && st(c).seen === 0), r));
    const known = shuffle(easyPool(c => st(c).lv >= 1 && !isDue(st(c), t)), r);
    const pick = hard.slice(), room2 = () => DECK - pick.length;
    const plain = c => ({id: c.id});
    pick.push(...unseen.splice(0, Math.min(PROBE_MIN, probeCap, room2())).map(plain));
    pick.push(...due.splice(0, room2()).map(plain));
    pick.push(...known.splice(0, room2()).map(plain));
    pick.push(...unseen.splice(0, Math.min(probeCap, room2())).map(plain));
    // 题型级别：可选的题型少，用非难题补满（每次数字都不一样）；没有非难题就让这批短一点
    const base = pick.filter(p => !p.hard);
    if (CARDS.some(c => c.gen) && base.length) while (pick.length < DECK) pick.push({id: base[pick.length % base.length].id});
    // 排序：开头 3 题、结尾 3 题放会的；中间打乱，同一个至少隔 3 题；错题跟在热身题之后
    const isEasy = p => !p.hard && st(p).lv >= 1;
    const easy = shuffle(pick.filter(isEasy), r), rest = pick.filter(p => !isEasy(p));
    let head = [], tail = [];
    if (easy.length >= 6) { head = easy.splice(0, 3); tail = easy.splice(0, 3); }
    const mid = spread(shuffle(rest.concat(easy), r), r);
    // 一题一卡的练习中卡：错题挂在它在牌堆里第 1 次出现的位置
    const seenId = {};
    mid.forEach((p, i) => {
      if (!p.hard || BYID[p.id].gen || !attached[p.id]) return;
      if (!seenId[p.id]) { seenId[p.id] = 1; if (!p.mkey) { mid[i] = Object.assign({}, p, errPick(attached[p.id])); strip(mid, p.id, i); } }
    });
    return head.concat(mid, tail);
  }
  // 把同一卡后面那次出现上的错题标记去掉（只让第 1 次算复习）
  function strip(arr, id, keep) { arr.forEach((p, i) => { if (i !== keep && p.id === id && p.mkey) arr[i] = {id: p.id, hard: true}; }); }
  // 打散：同一个在牌堆里尽量隔 3 个位置（题型太少时放宽）
  function spread(arr, r) {
    const gap = Math.min(3, new Set(arr.map(c => c.id)).size - 1);
    for (let tries = 0; tries < 200 && gap > 0; tries++) {
      let ok = true;
      for (let i = 0; i < arr.length && ok; i++)
        for (let k = 1; k <= gap && i + k < arr.length; k++)
          if (arr[i].id === arr[i + k].id) { ok = false; break; }
      if (ok) return arr;
      shuffle(arr, r);
    }
    return arr;
  }

  // ---------- 存储：只存在这台设备的浏览器里（v3 说明书 6.1–6.3） ----------
  // 秒答进度在 v1 / 预览 / 正式三处按格子取高合并；正式期每次保存把秒答部分原样写回 v1（回滚不丢）
  // 每天第一次读档成功后留一份 …good；主存档读不了 → 原文另存 …broken，有 good 就用 good，另存失败 → 只读，绝不自动覆盖原主存档
  const V1 = 'speedmap.v1', LIVE_KEY = 'speedmap.v2', PREVIEW_KEY = 'speedmap.v2.preview';
  const keysFor = ctx => {
    const prog = ctx.test ? 'speedmap.v2.test' : ctx.preview ? PREVIEW_KEY : LIVE_KEY;
    return {prog, ink: ctx.test ? 'speedmap.ink.test' : 'speedmap.ink', good: prog + '.good', broken: prog + '.broken'};
  };
  const parse = s => { try { return JSON.parse(s || 'null'); } catch (e) { return null; } };
  const valid = o => !!o && typeof o === 'object' && typeof o.cards === 'object' && o.cards !== null;
  // 家长手选的级别：旧 15 级压到前 9 级（docs/说明书-到四年级第一批.md），旧存档换算一次
  const LEVEL_REMAP = [0, 1, 1, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8, 8, 9, 9];
  function migrateLevels(st) {
    if (!st || st.levelsV === 2) return;
    if (Array.isArray(st.levels)) st.levels = [...new Set(st.levels.map(n => LEVEL_REMAP[n]).filter(Boolean))].sort((a, b) => a - b);
    st.levelsV = 2;
  }
  const upgrade = o => { const S = Object.assign(blank(), o, {v: 2}); S.mistakes = S.mistakes || {}; migrateLevels(S.settings); cleanMist(S); return S; };
  const trySet = (store, k, v) => { try { store.setItem(k, v); return true; } catch (e) { return false; } };
  const TRANSIENT = ['readOnly', 'stopped', 'goodReset'];
  const litOf = S => [S.cards, S.skills].reduce((n, o) => n + Object.values(o || {}).filter(c => c && c.lv > 0).length, 0);
  const GOOD_DROP = 10;
  // 上线首启从预览带过来时，不认识的编号丢掉（known：页面传入技能图谱的判断）
  function dropUnknown(S, known) {
    Object.keys(S.cards).forEach(id => { if (!BYID[id]) delete S.cards[id]; });
    if (known && S.skills) Object.keys(S.skills).forEach(id => { if (!known(id)) delete S.skills[id]; });
  }
  // 每天写一次好存档；点亮格子比现有 good 少 GOOD_DROP 个以上不覆盖（家长清空 / 整份替换后重置基准）
  function writeGood(store, k, S, now) {
    const g = parse(store.getItem(k.good));
    if (!S.goodReset && valid(g) && dayOf(g.goodAt || 0) === dayOf(now)) return 'skip';
    if (!S.goodReset && valid(g) && litOf(S) < litOf(g) - GOOD_DROP) return 'kept';
    return trySet(store, k.good, JSON.stringify(Object.assign(clean(S), {goodAt: now}))) ? 'written' : 'fail';
  }
  const clean = S => { const o = Object.assign({}, S); TRANSIENT.forEach(f => delete o[f]); return o; };
  // 返回 {S, notes, restoredAt}；notes：broken 主存档读不了 / restored 用 good 恢复 / readOnly 只读 / previewBroken / goodKept / goodFail / superseded
  function load(store, ctx, now) {
    const k = keysFor(ctx), notes = [];
    let own = null, restoredAt = null, brokenMain = false, readOnly = false;
    const raw = store.getItem(k.prog);
    if (raw !== null) {
      const o = parse(raw);
      if (valid(o)) own = o;
      else {
        brokenMain = true; notes.push('broken');
        if (!trySet(store, k.broken, raw)) { readOnly = true; notes.push('readOnly'); }
        const g = parse(store.getItem(k.good));
        if (valid(g)) { own = g; restoredAt = g.goodAt || g.savedAt || null; notes.push('restored'); }
      }
    }
    let S;
    const v1 = ctx.test ? null : parse(store.getItem(V1)), v1ok = valid(v1) ? v1 : null;
    if (ctx.test) S = upgrade(own || {});
    else if (own || ctx.preview) { S = upgrade(own || {}); if (v1ok) S = mergeProgress(S, v1ok); }
    else {                                                     // 正式版首启（或主存档坏了又没有 good）：从预览和 v1 带过来
      const pr = store.getItem(PREVIEW_KEY), p = pr === null ? null : parse(pr);
      if (pr !== null && !valid(p)) { trySet(store, PREVIEW_KEY + '.broken', pr); notes.push('previewBroken'); }
      if (valid(p)) { S = upgrade(p); dropUnknown(S, ctx.known); if (v1ok) S = mergeProgress(S, v1ok); }
      else S = upgrade(v1ok || {});
      if (v1ok || valid(p)) S.migratedFromV1At = S.migratedFromV1At || now;
    }
    S.cards = mergeCards(S.cards, {});                         // 坏数据兜底：每张卡补齐字段
    if (readOnly) S.readOnly = true;
    if (superseded(store, ctx)) { S.stopped = true; notes.push('superseded'); }
    if (!S.readOnly && !S.stopped) {
      if (!ctx.test && !ctx.preview && !own && !brokenMain && (S.migratedFromV1At === now)) saveState(store, ctx, S, now);
      else if (!brokenMain) { const w = writeGood(store, k, S, now); if (w === 'kept') notes.push('goodKept'); if (w === 'fail') notes.push('goodFail'); }
    }
    return {S, notes, restoredAt};
  }
  const loadState = (store, ctx, now) => load(store, ctx, now).S;
  // 返回是否存进去了（只读 / 已停写 / 主键写入报错 → false）；备份键写失败不算存不了
  function saveState(store, ctx, S, now) {
    if (S.readOnly || S.stopped) return false;
    S.savedAt = now;
    if (!trySet(store, keysFor(ctx).prog, JSON.stringify(clean(S)))) return false;
    if (!ctx.test && !ctx.preview) {                           // 正式期：秒答部分按 v1 的格式原样写回
      const v1 = parse(store.getItem(V1));
      trySet(store, V1, JSON.stringify(Object.assign({}, valid(v1) ? v1 : {}, {v: 1, savedAt: now, cards: S.cards, boss: S.boss, log: S.log, level: S.level})));
    }
    writeGood(store, keysFor(ctx), S, now);
    delete S.goodReset;
    return true;
  }
  // 正式版已上线：预览页停止写入（12f）
  const superseded = (store, ctx) => !!ctx.preview && !ctx.test && store.getItem(LIVE_KEY) !== null;
  // 回滚用的 v1 启动时做的那一行合并：把 speedmap.v2 的秒答部分按格子取高合进来
  function rollbackV1(store) {
    const v1 = parse(store.getItem(V1)), v2 = parse(store.getItem(LIVE_KEY));
    const base = Object.assign({v: 1, savedAt: 0, cards: {}, boss: {}, log: {}, level: 0}, valid(v1) ? v1 : {});
    return valid(v2) ? Object.assign(mergeProgress(base, v2), {v: 1}) : base;
  }
  // 家长「清空」：只留设置；好存档基准跟着重置
  // 只读（读不了的存档没备份成功）时清空也保持只读：不覆盖那份原主存档
  const resetProgress = S => Object.assign(blank(), {oral: S.oral, testDays: S.testDays, settings: S.settings, goodReset: true}, S.readOnly ? {readOnly: true} : {});
  // 正式期页面一直开着时，旧 v1 页写进去的秒答进步：收到变化 / 回到前台时按格子取高合进来（预览期启动时已合并）
  function mergeV1(store, ctx, S) {
    if (ctx.test || ctx.preview) return false;
    const v1 = parse(store.getItem(V1));
    if (!valid(v1)) return false;
    const M = mergeProgress(S, v1);
    S.cards = M.cards; S.boss = M.boss; S.log = M.log;
    return true;
  }
  const dropBroken = (store, ctx) => { try { store.removeItem(keysFor(ctx).broken); } catch (e) {} };

  // ---------- 秒答进度按格子取高合并（v1 / 预览 / 正式三处）：只升不降，所以取高永远安全 ----------
  const maxStr = (x, y) => ((x || '') > (y || '') ? x : y);
  // 坏数据兜底：缺 d / seen 时补上（缺的升级日期按很久以前算，不挡升级）
  function fixCard(p) {
    if (!Array.isArray(p.d)) p.d = [];
    for (let i = 0; i < Math.min(p.lv || 0, 3); i++) if (!p.d[i]) p.d[i] = '2000-01-01';
    if (typeof p.seen !== 'number') p.seen = 0;
    if (typeof p.lv !== 'number') p.lv = 0;
    return p;
  }
  function mergeCard(x, y) {
    x = x && fixCard(Object.assign({}, x)); y = y && fixCard(Object.assign({}, y));
    if (!x) return y; if (!y) return x;
    const hi = x.lv !== y.lv ? (x.lv > y.lv ? x : y) : ((x.seen || 0) >= (y.seen || 0) ? x : y);
    const lo = hi === x ? y : x;
    const out = Object.assign({}, lo, hi, {d: (hi.d || []).slice(), seen: Math.max(x.seen || 0, y.seen || 0), intro: !!(x.intro || y.intro)});
    if (x.lv === y.lv) out.d = out.d.map((v, i) => maxStr(x.d[i], y.d[i]));   // 同色：升级日期逐位取较晚的（保守，且和参数顺序无关）
    out.last = maxStr(x.last, y.last);
    const lastDay = maxStr(x.lastDay, y.lastDay); if (lastDay) out.lastDay = lastDay; else delete out.lastDay;
    const kx = x.lastDay || '', ky = y.lastDay || '', kSrc = kx >= ky ? x : y;   // 维持复习档位跟着最近练过的那份
    if (kSrc.keep !== undefined) { out.keep = kSrc.keep; out.keepDay = kSrc.keepDay; } else { delete out.keep; delete out.keepDay; }
    if (x.fday || y.fday) {                                                     // 题型"当天合格次数"
      if (x.fday === y.fday) { out.fday = x.fday; out.fn = Math.max(x.fn || 0, y.fn || 0); }
      else { const f = maxStr(x.fday, y.fday) === x.fday ? x : y; out.fday = f.fday; out.fn = f.fn; }
    }
    return out;
  }
  function mergeCards(a, b) {
    const out = {};
    new Set(Object.keys(a || {}).concat(Object.keys(b || {}))).forEach(id => { out[id] = mergeCard((a || {})[id], (b || {})[id]); });
    return Object.fromEntries(Object.keys(out).sort().map(k => [k, out[k]]));
  }
  // 只合并秒答部分（cards / boss / log），其余字段取第一份
  function mergeProgress(A, B) {
    const M = Object.assign({}, A, {cards: mergeCards(A.cards, B.cards), boss: Object.assign({}, B.boss, A.boss)});
    const log = {};
    new Set(Object.keys(A.log || {}).concat(Object.keys(B.log || {}))).forEach(day => {
      const x = (A.log || {})[day] || {ups: [], n: 0}, y = (B.log || {})[day] || {ups: [], n: 0};
      log[day] = {ups: [...new Set((x.ups || []).concat(y.ups || []))].sort(), n: Math.max(x.n || 0, y.n || 0)};
    });
    M.log = Object.fromEntries(Object.keys(log).sort().map(k => [k, log[k]]));
    M.boss = Object.fromEntries(Object.keys(M.boss).sort().map(k => [k, M.boss[k]]));
    return M;
  }

  // 备份文字 = 进度 JSON + 顶层 gems（speedmap.gems 整份，碎片关着时不加；捣蛋鬼第 1 轮第 11 条）。gems 不进进度，导入时拿掉
  const exportText = (S, gems) => JSON.stringify(gems ? Object.assign(clean(S), {gems}) : clean(S));
  const gemsOf = text => { const v = parse(text); return v && v.gems && typeof v.gems === 'object' && !Array.isArray(v.gems) ? v.gems : null; };
  // 「整份替换（会覆盖）」：好存档基准跟着重置
  function importText(text) {
    const v = parse(text);
    if (!valid(v)) throw new Error('不是有效的备份');
    delete v.gems;
    return Object.assign(upgrade(v), {goodReset: true});
  }
  // 家（说明书-v5-家 §6）：得到过的取并集、日期取早，矿石取大；备份里没开的箱子，这边已得到过就不再进箱；摆放按当前设备
  // 带回家的伙伴：两边都有就取并集，本机在前、去重、最多 4 个（图鉴上限）；只有一边有用那一边；都没选过是 null。只增不减（C 模块，中控 11-08：原来空数组会盖掉另一边）
  function mergePets(a, b) {
    if (!Array.isArray(a) && !Array.isArray(b)) return null;
    return [...new Set([].concat(Array.isArray(a) ? a : [], Array.isArray(b) ? b : []))].slice(0, 4);
  }
  function mergeHome(a, b) {
    a = a || {}; b = b || {};
    const ga = a.got || {}, gb = b.got || {}, got = Object.assign({}, gb, ga);
    Object.keys(gb).forEach(k => { if (ga[k] && gb[k] < ga[k]) got[k] = gb[k]; });
    return Object.assign({}, b, a, {got, ore: Math.max(a.ore || 0, b.ore || 0), sec: Math.max(a.sec || 0, b.sec || 0), go: Math.max(a.go || 0, b.go || 0),
      loot: (a.loot || []).concat((b.loot || []).filter(k => !ga[k])), place: Object.assign({}, b.place, a.place), pets: mergePets(a.pets, b.pets)});
  }
  // 「导入进度」：按格子取高合并，旧备份不会把新进度退回去；错题、摸底记录取并集
  function importMerge(S, text) {
    const v = parse(text);
    if (!valid(v)) throw new Error('不是有效的备份');
    delete v.gems;
    const M = upgrade(mergeProgress(S, v));
    if (M.stats && typeof M.stats === 'object') M.stats = Object.fromEntries(Object.entries(M.stats).map(([d, x]) => [d, x && typeof x === 'object' ? Object.assign({}, x, x.h && typeof x.h === 'object' ? {h: Object.assign({}, x.h, x.h.ds && typeof x.h.ds === 'object' ? {ds: Object.assign({}, x.h.ds)} : {})} : {}) : x]));   // 合并不改动本机 S.stats（审查：原来是同一个对象）
    M.skills = mergeCards(S.skills || {}, v.skills || {});
    M.mistakes = Object.assign({}, v.mistakes || {}, S.mistakes || {});
    M.known = Object.assign({}, v.known || {}, S.known || {});
    M.demoSeen = Object.assign({}, v.demoSeen || {}, S.demoSeen || {});
    M.placedAt = S.placedAt || v.placedAt;
    if (S.home || v.home) M.home = mergeHome(S.home, v.home);
    if (S.fast || v.fast) {   // 秒答次数按题取大：恢复备份后已下架的题不回来
      M.fast = Object.assign({}, v.fast || {});
      for (const k in S.fast || {}) if (!M.fast[k] || S.fast[k][0] >= M.fast[k][0]) M.fast[k] = S.fast[k];
    }
    if (S.think || v.think) {   // 思维模块进度按技能取大：只增不减
      M.think = {};
      [S.think || {}, v.think || {}].forEach(t => { for (const id in t) if (Array.isArray(t[id])) { M.think[id] = M.think[id] || []; t[id].forEach((n, i) => { M.think[id][i] = Math.max(M.think[id][i] || 0, Number(n) || 0); }); } });
    }
    if (!M.placedAt) delete M.placedAt;
    if (S.lvTop || v.lvTop) { const hi = (v.lvTop || 0) > (S.lvTop || 0) ? v : S; M.lvTop = hi.lvTop; M.lvTopDay = hi.lvTopDay; }   // 自动开级放行到哪一级：取大，不退回去
    if (S.introStat || v.introStat) { M.introStat = Object.assign({}, v.introStat || {}); for (const c in S.introStat || {}) if (!M.introStat[c] || S.introStat[c][0] >= M.introStat[c][0]) M.introStat[c] = S.introStat[c]; }   // 讲解卡后前 5 题：每个概念取题数多的（同数取本机）
    { const ok = x => Number.isInteger(x) && x >= 0 && x <= 15; if (ok(S.lvMax) && ok(v.lvMax)) M.lvMax = Math.max(S.lvMax, v.lvMax); else delete M.lvMax; }   // 到过的最高级别：两边都有就取大；任一边没有（或坏值）就等下次练习按合并后的进度重新迁移，不会按 0 算掉级（第二批 §6、代码审查 R2）
    // 习惯记录按天取大，最近失误合并去重（其他每日统计不合并，和原来一样）
    for (const d in v.stats || {}) {
      const vh = v.stats[d] && v.stats[d].h; if (d === '__proto__' || !vh) continue;
      M.stats = M.stats || {}; const day = M.stats[d] = M.stats[d] || {sec: 0, n: 0, ups: 0, over: 0, gap: 0}, h = day.h = day.h || {};
      for (const k in vh) {
        if (k === 'ds') { const ds = h.ds = h.ds || {}; for (const d in vh.ds) if (!ds[d] || ds[d][0] < vh.ds[d][0]) ds[d] = vh.ds[d]; }
        else if (!(h[k] >= vh[k])) h[k] = vh[k];
      }
    }
    mergeMist(M, S, v); cleanMist(M);   // 错题记录的新字段（docs/方案-错题数据字段.md §4）；只在备份里有的错题也洗一遍
    if (S.slips || v.slips) { const seen = new Set(); M.slips = [].concat(S.slips || [], v.slips || []).filter(m => { const k = JSON.stringify(m); if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => String(a.d).localeCompare(String(b.d))).slice(-30); }
    return M;
  }

  return {
    upgrade, LEVEL_REMAP, isLow, LEVELS, UNITS, BYID, TYPES, TYPE_NEED, GAP_DAYS, unitsOf, deal, worldUnits, inst, show, label,
    blank, cs, tryUp, fastLimit, digits, dayOf, dayDiff, addDays,
    INTERVALS, mkeyOf, addMistake, reviewMistake, dueMistakes, mistakeGroups, seriesOk,
    noteMistake, notePassed, cleanMist, HIST_MAX,
    keysFor, load, loadState, saveState, superseded, mergeV1, rollbackV1, resetProgress, dropBroken, litOf, mergePets, exportText, gemsOf, importText, importMerge, mergeCards, mergeProgress, fixCard,
    buildDaily, isDue, shuffle, stOf, DECK,
    _setRnd: f => { rnd = f; },
    _resetDecks: () => { DECKS = {}; }, useDecks,
  };
});
