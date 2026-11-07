// 空空数学岛 · 宝石碎片和锻造（纯逻辑，无 DOM）。规则：~/01_业务/个人项目/空空矿场/docs/说明书-宝石规则.md
// 数据存独立的键 speedmap.gems，清空和导入进度都不碰它（进度副本会一起备份）
// 浏览器里挂到 window.GEMS（依赖 window.SKILLS、window.ENGINE），node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./skills.js'), require('./engine.js'));
  else root.GEMS = factory(root.SKILLS, root.ENGINE);
})(typeof self !== 'undefined' ? self : this, function (K, E) {
  'use strict';
  const KEY = 'speedmap.gems';
  // 杂色碎片（Ben 11-07）：印 4、6、7、8、12、13，给孩子自己凑 100 做算数。数量要少，核心还是普通碎片
  const VALUE = {s: 5, m: 10, l: 50, o4: 4, o6: 6, o7: 7, o8: 8, o12: 12, o13: 13}, ODD = ['o4', 'o6', 'o7', 'o8', 'o12', 'o13'], ODD_RATE = 0.1, ODD_OF = {s: ['o4', 'o6', 'o7', 'o8'], m: ['o8', 'o12', 'o13']};
  const GEM = 100, SLOTS = 12, DAY_MAX = 30, CH_N = 5, CLAIM_DAYS = 7, KEEP_DAYS = 14, RECENT_DAYS = 14;
  // 奖励数值都在这里，由 tools/sim-gems.js 校准到 2～3 分钟换 1 颗（Ben 11-07）
  const TUNE = {
    midLv: 1, bonus: 0.1,                       // 中碎片：还没学稳的格子（格子档位 < midLv）；认真奖励比例
    critAt: 600, critAt2: 1200, crit1: 0.02, crit2: 0.03, critAcc: 0.7,   // 暴击：有效学习满 10 分钟 / 20 分钟后的概率；正确率门槛
    gapMin: 150, gapMax: 240,                    // 两次弹出之间的有效学习秒数
    offerSec: 20, dblSec: 45, dblMax: 4, dblMinN: 3,   // 双倍挑战：20 秒内点才算；限时秒数；每天次数；题数下限
    qcSec: 180, qcMax: 2, qcShare: 0.4, qcMinN: 6, qcMaxN: 24,   // 限时挑战：3 分钟；每天次数；题数范围
    h0: 0.85, hUp: 0.03, hDown: 0.07, hMin: 0.5, hMax: 1.1, stretch: 0.25,   // 难度：赢了略难、输了略易，稳定在约 70% 完成（0.03 ÷ 0.1 = 30% 完不成）；稍难题比例
    restAt: 1800, restSec: 300, restGrace: 30,   // 连续有效学习 30 分钟：30 秒内结束，休息 5 分钟
  };
  const BOLT = 0.6, BOLT_DAY = 20;   // 闪电秒答：用时不到秒答时间的 60%，多得 1 个中碎片，一天最多 20 个（小碎片单独炼不出宝石，给小的等于没奖励）
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
    if (!Object.keys(inv).filter(t => VALUE[t]).every(t => Number.isInteger(inv[t]) && inv[t] >= 0) || !isObj(seen.keys) || !isObj(seen.cells)) return null;
    if (!Object.values(o.days || {}).every(isObj) || (o.tickets !== undefined && !Number.isInteger(o.tickets))) return null;
    return Object.assign(b, o, {inv, seen});
  }
  function prune(st, today) {
    const old = Object.keys(st.days).filter(d => d <= today).sort();
    old.slice(0, Math.max(0, old.length - KEEP_DAYS)).forEach(d => { delete st.days[d]; delete st.sent[d]; if (st.palJar && st.palJar.moved) delete st.palJar.moved[d]; });
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
  // o = {day, inst, ok, slow, top, lv, dunno, peeked, oral, retry, mistake, guard}；slow = 答对但没秒答：只给 1 个小碎片
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
    if (o.slow) { st.inv.s++; return 's'; }
    const cell = cellOf(o), first = !seen.cells[cell];
    seen.cells[cell] = 1;
    const mid = o.mistake || (first && (o.lv < TUNE.midLv || K_levelOf(o.inst) >= o.top));
    const cc = critChance(D), crit = cc > 0 && !!o.rand && o.rand() < cc;
    const got = crit ? 'l' : oddFor(mid ? 'm' : 's', o.rand);
    st.inv[got] = (st.inv[got] || 0) + 1;
    if (mid) D.m++;
    if (crit) D.crit = (D.crit || 0) + 1;
    return got;
  }
  // 暴击：当天有效学习满 10 分钟开启，满 20 分钟更多；正确率不够不暴击
  function critChance(D) {
    const sec = D.sec || 0, n = D.ok + D.bad;
    if (sec < TUNE.critAt || !n || D.ok / n < TUNE.critAcc) return 0;
    return sec < TUNE.critAt2 ? TUNE.crit1 : TUNE.crit2;
  }
  function addSec(st, day, secs) { const D = dayOf(st, day); D.sec = (D.sec || 0) + Math.max(0, secs || 0); return D.sec; }
  // ---------- 练习中弹出：只决定什么时候弹，挑战本身是独立的小关 ----------
  // eff = 当天有效学习秒数（发呆不增长，所以发呆不弹）；t = 时钟秒数（20 秒倒计时用）
  function eventStep(st, day, run, eff, t, rand) {
    const D = dayOf(st, day), ev = run.ev = run.ev || {next: eff + TUNE.gapMin * 0.8 + rand() * (TUNE.gapMax - TUNE.gapMin), offer: null};
    const out = {};
    if (ev.offer && t >= ev.offer.until) { ev.offer = null; out.missed = true; }
    if (!ev.offer && eff >= ev.next && !restDue(st)) {
      ev.next = eff + TUNE.gapMin + rand() * (TUNE.gapMax - TUNE.gapMin);
      const qcOk = (D.qc || 0) < TUNE.qcMax, dblOk = (D.dbl || 0) < TUNE.dblMax;
      const kind = qcOk && (!dblOk || rand() < TUNE.qcShare) ? 'qc' : dblOk ? 'dbl' : null;
      if (kind) { ev.offer = {kind, until: t + TUNE.offerSec, n: evTarget(st, kind).n}; out.offer = ev.offer; }
    }
    return out;
  }
  function acceptOffer(run, t) {
    const ev = run.ev, o = ev && ev.offer;
    if (!o || t >= o.until) return null;
    ev.offer = null; return o.kind;
  }
  // ---------- 挑战的数据和算法。存在 st.ev：h 难度系数（每种挑战一个）、sec/acc 空空最近的速度和正确率、log 最近 60 次记录 ----------
  function evState(st) { if (!isObj(st.ev)) st.ev = {}; const e = st.ev; if (!isObj(e.h)) e.h = {}; e.log = Array.isArray(e.log) ? e.log.filter(isObj) : []; if (!Number.isFinite(e.sec)) e.sec = 8; if (!Number.isFinite(e.acc)) e.acc = 0.85; return e; }
  // 每答一题更新速度和正确率：越近的题权重越大
  function notePace(st, secs, ok) { const e = evState(st); e.sec += (Math.min(30, Math.max(1, secs || 8)) - e.sec) * 0.1; e.acc += ((ok ? 1 : 0) - e.acc) * 0.1; }
  const evHard = (st, kind) => { const h = evState(st).h[kind]; return typeof h === 'number' ? h : TUNE.h0; };
  // 题数 = 限时内按空空最近的速度能答对的题数 × 难度系数
  function evTarget(st, kind) {
    const e = evState(st), T = kind === 'dbl' ? TUNE.dblSec : TUNE.qcSec, lo = kind === 'dbl' ? TUNE.dblMinN : TUNE.qcMinN;
    return {T, n: Math.max(lo, Math.min(TUNE.qcMaxN, Math.round(T / e.sec * e.acc * evHard(st, kind))))};
  }
  // 出题：开头 2 道会的先稳住信心，之后约 1/4 稍难。会的 = 学过且不超过当前级别；稍难 = 高 1 级或没学过的格子
  function pickEv(S, st, want, top, r) {
    const seen = (st.seen && st.seen.keys) || {}, used = {}, out = [];
    const items = K.SKILLS.concat(K.HARD).flatMap(x => x.items).filter(it => (E.itemOn(S, it.id) || K.itemLevels(it.id).some(L => L <= top + 1)) && taught(S, it));
    for (let i = 0; i < want && items.length; i++) {
      const stretch = i >= 2 && r() < TUNE.stretch; let got = null, loose = null;
      for (let tries = 0; tries < 60 && !got; tries++) {
        const it = items[Math.floor(r() * items.length)]; let inst; try { inst = K.make(it.id, r); } catch (e) { continue; }
        const L = K.levelOf(inst), k = key(inst), lv = E.lv(S, inst.id);
        if (used[k] || seen[k] || E.spent(S, inst) || L > top + 1) continue;
        if (L <= top && !loose) loose = inst;
        if (stretch ? (L > top || lv === 0) : (L <= top && lv >= 1)) got = inst;
      }
      got = got || loose; if (!got) break;
      used[key(got)] = 1; out.push(got);
    }
    return out;
  }
  function evStart(st, day, kind, retry) { const D = dayOf(st, day); if (!retry) { if (kind === 'dbl') D.dbl = (D.dbl || 0) + 1; else D.qc = (D.qc || 0) + 1; } }
  // 结束：赢了略难、输了略易；发奖；记录。限时挑战发 1 颗宝石，双倍挑战把这一关得的碎片再给一份
  function evEnd(st, day, o) {
    const e = evState(st), D = dayOf(st, day), won = o.done >= o.n;
    const h = evHard(st, o.kind) + (won ? TUNE.hUp : -TUNE.hDown); e.h[o.kind] = Math.round(Math.max(TUNE.hMin, Math.min(TUNE.hMax, h)) * 1000) / 1000;
    e.log.push({day, kind: o.kind, n: o.n, done: o.done, won: won ? 1 : 0, retry: o.retry ? 1 : 0}); if (e.log.length > 60) e.log.splice(0, e.log.length - 60);
    let gem = 0, bonus = 0;
    if (won && o.kind === 'qc' && D.forged < DAY_MAX) { D.forged++; D.qcWon = (D.qcWon || 0) + 1; gem = 1; }
    if (won && o.kind === 'dbl') Object.keys(o.earned || {}).forEach(t => { if (VALUE[t]) { st.inv[t] = (st.inv[t] || 0) + o.earned[t]; bonus += o.earned[t]; } });
    return {won, gem, bonus};
  }
  function evStats(st) {
    const e = evState(st), l = e.log, won = l.filter(x => x.won).length;
    return {n: l.length, won, rate: l.length ? won / l.length : 0, dbl: evHard(st, 'dbl'), qc: evHard(st, 'qc'), sec: e.sec, acc: e.acc};
  }
  // ---------- 连续学习 30 分钟休息 5 分钟。存盘，刷新不能跳过 ----------
  function restState(st) { if (!isObj(st.rest)) st.rest = {sec: 0, at: 0, until: 0}; const r = st.rest; ['sec', 'at', 'until'].forEach(k => { if (!Number.isFinite(r[k])) r[k] = 0; }); return r; }
  function noteRest(st, secs, now) { const r = restState(st); if (r.at && now - r.at >= TUNE.restSec) r.sec = 0; r.sec += Math.max(0, secs || 0); r.at = now; return r.sec; }
  const restDue = st => restState(st).sec >= TUNE.restAt;
  function startRest(st, now) { const r = restState(st); r.sec = 0; r.at = now; r.until = now + TUNE.restSec; }
  const restLeft = (st, now) => { const l = restState(st).until - now; return l > 0 && l <= TUNE.restSec ? l : 0; };   // 时钟回拨导致超过 5 分钟：按已结束算，不能卡死
  // 退出时的提示：差 5 分钟内 → 提示开启暴击时间；已开启且还有次数 → 给 1 次双倍挑战；其他不弹
  function exitOffer(st, day) {
    if (restDue(st)) return null;
    const D = dayOf(st, day), left = TUNE.critAt - (D.sec || 0);
    if (left > 300) return null;
    if (left > 0) return {kind: 'crit', mins: Math.max(1, Math.ceil(left / 60))};
    return (D.dbl || 0) < TUNE.dblMax && !D.exitDbl ? {kind: 'dbl'} : null;
  }
  // 小碎片、中碎片有 10% 换成价值相近的杂色碎片；大碎片不换。不给随机数就不换
  function oddFor(t, rand) {
    const list = ODD_OF[t];
    if (!list || !rand || rand() >= ODD_RATE) return t;
    return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
  }
  // 秒答且这题得了碎片才调：多发 1 个小碎片，闪电秒答再发 1 个中碎片（一天最多 BOLT_DAY 个）；返回 {extra, bolt}
  function speedBonus(st, day, fast) {
    const D = dayOf(st, day), bolt = !!fast && (D.bolt || 0) < BOLT_DAY;
    st.inv.s++;
    if (bolt) { D.bolt = (D.bolt || 0) + 1; st.inv.m++; }
    return {extra: 1, bolt};
  }
  const K_levelOf = inst => { try { return K.ITEM[inst.id] ? K.levelOf(inst) : 0; } catch (e) { return 0; } };

  // 结算：认真奖励发差额，只加不扣
  function settle(st, day) {
    const D = dayOf(st, day), n = D.ok + D.bad, acc = n ? D.ok / n : 0;
    const want = Math.round(D.m * TUNE.bonus * Math.min(1, Math.max(0, (acc - 0.7) / 0.3)));
    const bonus = Math.max(0, want - D.paid);
    D.paid += bonus; st.inv.m += bonus;
    return {bonus, stars: acc >= 0.95 ? 3 : acc >= 0.85 ? 2 : acc > 0.7 ? 1 : 0};
  }

  // ---------- 锻造：炉子最多 12 个，一炉一颗，多的变废料；不够也开炉，全部变废料（开炉前由界面提醒） ----------
  const sum = r => Object.keys(r).reduce((n, t) => n + r[t] * VALUE[t], 0);
  const count = r => Object.keys(r).reduce((n, t) => n + r[t], 0);
  const enough = r => sum(r) >= GEM;
  const dayFull = (st, day) => !!st.days[day] && st.days[day].forged >= DAY_MAX;
  function forge(st, r, day) {
    const bad = Object.keys(r).some(t => !VALUE[t] || !Number.isInteger(r[t]) || r[t] < 0 || r[t] > (st.inv[t] || 0));
    if (bad) return {ok: false, why: 'lack'};
    if (count(r) > SLOTS) return {ok: false, why: 'full'};
    const v = sum(r);
    if (v === 0) return {ok: false, why: 'empty'};
    const D = dayOf(st, day);
    if (D.forged >= DAY_MAX) return {ok: false, why: 'daily'};
    Object.keys(r).forEach(t => { st.inv[t] = (st.inv[t] || 0) - r[t]; });
    const gems = v >= GEM ? 1 : 0, waste = gems ? v - GEM : v;
    D.forged += gems; D.waste += waste;
    return {ok: true, gems, waste};
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
    D.ok++;
    if (o.slow) { st.inv.s++; return 's'; }   // 挑战题慢答：答对也有，但不算过
    st.inv.m++;
    return 'm';
  }
  function finishChallenge(st, o) {
    const big = o.n === CH_N && o.won === CH_N;
    if (big) st.inv.l++;
    return {big};
  }
  // 出题：高 1～2 级（到顶时第 14、15 级）；没下架、今天没作答过、互不重复
  // 挑战不出还没讲过的概念（第二批：线段图、条形图、周长等要先看讲解卡，代码审查 R1 第 3 条）
  const taught = (S, it) => { const c = K.BY[it.skill].concept, seen = S.demoSeen || {}; return !c || !!seen['c:' + c] || !!seen[it.skill] || !!(S.known && S.known[it.skill]) || E.lv(S, it.id) > 0; };   // 看过讲解卡、看过旧示范卡、摸底会、点亮过，任一条都算讲过（代码审查 R2）
  function pickChallenge(S, topLevel, r, st) {
    const hi = topLevel < 10 ? Math.min(topLevel + 2, 9) : Math.min(topLevel + 2, 15), lo = Math.min(topLevel + 1, 14, hi), seen = (st && st.seen.keys) || {};
    const items = K.SKILLS.concat(K.HARD).flatMap(s => s.items).filter(it => K.itemLevels(it.id).some(L => L >= lo && L <= hi) && taught(S, it));
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
  // 伙伴罐（小伙伴乐园买吃喝的宝石，方块世界只读写 bal 和 target）：领取前从待领里留一部分；矿场记的是减掉留下后的净值
  // 设计和反例：~/03_个人/测试/minecraft-web/docs/DESIGN-V5-小伙伴乐园.md §3、tools/pal-jar-sim.js
  const jarOf = st => (st.palJar && st.palJar.bal !== undefined ? st.palJar : (st.palJar = Object.assign({bal: 0, moved: {}, target: 0, res: {day: '', n: 0}}, st.palJar)));
  const net = (st, d) => st.days[d].forged - ((st.palJar && st.palJar.moved && st.palJar.moved[d]) || 0);
  const items = (st, today) => recentDays(st, today).map(d => { const D = st.days[d]; return `${compact(d)}.${net(st, d)}.${D.ok}.${D.n}`; }).join(',');
  const netTotal = (st, today) => recentDays(st, today).reduce((n, d) => n + Math.max(0, net(st, d)), 0);
  // 只决定按钮显示「领宝石」还是「再领一次」：页面拿不到矿场是否入账，所以不能用它决定报什么
  // 近 14 天炼出（含今天）。记录只留 14 天，所以不做总数；宝石总数以矿场为准
  function recentForged(st, today) {
    const t = new Date(today + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - (RECENT_DAYS - 1));
    const earliest = t.toISOString().slice(0, 10);
    return Object.keys(st.days).reduce((n, d) => (d >= earliest && d <= today ? n + (st.days[d].forged || 0) : n), 0);
  }
  const unsent = (st, today) => recentDays(st, today).reduce((n, d) => n + Math.max(0, net(st, d) - (st.sent[d] || 0)), 0);
  function markSent(st, today) { recentDays(st, today).forEach(d => { st.sent[d] = net(st, d); }); }
  function moveToJar(st, today, n) {   // 从最早有余量的日子移入
    const J = jarOf(st); J.moved = J.moved || {}; let left = n;
    recentDays(st, today).reverse().forEach(d => { const room = Math.max(0, net(st, d) - (st.sent[d] || 0)), k = Math.min(room, left); if (k > 0) { J.moved[d] = (J.moved[d] || 0) + k; J.bal += k; left -= k; } });
    return n - left;
  }
  // 这次该留几颗：不超过目标缺口；一天最多留待领的一半（至少 1 颗）。只算不写，按钮文字也用它
  function jarWant(st, today) {
    const J = st.palJar || {}, wait = unsent(st, today), done = J.res && J.res.day === today ? J.res.n : 0;
    return Math.min(Math.max(0, (J.target || 0) - (J.bal || 0)), Math.max(0, Math.max(1, Math.floor(wait / 2)) - done), wait);
  }
  function reserve(st, today) {
    const n = jarWant(st, today); if (!n) return 0;
    const J = jarOf(st); if (!J.res || J.res.day !== today) J.res = {day: today, n: 0};
    const got = moveToJar(st, today, n); J.res.n += got;
    return got;
  }

  return {TUNE, critChance, addSec, eventStep, acceptOffer, notePace, evTarget, pickEv, evStart, evEnd, evStats, evHard, noteRest, restDue, startRest, restLeft, exitOffer, BOLT, BOLT_DAY, speedBonus, KEY, VALUE, ODD, ODD_RATE, oddFor, GEM, SLOTS, DAY_MAX, CH_N, RECENT_DAYS, recentForged, blank, parse, prune, key, sync, top, levelOfCell, answer, settle, enough, dayFull, forge, bestRecipe,
    earnTicket, startChallenge, challengeAnswer, finishChallenge, pickChallenge, items, unsent, markSent, netTotal, moveToJar, jarWant, reserve};
});
