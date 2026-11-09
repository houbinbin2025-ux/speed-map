// 思维模块的练习页（天平桥、凑数矿、线索营地、方块工坊）：出题和进度在 puzzles.js，这里只管页面。不计时；不进四档颜色，也不进每日排课
// 浏览器里挂到 window.THINKING；o = {S() → 存档, show() 切到这一页, earn(n) 记矿石并保存, onExit() 回岛}
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.THINKING = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const CSS = `#think{--bg:var(--cave);--panel:#23262d;--go-dk:#3f7a22}   /* 颜色用全局 :root（视觉规范 1.2，E-3）；这里只定思维页自己才有的面板色和深绿按钮 */
#think button{font:inherit;color:var(--ink);background:var(--stone);border:3px solid #000;min-height:62px;cursor:pointer;font-size:20px;font-weight:700;padding:0 12px}
#think button:active{transform:translateY(2px)}
#think button[disabled]{opacity:.35}
#think button.go{background:var(--go-dk);box-shadow:inset 0 -5px 0 #2c5a18,inset -5px 0 0 #2c5a18}
#think .bar{display:flex;align-items:center;gap:8px;height:56px}
#think .bar button{min-height:54px;font-size:16px;padding:0 10px}
#think .tabs{display:flex;gap:4px;flex:1;min-width:0}
#think .tabs button{flex:1;min-width:0;padding:0 2px;font-size:15px;font-weight:500;color:var(--mute);white-space:nowrap}
#think .tabs button.on{border-color:var(--warn);color:var(--ink);font-weight:700}
#think .tabs button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;line-height:1.25}#think .tabs button span{max-width:100%;overflow:hidden;text-overflow:ellipsis}#think .tabs .tlv{font-size:12px;font-weight:500;color:var(--dim)}
#think .ore{display:flex;align-items:center;gap:6px;font-size:20px;font-weight:800;padding:0 10px;height:46px;background:#000}
#think .ore i{width:18px;height:18px;background:var(--warn);border:2px solid #7a5a12;display:block}
#think .main{display:flex;gap:14px;height:300px;margin-top:4px}
#think .col{min-width:0;display:flex;flex-direction:column;position:relative}
#think .say{font-size:22px;font-weight:700;line-height:1.3;min-height:30px}
#think .sub{font-size:16px;color:var(--mute);line-height:1.35}
#think .fb{font-size:18px;font-weight:700;line-height:1.3;min-height:26px;color:var(--mute)}
#think .fb div{margin-top:5px}
#think .fb.ok{color:var(--ok)}
#think .fb.bad{color:var(--bad)}
#think .eq{display:flex;align-items:center;justify-content:center;gap:7px;font-size:32px;font-weight:800;height:50px}
#think .eq b{min-width:50px;height:46px;line-height:40px;text-align:center;background:var(--paper);color:#222;border:3px solid #000;font-size:28px}
#think .eq b.empty{color:transparent}
#think .eq b.cur{border-color:var(--warn)}
#think .keys{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
#think .keys button{font-size:24px;min-height:62px;padding:0}
#think .acts{display:flex;gap:8px;margin-top:auto}
#think .acts button{flex:1}
#think .grow{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
#think .beam{transition:transform .5s ease;transform-box:view-box;transform-origin:230px 56px}
#think .pan{transition:transform .5s ease}
#think .walker{transition:transform 1.5s linear .5s}
#think .scalewrap{position:relative;width:460px;height:170px}
#think .scalewrap svg{width:460px;height:170px;display:block;overflow:visible}
#think .veil[hidden]{display:none}
#think .veil{position:absolute;inset:-22px 0 0 0;z-index:1;display:flex;align-items:center;justify-content:center;background:var(--panel);border:3px dashed #000;font-size:18px;color:var(--mute)}
#think .ores{display:flex;gap:8px;justify-content:center}
#think .ores button{width:70px;height:66px;font-size:30px;font-weight:800;background:#46413a;color:var(--warn);padding:0}
#think .ores button.used{opacity:.25}
#think .expr{display:flex;align-items:center;justify-content:center;gap:6px;font-size:28px;font-weight:800;height:50px;background:#000;padding:0 10px}
#think .target{display:flex;align-items:center;gap:14px;font-size:22px;font-weight:700}
#think .target b{font-size:48px;color:var(--warn);line-height:1.35}
#think .found{font-size:17px;color:var(--mute);line-height:1.4;min-height:48px}
#think .found{width:100%}
#think .found span{color:var(--ok);font-weight:700;margin-right:10px;white-space:nowrap;display:inline-block}
#think .signs{display:flex;gap:8px}
#think .signs button{flex:1;font-size:30px;min-height:61px;padding:0}
#think .signs button.on{border-color:var(--warn)}
#think .grid{display:grid;gap:3px;background:#000;padding:3px;width:max-content}
#think .grid button{padding:0;min-height:0;border:0;background:var(--paper);color:#222;font-size:30px;font-weight:800;display:block}
#think .grid button.given{background:#c9c0a9;color:#3a3a3a}
#think .grid button.fill{color:#1d5fbf}
#think .grid button.sel{outline:4px solid var(--warn);outline-offset:-4px}
#think .grid button.bad{background:#ffb3a4;color:#7a1d10}
#think .grid button.br{box-shadow:inset -5px 0 0 #000}
#think .grid button.bb{box-shadow:inset 0 -5px 0 #000}
#think .grid button.br.bb{box-shadow:inset -5px -5px 0 #000}
#think .dogbox{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
#think .dogbox button{height:82px;font-size:30px;font-weight:800;background:var(--plank);color:#23180c;padding:0;position:relative}
#think .dogbox button.off{background:#3a3c44;color:#6f7078;text-decoration:line-through}
#think .dogbox button.hit{background:var(--ok)}
#think .clues{display:flex;flex-direction:column;gap:6px}
#think .clues div{background:var(--stone);border:3px solid #000;padding:7px 12px;font-size:21px;font-weight:700}
#think .cells{display:grid;gap:2px;background:#000;padding:3px;width:max-content;position:relative}
#think .cells button{padding:0;min-height:0;border:0;background:var(--paper);display:block}
#think .cells button.given{background:var(--counter)}
#think .cells button.on{background:var(--warn)}
#think .cells button.miss{background:#ffb3a4}
#think .cells button.ans{background:var(--ok)}
#think .cells .axis{position:absolute;background:var(--bad);pointer-events:none}
#think .shape{display:grid;gap:2px}
#think .shape i{display:block;background:var(--warn);outline:2px solid #000;outline-offset:-1px}
#think .shape i.o{background:transparent;outline:0}
#think .opts{display:flex;gap:10px}
#think .opts button{flex:1;height:130px;display:flex;align-items:center;justify-content:center;padding:0}
#think .opts button.hit{border-color:var(--ok)}
#think .opts button.miss{border-color:var(--bad);opacity:.5}
#think .shownbox{width:100%;height:150px;background:var(--panel);border:3px solid #000;display:flex;align-items:center;justify-content:center}
#think .home h1{font-size:24px;margin:0;line-height:50px}
#think .mods{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
#think .mods button{height:138px;text-align:left;padding:10px 14px;display:flex;flex-direction:column;gap:5px;justify-content:center}
#think .mods b{font-size:25px;color:var(--warn)}
#think .mods span{font-size:16px;font-weight:500;color:var(--mute);line-height:1.35}
#think :where(*:not(svg,svg *)){all:revert;box-sizing:border-box}
#think{padding:0;display:block;touch-action:manipulation;-webkit-user-select:none;user-select:none;color:var(--ink)}
#think .tstage{position:absolute;left:50%;top:50%;width:860px;height:360px;transform-origin:center;color:var(--ink);font-family:var(--f-cn);font-size:16px}
#think{background:var(--bg)}
#think button{color:var(--ink);box-sizing:border-box}
#think .col,#think .bar,#think .main{box-sizing:border-box}`;
  function create(root, o, opt = {}) {
  const P = PUZZLES, R = P.rng(opt.seed || Date.now() % 1e9);
  if (!document.getElementById('thinkCss')) { const st = document.createElement('style'); st.id = 'thinkCss'; st.textContent = CSS; document.head.appendChild(st); }
  root.innerHTML = '<div class="tstage"></div>';
  const $s = root.querySelector('.tstage');
const G = {mod: null, tier: 0, q: null, ore: 0, st: {}, done: false, tap: 0, wrong: 0, got: false, up: false};
// 留边，底部按钮不贴屏幕边；iPhone 刘海和底部横条用 env 留出来
// --padL / --padR 是 max(16px, env(...))，getPropertyValue 拿到的是这串字，parseFloat 会变成 0（E-5：iPad 上内容离屏幕边只有 4px，刘海屏会压到刘海下）。放一个看不见的格子量出真实像素
const padPx = v => { const e = document.createElement('div'); e.style.cssText = `position:absolute;visibility:hidden;height:0;width:var(${v})`; root.appendChild(e); const x = e.getBoundingClientRect().width; e.remove(); return x || 16; };
function fit() {
  const w = root.clientWidth, h = root.clientHeight; if (!w || !h) return;
  const side = Math.max(padPx('--padL'), padPx('--padR'));   // 整页居中，两边按宽的那边留
  const s = Math.min((w - side * 2 - 8) / 860, (h - 8) / 360, 1.7);
  $s.style.transform = `translate(-50%,-50%) scale(${s})`;
}
addEventListener('resize', fit);
const hush = () => o.stopSay();   // 朗读走页面的 sayIt（App 里是原生语音）
const OK_NEXT_MS = 1500;   // 做对后自动进下一题（Ben 11-07）；不会的讲解停住，等孩子点「继续」
const cancelAuto = () => { clearTimeout(G.autoT); G.autoT = null; };
const autoNext = () => { cancelAuto(); G.autoT = setTimeout(() => { G.autoT = null; G.tap = performance.now() + 500; next(); }, OK_NEXT_MS); };   // 正要点「继续」时刚好切题，这一下不能落到新题上
document.addEventListener('visibilitychange', () => { if (document.hidden) { hush(); cancelAuto(); } });
addEventListener('popstate', () => { hush(); cancelAuto(); });

// 家长手选了级别时的默认档（中控 11-09）：按进度，再夹到「所选最低级对应的档」和「所选最高级对应的档」之间
// （某级对应的档 = 建议级别 ≤ 这一级的最后一档）。全选 1–15 = 按进度；只选 9–12 = 至少从第 9 级那档起；选 3–8 = 按进度、最多停在第 8 级那档。
// 只管进门停在哪：进度已经开放的档、默认档以前的档都能点，不锁、不倒退。没手选 = 按进度
function lvRange() {
  const r = o.levelRange ? o.levelRange() : [0, 0], lv = ((typeof SKILLS !== 'undefined' && SKILLS.THINK_LEVEL) || {})[G.mod.id] || [];
  const at = top => { let t = -1; lv.forEach((n, i) => { if (n <= top) t = i; }); return t; };
  return r[1] ? {lo: at(r[0]), hi: at(r[1])} : null;
}
// 从第 from 档起第一个没过关的档（都过关了 = 最后一档）。手选级别会让孩子跳过低档，所以不能只看「从第 0 档起连续过关」（审查 11-09）
function nextFrom(n, from) { for (let i = Math.max(0, from); i < n.length; i++) if (n[i] < P.PASS) return i; return n.length - 1; }
function startTier(pr) { const r = lvRange(); return r ? Math.max(0, Math.min(nextFrom(pr.n, r.lo), Math.max(r.hi, r.lo, 0))) : pr.tier; }
// 能点到哪一档：进度档、已过关的最高档的下一档、手选时「所选最低级那档起第一个没过关的档」，取最大；不收回
function openUpTo(pr) {
  const r = lvRange(); let last = -1; pr.n.forEach((x, i) => { if (x >= P.PASS) last = i; });
  return Math.min(pr.n.length - 1, Math.max(pr.tier, last + 1, r ? Math.max(r.lo, startTier(pr), nextFrom(pr.n, r.lo)) : -1));
}
function enter(id) {
  G.mod = P.modOf(id); G.ore = 0; G.q = null; G.up = false; G.tier = startTier(P.progress(o.S(), id)); G.tap = performance.now() + 500;
  o.show(); fit(); next();
}
function next() { hush(); cancelAuto(); if (G.up !== false) { G.tier = G.up; G.up = false; } const prev = JSON.stringify(G.q); let tries = 0; do { G.q = G.mod.make(R, G.tier); } while (JSON.stringify(G.q) === prev && ++tries < 20);   /* 不连续出同一题 */ G.done = false; G.got = false; G.wrong = 0; G.st = {}; G.t0 = performance.now(); render(); }
function earn() {   // 一题一块矿石；进度和矿石马上存，中途退出不丢
  if (G.got) return; G.got = true; G.ore++; const n = $s.querySelector('#oreN'); if (n) n.textContent = G.ore;
  if (o.gem) o.gem({key: G.mod.id + ':' + G.tier + ':' + JSON.stringify(G.q), wrong: G.wrong, secs: (performance.now() - (G.t0 || performance.now())) / 1000});   // 答对给碎片、算有效时间（C 模块接线，中控 11-08）
  G.note = '';
  if (P.record(o.S(), G.mod.id, G.tier)) {
    const pr = P.progress(o.S(), G.mod.id), up = pr.n.findIndex((x, i) => i > G.tier && x < P.PASS), all = pr.passed === G.mod.tiers.length;   // 升到后面第一个没过关的档（跳过低档时后面可能已经过关，审查 11-09）
    if (up >= 0) G.up = up;
    G.note = all ? `${G.mod.name}全部学会了` : up < 0 ? '' : `学会了，下一个：${G.mod.tiers[up]}`;
    const f = $s.querySelector('#fb'); if (f && G.note) setTimeout(() => { const t = document.createElement('div'); t.textContent = G.note; f.appendChild(t); G.note = ''; }, 0);
  }
  paintTabs();
  o.earn(1);
}
function paintTabs() {
  const tabs = $s.querySelector('.tabs'); if (!tabs) return;
  tabs.innerHTML = tabsHtml();
  tabs.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { if (guarded() || b.disabled || Number(b.dataset.t) === G.tier) return; G.up = false; G.tier = Number(b.dataset.t); next(); });
}
function bindCont(a) { a.querySelector('#cont').onclick = () => { if (guarded()) return; G.tap = performance.now() + 500; next(); }; }
function tabsHtml() {   // 没开放的技能点不了；当前技能显示还差几题
  const pr = P.progress(o.S(), G.mod.id);
  // 每档的建议级别（A 定在 skills.js THINK_LEVEL，只作参考、不锁）：小字给家长看
  const lv = ((typeof SKILLS !== 'undefined' && SKILLS.THINK_LEVEL) || {})[G.mod.id] || [];
  return G.mod.tiers.map((t, i) => `<button data-t="${i}" class="${i === G.tier ? 'on' : ''}" ${i > openUpTo(pr) ? 'disabled' : ''}><span>${t}${pr.n[i] >= P.PASS ? ' ✓' : i === G.tier ? ` ${pr.n[i]}/${P.PASS}` : ''}</span>${lv[i] ? `<small class="tlv">建议第 ${lv[i]} 级起</small>` : ''}</button>`).join('');
}
function shell(say, sub) {
  $s.innerHTML = `<div class="bar"><button id="back">返回</button><div class="tabs">${tabsHtml()}</div><button id="say" class="spk" data-say="${say}${sub ? '。' + sub : ''}" aria-label="朗读">朗读</button><div class="ore"><i></i><span id="oreN">${G.ore}</span></div></div><div class="main" id="main"></div>`;
  $s.querySelector('#back').onclick = () => { hush(); cancelAuto(); o.onExit(); };
  paintTabs();
  return $s.querySelector('#main');
}
const guarded = () => performance.now() < G.tap;
function finish(ok, msg, fbEl) {   // ok = 孩子做出来了，1.5 秒后自动下一题（也可以点「继续」）；false = 点了不会，等孩子点「继续」
  G.done = true; G.tap = performance.now() + 500; if (ok) earn();
  fbEl.className = 'fb ' + (ok ? 'ok' : 'bad'); fbEl.textContent = msg;
  const a = $s.querySelector('#acts'); a.innerHTML = '<button class="go" id="cont">继续</button>';
  bindCont(a); if (ok) autoNext();
}
function acts(html, dunno) { return `<div class="acts" id="acts">${html}<button id="dunno">不会</button></div>`; }
const bindDunno = fn => { const d = $s.querySelector('#dunno'); if (d) d.onclick = () => { if (!guarded()) fn(); }; };
const on = (el, fn) => { el.onclick = e => { if (guarded() || G.done) return; fn(e); }; };
function render() { ({balance: rBalance, target: rTarget, clue: rClue, block: rBlock})[G.mod.id](); }

