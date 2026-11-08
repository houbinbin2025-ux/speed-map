// 空空数学岛 · 手写数字识别（无 DOM、不联网）
// 做法：用空空自己的笔迹做模板，$P 点云匹配（不管笔顺、笔画数），多位数按左右位置分组
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.INK = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const N = 32, MAX_PER_DIGIT = 15, SURE_RATIO = 1.25;

  // ---------- 分组：横向范围重叠的笔画算同一个数字 ----------
  const box = pts => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    pts.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    return {x0, x1, y0, y1};
  };
  function groupStrokes(strokes) {
    strokes = strokes.filter(s => s.length);
    if (!strokes.length) return [];
    // 每笔左右各放宽高度的 5%：笔直的一竖（宽度为 0）也有宽度，落在「4」的横折里能被合进去
    const all = box([].concat(...strokes)), pad = (all.y1 - all.y0) * 0.05;
    const items = strokes.map(s => { const b = box(s); return {s, x0: b.x0 - pad, x1: b.x1 + pad}; }).sort((p, q) => p.x0 - q.x0);
    const groups = [];
    items.forEach(it => {
      const g = groups[groups.length - 1];
      if (g) {
        const overlap = Math.min(g.x1, it.x1) - Math.max(g.x0, it.x0);
        if (overlap > 0.3 * Math.min(g.x1 - g.x0, it.x1 - it.x0)) { g.s.push(it.s); g.x1 = Math.max(g.x1, it.x1); return; }
      }
      groups.push({s: [it.s], x0: it.x0, x1: it.x1});
    });
    return groups.map(g => g.s);
  }

  // ---------- $P 点云 ----------
  function cloud(strokes) {
    const pts = [];
    strokes.forEach((s, id) => s.forEach(p => pts.push({x: p.x, y: p.y, id})));
    if (pts.length < 2) return null;
    return normalize(resample(pts, N));
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function resample(pts, n) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i].id === pts[i - 1].id) len += dist(pts[i - 1], pts[i]);
    const I = len / (n - 1) || 1, out = [Object.assign({}, pts[0])];
    let D = 0;
    const p = pts.map(q => Object.assign({}, q));
    for (let i = 1; i < p.length; i++) {
      if (p[i].id !== p[i - 1].id) continue;
      const d = dist(p[i - 1], p[i]);
      if (D + d >= I && d > 0) {
        const t = (I - D) / d, q = {x: p[i - 1].x + t * (p[i].x - p[i - 1].x), y: p[i - 1].y + t * (p[i].y - p[i - 1].y), id: p[i].id};
        out.push(q); p.splice(i, 0, q); D = 0;
      } else D += d;
    }
    while (out.length < n) out.push(Object.assign({}, p[p.length - 1]));
    return out.slice(0, n);
  }
  function normalize(pts) {
    const b = box(pts), s = Math.max(b.x1 - b.x0, b.y1 - b.y0) || 1;
    const q = pts.map(p => ({x: (p.x - b.x0) / s, y: (p.y - b.y0) / s}));
    const cx = q.reduce((a, p) => a + p.x, 0) / q.length, cy = q.reduce((a, p) => a + p.y, 0) / q.length;
    return q.map(p => [+(p.x - cx).toFixed(4), +(p.y - cy).toFixed(4)]);
  }
  function cloudDist(a, b, start) {
    const n = a.length, used = new Array(n).fill(false);
    let sum = 0, i = start;
    do {
      let min = Infinity, idx = -1;
      for (let j = 0; j < n; j++) if (!used[j]) {
        const d = Math.hypot(a[i][0] - b[j][0], a[i][1] - b[j][1]);
        if (d < min) { min = d; idx = j; }
      }
      used[idx] = true;
      sum += (1 - ((i - start + n) % n) / n) * min;
      i = (i + 1) % n;
    } while (i !== start);
    return sum;
  }
  function match(a, b) {
    const step = Math.floor(Math.sqrt(N));
    let min = Infinity;
    for (let i = 0; i < N; i += step) min = Math.min(min, cloudDist(a, b, i), cloudDist(b, a, i));
    return min;
  }

  // ---------- 模板与识别 ----------
  const blankStore = () => ({v: 1, t: {}, speed: null, samples: []});
  function addTemplate(store, digit, strokes) {
    const c = cloud(strokes); if (!c) return false;
    const list = (store.t[digit] = store.t[digit] || []);
    list.push(c);
    while (list.length > MAX_PER_DIGIT) list.shift();
    return true;
  }
  // 一组笔画 → 按距离排好的候选（每个数字取它最像的那个模板）
  function rankGroup(strokes, store) {
    const c = cloud(strokes); if (!c) return [];
    return Object.keys(store.t).filter(d => store.t[d].length)
      .map(d => ({d, dist: Math.min(...store.t[d].map(tp => match(c, tp)))}))
      .sort((x, y) => x.dist - y.dist);
  }
  // 返回 {text, digits:[{strokes, cands:[前两名], sure}]}；没校准或空白时 text=null
  // 杂笔：点数不足 2 个，或比最大那组小到 8% 以下（轻点一下、手掌蹭到）→ 丢掉
  function dropStray(groups) {
    const m = groups.map(g => { const p = [].concat(...g), b = box(p); return {g, n: p.length, size: Math.max(b.x1 - b.x0, b.y1 - b.y0)}; });
    const ref = Math.max(0, ...m.map(x => x.size));
    return m.filter(x => x.n >= 2 && ref > 0 && x.size >= 0.08 * ref).map(x => x.g);
  }
  function recognize(strokes, store) {
    const groups = dropStray(groupStrokes(strokes || []));
    if (!groups.length || !Object.keys(store.t).some(d => store.t[d].length)) return {text: null, digits: []};
    const digits = groups.map(g => {
      const r = rankGroup(g, store);
      const sure = r.length < 2 || r[1].dist / Math.max(r[0].dist, 1e-6) >= SURE_RATIO;
      return {strokes: g, cands: r.slice(0, 2), sure};
    });
    if (digits.some(d => !d.cands.length)) return {text: null, digits};
    return {text: digits.map(d => d.cands[0].d).join(''), digits};
  }

  // 答案定夺：拿不准的那一位，若前两名里有答案要的数字、且这样拼出来正好等于答案 → 直接按答案认，不弹窗问
  // 只在「笔迹本来就两可」时起作用；前两名都对不上，或有把握的位和答案不同，照常问
  function resolveWith(res, ans) {
    const want = String(ans), picked = res.digits.map(d => d.cands[0].d);
    const unsure = res.digits.map((d, i) => d.sure ? -1 : i).filter(i => i >= 0);
    if (!unsure.length || res.digits.length !== want.length) return {picked, unsure, byAnswer: []};
    const fixed = picked.map((x, k) => unsure.includes(k) && res.digits[k].cands.some(c => c.d === want[k]) ? want[k] : x);
    if (fixed.join('') !== want) return {picked, unsure, byAnswer: []};
    return {picked: fixed, unsure: [], byAnswer: unsure};
  }

  // ---------- 书写评分（试运行，只记录）：和内置规范字形比，0–100；没用真实笔迹校准过 ----------
  const arc = (cx, cy, rx, ry, a0, a1, n = 18) => Array.from({length: n}, (_, i) => { const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
  const STD = {   // 每个数字若干种规范写法；每种写法若干笔；坐标约 0.6 × 1
    0: [[arc(.3, .5, .3, .5, -90, 270, 30)]],
    1: [[[[.3, 0], [.3, 1]]], [[[.05, .2], [.3, 0], [.3, 1]]]],
    2: [[arc(.3, .27, .3, .27, 190, 390, 14).concat([[0, 1], [.6, 1]])]],
    3: [[arc(.28, .25, .28, .25, 210, 450, 14).concat(arc(.28, .73, .32, .27, 270, 510, 16))]],
    4: [[[[.45, 0], [0, .68], [.6, .68]], [[.45, 0], [.45, 1]]], [[[.1, 0], [0, .55], [.6, .55]], [[.48, 0], [.48, 1]]]],
    5: [[[[.55, 0], [.08, 0], [.04, .42]].concat(arc(.28, .7, .32, .3, 230, 510, 16).slice(1))]],
    6: [[arc(.42, .35, .42, .35, 290, 180, 8).concat(arc(.3, .72, .3, .28, 180, 540, 18))]],
    7: [[[[0, 0], [.6, 0], [.2, 1]]], [[[0, 0], [.6, 0], [.2, 1]], [[.1, .5], [.5, .5]]]],
    8: [[arc(.3, .24, .24, .24, 90, 450, 16).concat(arc(.3, .74, .3, .26, -90, 270, 18))]],
    9: [[arc(.3, .28, .3, .28, 0, 360, 18).concat([[.6, .28], [.5, 1]])]],
  };
  const LEG_MAX = 3;   // 距离到这个值算 0 分：实测不同数字之间的距离约 1–3
  const pts = st => st.map(([x, y]) => ({x: x * 100, y: y * 100, t: 0}));
  const fine = st => { const o = []; for (let i = 0; i + 1 < st.length; i++) for (let k = 0; k < 8; k++) { const t = k / 8; o.push([st[i][0] + t * (st[i + 1][0] - st[i][0]), st[i][1] + t * (st[i + 1][1] - st[i][1])]); } o.push(st[st.length - 1]); return o; };
  const stdClouds = {};
  const stdOf = d => stdClouds[d] || (stdClouds[d] = STD[d].map(form => cloud(form.map(st => pts(fine(st))))));
  function legibility(strokes, d) {
    if (!STD[d]) return null;
    const c = cloud(strokes || []); if (!c) return null;
    const dist = Math.min(...stdOf(d).map(t => match(c, t)));
    return Math.round(100 * Math.max(0, 1 - dist / LEG_MAX));
  }
  // 最近写的字：笔画简化成整数（0–100），每笔最多 16 个点；留最近 14 天，每天留开头 3 个和结尾 3 个（看得到一次练习前后的变化）
  const RECENT_DAYS = 14, RECENT_EDGE = 3, SKETCH_PTS = 16;
  function sketch(strokes) {
    const all = [].concat(...(strokes || [])); if (!all.length) return [];
    const b = box(all), s = Math.max(b.x1 - b.x0, b.y1 - b.y0) || 1;
    return strokes.filter(st => st.length).map(st => {
      const step = Math.max(1, (st.length - 1) / (SKETCH_PTS - 1)), o = [];
      for (let i = 0; Math.round(i) < st.length && o.length < SKETCH_PTS * 2; i += step) { const p = st[Math.round(i)]; o.push(Math.round((p.x - b.x0) / s * 100), Math.round((p.y - b.y0) / s * 100)); }
      return o;
    });
  }
  function pushRecent(list, item) {
    const all = (Array.isArray(list) ? list : []).concat(item), days = [...new Set(all.map(x => x.d))].slice(-RECENT_DAYS);
    return days.flatMap(d => { const l = all.filter(x => x.d === d); return l.length <= RECENT_EDGE * 2 ? l : l.slice(0, RECENT_EDGE).concat(l.slice(-RECENT_EDGE)); });
  }

  // ---------- 书写速度：写一个数字用时的中位数 ----------
  const writeMs = strokes => { const p = [].concat(...strokes); return p.length ? p[p.length - 1].t - p[0].t : 0; };
  function medianSpeed(samples) {
    if (!samples.length) return null;
    const s = samples.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  // 读本机笔迹存档（speedmap.ink）：坏了不能被空白覆盖，笔迹样本攒了很久（F 模块梳理 11-08）
  // raw = 读到的字符串（没有 = null）；readErr = 读的时候报错
  // → {store, backup: 要先另存的坏原值（没有 = null）, lock: 这次打开不写笔迹（读报错，不知道里面有什么）}
  function loadStore(raw, readErr) {
    if (readErr) return {store: blankStore(), backup: null, lock: true};
    if (raw == null || raw === '' || raw === 'null') return {store: blankStore(), backup: null, lock: false};   // 空的不算坏
    try { const v = JSON.parse(raw); if (v && typeof v === 'object' && !Array.isArray(v)) return {store: Object.assign(blankStore(), v), backup: null, lock: false}; } catch (e) {}
    return {store: blankStore(), backup: String(raw), lock: false};
  }
  // 坏值另存的键：按内容算，同一份坏值反复读只存一份
  const brokenKey = (key, raw) => { let h = 5381; for (let i = 0; i < raw.length; i++) h = ((h * 33) ^ raw.charCodeAt(i)) >>> 0; return key + '.' + h.toString(36) + '.broken'; };   // 以 .broken 结尾：iPad App 恢复备份时跳过（ios/App/App.swift）
  return {STD, legibility, sketch, pushRecent, groupStrokes, recognize, resolveWith, rankGroup, addTemplate, blankStore, loadStore, brokenKey, medianSpeed, writeMs, cloud, SURE_RATIO, MAX_PER_DIGIT};
});
