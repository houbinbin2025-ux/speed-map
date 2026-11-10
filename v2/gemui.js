// 空空数学岛 · 碎片、锻造台、挑战的界面。规则都在 gems.js，这里只管显示和存取
// 手机网页和 iPad App 都开；领宝石只在 App 里有，手机上没有空空矿场（测试：#test 下要带 ?gems=1）
(function () {
  'use strict';
  const G = window.GEMS, KM = window.KM;
  const NAME = {a: '小碎片', b: '金色小碎片', p: '小碎片', g: '小碎片（4）', s: '中碎片', m: '金色中碎片', h: '大碎片', l: '金色大碎片'};
  // 谜题水晶和趣味题徽章（方案 7）：徽章名是 A 定的（A-趣味题徽章名和前置评估.md），图标是临时的紫色水晶，正式画面由 E 画
  const PUZZLE_NAME = {'g34:g4:pyr': '数塔', 'g34:g7:pyr2': '大数塔', 'g34:g7:magic': '幻方', 'g34:g5:tree': '植树', 'g34:g7:tree2': '三种种法', 'g34:g9:tree3': '量路种树', 'g34:g5:saw': '锯木头', 'g34:g5:order': '排顺序', 'g34:g7:riddle': '猜数', 'g34:g9:riddle2': '乘除猜数', 'g34:g7:cipher': '算式谜'};
  // 谜题水晶正式图标（E 11-10 画：紫水晶簇，底座棕色，和矿石同一套像素画）
  const CRYSTAL = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="7" y="0" width="2" height="1" fill="#1b1d22"/><rect x="6" y="1" width="1" height="1" fill="#1b1d22"/><rect x="7" y="1" width="1" height="1" fill="#efe2ff"/><rect x="8" y="1" width="1" height="1" fill="#b98af2"/><rect x="9" y="1" width="1" height="1" fill="#1b1d22"/><rect x="5" y="2" width="1" height="1" fill="#1b1d22"/><rect x="6" y="2" width="1" height="1" fill="#efe2ff"/><rect x="7" y="2" width="2" height="1" fill="#b98af2"/><rect x="9" y="2" width="1" height="1" fill="#8e4fe0"/><rect x="10" y="2" width="1" height="1" fill="#1b1d22"/><rect x="5" y="3" width="1" height="1" fill="#1b1d22"/><rect x="6" y="3" width="1" height="1" fill="#efe2ff"/><rect x="7" y="3" width="1" height="1" fill="#b98af2"/><rect x="8" y="3" width="2" height="1" fill="#8e4fe0"/><rect x="10" y="3" width="1" height="1" fill="#1b1d22"/><rect x="4" y="4" width="1" height="1" fill="#1b1d22"/><rect x="5" y="4" width="1" height="1" fill="#efe2ff"/><rect x="6" y="4" width="2" height="1" fill="#b98af2"/><rect x="8" y="4" width="2" height="1" fill="#8e4fe0"/><rect x="10" y="4" width="1" height="1" fill="#4a2591"/><rect x="11" y="4" width="1" height="1" fill="#1b1d22"/><rect x="4" y="5" width="1" height="1" fill="#1b1d22"/><rect x="5" y="5" width="1" height="1" fill="#efe2ff"/><rect x="6" y="5" width="1" height="1" fill="#b98af2"/><rect x="7" y="5" width="3" height="1" fill="#8e4fe0"/><rect x="10" y="5" width="1" height="1" fill="#4a2591"/><rect x="11" y="5" width="1" height="1" fill="#1b1d22"/><rect x="1" y="6" width="2" height="1" fill="#1b1d22"/><rect x="4" y="6" width="1" height="1" fill="#1b1d22"/><rect x="5" y="6" width="1" height="1" fill="#efe2ff"/><rect x="6" y="6" width="1" height="1" fill="#b98af2"/><rect x="7" y="6" width="3" height="1" fill="#8e4fe0"/><rect x="10" y="6" width="1" height="1" fill="#4a2591"/><rect x="11" y="6" width="1" height="1" fill="#1b1d22"/><rect x="13" y="6" width="2" height="1" fill="#1b1d22"/><rect x="0" y="7" width="1" height="1" fill="#1b1d22"/><rect x="1" y="7" width="1" height="1" fill="#b98af2"/><rect x="2" y="7" width="1" height="1" fill="#8e4fe0"/><rect x="3" y="7" width="2" height="1" fill="#1b1d22"/><rect x="5" y="7" width="1" height="1" fill="#efe2ff"/><rect x="6" y="7" width="1" height="1" fill="#b98af2"/><rect x="7" y="7" width="3" height="1" fill="#8e4fe0"/><rect x="10" y="7" width="1" height="1" fill="#4a2591"/><rect x="11" y="7" width="2" height="1" fill="#1b1d22"/><rect x="13" y="7" width="1" height="1" fill="#b98af2"/><rect x="14" y="7" width="1" height="1" fill="#8e4fe0"/><rect x="15" y="7" width="1" height="1" fill="#1b1d22"/><rect x="0" y="8" width="1" height="1" fill="#1b1d22"/><rect x="1" y="8" width="1" height="1" fill="#efe2ff"/><rect x="2" y="8" width="1" height="1" fill="#8e4fe0"/><rect x="3" y="8" width="1" height="1" fill="#4a2591"/><rect x="4" y="8" width="1" height="1" fill="#1b1d22"/><rect x="5" y="8" width="1" height="1" fill="#efe2ff"/><rect x="6" y="8" width="1" height="1" fill="#b98af2"/><rect x="7" y="8" width="3" height="1" fill="#8e4fe0"/><rect x="10" y="8" width="1" height="1" fill="#4a2591"/><rect x="11" y="8" width="2" height="1" fill="#1b1d22"/><rect x="13" y="8" width="1" height="1" fill="#b98af2"/><rect x="14" y="8" width="1" height="1" fill="#4a2591"/><rect x="15" y="8" width="1" height="1" fill="#1b1d22"/><rect x="0" y="9" width="1" height="1" fill="#1b1d22"/><rect x="1" y="9" width="1" height="1" fill="#efe2ff"/><rect x="2" y="9" width="1" height="1" fill="#8e4fe0"/><rect x="3" y="9" width="1" height="1" fill="#4a2591"/><rect x="4" y="9" width="1" height="1" fill="#1b1d22"/><rect x="5" y="9" width="1" height="1" fill="#efe2ff"/><rect x="6" y="9" width="1" height="1" fill="#b98af2"/><rect x="7" y="9" width="3" height="1" fill="#8e4fe0"/><rect x="10" y="9" width="1" height="1" fill="#4a2591"/><rect x="11" y="9" width="1" height="1" fill="#1b1d22"/><rect x="12" y="9" width="1" height="1" fill="#b98af2"/><rect x="13" y="9" width="1" height="1" fill="#8e4fe0"/><rect x="14" y="9" width="1" height="1" fill="#4a2591"/><rect x="15" y="9" width="1" height="1" fill="#1b1d22"/><rect x="1" y="10" width="1" height="1" fill="#1b1d22"/><rect x="2" y="10" width="1" height="1" fill="#8e4fe0"/><rect x="3" y="10" width="1" height="1" fill="#4a2591"/><rect x="4" y="10" width="2" height="1" fill="#1b1d22"/><rect x="6" y="10" width="1" height="1" fill="#b98af2"/><rect x="7" y="10" width="3" height="1" fill="#8e4fe0"/><rect x="10" y="10" width="1" height="1" fill="#4a2591"/><rect x="11" y="10" width="1" height="1" fill="#1b1d22"/><rect x="12" y="10" width="1" height="1" fill="#b98af2"/><rect x="13" y="10" width="1" height="1" fill="#4a2591"/><rect x="14" y="10" width="1" height="1" fill="#1b1d22"/><rect x="1" y="11" width="1" height="1" fill="#1b1d22"/><rect x="2" y="11" width="2" height="1" fill="#8e4fe0"/><rect x="4" y="11" width="1" height="1" fill="#4a2591"/><rect x="5" y="11" width="1" height="1" fill="#1b1d22"/><rect x="6" y="11" width="1" height="1" fill="#b98af2"/><rect x="7" y="11" width="2" height="1" fill="#8e4fe0"/><rect x="9" y="11" width="2" height="1" fill="#4a2591"/><rect x="11" y="11" width="1" height="1" fill="#1b1d22"/><rect x="12" y="11" width="1" height="1" fill="#8e4fe0"/><rect x="13" y="11" width="1" height="1" fill="#4a2591"/><rect x="14" y="11" width="1" height="1" fill="#1b1d22"/><rect x="2" y="12" width="1" height="1" fill="#1b1d22"/><rect x="3" y="12" width="1" height="1" fill="#8e4fe0"/><rect x="4" y="12" width="1" height="1" fill="#4a2591"/><rect x="5" y="12" width="2" height="1" fill="#1b1d22"/><rect x="7" y="12" width="1" height="1" fill="#b98af2"/><rect x="8" y="12" width="1" height="1" fill="#8e4fe0"/><rect x="9" y="12" width="2" height="1" fill="#4a2591"/><rect x="11" y="12" width="3" height="1" fill="#1b1d22"/><rect x="2" y="13" width="12" height="1" fill="#1b1d22"/><rect x="3" y="14" width="1" height="1" fill="#1b1d22"/><rect x="4" y="14" width="8" height="1" fill="#6b4628"/><rect x="12" y="14" width="1" height="1" fill="#1b1d22"/><rect x="4" y="15" width="8" height="1" fill="#1b1d22"/></svg>');
  const funSkill = id => { const K = window.SKILLS, it = K && K.ITEM && K.ITEM[id], s = it && K.BY[it.skill]; return s && s.fun ? s.id : null; };
  let c = null, st = null, on = false, slots = [], back = 'island', msg = '', mode = 'gem';   // mode：gem 炼宝石（凑 100），big 炼大碎片（凑准 50）

  function save() { if (!on || !c.canWrite()) return; try { c.store.setItem(c.key, JSON.stringify(st)); } catch (e) {} }
  const S = () => c.S();
  const auto = () => c.E.autoLevel(S());
  function syncNow() { if (on) { G.sync(st, S(), auto()); save(); } }

  // 思维地点答对（10.2，中控 11-08）：按一道题给碎片、算有效时间。key 区分题目，同一题当天再做只给普通小碎片
  function answerThink(o) {
    if (!on || !c.canWrite()) return null;   // 口答模式也给（Ben 11-08：所有题都有激励）
    const secs = Math.max(0, +o.secs || 0), got = G.thinkAnswer(st, {day: c.today(), key: o.key, wrong: o.wrong, secs});
    G.noteRest(st, G.effSecs(secs, 10000), clock()); save();
    (got || []).forEach((t, i) => floatShard(t, i));
    return got;
  }
  // 备份（捣蛋鬼第 1 轮第 11 条）：导出带上整份碎片；导入时 merge = 只增不减，all = 整份替换。内存里的 st 一起换掉再存，不然下次保存会盖回去
  function exportState() { return on && st ? JSON.parse(JSON.stringify(st)) : null; }
  function importBackup(obj, mode) {
    if (!on || !obj) return false;
    const next = mode === 'all' ? G.parse(JSON.stringify(obj)) : G.mergeBackup(st, obj);
    if (!next) return false;
    st = next; G.prune(st, c.today()); syncNow(); save();
    return true;
  }
  function init(ctx) {
    c = ctx;
    on = ctx.enabled;
    if (!on) return;
    st = G.parse(ctx.store.getItem(ctx.key));
    if (!st) { on = false; return; }   // 损坏：不覆盖，等 App 外壳用副本恢复
    G.prune(st, c.today());
    syncNow();
    c.$('forgeList').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (b) add(b.dataset.add); });
    c.$('forgeSlots').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b && !busy) { slots.splice(+b.dataset.i, 1); msg = ''; blip([[260, 0, 0.05]]); draw(); } });
    c.$('forgeGo').addEventListener('click', () => doForge());
    c.$('fmGem').addEventListener('click', () => setMode('gem')); c.$('fmBig').addEventListener('click', () => setMode('big'));
    c.$('gemEv').addEventListener('click', takeOffer);
    setInterval(() => { try { evTick(); } catch (e) { /* 弹出的东西出错不挡练习 */ } }, 500);
    c.$('forgeWarnBack').addEventListener('click', () => { c.$('forgeWarn').hidden = true; });
    c.$('forgeWarnGo').addEventListener('click', () => { c.$('forgeWarn').hidden = true; doForge(true); });
    c.$('forgeClaim').addEventListener('click', claim);
    c.$('forgeBack').addEventListener('click', () => { if (busy) return; if (back === 'island') c.goIsland(); else c.show(back); });
    addEventListener('resize', () => { if (c.cur() === 'forge') layoutScene(); });
    if (window.ResizeObserver) new ResizeObserver(() => { if (c.cur() === 'forge' && c.$('forge').clientHeight) layoutScene(); }).observe(c.$('forge'));
    window.__kongEarnFailed = () => { st.sent = st.sentBak || st.sent; save(); msg = '没有找到空空矿场'; if (c.cur() === 'forge') draw(); };
  }

  // ---------- 记作答：判定一出来就调，在显示答案和存进度之前 ----------
  const oddRand = () => (window.__gemRand || Math.random)();   // 测试可固定
  const allChips = (o, plus) => G.MAIN.concat(G.ODD).filter(t => o[t] > 0).map(t => `${chip(t)}<span>${plus}${o[t]}</span>`).join('');
  // list：这一题得到的碎片；i：从第几个开始错开飞，看得出多
  function credit(run, list, i) { (list || []).forEach((t, k) => { run.gem = run.gem || {}; run.gem[t] = (run.gem[t] || 0) + 1; run.gemV = (run.gemV || 0) + (G.VALUE[t] || 0); floatShard(t, (i || 0) + k); }); }
  const words = list => (list && list.length ? `碎片 ${list.map(t => '+' + G.VALUE[t]).join(' ')}` : '');
  function topOf(run) { if (run.gemTop === undefined) { G.sync(st, S(), auto()); run.gemTop = G.top(st, auto()); } return run.gemTop; }
  const clock = () => Date.now() / 1000;
  const evOn = q => on && !!q && ['today', 'free', 'review'].includes(q.kind) && !S().oral && c.canWrite();
  // limitMs = 这道题的标准时间（秒答时限）：有效时间最多算它的 3 倍
  function answerQ(q, x, r, secs, limitMs) {
    if (!on || !c.canWrite()) return null;   // 摸底也给（Ben 11-08：所有题都有激励）
    if (q.kind === 'place') { const got = G.placeAnswer(st, {ok: r.ok && !r.dunno && !q.peeked}); credit(q, got); save(); return {got, words: words(got || []), bolt: false, rep: false}; }   // 摸底：固定 1 个小碎片，不进当天统计
    let got = null, more = null;
    const evc = q.opts && q.opts.evc;
    secs = G.effSecs(secs, limitMs); q.effSec = (q.effSec || 0) + secs; q.limitMs = limitMs;
    G.noteRest(st, secs, clock());
    if (!S().oral) { G.addSec(st, q.day, secs); if (!x.retry) G.notePace(st, secs, r.ok && !r.dunno); }
    if (evc) {
      got = G.answer(st, {day: q.day, inst: x.inst, ok: r.ok, slow: r.ok && !r.fast, top: topOf(q), lv: G.levelOfCell(st, S(), x.inst.id), dunno: r.dunno, peeked: q.peeked, oral: S().oral, rand: oddRand});
      credit(q, got); if (got && !got.rep) got.forEach(t => { evc.earned[t] = (evc.earned[t] || 0) + 1; });   // 改对、重复题的小碎片不翻倍
      if (r.ok && !r.dunno && !q.peeked) evc.done++;
      evc.ans = (evc.ans || 0) + 1;   // 答了几题（算正确率，答得非常好才能再来一次双倍）
      evLater();
    } else if (q.kind === 'challenge') {
      got = G.challengeAnswer(st, {day: q.day, inst: x.inst, ok: r.ok && !q.peeked, slow: r.ok && !r.fast, dunno: r.dunno || q.peeked, oral: S().oral});
      q.chDone = (q.chDone || 0) + 1; if (got === 'm') q.chWon = (q.chWon || 0) + 1;
      credit(q, got ? [got] : null); got = got ? [got] : null;
    } else {
      const fx = evOn(q) ? feel(q) : null, now = clock();
      const mult = fx ? 1 + (fx.F.lit ? 1 : 0) + (G.critOn(fx.C, now) ? 1 : 0) : undefined;   // 火苗只在今日练习、练这一块、复习里有；其他练习按金色算
      got = G.answer(st, {day: q.day, inst: x.inst, ok: r.ok, slow: r.ok && !r.fast, top: topOf(q), lv: G.levelOfCell(st, S(), x.inst.id), dunno: r.dunno, peeked: q.peeked, oral: S().oral, retry: x.retry, mistake: !!x.mkey, rand: oddRand, mult});
      credit(q, got);
      const fsid = r.ok && !r.dunno && !q.peeked && !x.retry ? funSkill(x.inst.id) : null;   // 趣味题答对：1 颗谜题水晶（不进锻造）；答错后的再来一次、看过提示、点「不会」不给
      const pz = fsid ? G.puzzleAnswer(st, fsid, q.day) : null;   // 当天 10 颗满了返回 null：不飞水晶、结算页不显示这一行
      if (pz) { q.puzzle = (q.puzzle || 0) + 1; if (pz.badge) q.badges = (q.badges || []).concat(fsid); flyCrystal(); }
      if (got && !got.rep && r.fast && !S().oral) { more = G.speedBonus(st, q.day, r.bolt, mult); credit(q, more.extra, got.length); }
      if (fx) afterAnswer(q, x, r, got, now, !!(got && got.rep));
    }
    save();
    const all = (got || []).concat(more ? more.extra : []);
    return {got: all.length ? all : null, words: words(all), bolt: !!more && more.bolt, rep: !!(got && got.rep)};
  }
  // 这次练习的专注火苗和连对能量（不存盘，进挑战再回来接着用）
  function feel(q) { if (!q.focus) q.focus = G.focusNew(clock()); if (!q.combo) q.combo = G.comboNew(); return {F: q.focus, C: q.combo}; }
  const capNow = q => G.capOf(c.qLimit && q.x && q.x.inst ? c.qLimit(q.x.inst) : q.limitMs);   // 当前这道题的标准时间
  // ---------- 练习中的正反馈：暴击、连对、弹出挑战 ----------
  let evRun = null;
  // 判定流程走完再检查：evTick 可能结束这一关，不能在判定中途调
  const evLater = () => setTimeout(() => { try { evTick(); } catch (e) {} }, 0);
  function afterAnswer(q, x, r, got, now, fill) {
    evRun = q;
    const {F, C} = feel(q), D = st.days[q.day] || {}, need0 = G.comboNeed(D);
    G.focusAnswer(F, now);
    if (!r.dunno) { q.gAns = (q.gAns || 0) + 1; q.last = (q.last || []).concat([!!r.ok]).slice(-3); }
    if (!x.retry && !fill && G.comboStep(st, q.day, C, now, {ok: r.ok && !q.peeked, fast: r.fast, dunno: r.dunno})) {   // 改对、重复题不涨能量
      q.crit = (q.crit || 0) + 1; if (q.ev) q.ev.offer = null;   // 暴击时刻里不进挑战
      evPop(`暴击时刻 ${G.TUNE.critSec} 秒`, 'gold'); blip([[523, 0, 0.1], [784, 0.1, 0.1], [1046, 0.2, 0.25]]);
      if (q.goal && q.goal.kind === 'combo') q.goal.done = true;
    }
    const need1 = G.comboNeed(st.days[q.day] || {});
    if (need1 < need0) evPop(`热身完成 · 暴击只要 ${need1} 格`);
    if (q.goal && q.goal.kind !== 'combo' && !r.dunno && q.gAns - q.goal.from >= q.goal.n) q.goal.done = true;
    evLater();
  }
  function evPop(text, cls) {
    const e = document.createElement('div'); e.className = 'evpop' + (cls ? ' ' + cls : ''); e.textContent = text;
    document.body.appendChild(e); setTimeout(() => e.remove(), 1500);
  }
  const mins = s => (s < 60 ? `${Math.round(s)} 秒` : `${Math.round(s / 60)} 分钟`);
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function evTick() {
    if (!on) return;
    const t = clock(), el = c.$('gemEv'), chipEl = c.$('qFeel');
    restTick(t);
    if (c.cur() !== 'qplay') c.$('exitOv').hidden = true;
    const q = c.cur() === 'qplay' ? c.curQ() : null, evc = q && q.opts && q.opts.evc;
    let text = '', btn = false;
    if (evc) {
      if (evc.done >= evc.n || t >= evc.until) return void c.finishQ(true);
      text = `${evc.kind === 'dbl' ? '双倍挑战' : '限时挑战'} ${evc.done} / ${evc.n} · ${mmss(Math.ceil(evc.until - t))}`;
      chipEl.hidden = true; c.$('qplay').classList.remove('crit');
    } else if (q && q === evRun && evOn(q)) {
      const D = st.days[q.day] || {}, sec = D.sec || 0, {F, C} = feel(q);
      if (!document.hidden) G.focusTick(F, t, capNow(q));
      const crit = G.critOn(C, t);
      drawFeel(q, F, C, D, t);
      if (q.goal && q.goal.done && !q.goal.shown) goalDone(q);
      if (G.restDue(st)) {   // 连续 30 分钟：30 秒内结束
        q.restAt = q.restAt || t + G.TUNE.restGrace;
        if (t >= q.restAt) { c.$('exitOv').hidden = true; return void c.finishQ(true); }
        text = `${Math.ceil(q.restAt - t)} 秒后休息 ${G.TUNE.restSec / 60} 分钟`;
      } else {
        const e = G.eventStep(st, q.day, q, sec, t, Math.random, F.lit && !crit), o = q.ev.offer;
        if (e.offer) blip([[880, 0, 0.06], [880, 0.1, 0.06]]);
        if (o) { btn = true; const s = Math.max(0, Math.ceil(o.until - t)); text = o.kind === 'dbl' ? `双倍挑战 · ${o.n} 题 · 点这里进入 · ${s}` : `限时挑战 · 3 分钟答对 ${o.n} 题，额外 1 颗宝石 · ${s}`; }
        else if (F.lit && F.low) text = '火苗快灭了，答题保持火苗';
      }
    } else { chipEl.hidden = true; c.$('qplay').classList.remove('crit'); }
    el.hidden = !text; el.disabled = !btn; el.classList.toggle('offer', btn); if (el.dataset.raw !== text) { el.dataset.raw = text; el.textContent = text; }
  }
  // 顶部：火苗（亮 = 碎片翻倍）、能量格（满了进暴击时刻）、挽留的小目标
  function drawFeel(q, F, C, D, t) {
    const box = c.$('qFeel'), crit = G.critOn(C, t), need = G.comboNeed(D);
    box.hidden = false; c.$('qplay').classList.toggle('crit', crit);
    const fire = c.$('qFire'); fire.classList.toggle('on', F.lit); fire.classList.toggle('low', F.lit && !!F.low);
    const fb = fire.querySelector('b'), ft = F.lit ? '×2' : ''; if (fb.textContent !== ft) fb.textContent = ft;
    const cb = c.$('qCombo'), key = crit ? 'c' + Math.ceil(C.until - t) : `${C.e}/${need}`;
    if (cb.dataset.k !== key) { cb.dataset.k = key; cb.classList.toggle('crit', crit); if (cb._run !== q) { cb._run = q; cb.dataset.e = 0; }   // 每次练习从 0 记起：第一次答对也闪（审查建议 1）
      const prev = crit ? C.e : Math.max(+cb.dataset.e || 0, C.e - 2); cb.dataset.e = crit ? '' : C.e;   // 这次加的格子闪一下（秒答一次加 2 格就闪 2 格，审查建议 2）：答对那一刻看得见能量到账
      cb.innerHTML = crit ? `<span>暴击时刻 ${Math.ceil(C.until - t)}</span>` : Array.from({length: need}, (_, i) => `<i${i < C.e ? (i >= prev ? ' class="on new"' : ' class="on"') : ''}></i>`).join(''); }
    const g = c.$('qGoal'), gt = q.goal && !q.goal.shown ? (q.goal.kind === 'combo' ? '目标 暴击时刻' : `目标 ${Math.min(q.goal.n, (q.gAns || 0) - q.goal.from)}/${q.goal.n}`) : '';
    g.hidden = !gt; if (g.textContent !== gt) g.textContent = gt;
  }
  // 小目标完成：说到做到，可以结束了。宝箱这时打开。这次练习不再挽留
  function goalDone(q) {
    const G0 = q.goal; G0.shown = true;
    let head = '目标完成', sub = '';
    if (G0.kind === 'box') { const t = G.openBox(st, oddRand); credit(q, [t]); save(); head = '宝箱打开了'; sub = `${chip(t)} 碎片 ${G.VALUE[t]}`; }
    else if (G0.kind === 'gem') { const gap = G.gapToGem(st.inv); sub = gap ? `离 1 颗宝石还差 ${gap} 碎片` : '背包里的碎片够炼 1 颗宝石了'; }
    else sub = '暴击时刻开始了';
    const v = c.$('exitOv'); v.querySelector('b').textContent = head; v.querySelector('span').innerHTML = sub; v.hidden = false;
    blip([[660, 0, 0.1], [880, 0.09, 0.1], [1320, 0.18, 0.22]]);
    c.$('exitGo').textContent = '继续练习'; c.$('exitGo').onclick = () => { v.hidden = true; };
    c.$('exitEnd').textContent = '结束'; c.$('exitEnd').onclick = () => { v.hidden = true; c.finishQ(true); };
  }
  // 休息：练习页之外才开始，盖住所有界面，到点自动消失。刷新后接着算
  function restTick(t) {
    const v = c.$('restOv');
    if (G.restDue(st) && c.cur() !== 'qplay' && c.cur() !== 'play' && c.cur() !== 'demo') { G.startRest(st, t); save(); blip([[523, 0, 0.12], [392, 0.12, 0.2]]); }
    const left = G.restLeft(st, t);
    v.hidden = left <= 0;
    if (left > 0) { const m = v.querySelector('b'), s = mmss(Math.ceil(left)); if (m.textContent !== s) m.textContent = s; }
  }
  function takeOffer() {
    const q = evRun; if (!q || !evOn(q)) return;
    const kind = G.acceptOffer(q, clock()); if (kind) { try { startEv(q, kind, false); } catch (e) { if (!c.curQ()) c.goIsland(); } }
  }
  // 进入挑战：停下当前练习，出题，完了回到原来的练习接着做
  function startEv(q, kind, retry) {
    const tg = G.evTarget(st, kind), day = q.day, top = G.top(st, auto());
    const qs = G.pickEv(S(), st, Math.ceil(tg.n * 2 + 6), top, Math.random);
    if (qs.length < tg.n) { if (c.curQ() !== q) resume(q); return; }   // 题不够就不开，接着练
    const prev = c.curQ() === q ? c.leaveQ() : q;
    G.evStart(st, day, kind, retry); save();
    let i = 0;
    evPop(kind === 'dbl' ? (tg.T % 60 ? `${tg.T} 秒答对 ${tg.n} 题，碎片翻倍` : `${tg.T / 60} 分钟答对 ${tg.n} 题，碎片翻倍`) : `3 分钟答对 ${tg.n} 题`, 'gold'); blip([[660, 0, 0.08], [990, 0.08, 0.12]]);
    c.startQ('challenge', {sess: {next: () => (i < qs.length ? {kind: 'q', inst: qs[i++], seg: 'challenge'} : null), answer: () => null},
      evc: {kind, n: tg.n, T: tg.T, until: clock() + tg.T, done: 0, earned: {}, retry, prev}});
    evRun = c.curQ(); evTick();
  }
  function resume(prev) {
    const keep = ['n', 'ups', 'passed', 'retries', 'wrong', 'secs', 'gem', 'gemV', 'crit', 'qcWon', 'streak', 'ev', 'exitAsked', 'restAt', 'mist0', 'ore', 'fastN', 'focus', 'combo', 'goal', 'gAns', 'last', 'effSec', 'limitMs'], o = Object.assign({}, prev.opts), restore = {}; delete o.extra;
    keep.forEach(k => { if (prev[k] !== undefined) restore[k] = prev[k]; });
    const now = clock(); if (restore.focus) { restore.focus.at = now; restore.focus.last = now; }   // 挑战里的时间不算发呆
    o.restore = restore;   // 先恢复再出题：原练习没题了也能走结算页
    c.startQ(prev.kind, o);
    const q = c.curQ(); if (!q) return;
    evRun = q; evTick();
  }
  function evResult(q) {
    const v = q.opts.evc, res = G.evEnd(st, q.day, {kind: v.kind, n: v.n, done: v.done, ans: v.ans || 0, earned: v.earned, retry: v.retry}); save();
    if (res.won && v.prev) { if (res.gem) v.prev.qcWon = (v.prev.qcWon || 0) + 1; }
    if (v.prev) {   // 挑战里得的碎片（和翻倍的那份）算进原练习的「这次的碎片」
      const pg = v.prev.gem = v.prev.gem || {}, add = o => Object.keys(o || {}).forEach(t => { pg[t] = (pg[t] || 0) + o[t]; });
      add(q.gem); if (res.bonus) add(v.earned);
    }
    const canRetry = !res.won && v.kind === 'dbl' && !v.retry && !G.restDue(st), chain = res.chain && !G.restDue(st);   // 答得非常好：再来一次双倍（10.2）
    const name = v.kind === 'dbl' ? '双倍挑战' : '限时挑战';
    c.$('qsum').innerHTML = `<div class="col" style="flex:1;justify-content:center;align-items:center;gap:12px">
      <div style="font-size:28px;font-weight:900">${res.won ? `${name}完成` : `${name}结束`}</div>
      <div style="font-size:18px">答对 ${v.done} / ${v.n} 题</div>
      ${res.gem ? `<div class="gemline"><img src="${gemURL()}" alt="" style="width:36px;image-rendering:pixelated"><span>宝石 +1</span></div>` : ''}
      ${res.bonus ? `<div class="gemline" style="font-size:18px;font-weight:900;color:var(--warn)">碎片翻倍 +${res.bonus}</div>` : ''}
      ${chain ? '<div style="font-size:18px;font-weight:900">答得非常好</div>' : ''}
      <div class="gembtns">${canRetry ? '<button class="btn go" id="evRetry">再挑战一次</button>' : ''}${chain ? '<button class="btn go" id="evChain">再来一次双倍</button>' : ''}<button class="btn${canRetry || chain ? '' : ' go'}" id="evBack">继续练习</button></div></div>`;
    c.show('qsum');
    if (res.won) blip([[660, 0, 0.1], [880, 0.09, 0.1], [1320, 0.18, 0.22]]); else blip([[300, 0, 0.1], [240, 0.1, 0.14]], 'triangle');
    c.$('evBack').addEventListener('click', () => { if (v.prev) resume(v.prev); else c.goIsland(); });
    if (canRetry) c.$('evRetry').addEventListener('click', () => { startEv(v.prev, 'dbl', true); });
    if (chain) c.$('evChain').addEventListener('click', () => { startEv(v.prev, 'dbl', 'chain'); });
  }
  // 长按结束：最多 20% 弹出挽留，只用「差一点就到手」的理由（规则见 G.exitHook）。接受后顶部出现小目标；一次练习最多一次，选结束直接走
  function gateQuit(q, done) {
    if (!evOn(q) || !q.n || c.cur() !== 'qplay') return false;
    const D = st.days[q.day] || {}, perQ = q.gAns ? (q.gemV || 0) / q.gAns : 4;
    const o = G.exitHook(st, q.day, {asked: q.exitAsked || !!q.goal, last: q.last, perQ, combo: q.combo, now: clock(), rand: Math.random});
    q.exitAsked = true;
    if (!o) return false;
    const v = c.$('exitOv'), head = {gem: `再得 ${o.gap} 碎片，可以炼 1 颗宝石`, combo: `再连对 ${o.n} 题，开启暴击时刻`, box: `再答 ${o.n} 题，打开宝箱`}[o.kind];
    const sub = {gem: '炼出的宝石可以到空空矿场换时间', combo: '暴击时刻里，每题的碎片更多', box: '宝箱里有 1 个碎片'}[o.kind];
    v.querySelector('b').textContent = head; v.querySelector('span').textContent = sub;
    v.hidden = false; blip([[660, 0, 0.08], [880, 0.08, 0.1]]);
    c.$('exitGo').textContent = o.kind === 'combo' ? '继续答题' : `再答 ${o.n} 题`;
    c.$('exitGo').onclick = () => { v.hidden = true; q.goal = {kind: o.kind, n: o.n, from: q.gAns || 0}; evRun = q; evTick(); };
    c.$('exitEnd').textContent = '结束'; c.$('exitEnd').onclick = () => { v.hidden = true; done(); };
    void D; return true;
  }
  function islandBtn() {
    const b = c && c.$('btnForge'); if (!b) return;
    b.hidden = !on || !c.canWrite(); if (b.hidden) return;
    c.$('forgeIco').src = gemURL(); c.$('forgeN').textContent = (st.days[c.today()] || {}).forged || 0;
    b.classList.toggle('spent', !G.forgeLeft(st, c.today()));   // 今天 5 次用完：按钮变暗，点了只提示明天再来
  }
  function parentStats() {
    if (!on) return '';
    let e, R; try { e = G.evStats(st); R = st.rest || {}; } catch (x) { return ''; }
    return `<b>挑战数据</b><div>最近 ${e.n} 次，完成 ${e.won} 次${e.n ? `（${Math.round(e.rate * 100)}%）` : ''}。目标约 70%，会自动调题数</div><div>难度系数：双倍 ${e.dbl.toFixed(2)}，限时 ${e.qc.toFixed(2)}。最近每题 ${e.sec.toFixed(1)} 秒，正确率 ${Math.round(e.acc * 100)}%</div><div>连续已练 ${Math.round((R.sec || 0) / 60)} 分钟，满 ${G.TUNE.restAt / 60} 分钟休息 ${G.TUNE.restSec / 60} 分钟</div>${focusLine()}`;
  }
  function focusLine() {
    const l = Array.isArray(st.flog) ? st.flog.filter(x => x && Number.isFinite(x.act)) : []; if (!l.length) return '<div>专注度：还没有记录</div>';
    const avg = k => Math.round(l.reduce((n, x) => n + (x[k] || 0), 0) / l.length), low = l.filter(x => x.act < G.TUNE.focusOn * 100).length;
    return `<div>专注度：最近 ${l.length} 次平均 ${avg('act')}%，火苗亮的时间 ${avg('on')}%，低于 ${Math.round(G.TUNE.focusOn * 100)}% 的 ${low} 次</div>`;
  }
  function answerP(p, inst, c0, limit) {   // 老秒答流程：今日练习、Boss、摸底都给（Ben 11-08：所有题都有激励）
    if (!on || !c.canWrite()) return null;
    if (p.kind === 'scan') { const got = G.placeAnswer(st, {ok: p.result !== 'wrong' && !p.dunno}); credit(p, got); save(); return {got, words: words(got || []), bolt: false}; }   // 秒答区摸底：同上
    p.gemDay = p.gemDay || c.today();
    const m = c0.mkey && S().mistakes[c0.mkey];
    { const secs = G.effSecs((p.ms || 0) / 1000, limit); G.noteRest(st, secs, clock()); if (!S().oral) G.addSec(st, p.gemDay, secs); evRun = null; }   // 口答不算有效时间（和新流程 answerQ 一致，审查 R2）
    const got = G.answer(st, {day: p.gemDay, inst, ok: p.result !== 'wrong', slow: p.result === 'slow', top: topOf(p), lv: G.levelOfCell(st, S(), inst.id), dunno: p.dunno, oral: S().oral, mistake: !!(m && m.due !== null && m.due <= p.gemDay), rand: oddRand});
    credit(p, got);
    let more = null;
    if (got && !got.rep && p.result === 'fast' && !S().oral) {   // 口答不算秒答，没有秒答奖励
      more = G.speedBonus(st, p.gemDay, p.ms <= limit * G.BOLT); credit(p, more.extra, got.length); }
    save();
    const all = (got || []).concat(more ? more.extra : []);
    return {got: all.length ? all : null, words: words(all), bolt: !!more && more.bolt};
  }

  // ---------- 结算页的碎片区块 ----------
  // 摸底结果页：这次摸底拿到的碎片（每答对一题 1 个小碎片；摸底不进当天统计，不结算认真奖励，中控 11-09）
  function placeLine(run) {
    if (!on) return '';
    const got = allChips(run.gem || {}, '+');
    return got ? `<div class="gemline" id="prGems"><span>这次的碎片</span>${got}</div>` : '';
  }
  function summary(run, day, opts) {
    evRun = null;
    if (!on || !c.canWrite()) return '';   // 只读时不结算；Boss、摸底也结算（拿到的碎片要看得到）
    opts = opts || {};
    const set = G.settle(st, day), g = run.gem || {}, F = run.focus;
    if (F && evOn(run)) G.noteFocus(st, day, F);
    const pct = F && F.all >= 30 ? Math.round(F.act / F.all * 100) : null;
    let ticket = false;
    if (opts.todayRun && !S().oral) ticket = G.earnTicket(st, {done: !!(S().daily && S().daily.done), n: run.n || 0});
    G.prune(st, c.today()); save();
    const more = opts.todayRun && S().daily && S().daily.done && c.E.hasMore(S(), c.today());
    return `<div class="gemsum">
      <b>这次的碎片</b>
      <div class="gemline">${allChips(g, '+') || '<span>没有新碎片</span>'}${set.bonus ? `<span>认真奖励 ${'★'.repeat(set.stars)}</span>${chip('m')}<span>+${set.bonus}</span>` : ''}${ticket ? '<span>挑战券 +1</span>' : ''}${run.puzzle ? `<span class="pzline"><img src="${CRYSTAL}" alt="">谜题水晶 +${run.puzzle}</span>` : ''}${(run.badges || []).map(sid => `<span class="pzline">新徽章 ${PUZZLE_NAME[sid] || ''}</span>`).join('')}</div>
      <div class="gemline muted"><span>背包</span>${allChips(st.inv, '')}<span>挑战券 ${st.tickets}</span></div>
      ${pct !== null || run.effSec || run.crit || run.qcWon ? `<div class="gemline">${pct !== null ? `<span>这次专注 ${pct}%</span>` : ''}${run.effSec ? `<span>有效答题 ${mins(run.effSec)}</span>` : ''}${run.crit ? `<span>暴击 ${run.crit} 次</span>` : ''}${run.qcWon ? `<span>限时挑战宝石 +${run.qcWon}</span>` : ''}</div>` : ''}
      <div class="gembtns">${forgeBtn('data-gem="forge"')}${more ? `<button class="btn" data-gem="more">${S().oral ? '再练一会' : '再练一会 · 得 1 张挑战券'}</button>` : ''}${st.tickets > 0 && !S().oral ? `<button class="btn" data-gem="challenge">挑战 · 大碎片</button>` : ''}</div>
    </div>`;
  }
  function bind(root, from) {
    if (!on) return;
    root.querySelectorAll('[data-gem]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.gem;
      if (a === 'forge') openForge(from);
      if (a === 'more') c.begin(() => c.startQ('today', {extra: 300}));
      if (a === 'challenge') challenge(b);
    }));
  }

  // ---------- 挑战：进入就扣券并存盘 ----------
  function challenge(btn) {
    if (!on || S().oral || !c.canWrite()) return;
    const qs = G.pickChallenge(S(), G.top(st, auto()), Math.random, st);
    if (qs.length < G.CH_N) { if (btn) { btn.textContent = '暂时没有挑战题'; btn.disabled = true; } return; }
    if (!G.startChallenge(st)) return;
    save();
    let i = 0;
    c.begin(() => c.startQ('challenge', {sess: {next: () => (i < qs.length ? {kind: 'q', inst: qs[i++], seg: 'challenge'} : null), answer: () => null}}));
  }
  function finishChallenge(q) {
    if (q.opts && q.opts.evc) return evResult(q);
    const won = q.chWon || 0, r = G.finishChallenge(st, {won, n: q.chDone === G.CH_N ? G.CH_N : 0});
    save();
    c.$('qsum').innerHTML = `<div class="col" style="flex:1;justify-content:center;align-items:center;gap:14px">
      <div style="font-size:28px;font-weight:900">挑战结束</div>
      <div style="font-size:18px">秒答 ${won} / ${G.CH_N} 题</div>
      ${r.big ? `<div class="bigwin"><span class="rays"></span><img src="${shardURL('l')}" alt=""></div><div style="font-size:18px;font-weight:900;color:var(--warn)">大碎片 +1</div>` : ''}
      <div class="gemline">${allChips(q.gem || {}, '+')}</div>
      <div class="gembtns">${forgeBtn('id="chForge"')}<button class="btn" id="chHome">回到岛上</button></div></div>`;
    c.show('qsum');
    if (r.big) blip([[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1046, 0.3, 0.3]]);
    c.$('chForge').addEventListener('click', () => openForge('island'));   // 用完时按钮是灰的、点不了（审查建议 1）
    c.$('chHome').addEventListener('click', () => c.goIsland());
  }

  // ---------- 像素图：碎片和宝石都是原创造型，图片只生成一次 ----------
  const px = (rows, pal, scale) => { const c = document.createElement('canvas'); c.width = rows[0].length * scale; c.height = rows.length * scale; const g = c.getContext('2d'); rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * scale, y * scale, scale, scale); } })); return c; };
  const SMALL = ['...ab...', '..abbc..', '..abbc..', '.abbbcc.', '.abbcc..', '..bcc...'], GOLDPAL = {a: '#fff6c8', b: '#f5c935', c: '#a8780f', d: '#ffffff'};
  const SHARD = {
    p: {rows: SMALL, pal: {a: '#f4f6fa', b: '#c3cbd6', c: '#7d8592'}},
    g: {rows: SMALL, pal: GOLDPAL},
    a: {rows: SMALL, pal: {a: '#f4f6fa', b: '#c3cbd6', c: '#7d8592'}},
    b: {rows: SMALL, pal: GOLDPAL},
    s: {rows: ['....ab...', '...abbc..', '..abbbcc.', '.aabbbcc.', '.abbbbcc.', '..abbcc..', '...bcc...', '....c....'], pal: {a: '#d8f4ff', b: '#6fc3e8', c: '#2b7fb0'}},
    h: {rows: ['.....ab.....', '....abbc....', '...aabbbc...', '..aabbbbcc..', '.aabbbbbbcc.', 'aabbdbbbbccc', '.abbbbdbbcc.', '..abbbbbcc..', '...abbbcc...', '....abcc....', '.....bc.....'], pal: {a: '#f3e4ff', b: '#c79cf0', c: '#7d48bd', d: '#ffffff'}},
  };
  SHARD.m = {rows: SHARD.s.rows, pal: GOLDPAL}; SHARD.l = {rows: SHARD.h.rows, pal: GOLDPAL};   // 金色 = 火苗亮时得的，面值翻倍
  SHARD.o = {rows: ['...aab...', '..aabbc..', '.aabbbcc.', '.abbdbcc.', '..abbcc..', '...bcc...'], pal: {a: '#ffd6e6', b: '#e8679a', c: '#9a2f5c', d: '#fff0f6'}};   // 杂色碎片
  const isOdd = t => G.ODD.includes(t), artOf = t => (isOdd(t) ? 'o' : t);
  const GEMPIX = {rows: ['..aaaa..', '.abbbba.', 'abbccbba', 'abcccbba', '.abbbba.', '..abba..', '...aa...'], pal: {a: '#0f6e6e', b: '#1fc8b8', c: '#c8fff4'}};
  const URLS = {};
  const shardURL = t => { const a = artOf(t); return URLS[a] || (URLS[a] = px(SHARD[a].rows, SHARD[a].pal, 4).toDataURL()); };
  const gemURL = () => URLS.gem || (URLS.gem = px(GEMPIX.rows, GEMPIX.pal, 6).toDataURL());
  const chip = t => `<i class="frag t-${t}${isOdd(t) ? ' o' : ''}${['b', 'g', 'm', 'l'].includes(t) ? ' gold' : ''}"><img src="${shardURL(t)}" alt=""><b>${G.VALUE[t]}</b></i>`;

  // ---------- 声音：和家里一样用系统合成，不带音频文件 ----------
  let AC = null;
  function blip(notes, type) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state !== 'running') AC.resume(); notes.forEach(([f, t, d]) => { const o = AC.createOscillator(), a = AC.createGain(); o.type = type || 'square'; o.frequency.value = f; a.gain.value = 0.05; o.connect(a); a.connect(AC.destination); o.start(AC.currentTime + t); a.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + t + d); o.stop(AC.currentTime + t + d); }); } catch (e) {} }

  // ---------- 飞行动画 ----------
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // 动画被系统暂停（切到矿场再回来）时 finished 可能一直不结束：到点就往下走
  const settled = (an, ms) => Promise.race([an.finished.catch(() => {}), wait(ms + 500)]);
  const centre = el => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
  function flyImg(url, from, to, size, ms, lift) {
    const e = document.createElement('img'); e.src = url; e.className = 'flying'; e.style.width = size + 'px';
    document.body.appendChild(e);
    const [x0, y0] = from, [x1, y1] = to, mx = (x0 + x1) / 2, my = Math.min(y0, y1) - (lift === undefined ? 60 : lift);
    const at = (x, y, sc, rot) => ({transform: `translate(${x - size / 2}px,${y - size / 2}px) scale(${sc}) rotate(${rot}deg)`});
    const an = e.animate([at(x0, y0, 1, 0), at(mx, my, 1.15, 160), at(x1, y1, 0.8, 340)], {duration: ms, easing: 'cubic-bezier(.3,.1,.5,1)'});
    return settled(an, ms).then(() => e.remove());
  }

  // ---------- 场景：石墙、熔炉、铁砧、小人和小狗，一直在动 ----------
  const fire = {heat: 0, hit: 0, flash: 0, parts: [], t: 0, raf: 0, cv: null, g: null, S: 2, W: 0, H: 0};
  function layoutScene() {
    const root = c.$('forge'), w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight, cv = c.$('forgeScene');
    fire.S = Math.max(2, Math.floor(Math.min(w / 240, h / 110)));
    fire.W = Math.ceil(w / fire.S); fire.H = Math.ceil(h / fire.S);
    cv.width = fire.W; cv.height = fire.H; fire.cv = cv; fire.g = cv.getContext('2d'); fire.g.imageSmoothingEnabled = false;
    fire.floor = fire.H - 20; fire.fx = fire.W - 62; fire.fy = fire.floor - 34;
    fire.hero = fire.hero || {a: spriteCanvas(window.WORLD.HERO, 'a'), b: spriteCanvas(window.WORLD.HERO, 'b')};
    fire.dog = fire.dog || {a: spriteCanvas(window.WORLD.DOG, 'a'), b: spriteCanvas(window.WORLD.DOG, 'b')};
  }
  function spriteCanvas(sp, f) { const cv = document.createElement('canvas'); window.WORLD.drawSprite(cv, sp, f); return cv; }
  const mouth = () => { const b = fire.cv.getBoundingClientRect(); return [b.left + (fire.fx + 17) * fire.S, b.top + (fire.fy + 21) * fire.S]; };
  const anvilPt = () => { const b = fire.cv.getBoundingClientRect(); return [b.left + (fire.fx - 15) * fire.S, b.top + (fire.floor - 12) * fire.S]; };
  const bucketPt = () => { const b = fire.cv.getBoundingClientRect(); return [b.left + (fire.W - 12) * fire.S, b.top + (fire.floor - 10) * fire.S]; };
  function spark(n, lx, ly, colors, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (sp || 1.6) * (0.4 + Math.random()); fire.parts.push({x: lx, y: ly, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 16 + Math.random() * 18, c: colors[i % colors.length], g: 0.09}); } }
  function smoke(n) { for (let i = 0; i < n; i++) fire.parts.push({x: fire.fx + 12 + Math.random() * 10, y: fire.fy + 8, vx: (Math.random() - 0.5) * 0.5, vy: -0.5 - Math.random() * 0.5, life: 30 + Math.random() * 24, c: ['#3a3e47', '#55585f', '#24262c'][i % 3], g: -0.002, big: 1}); }
  function drawScene() {
    const g = fire.g, W = fire.W, H = fire.H, F = fire.floor, t = ++fire.t;
    const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
    // 墙和地
    r('#22252c', 0, 0, W, H);
    for (let y = 0; y < F; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < W; x += 16) { r('#2b2f37', x, y, 15, 7); r('#343842', x, y, 15, 1); }
    r('#3b2c20', 0, F, W, H - F); r('#4a3828', 0, F, W, 2);
    for (let x = 0; x < W; x += 12) r('#33261b', x + ((t >> 5) * 0), F + 6, 8, 1);
    // 火光照亮墙面
    const fx = fire.fx, fy = fire.fy, heat = fire.heat, flick = (Math.sin(t / 3) + Math.sin(t / 7)) / 2;
    const glowR = 46 + heat * 34 + flick * 3, glow = g.createRadialGradient(fx + 17, fy + 22, 2, fx + 17, fy + 22, glowR), ga = Math.min(0.75, 0.22 + 0.06 * flick + heat * 0.3 + fire.flash * 0.35);
    glow.addColorStop(0, `rgba(240,140,50,${ga})`); glow.addColorStop(1, 'rgba(224,118,42,0)'); g.fillStyle = glow; g.fillRect(fx + 17 - glowR, fy + 22 - glowR, glowR * 2, glowR * 2);
    // 熔炉（放大 2 倍画家里同一件）
    g.save(); g.translate(fx, fy); g.scale(2, 2); window.ART.item(g, 'furnace', 0, 0); g.restore();
    const fh = 3 + Math.round(heat * 5) + (t % 8 < 4 ? 1 : 0);
    r(fire.flash > 0.4 ? '#fff' : '#b3261e', fx + 9, fy + 26 - 0, 16, 2);
    r(heat > 0.5 ? '#fff3b0' : '#f2c14e', fx + 11, fy + 26 - fh, 12, fh);
    r('#e0762a', fx + 9 + (t % 6 < 3 ? 0 : 2), fy + 26 - Math.max(2, fh - 3), 4, Math.max(2, fh - 3));
    r('#e0762a', fx + 21 - (t % 6 < 3 ? 0 : 2), fy + 26 - Math.max(2, fh - 4), 4, Math.max(2, fh - 4));
    // 铁砧
    const ax = fx - 24, ay = F - 12; r('#50535b', ax, ay, 18, 4); r('#6c6f76', ax, ay, 18, 1); r('#50535b', ax + 5, ay + 4, 8, 5); r('#3a3d44', ax + 2, ay + 9, 14, 3);
    if (fire.work) { r(fire.hit > 0 ? '#fff3b0' : '#f2c14e', ax + 4, ay - 3, 10, 3); r('#e0762a', ax + 4, ay - 1, 10, 1); }
    // 小人和锤子
    const hx = ax - 19, hy = F - 30, idle = (t >> 4) % 2, down = fire.hit > 0;
    g.drawImage(idle ? fire.hero.a : fire.hero.b, hx, hy, fire.hero.a.width * 2, fire.hero.a.height * 2);
    const hmX = hx + 20, hmY = hy + 12;
    if (down) { r('#8a5a2c', hmX - 2, hmY + 3, 13, 2); r('#c9ccd2', hmX + 9, hmY - 2, 6, 9); r('#6c6f76', hmX + 9, hmY + 5, 6, 2); }
    else { r('#8a5a2c', hmX - 1, hmY - 12, 2, 13); r('#c9ccd2', hmX - 5, hmY - 18, 10, 6); r('#6c6f76', hmX - 5, hmY - 13, 10, 1); }
    // 小狗
    g.drawImage((t >> 5) % 2 ? fire.dog.a : fire.dog.b, hx - 26, F - 12 - (heat > 0.6 ? t % 4 < 2 ? 2 : 0 : 0), fire.dog.a.width * 2, fire.dog.a.height * 2);
    // 废料桶
    const bx = W - 20; r('#3a3d44', bx, F - 16, 16, 16); r('#6c6f76', bx - 1, F - 17, 18, 2); r('#2a2d34', bx + 2, F - 13, 2, 12);
    // 粒子：平时也有火星往上飘
    if (t % 18 === 0) fire.parts.push({x: fx + 10 + Math.random() * 14, y: fy + 20, vx: (Math.random() - 0.5) * 0.3, vy: -0.45, life: 34, c: '#f2c14e', g: -0.003});
    fire.parts = fire.parts.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; if (p.life > 0) { const s = p.big ? 3 : 1; r(p.c, p.x, p.y, s, s); return true; } return false; });
    fire.hit = Math.max(0, fire.hit - 1); fire.flash = Math.max(0, fire.flash - 0.03); if (!busy) fire.heat = Math.max(0, fire.heat - 0.006);
    if (c.cur() === 'forge') fire.raf = requestAnimationFrame(drawScene); else fire.raf = 0;
  }
  function startScene() { layoutScene(); if (!fire.raf) fire.raf = requestAnimationFrame(drawScene); }

  // ---------- 锻造台：炉子里不显示合计，要自己算 ----------
  let busy = false, hold = 0;
  // 锻造室每天只能进 5 次（Ben 11-09）：进门就算一次；用完了不进门，在当前页面提示明天再来
  function openForge(from) {
    if (!on || !c.canWrite()) return;
    const r = G.forgeEnter(st, c.today());
    if (!r.ok) { toast(`今天的 ${G.FORGE_DAY} 次锻造已用完，明天再来`); islandBtn(); return; }
    save(); back = from || 'island'; slots = []; msg = ''; mode = 'gem'; c.$('forgeWarn').hidden = true; c.show('forge'); draw(); startScene();
    toast(r.left ? `今天还可进入锻造室 ${r.left} 次` : '这是今天最后一次进入锻造室', true); islandBtn();
  }
  // 结算页、挑战结束页的「去锻造」：今天 5 次用完就换成灰色的「今天锻造次数已用完」，点不了（审查建议 1：亮绿按钮会让孩子反复点）
  const forgeBtn = attr => (G.forgeLeft(st, c.today()) ? `<button class="btn go" ${attr}>去锻造</button>` : `<button class="btn" ${attr} disabled>今天锻造次数已用完</button>`);
  const forgeBlocked = () => (on && st && c.canWrite() && !G.forgeLeft(st, c.today()) ? `今天的 ${G.FORGE_DAY} 次锻造已用完，明天再来` : '');   // 家里熔炉先问一下，用完了留在家里提示（审查建议 2）
  // 顶部居中的短提示，岛上 2.5 秒、锻造室里 1.5 秒后消失（锻造室里放在炉子格子上，短一点免得挡住放碎片，审查建议 3）（锻造次数用）
  let toastT = 0;
  function toast(text, mid) {   // mid：锻造室里放在中间（刚进门炉子格子是空的），不盖住上面的「炼宝石 / 炼大碎片」
    let el = document.getElementById('gemToast');
    if (!el) { el = document.createElement('div'); el.id = 'gemToast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = text; el.classList.toggle('mid', !!mid); el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, mid ? 1500 : 2500);
  }
  function setMode(m) { if (busy || m === mode) return; mode = m; slots = []; msg = ''; blip([[440, 0, 0.05]]); draw(); }
  const slotN = () => (mode === 'big' ? G.BIG_SLOTS : G.SLOTS);
  const placed = t => slots.filter(x => x === t).length;
  function add(t) {
    if (busy) return;
    if (mode === 'big' && t === 'l') return;
    if (slots.length >= slotN()) { msg = `炉子最多放 ${slotN()} 个`; blip([[140, 0, 0.12]]); c.$('forgeSlots').classList.remove('nope'); void c.$('forgeSlots').offsetWidth; c.$('forgeSlots').classList.add('nope'); return draw(); }
    if (placed(t) >= (st.inv[t] || 0)) return;
    const from = c.$('forgeList').querySelector(`[data-add="${t}"] img`), i = slots.length;
    slots.push(t); msg = ''; draw();
    const cell = c.$('forgeSlots').children[i], target = cell.querySelector('.frag');
    blip([[520 + i * 40, 0, 0.06]]);
    if (from && target) { target.style.visibility = 'hidden'; flyImg(shardURL(t), centre(from), centre(cell), 30, 300, 24).then(() => { target.style.visibility = ''; target.classList.add('land'); }); }
  }
  const T = {gap: 170, fly: 620, heat: 800, strike: 430, after: 190, rise: 800, stay: 650, toCount: 520, slagGap: 120, slagFly: 620};   // 锻造节奏（毫秒）：Ben 11-07 嫌快，整体放慢约 3 倍
  async function doForge(sure) {
    if (busy) return;
    if (!slots.length) { msg = '先放碎片'; return draw(); }
    const r = {}; slots.forEach(t => { r[t] = (r[t] || 0) + 1; });
    const big = mode === 'big', warn = big ? !G.exactBig(r) : !G.enough(r) && !G.dayFull(st, c.today());
    if (!sure && warn) {   // 开炉前提醒，写清差多少、多多少（10.2，中控 11-08：原来不说，空空两天坚持锻造出 795 点废料）
      const gp = G.forgeGap(r, big ? 'big' : 'gem'), w = c.$('forgeWarn');
      w.querySelector('b').textContent = big ? (gp.over ? `合计 ${gp.sum}，多了 ${gp.over}，炼不出大碎片` : `合计 ${gp.sum}，还差 ${gp.short}，炼不出大碎片`) : `合计 ${gp.sum}，还差 ${gp.short}，炼不出宝石`;
      blip([[200, 0, 0.14]], 'triangle'); msg = ''; draw(); w.hidden = false; return;
    }
    const res = big ? G.forgeBig(st, r, c.today()) : G.forge(st, r, c.today());   // 先算先存：动画中途退出也不丢
    if (!res.ok) { if (res.why === 'daily') msg = `今天已炼 ${G.DAY_MAX} 颗，碎片留到明天`; return draw(); }
    save(); hold = big ? 0 : res.gems;
    const won = big ? res.big : res.gems;
    const done = big ? (won ? '得到金色大碎片 1' : `没有炼出大碎片，废料 ${res.waste}`) : res.gems ? `得到宝石 1，废料 ${res.waste}` : `没有炼出宝石，废料 ${res.waste}`;
    busy = true; msg = ''; c.$('forgeMsg').textContent = ''; const cells = [...c.$('forgeSlots').children], list = slots.slice(), root = c.$('forge');
    root.classList.add('working');
    try {
    // 碎片一个个飞进炉膛
    await Promise.all(list.map((t, i) => wait(i * T.gap).then(() => { const cell = cells[i], x = centre(cell); const f = cell.querySelector('.frag'); if (f) f.style.visibility = 'hidden'; blip([[300 + i * 30, 0, 0.05]]); fire.heat = Math.min(1, fire.heat + 0.09); return flyImg(shardURL(t), x, mouth(), 30, T.fly).then(() => spark(3, fire.fx + 17, fire.fy + 20, ['#f2c14e', '#e0762a'], 1)); })));
    slots = []; draw();
    // 炉火烧一会儿
    blip([[90, 0, 0.5]], 'sawtooth'); smoke(6); fire.heat = 1; await wait(T.heat);
    if (!won) {
      // 不够：闷响、冒黑烟，炉里的东西全成废料进桶
      fire.work = true; await wait(T.strike); fire.hit = 12; blip([[110, 0, 0.18], [80, 0.15, 0.22]], 'sawtooth'); smoke(30); fire.work = false; fire.heat = 0.1;
      root.classList.add('shake'); await wait(300); root.classList.remove('shake');
      await Promise.all(list.map((t, i) => wait(i * T.slagGap).then(() => flyImg(SLAG(), mouth(), bucketPt(), 16, T.slagFly, 14))));
      spark(10, fire.W - 12, fire.floor - 16, ['#6c6f76', '#9a9da4'], 0.8);
    } else {
      // 够：抡三锤，火星四溅，宝石蹦出来
      fire.work = true;
      for (let i = 0; i < 3; i++) {
        await wait(T.strike); fire.hit = 12; fire.flash = Math.min(1, fire.flash + 0.3); spark(14 + i * 8, fire.fx - 15, fire.floor - 13, ['#fff3b0', '#f2c14e', '#e0762a'], 1.8 + i * 0.4);
        blip([[880 - i * 60, 0, 0.05], [220, 0.01, 0.08]]); root.classList.add('shake'); await wait(T.after); root.classList.remove('shake');
      }
      fire.work = false; fire.flash = 1; fire.heat = 1; spark(50, fire.fx + 17, fire.fy + 20, ['#c8fff4', '#1fc8b8', '#fff3b0'], 2.6);
      blip([[660, 0, 0.1], [880, 0.09, 0.1], [1320, 0.18, 0.22]]);
      await gemPop(big);
      if (res.waste) { blip([[160, 0, 0.1]], 'triangle'); await Promise.all([0, 1, 2].map(i => wait(i * T.slagGap).then(() => flyImg(SLAG(), mouth(), bucketPt(), 16, T.slagFly, 14)))); spark(8, fire.W - 12, fire.floor - 16, ['#6c6f76', '#9a9da4'], 0.8); }
    }
    } catch (e) { /* 动画出错不影响结果：碎片和宝石开始前已存好 */ }
    fire.work = false; hold = 0; slots = []; msg = done; root.classList.remove('working', 'shake'); busy = false; draw();
    c.$('forgeMsg').classList.remove('pop'); void c.$('forgeMsg').offsetWidth; c.$('forgeMsg').classList.add('pop');
  }
  const SLAG = () => URLS.slag || (URLS.slag = px(['.aab.', 'aaabb', 'abbbb', '.bbb.'], {a: '#8a8d94', b: '#55585f'}, 4).toDataURL());
  async function gemPop(big) {   // big：蹦出来的是大碎片，飞回左边的碎片列表
    const e = document.createElement('div'); e.className = 'gempop'; e.innerHTML = `<span class="rays"></span><img src="${big ? shardURL('l') : gemURL()}" alt="">`;
    document.body.appendChild(e);
    const [mx, my] = mouth(), to = centre(c.$(big ? 'forgeList' : 'forgeToday')), cy = Math.max(70, my - 110);
    const place = (x, y, s) => ({transform: `translate(${x - 60}px,${y - 60}px) scale(${s})`});
    await settled(e.animate([place(mx, my, 0.2), place(mx, cy, 1.25), place(mx, cy, 1)], {duration: T.rise, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'forwards'}), T.rise);
    await wait(T.stay);
    await settled(e.animate([place(mx, cy, 1), place(to[0], to[1], 0.25)], {duration: T.toCount, easing: 'ease-in', fill: 'forwards'}), T.toCount);
    e.remove();
    hold = 0; draw(); const t = c.$(big ? 'forgeList' : 'forgeToday'); t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
  }
  function claim() {
    if (busy) return;
    const today = c.today();
    if (!G.items(st, today)) return;
    G.reserve(st, today);
    if (!G.netTotal(st, today)) { save(); msg = '宝石留给伙伴罐了'; draw(); return; }   // 只炼 1 颗全留：不用去矿场
    st.sentBak = Object.assign({}, st.sent);   // 领取失败恢复这份，不清空：清空会让罐凭空变多
    G.markSent(st, today); save(); msg = '';
    draw();
    const link = KM.earnLink(G.items(st, today));
    window.__gemLink = link;
    if (c.enabledInApp) location.href = link;
  }
  const hasOdd = () => G.ODD.some(t => (st.inv[t] || 0) > 0);
  function oddList() {
    if (!hasOdd()) return '';
    return `<div class="oddbox"><span>杂色碎片</span><div class="oddgrid">${G.ODD.filter(t => (st.inv[t] || 0) > 0).map(t => { const left = st.inv[t] - placed(t); return `<button class="oddchip" data-add="${t}"${left > 0 ? '' : ' disabled'}>${chip(t)}<em class="num">${left}</em></button>`; }).join('')}</div></div>`;
  }
  function draw() {
    const $ = c.$;
    const shown = G.MAIN.filter(t => (st.inv[t] || 0) > 0 || (mode === 'big' && t === 'l'));   // 炼大碎片时大碎片也列出来（只看数量、不能放），炼出来看得见多了 1 个
    $('fmGem').classList.toggle('on', mode === 'gem'); $('fmBig').classList.toggle('on', mode === 'big'); $('forgeGo').textContent = mode === 'big' ? '炼大碎片' : '锻造';
    $('forgeList').innerHTML = (shown.length ? shown : ['m']).map(t => {
      const left = st.inv[t] - placed(t);
      return `<button class="fragrow" data-add="${t}"${left > 0 && !(mode === 'big' && t === 'l') ? '' : ' disabled'}>${chip(t)}<span>${NAME[t]}</span><em class="num">${left || 0}</em></button>`;
    }).join('') + oddList();
    $('forgeList').classList.toggle('hasOdd', hasOdd());
    $('forgeList').classList.toggle('many', shown.length > 3);
    $('forgeSlots').classList.toggle('big', mode === 'big');
    $('forgeSlots').innerHTML = Array.from({length: slotN()}, (_, i) => (slots[i] ? `<button class="fslot" data-i="${i}">${chip(slots[i])}</button>` : '<span class="fslot"></span>')).join('');
    $('forgeMsg').textContent = msg;
    const today = c.today(), done = (st.days[today] ? st.days[today].forged : 0) - hold, items = G.items(st, today), left = G.unsent(st, today);
    $('forgeToday').innerHTML = `<img src="${gemURL()}" alt=""><b class="num">${done}</b><span>今天炼出</span><span class="ft14">近 ${G.RECENT_DAYS} 天 ${G.recentForged(st, today) - hold}</span>`;
    const fl = G.forgeLeft(st, today), fe = $('forgeLeft'); if (fe) fe.textContent = fl ? `今天还可进入 ${fl} 次` : '今天最后一次进入';   // 锻造每天 5 次（Ben 11-09）
    const b = $('forgeClaim');
    b.hidden = !c.canClaim || !items || hold > 0; const keep = G.jarWant(st, today); b.textContent = !left ? '再领一次' : keep ? (left > keep ? `留 ${keep} 颗给伙伴罐，领 ${left - keep} 颗` : `留 ${keep} 颗给伙伴罐`) : `领 ${left} 颗宝石`;
    b.classList.toggle('go', left > 0);
  }
  // 答题时碎片从屏幕中间飞向顶部
  function floatShard(t, i) { setTimeout(() => floatNow(t), (i || 0) * 160); }
  // 碎片飞到练习页的计数；思维地点飞到矿石数字正中（审查 11-08：原偏移按练习页宽计数定，在矿石数字上会落到右边、窄屏出界）
  // 给家里画徽章册用（E）：n = 累计水晶；badges 每个题型一枚：got = 答对满 3 道，shiny = 这个题型的格子全部深红（闪光徽章）；master = 11 枚都拿到（奖状「解谜大师」）
  function puzzleState() {
    if (!on || !st) return null;
    const K = window.SKILLS, lv = id => (c.E && c.E.lv ? c.E.lv(S(), id) || 0 : 0);
    const badges = G.puzzleBadges(st, Object.keys(PUZZLE_NAME)).map(b => { const sk = K && K.BY && K.BY[b.sid]; return Object.assign(b, {name: PUZZLE_NAME[b.sid], shiny: b.got && !!(sk && sk.items.length && sk.items.every(it => lv(it.id) >= 3))}); });   // 闪光要先有普通徽章（审查建议 1：旧进度格子已深红、水晶不补发时不会只闪光没徽章）
    return {n: G.puzzleCount(st), badges, master: badges.every(b => b.got)};
  }
  // 水晶从题目飞到左上角矿石数那里（和碎片同一套飞入），声音高一点和碎片区分
  function flyCrystal() { try { const q = c.$('qMined') && c.$('qMined').getBoundingClientRect(), to = q && q.width ? [q.left + q.width / 2, q.top + q.height / 2] : [innerWidth * 0.3, 20]; flyImg(CRYSTAL, [innerWidth * 0.32, innerHeight * 0.45], to, 26, 520, 30); blip([[988, 0, 0.05], [1318, 0.06, 0.09]]); } catch (e) {} }
  function floatNow(t) { try { const q = c.$('qMined') && c.$('qMined').getBoundingClientRect(), th = document.querySelector('#think:not([hidden]) #oreN'), to = q && q.width ? q : th ? th.getBoundingClientRect() : c.$('pCount') && c.$('pCount').getBoundingClientRect(); flyImg(shardURL(t), [innerWidth * 0.32, innerHeight * 0.45], th && !(q && q.width) ? [to.left + to.width / 2, to.top + to.height / 2] : [to && to.width ? to.left + 20 : innerWidth * 0.3, to && to.height ? to.top + 10 : 20], (G.VALUE[t] || 0) >= 10 ? 28 : 20, 480, 30); if ((G.VALUE[t] || 0) >= 10) blip([[784, 0, 0.05], [1046, 0.05, 0.08]]); } catch (e) {} }

  // 碎片出任何问题都不能挡住练习：关掉碎片，练习照常
  const safe = (fn, dflt) => (...a) => { try { return fn(...a); } catch (e) { on = false; return dflt; } };
  // api.total：碎片个数（家长一键同步的结果用；按个数和孩子看到的对得上）
  const api = {init: safe(init), enabled: () => on, exportState: safe(exportState, null), total: safe(() => (on && st ? Object.keys(st.inv).reduce((n, t) => n + (G.worth([t]) > 0 ? st.inv[t] || 0 : 0), 0) : null), null), importBackup: safe(importBackup, false), answerThink: safe(answerThink, null), syncNow: safe(syncNow), answerQ: safe(answerQ), answerP: safe(answerP), summary: safe(summary, ''), puzzle: safe(puzzleState, null), CRYSTAL, puzzleNames: () => Object.assign({}, PUZZLE_NAME), forgeBlocked: safe(forgeBlocked, ''), placeLine: safe(placeLine, ''), bind: safe(bind), openForge: safe(openForge), state: () => st,
    parentStats, islandBtn: safe(islandBtn), askQuit: (q, done) => { let held = false; try { held = on && gateQuit(q, done); } catch (e) { held = false; } if (!held) done(); }, finishChallenge: q => { try { return finishChallenge(q); } catch (e) { on = false; c.goIsland(); } }};
  window.GEMUI = api;
})();
