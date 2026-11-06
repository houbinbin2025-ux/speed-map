// 空空数学岛 · 碎片、锻造台、挑战的界面。规则都在 gems.js，这里只管显示和存取
// 只在 iPad App 里开（测试：网址带 ?gems=1 且 #test）
(function () {
  'use strict';
  const G = window.GEMS, KM = window.KM;
  const NAME = {s: '小碎片', m: '中碎片', l: '大碎片'};
  const chip = t => `<i class="frag ${t}">${G.VALUE[t]}</i>`;
  let c = null, st = null, on = false, slots = [], back = 'island', msg = '';

  function save() { if (!on || !c.canWrite()) return; try { c.store.setItem(c.key, JSON.stringify(st)); } catch (e) {} }
  const S = () => c.S();
  const auto = () => c.E.autoLevel(S());
  function syncNow() { if (on) { G.sync(st, S(), auto()); save(); } }

  function init(ctx) {
    c = ctx;
    on = ctx.enabled;
    if (!on) return api;
    st = G.parse(ctx.store.getItem(ctx.key));
    if (!st) { on = false; return api; }   // 损坏：不覆盖，等 App 外壳用副本恢复
    G.prune(st, c.today());
    syncNow();
    c.$('forgeList').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (b) add(b.dataset.add); });
    c.$('forgeSlots').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { slots.splice(+b.dataset.i, 1); msg = ''; draw(); } });
    c.$('forgeGo').addEventListener('click', doForge);
    c.$('forgeClaim').addEventListener('click', claim);
    c.$('forgeBack').addEventListener('click', () => { if (back === 'island') c.goIsland(); else c.show(back); });
    window.__kongEarnFailed = () => { st.sent = {}; save(); msg = '没有找到空空矿场'; if (c.cur() === 'forge') draw(); };
    return api;
  }

  // ---------- 记作答：判定一出来就调，在显示答案和存进度之前 ----------
  function credit(run, got) { if (got) { run.gem = run.gem || {s: 0, m: 0}; run.gem[got]++; } }
  function topOf(run) { if (run.gemTop === undefined) { G.sync(st, S(), auto()); run.gemTop = G.top(st, auto()); } return run.gemTop; }
  function answerQ(q, x, r) {
    if (!on || q.kind === 'place' || !c.canWrite()) return;
    if (q.kind === 'challenge') {
      const got = G.challengeAnswer(st, {day: q.day, inst: x.inst, ok: r.ok && !q.peeked, dunno: r.dunno || q.peeked, oral: S().oral});
      q.chDone = (q.chDone || 0) + 1; if (got) q.chWon = (q.chWon || 0) + 1;
      credit(q, got);
    } else {
      credit(q, G.answer(st, {day: q.day, inst: x.inst, ok: r.ok, top: topOf(q), lv: G.levelOfCell(st, S(), x.inst.id), dunno: r.dunno, peeked: q.peeked, oral: S().oral, retry: x.retry, mistake: !!x.mkey}));
    }
    save();
  }
  function answerP(p, inst, c0) {   // 老秒答流程。Boss 和摸底不给
    if (!on || p.kind === 'boss' || p.kind === 'scan' || p.kind === 'final' || !c.canWrite()) return;
    p.gemDay = p.gemDay || c.today();
    const m = c0.mkey && S().mistakes[c0.mkey];
    credit(p, G.answer(st, {day: p.gemDay, inst, ok: p.result !== 'wrong', top: topOf(p), lv: G.levelOfCell(st, S(), inst.id), dunno: p.dunno, oral: S().oral, mistake: !!(m && m.due !== null && m.due <= p.gemDay)}));
    save();
  }

  // ---------- 结算页的碎片区块 ----------
  function summary(run, day, opts) {
    if (!on) return '';
    opts = opts || {};
    const set = G.settle(st, day), g = run.gem || {s: 0, m: 0};
    let ticket = false;
    if (opts.todayRun && !S().oral) ticket = G.earnTicket(st, {done: !!(S().daily && S().daily.done), n: run.n || 0});
    G.prune(st, c.today()); save();
    const more = opts.todayRun && S().daily && S().daily.done && c.E.hasMore(S(), c.today());
    return `<div class="gemsum">
      <b>这次的碎片</b>
      <div class="gemline">${chip('s')} +${g.s}　${chip('m')} +${g.m}${set.bonus ? `　认真奖励 ${'★'.repeat(set.stars)} ${chip('m')} +${set.bonus}` : ''}${ticket ? '　挑战券 +1' : ''}</div>
      <div class="gemline muted">背包：${chip('s')} ${st.inv.s}　${chip('m')} ${st.inv.m}　${chip('l')} ${st.inv.l}　挑战券 ${st.tickets}</div>
      <div class="gembtns"><button class="btn go" data-gem="forge">去锻造</button>${more ? '<button class="btn" data-gem="more">再练一会 · 得 1 张挑战券</button>' : ''}${st.tickets > 0 ? `<button class="btn" data-gem="challenge">挑战 · 大碎片</button>` : ''}</div>
    </div>`;
  }
  function bind(root, from) {
    if (!on) return;
    root.querySelectorAll('[data-gem]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.gem;
      if (a === 'forge') openForge(from);
      if (a === 'more') c.begin(() => c.startQ('today', {extra: 300}));
      if (a === 'challenge') challenge();
    }));
  }

  // ---------- 挑战：进入就扣券并存盘 ----------
  function challenge() {
    if (!on || S().oral) return;
    const qs = G.pickChallenge(S(), G.top(st, auto()), Math.random, st);
    if (qs.length < G.CH_N || !G.startChallenge(st)) { msg = ''; return; }
    save();
    let i = 0;
    c.begin(() => c.startQ('challenge', {sess: {next: () => (i < qs.length ? {kind: 'q', inst: qs[i++], seg: 'challenge'} : null), answer: () => null}}));
  }
  function finishChallenge(q) {
    const won = q.chWon || 0, r = G.finishChallenge(st, {won, n: q.chDone === G.CH_N ? G.CH_N : 0});
    save();
    c.$('qsum').innerHTML = `<div class="col" style="flex:1;justify-content:center;align-items:center;gap:14px">
      <div style="font-size:28px;font-weight:900">挑战结束</div>
      <div style="font-size:18px">答对 ${won} / ${G.CH_N} 题</div>
      <div class="gemline">${chip('m')} +${won}${r.big ? `　${chip('l')} +1` : ''}</div>
      <div class="gembtns"><button class="btn go" id="chForge">去锻造</button><button class="btn" id="chHome">回到岛上</button></div></div>`;
    c.show('qsum');
    c.$('chForge').addEventListener('click', () => openForge('island'));
    c.$('chHome').addEventListener('click', () => c.goIsland());
  }

  // ---------- 锻造台：炉子里不显示合计，要自己算 ----------
  function openForge(from) { if (!on) return; back = from || 'island'; slots = []; msg = ''; draw(); c.show('forge'); }
  const placed = t => slots.filter(x => x === t).length;
  function add(t) {
    if (slots.length >= G.SLOTS) { msg = `炉子最多放 ${G.SLOTS} 个`; return draw(); }
    if (placed(t) >= st.inv[t]) return;
    slots.push(t); msg = ''; draw();
  }
  function doForge() {
    const r = {s: placed('s'), m: placed('m'), l: placed('l')}, res = G.forge(st, r, c.today());
    if (res.ok) { msg = `得到宝石 1，废料 ${res.waste}`; slots = []; save(); }
    else if (res.why === 'short') { msg = slots.length ? `还差 ${res.short}，碎片退回` : '先放碎片'; slots = []; }
    else if (res.why === 'daily') msg = `今天已炼 ${G.DAY_MAX} 颗，碎片留到明天`;
    draw();
  }
  function claim() {
    const items = G.items(st, c.today());
    if (!items) return;
    G.markSent(st, c.today()); save(); msg = '';
    draw();
    const link = KM.earnLink(items);
    window.__gemLink = link;
    if (c.enabledInApp) location.href = link;
  }
  function draw() {
    const $ = c.$;
    $('forgeList').innerHTML = ['s', 'm', 'l'].map(t => {
      const left = st.inv[t] - placed(t);
      return `<button class="fragrow" data-add="${t}"${left > 0 ? '' : ' disabled'}>${chip(t)}<span>${NAME[t]}</span><b class="num">${left}</b></button>`;
    }).join('');
    $('forgeSlots').innerHTML = Array.from({length: G.SLOTS}, (_, i) => (slots[i] ? `<button class="fslot" data-i="${i}">${chip(slots[i])}</button>` : '<span class="fslot"></span>')).join('');
    $('forgeMsg').textContent = msg;
    const today = c.today(), done = st.days[today] ? st.days[today].forged : 0, items = G.items(st, today), left = G.unsent(st, today);
    $('forgeToday').textContent = `今天炼出 ${done} 颗宝石`;
    const b = $('forgeClaim');
    b.hidden = !items; b.textContent = left ? `领 ${left} 颗宝石` : '再领一次';
    b.classList.toggle('go', left > 0);
  }

  const api = {init, enabled: () => on, syncNow, answerQ, answerP, summary, bind, openForge, finishChallenge, state: () => st};
  window.GEMUI = api;
})();
