// 空空数学岛 · 今日练习引擎（纯逻辑，无 DOM）：格子升级、错题本、每天 10 分钟排课、首次摸底、统计
// 排课对标：知识图谱 + 前置掌握（Math Academy）、首次诊断定位（ALEKS）、跨技能交错、先对后快（WWC 2021）
// 浏览器里挂到 window.ENGINE（依赖 window.SM、window.SKILLS），node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./skills.js'));
  else root.ENGINE = factory(root.SM, root.SKILLS);
})(typeof self !== 'undefined' ? self : this, function (C, K) {
  'use strict';

  const BUDGET = 600, REVIEW_MAX = 300, NEW_SEC = 180, BACKLOG = 10, DEMO_SEC = 5, FRONT = 2, NEW_PER_DAY = 3;
  const REP = {card: 1, type8: 3, day5: 5}, MAXPER = {card: 2, type8: 6, day5: 6};
  const KEEP = [7, 14, 30, 60];          // 深红以后的维持复习间隔（天）
  const PLACE_MAX_N = 40, PLACE_MAX_SEC = 300, PROBE = 3;
  const STATS_DAYS = 400;

  const skillOf = id => K.BY[K.ITEM[id].skill];
  const kindOf = id => skillOf(id).kind;

  // ---------- 格子状态：秒答存在 S.cards（和 v1 / v2 同一个地方），理解技能存在 S.skills ----------
  function prog(S, id) {
    if (skillOf(id).speed) return C.cs(S, id);
    S.skills = S.skills || {};
    return (S.skills[id] = S.skills[id] || {lv: 0, d: [], seen: 0, lastDay: '', win: []});
  }
  const peek = (S, id) => (skillOf(id).speed ? S.cards[id] : (S.skills || {})[id]) || {lv: 0, d: [], seen: 0};
  const lv = (S, id) => peek(S, id).lv;
  const needFast = (S, id) => { const s = skillOf(id); return s.timedFrom !== null && lv(S, id) >= s.timedFrom; };
  const learned = (S, sid) => K.BY[sid].items.every(it => lv(S, it.id) >= 1);
  const ready = (S, sid) => K.BY[sid].pre.every(p => learned(S, p));

  // 升一级：只升不降、一天最多一级、淡红到深红隔 ≥ 3 天、日期往回调不升
  function bump(p, day) {
    const lastUp = p.lv > 0 ? p.d[p.lv - 1] : null;
    if (lastUp && day <= lastUp) return false;
    if (p.lv === 0) { p.lv = 1; p.d[0] = day; return true; }
    if (p.lv === 1) { p.lv = 2; p.d[1] = day; return true; }
    if (p.lv === 2 && C.dayDiff(p.d[1], day) >= C.GAP_DAYS) { p.lv = 3; p.d[2] = day; return true; }
    return false;
  }

  // 记录一次作答。r = {ok, fast, peeked}；返回 {pass, up}
  function record(S, id, r, day) {
    const p = prog(S, id), kind = kindOf(id);
    const pass = !!r.ok && (!needFast(S, id) || !!r.fast);
    p.seen++; p.lastDay = day;
    if (skillOf(id).speed) { p.last = new Date().toISOString(); p.intro = true; }
    let up = false;
    if (r.peeked) return {pass: false, up};
    if (kind === 'card') up = pass && bump(p, day);
    else if (kind === 'day5') {                    // 同 v2：同一天合格 5 次
      if (pass) { if (p.fday !== day) { p.fday = day; p.fn = 0; } p.fn++; if (p.fn >= C.TYPE_NEED) up = bump(p, day); }
    } else {                                       // 最近 8 次（可以跨天）合格 ≥ 7
      if (p.lv > 0 && p.d[p.lv - 1] === day) return {pass, up};   // 升级当天的作答不计入下一级（下一级要另一天证明）
      p.win = (p.win || []).concat(pass ? 1 : 0).slice(-8);
      if (p.win.length === 8 && p.win.reduce((a, b) => a + b, 0) >= 7 && bump(p, day)) { up = true; p.win = []; }
    }
    if (up) { const L = (S.log[day] = S.log[day] || {ups: [], n: 0}); if (!L.ups.includes(id)) L.ups.push(id); }
    return {pass, up};
  }

  // ---------- 错题本：秒答沿用 core（v2 格式），理解技能存题目数据 ----------
  function addMistake(S, inst, day) {
    const s = skillOf(inst.id);
    if (s.speed) return C.addMistake(S, {id: inst.id, a: inst.q.a, op: inst.q.op, b: inst.q.b, ans: inst.ans, L: s.L}, day);
    const key = K.mkey(inst), m = S.mistakes[key];
    if (m) { m.passes = 0; m.due = C.addDays(day, C.INTERVALS[0]); m.last = day; return key; }
    S.mistakes[key] = {key, uid: inst.id, src: s.group, q: inst.q, ans: inst.ans, passes: 0, due: C.addDays(day, C.INTERVALS[0]), added: day, last: day};
    return key;
  }
  const dueMistakes = (S, day) => Object.values(S.mistakes || {}).filter(m => m.due !== null && m.due <= day && K.ITEM[m.uid])
    .sort((a, b) => a.due.localeCompare(b.due) || a.added.localeCompare(b.added));
  const instOfMistake = m => m.src ? K.make(m.uid, null, {q: m.q, ans: m.ans}) : {id: m.uid, q: {a: m.a, op: m.op, b: m.b}, ans: m.ans};

  // ---------- 统计（意图卡的指标） ----------
  // 护栏 3：已开始、还没全部深红的理解技能里，最久没练的那个隔了几天
  function gapNow(S, day) {
    let g = 0;
    K.understand.forEach(s => {
      const ps = s.items.map(it => peek(S, it.id));
      if (!ps.some(p => p.seen > 0) || ps.every(p => p.lv === 3)) return;
      const last = ps.map(p => p.lastDay || '').sort().pop();
      if (last) g = Math.max(g, C.dayDiff(last, day));
    });
    return g;
  }
  function stat(S, day) { S.stats = S.stats || {}; return (S.stats[day] = S.stats[day] || {sec: 0, n: 0, ups: 0, over: 0}); }
  function trimStats(S) { const ks = Object.keys(S.stats || {}).sort(); ks.slice(0, Math.max(0, ks.length - STATS_DAYS)).forEach(k => delete S.stats[k]); }

  // ---------- 今日练习 ----------
  // 用法：const s = session(S, day, {rnd}); for (let x = s.next(); x; x = s.next()) { …显示 x… s.answer({ok, fast, secs}); }
  // x = {kind:'demo', skill} 示范卡（显示完直接再调 next）| {kind:'q', inst, seg:'review'|'new'|'fluency'}
  function session(S, day, opts) {
    opts = opts || {};
    const r = opts.rnd || Math.random, budget = opts.budget || BUDGET;
    if (!S.daily || S.daily.day !== day) S.daily = {day, sec: 0, done: false};
    S.demoSeen = S.demoSeen || {}; S.known = S.known || {};
    const asked = {}, recent = [], tally = {n: 0, pass: 0};
    let elapsed = S.daily.sec, cur = null, seg = 'review', reviewEnd = null, newEnd = null, queue = [], pending = [], skipNew = false;
    const count = id => asked[id] || 0;
    const room = id => count(id) < MAXPER[kindOf(id)];
    // 同一技能不连续超过 3 题：从排队里挑第一个不违反的
    const pickFrom = list => {
      const run3 = recent.length >= 3 && recent.slice(-3).every(x => x === recent[recent.length - 1]) ? recent[recent.length - 1] : null;
      let i = list.findIndex(x => room(x.inst.id) && K.ITEM[x.inst.id].skill !== run3);
      if (i < 0) i = list.findIndex(x => room(x.inst.id));
      return i < 0 ? null : list.splice(i, 1)[0];
    };
    function fillReview() {
      queue = dueMistakes(S, day).map(m => ({inst: instOfMistake(m), mkey: m.key, seg: 'review'}));
    }
    // 学新的：同时最多 2 个技能；一天最多开始 3 个从没练过的技能（第一天不一下子塞太多新东西）
    const started = sid => K.BY[sid].items.some(it => peek(S, it.id).seen > 0);
    function fillNew() {
      S.daily.fresh = S.daily.fresh || [];
      const front = [];
      for (const s of K.SKILLS) {
        if (front.length >= FRONT) break;
        if (!ready(S, s.id) || learned(S, s.id)) continue;
        const isNew = !started(s.id) && !S.daily.fresh.includes(s.id);
        if (isNew && S.daily.fresh.length >= NEW_PER_DAY) continue;
        if (isNew) S.daily.fresh.push(s.id);
        front.push(s);
      }
      queue = [];
      for (let round = 0; round < 3; round++) front.forEach(s => {
        s.items.filter(it => lv(S, it.id) === 0 && room(it.id)).slice(0, 3).forEach(it => queue.push({inst: K.make(it.id, r), seg: 'new'}));
      });
    }
    function fillFluency() {
      const due = [], learning = [], keep = [];
      K.SKILLS.forEach(s => s.items.forEach(it => {
        const p = peek(S, it.id), seen = p.lastDay || '';
        if (p.lv === 0 || seen === day || !room(it.id)) return;
        if ((p.lv === 1 && p.d[0] < day) || (p.lv === 2 && C.dayDiff(p.d[1], day) >= C.GAP_DAYS)) due.push(it);
        else if (p.lv < 3) learning.push(it);
        else if (!seen || C.dayDiff(seen, day) >= KEEP[Math.min(p.keep || 0, KEEP.length - 1)]) keep.push(it);
      }));
      const old = it => peek(S, it.id).lastDay || '';
      due.sort((a, b) => old(a).localeCompare(old(b)));
      learning.sort((a, b) => lv(S, a.id) - lv(S, b.id) || old(a).localeCompare(old(b)));
      keep.sort((a, b) => old(a).localeCompare(old(b)));
      // 题型被选中出好几题，和别的题交错：按轮次铺开
      const picked = due.concat(learning, keep), rounds = [];
      picked.forEach(it => { for (let k = 0; k < REP[kindOf(it.id)]; k++) (rounds[k] = rounds[k] || []).push({inst: K.make(it.id, r), seg: 'fluency', keep: peek(S, it.id).lv === 3}); });
      queue = [].concat(...rounds.map(x => x || []));
    }
    function advance() {
      if (seg === 'review') {
        if (reviewEnd === null) { reviewEnd = elapsed + REVIEW_MAX; fillReview(); }
        if (elapsed < reviewEnd && queue.length) return true;
        skipNew = dueMistakes(S, day).length > BACKLOG; seg = 'new'; newEnd = null;
      }
      if (seg === 'new') {
        if (!skipNew) {
          if (newEnd === null) { newEnd = elapsed + NEW_SEC; fillNew(); }
          if (elapsed < newEnd && queue.length) return true;
        }
        seg = 'fluency'; fillFluency();
      }
      if (!queue.length) fillFluency();
      // 复习和熟练都做完了还有时间：今天做得好（合格 ≥ 80%、没有到期错题）就接着学新的，把 10 分钟用满
      if (!queue.length && !skipNew && tally.n >= 5 && tally.pass / tally.n >= 0.8 && !dueMistakes(S, day).length) fillNew();
      return queue.length > 0;
    }
    const api = {
      get elapsed() { return elapsed; }, get done() { return S.daily.done; },
      next() {
        if (pending.length) { cur = pending.shift(); return cur; }
        if (elapsed >= budget || !advance()) { S.daily.done = true; cur = null; return null; }
        const x = pickFrom(queue);
        if (!x) { queue = []; return api.next(); }
        const sid = K.ITEM[x.inst.id].skill;
        if (x.seg === 'new' && !S.demoSeen[sid] && !S.known[sid]) {
          S.demoSeen[sid] = true; elapsed += DEMO_SEC; S.daily.sec = elapsed;
          pending.push(Object.assign({kind: 'q'}, x));
          cur = {kind: 'demo', skill: sid}; return cur;
        }
        cur = Object.assign({kind: 'q'}, x); return cur;
      },
      inject(x) { cur = x; },             // 测试用：直接指定当前题
      answer(res) {
        if (!cur || cur.kind !== 'q') return null;
        const x = cur, id = x.inst.id, gray = lv(S, id) === 0;
        asked[id] = count(id) + 1; recent.push(K.ITEM[id].skill);
        const out = record(S, id, res, day);
        tally.n++; if (out.pass) tally.pass++;
        if (x.keep && out.pass) prog(S, id).keep = (prog(S, id).keep || 0) + 1;
        const m = x.mkey && S.mistakes[x.mkey];
        if (m && m.due !== null && m.due <= day) C.reviewMistake(S, x.mkey, out.pass ? 'fast' : res.ok ? 'slow' : 'wrong', day);
        else if (!res.ok && !(gray && x.seg === 'new')) addMistake(S, x.inst, day);   // 还在学（灰）时答错不进错题本
        if (x.keep && !res.ok) prog(S, id).keep = 0;
        elapsed += res.secs || 0; S.daily.sec = elapsed;
        const st = stat(S, day); st.sec = elapsed; st.n++; if (out.up) st.ups++;
        st.over = dueMistakes(S, day).length;
        st.gap = gapNow(S, day);
        if (elapsed >= budget) S.daily.done = true;
        cur = null;
        return out;
      },
    };
    return api;
  }

  // ---------- 首次摸底：每个技能组按难度排成一条链，先测最难的，再二分往下找；3 题全对算会 ----------
  const GROUPS = ['look', 'bond', 'place', 'cmp', 'line'];
  function placement(S, day, opts) {
    opts = opts || {};
    const r = opts.rnd || Math.random;
    S.known = S.known || {};
    const st = S.placement = S.placement || {g: 0, lo: null, hi: null, best: -1, n: 0, sec: 0};
    let probe = null, cur = null;
    const chain = () => K.understand.filter(s => s.group === GROUPS[st.g]);
    function finishGroup() {
      const c = chain();
      for (let i = 0; i <= st.best; i++) S.known[c[i].id] = true;
      st.g++; st.lo = st.hi = null; st.best = -1;
    }
    function nextProbe() {
      while (st.g < GROUPS.length) {
        const c = chain();
        if (st.lo === null) { st.lo = 0; st.hi = c.length - 1; st.first = true; }
        if (st.lo > st.hi) { finishGroup(); continue; }
        const m = st.first ? st.hi : (st.lo + st.hi) >> 1;
        st.first = false;
        const items = c[m].items.slice(), pickN = [];
        for (let k = 0; k < PROBE; k++) pickN.push(K.make(items[Math.floor(r() * items.length)].id, r));
        return {m, sid: c[m].id, qs: pickN, ans: []};
      }
      return null;
    }
    const done = () => { S.placedAt = Date.now(); delete S.placement; };
    return {
      next() {
        if (st.n >= PLACE_MAX_N || st.sec >= PLACE_MAX_SEC) { while (st.g < GROUPS.length) finishGroup(); done(); return null; }
        if (!probe || probe.ans.length >= probe.qs.length) probe = nextProbe();
        if (!probe) { done(); return null; }
        cur = {kind: 'q', inst: probe.qs[probe.ans.length], seg: 'place', skill: probe.sid};
        return cur;
      },
      answer(res) {
        if (!cur) return;
        st.n++; st.sec += res.secs || 0;
        probe.ans.push(!!res.ok);
        const failed = !res.ok, full = probe.ans.length >= probe.qs.length;
        if (failed || full) {
          if (!failed) {                                   // 3 题全对：测过的格子点亮淡黄
            probe.qs.forEach(q => { const p = prog(S, q.id); if (p.lv === 0) bump(p, day); p.seen++; p.lastDay = day; });
            st.best = Math.max(st.best, probe.m); st.lo = probe.m + 1;
          } else st.hi = probe.m - 1;
          probe.ans.length = probe.qs.length;              // 错一题就提前结束这次探测
          if (st.lo > st.hi) finishGroup();
        }
        cur = null;
      },
    };
  }

  return {BUDGET, REVIEW_MAX, NEW_SEC, BACKLOG, KEEP, REP, MAXPER,
    prog, lv, needFast, learned, ready, record, addMistake, dueMistakes, session, placement, trimStats, stat, gapNow};
});
