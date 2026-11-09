// 家长「错题分析」的统计（docs/说明书-错题分析.md，F 模块）：只读进度，不改任何数据；纯函数，node 可测
// 数据来自 docs/方案-错题数据字段.md 的 wrongs / hist / stats.mn / mp（v130 起记录）；旧错题没有这些字段 → 「记录不全」
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./skills.js'), require('./engine.js'));
  else root.MISTVIEW = factory(root.SM, root.SKILLS, root.ENGINE);
})(typeof self !== 'undefined' ? self : this, function (C, K, E) {
  'use strict';
  const OTHER = '其他', TAGS = {few: '记录不全', better: '在好转', teach: '需要讲解', slow: '速度慢', wrong: '写错较多'};
  const STATE_ORDER = {due: 0, doing: 1, paused: 2, done: 3};
  const ADVICE = {teach: c => `「${c}」：先陪做 1–2 道，讲清思路，再让孩子独立做`, wrong: c => `「${c}」：会做但易错，提醒写完检查一遍`, slow: c => `「${c}」：会做但不够快，正常练习即可，不需要讲`};
  const posInt = x => Number.isInteger(x) && x > 0;
  const histOf = m => (Array.isArray(m.hist) ? m.hist.filter(e => e && typeof e.d === 'string') : []);
  const catOrder = (() => { const o = {}; (K.MIST_GROUPS || []).forEach(([c], i) => { o[c] = i; }); return o; })();
  const sum = (st, days, f) => days.reduce((n, d) => n + (st[d] && Number.isInteger(st[d][f]) ? st[d][f] : 0), 0);
  const has = (st, days, f) => days.some(d => st[d] && Number.isInteger(st[d][f]));

  // ---------- 孩子「错题宝箱」和家长「错题分析」共用的口径（中控 11-09：E 直接调用，不另算）----------
  // 上页的错题：题库里还有、不是全 ≤ 5 的简单题（运行时剔除，同 engine isDue）
  const okMist = m => !!m && typeof m === 'object' && !!K.ITEM[m.uid] && !(m.q && C.isLow(m.q));
  // 组：和 index.html 的 MGROUPS 同一套 id——地点 / 'speedH' 看 m.src；'speed:L1'…'speed:L4' 看秒答错题的级别 m.L
  function inGroup(m, group) {
    if (!group) return true;
    const L = /^speed:L(\d+)$/.exec(group);
    return L ? !m.src && m.L === +L[1] - 1 : m.src === group;
  }
  // 趣味题关掉时（K.FUN_SEC = 0），趣味错题不回炉：算暂停（同 engine.js funOff，审查 R2）
  const funOff = m => !(K.FUN_SEC > 0) && !!(K.BY[K.ITEM[m.uid].skill] || {}).fun;
  const dueSet = (S, day) => { try { return new Set(E.dueMistakes(S, day)); } catch (e) { return null; } };
  // 每道错题的状态：due 今日复习（= E.dueMistakes，孩子今天真的会做到的）/ doing 复习中 / paused 暂停（难度设置或趣味题关掉）/ done 已学会
  function stateOf(S, m, day, due) {
    if (m.due === null) return 'done';
    if (due ? due.has(m) : (m.due <= day && E.mistOn(S, m) && !funOff(m))) return 'due';
    if (!E.mistOn(S, m) || funOff(m) || m.due <= day) return 'paused';
    return 'doing';
  }
  // 孩子错题宝箱三栏：today 今天要复习（按复习先后，不截到每天上限）、later 过几天再来（按日期从近到远）、done 已经学会（最近学会的在前）
  // 暂停的不进三栏（孩子做不到）；group 不传 = 全部
  // done 含秒答下架的（m.out，孩子确实会了）；家长页 build 不列下架题（不是复习学会的），所以两页「已学会」的数可以不同，有意为之
  function shelves(S, day, group) {
    const due = dueSet(S, day), out = {today: [], later: [], done: []};
    const ms = Object.values(S.mistakes || {}).filter(m => okMist(m) && inGroup(m, group));
    if (due) out.today = [...due].filter(m => ms.includes(m));
    ms.forEach(m => { const st = stateOf(S, m, day, due); if (st === 'doing') out.later.push(m); else if (st === 'done') out.done.push(m); else if (st === 'due' && !due) out.today.push(m); });
    out.later.sort((a, b) => String(a.due).localeCompare(String(b.due)));
    out.done.sort((a, b) => String(b.pd || b.last || '').localeCompare(String(a.pd || a.last || '')));
    return out;
  }
  // 按知识点分组（K.mistCat，顺序同 K.MIST_GROUPS，找不到归「其他」放最后）
  function byCat(ms) {
    const g = {}; ms.forEach(m => { const c = K.mistCat(m.uid) || OTHER; (g[c] = g[c] || []).push(m); });
    return Object.keys(g).sort((a, b) => (a in catOrder ? catOrder[a] : 1e9) - (b in catOrder ? catOrder[b] : 1e9) || a.localeCompare(b)).map(name => ({name, items: g[name]}));
  }
  // 写的：最近一次写错或「不会」
  function typedOf(m) {
    const e = histOf(m).filter(x => x.k === 'w' || x.k === 'd').pop();
    if (!e) return null;
    return {k: e.k, w: e.k === 'd' ? null : e.w, s: typeof e.s === 'number' ? e.s : null, o: !!e.o};
  }
  const isPick = m => { const it = K.ITEM[m.uid], s = it && K.BY[it.skill]; return !!s && s.input === 'pick'; };
  // 正确答案的显示文字：和「写的」同一口径（选择题 = 选项文字，同 index.html pickTyped；小数按 q.dp 加小数点）。R = render.js
  function ansOf(m, R) {
    try {
      if (!m.src) return String(m.ans);
      const q = m.q || {};
      if (isPick(m)) {
        if (q.view === 'choice' && Array.isArray(q.opts)) return String(q.opts[m.ans]);
        const v = R.question(K.make(m.uid, null, {q, ans: m.ans})), i = Array.isArray(v.pick) ? v.pick.indexOf(m.ans) : -1;
        if (i >= 0 && v.pickAria) return String(v.pickAria[i]);
        if (i >= 0 && v.pickText) return String(v.pickText[i]).replace(/<[^>]*>/g, '').trim() || String(m.ans);
        return String(m.ans);   // 比大小等纯数字选项：选项就是数本身（同 pickTyped 最后一步）
      }
      return R.ansText(q, m.ans);
    } catch (e) { return '--'; }
  }
  // 典型错法：差 1（只看手写题：选择题两个选项正好差 1 时会误报）；减法算成加法；加法算成减法
  function patternOf(items, from) {
    let n = 0, off1 = 0, flipSub = 0, flipAdd = 0;
    items.forEach(({m}) => {
      const q = m.src ? (m.q || {}) : m, dp = Number.isInteger(q.dp) && q.dp > 0 ? q.dp : 0;
      const ans = Number(m.ans) / 10 ** dp, a = Number(q.a), b = Number(q.b), op = q.op, pick = isPick(m);   // 小数题答案存的是去掉小数点的整数
      histOf(m).filter(e => e.k === 'w' && e.d >= from && e.w !== null && e.w !== '').forEach(e => {
        const w = Number(e.w); if (!isFinite(w)) return; n++;
        if (!pick && isFinite(ans) && Math.round(Math.abs(w - ans) * 1e6) === 1e6) off1++;   // 小数相减有浮点误差
        if (op === '-' && isFinite(a) && isFinite(b) && w === a + b) flipSub++;
        if (op === '+' && isFinite(a) && isFinite(b) && w === Math.abs(a - b)) flipAdd++;
      });
    });
    if (flipSub >= 1 && flipSub * 2 >= n) return '减法算成了加法';
    if (flipAdd >= 1 && flipAdd * 2 >= n) return '加法算成了减法';
    if (off1 >= 2 && off1 * 2 >= n) return '写错多为差 1';
    return null;
  }

  function build(S, day) {
    const st = S.stats || {}, days = n0 => Array.from({length: 7}, (_, i) => C.addDays(day, -(n0 + i)));
    const week = days(0), prev = days(7), from14 = C.addDays(day, -13), from7 = C.addDays(day, -6);
    const cats = {}, due = dueSet(S, day); let paused = 0;
    for (const key in S.mistakes || {}) {
      const m = S.mistakes[key];
      if (!okMist(m) || m.out) continue;
      if (m.due === null && String(m.pd || m.last || '') < from14) continue;
      const state = stateOf(S, m, day, due); if (state === 'paused') paused++;
      const cat = K.mistCat(m.uid) || OTHER, c = cats[cat] = cats[cat] || {name: cat, items: []};
      c.items.push({key, m, state, wrongs: posInt(m.wrongs) ? m.wrongs : null, part: !!m.part || !posInt(m.wrongs), typed: typedOf(m), passes: m.passes || 0});
    }
    const list = Object.values(cats).map(c => {
      const r = {w: 0, d: 0, s: 0}, r7 = {w: 0, d: 0};
      c.items.forEach(({m}) => histOf(m).forEach(e => { if (e.d >= from14 && r[e.k] !== undefined) r[e.k]++; if (e.d >= from7 && r7[e.k] !== undefined) r7[e.k]++; }));
      const total = r.w + r.d + r.s, done = c.items.filter(i => i.state === 'done').length, open = c.items.length - done;
      const tag = !total && !done ? 'few'
        : (!r7.w && !r7.d && (done > 0 || c.items.some(i => i.passes >= 2))) ? 'better'
        : r.d * 2 >= total && r.d > 0 ? 'teach'
        : r.s * 2 >= total && r.s > 0 ? 'slow' : 'wrong';
      c.items.sort((x, y) => STATE_ORDER[x.state] - STATE_ORDER[y.state] || (y.wrongs || 1) - (x.wrongs || 1));
      const wrongs = c.items.reduce((n, i) => n + (i.wrongs || 1), 0), atLeast = c.items.some(i => !i.wrongs);
      return {name: c.name, items: c.items, n: c.items.length, done, open, wrongs, atLeast, reasons: r, tag, tagText: TAGS[tag],
        score: r.w + 2 * r.d + 0.5 * r.s + open, note: patternOf(c.items, from14)};
    });
    const low = t => t === 'better' || t === 'few';
    list.sort((x, y) => (low(x.tag) - low(y.tag)) || (y.score - x.score) || ((x.name in catOrder ? catOrder[x.name] : 1e9) - (y.name in catOrder ? catOrder[y.name] : 1e9)) || x.name.localeCompare(y.name));
    // 四个数
    const kpi = {
      newW: has(st, week.concat(prev), 'mn') ? sum(st, week, 'mn') : null, newP: has(st, week.concat(prev), 'mn') ? sum(st, prev, 'mn') : null,
      due: list.reduce((n, c) => n + c.items.filter(i => i.state === 'due').length, 0),   // 和孩子宝箱的「今天要复习」同一口径（shelves）
      rep: list.reduce((n, c) => n + c.items.filter(i => i.state !== 'done' && i.wrongs >= 2).length, 0),
      passW: has(st, week.concat(prev), 'mp') ? sum(st, week, 'mp') : null, passP: has(st, week.concat(prev), 'mp') ? sum(st, prev, 'mp') : null,
    };
    // 结论
    const top = list.filter(c => !low(c.tag)).slice(0, 2);
    let summary = !list.length ? '近 14 天没有错题'
      : top.length ? `主要卡在${top.map(c => `「${c.name}」（${c.tagText}）`).join('和')}` : '错题都在好转';
    if (list.length && kpi.newW !== null) { const d = kpi.newW - kpi.newP; summary += d < 0 ? `；本周新增错题较上周少 ${-d} 道` : d > 0 ? `；本周新增错题较上周多 ${d} 道` : '；本周新增错题与上周持平'; }
    const advice = list.filter(c => ADVICE[c.tag]).slice(0, 3).map(c => ADVICE[c.tag](c.name));
    return {summary, kpi, cats: list, advice, paused};
  }
  // 家长区格子里的一句概况
  function brief(S, day) { const v = build(S, day); return {due: v.kpi.due, newW: v.kpi.newW, n: v.cats.reduce((n, c) => n + c.open, 0)}; }
  return {build, brief, shelves, byCat, inGroup, stateOf, ansOf, TAGS, OTHER};
});