/* —— 天平桥 —— */
function eqHtml(q, vals, idx, op = '=') {
  let i = 0;
  const side = s => s.map(x => { if (x !== null) return `<span>${x}</span>`; const k = i++, v = vals[k]; return `<b class="${v ? '' : 'empty'} ${k === idx ? 'cur' : ''}">${v || '0'}</b>`; }).join('<span>+</span>');
  return `${side(q.left)}<span>${op}</span>${side(q.right)}`;
}
function pile(terms, x0) {   // 每个数一组方块，颜色分开，看得见「几和几」
  let out = '', col = 0, row = 0, c = 0;
  terms.forEach((n, g) => { for (let k = 0; k < n; k++) { out += `<rect x="${x0 + col * 11}" y="${-11 - row * 11}" width="10" height="10" fill="${g ? '#6ea8fe' : '#f2c14e'}" stroke="#000"/>`; if (++col === 8) { col = 0; row++; } } });
  return out;
}
function scaleSvg() {
  return `<svg viewBox="0 0 460 170"><rect x="0" y="150" width="60" height="20" fill="#7a5a32"/><rect x="400" y="150" width="60" height="20" fill="#7a5a32"/>
   <rect x="222" y="56" width="16" height="104" fill="#5a3a20"/><rect x="196" y="156" width="68" height="14" fill="#5a3a20"/>
   <g class="beam" id="beam"><rect x="40" y="50" width="380" height="12" fill="#c08a52" stroke="#000" stroke-width="2"/><g class="walker" id="walker"><rect x="46" y="26" width="16" height="24" fill="#6fae3a" stroke="#000" stroke-width="2"/><rect x="48" y="16" width="12" height="11" fill="#e8b98a" stroke="#000" stroke-width="2"/></g></g>
   <g class="pan" id="panL"><line x1="85" y1="56" x2="85" y2="104" stroke="#ecebe4"/><rect x="35" y="104" width="100" height="6" fill="#ecebe4" stroke="#000"/><g id="pileL" transform="translate(0,104)"></g></g>
   <g class="pan" id="panR"><line x1="375" y1="56" x2="375" y2="104" stroke="#ecebe4"/><rect x="325" y="104" width="100" height="6" fill="#ecebe4" stroke="#000"/><g id="pileR" transform="translate(0,104)"></g></g></svg>`;
}
function setScale(q, vals, cross) {
  const b = P.balanced(q, vals), ang = Math.max(-9, Math.min(9, b.diff * 3));   // 左重 → 逆时针
  const dy = Math.sin(ang * Math.PI / 180) * 145;
  $s.querySelector('#beam').style.transform = `rotate(${-ang}deg)`;
  $s.querySelector('#panL').style.transform = `translateY(${dy}px)`;
  $s.querySelector('#panR').style.transform = `translateY(${-dy}px)`;
  $s.querySelector('#pileL').innerHTML = pile(b.l, 42); $s.querySelector('#pileR').innerHTML = pile(b.r, 332);
  if (cross) $s.querySelector('#walker').style.transform = 'translateX(345px)';
  return b;
}
function rBalance() {
  const q = G.q, kind = q.kind;
  const say = {judge: '两边一样重吗', fill: '填几，两边才一样重', two: '填两个数，让两边一样重', blind: '先想好，填上再称'}[kind];
  const sideSay = t => t.map(x => x === null ? '空格' : x).join(' 加 '), sayEq = `${sideSay(q.left)} 等于 ${sideSay(q.right)}`;
  const m = shell(say, kind === 'judge' ? q.left.join(' 加 ') + ' 和 ' + q.right.join(' 加 ') : sayEq), s = G.st; s.vals = s.vals || [];
  const nSlots = kind === 'two' ? 2 : (kind === 'judge' ? 0 : 1);
  const veiled = kind === 'judge' || kind === 'blind';
  m.innerHTML = `<div class="col" style="width:470px"><div class="say">${say}</div><div class="eq" id="eq"></div><div class="grow"><div class="scalewrap">${scaleSvg()}${veiled ? '<div class="veil" id="veil">答完再称</div>' : ''}</div></div></div>
   <div class="col" style="flex:1;gap:8px">${kind === 'judge' ? '' : `<div class="keys">${Array.from({length: 12}, (_, i) => `<button data-n="${i + 1}">${i + 1}</button>`).join('')}</div>`}
   <div class="fb" id="fb"></div>${kind === 'judge' ? `<div class="signs" style="margin-top:50px"><button id="yes">一样重</button><button id="no">不一样</button></div>` : ''}
   ${acts((nSlots === 2 ? '<button id="clr">擦掉</button>' : '') + (kind === 'blind' ? '<button class="go" id="weigh" disabled>称一称</button>' : ''))}</div>`;
  const fb = m.querySelector('#fb'), eq = m.querySelector('#eq');
  const paint = op => { eq.innerHTML = kind === 'judge' ? eqHtml(q, [], -1, op || '?') : eqHtml(q, s.vals, Math.min(s.vals.length, nSlots - 1), op || '='); };
  const unveil = () => { const v = m.querySelector('#veil'); if (v) v.hidden = true; };
  const blankLeft = q.left.includes(null);
  const tell = b => { const heavy = b.diff > 0 ? '左边' : '右边'; return kind === 'two' ? `${heavy}重了，换两个数` : `${heavy}重了，填${(b.diff > 0) === blankLeft ? '小' : '大'}一点`; };
  paint(); setScale(q, kind === 'judge' ? [] : []);
  if (kind === 'judge') {
    const verdict = () => { unveil(); paint(q.equal ? '=' : '≠'); setScale(q, [], q.equal); return q.equal ? `两边都是 ${P.sum(q.left)}，一样重` : `左边 ${P.sum(q.left)}，右边 ${P.sum(q.right)}，不一样重`; };
    const pickIt = eq2 => { const v = verdict(); if (eq2 === q.equal) finish(true, v, fb); else { G.wrong++; finish(false, v, fb); } };
    on(m.querySelector('#yes'), () => pickIt(true)); on(m.querySelector('#no'), () => pickIt(false));
  } else {
    const judge = () => { const b = setScale(q, s.vals, false); if (P.isCopy(q, s.vals)) { fb.className = 'fb bad'; fb.textContent = '和右边的数一样，换两个数'; s.vals = []; paint(); setScale(q, [], false); return; } if (b.diff === 0) { setScale(q, s.vals, true); finish(true, `两边都是 ${P.sum(b.r)}，桥放平了`, fb); } else { G.wrong++; fb.className = 'fb bad'; fb.textContent = tell(b); if (kind === 'two') { s.vals = []; paint(); } else paint('≠'); } };
    m.querySelectorAll('[data-n]').forEach(btn => on(btn, () => {
      const n = Number(btn.dataset.n);
      if (kind === 'two') { if (s.vals.length >= 2) s.vals = []; s.vals.push(n); paint(); fb.textContent = ''; setScale(q, s.vals, false); if (s.vals.length === 2) judge(); return; }
      s.vals = [n]; paint(); fb.textContent = '';
      if (kind === 'fill') judge(); else { m.querySelector('#weigh').disabled = false; m.querySelector('#veil').hidden = false; }
    }));
    if (kind === 'blind') on(m.querySelector('#weigh'), () => { if (!s.vals.length) return; unveil(); judge(); });
    const clr = m.querySelector('#clr'); if (clr) on(clr, () => { s.vals = []; paint(); setScale(q, [], false); fb.textContent = ''; });
    bindDunno(() => { unveil(); s.vals = kind === 'two' ? P.altPair(q) : [q.answer]; paint(); const b = setScale(q, s.vals, true); finish(false, kind === 'two' ? `答案不止一种，比如 ${s.vals[0]} 和 ${s.vals[1]}，两边都是 ${q.total}` : `填 ${q.answer}，两边都是 ${P.sum(b.r)}`, fb); });
  }
  if (kind === 'judge') bindDunno(() => { const v = m.querySelector('#veil'); if (v) v.hidden = true; paint(q.equal ? '=' : '≠'); setScale(q, [], q.equal); finish(false, q.equal ? `两边都是 ${P.sum(q.left)}，一样重` : `左边 ${P.sum(q.left)}，右边 ${P.sum(q.right)}，不一样重`, fb); });
}

