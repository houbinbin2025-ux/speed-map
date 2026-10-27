// 空空数学岛 · 秒答地图板块 v2 · 纯逻辑（无 DOM）：题库、升级、限时、错题本、配题、存储迁移
// 浏览器里挂到 window.SM，node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

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
  [[2,3,4,5],[6],[7],[8],[9],[10],null].forEach((nums, w) => {
    const add = [], sub = [];
    if (!nums) { [2,4,6,8,10].forEach(n => { add.push([n,0]); sub.push([n,0]); }); [1,3,5,7,9].forEach(n => { add.push([0,n]); sub.push([n,n]); }); }
    else nums.forEach(n => { for (let a = 1; a < n; a++) { add.push([a,n-a]); sub.push([n,a]); } });
    add.forEach(([a,b]) => card(0, w, a, '+', b, 2000)); sub.forEach(([a,b]) => card(0, w, a, '-', b, 2000));
  });
  for (let n = 1; n <= 9; n++) card(1, 0, 10, '+', n, 3000);
  for (let n = 1; n <= 9; n++) card(1, 0, 10 + n, '-', n, 3000);
  const addMax = (w, m) => { for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if (a + b >= 11 && Math.max(a, b) === m) card(1, w, a, '+', b, 3000); };
  addMax(1, 9); addMax(2, 8); addMax(3, 7); addMax(3, 6);
  const subBy = (w, b) => { for (let s = 11; s <= 18; s++) if (s - b <= 9 && s - b >= 1) card(1, w, s, '-', b, 3000); };
  subBy(4, 9); subBy(5, 8); subBy(6, 7); subBy(6, 6); [5,4,3,2].forEach(b => subBy(7, b));
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
      gen: () => {
        for (let i = 0; i < 20000; i++) {
          const a = rnd(1, R), b = rnd(1, R), ans = t.op === '+' ? a + b : a - b;
          if (ans < 0 || ans > R || !t.ok(a, b)) continue;
          if (R === 100 && Math.max(a, b, ans) <= 50) continue; // 100 以内至少有一个数大于 50
          return {a, b, ans};
        }
        return {a: 20, b: 10, ans: t.op === '+' ? 30 : 10};
      }}));
  });
  const BYID = Object.fromEntries(UNITS.map(u => [u.id, u]));
  const unitsOf = L => UNITS.filter(u => u.L === L);
  const worldUnits = (L, w) => UNITS.filter(u => u.L === L && u.w === w);
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
    .filter(m => m.due !== null && m.due <= t && m.L === L && seriesOk(series, m.op))
    .sort((x, y) => x.due.localeCompare(y.due) || x.added.localeCompare(y.added));
  const mistakeGroups = (S, t) => {
    const all = Object.values(S.mistakes || {});
    return {
      due: all.filter(m => m.due !== null && m.due <= t),
      doing: all.filter(m => m.due !== null && m.due > t),
      done: all.filter(m => m.due === null),
    };
  };

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

  // ---------- 存储：只存在这台设备的浏览器里 ----------
  // 预览期（地址在 /v2/ 下）：地图每次从 v1 只读复制，错题本等写进预览键；上线期：从 v1 迁移一次后不再读 v1
  const V1 = 'speedmap.v1';
  const keysFor = ctx => ctx.test ? {prog: 'speedmap.v2.test', ink: 'speedmap.ink.test'}
    : {prog: ctx.preview ? 'speedmap.v2.preview' : 'speedmap.v2', ink: 'speedmap.ink'};
  const parse = s => { try { return JSON.parse(s || 'null'); } catch (e) { return null; } };
  const upgrade = o => { const S = Object.assign(blank(), o, {v: 2}); S.mistakes = S.mistakes || {}; return S; };
  function loadState(store, ctx, now) {
    const k = keysFor(ctx).prog, own = parse(store.getItem(k));
    if (ctx.test) return own && own.cards ? upgrade(own) : blank();
    const v1 = parse(store.getItem(V1));
    if (ctx.preview) {
      const S = upgrade(own && own.cards ? own : {});
      if (v1 && v1.cards) Object.assign(S, {cards: v1.cards, boss: v1.boss || {}, log: v1.log || {}, level: v1.level || 0});
      return S;
    }
    if (own && own.cards) return upgrade(own);
    const S = upgrade(v1 && v1.cards ? v1 : {});
    if (v1 && v1.cards) { S.migratedFromV1At = now; saveState(store, ctx, S, now); }
    return S;
  }
  function saveState(store, ctx, S, now) {
    S.savedAt = now;
    store.setItem(keysFor(ctx).prog, JSON.stringify(S));
  }
  const exportText = S => JSON.stringify(S);
  function importText(text) {
    const v = parse(text);
    if (!v || typeof v.cards !== 'object' || v.cards === null) throw new Error('不是有效的备份');
    return upgrade(v);
  }

  return {
    LEVELS, UNITS, BYID, TYPES, TYPE_NEED, GAP_DAYS, unitsOf, worldUnits, inst, show, label,
    blank, cs, tryUp, fastLimit, digits, dayOf, dayDiff, addDays,
    INTERVALS, mkeyOf, addMistake, reviewMistake, dueMistakes, mistakeGroups, seriesOk,
    keysFor, loadState, saveState, exportText, importText,
    buildDaily, isDue, shuffle, stOf, DECK,
    _setRnd: f => { rnd = f; },
  };
});
