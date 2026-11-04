// 原型逻辑。进度状态都用真实排课代码跑出来（v2/engine.js + rewards.js），不是假数据
(function () {
  'use strict';
  const $ = id => document.getElementById(id), A = ART, H = HOME, E = ENGINE, C = SM, K = SKILLS;
  const KID = /[?&]kid=1/.test(location.search);
  const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const D0 = '2026-09-01';
  // ---------- 进度状态 ----------
  function build(days, acc) {
    C._resetDecks && C._resetDecks();   // 发题顺序是模块内状态：重置后同一进度状态每次一样
    const S = C.blank(); S.placedAt = 1; S.home = {ore: 0, got: {}, place: {}}; const rn = seeded(7919);
    const mark = d => { const e = H.earned(S); e.certs.concat(e.items, e.medals).forEach(x => { if (!S.home.got[x.id]) S.home.got[x.id] = d; }); };
    for (let i = 0; i < days; i++) {
      const d = C.addDays(D0, i), s = E.session(S, d, {rnd: seeded(1000 + i)});
      for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') { const ok = rn() < acc; if (ok) S.home.ore++; s.answer({ok, fast: ok && rn() < .8, secs: ok ? 6 : 10}); }
      mark(d);
    }
    S.today = C.addDays(D0, days);
    return S;
  }
  function buildFull() {
    const S = build(120, .92);
    K.SKILLS.forEach(s => s.items.forEach(i => { const p = E.prog(S, i.id); p.lv = 3; p.d = ['2026-09-01', '2026-09-02', '2026-09-06']; }));
    for (let i = 0; i < 200; i++) { const d = C.addDays(D0, i); S.stats[d] = S.stats[d] || {sec: 600, n: 40, ups: 0, over: 0, gap: 0}; }
    Object.values(S.mistakes).forEach(m => { m.due = null; });
    for (let i = 0; i < 60; i++) S.mistakes['x' + i] = {key: 'x' + i, uid: 'x', due: null, passes: 5};
    const e = H.earned(S); e.certs.concat(e.items, e.medals).forEach(x => { S.home.got[x.id] = S.home.got[x.id] || S.today; });
    return S;
  }
  const STATES = {start: ['刚开始（第 1 天）', () => build(1, .85)], month: ['1 个月', () => build(30, .85)], half: ['半年', () => build(180, .85)], full: ['全部获得', buildFull]};
  let S, stateKey = 'month', E0;
  function setState(k) {
    stateKey = k; S = STATES[k][1](); E0 = H.earned(S); autoPlace(); pets = [];
    // 进门就有一箱：最近一天得到的奖励
    const all = E0.certs.concat(E0.items, E0.medals), last = all.map(x => S.home.got[x.id]).sort().pop(); S.home.loot = all.filter(x => S.home.got[x.id] === last).slice(0, 8); S.home.pets = null;
  }

  // ---------- 屋子布局（art 像素） ----------
  const RH = 76, FLOOR = 62, RW = 668;
  const CW = {x: 8, y: 9, dx: 21, dy: 16.5, w: 19, h: 14};   // 奖状墙：3 排大图
  const certPos = {};
  H.CERTS.forEach(c => {
    const list = c.kind === 'learn' ? H.CERTS.filter(x => x.kind === 'learn') : c.kind === 'keep' ? H.CERTS.filter(x => x.kind === 'keep') : H.CERTS.filter(x => x.kind === 'day' || x.kind === 'fix');
    const row = c.kind === 'learn' ? 0 : c.kind === 'keep' ? 1 : 2, col = list.indexOf(c);
    certPos[c.id] = {x: CW.x + col * CW.dx, y: CW.y + row * CW.dy};
  });
  const DOOR = {x: 212, w: 18}, LOOT = {x: 188, w: 18}, CHEST = {x: 238, w: 16}, SIGN = {x: 234, y: 12, w: 22, h: 18}, BOOK = {x: 262, w: 22}, CAB = {x: 292, w: 30};
  const FS = [], WS = [];
  for (let i = 0; i < 18; i++) FS.push({id: 'F' + i, t: 'F', x: 332 + i * 18, y: FLOOR - 16});
  for (let i = 0; i < 18; i++) WS.push({id: 'W' + i, t: 'W', x: 332 + i * 18, y: 16});
  const SLOTS = {}; FS.concat(WS).forEach(s => { SLOTS[s.id] = s; });
  const placeable = () => E0.items.filter(i => !i.part);
  function autoPlace() {
    const pl = S.home.place = S.home.place || {}, used = new Set(Object.values(pl));
    placeable().forEach(i => { if (pl[i.id]) return; const t = A.ITEM[i.id].t, s = (t === 'F' ? FS : WS).find(s => !used.has(s.id)); if (s) { pl[i.id] = s.id; used.add(s.id); } });
  }
  const parts = () => E0.items.filter(i => i.part).map(i => i.id);

  // ---------- 画屋子 ----------
  const cvRoom = $('cvRoom'), cvFx = $('cvFx'), cvHero = $('cvHero');
  const frameCol = {learn: ['#c9a36b', '#f4ecd8'], keep: ['#f2c14e', '#fff3b0'], day: ['#6ea8fe', '#e6f0ff'], fix: ['#7bd88f', '#e7f8ea']};
  let shadows = [];
  function drawRoom() {
    cvRoom.width = RW; cvRoom.height = RH; const g = cvRoom.getContext('2d'), C2 = A.COL, r = A.r;
    // 墙（木板）、天花、地板
    for (let x = 0; x < RW; x += 8) for (let y = 4; y < FLOOR; y += 4) { r(g, (x + y) % 16 === 0 ? '#a97a47' : (x * 3 + y) % 24 === 4 ? '#b58450' : '#b98a55', x, y, 8, 4); r(g, '#8f6538', x, y + 3, 8, 1); if ((y >> 2) % 2 === (x >> 3) % 2) r(g, '#8f6538', x, y, 1, 3); }
    r(g, '#5a3a20', 0, 0, RW, 4); r(g, '#3b2513', 0, 3, RW, 1);
    for (let x = 0; x < RW; x += 8) { r(g, x % 16 ? '#7c7f86' : '#8a8d94', x, FLOOR, 8, 7); r(g, '#55585f', x + 7, FLOOR, 1, 7); r(g, '#55585f', x, FLOOR + 6, 8, 1); r(g, x % 16 ? '#5a5d64' : '#65686f', x, FLOOR + 7, 8, 7); }
    for (let x = 0; x < RW; x += 80) { r(g, '#5a3a20', x + 2, 4, 3, FLOOR - 4); }
    // 奖状墙
    r(g, '#6b4628', 4, 5, 197, 54); r(g, '#8a5a2c', 5, 6, 195, 52);
    H.CERTS.forEach(c => {
      const p = certPos[c.id], got = E0.certs.includes(c);
      if (got) { const a = frameCol[c.kind][0]; r(g, '#000', p.x - 2, p.y - 2, CW.w + 4, CW.h + 4); r(g, a, p.x - 1, p.y - 1, CW.w + 2, CW.h + 2); A.thumb(g, c, p.x, p.y, CW.w, CW.h, 0); }
      else { r(g, '#5a3a20', p.x - 1, p.y - 1, CW.w + 2, CW.h + 2); r(g, '#3f2c1a', p.x, p.y, CW.w, CW.h); r(g, '#6b4628', p.x + 8, p.y + 3, 3, 2); r(g, '#6b4628', p.x + 10, p.y + 5, 2, 2); r(g, '#6b4628', p.x + 9, p.y + 7, 2, 2); r(g, '#6b4628', p.x + 9, p.y + 10, 2, 2); }
    });
    // 门
    r(g, '#000', DOOR.x - 1, FLOOR - 29, DOOR.w + 2, 29); r(g, '#4a2f1b', DOOR.x, FLOOR - 28, DOOR.w, 28); r(g, '#5a3a20', DOOR.x + 2, FLOOR - 26, 6, 10); r(g, '#5a3a20', DOOR.x + 10, FLOOR - 26, 6, 10); r(g, '#bfe3ff', DOOR.x + 3, FLOOR - 25, 4, 8); r(g, '#bfe3ff', DOOR.x + 11, FLOOR - 25, 4, 8); r(g, '#f2c14e', DOOR.x + 14, FLOOR - 13, 2, 2);
    // 告示牌
    r(g, '#000', SIGN.x - 1, SIGN.y - 1, SIGN.w + 2, SIGN.h + 2); r(g, '#c08a52', SIGN.x, SIGN.y, SIGN.w, SIGN.h); [3, 7, 11, 15].forEach(y => r(g, '#5a3a20', SIGN.x + 3, SIGN.y + y - 1, SIGN.w - 6 - (y % 4) * 2, 1)); r(g, '#b3261e', SIGN.x + 9, SIGN.y - 2, 4, 2);
    // 伙伴图鉴（讲台 + 打开的书）
    r(g, '#5a3a20', BOOK.x + 8, FLOOR - 14, 6, 14); r(g, '#3b2513', BOOK.x + 4, FLOOR - 2, 14, 2); r(g, '#000', BOOK.x - 1, FLOOR - 25, BOOK.w + 2, 12); r(g, '#5b3fa8', BOOK.x, FLOOR - 24, BOOK.w, 10); r(g, '#f4ecd8', BOOK.x + 1, FLOOR - 23, 9, 8); r(g, '#f4ecd8', BOOK.x + 12, FLOOR - 23, 9, 8); r(g, '#8a5a2c', BOOK.x + 3, FLOOR - 21, 5, 1); r(g, '#8a5a2c', BOOK.x + 3, FLOOR - 18, 4, 1); r(g, '#7bd88f', BOOK.x + 14, FLOOR - 21, 5, 4);
    // 矿物柜
    r(g, '#000', CAB.x - 1, FLOOR - 49, CAB.w + 2, 49); r(g, '#6b4628', CAB.x, FLOOR - 48, CAB.w, 48); [0, 16, 32].forEach((y, i) => { r(g, '#2a1d12', CAB.x + 2, FLOOR - 46 + y, CAB.w - 4, 12); r(g, '#8a5a2c', CAB.x, FLOOR - 34 + y, CAB.w, 2); });
    const t = E0.t, shelf = (n, c, c2, y) => { const show = Math.min(n, 12); for (let i = 0; i < show; i++) A.ingot(g, CAB.x + 3 + (i % 4) * 6, FLOOR - 39 + y - (i >> 2) * 3 - (i >= 4 ? 1 : 0), c, c2); };
    shelf(t.diamond, '#5fd9e6', '#2f9fae', 0); shelf(t.gold, '#f2c14e', '#b98a22', 16); shelf(t.iron, '#c9ccd2', '#6c6f76', 32);
    // 木箱
    const cx = CHEST.x, cy = FLOOR - 13; r(g, '#000', cx - 1, cy - 1, 18, 14); r(g, '#c08a52', cx, cy, 16, 13); r(g, '#8a5a2c', cx, cy + 4, 16, 1); r(g, '#f2c14e', cx + 7, cy + 3, 2, 3);
    // 战利品箱：有新奖励才出现
    if (S.home.loot && S.home.loot.length) { const lx = LOOT.x, ly = FLOOR - 15; r(g, '#000', lx - 1, ly - 1, 20, 16); r(g, '#5b3fa8', lx, ly, 18, 15); r(g, '#3a2a58', lx, ly + 5, 18, 2); r(g, '#f2c14e', lx, ly, 18, 1); r(g, '#f2c14e', lx, ly + 14, 18, 1); r(g, '#f2c14e', lx, ly, 1, 15); r(g, '#f2c14e', lx + 17, ly, 1, 15); r(g, '#f2c14e', lx + 7, ly + 3, 4, 6); }
    // 已摆放
    placeable().forEach(i => { const s = SLOTS[S.home.place[i.id]]; if (!s) return; A.item(g, i.id, s.x, s.y); if (i.id === 'armor') A.armorParts(g, s.x, s.y, parts()); });
    // 下一个目标的影子
    shadows = [];
    const used = new Set(Object.values(S.home.place));
    H.next(S, 3).filter(n => n.r.need && !n.r.kind && A.ITEM[n.r.id] && !n.r.part).slice(0, 3).forEach(n => { const t2 = A.ITEM[n.r.id].t, sl = (t2 === 'F' ? FS : WS).find(s => !used.has(s.id)); if (sl) { used.add(sl.id); A.shadow(g, n.r.id, sl.x, sl.y); shadows.push({slot: sl.id, n}); } });
    if (editing) (function () { FS.concat(WS).forEach(s => { if (!used.has(s.id)) { g.strokeStyle = '#f2c14e'; g.setLineDash([2, 2]); g.strokeRect(s.x + .5, s.y + .5, 15, 15); g.setLineDash([]); } }); }());
    if (editing && sel) { const s = SLOTS[S.home.place[sel]]; if (s) { g.strokeStyle = '#fff'; g.strokeRect(s.x - .5, s.y - .5, 17, 17); } }
    $('tC').textContent = E0.certs.length + '/' + H.CERTS.length; $('tM').textContent = E0.medals.filter(m => m.kind === 'bronze').length + '/' + K.SKILLS.length; $('tD').textContent = t.diamond;
  }
  // 动态：火、音符
  let fxT = 0;
  function drawFx() {
    cvFx.width = RW; cvFx.height = RH; const g = cvFx.getContext('2d'); fxT++;
    placeable().forEach(i => {
      const s = SLOTS[S.home.place[i.id]]; if (!s) return;
      if (i.id === 'furnace') { A.r(g, fxT % 2 ? '#f2c14e' : '#e0762a', s.x + 5, s.y + 10 - (fxT % 2), 6, 3 + (fxT % 2)); A.r(g, '#fff3b0', s.x + 7, s.y + 11, 2, 2); }
      if (i.id === 'torch') { A.r(g, fxT % 2 ? '#f2c14e' : '#e0762a', s.x + 6, s.y + 3 + (fxT % 2), 4, 3); A.r(g, '#fff3b0', s.x + 7, s.y + 4, 2, 2); }
      if (i.id === 'jukebox' && playing) { A.r(g, '#fff', s.x + 4 + (fxT % 8), s.y - 4 - (fxT % 5), 2, 2); A.r(g, '#fff', s.x + 10 - (fxT % 6), s.y - 2 - (fxT % 4), 2, 2); }
      if (i.id === 'lamp' || i.id === 'deco13') { g.fillStyle = 'rgba(255,243,176,.12)'; g.fillRect(s.x - 3, s.y - 3, 22, 22); }
    });
    E0.certs.filter(c => c.kind === 'keep').forEach(c => { const p = certPos[c.id], off = ((fxT * 3 + p.x) % 40) - 8; g.save(); g.beginPath(); g.rect(p.x, p.y, CW.w, CW.h); g.clip(); g.fillStyle = 'rgba(190,110,255,.5)'; for (let i = 0; i < CW.h; i++) g.fillRect(p.x + off - i / 2, p.y + i, 6, 1); g.restore(); });
    if (S.home.loot && S.home.loot.length) { const q = fxT % 4; A.r(g, '#fff3b0', LOOT.x - 2 + q * 5, FLOOR - 20 - (q % 2) * 2, 2, 2); A.r(g, '#fff', LOOT.x + 18 - q * 4, FLOOR - 24 + q, 1, 1); }
    if (fresh) { const s = fresh.pos; if (s && fxT % 2) { A.r(g, '#fff', s.x - 2, s.y - 2, 2, 2); A.r(g, '#f2c14e', s.x + 14, s.y + 2, 2, 2); A.r(g, '#fff', s.x + 8, s.y - 4, 2, 2); } }
  }
  let playing = false, fresh = null;

  // ---------- 小人、小狗、伙伴 ----------
  const hero = {x: DOOR.x + 2, flip: false}, dog = {x: DOOR.x + 12};
  let pets = [], petF = 0, heroF = 'a';
  const learned = () => K.SKILLS.map((s, i) => i).filter(i => E0.medals.some(m => m.skill === K.SKILLS[i] && m.kind === 'bronze'));
  const isGold = i => E0.medals.some(m => m.skill === K.SKILLS[i] && m.kind === 'gold');
  function syncPets() {
    const S2 = S.home; if (!S2.pets) S2.pets = learned().slice(-3);
    S2.pets = S2.pets.filter(i => learned().includes(i));
    pets = S2.pets.map((i, k) => (pets.find(p => p.i === i) || {i, x: 340 + k * 60, dir: k % 2 ? -1 : 1, hop: 0}));
  }
  function drawHero(f) {
    heroF = f || heroF; cvHero.width = RW; cvHero.height = RH; const g = cvHero.getContext('2d');
    pets.forEach(p => { A.creature(g, A.CREATURES[p.i], Math.round(p.x), FLOOR + 2 - (p.hop > 0 ? 3 : 0), petF, {flip: p.dir < 0}); if (isGold(p.i) && petF % 3 === 0) A.r(g, '#e9c6ff', p.x + 4 + (petF % 7), FLOOR - 14, 1, 1); });
    const a = document.createElement('canvas'), b = document.createElement('canvas');
    WORLD.drawSprite(a, WORLD.HERO, heroF, hero.flip); WORLD.drawSprite(b, WORLD.DOG, heroF, hero.flip);
    g.drawImage(a, Math.round(hero.x), FLOOR + 1 - a.height); g.drawImage(b, Math.round(dog.x), FLOOR + 1 - b.height);
  }
  setInterval(() => { if ($('home').hidden) return; petF++; pets.forEach(p => { if (p.hop > 0) p.hop--; if (Math.random() < .05) p.dir *= -1; p.x = Math.max(322, Math.min(RW - 20, p.x + p.dir * .9)); if (p.x <= 322 || p.x >= RW - 20) p.dir *= -1; }); if (!walking) drawHero(); }, 220);
  // 8 位音效：全部现场合成
  let AC = null;
  function blip(notes) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t0 = AC.currentTime; notes.forEach(([f, at, len]) => { const o = AC.createOscillator(), v = AC.createGain(); o.type = 'square'; o.frequency.value = f; v.gain.setValueAtTime(.035, t0 + at); v.gain.linearRampToValueAtTime(0, t0 + at + len); o.connect(v); v.connect(AC.destination); o.start(t0 + at); o.stop(t0 + at + len); }); } catch (e) {} }
  const SND = {tap: [[660, 0, .07]], open: [[392, 0, .08], [523, .08, .08], [659, .16, .08], [784, .24, .16]], get: [[784, 0, .07], [1047, .07, .12]], pet: [[880, 0, .05], [660, .06, .06]]};
  let walking = null;
  function walkTo(tx, done) {
    if (walking) cancelAnimationFrame(walking);
    const from = hero.x, ms = Math.min(700, 120 + Math.abs(tx - from) * 4), t0 = performance.now(); hero.flip = tx < from; let last = 0, f = 'a';
    const step = now => { const k = Math.min(1, (now - t0) / ms); hero.x = from + (tx - from) * k; dog.x = hero.x + (hero.flip ? 10 : -10); if (now - last > 110) { f = f === 'a' ? 'b' : 'a'; last = now; } drawHero(f); if (k < 1) walking = requestAnimationFrame(step); else { walking = null; drawHero('a'); done && done(); } };
    walking = requestAnimationFrame(step);
  }

  // ---------- 镜头、拖动 ----------
  const vp = $('vp'), world = $('world');
  let P = 4, camX = 0, maxX = 0;
  const VW = () => innerWidth, VH = () => innerHeight;
  function layout() {
    P = VH() / RH; [cvRoom, cvFx, cvHero].forEach(c => { c.style.width = RW * P + 'px'; c.style.height = RH * P + 'px'; });
    maxX = Math.max(0, RW * P - VW()); setCam(camX);
  }
  function setCam(x) { camX = x; world.style.transform = `translate3d(${-Math.round(camX)}px,0,0)`; nav(); }
  function panTo(x, ms, done) { const a = camX, b = Math.max(0, Math.min(maxX, x)), t0 = performance.now(); ms = ms || 260; const st = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); setCam(a + (b - a) * e); if (k < 1) requestAnimationFrame(st); else done && done(); }; requestAnimationFrame(st); }
  let drag = null, vx = 0, inert = 0;
  vp.addEventListener('pointerdown', e => { cancelAnimationFrame(inert); drag = {x: e.clientX, y: e.clientY, cam: camX, t: performance.now(), moved: 0, lx: e.clientX, lt: performance.now()}; vx = 0; try { vp.setPointerCapture(e.pointerId); } catch (x) {} });
  vp.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; drag.moved = Math.max(drag.moved, Math.abs(dx)); const now = performance.now(); vx = (e.clientX - drag.lx) / Math.max(1, now - drag.lt); drag.lx = e.clientX; drag.lt = now; let c = drag.cam - dx; if (c < 0) c *= .35; if (c > maxX) c = maxX + (c - maxX) * .35; setCam(c); });
  vp.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null;
    if (d.moved < 14 && performance.now() - d.t < 700) { tap((e.clientX + camX) / P, e.clientY / P); return; }
    let v = -vx * 16; const st = () => { v *= .94; let c = camX + v; if (c < 0 || c > maxX) { c = Math.max(0, Math.min(maxX, c)); setCam(c); return; } setCam(c); if (Math.abs(v) > .5) inert = requestAnimationFrame(st); };
    if (camX < 0 || camX > maxX) panTo(camX); else st();
  });
  vp.addEventListener('pointercancel', () => { drag = null; panTo(camX); });

  // ---------- 导航 ----------
  const NAVS = [['奖状墙', 102], ['门口', 232], ['矿物柜', 307], ['道具', 430]];
  $('nav').innerHTML = NAVS.map(([n, x], i) => `<button data-i="${i}">${n}</button>`).join('');
  $('nav').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; closeSheet(); const n = NAVS[+b.dataset.i]; panTo(n[1] * P - VW() / 2, 300); });
  function nav() { const c = (camX + VW() / 2) / P; let k = 0; NAVS.forEach(([, x], i) => { if (c >= x - 40) k = i; }); [...$('nav').children].forEach((b, i) => b.classList.toggle('on', i === k)); }

  // ---------- 点东西 ----------
  let editing = false, sel = null;
  function tap(ax, ay) {
    if (editing) return tapEdit(ax, ay);
    for (const c of H.CERTS) { const p = certPos[c.id]; if (ax >= p.x - 1 && ax <= p.x + CW.w + 1 && ay >= p.y - 2 && ay <= p.y + CW.h + 3) return E0.certs.includes(c) ? showCert(c) : goal(c, p.x); }
    if (ax >= DOOR.x && ax <= DOOR.x + DOOR.w && ay > FLOOR - 30) return leave();
    if (ax >= SIGN.x && ax <= SIGN.x + SIGN.w && ay >= SIGN.y && ay <= SIGN.y + SIGN.h) return showNext();
    if (S.home.loot && S.home.loot.length && ax >= LOOT.x - 2 && ax <= LOOT.x + LOOT.w + 2 && ay > FLOOR - 18 && ay <= FLOOR + 4) return openLoot();
    if (ax >= BOOK.x && ax <= BOOK.x + BOOK.w && ay > FLOOR - 28 && ay <= FLOOR + 4) return showBook();
    for (const p of pets) if (ax >= p.x - 1 && ax <= p.x + 18 && ay > FLOOR - 20 && ay <= FLOOR + 4) { p.hop = 3; blip(SND.pet); toast(A.CREATURES[p.i].n); return; }
    if (ax >= CAB.x && ax <= CAB.x + CAB.w && ay > FLOOR - 50 && ay <= FLOOR) return showOres();
    if (ax >= CHEST.x && ax <= CHEST.x + CHEST.w && ay > FLOOR - 16 && ay <= FLOOR) return showChest();
    for (const i of placeable()) { const s = SLOTS[S.home.place[i.id]]; if (s && ax >= s.x && ax <= s.x + (A.ITEM[i.id].w || 16) && ay >= s.y - 1 && ay <= s.y + 17) return showItem(i, s); }
    for (const sh of shadows) { const s = SLOTS[sh.slot]; if (ax >= s.x && ax <= s.x + 16 && ay >= s.y && ay <= s.y + 16) return goal(sh.n.r, s.x); }
    closeSheet(); if (ay > FLOOR - 24) walkTo(Math.max(0, Math.min(RW - 12, ax - 4)));
  }
  function near(x, then) { closeSheet(); panTo(x * P - VW() * .28, 240); walkTo(Math.max(0, x - 10), then); }
  const dateCN = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${y} 年 ${+m} 月 ${+dd} 日`; };
  function sheet(html) { const s = $('sheet'); s.innerHTML = html; s.classList.add('on'); s.scrollTop = 0; const x = s.querySelector('.sh-x'); if (x) x.onclick = closeSheet; }
  function closeSheet() { $('sheet').classList.remove('on'); playing = false; }
  const head = (title, ic) => `<div class="sh-h"><canvas id="shI" width="24" height="16"></canvas><h2>${title}</h2><button class="sh-x" aria-label="关闭">×</button></div>`;
  function setIcon(id) { const c = $('shI'); if (c && A.ITEM[id]) { A.icon(c, id); c.style.height = '43px'; c.style.width = '64px'; } else if (c) c.remove(); }

  function showItem(i, s) {
    near(s.x, () => {
      sheet(head(i.name) + `<div class="sh-b">${i.text}${i.id === 'armor' ? '<br>盔甲件数：' + parts().length + ' / 4' : ''}</div><div class="muted">得到日期：${dateCN(S.home.got[i.id])}</div>${i.id === 'armor' ? armorRows() : ''}${i.id === 'furnace' ? `<div class="sh-b muted">已复习做对 ${E0.t.passed} 道错题</div>` : ''}${i.id === 'jukebox' ? '<div class="sh-f"><button class="btn go" id="play">播放</button></div>' : ''}`);
      setIcon(i.id);
      if (i.id === 'jukebox') $('play').onclick = () => { playing = !playing; $('play').textContent = playing ? '停止' : '播放'; };
    });
  }
  function armorRows() { const P2 = H.ITEMS.filter(x => x.part); return `<div class="rows">${P2.map(x => { const [a, b] = x.need(E0.t); return `<div class="row"><span>${x.name}</span><em>${Math.min(a, b)} / ${b}</em></div>`; }).join('')}</div>`; }
  function goal(r, x) {
    const [a, b] = r.need(E0.t), pct = Math.round(a / b * 100), name = r.title || r.name;
    near(x, () => {
      sheet(head(name) + `<div class="sh-b"><b>获得条件</b><br>${r.text}</div><div class="muted">已完成 ${a} / ${b}</div><div class="barw"><i style="width:${pct}%"></i></div><div class="sh-f"><button class="btn go" id="goP">去练这一块</button></div>`);
      setIcon(r.id); $('goP').onclick = () => { toast('原型：此处进入练习'); closeSheet(); };
    });
  }
  function showNext() {
    near(SIGN.x, () => {
      const ns = H.next(S, 3);
      sheet(`<div class="sh-h"><h2>下一个目标</h2><button class="sh-x">×</button></div><div class="rows">${ns.map(n => `<div class="row"><span>${n.r.title || n.r.name}<br><small class="muted">${n.r.text}</small></span><em>${n.a} / ${n.b}</em></div>`).join('')}</div><div class="sh-f"><button class="btn go" id="goP">开始今天的探险</button></div>`);
      $('goP').onclick = () => { closeSheet(); toast('原型：此处进入练习'); };
    });
  }
  function showOres() {
    near(CAB.x + 4, () => {
      const t = E0.t, row = (n, name, what, c) => `<div class="row"><i class="md" style="background:${c}"></i><span>${name}<br><small class="muted">${what}</small></span><em>${n} / ${t.total}</em></div>`;
      sheet(`<div class="sh-h"><h2>矿物柜</h2><button class="sh-x">×</button></div><div class="ore3">${row(t.diamond, '钻石', '隔 3 天仍然做对', '#5fd9e6')}${row(t.gold, '金锭', '另一天再次做对', '#f2c14e')}${row(t.iron, '铁锭', '格子第一次点亮', '#c9ccd2')}</div><div class="muted">一个格子一件，只增不减。</div>`);
    });
  }
  function showChest() {
    near(CHEST.x, () => sheet(`<div class="sh-h"><h2>木箱</h2><button class="sh-x">×</button></div><div class="sh-b">矿石 <b style="font-size:30px;color:var(--warn)">${S.home.ore}</b> 块</div><div class="muted">练习时每答对一题，得到 1 块矿石。</div>`));
  }
  // ---------- 伙伴图鉴 ----------
  function showBook() {
    closeSheet(); const v = $('book'), L = learned();
    v.innerHTML = `<div class="bkh"><button class="btn" id="bkClose">合上图鉴</button><h2>伙伴图鉴</h2><span class="tally"><span>已解锁 <b>${L.length}/${K.SKILLS.length}</b></span></span></div><div class="bkg">${K.SKILLS.map((s, i) => `<button class="bkc${L.includes(i) ? '' : ' lock'}${isGold(i) ? ' gold' : ''}${S.home.pets.includes(i) ? ' home' : ''}" data-i="${i}"><canvas data-c="${i}" width="20" height="24"></canvas><small>${L.includes(i) ? A.CREATURES[i].n : '？'}</small></button>`).join('')}</div><div class="bkd" id="bkD">学会一个技能，解锁一只伙伴</div>`;
    v.hidden = false; v.querySelectorAll('canvas[data-c]').forEach(c => { const i = +c.dataset.c; A.creature(c.getContext('2d'), A.CREATURES[i], 0, 24, 0, L.includes(i) ? {} : {shadow: '#0c0d10'}); });
    $('bkClose').onclick = () => { v.hidden = true; blip(SND.tap); syncPets(); drawHero(); };
    v.querySelector('.bkg').onclick = e => {
      const b = e.target.closest('.bkc'); if (!b) return; const i = +b.dataset.i, s = K.SKILLS[i], has = L.includes(i); blip(SND.tap);
      if (!has) { $('bkD').innerHTML = `<span><b>未解锁</b> · 学会「${s.name}」后解锁</span><button class="btn go" id="bkGo">去练这一块</button>`; $('bkGo').onclick = () => { v.hidden = true; toast('原型：此处进入练习'); }; return; }
      const at = S.home.pets.includes(i);
      $('bkD').innerHTML = `<span><b>${A.CREATURES[i].n}${isGold(i) ? ' · 附魔' : ''}</b> · 学会了「${s.name}」${isGold(i) ? '，全部隔 3 天还做对' : ''}</span><button class="btn go" id="bkPet">${at ? '留在图鉴' : '带回家'}</button>`;
      $('bkPet').onclick = () => { const p = S.home.pets; if (at) p.splice(p.indexOf(i), 1); else { if (p.length >= 4) p.shift(); p.push(i); blip(SND.get); } v.querySelectorAll('.bkc').forEach(x => x.classList.toggle('home', p.includes(+x.dataset.i))); b.click(); };
    };
  }
  // 奖状大图：称号 + 会动的画面；记牢 = 附魔版；点画面全体跳一下
  let certT = 0;
  function showCert(c) {
    closeSheet(); blip(SND.get);
    const v = $('certV'), cols = {learn: ['#8a5a2c', '#f2c14e'], keep: ['#6d3bc9', '#e9c6ff'], day: ['#2f6fb0', '#bfe3ff'], fix: ['#2e7d4a', '#bfe8c8']}[c.kind], keep = c.kind === 'keep';
    v.innerHTML = `<div class="cert${keep ? ' ench' : ''}" style="--fr:${cols[0]};--fr2:${cols[1]}"><canvas id="certC" width="96" height="54"></canvas><div class="certR"><div class="clab">奖状${keep ? ' · 附魔' : ''}</div><h1>${c.title}</h1><div class="cwho">空空</div><div class="csay">${c.say(E0.t)}</div><div class="cdate">${dateCN(S.home.got[c.id])}</div></div></div><div class="certbtns"><button class="btn" id="cClose">收好</button><button class="btn" id="cPrint">打印奖状</button></div>`;
    v.hidden = false; const g = $('certC').getContext('2d'); let f = 0, jump = 0;
    clearInterval(certT); const draw = () => { g.clearRect(0, 0, 96, 54); A.scene(g, c.scene, keep, f, jump > 0); f++; if (jump > 0) jump--; }; draw(); certT = setInterval(draw, 200);
    $('certC').onclick = () => { jump = 4; blip(SND.pet); };
    $('cClose').onclick = () => { clearInterval(certT); v.hidden = true; }; $('cPrint').onclick = () => print();
  }
  // ---------- 战利品箱 ----------
  const kindOf = x => (x.kind === 'bronze' ? '新伙伴' : x.kind === 'gold' ? '伙伴附魔' : x.scene ? '奖状' : '道具');
  function openLoot() {
    closeSheet(); const news = S.home.loot || [], v = $('loot');
    v.innerHTML = `<canvas id="lootC" width="40" height="32"></canvas><div class="lootT">点箱子打开</div><div class="lootL" id="lootL"></div><button class="btn go" id="lootOk" hidden>收好</button>`; v.hidden = false;
    const g = $('lootC').getContext('2d'), paint = open => { g.clearRect(0, 0, 40, 32); const y = open ? 14 : 8; A.r(g, '#000', 3, y + 7, 34, 18); A.r(g, '#5b3fa8', 4, y + 8, 32, 16); A.r(g, '#f2c14e', 18, y + 8, 4, 6); if (open) { A.r(g, '#000', 3, 2, 34, 12); A.r(g, '#3a2a58', 4, 3, 32, 10); A.r(g, '#fff3b0', 6, 13, 28, 3); } else { A.r(g, '#000', 3, y - 1, 34, 9); A.r(g, '#6d4fc4', 4, y, 32, 7); A.r(g, '#f2c14e', 18, y + 3, 4, 5); } }; paint(false);
    $('lootC').onclick = () => {
      if ($('lootC').dataset.o) return; $('lootC').dataset.o = 1; paint(true); blip(SND.open); v.querySelector('.lootT').textContent = '战利品';
      const list = news.slice(0, 5); $('lootL').innerHTML = list.map((x, i) => `<div class="lootI stamp" style="animation-delay:${.15 + i * .18}s"><canvas data-x="${x.id}"></canvas><b>${x.title || (x.skill ? A.CREATURES[K.SKILLS.indexOf(x.skill)].n : x.name)}</b><small>${kindOf(x)}</small></div>`).join('') + (news.length > 5 ? `<div class="lootI"><b>+${news.length - 5}</b><small>已放入家中</small></div>` : '');
      list.forEach((x, i) => setTimeout(() => blip(SND.get), 150 + i * 180));
      $('lootL').querySelectorAll('canvas').forEach(c => { const x = news.find(n => n.id === c.dataset.x); if (x.skill) { c.width = 20; c.height = 24; A.creature(c.getContext('2d'), A.CREATURES[K.SKILLS.indexOf(x.skill)], 0, 24, 0); } else if (x.scene) { c.width = 19; c.height = 14; A.thumb(c.getContext('2d'), x, 0, 0, 19, 14, 3); } else A.icon(c, x.id); });
      $('lootOk').hidden = false;
    };
    $('lootOk').onclick = () => { v.hidden = true; const cert = news.find(x => x.scene); S.home.loot = []; syncPets(); drawRoom(); drawHero(); if (cert) panTo(certPos[cert.id].x * P - VW() / 2, 400, () => showCert(cert)); };
  }
  // 摆放
  function tapEdit(ax, ay) {
    const slot = FS.concat(WS).find(s => ax >= s.x && ax <= s.x + 18 && ay >= s.y - 1 && ay <= s.y + 17);
    if (!slot) return;
    const pl = S.home.place, who = placeable().find(i => pl[i.id] === slot.id);
    if (!sel) { if (who) { sel = who.id; toast('已选择 ' + who.name + '，点一个位置'); drawRoom(); } return; }
    const iT = A.ITEM[sel].t;
    if (slot.t !== iT) { toast(iT === 'F' ? sel && '这件摆在地上' : '这件挂在墙上'); return; }
    const old = pl[sel]; if (who && who.id !== sel) pl[who.id] = old; pl[sel] = slot.id; sel = null; drawRoom();
  }
  $('btnEdit').addEventListener('click', () => { editing = !editing; sel = null; closeSheet(); $('btnEdit').textContent = editing ? '完成' : '摆放'; toast(editing ? '点一件东西，再点新位置' : '已保存摆放'); drawRoom(); });
  let toastT = 0; function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 1800); }

  // ---------- 翻页 ----------
  function show(id) { ['isl', 'home', 'sum'].forEach(k => { $(k).hidden = k !== id; }); if (id === 'home') layout(); if (id === 'isl') islDraw(); }
  function islDraw() {
    const c = $('islBg'); WORLD.sceneBg(c, 'home', VW(), VH());
    const PP = VH() / WORLD.WH, vw = c.width, sx = Math.max(0, Math.min(WORLD.WW - vw, Math.round(52 - vw / 2)));
    const d = $('doorHit'); d.style.left = (28 - sx) * PP + 'px'; d.style.top = 40 * PP + 'px'; d.style.width = 52 * PP + 'px'; d.style.height = 34 * PP + 'px';
    const n = $('newSign'); n.hidden = !unseen; if (unseen) { n.textContent = '战利品箱'; n.style.left = (38 - sx) * PP + 'px'; n.style.top = 22 * PP + 'px'; }
  }
  let unseen = 0;
  $('doorHit').addEventListener('click', enter);
  $('newSign').addEventListener('click', enter);
  function enter() {
    show('home'); hero.x = DOOR.x + 2; dog.x = DOOR.x + 12; syncPets(); drawHero('a'); drawRoom(); setCam(Math.max(0, Math.min(maxX, (DOOR.x + 10) * P - VW() / 2)));
    unseen = 0;
  }
  function leave() { closeSheet(); walkTo(DOOR.x + 2, () => show('isl')); }
  $('btnOut').addEventListener('click', leave);
  addEventListener('resize', () => { if (!$('home').hidden) layout(); if (!$('isl').hidden) islDraw(); });
  setInterval(() => { if (!$('home').hidden) drawFx(); }, 200);
  setInterval(() => { if (!$('home').hidden && !walking) { drawHero('b'); setTimeout(() => { if (!walking) drawHero('a'); }, 160); } }, 2600);

  // ---------- 练完：颁奖 ----------
  function simulateDay() {
    const before = new Set(Object.keys(S.home.got)), d = S.today; let ore = 0;
    const s = E.session(S, d, {rnd: seeded(+d.replace(/-/g, '') % 9999 + 1)}), rn = seeded(17);
    for (let x = s.next(), g = 0; x && g < 500; x = s.next(), g++) if (x.kind === 'q') { const ok = rn() < .85; if (ok) { S.home.ore++; ore++; } s.answer({ok, fast: ok && rn() < .8, secs: ok ? 6 : 10}); }
    S.today = C.addDays(d, 1); E0 = H.earned(S);
    const news = E0.certs.concat(E0.items, E0.medals).filter(x => !before.has(x.id)); news.forEach(x => { S.home.got[x.id] = d; }); autoPlace();
    $('sOre').textContent = ore; $('sUps').textContent = `今天点亮 ${(S.stats[d] || {}).ups || 0} 格`;
    S.home.loot = (S.home.loot || []).concat(news); unseen = S.home.loot.length;
    $('gotT').textContent = news.length ? '家门口多了 1 个战利品箱' : '暂无新战利品';
    $('gotL').innerHTML = news.length ? '<div class="muted">回家，自己打开。</div>' : `<div class="muted">最近的目标：${(H.next(S, 1)[0] || {r: {text: ''}}).r.text}</div>`;
    $('sHome').hidden = !news.length; show('sum');
  }
  $('sHome').addEventListener('click', enter);
  $('sIsl').addEventListener('click', () => show('isl'));

  // ---------- 原型控制 ----------
  function buildPt() {
    $('ptM').innerHTML = Object.entries(STATES).map(([k, v]) => `<button data-s="${k}" class="${k === stateKey ? 'on' : ''}">进度：${v[0]}</button>`).join('') + '<button id="ptDay">模拟：今天练完</button><div style="color:#d9cff0">紫色按钮仅原型有。进度由真实排课代码模拟（正确率 85%）。</div>';
    $('ptM').querySelectorAll('[data-s]').forEach(b => { b.onclick = () => { setState(b.dataset.s); unseen = S.home.loot.length; buildPt(); $('ptM').hidden = true; show('isl'); }; });
    $('ptDay').onclick = () => { $('ptM').hidden = true; simulateDay(); };
  }
  $('ptBtn').addEventListener('click', () => { $('ptM').hidden = !$('ptM').hidden; });
  if (KID) $('pt').style.display = 'none';
  setState(stateKey); unseen = S.home.loot.length; buildPt(); show('isl');
  window.__home = {get S() { return S; }, enter, setState, simulateDay, tap: (x, y) => tap(x, y), get cam() { return camX; }, get P() { return P; }, certPos, SLOTS, get E0() { return E0; }, CAB, BOOK, LOOT, SIGN, CHEST, DOOR, get pets() { return pets; }};
})();
