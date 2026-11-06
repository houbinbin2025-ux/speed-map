// 思维模块出题（只有数据和判定，不碰页面）：天平桥、凑数矿、线索营地、方块工坊
(function (root, f) { if (typeof module !== 'undefined' && module.exports) module.exports = f(); else root.PUZZLES = f(); })(typeof self !== 'undefined' ? self : this, function () {
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
  const shuffle = (r, xs) => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // —— 天平桥 ——
  const split = (r, t, avoid = []) => { for (;;) { const a = int(r, 1, t - 1); if (!avoid.includes(a) && !avoid.includes(t - a)) return [a, t - a]; } };
  const sum = terms => terms.reduce((s, x) => s + (x || 0), 0);
  function balance(r, tier) {
    if (tier === 0) {
      const t = int(r, 7, 15), equal = r() < 0.5, t2 = equal ? t : t + pick(r, [-2, -1, 1, 2]);
      const form = pick(r, ['22', '12', '21']);
      for (;;) {
        const left = form[0] === '1' ? [t] : split(r, t), right = form[1] === '1' ? [t2] : split(r, t2);
        if (left.length === 2 && right.length === 2 && left.slice().sort().join() === right.slice().sort().join()) continue;   // 两边同一对数，一眼看出，不用算
        return {kind: 'judge', left, right, equal};
      }
    }
    if (tier === 2) { const t = int(r, 7, 12), right = split(r, t); return {kind: 'two', left: [null, null], right, total: t}; }
    const t = tier === 3 ? int(r, 8, 15) : int(r, 7, 15), right = split(r, t);
    if (tier === 1 && t <= 12 && r() < 0.25) return {kind: 'fill', left: [null], right, answer: t};
    for (;;) {
      const x = int(r, 1, Math.min(t - 1, tier === 3 ? 12 : 9)), a = t - x;   // x = 要填的数
      if (a < 1 || right.includes(a) || right.includes(x)) continue;
      const flip = r() < 0.3;
      return {kind: tier === 3 ? 'blind' : 'fill', left: flip ? right : [a, null], right: flip ? [a, null] : right, answer: x};
    }
  }
  // 两个空：照抄右边不算，要换两个数（否则不用动脑）
  const isCopy = (q, vals) => vals.length === 2 && q.right.length === 2 && ((vals[0] === q.right[0] && vals[1] === q.right[1]) || (vals[0] === q.right[1] && vals[1] === q.right[0]));
  const altPair = q => { for (let a = 1; a < q.total; a++) if (!isCopy(q, [a, q.total - a])) return [a, q.total - a]; };
  const balanced = (q, vals) => { let i = 0; const fill = s => s.map(x => x === null ? (vals[i++] || 0) : x); const l = fill(q.left), rr = fill(q.right); return {l, r: rr, diff: sum(l) - sum(rr)}; };

  // —— 凑数矿 ——
  const TARGET = [{n: 4, minus: false, lo: 6, hi: 10, need: 2, max: 7}, {n: 4, minus: true, lo: 6, hi: 15, need: 2, max: 9, needMinus: true}, {n: 5, minus: true, lo: 10, hi: 20, need: 3, max: 9, needMinus: true}];
  const keyOf = (plus, minus) => plus.slice().sort((a, b) => a - b).join(',') + '|' + minus.slice().sort((a, b) => a - b).join(',');
  function solutions(cards, target, allowMinus) {
    const out = [], base = allowMinus ? 3 : 2, total = base ** cards.length;
    for (let m = 0; m < total; m++) {
      const plus = [], minus = []; let x = m;
      cards.forEach(c => { const d = x % base; x = Math.floor(x / base); if (d === 1) plus.push(c); if (d === 2) minus.push(c); });
      if (plus.length + minus.length >= 2 && plus.length && sum(plus) - sum(minus) === target) out.push({plus, minus, key: keyOf(plus, minus)});
    }
    return out;
  }
  function target(r, tier) {
    const c = TARGET[tier];
    for (;;) {
      const cards = shuffle(r, Array.from({length: c.max}, (_, i) => i + 1)).slice(0, c.n), t = int(r, c.lo, c.hi);
      if (cards.includes(t)) continue;
      const sols = solutions(cards, t, c.minus);
      if (sols.length >= c.need && sols.length <= 8 && (!c.needMinus || sols.some(x => x.minus.length))) return {cards, target: t, minus: c.minus, solutions: sols};
    }
  }

  // —— 线索营地 ——
  const BOX4 = i => (i < 2 ? 0 : 2);
  function conflicts(q, g) {
    const n = q.n, bad = new Set(), mark = cells => { const seen = {}; cells.forEach(i => { if (!g[i]) return; (seen[g[i]] = seen[g[i]] || []).push(i); }); Object.values(seen).forEach(xs => { if (xs.length > 1) xs.forEach(i => bad.add(i)); }); };
    for (let k = 0; k < n; k++) { mark(Array.from({length: n}, (_, c) => k * n + c)); mark(Array.from({length: n}, (_, row) => row * n + k)); }
    if (q.boxes) for (const y of [0, 2]) for (const x of [0, 2]) mark([0, 1, 4, 5].map(o => y * 4 + x + o));
    return bad;
  }
  function countGrid(q, g, limit = 2) {
    const i = g.findIndex(v => !v); if (i < 0) return 1;
    let c = 0;
    for (let v = 1; v <= q.n && c < limit; v++) { g[i] = v; if (!conflicts(q, g).size) c += countGrid(q, g, limit - c); g[i] = 0; }
    return c;
  }
  const GRID = [{n: 3, blanks: 4, boxes: false}, {n: 4, blanks: 7, boxes: false}, {n: 4, blanks: 9, boxes: true}];
  function grid(r, tier) {
    const c = GRID[tier], n = c.n; let sol;
    if (c.boxes) {
      const base = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1], sym = [0].concat(shuffle(r, [1, 2, 3, 4]));
      const band = shuffle(r, [0, 1]).flatMap(b => shuffle(r, [0, 1]).map(x => b * 2 + x)), stack = shuffle(r, [0, 1]).flatMap(b => shuffle(r, [0, 1]).map(x => b * 2 + x));
      sol = []; band.forEach(y => stack.forEach(x => sol.push(sym[base[y * 4 + x]])));
    } else {
      const rows = shuffle(r, Array.from({length: n}, (_, i) => i)), cols = shuffle(r, Array.from({length: n}, (_, i) => i)), sym = shuffle(r, Array.from({length: n}, (_, i) => i + 1));
      sol = []; rows.forEach(y => cols.forEach(x => sol.push(sym[(y + x) % n])));
    }
    const q = {n, boxes: c.boxes, solution: sol}, g = sol.slice(); let left = c.blanks;
    for (const i of shuffle(r, sol.map((_, k) => k))) { if (!left) break; const v = g[i]; g[i] = 0; if (countGrid(q, g.slice()) === 1) left--; else g[i] = v; }
    return Object.assign(q, {kind: 'grid', givens: g});
  }
  // 线索只用学过的说法（比大小、数位村庄的「几个十」）；每条线索都必须用得上，一条定不了答案
  const clueOk = (text, x) => { const n = Number(text.match(/\d+/)[0]); return text.startsWith('比') ? (text.endsWith('大') ? x > n : x < n) : text.startsWith('不是') ? x !== n : Math.floor(x / 10) === n; };
  function dog(r) {
    for (;;) {
      const boxes = shuffle(r, Array.from({length: 29}, (_, i) => i + 1)).slice(0, 6), answer = pick(r, boxes), clues = [], others = boxes.filter(x => x !== answer);
      const tens = Math.floor(answer / 10), pool = [`比 ${Math.max(1, answer - int(r, 1, 5))} 大`, `比 ${answer + int(r, 1, 5)} 小`, `不是 ${pick(r, others)}`];
      if (tens) pool.push(`有 ${tens} 个十`);
      let alive = boxes.slice();
      for (const c of shuffle(r, pool)) { if (!clueOk(c, answer)) continue; const next = alive.filter(x => clueOk(c, x)); if (next.length < alive.length) { clues.push(c); alive = next; } if (alive.length === 1) break; }
      if (alive.length !== 1 || clues.length < 2) continue;
      const needed = clues.every(c => boxes.filter(x => clues.filter(k => k !== c).every(k => clueOk(k, x))).length > 1);
      if (needed) return {kind: 'dog', boxes, answer, clues};
    }
  }

  // —— 方块工坊 ——
  function mirror(r, axis) {
    const v = axis === 'v', rows = v ? 4 : 6, cols = v ? 6 : 4, hr = v ? 4 : 3, hc = v ? 3 : 4;   // 给定半边：v 取左 3 列，h 取上 3 行
    const size = int(r, 4, 6), start = v ? [int(r, 0, 3), 2] : [2, int(r, 0, 3)], cells = new Set([start.join()]);
    while (cells.size < size) {
      const [y, x] = pick(r, [...cells]).split(',').map(Number), [dy, dx] = pick(r, [[0, 1], [1, 0], [0, -1], [-1, 0]]), ny = y + dy, nx = x + dx;
      if (ny >= 0 && ny < hr && nx >= 0 && nx < hc) cells.add(ny + ',' + nx);
    }
    const given = [...cells].map(s => { const [y, x] = s.split(',').map(Number); return y * cols + x; });
    const want = [...cells].map(s => { const [y, x] = s.split(',').map(Number); return v ? y * cols + (cols - 1 - x) : (rows - 1 - y) * cols + x; });
    return {kind: 'mirror', axis, rows, cols, given, want};
  }
  const norm = cells => { const my = Math.min(...cells.map(c => c[0])), mx = Math.min(...cells.map(c => c[1])); return cells.map(c => [c[0] - my, c[1] - mx]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
  const rot = cells => norm(cells.map(([y, x]) => [x, -y]));
  const flip = cells => norm(cells.map(([y, x]) => [y, -x]));
  const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
  const SHAPES = [
    [[[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 1], [0, 2], [1, 0], [1, 1]]],   // 四格：L、S
    [[[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]], [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]], [[0, 1], [1, 1], [2, 0], [2, 1], [3, 0]], [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]]],   // 五格：F、L、N、P
  ];
  function rotate(r, level) {
    const base = norm(pick(r, SHAPES[level])); let shown = base; for (let i = int(r, 0, 3); i > 0; i--) shown = rot(shown);
    let right = shown; for (let i = int(r, 1, 3); i > 0; i--) right = rot(right);
    if (same(right, shown)) right = rot(shown);
    let m1 = flip(shown), m2 = rot(m1); for (let i = int(r, 0, 2); i > 0; i--) { m1 = rot(m1); m2 = rot(m2); }
    const options = shuffle(r, [{cells: right, ok: true}, {cells: m1, ok: false}, {cells: m2, ok: false}]);
    return {kind: 'rotate', shown, options};
  }

  const MODULES = [
    {id: 'balance', name: '天平桥', tiers: ['平不平', '填一个数', '填两个数', '先想后称'], make: balance},
    {id: 'target', name: '凑数矿', tiers: ['只用加', '加和减', '五个数字'], make: target},
    {id: 'clue', name: '线索营地', tiers: ['三行', '四行', '粗线框', '小狗在哪'], make: (r, t) => t === 3 ? dog(r) : grid(r, t)},
    {id: 'block', name: '方块工坊', tiers: ['左右对称', '上下对称', '转一转', '转一转五格'], make: (r, t) => t < 2 ? mirror(r, t ? 'h' : 'v') : rotate(r, t - 2)},   // 用语已核：地点名
  ];
  // —— 进度：S.think = {模块 id: [每个技能做出来的题数]}；旧存档没有这个字段，读的时候当 0。只存次数，不进四档颜色 ——
  const PASS = 3;   // 一个技能做出来 3 题就开放下一个
  const modOf = id => MODULES.find(m => m.id === id);
  function progress(S, id) {
    const m = modOf(id), saved = (S.think && S.think[id]) || [], n = m.tiers.map((_, i) => Number(saved[i]) || 0);
    const first = n.findIndex(x => x < PASS), tier = first < 0 ? m.tiers.length - 1 : first;
    return {n, tier, passed: n.filter(x => x >= PASS).length, total: m.tiers.length};
  }
  function record(S, id, t) {   // 返回 true = 这一题刚好学会这个技能
    S.think = S.think || {};
    const n = progress(S, id).n; n[t]++; S.think[id] = n;
    return n[t] === PASS;
  }
  return {PASS, modOf, progress, record, rng, sum, MODULES, balance, balanced, isCopy, altPair, target, solutions, keyOf, grid, conflicts, countGrid, dog, clueOk, mirror, rotate, rot, flip, same, norm};
});
