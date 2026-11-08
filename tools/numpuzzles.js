// 数塔、幻方：从空白填的出题 + 唯一解检查（纯函数，无 DOM）。第三批 11-08 边界：作为凑数矿（数塔）、线索营地（幻方）新的一档，由 E 在 puzzles.js 接入。
// 「唯一」按孩子能用的方法定：只靠「一步推出」就能把空全部填满（数塔：同一个三角里两个数已知就能算第三个；幻方：一条线只差一个数就能算出）。
// 能这样填满 ⇒ 答案一定唯一，而且不用猜、不用解方程。tests/numpuzzles.test.js 另用暴力枚举核对唯一性。
// 浏览器：<script src="numpuzzles.js"> 后用 window.NUMPUZ；node：require('./numpuzzles.js')。E 接入时可以原样搬进 v2/。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NUMPUZ = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const shuffle = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- 数塔：rows 行，第 i 行有 i + 1 格（第 0 行是塔顶）；每格 = 下面相邻两格的和 ----------
  // 格子用 [行, 列] 表示；grid[i][j] = 数，未知是 null
  const pyrTriples = rows => { const t = []; for (let i = 0; i < rows - 1; i++) for (let j = 0; j <= i; j++) t.push([[i, j], [i + 1, j], [i + 1, j + 1]]); return t; };   // [上, 左下, 右下]
  // 只靠一步推出去填；返回 {grid, steps}，填不满返回 null。负数、0 也算推不出（孩子的数塔只用正整数）
  function solvePyramid(given) {
    const rows = given.length, g = given.map(r => r.slice()), T = pyrTriples(rows); let steps = 0, moved = true;
    const v = ([i, j]) => g[i][j], set = ([i, j], x) => { g[i][j] = x; steps++; };
    while (moved) {
      moved = false;
      for (const [top, a, b] of T) {
        const k = [top, a, b].filter(c => v(c) === null).length; if (k !== 1) continue;
        const x = v(top) === null ? v(a) + v(b) : v(a) === null ? v(top) - v(b) : v(top) - v(a), at = v(top) === null ? top : v(a) === null ? a : b;
        if (x <= 0) return null; set(at, x); moved = true;
      }
    }
    return g.every(r => r.every(x => x !== null)) ? {grid: g, steps} : null;
  }
  // 出题：底行 rows 个数（lo–hi），按挖空数从完整的塔里挖；挖完必须能一步步填满。顶不超过 maxTop
  function pyramid(r, o) {
    o = Object.assign({rows: 3, lo: 1, hi: 9, blanks: 3, maxTop: 50}, o);
    for (let tries = 0; tries < 500; tries++) {
      const base = Array.from({length: o.rows}, () => int(r, o.lo, o.hi)), full = [base];
      while (full[0].length > 1) full.unshift(full[0].slice(1).map((x, j) => x + full[0][j]));
      if (full[0][0] > o.maxTop) continue;
      const cells = full.flatMap((row, i) => row.map((_, j) => [i, j])), hide = shuffle(cells, r).slice(0, o.blanks);
      const given = full.map(row => row.slice()); hide.forEach(([i, j]) => { given[i][j] = null; });
      const s = solvePyramid(given); if (s) return {kind: 'pyramid', given, answer: full, blanks: o.blanks};
    }
    return null;
  }

  // ---------- 幻方 3×3：每行、每列、两条斜线的和都等于 sum ----------
  const LO_SHU = [[2, 7, 6], [9, 5, 1], [4, 3, 8]];   // 1–9 的幻方，和 15
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const sym = (m, k) => { let a = m.map(r => r.slice()); if (k & 4) a = a.map(r => r.slice().reverse()); for (let t = 0; t < (k & 3); t++) a = a[0].map((_, j) => a.map(r => r[j]).reverse()); return a; };   // 8 种旋转、翻转
  function solveMagic(given, sum) {
    const g = given.flat(), N = g.length; let steps = 0, moved = true;
    while (moved) {
      moved = false;
      for (const l of LINES) {
        const unk = l.filter(i => g[i] === null); if (unk.length !== 1) continue;
        const x = sum - l.filter(i => g[i] !== null).reduce((a, i) => a + g[i], 0); if (x <= 0) return null;
        g[unk[0]] = x; steps++; moved = true;
      }
    }
    if (g.some(x => x === null)) return null;
    if (LINES.some(l => l.reduce((a, i) => a + g[i], 0) !== sum)) return null;
    return {grid: [g.slice(0, 3), g.slice(3, 6), g.slice(6, 9)], steps};
  }
  // 出题：洛书转一转、翻一翻，每格加同一个数 add（和随之变成 15 + 3·add）；挖 blanks 个空，必须能一步步填满
  function magic(r, o) {
    o = Object.assign({blanks: 4, addLo: 0, addHi: 0}, o);
    for (let tries = 0; tries < 500; tries++) {
      const add = int(r, o.addLo, o.addHi), full = sym(LO_SHU, int(r, 0, 7)).map(row => row.map(x => x + add)), sum = 15 + 3 * add;
      const hide = shuffle([...Array(9).keys()], r).slice(0, o.blanks), given = full.map(row => row.slice());
      hide.forEach(i => { given[Math.floor(i / 3)][i % 3] = null; });
      if (solveMagic(given, sum)) return {kind: 'magic', given, answer: full, sum, blanks: o.blanks};
    }
    return null;
  }

  // 建议分档（E 接入时可调）：数塔 3 层挖 3 个 → 4 层挖 5 个 → 4 层挖 6 个（4 层最多挖 6 个：10 格要留 4 个已知数才定得下底行；要倒着推减法）；幻方挖 4 → 5 → 6 个，和从 15 起
  const TIERS = {
    pyramid: [{rows: 3, blanks: 3, hi: 9, maxTop: 40}, {rows: 4, blanks: 5, hi: 9, maxTop: 60}, {rows: 4, blanks: 6, hi: 12, maxTop: 80}],
    magic: [{blanks: 4, addLo: 0, addHi: 0}, {blanks: 5, addLo: 0, addHi: 5}, {blanks: 6, addLo: 0, addHi: 10}],
  };
  return {rng, pyramid, solvePyramid, magic, solveMagic, LO_SHU, LINES, TIERS};
});
