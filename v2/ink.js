// 秒答地图 v2 · 手写数字识别（无 DOM、不联网）
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

  // ---------- 书写速度：写一个数字用时的中位数 ----------
  const writeMs = strokes => { const p = [].concat(...strokes); return p.length ? p[p.length - 1].t - p[0].t : 0; };
  function medianSpeed(samples) {
    if (!samples.length) return null;
    const s = samples.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  return {groupStrokes, recognize, rankGroup, addTemplate, blankStore, medianSpeed, writeMs, cloud, SURE_RATIO, MAX_PER_DIGIT};
});
