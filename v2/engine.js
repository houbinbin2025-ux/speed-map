// 空空数学岛 · 今日练习引擎（纯逻辑，无 DOM）：格子升级、错题本、每天 10 分钟排课、自由加练、首次摸底、统计
// 排课对标：知识图谱 + 前置掌握（Math Academy）、首次诊断定位（ALEKS）、跨技能交错、先对后快（WWC 2021）
// 浏览器里挂到 window.ENGINE（依赖 window.SM、window.SKILLS），node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./skills.js'));
  else root.ENGINE = factory(root.SM, root.SKILLS);
})(typeof self !== 'undefined' ? self : this, function (C, K) {
  'use strict';

  const BUDGET = 600, NEW_SEC = 360, BACKLOG = 10, DEMO_SEC = 5, FRONT = 4, NEW_PER_DAY = 5, STALE = 5;
  const REP = {card: 1, type8: 3, day5: 5}, MAXPER = {card: 2, type8: 6, day5: 6};
  const KEEP = [7, 14, 30, 60];          // 深红以后的维持复习间隔（天）
  const PLACE_MAX_N = 40, PLACE_MAX_SEC = 300, PROBE = 3, FREE_N = 12;
  const STATS_DAYS = 400;
  // Ben 11-05：一道题累计秒答 4 次就不再出。一天最多记 2 次，所以至少跨两天，「隔天还会」的底线还在
  const FAST_OUT = 4, FAST_PER_DAY = 2, MIST_EVERY = 2, MIST_DAY = 15;   // MIST_EVERY：每出 2 道别的题插 1 道到期错题；MIST_DAY：今日练习一天最多复习几道，多的顺延

  const skillOf = id => K.BY[K.ITEM[id].skill];
  // 15 级难度（说明书-难度分级）：S.settings.levels = 家长手选的级别；没选 = 自动，一级点亮 ≥ 70% 开下一级
  const AUTO_PASS = 0.7, ALL_ITEMS = K.SKILLS.concat(K.HARD).flatMap(s => s.items);
  const CELLS = K.LEVELS.map(l => ALL_ITEMS.filter(it => K.itemLevels(it.id)[0] === l.n));
  const chosen = S => { const l = S.settings && S.settings.levels; return Array.isArray(l) && l.length ? l : null; };
  // 自动：开放到「第一个还没点亮 70% 的级别」再往上一级，题量才够用满 10 分钟；摸底判为会的技能算点亮，全对的孩子不用从第 1 级起
  let topMemo = null;   // 排课时一题要查几百次；档位变了（bump、retire）、新一次练习开始时清掉
  function autoLevel(S) {
    if (topMemo && topMemo.S === S) return topMemo.top;
    let top = K.LEVELS.length;
    for (let i = 0; i < CELLS.length; i++) { const share = l => (l.length ? l.filter(it => lv(S, it.id) >= 1 || (S.known && S.known[it.skill])).length / l.length : -1), c = CELLS[i];
      // 理解和秒答分开算，有一条线过 70% 就算过：摸底不测秒答，不能因为秒答还灰把会的数位关掉
      if (c.length && Math.max(share(c.filter(it => skillOf(it.id).speed)), share(c.filter(it => !skillOf(it.id).speed))) < AUTO_PASS) { top = Math.min(i + 2, K.LEVELS.length); break; } }
    topMemo = {S, top};
    return top;
  }
  const levelFits = (S, L, top) => { const c = chosen(S); return c ? c.includes(L) : L <= (top === undefined ? autoLevel(S) : top); };
  const levelOn = (S, inst) => levelFits(S, K.levelOf(inst));
  const itemOn = (S, id) => { const top = chosen(S) ? 0 : autoLevel(S); return K.itemLevels(id).some(L => levelFits(S, L, top)); };
  const hardOn = S => K.HARD.filter(s => s.items.some(it => itemOn(S, it.id)));
  const activeItem = (S, id) => !skillOf(id).hard || itemOn(S, id);
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
  // 上次练习日期：取 lastDay、v1 的 last（旧 v1 页练过只更新它）、最后一次升级日期三者最晚的
  const lastSeen = p => {
    let l = p.lastDay || '';
    const up = p.lv > 0 && p.d ? p.d[p.lv - 1] || '' : ''; if (up > l) l = up;
    if (p.last) { const t = new Date(p.last); if (!isNaN(t)) { const v = C.dayOf(t.getTime()); if (v > l) l = v; } }
    return l;
  };
  const needFast = (S, id) => { const s = skillOf(id); return s.timedFrom !== null && lv(S, id) >= s.timedFrom; };
  const learned = (S, sid) => K.BY[sid].items.every(it => lv(S, it.id) >= 1);
  // 前置只看已开放的题；家长手选难度时不管前置
  const learnedOn = (S, sid) => { const on = K.BY[sid].items.filter(it => itemOn(S, it.id)); return on.length > 0 && on.filter(it => lv(S, it.id) >= 1).length / on.length >= AUTO_PASS; };   // 已开放的题点亮 70% 算学会（和开下一级同一个标准）；前置还没开放 = 没学会
  const ready = (S, sid) => !!chosen(S) || K.BY[sid].pre.every(p => learnedOn(S, p));

  // 升一级：只升不降、一天最多一级、淡红到深红隔 ≥ 3 天、日期往回调不升
  function bump(p, day) {
    topMemo = null;
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

  // ---------- 秒答下架：S.fast[题的编号] = [累计次数, 最后一次的日子, 当天次数] ----------
  const qkey = inst => (K.ITEM[inst.id].gen && skillOf(inst.id).speed ? inst.id + '|' + inst.q.a + ',' + inst.q.b : K.mkey(inst));
  const fastCount = (S, inst) => { const f = (S.fast || {})[qkey(inst)]; return f ? f[0] : K.ITEM[inst.id].gen ? 0 : lv(S, inst.id); };   // 旧进度：卡每升一档算一次秒答
  const spent = (S, inst) => (K.ITEM[inst.id].gen ? fastCount(S, inst) >= FAST_OUT : lv(S, inst.id) === 3);
  const outOf = (S, id) => (K.ITEM[id].gen ? !!peek(S, id).out : lv(S, id) === 3);    // 这一格的题全部下架了
  function retire(S, id, day) {                     // 点亮到深红（只升不降）；返回这次有没有升
    const p = prog(S, id); if (p.lv === 3) return false;
    topMemo = null;
    for (let i = p.lv; i < 3; i++) p.d[i] = day;
    p.lv = 3;
    const L = (S.log[day] = S.log[day] || {ups: [], n: 0}); if (!L.ups.includes(id)) L.ups.push(id);
    return true;
  }
  function addFast(S, inst, day, lv0) {
    S.fast = S.fast || {};
    const k = qkey(inst), f = S.fast[k] || (S.fast[k] = [K.ITEM[inst.id].gen ? 0 : lv0, '', 0]);   // lv0：这次作答之前的档位
    if (f[1] !== day) { f[1] = day; f[2] = 0; }
    if (f[2] >= FAST_PER_DAY) return false;
    f[0]++; f[2]++;
    return !K.ITEM[inst.id].gen && f[0] >= FAST_OUT && retire(S, inst.id, day);
  }
  // 出一道还没下架的题；这一格的题全下架了返回 null，并把这一格点到深红
  function makeLive(S, id, r, day) {
    if (outOf(S, id) || !itemOn(S, id)) return null;
    let live = false;
    for (let k = 0; k < 400; k++) { const inst = K.make(id, r); if (!spent(S, inst)) { live = true; if (levelOn(S, inst)) return inst; } if (!K.ITEM[id].gen) break; }
    if (K.ITEM[id].gen && !live) { prog(S, id).out = 1; retire(S, id, day); }   // 这一格的题全下架了；只是级别没开放不算
    return null;
  }
  // 下架的题不再以错题身份回来：对应的错题算过关
  function sweep(S) {
    for (const k in S.mistakes || {}) {
      const m = S.mistakes[k]; if (m.due === null || !K.ITEM[m.uid]) continue;
      if (spent(S, instOfMistake(m))) { m.due = null; m.out = 1; }   // out：不算「过完 5 次复习」
    }
  }
  // 还有题能出吗（一格、一组、全部）：先看都到深红了没有，到了才真的试着抽，平时不动发牌进度
  const itemsOut = (S, its0, day) => { const its = its0.filter(it => itemOn(S, it.id)); return its.length > 0 && (!!chosen(S) || its.every(it => lv(S, it.id) === 3)) && its.every(it => !makeLive(S, it.id, Math.random, day)); };
  const groupItems = (S, group) => K.SKILLS.concat(K.HARD).filter(s => inGroup(s, group)).flatMap(s => s.items);
  const groupOut = (S, group, day) => itemsOut(S, groupItems(S, group), day);
  const groupEmpty = (S, group) => !groupItems(S, group).some(it => itemOn(S, it.id));   // 这块地在现在的难度下没有题
  const allOut = (S, day) => itemsOut(S, ALL_ITEMS, day);
  // 家长区题库页用：这一格有多少道题已经下架
  const spentCount = (S, id) => Object.keys(S.fast || {}).filter(k => (k === id || k.startsWith(id + '|')) && S.fast[k][0] >= FAST_OUT).length;

  // ---------- 错题本：秒答沿用 core（v2 格式），理解技能存题目数据 ----------
  // 题型的错题（每次数字不同）每种最多留最近 3 道还在复习的，避免同一类题堆成一串
  const TYPE_MIST_MAX = 3;
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
  const isDue = (m, day) => m.due !== null && m.due <= day && !!K.ITEM[m.uid] && !(m.q && C.isLow(m.q));
  // 手选难度时只回来选中级别的错题，其他的暂停不丢
  const mistOn = (S, m) => !!K.ITEM[m.uid] && activeItem(S, m.uid) && (!chosen(S) || chosen(S).includes(K.levelOf(instOfMistake(m))));
  const dueMistakes = (S, day, only) => Object.values(S.mistakes || {}).filter(m => isDue(m, day) && mistOn(S, m) && (!only || only(m.uid)))
    .sort((a, b) => a.due.localeCompare(b.due) || a.added.localeCompare(b.added));
  const dueCount = (S, day) => { let n = 0; for (const k in S.mistakes || {}) if (isDue(S.mistakes[k], day) && mistOn(S, S.mistakes[k])) n++; return n; };
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
  // ---------- 习惯记录（docs/说明书-习惯记录.md）：只记录，不影响排课、判题、升级、下架 ----------
  const SLIPS_MAX = 30, HABIT_DAYS = 14, HABIT_KEYS = ['a', 'r', 'd', 'k', 'ks', 'wn', 'ws', 'in', 'is', 'ia', 'ic', 'say'];
  const habDay = (S, day) => { const st = stat(S, day); return (st.h = st.h || {}); };
  const inc = (h, k, n = 1) => { h[k] = (h[k] || 0) + n; };
  // 熟题：作答前所在格已到淡红以上，或这道题已算过 2 次秒答
  // 「已算 2 次秒答」要跨天：一天最多记 2 次，所以 ≥ 3 次一定跨天；正好 2 次时，最后一天只记了 1 次才算跨天
  const isKnown = (S, inst, lv0) => { if (lv0 >= 2) return true; const f = (S.fast || {})[qkey(inst)]; return !!f && (f[0] >= 3 || (f[0] === 2 && f[2] < 2)); };
  function noteAnswer(S, day, inst, res, known) {
    try {
      const h = habDay(S, day), wrong = !res.ok && !res.dunno;
      inc(h, 'a'); if (res.ok) inc(h, 'r'); if (res.dunno) inc(h, 'd');
      if (inst.q && inst.q.say) { inc(h, 'wn'); inc(h, 'ws', res.readSecs === undefined ? res.secs || 0 : res.readSecs); }
      if (known && !res.dunno) {
        inc(h, 'k');
        if (wrong) {
          inc(h, 'ks');
          const s = skillOf(inst.id);
          S.slips = (S.slips || []).concat(s.speed ? {d: day, uid: inst.id, a: inst.q.a, op: inst.q.op, b: inst.q.b} : {d: day, uid: inst.id, src: s.group, q: inst.q}).slice(-SLIPS_MAX);
        }
      }
    } catch (e) {}
  }
  function noteInk(S, day, scores, clear) {
    try { const h = habDay(S, day), ok = scores.filter(x => x !== null); inc(h, 'in', ok.length); inc(h, 'is', ok.reduce((a, b) => a + b, 0)); inc(h, 'ia'); if (clear) inc(h, 'ic'); } catch (e) {}
  }
  function noteSay(S, day) { try { inc(habDay(S, day), 'say'); } catch (e) {} }
  // 汇总：近 n 天和再往前 n 天；days = 有作答的天数
  function habit(S, day, n = HABIT_DAYS) {
    const sum = (from, to) => { const o = {days: 0}; HABIT_KEYS.forEach(k => { o[k] = 0; }); for (let i = from; i < to; i++) { const st = (S.stats || {})[C.addDays(day, -i)], h = st && st.h; if (!h) continue; if (h.a) o.days++; HABIT_KEYS.forEach(k => { o[k] += h[k] || 0; }); } return o; };
    return {now: sum(0, n), prev: sum(n, n * 2), n, slips: (Array.isArray(S.slips) ? S.slips : []).filter(m => m && K.ITEM[m.uid]).slice().reverse()};
  }

  // 笔迹校准等练习以外的时间：计入当天 10 分钟和用时统计
  function addTime(S, day, sec) { daily(S, day).sec += sec; stat(S, day).sec += sec; }

  // 一题作答之后的共同处理：升级、错题、维持复习档位、统计
  function settle(S, x, res, day, onTime) {
    if (x.afterDemo) S.demoSeen[x.afterDemo] = true;
    const id = x.inst.id, p = prog(S, id);
    if (!x.retry && !res.peeked) { let known = false; try { known = isKnown(S, x.inst, p.lv); } catch (e) {} noteAnswer(S, day, x.inst, res, known); }   // 先于这次作答判断
    const lv0 = p.lv, out = record(S, id, res, day);
    if (res.ok && res.fast && !res.peeked && !x.retry && addFast(S, x.inst, day, lv0)) out.up = true;
    if (res.ok && res.fast) sweep(S);
    if (x.keep) {
      if (out.pass && p.keepDay !== day) { p.keep = (p.keep || 0) + 1; p.keepDay = day; }
      if (!res.ok) p.keep = 0;
    }
    const m = x.mkey && S.mistakes[x.mkey];
    if (m && isDue(m, day)) C.reviewMistake(S, x.mkey, out.pass ? 'fast' : res.ok ? 'slow' : 'wrong', day);
    else if (!res.ok) addMistake(S, x.inst, day);   // 10-29 Ben：写错的题都要进错题宝箱（含还在学的灰格），孩子才看得到、隔天能回炉
    const st = stat(S, day); st.sec += res.secs || 0; st.n++; if (out.up) st.ups++;
    st.over = dueCount(S, day); st.gap = gapNow(S, day);
    if (onTime) onTime(res.secs || 0);
    return out;
  }

  // 同一技能不连续超过 3 题：从排队里挑第一个不违反的；学新的里已经点亮的不再出
  function picker(S, asked, recent, extra) {   // extra：题型多给的次数（练这一块题少时用）
    const room = id => (asked[id] || 0) < MAXPER[kindOf(id)] + (extra && K.ITEM[id].gen ? extra : 0);
    const usable = x => room(x.inst.id) && !(x.seg === 'new' && lv(S, x.inst.id) > 0) && !spent(S, x.inst);   // 排着队时下架了也不再出
    return list => {
      for (let i = list.length - 1; i >= 0; i--) if (!usable(list[i])) list.splice(i, 1);
      const last = recent[recent.length - 1];
      const run3 = recent.length >= 3 && recent.slice(-3).every(x => x === last) ? last : null;
      let i = list.findIndex(x => K.ITEM[x.inst.id].skill !== run3);
      if (i < 0) i = list.length ? 0 : -1;
      return i < 0 ? null : list.splice(i, 1)[0];
    };
  }
  // 当场再来一次（连续再学习）：写错的题隔 RETRY_GAP 题原题（同样的数）再出一次；错题明天照样回来。
  // 只有原来还是灰格的卡，再来一次做对才照常记合格（= 当天第二次机会，能点亮淡黄 = 第 1 天达标）；
  // 已点亮的格子、题型（同样的数）再来一次只算练习（按「再看一次」处理），不升级、不进 8 次窗口——淡红 / 深红必须是隔天真的还会。
  // 不计入「今天做得好就多学新的」的合格率。Ben 11-05：多练——按具体的题算，隔 3 题再来一次，再隔 8 题又来一次（两次都不算秒答次数）；比当天上限（卡 2、题型 6）多 RETRY_EXTRA 次。
  // 防扎堆：最多连着出 RUN_MAX 道再来一次就先出别的；题出完了的收尾只出离原题至少隔 1 题的、最多 TAIL_MAX 道，其余留给明天的错题宝箱
  const RETRY_GAP = 3, RETRY_GAP2 = 8, RETRY_EXTRA = 2, TAIL_MAX = 3, RUN_MAX = 2;
  function retrier(S, once, room) {
    const wait = []; let n = 0, tail = 0, run = 0;
    return {
      answered(x, res) {
        n++; run = x.retry ? run + 1 : 0;
        const k = K.mkey(x.inst);
        if (!res.ok && !x.retry && !once[k] && room(x.inst.id)) {
          once[k] = 1;
          wait.push({at: n + RETRY_GAP, from: n, x: {kind: 'q', inst: x.inst, seg: x.seg, retry: 1, credit: kindOf(x.inst.id) === 'card' && lv(S, x.inst.id) === 0}});
          return true;
        } else if (x.retry === 1 && once[k] === 1 && room(x.inst.id)) {
          once[k] = 2;
          wait.push({at: n + RETRY_GAP2, from: n, x: {kind: 'q', inst: x.inst, seg: x.seg, retry: 2, credit: false}});
          return true;
        }
        return false;
      },
      due(atEnd) {
        for (let i = wait.length - 1; i >= 0; i--) if (!room(wait[i].x.inst.id)) wait.splice(i, 1);   // 已经正常出满了：不再来
        if (atEnd ? tail >= TAIL_MAX : run >= RUN_MAX) return null;
        const i = wait.findIndex(w => w.at <= n || (atEnd && n - w.from >= 1));
        if (i < 0) return null;
        if (atEnd) tail++;
        return wait.splice(i, 1)[0].x;
      },
    };
  }
  const asRetry = (x, res) => (x.retry && !x.credit ? Object.assign({}, res, {peeked: true}) : res);
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
    topMemo = null;
    S.demoSeen = S.demoSeen || {}; S.known = S.known || {};
    if (opts.extra && Dy.done) { Dy.budget = Dy.sec + opts.extra; Dy.done = false; Dy.seg = null; Dy.mistN = 0; }
    const CHOSEN_EXTRA = 60, extra = chosen(S) ? CHOSEN_EXTRA : 0;   // 手选难度时题少，题型放宽，才练得满 10 分钟（一道题一天只记 2 次秒答）
    const recent = [], pick = picker(S, Dy.asked, recent, extra), room = id => (Dy.asked[id] || 0) < MAXPER[kindOf(id)] + (K.ITEM[id].gen ? extra : 0);
    let cur = null, queue = [], pending = [];
    const RT = retrier(S, Dy.retried = Dy.retried || {}, id => (Dy.asked[id] || 0) < MAXPER[kindOf(id)] + RETRY_EXTRA + (K.ITEM[id].gen ? extra : 0));
    const finished = () => { Dy.done = true; if (stat(S, day).n > 0) stat(S, day).done = 1; };   // 今天的题做完了：家的累计天数要用（说明书-v5-家）
    if (!Dy.seg || Dy.seg === 'review') Dy.seg = 'new';
    Dy.sinceM = Dy.sinceM || 0;
    // 到期错题不再集中在开头，穿插进练习（Ben 11-05）；错题积压时每隔 1 题插一道
    sweep(S); Dy.mistN = Dy.mistN || 0;
    const nextMistake = () => { if (Dy.mistN >= MIST_DAY) return null; const m = dueMistakes(S, day).find(y => room(y.uid)); return m && {kind: 'q', inst: instOfMistake(m), mkey: m.key, seg: 'review'}; };
    const started = sid => K.BY[sid].items.some(it => peek(S, it.id).seen > 0);
    // 学新的：同时最多 2 个技能（理解技能和秒答各占一个，缺一类时另一类补）；一天最多开始 3 个从没练过的技能
    function frontSkills() {
      // 今天这个技能的灰格子都出满了（新题型一次最多 6 题、要攒 8 次，所以常常要两天）→ 让位给下一个技能
      const hasRoom = s => s.items.some(it => lv(S, it.id) === 0 && room(it.id) && !outOf(S, it.id) && itemOn(S, it.id));
      const ok = s => ready(S, s.id) && hasRoom(s) && (started(s.id) || Dy.fresh.includes(s.id) || Dy.fresh.length < NEW_PER_DAY);
      // 防冷落：已经开始学、≥ STALE 天没练的技能排到最前
      const stale = s => { const l = s.items.map(it => lastSeen(peek(S, it.id))).sort().pop(); return started(s.id) && l && C.dayDiff(l, day) >= STALE; };
      const byStale = list => list.filter(stale).concat(list.filter(s => !stale(s)));
      const notKnown = l => l.filter(s => !S.known[s.id]).concat(l.filter(s => S.known[s.id]));   // 摸底判为会的排后面，先学真正新的
      const u = byStale(notKnown(K.understand.filter(ok).concat(hardOn(S).filter(ok)))), sp =
        byStale(K.speed.filter(ok));
      const front = u.slice(0, 1).concat(sp.slice(0, 1));
      for (const s of u.slice(1).concat(sp.slice(1))) { if (front.length >= FRONT) break; front.push(s); }
      const chosen = [];
      for (const s of front.slice(0, FRONT)) {
        // 摸底判为"会"的技能不占"一天最多开始 3 个新技能"的名额（照常从灰开始学，通常一次就过）
        if (!started(s.id) && !S.known[s.id] && !Dy.fresh.includes(s.id)) { if (Dy.fresh.length >= NEW_PER_DAY) continue; Dy.fresh.push(s.id); }
        chosen.push(s);
      }
      return chosen;
    }
    function fillNew() {
      queue = spreadOut(frontSkills().map(s => {
        const gray = s.items.filter(it => lv(S, it.id) === 0 && room(it.id) && itemOn(S, it.id)), out = [];
        const add = it => { const inst = makeLive(S, it.id, r, day); if (inst) out.push({inst, seg: 'new'}); };
        gray.filter(it => !it.gen).slice(0, 6).forEach(add);
        gray.filter(it => it.gen).forEach(it => { for (let k = 0; k < REP[kindOf(it.id)]; k++) add(it); });
        return out;
      }));
    }
    function fillReview() { queue = dueMistakes(S, day).filter(m => room(m.uid)).slice(0, Math.max(0, MIST_DAY - Dy.mistN)).map(m => ({inst: instOfMistake(m), mkey: m.key, seg: 'review'})); }
    function fillFluency() {
      const due = [], learning = [], keep = [];
      K.SKILLS.concat(hardOn(S)).forEach(s => s.items.forEach(it => {
        const p = peek(S, it.id), seen = lastSeen(p);
        if (!room(it.id) || outOf(S, it.id) || !itemOn(S, it.id)) return;
        if (chosen(S)) { learning.push(it); return; }   // 家长手选：这几级的题都能出，不等到期
        if (p.lv === 0 || p.lastDay === day) return;
        if ((p.lv === 1 && p.d[0] < day) || (p.lv === 2 && C.dayDiff(p.d[1], day) >= C.GAP_DAYS)) due.push(it);
        else if (p.lv < 3) learning.push(it);
        else if (!seen || C.dayDiff(seen, day) >= KEEP[Math.min(p.keep || 0, KEEP.length - 1)]) keep.push(it);
      }));
      const old = it => lastSeen(peek(S, it.id));
      const staleIt = it => { const l = old(it); return l && C.dayDiff(l, day) >= STALE ? 0 : 1; };   // 防冷落：≥ STALE 天没练的先出
      // Ben 11-05：时间有限时先出靠后（更难）的技能；≥ STALE 天没练的每 3 格插 1 格防冷落
      const rank = it => K.SKILLS.findIndex(s => s.id === it.skill), hardFirst = (a, b) => rank(b) - rank(a) || old(a).localeCompare(old(b));
      const mix = list => { const st = list.filter(it => !staleIt(it)).sort((a, b) => old(a).localeCompare(old(b))), rest = list.filter(staleIt).sort(hardFirst), out = []; while (st.length || rest.length) { for (let i = 0; i < 2 && rest.length; i++) out.push(rest.shift()); if (st.length) out.push(st.shift()); } return out; };
      due.splice(0, due.length, ...mix(due)); learning.splice(0, learning.length, ...mix(learning));
      keep.sort((a, b) => old(a).localeCompare(old(b)));
      queue = spreadOut(due.concat(learning, keep).map(it => {
        const isKeep = peek(S, it.id).lv === 3;
        return Array.from({length: REP[kindOf(it.id)]}, () => makeLive(S, it.id, r, day)).filter(Boolean).map(inst => ({inst, seg: lv(S, it.id) === 0 ? 'new' : 'fluency', keep: isKeep}));   // 灰的（手选时才有）算新题，第一次有示范卡
      }));
    }
    function advance() {
      if (Dy.seg === 'new') {
        {
          if (Dy.newEnd == null) Dy.newEnd = Dy.sec + NEW_SEC;
          if (Dy.sec < Dy.newEnd) { if (!queue.length) fillNew(); if (queue.length) return true; }
        }
        Dy.seg = 'fluency'; queue = [];
      }
      if (!queue.length) fillFluency();
      // 别的都做完了还有时间：今天还行（合格 ≥ 60%）就接着学新的，把 10 分钟用满（Ben 11-05：不要老是最简单的题）
      if (!queue.length && Dy.tally.n >= 5 && Dy.tally.pass / Dy.tally.n >= 0.6) fillNew();
      // 别的题都出完了、还有到期错题：接着复习
      if (!queue.length && dueCount(S, day) && Dy.mistN < MIST_DAY) fillReview();
      return queue.length > 0;
    }
    const api = {
      get elapsed() { return Dy.sec; }, get done() { return Dy.done; }, get tally() { return Dy.tally; },
      next() {
        if (pending.length) { cur = pending.shift(); return cur; }
        if (Dy.sec < Dy.budget) {
          const rt = RT.due(false); if (rt) { cur = rt; return cur; }
          if (Dy.sinceM >= (dueCount(S, day) > BACKLOG ? 1 : MIST_EVERY)) { const m = nextMistake(); if (m) { Dy.sinceM = 0; cur = m; return cur; } }
        }
        for (let guard = 0; guard < 6; guard++) {
          if (Dy.sec >= Dy.budget) { finished(); cur = null; return null; }
          if (!advance()) { const rt = RT.due(true); if (rt) { cur = rt; return cur; } finished(); cur = null; return null; }
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
        finished(); cur = null; return null;
      },
      inject(x) { cur = x; },             // 测试用：直接指定当前题
      answer(res) {
        if (!cur || cur.kind !== 'q') return null;
        const x = cur; cur = null;
        Dy.asked[x.inst.id] = (Dy.asked[x.inst.id] || 0) + 1;
        recent.push(K.ITEM[x.inst.id].skill); const again = RT.answered(x, res);
        if (x.seg !== 'review' && !x.retry) Dy.sinceM++;
        if (x.mkey) Dy.mistN++;
        const out = settle(S, x, asRetry(x, res), day, sec => { Dy.sec += sec; }); out.again = again;
        if (!out.peeked && !x.retry) { Dy.tally.n++; if (out.pass) Dy.tally.pass++; }
        if (Dy.sec >= Dy.budget) Dy.done = true;
        return out;
      },
    };
    return api;
  }

  // 「今天练完啦」以后还能不能排出题：决定显示不显示「再练一会」（在副本上试排，不改存档）
  function hasMore(S, day, extra) {
    const T = JSON.parse(JSON.stringify(S));
    return !!session(T, day, {extra: extra || 300}).next();
  }

  // 技能组：look / bond / place / cmp / line；秒答按级别 speed:L1…L4；也可以直接给技能编号
  const inGroup = (s, g) => s.group === g || s.id === g || (s.speed && g === 'speed:L' + (s.L + 1));
  // ---------- 自由加练：技能组地图「练这个」，12 题；规则同今日练习，计入用时统计，不计入今日 10 分钟 ----------
  // opts.mistOnly：错题本「复习这一组」，只出这一组的到期错题，出完就停
  function free(S, day, group, opts) {
    opts = opts || {};
    const r = opts.rnd || Math.random, n = opts.n || (opts.mistOnly ? Infinity : FREE_N);
    topMemo = null;
    S.demoSeen = S.demoSeen || {}; S.known = S.known || {}; sweep(S);
    const skills = hardOn(S).concat(K.SKILLS).filter(s => inGroup(s, group)), inSet = id => skills.includes(skillOf(id));
    const FREE_EXTRA = 6, asked = {}, recent = [], pick = picker(S, asked, recent, FREE_EXTRA);
    let since = 0;
    const mist = dueMistakes(S, day, inSet).map(m => ({inst: instOfMistake(m), mkey: m.key, seg: 'review'}));
    // Ben 11-05：12 题不许被第一个技能占满：能练的技能轮流出，靠后（更难）的先；同一技能里灰的先、久没练的先
    // 题不够一组：同题型多出几道（不超过当天上限），还不够再按从易到难带上后面的技能
    const byIt = (a, b) => (lv(S, a.id) - lv(S, b.id)) || lastSeen(peek(S, a.id)).localeCompare(lastSeen(peek(S, b.id)));
    const rd = skills.filter(s => ready(S, s.id)), tiers = [rd.slice().reverse()].concat(skills.filter(s => !rd.includes(s)).map(s => [s]));
    const queue = [], seg = it => (lv(S, it.id) === 0 ? 'new' : 'fluency');
    if (!opts.mistOnly) for (const tier of tiers) {
      if (queue.length >= n) break;
      const its = spreadOut(tier.map(s => s.items.filter(it => !outOf(S, it.id) && itemOn(S, it.id)).sort(byIt)));
      queue.push(...spreadOut(its.map(it => Array.from({length: REP[kindOf(it.id)]}, () => makeLive(S, it.id, r, day)).filter(Boolean).map(inst => ({inst, seg: seg(it)})))));
      for (let more = true; queue.length < n && more;) {
        more = false; const per = {}; queue.forEach(x => { per[x.inst.id] = (per[x.inst.id] || 0) + 1; });
        its.forEach(it => { if (queue.length >= n || !it.gen || (per[it.id] || 0) >= MAXPER[kindOf(it.id)] + FREE_EXTRA) return; const inst = makeLive(S, it.id, r, day); if (inst) { queue.push({inst, seg: 'fluency'}); more = true; } });
      }
    }
    let cur = null, count = 0;
    const pending = [], RT = retrier(S, {}, id => (asked[id] || 0) < MAXPER[kindOf(id)] + RETRY_EXTRA + (K.ITEM[id].gen ? FREE_EXTRA : 0));
    return {
      next() {
        if (pending.length) { cur = pending.shift(); return cur; }
        const rt = RT.due(count >= n); if (rt) { cur = rt; return cur; }
        let x = null;
        if (count < n) {   // 错题穿插：每 2 道别的题插 1 道；别的题出完了就接着出错题
          if (since >= MIST_EVERY && mist.length) { x = pick(mist); if (x) since = 0; }
          if (!x) x = pick(queue) || pick(mist);
        }
        if (!x) { cur = RT.due(true); return cur; }        // 题出完了：收尾再来一次（见 retrier）
        const sid = K.ITEM[x.inst.id].skill;
        if (lv(S, x.inst.id) === 0 && !S.demoSeen[sid] && !S.known[sid]) {
          stat(S, day).sec += DEMO_SEC;
          pending.push(Object.assign({kind: 'q', afterDemo: sid}, x)); cur = {kind: 'demo', skill: sid}; return cur;
        }
        cur = Object.assign({kind: 'q'}, x); return cur;
      },
      answer(res) {
        if (!cur || cur.kind !== 'q') return null;
        const x = cur; cur = null;
        if (!x.retry) count++;
        if (x.seg !== 'review' && !x.retry) since++;
        asked[x.inst.id] = (asked[x.inst.id] || 0) + 1;
        recent.push(K.ITEM[x.inst.id].skill); const again = RT.answered(x, res);
        const out = settle(S, x, asRetry(x, res), day); out.again = again;
        return out;
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
        // 3 题不放回抽：卡多的技能抽 3 张不同的卡；只有一个题型时同一题型出 3 次（每次数字不同）
        const items = c[m].items, bag = items.slice(), qs = [];
        for (let k = 0; k < PROBE; k++) {
          if (!bag.length) bag.push(...items);
          qs.push(K.make(bag.splice(Math.floor(r() * bag.length), 1)[0].id, r));
        }
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

  return {BUDGET, NEW_SEC, BACKLOG, KEEP, REP, MAXPER, kindOf,
    chosen, autoLevel: S => { topMemo = null; return autoLevel(S); }, levelOn, itemOn, mistOn, groupEmpty, learnedOn, hardOn, activeItem,
    prog: (S, id) => { topMemo = null; return prog(S, id); }, peek, lv, needFast, learned, ready, record, isKnown, noteAnswer, noteInk, noteSay, habit, addMistake, dueMistakes, session, free, placement, trimStats, stat, gapNow,
    hasMore, addTime, inGroup, lastSeen, GROUPS, FAST_OUT, MIST_DAY, spent, spentCount, outOf, addFast, sweep, groupOut, allOut,
    review: (S, day, group, opts) => free(S, day, group, Object.assign({mistOnly: true}, opts))};
});
