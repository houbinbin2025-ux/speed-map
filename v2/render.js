// 空空数学岛 · 题面和图解（纯函数，只出 HTML 字符串，无 DOM、无状态）：各种题长什么样、答错时的图解、「学一学」示范卡、技能组统计
// 浏览器里挂到 window.RENDER（依赖 window.SM、window.SKILLS、window.ENGINE），node 里 require 后直接测
// 颜色规则：四档熟练度色只表示熟练度；题目和图解里的点、旗子用 --counter（蓝）和浅灰
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./skills.js'), require('./engine.js'));
  else root.RENDER = factory(root.SM, root.SKILLS, root.ENGINE);
})(typeof self !== 'undefined' ? self : this, function (C, K, E) {
  'use strict';

  // ---------- 技能组（首页 6 块地） ----------
  const GROUPS = [
    {id: 'look', name: '看数', rule: '看一眼，写出有几个'},
    {id: 'bond', name: '分合', rule: '秒答才算学会'},
    {id: 'place', name: '数位', rule: '一根是 10，一块是 1'},
    {id: 'cmp', name: '比大小', rule: '看清楚，再点大的'},
    {id: 'line', name: '数线', rule: '把旗子插到这个数的位置'},
    {id: 'speed', name: '秒答地图', rule: '秒答才算学会'},
    {id: 'garden', name: '规律花园', rule: '找到规律，接下去'},
    {id: 'market', name: '钟楼集市', rule: '看钟、买东西'},
    {id: 'dock', name: '故事码头', rule: '看图想一想，写答案'},
  ];
  const GNAME = Object.fromEntries(GROUPS.map(g => [g.id, g.name])); GNAME.speedH = '秒答';
  const itemsOf = g => K.SKILLS.filter(s => s.group === g).flatMap(s => s.items);
  // 每块地的格子统计：counts[档位]、亮了几格、共几格
  function groupStat(S, g) {
    const counts = [0, 0, 0, 0];
    itemsOf(g).forEach(it => counts[Math.min(3, Math.max(0, E.lv(S, it.id) || 0))]++);
    return {counts, lit: counts[1] + counts[2] + counts[3], total: counts.reduce((a, b) => a + b, 0)};
  }
  const skillOf = id => K.BY[K.ITEM[id].skill];
  // 周长、面积挂在「数位」组里只为排在地图上；显示的组名写「图形」（捣蛋鬼 1-17），不改分组、不动进度
  const gName = s => s.group === 'place' && (s.concept === 'perim' || s.concept === 'area') ? '图形' : GNAME[s.group];
  const tagOf = id => { const s = skillOf(id); if (s.group === 'speedH' && /^g34:/.test(s.id)) return '计算 · ' + s.name; return s.hard ? `${gName(s)} · ${s.name}` : s.speed ? s.name : gName(s) + ' · ' + s.name; };

  // ---------- 小零件 ----------
  const dot = cls => `<i class="dot${cls ? ' ' + cls : ''}"></i>`;
  const N = n => `<span class="num">${n}</span>`;
  const box = '<span class="box"></span>';
  // 分数（2b-1）：题目文字里的 a/b、□/b、a/□ 画成上下结构；只用于分数题的文字，不碰界面上的「3 / 10」计数。样式写在行内，不依赖页面 CSS
  const FR_RE = /(\d+|□)\/(\d+|□)/g, hasFr = t => typeof t === 'string' && /(\d|□)\/(\d|□)/.test(t);
  const frPart = (x, slot) => x === '□' ? slot : x;
  const frBox = '<span class="box" style="width:.9em;height:.9em;margin:.04em 0"></span>';
  const fr = (t, slot, em) => String(t).replace(FR_RE, (m, a, b) => `<span class="frac" role="img" aria-label="${frRead(m)}" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.05;margin:0 .25em;font-size:max(${em || .86}em,15px)"><span style="padding:0 .12em">${frPart(a, slot || frBox)}</span><span style="align-self:stretch;border-top:.09em solid currentColor;margin-top:.04em;padding:0 .12em;text-align:center">${frPart(b, slot || frBox)}</span></span>`);
  const CNUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const frRead = m => { const [a, b] = m.split('/'); return `${b === '□' ? '几' : CNUM[b] || b}分之${a === '□' ? '几' : CNUM[a] || a}`; };
  const ans = n => `<span class="num ansv">${n}</span>`;
  // 十格框：两行各 5 格，先填满上一行；cells = 每格的样子（'' 空 / 'on' 点 / 'moved' 挪来的 / 'gone' 挪走的虚线）
  const frame = cells => `<div class="tf">${cells.map(c => `<i class="cell">${c ? dot(c) : ''}</i>`).join('')}</div>`;
  const fill = (n, k, kind) => Array.from({length: 10}, (_, i) => (i < n ? 'on' : i < n + (k || 0) ? kind : ''));
  // 骰子点位（3×3 格里的位置）
  const DICE = {1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]};
  // 乱点：位置由数字决定（每次一样，方便答错时原样再显示），点和点不挨着
  function scatPos(n) {
    let s = n * 7919 + 13; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, out = [];
    for (let tries = 0; out.length < n && tries < 400; tries++) {
      const p = {x: 10 + r() * 80, y: 10 + r() * 80};
      if (out.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 26)) out.push(p);
    }
    return out;
  }
  function pattern(q) {
    if (q.layout === 'dice') return `<div class="dice">${Array.from({length: 9}, (_, i) => `<i>${DICE[q.n].includes(i) ? dot() : ''}</i>`).join('')}</div>`;
    if (q.layout === 'scat') return `<div class="scat">${scatPos(q.n).map(p => `<b style="left:${p.x.toFixed(1)}%;top:${p.y.toFixed(1)}%">${dot()}</b>`).join('')}</div>`;
    if (q.layout === 'tf') return frame(fill(q.n));
    return `<div class="tfs">${frame(fill(10))}${frame(fill(q.n - 10))}</div>`;
  }
  // 分合图：上面一个圆是整体，下面两个圆是部分
  const circ = (v, big) => `<span class="circ${big ? ' big' : ''}${v === null ? ' blank' : ''}">${v === null ? '' : v}</span>`;
  const bondFig = (whole, a, b) => `<div class="bondfig">${circ(whole, true)}<svg class="legs" viewBox="0 0 120 26" aria-hidden="true"><path d="M60 0 L22 26 M60 0 L98 26"></path></svg><div class="parts">${circ(a)}${circ(b)}</div></div>`;
  // 十条（整根，不画格线，长度 = 10 块 + 9 个间隙）+ 散方块（5 个一行）
  const rods = (tens, ones) => `<div class="rods"><div class="rodset">${'<i class="rod"></i>'.repeat(tens)}</div><div class="ones">${'<i class="one"></i>'.repeat(ones)}</div></div>`;
  const opSign = op => (op === '+' ? '+' : '−');
  const nearWord = d => (d === 1 ? '多 1' : d === -1 ? '少 1' : d === 10 ? '多 10' : '少 10');

  // ---------- 第二批 2a 的图（说明书-到四年级第二批）：线段图、条形图、长方形。a = 答案（答错图解里标出来） ----------
  const FC = {red: '#e5534b', yellow: '#f2c14e', blue: '#6ea8fe', white: '#e8e6df', gray: '#8a8d96'}, OK = '#7bd88f', TXT = '#ecebe4';
  // o.fit = 最多多宽（图里的单位）：翻成英文后太长，页面会把字横向压紧（index.html fitSvgText），不裁不叠
  const svgT = (x, y, t, o) => `<text${o && o.fit ? ` data-fit="${Math.floor(o.fit)}"` : ''} x="${x}" y="${y}" font-size="${(o && o.size) || 20}" font-weight="900" text-anchor="${(o && o.anchor) || 'middle'}" fill="${(o && o.fill) || TXT}">${t}</text>`;
  const brace = (x0, x1, y, up) => { const m = (x0 + x1) / 2, d = up ? -1 : 1; return `M${x0} ${y} Q${x0} ${y + 14 * d} ${x0 + 12} ${y + 14 * d} L${m - 10} ${y + 14 * d} Q${m} ${y + 14 * d} ${m} ${y + 28 * d} Q${m} ${y + 14 * d} ${m + 10} ${y + 14 * d} L${x1 - 12} ${y + 14 * d} Q${x1} ${y + 14 * d} ${x1} ${y}`; };
  // 线段图：data = {rows: [{name?, segs: [{v, label, name?, col?, ask?}], sum?}], top?, side?}
  function barSvg(d, a, o) {
    o = o || {};
    const rowSum = r => r.segs.reduce((m, g) => m + g.v, 0), maxSum = Math.max(...d.rows.map(rowSum)), named = d.rows.some(r => r.name);
    const L = named ? 96 : 16, R = d.side ? 96 : d.rows.some(r => r.sum) ? 70 : 16, W = 460, u = (W - L - R) / (o.of || maxSum), top = d.top ? 70 : 8, rowH = d.rows.some(r => r.segs.some(g => g.name)) ? 78 : 58;
    let out = '', y = top;
    d.rows.forEach((r, ri) => {
      let x = L;
      if (r.name) out += svgT(L - 10, y + 27, r.name, {anchor: 'end', size: 19, fit: L - 16});
      r.segs.forEach((g, gi) => {
        const w = g.v * u, show = g.ask && a !== undefined, col = g.col ? FC[g.col] : (gi % 2 ? FC.yellow : FC.blue);
        out += `<rect x="${x}" y="${y}" width="${w}" height="38" fill="${col}" stroke="${show ? OK : '#000'}" stroke-width="${show ? 5 : 3}"/>`;
        if (o.cells) for (let k = 1; k < g.v; k++) out += `<line x1="${x + k * u}" x2="${x + k * u}" y1="${y}" y2="${y + 38}" stroke="#000" stroke-width="2"/>`;
        const lab = show ? String(a) : g.label; if (lab && !o.cells) out += svgT(x + w / 2, y + 27, lab, {fill: show ? '#0b3d17' : '#000', size: 22});
        if (g.name) out += svgT(x + w / 2, y + 64, g.name, {size: 18, fit: Math.max(w - 4, 60)});
        x += w;
      });
      if (r.sum) out += svgT(x + 12, y + 27, r.sum.ask && a !== undefined ? a : r.sum.label, {anchor: 'start', fill: r.sum.ask && a !== undefined ? OK : TXT, size: 22});
      y += rowH;
    });
    if (d.top) { const x1 = L + rowSum(d.rows[0]) * u, show = d.top.ask && a !== undefined, c = show ? OK : TXT; out += `<path d="${brace(L, x1, top - 6, true)}" fill="none" stroke="${c}" stroke-width="3"/>` + svgT((L + x1) / 2, 28, show ? a : d.top.label, {fill: c, size: 22}); }   // 数字在大括号尖的上面，不贴图的上沿（svgclip.py）
    if (d.side) { const xr = L + maxSum * u + 8, y0 = top, y1 = top + (d.rows.length - 1) * rowH + 38, show = d.side.ask && a !== undefined, c = show ? OK : TXT, m = (y0 + y1) / 2;
      out += `<path d="M${xr} ${y0} Q${xr + 14} ${y0} ${xr + 14} ${y0 + 12} L${xr + 14} ${m - 10} Q${xr + 14} ${m} ${xr + 28} ${m} Q${xr + 14} ${m} ${xr + 14} ${m + 10} L${xr + 14} ${y1 - 12} Q${xr + 14} ${y1} ${xr} ${y1}" fill="none" stroke="${c}" stroke-width="3"/>` + svgT(xr + 34, m + 8, show ? a : d.side.label, {anchor: 'start', fill: c, size: 22}); }
    return `<svg class="fig2" viewBox="0 0 ${W} ${y - rowH + (rowH > 60 ? 78 : 50)}" role="img" aria-label="线段图">${out}</svg>`;
  }
  // 条形图：data = {bars: [[名字, 数]], max, step, ask}；hi = 高亮哪几根（答错图解）
  function chartSvg(d, a, o) {
    o = o || {};
    // 顶上为答案留的空只有答错图解要（a 有值）；题面时收回来，矮屏（874×297）上条形图能大一点（中控 11-08）
    const n = d.max / d.step, top = a === undefined ? 24 : 36, bot = top + 184, H = bot + 50, L = 62, bw = 62, gap = 34, W = L + d.bars.length * (bw + gap) + 10, y = v => bot - (bot - top) * v / d.max;
    const hi = a === undefined ? [] : d.ask.kind === 'read' ? [d.ask.i] : [d.ask.i, d.ask.j];
    let out = '';
    // 刻度多于 6 格时隔一格标数字、字 28（捣蛋鬼 1-3：11 个数字挤在手机上 90 像素高里，叠成一列）；标数字的线深、不标的浅，读条顶靠数格子
    const ev = n > 6 ? 2 : 1, fs = ev > 1 ? 28 : 24;
    for (let k = 0; k <= n; k++) { const v = k * d.step, lab = k % ev === 0; out += `<line x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" stroke="${!k ? TXT : lab ? '#6a707c' : '#3a3e47'}" stroke-width="${!k ? 3 : lab ? 2 : 1.5}"/>` + (lab ? svgT(L - 10, y(v) + fs * .35, v, {anchor: 'end', size: fs}) : ''); }
    d.bars.forEach(([name, v], i) => {
      const x = L + gap / 2 + i * (bw + gap), on = hi.includes(i);
      if (o.blocks) { for (let k = 0; k < v / d.step; k++) out += `<rect x="${x + 4}" y="${y((k + 1) * d.step) + 2}" width="${bw - 8}" height="${y(0) - y(d.step) - 4}" fill="${FC.blue}" stroke="#000" stroke-width="2"/>`; }
      else out += `<rect x="${x}" y="${y(v)}" width="${bw}" height="${bot - y(v)}" fill="${on ? FC.yellow : FC.blue}" stroke="#000" stroke-width="3"/>`;
      out += svgT(x + bw / 2, bot + 34, name, {size: 24, fit: bw + gap - 6});
      if (on) out += `<line x1="${L}" x2="${x}" y1="${y(v)}" y2="${y(v)}" stroke="${OK}" stroke-width="3" stroke-dasharray="6 5"/>` + svgT(x + bw / 2, y(v) - 10, v, {fill: OK, size: 24});   // 答案写在条顶正上方（顶上留了 36，最高的条也放得下）
    });
    return `<svg class="fig2" viewBox="0 0 ${W} ${H}" role="img" aria-label="条形图">${out}</svg>`;
  }
  // 长方形：data = {w, h, labels: 'all'|'two'|'one'|'none', grid?}；a 有值时标出答案
  function rectSvg(d, a, o) {
    o = o || {};
    // 边距按标注留够（11-07 走查：左边的「12 厘米」画到图外），字号 26，手机上缩小后还看得清
    const sc = Math.min(40, 300 / d.w, 170 / d.h), w = d.w * sc, h = d.h * sc, L = d.labels === 'all' ? 112 : 16, Rm = d.labels === 'none' || d.labels === 'one' ? 16 : 112, y0 = d.labels === 'none' ? 8 : 40; let x0 = L;
    const need = a !== undefined ? 330 : 0, W0 = L + w + Rm, W = Math.max(W0, need), H = y0 + h + (d.labels === 'all' ? 48 : 10) + (a !== undefined ? 40 : 0);   // 答案「面积 18 平方厘米」要 330 宽
    x0 += (W - W0) / 2;
    let out = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#3b5f2a" stroke="#000" stroke-width="4"/>`;
    if (d.grid || o.grid) for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) { out += `<rect x="${x0 + c * sc}" y="${y0 + r * sc}" width="${sc}" height="${sc}" fill="none" stroke="#000" stroke-width="2"/>`; if (o.count) out += svgT(x0 + c * sc + sc / 2, y0 + r * sc + sc / 2 + 6, r * d.w + c + 1, {size: Math.min(17, sc * .5)}); }
    const lab = (t, x, y, anchor) => svgT(x, y, `${t} 厘米`, {anchor: anchor || 'middle', size: 26});
    if (d.labels !== 'none') { out += lab(d.w, x0 + w / 2, y0 - 10); if (d.labels !== 'one') out += lab(d.h, x0 + w + 10, y0 + h / 2 + 9, 'start'); }
    if (d.labels === 'all') { out += lab(d.w, x0 + w / 2, y0 + h + 32); out += lab(d.h, x0 - 10, y0 + h / 2 + 9, 'end'); }
    if (a !== undefined) out += svgT(W / 2, H - 10, d.ask === 'perim' ? `周长 ${a} 厘米` : `面积 ${a} 平方厘米`, {fill: OK, size: 28, fit: W - 12});
    return `<svg class="fig2" viewBox="0 0 ${W} ${H}" role="img" aria-label="长方形">${out}</svg>`;
  }
  // ---------- 第三批趣味题的图（说明书-第三批 §四）----------
  const QM = '#f2c14e';   // 问号格的颜色
  const cell = (x, y, w, h, v, a) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${v === null ? '#3a3420' : '#2c2f36'}" stroke="${v === null ? QM : '#000'}" stroke-width="4"/>` + svgT(x + w / 2, y + h / 2 + 11, v === null ? (a === undefined ? '?' : a) : v, {size: 32, fill: v === null ? (a === undefined ? QM : OK) : TXT});
  // 数塔：data.g = [[顶], [中, 中], [底, 底, 底]]，空格是 null
  function pyrSvg(d, a) {
    const w = 84, h = 58, gap = 8, n = d.g.length, W = n * w + (n - 1) * gap + 16;
    const out = d.g.map((row, i) => { const x0 = (W - (row.length * w + (row.length - 1) * gap)) / 2; return row.map((v, j) => cell(x0 + j * (w + gap), 8 + i * (h + gap), w, h, v, a)).join(''); }).join('');
    return `<svg class="fig2" viewBox="0 0 ${W} ${16 + n * h + (n - 1) * gap}" role="img" aria-label="数塔">${out}</svg>`;
  }
  // 幻方：data.g = 9 个数（null 是空格），data.sum
  function magicSvg(d, a) {
    const w = 74, gap = 6, W = 3 * w + 2 * gap + 16;
    return `<svg class="fig2" viewBox="0 0 ${W} ${W}" role="img" aria-label="幻方">${d.g.map((v, i) => cell(8 + (i % 3) * (w + gap), 8 + Math.floor(i / 3) * (w + gap), w, w, v, a)).join('')}</svg>`;
  }
  // 植树、锯木头的示意图：kind = both / one / none / saw；题目里画 5 段（第 4 段是「……」），讲解卡用 o.n 画准确的段数，o.mark = 'seg' 标段、'tree' 标树
  function treesSvg(d, a, o) {
    o = o || {};
    const S = o.n || 5, dots = !o.n, W = 460, H = o.mark || d.lab !== undefined ? 132 : 110, x0 = 34, x1 = W - 34, X = k => x0 + (x1 - x0) * k / S, gy = 84;
    const tree = x => `<rect x="${x - 4}" y="${gy - 22}" width="8" height="22" fill="#8a5a2b"/><circle cx="${x}" cy="${gy - 34}" r="17" fill="#3f9a52" stroke="#000" stroke-width="3"/>`;
    const end = x => `<line x1="${x}" y1="${gy - 18}" x2="${x}" y2="${gy + 10}" stroke="${FC.gray}" stroke-width="5"/>`;
    let out = '';
    if (d.kind === 'saw') {
      for (let k = 0; k < S; k++) if (!(dots && k === 3)) out += `<rect x="${X(k) + 3}" y="${gy - 40}" width="${X(k + 1) - X(k) - 6}" height="38" rx="6" fill="#b07a45" stroke="#000" stroke-width="3"/>`;
      for (let k = 1; k < S; k++) out += `<line x1="${X(k)}" y1="${gy - 52}" x2="${X(k)}" y2="${gy + 10}" stroke="${FC.red}" stroke-width="4" stroke-dasharray="7 5"/>`;
    } else {
      for (let k = 0; k < S; k++) if (!(dots && k === 3)) out += `<line x1="${X(k)}" y1="${gy}" x2="${X(k + 1)}" y2="${gy}" stroke="${TXT}" stroke-width="4"/>`;
      for (let k = 0; k <= S; k++) { const edge = k === 0 || k === S, has = d.kind === 'both' || (d.kind === 'one' && k < S) || (d.kind === 'none' && !edge); out += has ? tree(X(k)) : edge ? end(X(k)) : ''; }
    }
    if (dots) out += svgT((X(3) + X(4)) / 2, gy - 10, '……', {size: 28});
    if (d.lab !== undefined && !o.mark) out += svgT(W / 2, gy + 38, `${d.lab}（图只画了一部分）`, {size: 22, fill: FC.gray});
    if (o.mark === 'seg') for (let k = 0; k < S; k++) out += svgT((X(k) + X(k + 1)) / 2, gy + 34, k + 1, {size: 24, fill: QM});
    if (o.mark === 'tree') { let c = 0; for (let k = 0; k <= S; k++) { const edge = k === 0 || k === S; if (d.kind === 'both' || (d.kind === 'one' && k < S) || (d.kind === 'none' && !edge)) out += svgT(X(k), gy + 34, ++c, {size: 24, fill: OK}); } }
    return `<svg class="fig2" viewBox="0 0 ${W} ${H}" role="img" aria-label="${d.kind === 'saw' ? '锯木头' : '植树'}">${out}</svg>`;
  }
  const FIGS = {bar: barSvg, chart: chartSvg, rect: rectSvg, pyr: pyrSvg, magic: magicSvg, trees: treesSvg};
  // 讲解卡用的小图：一排苹果（可分组装盘）、分成 10 份的条、两行数（高亮共有的）
  function dotsSvg(n, per) {
    const g = per ? Math.ceil(n / per) : 1, W = 470, r = 13;
    let out = '';
    if (!per) { for (let i = 0; i < n; i++) out += `<circle cx="${22 + i * 31}" cy="40" r="${r}" fill="${FC.red}" stroke="#000" stroke-width="3"/>`; return `<svg class="fig2" viewBox="0 0 ${W} 80">${out}</svg>`; }
    for (let k = 0; k < g; k++) {
      const m = Math.min(per, n - k * per), full = m === per, x0 = 8 + k * 116;
      if (full) out += `<rect x="${x0}" y="14" width="108" height="56" fill="none" stroke="${TXT}" stroke-width="3"/>`;
      for (let i = 0; i < m; i++) out += `<circle cx="${x0 + 18 + (i % 4) * 24}" cy="${42}" r="${r - 3}" fill="${full ? FC.red : FC.yellow}" stroke="#000" stroke-width="3"/>`;
    }
    return `<svg class="fig2" viewBox="0 0 ${W} 84">${out}</svg>`;
  }
  // 分数条：data = {n, on: [涂色的格子]}，或 {rows: [{n, on, label}]} 画几条对齐的分数条（讲解卡比大小、等值用）
  function fracSvg(d) {
    const rows = d.rows || [d], lab = rows.some(r => r.label), L = lab ? 92 : 16, W = rows.length > 1 ? 560 : 440, rh = 56, gap = 18;   // 两条的图画宽一点，同宽时更矮（讲解卡 667 英文两行说明放得下）
    let out = '';
    rows.forEach((r, j) => { const y = 12 + j * (rh + gap), w = (W - L - 16) / r.n, on = r.on || [...Array(r.k || 0).keys()];
      for (let i = 0; i < r.n; i++) out += `<rect x="${L + i * w}" y="${y}" width="${w}" height="${rh}" fill="${on.includes(i) ? FC.blue : '#3a3e47'}" stroke="#000" stroke-width="3"/>`;
      if (r.label) { const m = /^(\d+)\/(\d+)$/.exec(r.label), cx = L / 2 - 2, cy = y + rh / 2;
        out += m ? svgT(cx, cy - 6, m[1], {size: 24}) + `<line x1="${cx - 16}" x2="${cx + 16}" y1="${cy}" y2="${cy}" stroke="${TXT}" stroke-width="3"/>` + svgT(cx, cy + 24, m[2], {size: 24}) : svgT(L - 12, cy + 9, r.label, {anchor: 'end', size: 26, fit: L - 16}); } });
    return `<svg class="fig2" viewBox="0 0 ${W} ${24 + rows.length * rh + (rows.length - 1) * gap}" role="img" aria-label="分数条">${out}</svg>`;
  }
  function tenthSvg(full, parts, label) {
    let out = '', y = 20;
    for (let b = 0; b <= full; b++) {
      const on = b < full ? 10 : parts; if (b === full && !parts) break;
      for (let i = 0; i < 10; i++) out += `<rect x="${20 + i * 40}" y="${y}" width="40" height="40" fill="${i < on ? FC.blue : '#3a3e47'}" stroke="#000" stroke-width="3"/>`;
      y += 52;
    }
    if (label) out += svgT(220, y + 22, label, {fill: OK, size: 26});
    return `<svg class="fig2" viewBox="0 0 440 ${y + (label ? 36 : 0)}">${out}</svg>`;
  }
  const numRows = (rows, hi) => `<div class="nrows">${rows.map(([t, l]) => `<div><b>${t}</b>${l.map(n => `<span class="num${hi && hi.includes(n) ? ' on' : ''}">${n}</span>`).join('')}</div>`).join('')}</div>`;
  // 讲解卡（新概念第一次出现时，代替 3 秒示范卡）：每页一张图 + 一句话；不靠声音也看得懂（静音时朗读不响）
  const B2 = (a, b, o) => ({rows: [{segs: [{v: 7, name: '小猫', label: a}, {v: 5, name: '小狗', label: b, ask: o && o.part}]}], top: o && o.top});
  const CH = [['小猫', 6], ['小狗', 8], ['小羊', 3]], chD = b => ({bars: b, max: 10, step: 1, ask: {kind: 'read', i: 1}});
  const TM = {rows: [{name: '小猫', segs: [{v: 3, label: '3'}]}, {name: '小狗', segs: [3, 3, 3, 3].map(v => ({v, label: '3'})), sum: {label: '?', ask: true}}]};
  const CARDS = {
    bar: {title: '线段图', pages: [
      [barSvg(B2('', ''), undefined, {cells: true, of: 12}), '一个苹果一格：小猫 7 个，小狗 5 个'],
      [barSvg(B2('7', '5')), '不画格子，在线上写数'],
      [barSvg(B2('7', '5', {top: {label: '?', ask: true}})), '合起来有几个？看整条线'],
      [barSvg(B2('7', '5', {top: {label: '?', ask: true}}), 12), '7 + 5 = 12，合起来 12 个'],
      [barSvg(B2('7', '?', {top: {label: '12'}, part: true}), 5), '反过来：一共 12 个，小猫 7 个，小狗 12 − 7 = 5 个']]},
    chart: {title: '条形图', pages: [
      [chartSvg(chD(CH), undefined, {blocks: true}), '小猫钓了 6 条鱼，一条鱼画一块，摞起来'],
      [chartSvg(chD(CH)), '摞起来就是一根条，条越高越多'],
      [chartSvg(chD(CH), 8), '小狗的条顶对着左边的 8，小狗钓了 8 条']]},
    perim: {title: '周长', pages: [
      [rectSvg({w: 6, h: 4, labels: 'two'}), '长方形：长 6 厘米，宽 4 厘米'],
      [rectSvg({w: 6, h: 4, labels: 'all'}), '对边一样长：上下都是 6，左右都是 4'],
      [rectSvg({w: 6, h: 4, labels: 'all', ask: 'perim'}, 20), '绕一圈：6 + 4 + 6 + 4 = 20，这一圈的长度叫周长']]},
    area: {title: '面积', pages: [
      [rectSvg({w: 4, h: 3, labels: 'none'}), '这块地有多大？'],
      [rectSvg({w: 4, h: 3, labels: 'none', grid: true}), '铺满 1 平方厘米的小方格'],
      [rectSvg({w: 4, h: 3, labels: 'none', grid: true}, undefined, {count: true}), '数一数：12 格，面积是 12 平方厘米'],
      [rectSvg({w: 4, h: 3, labels: 'two', grid: true, ask: 'area'}, 12), '一行 4 格，有 3 行：4 × 3 = 12。长 × 宽 = 面积']]},
    times: {title: '倍', pages: [
      [barSvg({rows: [TM.rows[0]]}, undefined, {of: 12}), '小猫有 3 条鱼'],
      [barSvg(TM), '小狗的鱼是 4 个 3，小狗的是小猫的 4 倍'],
      [barSvg(TM, 12), '4 倍就是 4 个 3：3 × 4 = 12']]},
    rem: {title: '余数', pages: [
      [dotsSvg(14), '14 个苹果，每盘放 4 个'],
      [dotsSvg(14, 4), '放满 3 盘，还剩 2 个'],
      [`${dotsSvg(14, 4)}<div class="eq num sm">14 ÷ 4 = 3 余 ${ans(2)}</div>`, '剩下的 2 叫余数，余数比 4 小']]},
    avg: {title: '平均数', pages: [
      [chartSvg({bars: [['小猫', 4], ['小狗', 8], ['小羊', 6]], max: 10, step: 1, ask: {kind: 'read', i: 0}}, undefined, {blocks: true}), '三个小伙伴钓的鱼：4、8、6'],
      [chartSvg({bars: [['小猫', 6], ['小狗', 6], ['小羊', 6]], max: 10, step: 1, ask: {kind: 'read', i: 0}}, undefined, {blocks: true}), '多的分给少的，变得一样多'],
      [`<div class="eq num sm">(4 + 8 + 6) ÷ 3 = ${ans(6)}</div>`, '每个都是 6 条，6 叫平均数']]},
    factor: {title: '公倍数和公因数', pages: [
      [numRows([['4', [4, 8, 12, 16, 20, 24]], ['6', [6, 12, 18, 24]]]), '4 的倍数和 6 的倍数'],
      [numRows([['4', [4, 8, 12, 16, 20, 24]], ['6', [6, 12, 18, 24]]], [12, 24]), '两行都有的 12、24 叫公倍数，最小的是 12'],
      [numRows([['12', [1, 2, 3, 4, 6, 12]], ['18', [1, 2, 3, 6, 9, 18]]]), '12 和 18 能被哪些数整除'],
      [numRows([['12', [1, 2, 3, 4, 6, 12]], ['18', [1, 2, 3, 6, 9, 18]]], [1, 2, 3, 6]), '两行都有的叫公因数，最大的是 6']]},
    frac: {title: '分数', pages: [
      [fracSvg({n: 4, k: 0}), '一条平均分成 4 份，每份一样大'],
      [fracSvg({n: 4, k: 1}), '涂了 1 份，是 4 份里的 1 份：1/4'],
      [fracSvg({n: 8, k: 3}), '平均分成 8 份，涂了 3 份：3/8'],
      [fracSvg({n: 8, k: 3}), '下面是分母，写一共几份；上面是分子，写涂了几份']]},
    fracadd: {title: '分数加减', pages: [
      [fracSvg({rows: [{n: 8, k: 3, label: '3/8'}]}), '涂了 3 份：3/8'],
      [fracSvg({rows: [{n: 8, k: 3, label: '3/8'}, {n: 8, on: [3, 4], label: '2/8'}]}), '再涂 2 份：2/8'],
      [fracSvg({rows: [{n: 8, k: 5, label: '5/8'}]}), '3 份加 2 份是 5 份，一共还是 8 份：5/8'],
      [fracSvg({rows: [{n: 8, k: 5, label: '5/8'}]}), '分母（下面的数）不变，分子（上面的数）相加减']]},
    fraccmp: {title: '分数比大小', pages: [
      [fracSvg({rows: [{n: 8, k: 3, label: '3/8'}, {n: 8, k: 5, label: '5/8'}]}), '分母一样，每份一样大'],
      [fracSvg({rows: [{n: 8, k: 3, label: '3/8'}, {n: 8, k: 5, label: '5/8'}]}), '5 份比 3 份多，大的是：5/8'],
      [fracSvg({rows: [{n: 8, k: 3, label: '3/8'}, {n: 8, k: 5, label: '5/8'}]}), '分母一样，比分子：分子大的大']]},
    fraccmp2: {title: '同分子比大小', pages: [
      [fracSvg({rows: [{n: 3, k: 1, label: '1/3'}, {n: 6, k: 1, label: '1/6'}]}), '分子一样，都涂了 1 份'],
      [fracSvg({rows: [{n: 3, k: 1, label: '1/3'}, {n: 6, k: 1, label: '1/6'}]}), '分成 6 份，每份更小'],
      [fracSvg({rows: [{n: 3, k: 1, label: '1/3'}, {n: 6, k: 1, label: '1/6'}]}), '分母越大，每份越小，大的是：1/3']]},
    equiv: {title: '等值分数', pages: [
      [fracSvg({rows: [{n: 3, k: 2, label: '2/3'}, {n: 6, k: 4, label: '4/6'}]}), '两条一样长，涂的一样多'],
      [fracSvg({rows: [{n: 3, k: 2, label: '2/3'}, {n: 6, k: 4, label: '4/6'}]}), '分母乘 2，分子也乘 2：2/3 = 4/6'],
      [fracSvg({rows: [{n: 6, k: 4, label: '4/6'}, {n: 3, k: 2, label: '2/3'}]}), '反过来，上下都除以 2：4/6 = 2/3']]},
    tree: {title: '植树', pages: [
      [treesSvg({kind: 'both'}, undefined, {n: 3}), '路的两头都种树，树和树之间是一段'],
      [treesSvg({kind: 'both'}, undefined, {n: 3, mark: 'seg'}), '数一数：3 段'],
      [treesSvg({kind: 'both'}, undefined, {n: 3, mark: 'tree'}), '树有 4 棵，比段多 1：3 + 1 = 4']]},
    saw: {title: '锯木头', pages: [
      [treesSvg({kind: 'saw'}, undefined, {n: 1}), '一根木头'],
      [treesSvg({kind: 'saw'}, undefined, {n: 2}), '锯 1 次，变成 2 段'],
      [treesSvg({kind: 'saw'}, undefined, {n: 4, mark: 'seg'}), '锯 3 次，变成 4 段：段比次数多 1']]},
    tree2: {title: '植树的三种种法', pages: [
      [treesSvg({kind: 'both'}, undefined, {n: 3, mark: 'tree'}), '路分成 3 段，两头都种：4 棵，树比段多 1'],
      [treesSvg({kind: 'one'}, undefined, {n: 3, mark: 'tree'}), '树种在段和段之间，一头也种：3 棵，树和段一样多'],
      [treesSvg({kind: 'none'}, undefined, {n: 3, mark: 'tree'}), '树种在段和段之间，两头都不种：2 棵，树比段少 1']]},
    riddle: {title: '倒着算', pages: [
      [`<div class="eq num sm">? + 8 − 5 = 20</div>`, '一个数加上 8，再减去 5，得 20'],
      [`<div class="eq num sm">20 + 5 = 25</div>`, '倒着走：最后减了 5，先加回 5'],
      [`<div class="eq num sm">25 − 8 = ${ans(17)}</div>`, '前面加了 8，再减掉 8：这个数是 17'],
      [`<div class="eq num sm">17 + 8 − 5 = 20</div>`, '代回去检查：17 加 8 再减 5，正好是 20']]},
    dec: {title: '小数', pages: [
      [tenthSvg(0, 3), '一条分成 10 份，涂了 3 份'],
      [tenthSvg(0, 3, '0.3'), '3 份就是 0.3，读作零点三'],
      [tenthSvg(1, 3, '1.3'), '1 整条加 3 份是 1.3']]},
  };
  const card = c => { const k = CARDS[c]; return k && {title: k.title, pages: k.pages.map(([fig, line]) => ({fig, line, read: hasFr(line) ? line.replace(FR_RE, frRead) : undefined}))}; };
  // 讲解卡的一页：标题 + 页码点、图、一句话（喇叭可读）
  const cardPage = (c, p) => { const k = card(c), pg = k.pages[p]; return `<div class="demo dcard"><div class="dhead"><span class="learn">学一学</span><span class="dtitle">${k.title}</span><span class="cdots">${k.pages.map((x, i) => `<i${i <= p ? ' class="on"' : ''}></i>`).join('')}</span></div><div class="cfig">${pg.fig}</div><div class="cline">${nbSay({say: pg.line, show: hasFr(pg.line) ? fr(pg.line, undefined, .72) : undefined, read: pg.read})}</div></div>`; };

  // ---------- 题面 ----------
  // 返回 {input:'write'|'pick'|'line', tag, html（左栏题目）, note（左栏底部小字）, flash（看数：要闪现的部分）, pick:[a,b], line:{max, target, mid}}
  // 挑战题的图：点阵、百格、百十个、算式
  const hardFig = (q, a) => {
    if (q.view === 'grid') return `<div class="hgrid" style="grid-template-columns:repeat(${q.cols},26px)">${dot().repeat(q.rows * q.cols)}</div>`;
    if (q.view === 'h100') return `<div class="h100">${Array.from({length: 100}, (_, i) => `<i${i < q.n ? ' class="on"' : ''}></i>`).join('')}</div>`;
    if (q.view === 'hto') return `<div class="hto"><div class="hsqs">${'<i class="hsq"></i>'.repeat(q.h)}</div>${rods(q.t, q.o)}</div>`;
    if (q.view === 'fracbar') return `<div class="fig2w">${fracSvg(q.data)}</div><div class="eq num sm">${fr(q.text, a === undefined ? undefined : ans(a), a === undefined ? undefined : .72)}</div>`;
    if (FIGS[q.view]) return `<div class="fig2w">${FIGS[q.view](q.data, a)}</div>`;
    if (q.view === 'story') return a === undefined ? nbSay(q) : `<div class="eq num sm">${q.text.replace('□', ans(a))}</div>`;
    if (q.view === 'clock5') return clockSvg(q.h, q.m) + (a === undefined ? nbSay(q) : `<div class="say2">${q.text.replace('□', ans(a))}</div>`);
    const t = q.text || ''; if (hasFr(t)) return `<div class="eq num sm">${fr(t, a === undefined ? undefined : ans(a), a === undefined ? undefined : .72)}</div>` + (a === undefined && q.read ? `<div class="nbsay" style="justify-content:center"><button class="spk" type="button" data-say="${q.read}" aria-label="朗读题目">${SPK}</button></div>` : '');   // 算式分数题：题干只有算式，喇叭单独放在下面，读「七分之二加七分之三」
    return `<div class="eq num${t.length > 22 ? ' xs' : t.length > 11 ? ' sm' : ''}${/[\u4e00-\u9fff]/.test(t) ? ' tw' : ''}">${a === undefined ? t.replace('□', box) : t.includes('□') ? t.replace('□', ans(a)) : `${t} ${ans(a)}`}</div>`;
  };
  // ---------- 三个新地方的图 ----------
  let SPRITE = () => '';   // 页面注入：名字 → 图片地址（node 里没有画布，返回空）
  const setSprite = f => { SPRITE = f; };
  const spr = (name, cls) => `<img class="spr${cls ? ' ' + cls : ''}" src="${SPRITE(name)}" alt="">`;
  const PATN = {1: '红色', 2: '蓝色', 3: '黄色', 4: '青色', 5: '绿色', 6: '灰色'}, PAT = {1: '#d9342b', 2: '#3d7fd9', 3: '#f2c14e', 4: '#5fd9e6', 5: '#6fae3a', 6: '#c9ccd2'}, ORE3 = ['#f2c14e', '#5fd9e6', '#c9ccd2'];
  const blk = c => `<i class="pblk" style="background:${PAT[c]}"></i>`, pore = c => `<i class="pore" style="background:${ORE3[c]}"></i>`, rep = (s, n) => s.repeat(n);
  const bill = n => `<span class="pbill b${n}">${n} 元</span>`;
  function clockSvg(h, m) {
    const pt = (ang, len) => [(20.5 + Math.cos(ang) * len).toFixed(1), (20.5 + Math.sin(ang) * len).toFixed(1)], ha = (h % 12 + m / 60) / 12 * 2 * Math.PI - Math.PI / 2, ma = m / 60 * 2 * Math.PI - Math.PI / 2, [hx, hy] = pt(ha, 8), [mx, my] = pt(ma, 12);
    const ticks = Array.from({length: 12}, (_, i) => { const a = (i + 1) / 12 * 2 * Math.PI - Math.PI / 2, [x, y] = pt(a, 15); return `<text x="${x}" y="${y}" font-size="6" font-weight="800" fill="#000" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`; }).join('');
    return `<svg class="pclock" viewBox="0 0 41 41" aria-label="钟面"><rect width="41" height="41" fill="#000"/><rect x="2" y="2" width="37" height="37" fill="#f4ecd8"/>${ticks}<line x1="20.5" y1="20.5" x2="${hx}" y2="${hy}" stroke="#b3261e" stroke-width="2.6"/><line x1="20.5" y1="20.5" x2="${mx}" y2="${my}" stroke="#1b1d22" stroke-width="1.6"/><rect x="19" y="19" width="3" height="3"/></svg>`;
  }
  function nbFig(q) {
    if (q.view === 'join') return `<div class="pgrp"><div class="pbox">${rep(pore(q.c), q.a)}</div><b class="pplus">+</b><div class="pbox">${rep(pore(q.c), q.b)}</div></div>`;
    if (q.view === 'take') return `<div class="pbox wide">${rep(spr('羊'), q.a - q.b)}${rep(spr('羊', 'away'), q.b)}</div>`;
    if (q.view === 'need') return `<div class="prow">${rep(`<span class="pcell">${spr('小狼')}</span>`, q.a)}</div><div class="prow">${Array.from({length: q.a}, (_, i) => `<span class="pcell"><i class="pbone${i < q.b ? '' : ' miss'}"></i></span>`).join('')}</div>`;
    if (q.view === 'more') return `<div class="pcmp" style="grid-template-columns:auto repeat(${q.a},minmax(0,1fr))">${spr('狐狸')}${rep('<i class="papple"></i>', q.a)}${spr('小猫')}${rep('<i class="papple"></i>', q.b)}</div>`;
    if (q.view === 'pat') return `<div class="prow wrap">${q.seq.map(blk).join('')}<span class="pblk qm">？</span></div>`;
    if (q.view === 'seq') return `<div class="prow wrap">${q.l.map(n => `<span class="pst">${n}</span>`).join('')}<span class="pst qm">？</span></div>`;
    if (q.view === 'clock') return clockSvg(q.h, q.m);
    if (q.view === 'pay') return `<div class="pgrp">${q.bills.map(bill).join('')}</div>`;
    if (q.view === 'change') return `<div class="pgrp">${spr('it:' + q.item)}<b class="pprice">${q.p} 元</b></div><div class="pgrp"><span class="muted">付了</span>${bill(10)}</div>`;
    return '';
  }
  const SPK = '<svg width="22" height="22" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true"><path fill="#f2c14e" d="M0 4h2v3H0zM2 3h1v5H2zM3 2h1v7H3zM4 1h1v9H4zM6 4h1v3H6zM8 2h1v7H8z"/></svg>';
  const nbSay = q => `<div class="nbsay"><span>${q.show || q.say}</span><button class="spk" type="button" data-say="${q.read || q.say}" aria-label="朗读题目">${SPK}</button></div>`;   // 分数题：显示用上下结构（show），喇叭读「八分之三」（read）
  const halfWord = v => (v % 10 === 3 ? `${Math.floor(v / 10)} 点半` : `${v / 10} 点`);
  const nbOpts = q => (q.view === 'pat' ? {pick: q.opts, pickText: q.opts.map(blk), pickAria: q.opts.map(c => PATN[c])} : q.view === 'bad' ? {pick: q.l, pickText: q.l.map(String)} : q.opts ? {pick: q.opts, pickText: q.opts.map(halfWord)} : {});
  const nbAns = (q, a) => (q.view === 'pat' ? blk(a) : q.view === 'bad' ? `${a} 是错的` : q.opts ? halfWord(a) : q.eq.replace(new RegExp(`${a}( 点)?$`), (m, u) => ans(a) + (u || '')));
  const pickWord = (q, n) => (n === q.a ? q.la || n : q.lb || n);
  function question(inst) {
    const it = K.ITEM[inst.id], s = skillOf(inst.id), q = inst.q, tag = tagOf(inst.id);
    if (s.nb) return Object.assign({input: s.input, tag, html: s.input === 'pick' && q.view === 'clock' ? `<div class="nbrow">${nbSay(q)}${nbFig(q)}</div>` : nbSay(q) + nbFig(q), note: ''}, nbOpts(q));
    if (s.hard && s.input === 'pick' && q.view === 'choice') return {input: 'pick', tag, html: nbSay(q), pick: q.opts.map((o, i) => i), pickText: q.opts.map(o => hasFr(o) ? fr(o) : o), pickAria: q.opts.map(o => hasFr(o) ? frRead(o) : o), note: '点一个'};   // 选择题：按选项编号判（第二批 §6）
    if (s.hard && s.input === 'pick') return {input: 'pick', tag, html: '<div class="say2">哪个大？点它</div>', pick: [q.a, q.b], pickText: q.la ? [q.la, q.lb] : null};
    // 故事题的 hardFig 画的也是题干，题干已有就不再画（单位换算曾经重复两行）
    if (s.hard && s.input === 'write' && q.qk) return {input: 'write', tag, html: q.say ? nbSay(q) + (FIGS[q.view] ? hardFig(q) : q.text === '□' || q.view === 'story' ? '' : hardFig(q)) : hardFig(q), note: q.view === 'fracbar' ? '写方框里的数' : /^speed:g1[0-5]:(add3|sub3|mul|mul2|mul3|div|divrem|div2|order|law)$|^dock:g1[1-5]:/.test(inst.id) ? '可以用纸笔算，算好写在右边' : q.text !== '□' && q.text.includes('□') ? '写方框里的数' : '在右边写出答案'};
    if (s.hard && s.input === 'write') return {input: 'write', tag, html: hardFig(q), note: q.view === 'hto' ? '方块是 100，一根是 10，一块是 1' : q.view === 'grid' ? '一排一排数，写在右边' : q.view === 'h100' ? '一行是 10，一共涂了几格？' : '在右边写出答案'};
    if (s.speed) return {input: 'write', tag, html: `<div class="eq num">${q.a} ${opSign(q.op)} ${q.b} =</div>`, note: '在右边写出答案，写完停一下就好'};
    if (s.group === 'look') return {input: 'write', tag, html: `<div class="look">${pattern(q)}</div>`, flash: true, note: '有几个？写在右边'};
    if (s.group === 'bond') {
      if (q.blank === 'part') return {input: 'write', tag, html: bondFig(q.n, q.a, null), note: '空着的圆是几？写在右边'};
      if (q.blank === 'whole') return {input: 'write', tag, html: bondFig(null, q.a, q.b), note: '合起来是几？写在右边'};
      if (q.form) return {input: 'write', tag, html: `<div class="eq num">${missingEq(q, box)}</div>`, note: '写方框里的数'};
      return {input: 'write', tag, html: `<div class="eq num">${q.k} + ${q.a} = 10 + ${box}</div>`, note: '写方框里的数'};
    }
    if (s.group === 'place') {
      if (it.id === 'place:t:read') return {input: 'write', tag, html: rods(q.tens, q.ones), note: '一根是 10，一块是 1。一共是几？'};
      return {input: 'write', tag, html: `<div class="say2">${N(q.n)} 里有几个${q.ask === 'tens' ? '十' : '一'}？</div>`, note: '在右边写出答案'};
    }
    if (s.group === 'cmp') {
      if (s.input === 'pick') return {input: 'pick', tag, html: '<div class="say2">哪个大？点它</div>', pick: [q.a, q.b]};
      return {input: 'write', tag, html: `<div class="say2">比 ${N(q.n)} ${nearWord(q.d).slice(0, 1)} ${N(Math.abs(q.d))}</div><div class="say2">是 ${box}</div>`, note: '在右边写出答案'};
    }
    // 数线
    return {input: 'line', tag, html: `<div class="say2">把旗子插到 ${N(q.target)} 的位置</div>`, note: '手指按在线上，可以拖，松手停一下就好', line: {max: q.max, target: q.target, mid: q.any ? q.max / 2 : null}};
  }
  // 缺数四种：□+a=b、a+□=b、□−a=b、a−□=b
  function missingEq(q, slot) {
    if (q.form === 'addL') return `${slot} + ${q.a} = ${q.b}`;
    if (q.form === 'addR') return `${q.a} + ${slot} = ${q.b}`;
    if (q.form === 'subL') return `${slot} − ${q.a} = ${q.b}`;
    return `${q.a} − ${slot} = ${q.b}`;
  }

  // ---------- 秒答答错时的一句讲解：进位先凑整十，退位先退到整十，两位数先算几个十（10 以内的口算不讲，前置分合已经教过） ----------
  function stepAdd(x, y) { // x 加一位数 y
    const k = 10 - x % 10;
    if (x % 10 + y < 10) return x >= 10 ? `几个一：${x % 10} + ${y} = ${x % 10 + y}，是 ${x + y}` : '';
    return y === k ? `${x} 和 ${y} 正好凑成 ${x + y}` : `${x} 先加 ${k} 凑成 ${x + k}，再加 ${y - k}，是 ${x + y}`;
  }
  function stepSub(x, y) { // x 减一位数 y
    const k = x % 10;
    if (x < 10) return `${x} − ${y} = ${x - y}`;
    if (y <= k) return y === k ? `${x} 去掉 ${y} 个一，剩 ${x - y}` : `几个一：${k} − ${y} = ${k - y}，是 ${x - y}`;
    if (x === 10) return `10 − ${y} = ${10 - y}`;
    if (k === 0) return `${x} 拿出 1 个十：10 − ${y} = ${10 - y}，${x - 10} + ${10 - y} = ${x - y}`;
    return `${x} 先减 ${k} 到 ${x - k}，再减 ${y - k}，是 ${x - y}`;
  }
  function speedWhy(a, op, b) {
    if (op === '+') {
      if (a < 10 && b < 10) return a + b >= 11 ? (a < b ? `从大的 ${b} 开始：` : '') + stepAdd(Math.max(a, b), Math.min(a, b)) : '';
      if (a === 10 && b < 10) return `10 和 ${b} 是 ${a + b}`;
      if (b % 10 === 0) return `${a} 加 ${b / 10} 个十，是 ${a + b}`;
      if (b < 10) return stepAdd(a, b);
      const m = a + b - b % 10; return `先加几个十：${a} + ${b - b % 10} = ${m}；再加 ${b % 10}：${stepAdd(m, b % 10)}`;
    }
    if (a <= 10) return '';
    if (b % 10 === 0) return `${a} 减 ${b / 10} 个十，是 ${a - b}`;
    if (b < 10) return stepSub(a, b);
    const m = a - (b - b % 10); return `先减几个十：${a} − ${b - b % 10} = ${m}；再减 ${b % 10}：${stepSub(m, b % 10)}`;
  }

  // ---------- 答错时的图解（左栏）：图 + 一句话；正确答案用 --ok 绿色 ----------
  function explain(inst) {
    const s = skillOf(inst.id), q = inst.q, a = inst.ans;
    const pack = (fig, line) => `<div class="explain">${fig}<div class="why">${hasFr(line) ? fr(line) : line}</div></div>`;
    if (s.nb) return pack(`${q.view === 'clock' ? clockSvg(q.h, q.m) : ''}<div class="say2">${s.input === 'pick' && q.view !== 'bad' ? '应该是 ' : ''}${nbAns(q, a)}</div>`, q.why);
    if (s.hard && s.input === 'pick' && q.view === 'choice') return pack(`<div class="say2">应该是 <span class="num" style="font-size:32px">${hasFr(q.opts[a]) ? fr(q.opts[a]) : q.opts[a]}</span></div>`, q.why);
    if (s.hard && s.input === 'pick') return pack(`<div class="say2"><span class="num" style="font-size:32px">${pickWord(q, a)}</span> 更大</div>`, q.why);
    if (s.hard && s.input === 'write') return pack((q.qk && q.say ? `<div class="whysay">${q.say}</div>` : '') + hardFig(q, a), q.view === 'fracbar' ? q.why.replace(/：[^：]*$/, '') : q.why);   // 分数读图：算式行已写出答案，讲解句不再重复分数（矮屏放得下）
    if (s.speed) return pack(`<div class="eq num">${q.a} ${opSign(q.op)} ${q.b} = ${ans(a)}</div>`, speedWhy(q.a, q.op, q.b, a));
    if (s.group === 'look') {
      const five = q.layout === 'tf' && q.n > 5 ? `5 和 ${q.n - 5}，是 ${ans(q.n)}` : q.layout === 'tf2' ? `10 和 ${q.n - 10}，是 ${ans(q.n)}` : `一共是 ${ans(q.n)}`;
      return pack(`<div class="look">${pattern(q)}</div>`, five);
    }
    if (s.group === 'bond') {
      if (q.blank === 'part') {
        const fig = q.n <= 10 ? frame(fill(q.a, q.n - q.a, 'gone').slice(0, 10)) : '';
        return pack(`<div class="eq num">${q.n} = ${q.a} + ${ans(a)}</div>${fig}`, q.n === 10 ? `${q.a} 个点，还空 ${a} 格，凑满 10` : `${q.n} 里有 ${q.a} 个，还差 ${a} 个`);
      }
      if (q.blank === 'whole') return pack(`<div class="eq num">${q.a} + ${q.b} = ${ans(a)}</div>${frame(fill(q.a, q.b, 'on2'))}`, `${q.a} 和 ${q.b} 合起来是 ${a}`);
      if (q.form) {
        const why = {addL: `${q.b} 里拿走 ${q.a}，还剩 ${a}`, addR: `${q.b} 里拿走 ${q.a}，还剩 ${a}`, subL: `${q.b} 再加回 ${q.a}，是 ${a}`, subR: `${q.a} 里拿走几个剩 ${q.b}？拿走 ${a} 个`}[q.form];
        return pack(`<div class="eq num">${missingEq(q, ans(a))}</div>`, why);
      }
      const need = 10 - q.k, rest = q.a - need;          // 过十准备：从 a 里拿 need 个凑满第一框
      const f1 = fill(q.k, need, 'moved'), f2 = Array.from({length: 10}, (_, i) => (i < rest ? 'on' : i < rest + need ? 'gone' : ''));
      return pack(`<div class="eq num">${q.k} + ${q.a} = 10 + ${ans(a)}</div><div class="tfs">${frame(f1)}${frame(f2)}</div><div class="cap"><span>${q.k} 个 + 挪来 ${need} 个</span><span>${q.a} 个挪走 ${need} 个，剩 ${rest}</span></div>`,
        `从 ${q.a} 里拿 ${need} 个凑满 10，还剩 ${rest}`);
    }
    if (s.group === 'place') {
      if (inst.id === 'place:t:read') return pack(`${rods(q.tens, q.ones)}<div class="cap"><span>${q.tens} 个十</span><span>${q.ones} 个一</span></div>`, `${q.tens} 个十和 ${q.ones} 个一，是 ${ans(q.n)}`);
      const t = Math.floor(q.n / 10), o = q.n % 10;
      return pack(rods(t, o), `${q.n} 是 ${q.ask === 'tens' ? ans(t) : t} 个十和 ${q.ask === 'ones' ? ans(o) : o} 个一`);
    }
    if (s.group === 'cmp') {
      if (s.input === 'pick') {
        const lo = Math.min(q.a, q.b), hi = Math.max(q.a, q.b);
        // 两位数：只画这两个数所在的那几个十（例：17 和 21 → 10—30），挨得近也分得开；还是太近（< 14%）就把小的那个数标到上面一层
        const [L0, L1] = hi <= 10 ? [0, 10] : hi <= 20 ? [0, 20] : [Math.floor(lo / 10) * 10, Math.floor(hi / 10) * 10 + 10];
        return pack(`<div class="cards2"><b class="${q.a === hi ? 'win' : ''}">${q.a}</b><b class="${q.b === hi ? 'win' : ''}">${q.b}</b></div>${miniLine(L0, L1, [[lo, ''], [hi, 'win']])}`, `${hi} 在 ${lo} 的右边，${hi} 大`);
      }
      const from = q.n, to = q.n + q.d, big = Math.abs(q.d) === 10;
      const lo = big ? Math.floor(Math.min(from, to) / 10) * 10 : Math.min(from, to) - 4, hi = big ? lo + 20 : Math.max(from, to) + 4;
      const why = {1: '多 1：往后数 1 个', '-1': '少 1：往前数 1 个', 10: '多 10：多 1 个十，一不变', '-10': '少 10：少 1 个十，一不变'}[q.d];
      return pack(`<div class="say2">比 ${N(from)} ${nearWord(q.d)} 是 ${ans(a)}</div>${miniLine(lo, hi, [[from, 'from'], [to, 'win']], true)}`, why);
    }
    return pack('', '');                                  // 数线的图解画在数线上（页面负责）
  }
  // 小数线：标出几个点，jump = 画一条从第一个点到第二个点的弧
  function miniLine(lo, hi, marks, jump) {
    const pos = v => ((v - lo) / (hi - lo) * 100).toFixed(2);
    const step = hi - lo <= 20 ? 1 : hi - lo <= 100 ? 10 : 100, ticks = [];
    for (let v = lo; v <= hi; v += step) ticks.push(`<i class="tick" style="left:${pos(v)}%"></i>`);
    const arc = jump && marks.length === 2 ? `<svg class="arc" style="left:${Math.min(pos(marks[0][0]), pos(marks[1][0]))}%;width:${Math.abs(pos(marks[1][0]) - pos(marks[0][0]))}%" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="M1 29 Q50 -8 99 29" vector-effect="non-scaling-stroke"></path></svg>` : '';
    const close = marks.length === 2 && Math.abs(marks[0][0] - marks[1][0]) / (hi - lo) < 0.14, left = close ? Math.min(marks[0][0], marks[1][0]) : null;
    return `<div class="mline"><i class="mbar"></i>${ticks.join('')}${arc}${marks.map(([v, c]) => `<b class="${['mk', c, v === left ? 'up' : ''].filter(Boolean).join(' ')}" style="left:${pos(v)}%">${v}</b>`).join('')}<span class="end l">${lo}</span><span class="end r">${hi}</span></div>`;
  }
  // 数线答错的那句话：差一个合格范围以内说"一点"
  function lineHint(target, given, tol) {
    const right = target > given, near = Math.abs(target - given) <= tol * 2;
    return (right ? '再往右' : '再往左') + (near ? '一点' : '') + ` · ${target} 在绿旗这里`;
  }

  // ---------- 答对时的字（说明书 3.4「孩子看到的字」） ----------
  // t = {used, limit}（毫秒）：这次用时和秒答时间
  // g = {got 碎片列表, words, bolt}：这次得的碎片
  const shards = g => (g && g.words ? [g.words] : []);   // 第 10 版：g.words = 「碎片 +10 +4」，面值随火苗和暴击变
  function okWords(inst, out, wasLv, t, g) {
    if (out.pass) return {big: g && g.bolt ? '⚡⚡ 闪电秒答！' : '⚡ 秒答！', small: (out.up ? ['点亮了'] : []).concat(t ? [`这次 ${(Math.max(0.1, t.used / 1000)).toFixed(1)} 秒`] : [], shards(g)).join(' · ')};   // 秒答也报用时，看得见自己多快
    return {big: skillOf(inst.id).input === 'line' ? '✓ 很接近' : '✓ 对了', small: (out.peeked ? [] : [t ? `这次 ${Math.ceil(t.used / 1000)} 秒，秒答要 ${Math.floor(t.limit / 1000)} 秒内` : '再快一点才算学会']).concat(shards(g)).join(' · ')};
  }

  // ---------- 「学一学」示范卡：三步动画（具体 → 图形 → 抽象），约 3 秒 ----------
  // 每一步带 class st1 / st2 / st3，页面用 CSS 动画依次显示
  const arrow = '<svg class="arr" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 12h32M26 4l8 8-8 8"></path></svg>';
  const step = (k, inner, cap) => `<div class="dstep st${k}">${inner}<span class="dcap">${cap}</span></div>`;
  // 示范用的题：数字固定（同一个技能每次一样），用固定种子出题
  function demo(skillId) {
    const s = K.BY[skillId], ex = K.example(s.items[0].id), q = ex.q;
    let title, body, foot;
    if (s.nb) {
      title = gName(s) + '：' + s.name;
      body = step(1, nbFig(q) || `<div class="prow">${q.l.map(n => `<span class="pst">${n}</span>`).join('')}</div>`, '看题') + arrow + step(2, `<div class="nbthink">${q.why}</div>`, '想一想') + arrow + step(3, `<div class="say2">${nbAns(q, ex.ans)}</div>`, s.input === 'pick' ? '点它' : '写答案');
      foot = s.input === 'pick' ? '点错了会告诉你答案' : '不会就点「不会」，会告诉你答案';
    } else if (s.hard && s.input !== 'line') {
      title = (s.group === 'speedH' && /^g34:/.test(s.id) ? '计算' : gName(s)) + '：' + s.name;
      body = s.input === 'pick' && q.view === 'choice' ? step(1, `<div class="cards2">${q.opts.map(t => `<b class="sm">${fr(t)}</b>`).join('')}</div>`, q.say) + arrow + step(2, `<div class="cards2"><b class="sm win">${fr(q.opts[ex.ans])}</b></div>`, '点它')
        : s.input === 'pick' ? step(1, `<div class="cards2"><b${q.la ? ' class="sm"' : ''}>${q.la || q.a}</b><b${q.la ? ' class="sm"' : ''}>${q.lb || q.b}</b></div>`, '两边比一比') + arrow + step(2, `<div class="say2">${pickWord(q, ex.ans)}</div>`, '点大的那个')
        : q.view === 'fracbar' ? step(1, `<div class="fig2w">${fracSvg(q.data)}</div>`, '看题') + arrow + step(2, `<div class="eq num sm">${fr(q.text, ans(ex.ans), .72)}</div>`, '写答案')   // 分数读图：图只画一次（demofit 812）
        : s.fun ? step(1, `<div class="whysay" style="font-size:14px;line-height:1.25">${q.say}</div>` + (FIGS[q.view] ? FIGS[q.view](q.data).replace('<svg class="fig2"', '<svg class="fig2" style="height:64px;width:auto;max-width:100%"') : q.view === 'eq' ? `<div class="eq num sm">${q.text.replace('□', box)}</div>` : ''), '看题') + arrow + step(2, `<div class="eq num sm">${q.view === 'eq' ? q.text.replace('□', ans(ex.ans)) : ans(ex.ans)}</div>`, '写答案')   // 趣味题：示范里要有题目（答错讲解同样写 whysay）
        : step(1, hardFig(q), '看题') + arrow + step(2, hardFig(q, ex.ans), '写答案');
      foot = hasFr(q.why) ? fr(q.why) : q.why;
    } else if (s.speed) {
      title = '秒答：看到算式，马上写答案';
      const it = s.items.find(x => !x.gen) || s.items[0], e = K.example(it.id);
      body = step(1, `<div class="eq num">${e.q.a} ${opSign(e.q.op)} ${e.q.b} =</div>`, '看到算式') + arrow + step(2, `<div class="eq num">${ans(e.ans)}</div>`, '马上写答案') + arrow + step(3, '<div class="say2">⚡</div>', '秒答就点亮');
      foot = '不会就点「不会」，会告诉你答案';
    } else if (s.group === 'look') {
      title = '看数：看一眼，写出有几个';
      body = step(1, `<div class="look">${pattern(q)}</div>`, '图会闪一下') + arrow + step(2, `<div class="look">${q.layout === 'dice' || q.layout === 'scat' ? pattern(q) : pattern(q)}</div>`, q.layout === 'tf' || q.layout === 'tf2' ? '上面一行是 5 个' : '一眼看出来') + arrow + step(3, `<div class="eq num">${ans(q.n)}</div>`, '写出有几个');
      foot = '没看清可以点「再看一次」';
    } else if (s.group === 'bond') {
      title = !(s.pre || []).some(p => K.BY[p] && K.BY[p].group === 'bond') ? '分合：一个数可以拆成两个数' : '分合：' + s.name;   // 入门标题只给第一个分合技能（现在是 6–9 分合，5 以内已剔除）；后面的（6–9 分合、凑十…）写自己的名字，不像入门卡又出一遍（捣蛋鬼 1-6）
      const n = q.n || 5, a = q.a || 2;
      body = step(1, `<div class="row">${'<i class="dot"></i>'.repeat(n)}</div>`, `${n} 个圆点`) + arrow + step(2, `<div class="row">${'<i class="dot"></i>'.repeat(a)}<b class="gap"></b>${'<i class="dot on2"></i>'.repeat(n - a)}</div>`, `分成 ${a} 个和 ${n - a} 个`) + arrow + step(3, bondFig(n, a, n - a), '分合图');
      foot = '上面是整个数，下面是拆出来的两个数';
      if (q.form) { title = '缺数：方框里藏着一个数'; body = step(1, `<div class="eq num">${missingEq(q, box)}</div>`, '方框里是几？') + arrow + step(2, `<div class="eq num">${missingEq(q, ans(ex.ans))}</div>`, '想一想分合') + arrow + step(3, '<div class="say2">✓</div>', '写方框里的数'); foot = '想想这几个数怎么分、怎么合'; }
      if (q.k) { const need = 10 - q.k; title = '过十准备：先凑满 10'; body = step(1, `<div class="tfs">${frame(fill(q.k))}${frame(fill(q.a))}</div>`, `${q.k} 个和 ${q.a} 个`) + arrow + step(2, `<div class="tfs">${frame(fill(q.k, need, 'moved'))}${frame(Array.from({length: 10}, (_, i) => (i < q.a - need ? 'on' : i < q.a ? 'gone' : '')))}</div>`, `挪 ${need} 个凑满 10`) + arrow + step(3, `<div class="eq num">10 + ${ans(q.a - need)}</div>`, `还剩 ${q.a - need}`); foot = '先把 10 凑满，再看剩几个'; }
    } else if (s.group === 'place') {
      title = '数位：10 个一拼成 1 个十';
      body = step(1, `<div class="col10">${'<i class="one"></i>'.repeat(10)}</div>`, '10 个一') + arrow + step(2, '<div class="rodset"><i class="rod"></i></div>', '拼成 1 根') + arrow + step(3, rods(4, 0), '4 根是 4 个十，是 40');
      foot = '一根就是 10，数根数就行，不用一个一个数';
    } else if (s.group === 'cmp') {
      if (s.input === 'pick') {
        const lo = Math.min(q.a, q.b), hi = Math.max(q.a, q.b), max = hi <= 10 ? 10 : hi <= 20 ? 20 : 100;
        title = '比大小：在数线上越往右越大';
        body = step(1, `<div class="cards2"><b>${q.a}</b><b>${q.b}</b></div>`, '两个数') + arrow + step(2, miniLine(0, max, [[lo, ''], [hi, 'win']]), '放到数线上') + arrow + step(3, `<div class="cards2"><b class="win">${hi}</b></div>`, '点右边那个');
        foot = '看清楚，再点大的那个数';
      } else {
        const to = q.n + q.d, big = Math.abs(q.d) === 10, lo = big ? Math.floor(Math.min(q.n, to) / 10) * 10 : Math.min(q.n, to) - 4, hi = big ? lo + 20 : Math.max(q.n, to) + 4;
        title = '前后数：在数线上跳一跳';
        body = step(1, `<div class="say2">比 ${N(q.n)} ${nearWord(q.d)}</div>`, '从这个数出发') + arrow + step(2, miniLine(lo, hi, [[q.n, 'from'], [to, 'win']], true), big ? '跳 1 个十' : '跳 1 格') + arrow + step(3, `<div class="eq num">${ans(to)}</div>`, '落在这里');
        foot = big ? '多 10：多 1 个十，一不变' : '多 1 往后数，少 1 往前数';
      }
    } else {
      title = '数线：0 在左边，越往右越大';
      body = step(1, miniLine(0, q.max, [[0, ''], [q.max, '']]), `两头是 0 和 ${q.max}`) + arrow + step(2, miniLine(0, q.max, [[q.max / 2, 'from']]), `中间是 ${q.max / 2}`) + arrow + step(3, miniLine(0, q.max, [[q.target, 'win']]), `${q.target} 在这里`);
      foot = '手指按在线上，可以拖，松手停一下就好';
    }
    return `<div class="demo${s.nb || (s.hard && s.input !== 'line') ? ' dnb' : ''}"><div class="dhead"><span class="learn">学一学</span><span class="dtitle">${title}</span>${s.nb ? nbSay(q) : ''}</div><div class="dbody">${body}</div><div class="dfoot">${foot}</div></div>`;
  }

  // ---------- 名称：技能组地图的题型格子、结算的"今天点亮的"、错题本的题 ----------
  const TYPE_LABEL = {
    'bond:t:whole5': '合起来是几', 'bond:t:whole9': '合起来是几',
    'bond:t:addL': '□ + 3 = 7', 'bond:t:addR': '4 + □ = 9', 'bond:t:subL': '□ − 2 = 5', 'bond:t:subR': '8 − □ = 6',
    'bond:t:to10-9': '9 + 4 = 10 + □', 'bond:t:to10-8': '8 + 5 = 10 + □', 'bond:t:to10-7': '7 + 6 = 10 + □',
    'place:t:read': '看图写数', 'place:t:split': '47 里有几个十',
    'cmp:t:10': '10 以内', 'cmp:t:20': '20 以内', 'cmp:t:100': '两位数', 'cmp:t:swap': '47 和 74 这种',
    'cmp:t:p1': '多 1', 'cmp:t:m1': '少 1', 'cmp:t:p10': '多 10', 'cmp:t:m10': '少 10',
    'line:h:1000t': '0 到 1000 整百', 'line:h:1000': '0 到 1000 任意数',
    'line:t:10': '0 到 10', 'line:t:20': '0 到 20', 'line:t:100t': '0 到 100 整十', 'line:t:100': '0 到 100 任意数',
  };
  // 一个格子的短名字（卡 = 题本身，题型 = 题型名）
  function label(id) {
    const it = K.ITEM[id], s = skillOf(id);
    if (s.speed) return C.label(C.BYID[id]);
    if (it.gen) return TYPE_LABEL[id] || s.name;
    const q = it.q;
    if (s.group === 'look') return {dice: '骰子', scat: '乱点', tf: '十格框', tf2: '两个十格框'}[q.layout] + ' ' + q.n;
    return `${q.n} = ${q.a} + ${q.n - q.a}`;
  }
  // 错题本里一道题的样子（秒答 = 算式；理解题 = 题目本身，空着的写 □）
  function mistLabel(m) {
    if (!m.src) return `${m.a} ${opSign(m.op)} ${m.b}`;
    const q = m.q || {}, s = skillOf(m.uid);
    if (s.hard && q.view === 'clock5') return clockSvg(q.h, q.m);
    if (s.nb) return q.view === 'clock' ? clockSvg(q.h, q.m) : q.view === 'bad' ? q.l.join('、') : q.view === 'pat' ? `<span class="prow">${q.seq.map(blk).join('')}<span class="pblk qm">？</span></span>` : q.eq ? q.eq.replace(/=.*$/, '= ？') : s.name;   // 错题标签只给题面，不露答案
    if (s.hard && s.input === 'pick' && q.view === 'choice') return `${q.say} ${q.opts.map(o => hasFr(o) ? fr(o) : o).join('、')}`;
    if (s.hard && s.input === 'pick') return `${q.la || q.a} 和 ${q.lb || q.b} 谁大`;
    if (s.hard && s.input === 'write' && (q.view === 'chart' || q.view === 'rect')) return `<span style="display:inline-block;height:52px;vertical-align:middle;margin-right:6px">${FIGS[q.view](q.data).replace('<svg class="fig2"', '<svg class="fig2" style="height:100%;width:auto"')}</span>${q.say}`;   // 同类看图题题干一样，错题宝箱里带一张不含答案的小图才分得清（中控 11-08）
    if (s.hard && s.input === 'write' && q.view === 'fracbar') return `<span style="display:inline-block;height:40px;vertical-align:middle;margin-right:6px">${fracSvg(q.data).replace('<svg class="fig2"', '<svg class="fig2" style="height:100%;width:auto"')}</span>${fr(q.text, '□')}`;
    if (s.hard && s.input === 'write' && hasFr(q.text)) return fr(q.text, '□');
    if (s.hard && s.input === 'write') return q.text === '□' ? q.say : q.text ? q.text.replace(/ =$/, '') : q.view === 'grid' ? `${q.rows} 排 ${q.cols} 个` : q.view === 'h100' ? `百格 ${q.n}` : `${q.h} 百 ${q.t} 十 ${q.o} 个`;
    if (s.group === 'look') return `看数 · ${q.n}`;
    if (s.group === 'bond') {
      if (q.blank === 'part') return `${q.n} = ${q.a} + □`;
      if (q.blank === 'whole') return `${q.a} + ${q.b} = □`;
      if (q.form) return missingEq(q, '□');
      return `${q.k} + ${q.a} = 10 + □`;
    }
    if (s.group === 'place') return m.uid === 'place:t:read' ? `${q.tens} 根十 ${q.ones} 块一` : `${q.n} 里有几个${q.ask === 'tens' ? '十' : '一'}`;
    if (s.group === 'cmp') return s.input === 'pick' ? `${q.a} 和 ${q.b} 谁大` : `比 ${q.n} ${nearWord(q.d)}`;
    return `数线 · ${q.target}`;
  }

  return {gName, setSprite, card, cardPage, CONCEPTS: Object.keys(CARDS), barSvg, chartSvg, rectSvg, speedWhy, GROUPS, GNAME, groupStat, itemsOf, tagOf, question, explain, okWords, demo, lineHint, miniLine, scatPos, TYPE_LABEL, label, mistLabel};
});