/* —— 凑数矿 —— */
const exprText = q => q.reduce((s, it, i) => s + (i ? ` ${it.sign} ` : '') + it.n, '');
function rTarget() {
  const q = G.q, s = G.st; s.expr = []; s.sign = '+'; s.found = []; s.keys = [];
  const say = `用这些数字凑出 ${q.target}`, rule = '每个数字只能用一次，不用全部用完', m = shell(say, rule);
  m.innerHTML = `<div class="col" style="width:400px;gap:8px"><div class="target"><span>${'用这些数字凑出'}</span><b>${q.target}</b></div><div class="sub">${rule}</div>
    <div class="expr" id="expr"></div><div class="found" id="found"></div></div>
   <div class="col" style="flex:1;gap:8px"><div class="ores">${q.cards.map((c, i) => `<button data-i="${i}">${c}</button>`).join('')}</div>
    ${q.minus ? '<div class="signs"><button id="sp" class="on">+</button><button id="sm">−</button></div>' : ''}
    <div class="fb" id="fb"></div><div class="acts" id="acts"></div></div>`;
  const fb = m.querySelector('#fb'), ex = m.querySelector('#expr'), a = m.querySelector('#acts');
  const val = () => s.expr.reduce((v, it) => it.sign === '−' ? v - it.n : v + it.n, 0);   // 先不显示得数，要孩子自己算
  const paintFound = () => { m.querySelector('#found').innerHTML = s.found.length ? `已找到 ${s.found.length} 种，共 ${q.solutions.length} 种<br>${s.found.map(f => `<span>${f}</span>`).join(' ')}` : `这题有 ${q.solutions.length} 种凑法`; };
  const paint = () => {
    ex.textContent = s.expr.length ? exprText(s.expr) : '点数字';
    m.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('used', s.expr.some(it => it.i === Number(b.dataset.i))));
    const sp = m.querySelector('#sp'); if (sp) { sp.classList.toggle('on', s.sign === '+'); m.querySelector('#sm').classList.toggle('on', s.sign === '−'); }
    const c = a.querySelector('#chk'); if (c) c.disabled = s.expr.length < 2;
  };
  const clear = () => { s.expr = []; s.sign = '+'; paint(); };
  const working = () => {
    a.innerHTML = `<button id="undo">擦掉</button><button class="go" id="chk" disabled>算好了</button>${s.found.length ? '<button id="cont">继续</button>' : '<button id="dunno">不会</button>'}`;
    on(a.querySelector('#undo'), () => { s.expr.pop(); fb.textContent = ''; paint(); });
    on(a.querySelector('#chk'), check);
    if (s.found.length) bindCont(a); else bindDunno(() => { const sol = q.solutions.find(x => x.minus.length) || q.solutions[0]; finish(false, `比如 ${sol.plus.join(' + ')}${sol.minus.map(x => ` − ${x}`).join('')} = ${q.target}`, fb); });
    paint();
  };
  const check = () => {
    if (s.expr.length < 2) return;
    const text = exprText(s.expr);
    if (val() !== q.target) { G.wrong++; fb.className = 'fb bad'; fb.textContent = `${text} 是 ${val()}，不是 ${q.target}`; return; }
    const key = P.keyOf(s.expr.filter(x => x.sign === '+').map(x => x.n), s.expr.filter(x => x.sign === '−').map(x => x.n));
    if (s.keys.includes(key)) { fb.className = 'fb'; fb.textContent = '这种找过了，换一种'; clear(); return; }
    s.keys.push(key); s.found.push(text); paintFound(); earn();   // 一题一块矿石，多找是自己想找
    fb.className = 'fb ok'; fb.textContent = s.found.length === q.solutions.length ? '全部找到了' : '凑到了';
    G.done = true; G.tap = performance.now() + 500;
    a.innerHTML = (s.found.length < q.solutions.length ? '<button id="more">再找一种</button>' : '') + '<button class="go" id="cont">继续</button>';
    const more = a.querySelector('#more');
    if (more) more.onclick = () => { if (guarded()) return; cancelAuto(); G.done = false; fb.textContent = ''; s.expr = []; s.sign = '+'; working(); };
    bindCont(a); autoNext();
  };
  m.querySelectorAll('[data-i]').forEach(btn => on(btn, () => {
    const i = Number(btn.dataset.i); if (s.expr.some(it => it.i === i)) return;
    const n = q.cards[i], sign = s.expr.length ? s.sign : '+';
    if (sign === '−' && val() - n < 0) { fb.className = 'fb bad'; fb.textContent = '不够减，换一个数字'; return; }
    s.expr.push({i, n, sign}); s.sign = '+'; fb.textContent = ''; paint();
  }));
  if (q.minus) { on(m.querySelector('#sp'), () => { s.sign = '+'; paint(); }); on(m.querySelector('#sm'), () => { s.sign = '−'; paint(); }); }
  working(); paintFound();
}

