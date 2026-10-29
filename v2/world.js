// 空空数学岛 · 岛世界（首页的方块浮空岛）：像素画、左右拖动带惯性、木牌、小人和小狗、走过去进练习、练习页和结算页的场景背景
// 只管"画"和"手势"，不碰进度：木牌颜色、今天的旗子、点了地方做什么，都由页面传进来（create 的 o）。全部原创像素画，不用 Mojang 素材
// 浏览器里挂到 window.WORLD；来源：v4 岛世界原型（Ben 10-28 试过两轮，10-29 搬进 v2 后归档到 ~/08_归档/原型-deprecated/秒答地图-原型-v4-岛世界-snapshot-2026-10-29/）
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WORLD = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // 6 块地 + 家；id 和 render.js 的 GROUPS 一样；x = 在岛上的位置（像素画坐标），sx = 木牌位置（避开塔和城堡）
  const ZONES = [
    {id: 'home', x: 52, name: '空空的家', short: '家', icon: '#c08a52'},
    {id: 'look', x: 180, name: '看数草原', short: '看数', icon: '#6fae3a'},
    {id: 'bond', x: 322, name: '分合矿洞', short: '分合', icon: '#9a9da4'},
    {id: 'place', x: 462, name: '数位村庄', short: '数位', icon: '#f2c14e'},
    {id: 'cmp', x: 592, sx: 572, name: '比大小双塔', short: '比大小', icon: '#b3261e'},
    {id: 'line', x: 722, name: '数线铁轨', short: '数线', icon: '#6ea8fe'},
    {id: 'speed', x: 850, sx: 816, name: '秒答高塔', short: '秒答', icon: '#5a3a20'},
  ];
  const WW = 896, WH = 110;              // 岛的像素画尺寸（1 格 = 1 个像素点，屏幕上按比例放大）
  const ORE = ['#f2c14e', '#6ea8fe', '#7bd88f', '#f6a5a0'];

  // ---------- 像素画工具 ----------
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const R = rng(7);
  const pick = a => a[Math.floor(R() * a.length)];
  function sprite(ctx, rows, pal, ox, oy) { rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { ctx.fillStyle = pal[ch]; ctx.fillRect(ox + x, oy + y, 1, 1); } })); }
  const TEX = {
    grass: ['#6fae3a', '#62a033', '#7dbb44'], dirt: ['#7a5230', '#6b4628', '#86593a'], stone: ['#8a8d94', '#7c7f86', '#979aa1'],
    plank: ['#c08a52', '#b27d48'], log: ['#6b4628', '#5a3a20'], leaf: ['#3d7524', '#4f8a2e', '#2f5e1c'], brick: ['#9a9da4', '#878a91'],
  };
  function tile(ctx, tx, ty, kind) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      let c;
      if (kind === 'grassTop') c = y < 2 ? pick(TEX.grass) : y === 2 && R() < .5 ? TEX.grass[1] : pick(TEX.dirt);
      else if (kind === 'ore') c = (x > 1 && x < 4 && y > 1 && y < 4) || (x > 4 && x < 7 && y > 4 && y < 7) ? ctx._ore : pick(TEX.stone);
      else if (kind === 'plank') c = y % 4 === 3 ? '#8a5a2c' : TEX.plank[(x + (y >> 2) * 3) % 7 === 0 ? 1 : 0];
      else if (kind === 'brick') c = y % 4 === 3 || (x + (y >> 2) * 4) % 8 === 0 ? '#6c6f76' : pick(TEX.brick);
      else if (kind === 'log') c = x % 3 === 0 ? TEX.log[1] : TEX.log[0];
      else c = pick(TEX[kind]);
      ctx.fillStyle = c; ctx.fillRect(tx + x, ty + y, 1, 1);
    }
  }
  // 地面高度：每 8 个像素一列
  const COLS = WW / 8, GT = new Array(COLS).fill(72);
  [[36, 64], [37, 56], [38, 48], [39, 40], [40, 40], [41, 40], [42, 40], [43, 48], [44, 56]].forEach(([c, y]) => { GT[c] = y; });
  for (let c = 101; c < 110; c++) GT[c] = 64;
  const surf = x => GT[Math.max(0, Math.min(COLS - 1, Math.floor(x / 8)))];

  function drawMain(cv) {
    cv.width = WW; cv.height = WH; const g = cv.getContext('2d');
    for (let c = 0; c < COLS; c++) {
      const edge = Math.min(c, COLS - 1 - c), depth = Math.min(6, 1 + Math.floor(edge * 0.7)) + (edge > 8 ? 2 : 0);
      const t = GT[c], bottom = Math.min(WH + 8, 72 + depth * 8 + (R() < .4 ? 8 : 0));
      for (let y = t, r = 0; y < bottom; y += 8, r++) {
        const caveMouth = c >= 39 && c <= 41 && y >= 48 && y < 72;
        if (caveMouth) { g.fillStyle = '#1b1d22'; g.fillRect(c * 8, y, 8, 8); continue; }
        if (r === 0) tile(g, c * 8, y, 'grassTop');
        else if (r < 3 && y < 88) tile(g, c * 8, y, 'dirt');
        else if (R() < .1) { g._ore = pick(['#f2c14e', '#6ea8fe', '#2b2b2b', '#f6a5a0']); tile(g, c * 8, y, 'ore'); }
        else tile(g, c * 8, y, y >= bottom - 8 && edge < 8 ? 'dirt' : 'stone');
      }
    }
    // 洞口边框和火把（分合矿洞）
    g.fillStyle = '#000'; g.fillRect(311, 47, 1, 25); g.fillRect(336, 47, 1, 25); g.fillRect(311, 47, 26, 1);
    [[302, 58], [342, 58]].forEach(([x, y]) => { g.fillStyle = '#6b4628'; g.fillRect(x, y + 2, 2, 8); g.fillStyle = '#f2c14e'; g.fillRect(x, y, 2, 2); g.fillStyle = '#fff3b0'; g.fillRect(x, y, 1, 1); });
    cart(g, 318, 62);
    // 空空的家
    for (let y = 48; y < 72; y += 8) for (let x = 32; x < 72; x += 8) tile(g, x, y, x === 32 || x === 64 ? 'log' : 'plank');
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#8a5a2c' : '#6b4628'; g.fillRect(28 + i * 4, 44 - i * 4, 48 - i * 8, 4); }
    g.fillStyle = '#4a2f1b'; g.fillRect(48, 58, 8, 14); g.fillStyle = '#f2c14e'; g.fillRect(54, 64, 1, 1);
    g.fillStyle = '#000'; g.fillRect(35, 53, 9, 9); g.fillStyle = '#bfe3ff'; g.fillRect(36, 54, 7, 7); g.fillStyle = '#000'; g.fillRect(39, 54, 1, 7); g.fillRect(36, 57, 7, 1);
    // 看数草原：树、花、骰子方块
    [[140, 4], [214, 5], [250, 4]].forEach(([x, h]) => tree(g, x, 72, h));
    for (let x = 100; x < 280; x += 7) if (R() < .5) { g.fillStyle = pick(['#f6a5a0', '#fff3b0', '#ecebe4']); g.fillRect(x, 70, 1, 1); g.fillStyle = '#3d7524'; g.fillRect(x, 71, 1, 1); }
    dice(g, 172, 56);
    // 数位村庄：3 根十条 + 4 块一 = 34，旁边一间小屋
    for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) block(g, 440 + r * 6, 68 - k * 4, '#6fae3a');
    for (let k = 0; k < 4; k++) block(g, 462 + (k % 2) * 5, 68 - Math.floor(k / 2) * 4, '#f2c14e');
    for (let y = 56; y < 72; y += 8) for (let x = 480; x < 504; x += 8) tile(g, x, y, 'plank');
    g.fillStyle = '#b3261e'; g.fillRect(478, 52, 28, 4); g.fillStyle = '#8a1c16'; g.fillRect(482, 48, 20, 4);
    g.fillStyle = '#4a2f1b'; g.fillRect(488, 62, 6, 10);
    // 比大小双塔
    for (let y = 48; y < 72; y += 8) tile(g, 568, y, 'brick');
    for (let y = 32; y < 72; y += 8) for (let x = 600; x < 616; x += 8) tile(g, x, y, 'brick');
    g.fillStyle = '#6b4628'; g.fillRect(607, 18, 1, 14); g.fillStyle = '#f2c14e'; g.fillRect(608, 18, 7, 5);
    // 数线铁轨：枕木 + 两条轨 + 0—10 刻度
    for (let x = 676; x < 776; x += 4) { g.fillStyle = '#6b4628'; g.fillRect(x, 70, 3, 2); }
    g.fillStyle = '#9a9da4'; g.fillRect(676, 69, 100, 1);
    for (let i = 0; i <= 10; i++) { const x = 680 + i * 9; g.fillStyle = i % 5 ? '#ecebe4' : '#f2c14e'; g.fillRect(x, i % 5 ? 64 : 60, 1, i % 5 ? 5 : 9); }
    cart(g, 712, 61);
    // 秒答高塔
    for (let y = 32; y < 64; y += 8) for (let x = 832; x < 872; x += 8) tile(g, x, y, 'brick');
    for (let x = 832; x < 872; x += 8) tile(g, x, 24, 'brick');
    g.fillStyle = '#8ec8ff'; for (let x = 836; x < 872; x += 8) g.fillRect(x, 24, 4, 3);
    g.fillStyle = '#1b1d22'; g.fillRect(846, 48, 12, 16); g.fillStyle = '#000'; g.fillRect(845, 47, 14, 1);
    g.fillStyle = '#6b4628'; g.fillRect(851, 8, 1, 16); g.fillStyle = '#b3261e'; g.fillRect(852, 8, 9, 6); g.fillStyle = '#ecebe4'; g.fillRect(855, 10, 2, 2);
    tree(g, 886, 64, 3);
  }
  function tree(g, x, base, h) {
    for (let i = 0; i < h; i++) { g.fillStyle = i % 2 ? '#5a3a20' : '#6b4628'; g.fillRect(x, base - (i + 1) * 4, 4, 4); }
    const ty = base - h * 4 - 8;
    for (let yy = 0; yy < 12; yy += 4) for (let xx = -8; xx < 12; xx += 4) { if ((yy === 0 && (xx < -4 || xx > 4))) continue; tileSmall(g, x + xx, ty - 4 + yy, TEX.leaf); }
  }
  function tileSmall(g, x, y, tex) { for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { g.fillStyle = pick(tex); g.fillRect(x + a, y + b, 1, 1); } }
  function block(g, x, y, c) { g.fillStyle = '#000'; g.fillRect(x, y, 5, 4); g.fillStyle = c; g.fillRect(x, y, 4, 3); }
  function dice(g, x, y) { g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, 18, 17); g.fillStyle = '#f4ecd8'; g.fillRect(x, y, 16, 15); g.fillStyle = '#6ea8fe'; [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]].forEach(([a, b]) => g.fillRect(x + a, y + b, 2, 2)); }
  function cart(g, x, y) { sprite(g, ['k..........k', 'kGGGGGGGGGGk', 'kGgGGGGGGgGk', 'kGGGGGGGGGGk', '.kkkkkkkkkk.', '..kk....kk..', '..kk....kk..'], {k: '#2b2b2b', G: '#8a8d94', g: '#f2c14e'}, x, y); }
  function drawFar(cv, w) {
    cv.width = w; cv.height = WH; const g = cv.getContext('2d');
    const RR = rng(3);
    for (let i = 0; i < w / 60; i++) { // 远处的小浮空岛
      const x = Math.floor(RR() * w), y = 30 + Math.floor(RR() * 40), s = 6 + Math.floor(RR() * 10);
      g.fillStyle = '#8fb3cf'; for (let k = 0; k < s; k++) g.fillRect(x + Math.floor(k * 0.9), y + 3 + k, Math.max(2, s * 2 - Math.floor(k * 1.8)), 1);
      g.fillStyle = '#93c27a'; g.fillRect(x, y, s * 2, 2); g.fillStyle = '#7fae69'; g.fillRect(x, y + 2, s * 2, 1);
      if (s > 10) { g.fillStyle = '#6f9a5c'; g.fillRect(x + 4, y - 4, 3, 4); g.fillRect(x + 3, y - 6, 5, 2); }
    }
    for (let i = 0; i < w / 45; i++) { // 方块云
      const x = Math.floor(RR() * w), y = 4 + Math.floor(RR() * 24), n = 3 + Math.floor(RR() * 4);
      g.fillStyle = '#f2f6fb'; g.fillRect(x, y, n * 6, 4); g.fillRect(x + 4, y - 3, n * 6 - 8, 3);
      g.fillStyle = '#dbe7f3'; g.fillRect(x, y + 4, n * 6, 1);
    }
  }
  function drawSky(cv) {
    cv.width = 1; cv.height = WH; const g = cv.getContext('2d');
    ['#79bdf9', '#86c4fb', '#93cbfc', '#a1d2fd', '#afd9fe', '#bde0ff'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 19, 1, 19); });
  }
  const HERO = {
    pal: {H: '#4a2f1b', S: '#f1c27d', E: '#1b1d22', M: '#c0705a', G: '#6fae3a', g: '#4f8a2e', B: '#3b5bdb', K: '#2b2b2b'},
    a: ['..HHHH..', '.HHHHHH.', '.HSSSSH.', '.SESSES.', '.SSSSSS.', '..SMMS..', '.GGGGGG.', 'gGGGGGGg', 'gGGGGGGg', 'gGGGGGGg', 'SGGGGGGS', '.BBBBBB.', '.BB..BB.', '.BB..BB.', '.KK..KK.'],
    b: ['..HHHH..', '.HHHHHH.', '.HSSSSH.', '.SESSES.', '.SSSSSS.', '..SMMS..', '.GGGGGG.', 'gGGGGGGg', 'gGGGGGGg', 'gGGGGGGg', 'SGGGGGGS', '.BBBBBB.', '..BBBB..', '.BB..BB.', 'KK....KK'],
  };
  const DOG = {pal: {B: '#e0a15a', D: '#8a5a2a', E: '#1b1d22', N: '#2b2b2b'}, a: ['.......DD.', '.......BBB', 'D.BBBBBBEN', '.BBBBBBBB.', '.BBBBBBB..', '.B.B..B.B.'], b: ['.......DD.', '.......BBB', '.DBBBBBBEN', '.BBBBBBBB.', '.BBBBBBB..', 'B..B.B..B.']};
  function drawSprite(cv, S, f, flip) { const rows = S[f]; cv.width = rows[0].length; cv.height = rows.length; const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.save(); if (flip) { g.translate(cv.width, 0); g.scale(-1, 1); } sprite(g, rows, S.pal, 0, 0); g.restore(); }
  // 小图标（练习页的矿车、终点旗、错题宝箱），返回 data URL 给 CSS 用
  const ICONS = {
    cart: [['..HHHH......', '.HSSSSH.....', '.SESSES.....', 'kGGGGGGGGGGk', 'kGgGGGGGGgGk', 'kGGGGGGGGGGk', '.kkkkkkkkkk.', '..kk....kk..', '..kk....kk..', '............'], {k: '#2b2b2b', G: '#8a8d94', g: '#f2c14e', H: '#4a2f1b', S: '#f1c27d', E: '#1b1d22'}],
    goal: [['k.....', 'kRRRR.', 'kRRRRR', 'kRRRR.', 'k.....', 'k.....', 'k.....', 'k.....', 'k.....', 'k.....'], {k: '#2b2b2b', R: '#b3261e'}],
    chest: [['.kkkkkkkkkk.', 'kPPPPPPPPPPk', 'kPpppppppppk', 'kkkkkGGkkkkk', 'kPPPPGGPPPPk', 'kPPPPPPPPPPk', 'kPpppppppppk', 'kPPPPPPPPPPk', 'kkkkkkkkkkkk', '............'], {k: '#000', P: '#c08a52', p: '#8a5a2c', G: '#f2c14e'}],
  };
  function iconURL(name) { const [rows, pal] = ICONS[name], cv = document.createElement('canvas'); cv.width = rows[0].length; cv.height = rows.length; sprite(cv.getContext('2d'), rows, pal, 0, 0); return cv.toDataURL(); }

  // ---------- 一个岛世界（首页） ----------
  // root 里要有：.w-vp（拖动区）、.w-say、.w-mini、.w-hint；o = {sign(id) → {sq:[档位…], today}, onZone(z), heroLine() → 小人说的话}
  function create(root, o) {
    const q = s => root.querySelector(s);
    const vp = q('.w-vp');
    vp.innerHTML = '<canvas class="w-sky px"></canvas><div class="w-layer w-far"><canvas class="px"></canvas></div><div class="w-layer w-main"><canvas class="px"></canvas><div class="w-props"></div><div class="w-dog"><canvas class="px"></canvas></div><div class="w-hero"><canvas class="px"></canvas></div></div>';
    const sky = q('.w-sky'), far = q('.w-far canvas'), main = q('.w-main canvas'), Lmain = q('.w-main'), Lfar = q('.w-far'), props = q('.w-props');
    const heroEl = q('.w-hero'), dogEl = q('.w-dog'), say = q('.w-say'), mini = q('.w-mini'), hint = q('.w-hint');
    drawSky(sky); drawMain(main); drawFar(far, Math.ceil(WW * 0.45 + 400));
    let started = false, lastW = 0, P = 4, camX = 0, maxX = 0, onZone = null, pinZone = null, hintOn = false, cam0 = 0, entering = false, anim = null, drag = null;
    const hero = {x: 180 - 26, flip: false}, signs = {};
    const W = () => root.clientWidth || innerWidth, H = () => root.clientHeight || innerHeight;
    const shown = () => !root.hidden && root.getClientRects().length > 0;   // 不能用 offsetParent：.scr 是 position:fixed，它永远是 null
    const centerOf = z => z.x * P - W() / 2;
    function placeHero() {
      heroEl.style.width = 8 * P + 'px'; heroEl.style.height = 15 * P + 'px'; heroEl.style.left = hero.x * P + 'px'; heroEl.style.top = (surf(hero.x + 4) - 15) * P + 'px';
      const dx = hero.x + (hero.flip ? 12 : -14);
      dogEl.style.width = 10 * P + 'px'; dogEl.style.height = 6 * P + 'px'; dogEl.style.left = dx * P + 'px'; dogEl.style.top = (surf(dx + 5) - 6) * P + 'px';
    }
    const frame = f => { drawSprite(heroEl.firstChild, HERO, f, hero.flip); drawSprite(dogEl.firstChild, DOG, f, hero.flip); };
    // 木牌、旗子、小地图：每次回到首页按真实进度重画
    function refresh() {
      props.innerHTML = '';
      ZONES.forEach(z => {
        if (z.id === 'home') return;
        const st = o.sign(z.id), s = document.createElement('div');
        s.className = 'w-sign' + (st.today ? ' today' : ''); s.dataset.z = z.id;
        s.style.left = (z.sx || z.x) * P + 'px'; s.style.top = Math.max(84, 15 * P) + 'px';
        s.innerHTML = (st.today ? '<span class="w-flag">今天先来这里</span>' : '') + `<div class="board"><div class="nm">${z.name}</div><div class="row">${st.sq.map(l => `<i class="l${l}"></i>`).join('')}</div></div><div class="post"></div>`;
        props.appendChild(s); signs[z.id] = s;
      });
      mini.innerHTML = ZONES.map(z => `<button data-z="${z.id}" class="${z.id !== 'home' && o.sign(z.id).today ? 'today' : ''}"><i style="background:${z.icon}"></i><span>${z.short}</span></button>`).join('');
      onZone = null; pinZone = null; setCam(camX);
    }
    function layout() {
      const mid = started ? (camX + lastW / 2) / P : null;   // 转屏前屏幕中间对着岛上哪里（像素画坐标），转完还对着那里
      P = H() / WH; lastW = W();
      main.style.width = WW * P + 'px'; main.style.height = H() + 'px';
      far.style.width = far.width * P + 'px'; far.style.height = H() + 'px';
      maxX = Math.max(0, WW * P - W());
      refresh(); placeHero(); setCam(Math.max(0, Math.min(maxX, mid === null ? camX : mid * P - W() / 2)));
    }
    // ---------- 镜头：拖动、惯性、回弹 ----------
    const clampSoft = x => x < 0 ? x * 0.35 : x > maxX ? maxX + (x - maxX) * 0.35 : x;
    function setCam(x) {
      camX = x;
      Lmain.style.transform = `translate3d(${-camX}px,0,0)`;
      Lfar.style.transform = `translate3d(${-camX * 0.45}px,0,0)`;
      const mid = (camX + W() / 2) / P;
      let best = ZONES[0]; ZONES.forEach(z => { if (Math.abs(z.x - mid) < Math.abs(best.x - mid)) best = z; });
      if (camX <= 1) best = ZONES[0]; else if (camX >= maxX - 1) best = ZONES[ZONES.length - 1]; // 到边时镜头没法居中，按边上那个算
      if (pinZone) best = pinZone;
      if (best.id !== onZone) { onZone = best.id; mini.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.z === best.id)); }
      if (hintOn && Math.abs(camX - cam0) > 60) { hintOn = false; hint.classList.add('gone'); }
    }
    function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = null; say.classList.remove('on'); }
    function glide(v) {
      stopAnim(); let last = performance.now();
      const step = now => {
        const dt = Math.min(32, now - last); last = now;
        let x = camX + v * dt; v *= Math.pow(0.94, dt / 16);
        if (x < 0 || x > maxX) { const tgt = x < 0 ? 0 : maxX; v *= 0.6; x += (tgt - x) * Math.min(1, dt / 90); }
        setCam(x);
        if (Math.abs(v) > 0.02 || camX < -0.5 || camX > maxX + 0.5) anim = requestAnimationFrame(step); else { setCam(Math.max(0, Math.min(maxX, camX))); anim = null; }
      };
      anim = requestAnimationFrame(step);
    }
    function panTo(tx, ms, done) {
      stopAnim(); ms = ms || 480; tx = Math.max(0, Math.min(maxX, tx)); const from = camX, t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); setCam(from + (tx - from) * e); if (k < 1) anim = requestAnimationFrame(step); else { anim = null; done && done(); } };
      anim = requestAnimationFrame(step);
    }
    vp.addEventListener('pointerdown', e => { if (entering) return; pinZone = null; stopAnim(); try { vp.setPointerCapture(e.pointerId); } catch (x) {} drag = {x0: e.clientX, cam0: camX, t0: performance.now(), moved: 0, s: [[performance.now(), e.clientX]]}; vp.classList.add('drag'); });
    vp.addEventListener('pointermove', e => {
      if (!drag) return; const dx = e.clientX - drag.x0; drag.moved = Math.max(drag.moved, Math.abs(dx));
      setCam(clampSoft(drag.cam0 - dx));
      drag.s.push([performance.now(), e.clientX]); if (drag.s.length > 6) drag.s.shift();
    });
    vp.addEventListener('pointerup', e => {
      if (!drag) return; vp.classList.remove('drag');
      const d = drag; drag = null;
      // 手指轻微滑动（< 14 像素）、按得慢一点（< 0.7 秒）也算点
      if (d.moved < 14 && performance.now() - d.t0 < 700) { const r = vp.getBoundingClientRect(); tapWorld(e.clientX - r.left, e.clientY - r.top); if (camX < 0 || camX > maxX) glide(0); return; }
      const a = d.s[0], b = d.s[d.s.length - 1], v = b[0] - a[0] > 0 ? -(b[1] - a[1]) / (b[0] - a[0]) : 0;
      glide(Math.max(-4, Math.min(4, v)));
    });
    vp.addEventListener('pointercancel', () => { drag = null; vp.classList.remove('drag'); glide(0); });
    vp.addEventListener('wheel', e => { e.preventDefault(); stopAnim(); setCam(Math.max(0, Math.min(maxX, camX + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY)))); }, {passive: false});
    function zoneAt(ax) { let best = null; ZONES.forEach(z => { if (Math.abs(z.x - ax) < 62 && (!best || Math.abs(z.x - ax) < Math.abs(best.x - ax))) best = z; }); return best; }
    function tapWorld(cx, cy) {
      const wasOpen = o.closeAll && o.closeAll(), ax = (camX + cx) / P, ay = cy / P;
      if (ax > hero.x - 3 && ax < hero.x + 11 && ay > surf(hero.x + 4) - 18) { sayAt(heroEl, hero.x + 4, surf(hero.x + 4) - 15, o.heroLine()); return; }
      const dx = hero.x + (hero.flip ? 12 : -14);
      if (ax > dx - 2 && ax < dx + 12 && ay > surf(dx + 5) - 10) { sayAt(dogEl, dx + 5, surf(dx + 5) - 6, '汪汪！'); return; }
      const z = zoneAt(ax); if (z && !(wasOpen && z.id === 'home')) focus(z.id);
    }
    function sayAt(el, ax, ay, t) { // 在岛上某个位置上方冒一句话；el 是要跳一下的角色
      if (el) { el.classList.remove('jump'); void el.offsetWidth; el.classList.add('jump'); }
      say.textContent = t; say.style.left = ax * P - camX + 'px'; say.style.top = ay * P - 46 + 'px';
      say.classList.add('on'); clearTimeout(sayAt.t); sayAt.t = setTimeout(() => say.classList.remove('on'), 1800);
    }
    function focus(id) {
      const z = ZONES.find(x => x.id === id); panTo(centerOf(z));
      if (z.id === 'home') { o.onZone(null); setTimeout(() => sayAt(null, z.x, surf(z.x) - 30, '这是空空的家'), 380); return; }
      o.onZone(z);
    }
    mini.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || entering) return; pinZone = ZONES.find(x => x.id === b.dataset.z); focus(b.dataset.z); });
    // ---------- 走过去 → 进练习 ----------
    function walkTo(tx, done) {
      heroEl.classList.add('walk'); hero.flip = tx < hero.x;
      const from = hero.x, ms = Math.min(900, 200 + Math.abs(tx - from) * 4), t0 = performance.now(); let f = 0, lastF = 0;
      const step = now => { const k = Math.min(1, (now - t0) / ms); hero.x = from + (tx - from) * k; placeHero(); setCam(Math.max(0, Math.min(maxX, (hero.x + 20) * P - W() / 2))); if (now - lastF > 110) { f ^= 1; lastF = now; frame(f ? 'b' : 'a'); } if (k < 1) requestAnimationFrame(step); else { frame('a'); heroEl.classList.remove('walk'); done && done(); } };
      requestAnimationFrame(step);
    }
    // 走到这块地 → 镜头往里推、渐黑 → done()（进练习）。走的过程中锁住岛，防打断和连点
    function go(id, done) {
      if (entering) return false; entering = true;
      const z = ZONES.find(x => x.id === id) || ZONES[1], fade = document.querySelector('.w-fade');
      panTo(Math.max(0, Math.min(maxX, hero.x * P + 20 * P - W() / 2)), 260, () => walkTo(z.x - 20, () => {
        Lmain.classList.add('zoom'); Lmain.style.transformOrigin = `${z.x * P}px ${H() * .6}px`;
        Lmain.style.transform = `translate3d(${-camX}px,0,0) scale(1.35)`;
        if (fade) fade.classList.add('on');
        setTimeout(() => { Lmain.classList.remove('zoom'); Lmain.style.transformOrigin = '0 0'; setCam(camX); entering = false; try { done(); } finally { if (fade) setTimeout(() => fade.classList.remove('on'), 30); } }, 260);
      }));
      return true;
    }
    function pulse(id, idx) { const s = signs[id]; if (!s) return; const i = s.querySelectorAll('.row i')[idx]; if (i) { i.classList.remove('pulse'); void i.offsetWidth; i.classList.add('pulse'); } }
    // 首次：镜头放在今天要去的地方附近，4 秒后收起"拖一拖"提示
    function start(todayId) {
      layout();
      if (!started) { started = true; const z = ZONES.find(x => x.id === todayId) || ZONES[1]; hero.x = z.x - 26; placeHero(); setCam(Math.max(0, Math.min(maxX, centerOf(z) - W() * 0.1))); cam0 = camX; hintOn = true; setTimeout(() => { hintOn = false; hint.classList.add('gone'); }, 4000); }
    }
    frame('a');
    setInterval(() => { if (!heroEl.classList.contains('walk') && shown()) { frame('b'); setTimeout(() => frame('a'), 160); } }, 2600); // 待机：眨眼、摇尾巴
    addEventListener('resize', () => { if (shown()) layout(); });   // 转屏、Safari 工具栏伸缩
    return {start, layout, refresh, focus, go, pulse, sayAt: (t) => sayAt(heroEl, hero.x + 4, surf(hero.x + 4) - 15, t), get entering() { return entering; }, get camX() { return camX; }, get maxX() { return maxX; }};
  }

  // 练习页 / 结算页的背景 = 岛上这一块地方的像素画（截一屏宽）
  let MAIN = null, FAR = null, SKY = null;
  function sceneBg(cv, id, w, h) {
    if (!MAIN) { MAIN = document.createElement('canvas'); FAR = document.createElement('canvas'); SKY = document.createElement('canvas'); drawSky(SKY); drawMain(MAIN); drawFar(FAR, Math.ceil(WW * 0.45 + 400)); }
    const z = ZONES.find(x => x.id === id) || ZONES[1], P = h / WH, vw = Math.round(w / P), sx = Math.max(0, Math.min(WW - vw, Math.round(z.x - vw / 2)));
    cv.width = vw; cv.height = WH; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(SKY, 0, 0, vw, WH); g.drawImage(FAR, Math.round(sx * .45), 0, vw, WH, 0, 0, vw, WH); g.drawImage(MAIN, sx, 0, vw, WH, 0, 0, vw, WH);
  }
  // 答对：一块矿石从 from 飞进 to（计数器）
  function flyOre(from, to, n, after) {
    const c = ORE[n % ORE.length], a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), f = document.createElement('i');
    f.className = 'w-fly'; f.style.background = c; document.body.appendChild(f);
    const x0 = a.left + a.width / 2 - 15, y0 = a.top + a.height / 2 - 15, x1 = b.left + 4, y1 = b.top + b.height / 2 - 15;
    const done = () => { f.remove(); after && after(c); };
    if (!f.animate) return done();
    f.animate([{transform: `translate(${x0}px,${y0}px) scale(1.4) rotate(0)`}, {transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 60}px) scale(1.1) rotate(160deg)`}, {transform: `translate(${x1}px,${y1}px) scale(.8) rotate(360deg)`}], {duration: 560, easing: 'cubic-bezier(.4,.1,.6,1)'}).onfinish = done;
  }
  return {ZONES, ORE, WW, WH, HERO, DOG, create, sceneBg, flyOre, drawSprite, iconURL};
});
