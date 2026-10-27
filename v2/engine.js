// 空空数学岛 · 今日练习引擎（纯逻辑，无 DOM）：格子升级、错题本、每天 10 分钟排课、自由加练、首次摸底、统计
// 排课对标：知识图谱 + 前置掌握（Math Academy）、首次诊断定位（ALEKS）、跨技能交错、先对后快（WWC 2021）
// 浏览器里挂到 window.ENGINE（依赖 window.SM、window.SKILLS），node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./skills.js'));
  else root.ENGINE = factory(root.SM, root.SKILLS);
})(typeof self !== 'undefined' ? self : this, function (C, K) {
  'use strict';

  const BUDGET = 600, REVIEW_MAX = 300, NEW_SEC = 180, BACKLOG = 10, DEMO_SEC = 5, FRONT = 2, NEW_PER_DAY = 3, STALE = 5;
  const REP = {card: 1, type8: 3, day5: 5}, MAXPER = {card: 2, type8: 6, day5: 6};
  const KEEP = [7, 14, 30, 60];          // 深红以后的维持复习间隔（天）
  const PLACE_MAX_N = 40, PLACE_MAX_SEC = 300, PROBE = 3, FREE_N = 12;
  const STATS_DAYS = 400;

  const skillOf = id => K.BY[K.ITEM[id].skill];
  // 格子的种类看题目本身：固定题 = 卡；每次出新数 = 题型（秒答题型沿用 v2 的"一天 5 次"）
  const kindOf = id => !K.ITEM[id].gen ? 'card' : skillOf(id).speed ? 'day5' : 'type8';

  // ---------- 格子状态：秒答存在 S.cards（和 v1 / v2 同一个地方），理解技能存在 S.skills ----------
  function prog(S, id) {
    let p;
    if (skillOf(id).speed) p = C.cs(S, id);
    else { S.skills = S.skills || {}; p = (S.skills[id] = S.skills[id] || {lv: 0, d: [], seen: 0, lastDay: '', win: []}); }
    return C.fixCard(p);
  }
  const peek = (S, id) => (skillOf(id).speed ? S.cards[id] : (S.skills || {})[id]) || {lv: 0, d: [], seen: 0};
  const lv = (S, id) => peek(S, id).lv;
  // 上次练习日期：v1 迁来的格子没有 lastDay，按最后一次升级那天算
  const lastSeen = p => p.lastDay || (p.lv > 0 && p.d ? p.d[p.lv - 1] || '' : '');
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
    if (r.peeked) return {pass: false, up, peeked: true};
    if (kind === 'card') up = pass && bump(p, day);
    else if (kind === 'day5') {                    // 同 v2：同一天合格 5 次
      if (pass) { if (p.fday !== day) { p.fday = day; p.fn = 0; } p.fn++; if (p.fn >= C.TYPE_NEED) up = bump(p, day); }
    } else {                                       // 最近 8 次（可以跨天）合格 ≥ 7
      const lastUp = p.lv > 0 ? p.d[p.lv - 1] : null;
      // 升级当天、以及淡红后不满 3 天的作答不计入下一级（下一级要另一天、隔 3 天再证明）
      if (lastUp && (day <= lastUp || (p.lv === 2 && C.dayDiff(lastUp, day) < C.GAP_DAYS))) return {pass, up};
      p.win = (p.win || []).concat(pass ? 1 : 0).slice(-8);
      if (p.win.length === 8 && p.win.reduce((a, b) => a + b, 0) >= 7 && bump(p, day)) { up = true; p.win = []; }
    }
    if (up) { const L = (S.log[day] = S.log[day] || {ups: [], n: 0}); if (!L.ups.includes(id)) L.ups.push(id); }
    return {pass, up};
  }

  // ---------- 错题本：秒答沿用 core（v2 格式），理解技能存题目数据 ----------
  // 题型的错题（每次数字不同）每种最多留最近 2 道还在复习的，避免同一类题堆成一串
  const TYPE_MIST_MAX = 2;
  function addMistake(S, inst, day) {
    const s = skillOf(inst.id);
    let key;
    if (s.speed) key = C.addMistake(S, {id: inst.id, a: inst.q.a, op: inst.q.op, b: inst.q.b, ans: inst.ans, L: s.L}, day);
    else {
      key = K.mkey(inst); const m = S.mistakes[key];
      if (m) { m.passes = 0; m.due = C.addDays(day, C.INTERVALS[0]); m.last = day; }
      else S.mistakes[key] = {key, uid: inst.id, src: s.group, q: inst.q, ans: inst.ans, passes: 0, due: C.addDays(day, C.INTERVALS[0]), added: day, last: day};
    }
    if (K.ITEM[inst.id].gen) {
      const same = Object.values(S.mistakes).filter(m => m.uid === inst.id && m.due !== null && m.key !== key)
        .sort((a, b) => (a.last || a.added).localeCompare(b.last || b.added));
      same.slice(0, Math.max(0, same.length - (TYPE_MIST_MAX - 1))).forEach(m => delete S.mistakes[m.key]);
    }
    return key;
  }
  const isDue = (m, day) => m.due !== null && m.due <= day && !!K.ITEM[m.uid];
  const dueMistakes = (S, day, only) => Object.values(S.mistakes || {}).filter(m => isDue(m, day) && (!only || only(m.uid)))
    .sort((a, b) => a.due.localeCompare(b.due) || a.added.localeCompare(b.added));
  const dueCount = (S, day) => { let n = 0; for (const k in S.mistakes || {}) if (isDue(S.mistakes[k], day)) n++; return n; };
  const instOfMistake = m => m.src ? K.make(m.uid, null, {q: m.q, ans: m.ans}) : {id: m.uid, q: {a: m.a, op: m.op, b: m.b}, ans: m.ans};

  // ---------- 统计（意图卡的指标） ----------
  function stat(S, day) { S.stats = S.stats || {}; return (S.stats[day] = S.stats[day] || {sec: 0, n: 0, ups: 0, over: 0, gap: 0}); }
  function trimStats(S) { const ks = Object.keys(S.stats || {}).sort(); ks.slice(0, Math.max(0, ks.length - STATS_DAYS)).forEach(k => delete S.stats[k]); }
  // 护栏 3：已开始、还没全部深红的理解技能里，最久没练的那个隔了几天
  function gapNow(S, day) {
    let g = 0;
    K.understand.forEach(s => {
      const ps = s.items.map(it => peek(S, it.id));
      if (!ps.some(p => p.seen > 0) || ps.every(p => p.lv === 3)) return;
      const last = ps.map(lastSeen).sort().pop();
      if (last) g = Math.max(g, C.dayDiff(last, day));
    });
    return g;
  }
  const daily = (S, day) => {
    if (!S.daily || S.daily.day !== day) S.daily = {day, sec: 0, done: false, budget: BUDGET, fresh: [], asked: {}, tally: {n: 0, pass: 0}};
    return S.daily;
  };

  // 一题作答之后的共同处理：升级、错题、维持复习档位、统计
  function settle(S, x, res, day, onTime) {
    if (x.afterDemo) S.demoSeen[x.afterDemo] = true;
    const id = x.inst.id, gray = lv(S, id) === 0, p = prog(S, id);
    const out = record(S, id, res, day);
    if (x.keep) {
      if (out.pass && p.keepDay !== day) { p.keep = (p.keep || 0) + 1; p.keepDay = day; }
      if (!res.ok) p.keep = 0;
    }
    const m = x.mkey && S.mistakes[x.mkey];
    if (m && isDue(m, day)) C.reviewMistake(S, x.mkey, out.pass ? 'fast' : res.ok ? 'slow' : 'wrong', day);
    else if (!res.ok && !(gray && x.seg === 'new')) addMistake(S, x.inst, day);   // 还在学（灰）时答错不进错题本
    const st = stat(S, day); st.sec += res.secs || 0; st.n++; if (out.up) st.ups++;
    st.over = dueCount(S, day); st.gap = gapNow(S, day);
    if (onTime) onTime(res.secs || 0);
    return out;
  }

  // 同一技能不连续超过 3 题：从排队里挑第一个不违反的；学新的里已经点亮的不再出
  function picker(S, asked, recent) {
    const room = id => (asked[id] || 0) < MAXPER[kindOf(id)];
    const usable = x => room(x.inst.id) && !(x.seg === 'new' && lv(S, x.inst.id) > 0);
    return list => {
      for (let i = list.length - 1; i >= 0; i--) if (!usable(list[i])) list.splice(i, 1);
      const last = recent[recent.length - 1];
      const run3 = recent.length >= 3 && recent.slice(-3).every(x => x === last) ? last : null;
      let i = list.findIndex(x => K.ITEM[x.inst.id].skill !== run3);
      if (i < 0) i = list.length ? 0 : -1;
      return i < 0 ? null : list.splice(i, 1)[0];
    };
  }
  // 题型被选中出好几题，和别的题交错：按轮次铺开
  function spreadOut(lists) {
    const out = [];
    for (let k = 0; lists.some(l => l.length > k); k++) lists.forEach(l => { if (l[k]) out.push(l[k]); });
    return out;
  }

  // ---------- 今日练习 ----------
  // 用法：const s = session(S, day, {rnd, extra}); for (let x = s.next(); x; x = s.next()) { …显示 x… if (x.kind === 'q') s.answer({ok, fast, secs, peeked}); }
  // x = {kind:'demo', skill} 示范卡 | {kind:'q', inst, seg:'review'|'new'|'fluency', mkey?, keep?}
  // extra：今天练完以后「再练一会」多给的秒数
  function session(S, day, opts) {
    opts = opts || {};
    const r = opts.rnd || Math.random, Dy = daily(S, day);
    S.demoSeen = S.demoSeen || {}; S.known = S.known || {};
    if (opts.extra && Dy.done) { Dy.budget = Dy.sec + opts.extra; Dy.done = false; Dy.seg = null; Dy.reviewEnd = null; }
    const recent = [], pick = picker(S, Dy.asked, recent), room = id => (Dy.asked[id] || 0) < MAXPER[kindOf(id)];
    let cur = null, queue = [], pending = [];
    Dy.seg = Dy.seg || 'review';
    const started = sid => K.BY[sid].items.some(it => peek(S, it.id).seen > 0);
    // 学新的：同时最多 2 个技能（理解技能和秒答各占一个，缺一类时另一类补）；一天最多开始 3 个从没练过的技能
    function frontSkills() {
      // 今天这个技能的灰格子都出满了（新题型一次最多 6 题、要攒 8 次，所以常常要两天）→ 让位给下一个技能
      const hasRoom = s => s.items.some(it => lv(S, it.id) === 0 && room(it.id));
      const ok = s => ready(S, s.id) && !learned(S, s.id) && hasRoom(s) && (started(s.id) || Dy.fresh.includes(s.id) || Dy.fresh.length < NEW_PER_DAY);
      // 防冷落：已经开始学、≥ STALE 天没练的技能排到最前
      const stale = s => { const l = s.items.map(it => lastSeen(peek(S, it.id))).sort().pop(); return started(s.id) && l && C.dayDiff(l, day) >= STALE; };
      const byStale = list => list.filter(stale).concat(list.filter(s => !stale(s)));
      const u = byStale(K.understand.filter(ok)), sp = byStale(K.speed.filter(ok));
      const front = u.slice(0, 1).concat(sp.slice(0, 1));
      for (const s of u.slice(1).concat(sp.slice(1))) { if (front.length >= FRONT) break; front.push(s); }
      const chosen = [];
      for (const s of front.slice(0, FRONT)) {
        if (!started(s.id) && !Dy.fresh.includes(s.id)) { if (Dy.fresh.length >= NEW_PER_DAY) continue; Dy.fresh.push(s.id); }
        chosen.push(s);
      }
      return chosen;
    }
    function fillNew() {
      queue = spreadOut(frontSkills().map(s => {
        const gray = s.items.filter(it => lv(S, it.id) === 0 && room(it.id)), out = [];
        gray.filter(it => !it.gen).slice(0, 6).forEach(it => out.push({inst: K.make(it.id, r), seg: 'new'}));
        gray.filter(it => it.gen).forEach(it => { for (let k = 0; k < REP[kindOf(it.id)]; k++) out.push({inst: K.make(it.id, r), seg: 'new'}); });
        return out;
      }));
    }
    function fillReview() { queue = dueMistakes(S, day).filter(m => room(m.uid)).map(m => ({inst: instOfMistake(m), mkey: m.key, seg: 'review'})); }
    function fillFluency() {
      const due = [], learning = [], keep = [];
      K.SKILLS.forEach(s => s.items.forEach(it => {
        const p = peek(S, it.id), seen = lastSeen(p);
        if (p.lv === 0 || p.lastDay === day || !room(it.id)) return;
        if ((p.lv === 1 && p.d[0] < day) || (p.lv === 2 && C.dayDiff(p.d[1], day) >= C.GAP_DAYS)) due.push(it);
        else if (p.lv < 3) learning.push(it);
        else if (!seen || C.dayDiff(seen, day) >= KEEP[Math.min(p.keep || 0, KEEP.length - 1)]) keep.push(it);
      }));
      const old = it => lastSeen(peek(S, it.id));
      const staleIt = it => { const l = old(it); return l && C.dayDiff(l, day) >= STALE ? 0 : 1; };   // 防冷落：≥ STALE 天没练的先出
      due.sort((a, b) => staleIt(a) - staleIt(b) || old(a).localeCompare(old(b)));
      learning.sort((a, b) => staleIt(a) - staleIt(b) || lv(S, a.id) - lv(S, b.id) || old(a).localeCompare(old(b)));
      keep.sort((a, b) => old(a).localeCompare(old(b)));
      queue = spreadOut(due.concat(learning, keep).map(it => {
        const isKeep = peek(S, it.id).lv === 3;
        return Array.from({length: REP[kindOf(it.id)]}, () => ({inst: K.make(it.id, r), seg: 'fluency', keep: isKeep}));
      }));
    }
    function advance() {
      if (Dy.seg === 'review') {
        if (Dy.reviewEnd == null) Dy.reviewEnd = Dy.sec + REVIEW_MAX;
        if (Dy.sec < Dy.reviewEnd) { if (!queue.length) fillReview(); if (queue.length) return true; }
        Dy.skipNew = dueCount(S, day) > BACKLOG; Dy.seg = 'new'; Dy.newEnd = null; queue = [];
      }
      if (Dy.seg === 'new') {
        if (!Dy.skipNew) {
          if (Dy.newEnd == null) Dy.newEnd = Dy.sec + NEW_SEC;
          if (Dy.sec < Dy.newEnd) { if (!queue.length) fillNew(); if (queue.length) return true; }
        }
        Dy.seg = 'fluency'; queue = [];
      }
      if (!queue.length) fillFluency();
      // 复习和熟练都做完了还有时间：今天做得好（合格 ≥ 80%、没有到期错题）就接着学新的，把 10 分钟用满
      if (!queue.length && !Dy.skipNew && Dy.tally.n >= 5 && Dy.tally.pass / Dy.tally.n >= 0.8 && !dueCount(S, day)) fillNew();
      // 还有时间、还有到期错题（复习段 5 分钟没做完的）：接着复习
      if (!queue.length && dueCount(S, day)) fillReview();
      return queue.length > 0;
    }
    const api = {
      get elapsed() { return Dy.sec; }, get done() { return Dy.done; }, get tally() { return Dy.tally; },
      next() {
        if (pending.length) { cur = pending.shift(); return cur; }
        for (let guard = 0; guard < 6; guard++) {
          if (Dy.sec >= Dy.budget || !advance()) { Dy.done = true; cur = null; return null; }
          const x = pick(queue);
          if (!x) { queue = []; continue; }
          const sid = K.ITEM[x.inst.id].skill;
          if (x.seg === 'new' && !S.demoSeen[sid] && !S.known[sid]) {
            Dy.sec += DEMO_SEC; stat(S, day).sec += DEMO_SEC;
            pending.push(Object.assign({kind: 'q', afterDemo: sid}, x));      // 孩子答了示范卡后面那题，才算看过
            cur = {kind: 'demo', skill: sid}; return cur;
          }
          cur = Object.assign({kind: 'q'}, x); return cur;
        }
        Dy.done = true; cur = null; return null;
      },
      inject(x) { cur = x; },             // 测试用：直接指定当前题
      answer(res) {
        if (!cur || cur.kind !== 'q') return null;
        const x = cur; cur = null;
        Dy.asked[x.inst.id] = (Dy.asked[x.inst.id] || 0) + 1; recent.push(K.ITEM[x.inst.id].skill);
        const out = settle(S, x, res, day, sec => { Dy.sec += sec; });
        if (!out.peeked) { Dy.tally.n++; if (out.pass) Dy.tally.pass++; }
        if (Dy.sec >= Dy.budget) Dy.done = true;
        return out;
      },
    };
    return api;
  }

  // ---------- 自由加练：技能组地图「练这个」，12 题；规则同今日练习，计入用时统计，不计入今日 10 分钟 ----------
  function free(S, day, group, opts) {
    opts = opts || {};
    const r = opts.rnd || Math.random, n = opts.n || FREE_N;
    S.demoSeen = S.demoSeen || {}; S.known = S.known || {};
    const skills = K.SKILLS.filter(s => s.group === group || s.id === group), inSet = id => skills.includes(skillOf(id));
    const asked = {}, recent = [], pick = picker(S, asked, recent);
    const mist = dueMistakes(S, day, inSet).map(m => ({inst: instOfMistake(m), mkey: m.key, seg: 'review'}));
    const items = skills.flatMap(s => s.items.map(it => ({it, s})));
    const order = items.slice().sort((a, b) => (ready(S, b.s.id) - ready(S, a.s.id)) || (lv(S, a.it.id) - lv(S, b.it.id)) || lastSeen(peek(S, a.it.id)).localeCompare(lastSeen(peek(S, b.it.id))));
    const queue = mist.concat(spreadOut(order.map(({it}) => Array.from({length: REP[kindOf(it.id)]}, () => ({inst: K.make(it.id, r), seg: lv(S, it.id) === 0 ? 'new' : 'fluency'})))));
    let cur = null, count = 0;
    const pending = [];
    return {
      next() {
        if (pending.length) { cur = pending.shift(); return cur; }
        if (count >= n) return null;
        const x = pick(queue);
        if (!x) return null;
        const sid = K.ITEM[x.inst.id].skill;
        if (lv(S, x.inst.id) === 0 && !S.demoSeen[sid] && !S.known[sid]) {
          stat(S, day).sec += DEMO_SEC;
          pending.push(Object.assign({kind: 'q', afterDemo: sid}, x)); cur = {kind: 'demo', skill: sid}; return cur;
        }
        cur = Object.assign({kind: 'q'}, x); return cur;
      },
      answer(res) {
        if (!cur || cur.kind !== 'q') return null;
        const x = cur; cur = null; count++;
        asked[x.inst.id] = (asked[x.inst.id] || 0) + 1; recent.push(K.ITEM[x.inst.id].skill);
        return settle(S, x, res, day);
      },
    };
  }

  // ---------- 首次摸底：每个技能组按难度排成一条链，先测最难的，再二分往下找；3 题全对算会，错一题提前结束这次 ----------
  const GROUPS = ['look', 'bond', 'place', 'cmp', 'line'];
  function placement(S, day, opts) {
    opts = opts || {};
    const r = opts.rnd || Math.random, Dy = daily(S, day);
    S.known = S.known || {};
    const st = S.placement = S.placement || {g: 0, lo: null, hi: null, best: -1, n: 0, sec: 0, first: true, probe: null};
    let cur = null;
    const chain = () => K.understand.filter(s => s.group === GROUPS[st.g]);
    function finishGroup() {
      const c = chain();
      for (let i = 0; i <= st.best; i++) S.known[c[i].id] = true;
      st.g++; st.lo = st.hi = null; st.best = -1; st.first = true; st.probe = null;
    }
    function nextProbe() {
      while (st.g < GROUPS.length) {
        const c = chain();
        if (st.lo === null) { st.lo = 0; st.hi = c.length - 1; st.first = true; }
        if (st.lo > st.hi) { finishGroup(); continue; }
        const m = st.first ? st.hi : (st.lo + st.hi) >> 1;
        st.first = false;
        const items = c[m].items, qs = [];
        for (let k = 0; k < PROBE; k++) qs.push(K.make(items[Math.floor(r() * items.length)].id, r));
        return {m, sid: c[m].id, qs, ans: []};
      }
      return null;
    }
    const done = () => { S.placedAt = Date.now(); delete S.placement; };
    return {
      next() {
        if (st.n >= PLACE_MAX_N || st.sec >= PLACE_MAX_SEC) { while (st.g < GROUPS.length) finishGroup(); done(); return null; }
        if (!st.probe || st.probe.ans.length >= st.probe.qs.length) st.probe = nextProbe();
        if (!st.probe) { done(); return null; }
        cur = {kind: 'q', inst: st.probe.qs[st.probe.ans.length], seg: 'place', skill: st.probe.sid};
        return cur;
      },
      answer(res) {
        if (!cur) return;
        const pr = st.probe, secs = res.secs || 0;
        st.n++; st.sec += secs; Dy.sec += secs; stat(S, day).sec += secs;   // 摸底时间计入当天 10 分钟
        pr.ans.push(!!res.ok);
        const failed = !res.ok, full = pr.ans.length >= pr.qs.length;
        if (failed || full) {
          if (!failed) {                                   // 3 题全对：测过的格子点亮淡黄
            pr.qs.forEach(q => { const p = prog(S, q.id); if (p.lv === 0) bump(p, day); p.seen++; p.lastDay = day; });
            st.best = Math.max(st.best, pr.m); st.lo = pr.m + 1;
          } else st.hi = pr.m - 1;
          pr.ans.length = pr.qs.length;                    // 错一题就提前结束这次探测
          if (st.lo > st.hi) finishGroup();
        }
        cur = null;
      },
    };
  }

  return {BUDGET, REVIEW_MAX, NEW_SEC, BACKLOG, KEEP, REP, MAXPER, kindOf,
    prog, lv, needFast, learned, ready, record, addMistake, dueMistakes, session, free, placement, trimStats, stat, gapNow};
});