/* —— 线索营地 —— */
function rClue() { G.q.kind === 'dog' ? rDog() : rGrid(); }
function rGrid() {
  const q = G.q, s = G.st, n = q.n, live = n === 3;   // 三格用来学规则，填错马上标红；四格填满才判，试数过不了
  s.g = q.givens.slice(); s.sel = q.givens.findIndex(v => !v); s.hist = [];
  const say = q.boxes ? '每行、每列、每个粗线框，1 到 4 各一个' : `每行、每列，1 到 ${n} 各一个`;
  const m = shell(say), size = n === 3 ? 84 : 66;
  m.innerHTML = `<div class="col" style="width:${size * n + n * 3 + 10}px"><div class="grid" id="grid" style="grid-template-columns:repeat(${n},${size}px);grid-auto-rows:${size}px;margin:auto"></div></div>
    <div class="col" style="flex:1;gap:10px"><div class="say">${say}</div><div class="keys" style="grid-template-columns:repeat(${n},1fr)">${Array.from({length: n}, (_, i) => `<button data-n="${i + 1}" style="font-size:30px">${i + 1}</button>`).join('')}</div><div class="fb" id="fb"></div>${acts('<button id="clr">擦掉</button><button id="reset">重来</button>')}</div>`;
  const gEl = m.querySelector('#grid'), fb = m.querySelector('#fb');
  const full = () => s.g.every(Boolean);
  const paint = () => {
    const bad = live || full() ? P.conflicts(q, s.g) : new Set();
    gEl.innerHTML = s.g.map((v, i) => { const y = Math.floor(i / n), x = i % n, line = q.boxes ? `${x === 1 ? 'br' : ''} ${y === 1 ? 'bb' : ''}` : ''; return `<button data-c="${i}" class="${q.givens[i] ? 'given' : 'fill'} ${i === s.sel ? 'sel' : ''} ${bad.has(i) ? 'bad' : ''} ${line}">${v || ''}</button>`; }).join('');
    gEl.querySelectorAll('[data-c]').forEach(b => on(b, () => { const i = Number(b.dataset.c); if (q.givens[i]) return; s.sel = i; paint(); }));
    return bad;
  };
  const say2 = (cls, t) => { fb.className = 'fb' + (cls ? ' ' + cls : ''); fb.textContent = t; };
  m.querySelectorAll('[data-n]').forEach(b => on(b, () => {
    if (s.sel < 0) return; const i = s.sel; s.g[i] = Number(b.dataset.n); s.hist = s.hist.filter(x => x !== i).concat(i); say2('', '');
    const bad = paint();
    if (full()) { if (bad.size) { G.wrong++; say2('bad', '红色的数字重复了，改你填的数字'); } else { s.sel = -1; paint(); finish(true, '全部填对了', fb); } return; }
    if (bad.has(i)) { G.wrong++; say2('bad', `这一行或这一列已经有 ${b.dataset.n} 了`); return; }
    if (bad.size) { say2('bad', '先改红色的数字'); return; }
    s.sel = s.g.findIndex(v => !v); paint();
  }));
  on(m.querySelector('#clr'), () => { const i = s.sel >= 0 && s.g[s.sel] ? s.sel : s.hist[s.hist.length - 1]; if (i >= 0 && !q.givens[i]) { s.g[i] = 0; s.hist = s.hist.filter(x => x !== i); s.sel = i; say2('', ''); paint(); } });
  on(m.querySelector('#reset'), () => { s.g = q.givens.slice(); s.sel = q.givens.findIndex(v => !v); s.hist = []; say2('', ''); paint(); });
  bindDunno(() => { s.g = q.solution.slice(); s.sel = -1; paint(); finish(false, '先找只缺一个数的行或列，再接着往下推', fb); });
  paint();
}
function rDog() {
  const q = G.q, s = G.st; s.off = []; s.miss = 0;
  const say = '小狗藏在哪个木箱', m = shell(say, q.clues.join('，'));
  m.innerHTML = `<div class="col" style="width:380px;gap:8px"><div class="say">${say}</div><div class="clues">${q.clues.map(c => `<div>${c}</div>`).join('')}</div><div class="sub">想好了，点那个木箱</div></div>
   <div class="col" style="flex:1;gap:8px"><div class="dogbox" id="boxes"></div><div class="fb" id="fb"></div>${acts('')}</div>`;
  const fb = m.querySelector('#fb'), bx = m.querySelector('#boxes');
  const paint = hit => { bx.innerHTML = q.boxes.map(n => `<button data-b="${n}" class="${s.off.includes(n) ? 'off' : ''} ${hit === n ? 'hit' : ''}">${n}</button>`).join('');
    bx.querySelectorAll('[data-b]').forEach(b => on(b, () => {
      const n = Number(b.dataset.b); if (s.off.includes(n)) return;
      if (n === q.answer) { paint(n); finish(true, `小狗在 ${n} 号木箱`, fb); return; }
      G.wrong++; s.miss++; s.off.push(n); paint();
      fb.className = 'fb bad'; fb.textContent = `${n} 不符合「${q.clues.find(c => !P.clueOk(c, n))}」`;
      if (s.miss >= 3) { s.off = q.boxes.filter(x => x !== q.answer); paint(q.answer); finish(false, `只有 ${q.answer} 符合全部线索`, fb); }   // 不让挨个开箱碰出来
    })); };
  bindDunno(() => { s.off = q.boxes.filter(x => x !== q.answer); paint(q.answer); finish(false, `只有 ${q.answer} 符合全部线索`, fb); });
  paint();
}

