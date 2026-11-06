// 空空数学岛 · 碎片、锻造台、挑战的界面。规则都在 gems.js，这里只管显示和存取
// 手机网页和 iPad App 都开；领宝石只在 App 里有，手机上没有空空矿场（测试：#test 下要带 ?gems=1）
(function () {
  'use strict';
  const G = window.GEMS, KM = window.KM;
  const NAME = {s: '小碎片', m: '中碎片', l: '大碎片'};
  let c = null, st = null, on = false, slots = [], back = 'island', msg = '';

  function save() { if (!on || !c.canWrite()) return; try { c.store.setItem(c.key, JSON.stringify(st)); } catch (e) {} }
  const S = () => c.S();
  const auto = () => c.E.autoLevel(S());
  function syncNow() { if (on) { G.sync(st, S(), auto()); save(); } }

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
    c.$('forgeGo').addEventListener('click', doForge);
    c.$('forgeClaim').addEventListener('click', claim);
    c.$('forgeBack').addEventListener('click', () => { if (busy) return; if (back === 'island') c.goIsland(); else c.show(back); });
    addEventListener('resize', () => { if (c.cur() === 'forge') layoutScene(); });
    if (window.ResizeObserver) new ResizeObserver(() => { if (c.cur() === 'forge' && c.$('forge').clientHeight) layoutScene(); }).observe(c.$('forge'));
    window.__kongEarnFailed = () => { st.sent = {}; save(); msg = '没有找到空空矿场'; if (c.cur() === 'forge') draw(); };
  }

  // ---------- 记作答：判定一出来就调，在显示答案和存进度之前 ----------
  function credit(run, got) { if (got) { run.gem = run.gem || {s: 0, m: 0}; run.gem[got]++; floatShard(got); } }
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
    if (!on || !c.canWrite() || run.kind === 'boss' || run.kind === 'scan' || run.kind === 'final') return '';   // Boss、摸底不算；只读时不结算
    opts = opts || {};
    const set = G.settle(st, day), g = run.gem || {s: 0, m: 0};
    let ticket = false;
    if (opts.todayRun && !S().oral) ticket = G.earnTicket(st, {done: !!(S().daily && S().daily.done), n: run.n || 0});
    G.prune(st, c.today()); save();
    const more = opts.todayRun && S().daily && S().daily.done && c.E.hasMore(S(), c.today());
    return `<div class="gemsum">
      <b>这次的碎片</b>
      <div class="gemline">${chip('s')}<span>+${g.s}</span>${chip('m')}<span>+${g.m}</span>${set.bonus ? `<span>认真奖励 ${'★'.repeat(set.stars)}</span>${chip('m')}<span>+${set.bonus}</span>` : ''}${ticket ? '<span>挑战券 +1</span>' : ''}</div>
      <div class="gemline muted"><span>背包</span>${chip('s')}<span>${st.inv.s}</span>${chip('m')}<span>${st.inv.m}</span>${chip('l')}<span>${st.inv.l}</span><span>挑战券 ${st.tickets}</span></div>
      <div class="gembtns"><button class="btn go" data-gem="forge">去锻造</button>${more ? `<button class="btn" data-gem="more">${S().oral ? '再练一会' : '再练一会 · 得 1 张挑战券'}</button>` : ''}${st.tickets > 0 && !S().oral ? `<button class="btn" data-gem="challenge">挑战 · 大碎片</button>` : ''}</div>
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
    const won = q.chWon || 0, r = G.finishChallenge(st, {won, n: q.chDone === G.CH_N ? G.CH_N : 0});
    save();
    c.$('qsum').innerHTML = `<div class="col" style="flex:1;justify-content:center;align-items:center;gap:14px">
      <div style="font-size:28px;font-weight:900">挑战结束</div>
      <div style="font-size:18px">答对 ${won} / ${G.CH_N} 题</div>
      ${r.big ? `<div class="bigwin"><span class="rays"></span><img src="${shardURL('l')}" alt=""></div><div style="font-size:18px;font-weight:900;color:var(--warn)">大碎片 +1</div>` : ''}
      <div class="gemline">${chip('m')} +${won}</div>
      <div class="gembtns"><button class="btn go" id="chForge">去锻造</button><button class="btn" id="chHome">回到岛上</button></div></div>`;
    c.show('qsum');
    if (r.big) blip([[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1046, 0.3, 0.3]]);
    c.$('chForge').addEventListener('click', () => openForge('island'));
    c.$('chHome').addEventListener('click', () => c.goIsland());
  }

  // ---------- 像素图：碎片和宝石都是原创造型，图片只生成一次 ----------
  const px = (rows, pal, scale) => { const c = document.createElement('canvas'); c.width = rows[0].length * scale; c.height = rows.length * scale; const g = c.getContext('2d'); rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * scale, y * scale, scale, scale); } })); return c; };
  const SHARD = {
    s: {rows: ['...ab...', '..abbc..', '..abbc..', '.abbbcc.', '.abbcc..', '..bcc...'], pal: {a: '#f4f6fa', b: '#c3cbd6', c: '#7d8592'}},
    m: {rows: ['....ab...', '...abbc..', '..abbbcc.', '.aabbbcc.', '.abbbbcc.', '..abbcc..', '...bcc...', '....c....'], pal: {a: '#d8f4ff', b: '#6fc3e8', c: '#2b7fb0'}},
    l: {rows: ['.....ab.....', '....abbc....', '...aabbbc...', '..aabbbbcc..', '.aabbbbbbcc.', 'aabbdbbbbccc', '.abbbbdbbcc.', '..abbbbbcc..', '...abbbcc...', '....abcc....', '.....bc.....'], pal: {a: '#f3e4ff', b: '#c79cf0', c: '#7d48bd', d: '#ffffff'}},
  };
  const GEMPIX = {rows: ['..aaaa..', '.abbbba.', 'abbccbba', 'abcccbba', '.abbbba.', '..abba..', '...aa...'], pal: {a: '#0f6e6e', b: '#1fc8b8', c: '#c8fff4'}};
  const URLS = {};
  const shardURL = t => URLS[t] || (URLS[t] = px(SHARD[t].rows, SHARD[t].pal, 4).toDataURL());
  const gemURL = () => URLS.gem || (URLS.gem = px(GEMPIX.rows, GEMPIX.pal, 6).toDataURL());
  const chip = t => `<i class="frag ${t}"><img src="${shardURL(t)}" alt=""><b>${G.VALUE[t]}</b></i>`;

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
  function openForge(from) { if (!on || !c.canWrite()) return; back = from || 'island'; slots = []; msg = ''; c.show('forge'); draw(); startScene(); }
  const placed = t => slots.filter(x => x === t).length;
  function add(t) {
    if (busy) return;
    if (slots.length >= G.SLOTS) { msg = `炉子最多放 ${G.SLOTS} 个`; blip([[140, 0, 0.12]]); c.$('forgeSlots').classList.remove('nope'); void c.$('forgeSlots').offsetWidth; c.$('forgeSlots').classList.add('nope'); return draw(); }
    if (placed(t) >= st.inv[t]) return;
    const from = c.$('forgeList').querySelector(`[data-add="${t}"] img`), i = slots.length;
    slots.push(t); msg = ''; draw();
    const cell = c.$('forgeSlots').children[i], target = cell.querySelector('.frag');
    blip([[520 + i * 40, 0, 0.06]]);
    if (from && target) { target.style.visibility = 'hidden'; flyImg(shardURL(t), centre(from), centre(cell), 30, 170, 24).then(() => { target.style.visibility = ''; target.classList.add('land'); }); }
  }
  async function doForge() {
    if (busy) return;
    if (!slots.length) { msg = '先放碎片'; return draw(); }
    const r = {s: placed('s'), m: placed('m'), l: placed('l')}, res = G.forge(st, r, c.today());   // 先算先存：动画中途退出也不丢
    if (!res.ok && res.why !== 'short') { if (res.why === 'daily') msg = `今天已炼 ${G.DAY_MAX} 颗，碎片留到明天`; return draw(); }
    if (res.ok) { save(); hold = 1; }
    const done = res.ok ? `得到宝石 1，废料 ${res.waste}` : `还差 ${res.short}，碎片退回`;
    busy = true; msg = ''; c.$('forgeMsg').textContent = ''; const cells = [...c.$('forgeSlots').children], list = slots.slice(), root = c.$('forge');
    root.classList.add('working');
    try {
    // 碎片一个个飞进炉膛
    await Promise.all(list.map((t, i) => wait(i * 55).then(() => { const cell = cells[i], x = centre(cell); const f = cell.querySelector('.frag'); if (f) f.style.visibility = 'hidden'; blip([[300 + i * 30, 0, 0.05]]); fire.heat = Math.min(1, fire.heat + 0.09); return flyImg(shardURL(t), x, mouth(), 30, 300).then(() => spark(3, fire.fx + 17, fire.fy + 20, ['#f2c14e', '#e0762a'], 1)); })));
    slots = []; draw();
    if (!res.ok) {
      // 不够：冒黑烟，碎片弹回背包
      blip([[110, 0, 0.18], [80, 0.15, 0.22]], 'sawtooth'); smoke(26); fire.heat = 0.1;
      root.classList.add('shake'); await wait(260); root.classList.remove('shake');
      await Promise.all(list.map((t, i) => wait(i * 25).then(() => flyImg(shardURL(t), mouth(), centre(c.$('forgeList').querySelector(`[data-add="${t}"] img`)), 30, 280))));
    } else {
      // 够：抡三锤，火星四溅，宝石蹦出来
      fire.work = true;
      for (let i = 0; i < 3; i++) {
        await wait(200); fire.hit = 12; fire.flash = Math.min(1, fire.flash + 0.3); spark(14 + i * 8, fire.fx - 15, fire.floor - 13, ['#fff3b0', '#f2c14e', '#e0762a'], 1.8 + i * 0.4);
        blip([[880 - i * 60, 0, 0.05], [220, 0.01, 0.08]]); root.classList.add('shake'); await wait(110); root.classList.remove('shake');
      }
      fire.work = false; fire.flash = 1; fire.heat = 1; spark(50, fire.fx + 17, fire.fy + 20, ['#c8fff4', '#1fc8b8', '#fff3b0'], 2.6);
      blip([[660, 0, 0.1], [880, 0.09, 0.1], [1320, 0.18, 0.22]]);
      await gemPop();
      if (res.waste) { blip([[160, 0, 0.1]], 'triangle'); await Promise.all([0, 1, 2].map(i => wait(i * 70).then(() => flyImg(SLAG(), mouth(), bucketPt(), 16, 360, 14)))); spark(8, fire.W - 12, fire.floor - 16, ['#6c6f76', '#9a9da4'], 0.8); }
    }
    } catch (e) { /* 动画出错不影响结果：碎片和宝石开始前已存好 */ }
    fire.work = false; hold = 0; slots = []; msg = done; root.classList.remove('working', 'shake'); busy = false; draw();
    c.$('forgeMsg').classList.remove('pop'); void c.$('forgeMsg').offsetWidth; c.$('forgeMsg').classList.add('pop');
  }
  const SLAG = () => URLS.slag || (URLS.slag = px(['.aab.', 'aaabb', 'abbbb', '.bbb.'], {a: '#8a8d94', b: '#55585f'}, 4).toDataURL());
  async function gemPop() {
    const e = document.createElement('div'); e.className = 'gempop'; e.innerHTML = `<span class="rays"></span><img src="${gemURL()}" alt="">`;
    document.body.appendChild(e);
    const [mx, my] = mouth(), to = centre(c.$('forgeToday')), cy = Math.max(70, my - 110);
    const place = (x, y, s) => ({transform: `translate(${x - 60}px,${y - 60}px) scale(${s})`});
    await settled(e.animate([place(mx, my, 0.2), place(mx, cy, 1.25), place(mx, cy, 1)], {duration: 520, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'forwards'}), 520);
    await wait(320);
    await settled(e.animate([place(mx, cy, 1), place(to[0], to[1], 0.25)], {duration: 300, easing: 'ease-in', fill: 'forwards'}), 300);
    e.remove();
    hold = 0; draw(); const t = c.$('forgeToday'); t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
  }
  function claim() {
    if (busy) return;
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
      return `<button class="fragrow" data-add="${t}"${left > 0 ? '' : ' disabled'}>${chip(t)}<span>${NAME[t]}</span><em class="num">${left}</em></button>`;
    }).join('');
    $('forgeSlots').innerHTML = Array.from({length: G.SLOTS}, (_, i) => (slots[i] ? `<button class="fslot" data-i="${i}">${chip(slots[i])}</button>` : '<span class="fslot"></span>')).join('');
    $('forgeMsg').textContent = msg;
    const today = c.today(), done = (st.days[today] ? st.days[today].forged : 0) - hold, items = G.items(st, today), left = G.unsent(st, today);
    $('forgeToday').innerHTML = `<img src="${gemURL()}" alt=""><b class="num">${done}</b><span>今天炼出</span>`;
    const b = $('forgeClaim');
    b.hidden = !c.canClaim || !items || hold > 0; b.textContent = left ? `领 ${left} 颗宝石` : '再领一次';
    b.classList.toggle('go', left > 0);
  }
  // 答题时碎片从屏幕中间飞向顶部
  function floatShard(t) { try { const to = c.$('qMined') && c.$('qMined').getBoundingClientRect(); flyImg(shardURL(t), [innerWidth * 0.32, innerHeight * 0.45], [to && to.width ? to.left + 20 : innerWidth * 0.3, to && to.height ? to.top + 10 : 20], t === 'm' ? 28 : 20, 480, 30); if (t === 'm') blip([[784, 0, 0.05], [1046, 0.05, 0.08]]); } catch (e) {} }

  // 碎片出任何问题都不能挡住练习：关掉碎片，练习照常
  const safe = (fn, dflt) => (...a) => { try { return fn(...a); } catch (e) { on = false; return dflt; } };
  const api = {init: safe(init), enabled: () => on, syncNow: safe(syncNow), answerQ: safe(answerQ), answerP: safe(answerP), summary: safe(summary, ''), bind: safe(bind), openForge: safe(openForge), state: () => st,
    finishChallenge: q => { try { return finishChallenge(q); } catch (e) { on = false; c.goIsland(); } }};
  window.GEMUI = api;
})();
