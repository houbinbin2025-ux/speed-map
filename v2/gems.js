// 空空数学岛 · 宝石碎片和锻造（纯逻辑，无 DOM）。规则：~/01_业务/个人项目/空空矿场/docs/说明书-宝石规则.md
// 只在 iPad App 里用；数据存独立的键 speedmap.gems，清空和导入进度都不碰它（进度副本会一起备份）
// 浏览器里挂到 window.GEMS（依赖 window.SKILLS、window.ENGINE），node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./skills.js'), require('./engine.js'));
  else root.GEMS = factory(root.SKILLS, root.ENGINE);
})(typeof self !== 'undefined' ? self : this, function (K, E) {
  'use strict';
  const KEY = 'speedmap.gems';
  const VALUE = {s: 5, m: 10, l: 50}, GEM = 100, SLOTS = 12, DAY_MAX = 30, CH_N = 5, CLAIM_DAYS = 7, KEEP_DAYS = 14;
  const blank = () => ({v: 1, inv: {s: 0, m: 0, l: 0}, tickets: 0, best: 0, lvMax: {}, days: {}, seen: {day: '', keys: {}, cells: {}}, sent: {}});
  const blankDay = () => ({ok: 0, bad: 0, n: 0, m: 0, paid: 0, forged: 0, waste: 0});
  const dayOf = (st, day) => st.days[day] || (st.days[day] = blankDay());

  // 没存过 → 空白；损坏 → null（调用方用副本恢复，不能当空白覆盖）
  const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  function parse(text) {
    if (text === null || text === undefined) return blank();
    let o; try { o = JSON.parse(text); } catch (e) { return null; }
    if (!isObj(o)) return null;
    // 字段类型不对也算损坏：碎片数据出问题不能挡住练习
    const has = k => o[k] === undefined || isObj(o[k]);
    if (!['inv', 'days', 'seen', 'lvMax', 'sent'].every(has)) return null;
    const b = blank(), inv = Object.assign(b.inv, o.inv), seen = Object.assign(b.seen, o.seen);
    if (!['s', 'm', 'l'].every(t => Number.isInteger(inv[t]) && inv[t] >= 0) || !isObj(seen.keys) || !isObj(seen.cells)) return null;
    if (!Object.values(o.days || {}).every(isObj) || (o.tickets !== undefined && !Number.isInteger(o.tickets))) return null;
    return Object.assign(b, o, {inv, seen});
  }
  function prune(st, today) {
    const old = Object.keys(st.days).filter(d => d <= today).sort();
    old.slice(0, Math.max(0, old.length - KEEP_DAYS)).forEach(d => { delete st.days[d]; delete st.sent[d]; });
  }

  // 去重 key：和秒答下架同一个编号（秒答题型只看两个数，老流程的题没有 op）
  function key(inst) {
    return K.ITEM[inst.id] ? E.qkey(inst) : inst.id;
  }
  const cellOf = o => o.cell || o.inst.id;
  function seenToday(st, day) {
    if (st.seen.day !== day) st.seen = {day, keys: {}, cells: {}};
    return st.seen;
  }

  // 每格到过的最高档位、历史最高级别：页面加载时、清空和整份替换之前同步。清空也不重置，所以清空刷不了中碎片
  function sync(st, S, auto) {
    [S.cards, S.skills].forEach(o => Object.keys(o || {}).forEach(id => { const lv = o[id] && o[id].lv || 0; if (lv > (st.lvMax[id] || 0)) st.lvMax[id] = lv; }));
    if (auto > st.best) st.best = auto;
  }
  const top = (st, auto) => Math.max(st.best, auto);
  const levelOfCell = (st, S, id) => Math.max(st.lvMax[id] || 0, ((S.cards || {})[id] || (S.skills || {})[id] || {}).lv || 0);

  // 记一次作答，返回得到的碎片 's' | 'm' | null。判定一出来就调，在显示答案之前
  // o = {day, inst, ok, top, lv, dunno, peeked, oral, retry, mistake, guard}
  function answer(st, o) {
    if (o.oral || o.retry) return null;
    const seen = seenToday(st, o.day), k = key(o.inst);
    if (seen.keys[k]) return null;
    seen.keys[k] = 1;
    const D = dayOf(st, o.day);
    D.n++;
    if (o.peeked || o.dunno) return null;
    if (!o.ok) { D.bad++; return null; }
    D.ok++;
    if (o.guard) return null;
    const cell = cellOf(o), first = !seen.cells[cell];
    seen.cells[cell] = 1;
    const mid = o.mistake || (first && (o.lv < 2 || K_levelOf(o.inst) >= o.top));
    st.inv[mid ? 'm' : 's']++;
    if (mid) D.m++;
    return mid ? 'm' : 's';
  }
  const K_levelOf = inst => { try { return K.ITEM[inst.id] ? K.levelOf(inst) : 0; } catch (e) { return 0; } };

  // 结算：认真奖励发差额，只加不扣
  function settle(st, day) {
    const D = dayOf(st, day), n = D.ok + D.bad, acc = n ? D.ok / n : 0;
    const want = Math.round(D.m * 0.25 * Math.min(1, Math.max(0, (acc - 0.7) / 0.3)));
    const bonus = Math.max(0, want - D.paid);
    D.paid += bonus; st.inv.m += bonus;
    return {bonus, stars: acc >= 0.95 ? 3 : acc >= 0.85 ? 2 : acc > 0.7 ? 1 : 0};
  }

  // ---------- 锻造：炉子最多 12 个，一炉一颗，多的变废料；不够就退回 ----------
  const sum = r => r.s * VALUE.s + r.m * VALUE.m + r.l * VALUE.l;
  function forge(st, r, day) {
    const bad = ['s', 'm', 'l'].some(t => !Number.isInteger(r[t]) || r[t] < 0 || r[t] > st.inv[t]);
    if (bad) return {ok: false, why: 'lack'};
    if (r.s + r.m + r.l > SLOTS) return {ok: false, why: 'full'};
    const v = sum(r);
    if (v < GEM) return {ok: false, why: 'short', short: GEM - v};
    const D = dayOf(st, day);
    if (D.forged >= DAY_MAX) return {ok: false, why: 'daily'};
    ['s', 'm', 'l'].forEach(t => { st.inv[t] -= r[t]; });
    D.forged++; D.waste += v - GEM;
    return {ok: true, gems: 1, waste: v - GEM};
  }
  // 一炉正好 100、尽量多用小碎片的配方；没有就返回 null
  function bestRecipe(inv) {
    let best = null;
    for (let l = 0; l <= Math.min(2, inv.l); l++) for (let m = 0; m <= Math.min(10, inv.m); m++) {
      const s = (GEM - l * VALUE.l - m * VALUE.m) / VALUE.s;
      if (s < 0 || s > inv.s || l + m + s > SLOTS) continue;
      if (!best || s > best.s || (s === best.s && m > best.m)) best = {s, m, l};
    }
    return best;
  }

  // ---------- 挑战：券只能靠做完今日练习或再练一会拿；进入就扣 ----------
  function earnTicket(st, o) {
    if (o.oral || !o.done || o.n < 10) return false;
    st.tickets++; return true;
  }
  function startChallenge(st) { if (st.tickets < 1) return false; st.tickets--; return true; }
  function challengeAnswer(st, o) {
    if (o.oral) return null;
    const seen = seenToday(st, o.day), k = key(o.inst);
    if (seen.keys[k]) return null;
    seen.keys[k] = 1;
    const D = dayOf(st, o.day);
    D.n++;
    if (o.dunno) return null;
    if (!o.ok) { D.bad++; return null; }
    D.ok++; st.inv.m++;
    return 'm';
  }
  function finishChallenge(st, o) {
    const big = o.n === CH_N && o.won === CH_N;
    if (big) st.inv.l++;
    return {big};
  }
  // 出题：高 1～2 级（到顶时第 14、15 级）；没下架、今天没作答过、互不重复
  function pickChallenge(S, topLevel, r, st) {
    const lo = Math.min(topLevel + 1, 14), hi = Math.min(topLevel + 2, 15), seen = (st && st.seen.keys) || {};
    const items = K.SKILLS.concat(K.HARD).flatMap(s => s.items).filter(it => K.itemLevels(it.id).some(L => L >= lo && L <= hi));
    const out = [], used = {};
    for (let tries = 0; out.length < CH_N && tries < 2000 && items.length; tries++) {
      const it = items[Math.floor(r() * items.length)], inst = K.make(it.id, r), L = K.levelOf(inst), k = key(inst);
      if (L < lo || L > hi || used[k] || seen[k] || E.spent(S, inst)) continue;
      used[k] = 1; out.push(inst);
    }
    return out;
  }

  // ---------- 领取：每次报近 7 天每天炼出多少，矿场只补差额 ----------
  const compact = d => d.replace(/-/g, '');
  function recentDays(st, today) {
    const t = new Date(today + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - CLAIM_DAYS);
    const earliest = t.toISOString().slice(0, 10);
    return Object.keys(st.days).filter(d => d >= earliest && d <= today && st.days[d].forged > 0).sort().reverse().slice(0, 8);
  }
  const items = (st, today) => recentDays(st, today).map(d => { const D = st.days[d]; return `${compact(d)}.${D.forged}.${D.ok}.${D.n}`; }).join(',');
  // 只决定按钮显示「领宝石」还是「再领一次」：页面拿不到矿场是否入账，所以不能用它决定报什么
  const unsent = (st, today) => recentDays(st, today).reduce((n, d) => n + Math.max(0, st.days[d].forged - (st.sent[d] || 0)), 0);
  function markSent(st, today) { recentDays(st, today).forEach(d => { st.sent[d] = st.days[d].forged; }); }

  return {KEY, VALUE, GEM, SLOTS, DAY_MAX, CH_N, blank, parse, prune, key, sync, top, levelOfCell, answer, settle, forge, bestRecipe,
    earnTicket, startChallenge, challengeAnswer, finishChallenge, pickChallenge, items, unsent, markSent};
});