/* —— 方块工坊 —— */
function rBlock() { G.q.kind === 'mirror' ? rMirror() : rRotate(); }
function rMirror() {
  const q = G.q, s = G.st; s.on = s.on || [];
  const say = q.axis === 'v' ? '红线是镜子，补出右边的影子' : '红线是镜子，补出下面的影子';
  const m = shell(say), size = q.axis === 'v' ? 62 : 44;
  m.innerHTML = `<div class="col" style="width:440px"><div class="grow"><div class="cells" id="cells" style="grid-template-columns:repeat(${q.cols},${size}px);grid-auto-rows:${size}px"></div></div></div>
   <div class="col" style="flex:1;gap:10px"><div class="say">${say}</div><div class="fb" id="fb"></div>${acts('<button class="go" id="mirrorOk">做好了</button>')}</div>`;
  const c = m.querySelector('#cells'), fb = m.querySelector('#fb'), half = i => { const y = Math.floor(i / q.cols), x = i % q.cols; return q.axis === 'v' ? x >= q.cols / 2 : y >= q.rows / 2; };
  const axisStyle = q.axis === 'v' ? `left:calc(50% - 2px);top:0;bottom:0;width:4px` : `top:calc(50% - 2px);left:0;right:0;height:4px`;
  const paint = mode => {
    c.innerHTML = Array.from({length: q.rows * q.cols}, (_, i) => {
      const cls = q.given.includes(i) ? 'given' : mode === 'ans' && q.want.includes(i) ? 'ans' : s.on.includes(i) ? (mode === 'check' && !q.want.includes(i) ? 'miss' : 'on') : '';
      return `<button data-c="${i}" class="${cls}"></button>`; }).join('') + `<i class="axis" style="${axisStyle}"></i>`;
    c.querySelectorAll('[data-c]').forEach(b => on(b, () => { const i = Number(b.dataset.c); if (!half(i)) return; s.on = s.on.includes(i) ? s.on.filter(x => x !== i) : s.on.concat(i); fb.textContent = ''; paint(); }));
  };
  // 用语已核：下面的「方块」指工坊里拼的实物方块，不是进度「格子」
  on(m.querySelector('#mirrorOk'), () => {
    const miss = q.want.filter(i => !s.on.includes(i)).length, extra = s.on.filter(i => !q.want.includes(i)).length;
    if (!miss && !extra) { paint(); finish(true, '两边对上了', fb); return; }
    G.wrong++; paint('check'); fb.className = 'fb bad'; fb.textContent = extra ? '红色的方块对不上，要和另一边离红线一样远' : `还差 ${miss} 块`;   // 用语已核：实物方块
  });
  bindDunno(() => { s.on = q.want.slice(); paint('ans'); finish(false, '离红线多远，另一边也离多远', fb); });
  paint();
}
function shapeHtml(cells, sz) {
  const h = Math.max(...cells.map(c => c[0])) + 1, w = Math.max(...cells.map(c => c[1])) + 1, set = new Set(cells.map(c => c.join()));
  let out = ''; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out += `<i class="${set.has(y + ',' + x) ? '' : 'o'}"></i>`;
  return `<div class="shape" style="grid-template-columns:repeat(${w},${sz}px);grid-auto-rows:${sz}px">${out}</div>`;
}
function spinShown(q, m) {
  const ok = q.options.find(o => o.ok).cells; let c = q.shown, k = 0;
  while (k < 4 && !P.same(c, ok)) { c = P.rot(c); k++; }
  const el = m.querySelector('.shownbox .shape'); el.style.transition = 'transform 1.2s ease'; requestAnimationFrame(() => { el.style.transform = `rotate(${k * 90}deg)`; });
}
function rRotate() {
  const q = G.q, say = '哪一个是它转过来的样子', m = shell(say, '不能翻面，只能转');
  m.innerHTML = `<div class="col" style="width:280px;gap:8px"><div class="say">${say}</div><div class="sub">只能转，不能翻面</div><div class="shownbox">${shapeHtml(q.shown, 26)}</div></div>
   <div class="col" style="flex:1;gap:8px"><div class="opts">${q.options.map((o, i) => `<button data-o="${i}">${shapeHtml(o.cells, 22)}</button>`).join('')}</div><div class="fb" id="fb"></div>${acts('')}</div>`;
  const fb = m.querySelector('#fb');
  m.querySelectorAll('[data-o]').forEach(b => on(b, () => {
    const o = q.options[Number(b.dataset.o)];
    if (o.ok) { b.classList.add('hit'); spinShown(q, m); finish(true, '对，就是转过来的', fb); }
    else { G.wrong++; b.classList.add('miss'); b.disabled = true; fb.className = 'fb bad'; fb.textContent = '这个要翻面才对得上'; if (G.wrong >= 2) reveal(); }   // 不让排除到最后一个拿矿石
  }));
  function reveal() { m.querySelectorAll('[data-o]').forEach((b, i) => { if (q.options[i].ok) b.classList.add('hit'); else b.classList.add('miss'); }); spinShown(q, m); finish(false, '绿框是转过来的，另外两个要翻面', fb); }
  bindDunno(reveal);
}
return {enter, fit, G};
  }
  return {create};
});
