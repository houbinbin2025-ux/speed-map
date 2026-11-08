// 数塔、幻方从空白填（tools/numpuzzles.js，第三批备用，E 接入）：出的题能一步步填满、答案唯一、和完整答案一致
// 唯一性另用两种独立方法核对：线性方程组的秩（空的个数 = 秩 ⇒ 实数解唯一 ⇒ 整数解唯一）；3 层数塔再用暴力枚举
const test = require('node:test'), assert = require('node:assert');
const P = require('../tools/numpuzzles.js');

function rank(rows) {   // 高斯消元求秩（有理数用浮点，系数小，够用）
  const m = rows.map(r => r.slice()); let rk = 0;
  for (let c = 0; c < (m[0] || []).length && rk < m.length; c++) {
    const p = m.findIndex((r, i) => i >= rk && Math.abs(r[c]) > 1e-9); if (p < 0) continue;
    [m[rk], m[p]] = [m[p], m[rk]];
    for (let i = 0; i < m.length; i++) if (i !== rk && Math.abs(m[i][c]) > 1e-9) { const f = m[i][c] / m[rk][c]; m[i] = m[i].map((x, j) => x - f * m[rk][j]); }
    rk++;
  }
  return rk;
}
// 数塔每格 = 底行的二项式组合；已知格给出方程，秩 = 底行个数 ⇒ 唯一
const coef = (rows, i, j) => { const n = rows - 1 - i, out = Array(rows).fill(0); const C = (a, b) => { let r = 1; for (let k = 0; k < b; k++) r = r * (a - k) / (k + 1); return r; }; for (let k = 0; k <= n; k++) out[j + k] = C(n, k); return out; };
const pyrUnique = g => { const rows = g.length, eq = []; g.forEach((row, i) => row.forEach((x, j) => { if (x !== null) eq.push(coef(rows, i, j)); })); return rank(eq) === rows; };
// 幻方：未知数 = 空格，方程 = 8 条线；秩 = 空格数 ⇒ 唯一
const magicUnique = g => { const f = g.flat(), unk = f.map((x, i) => x === null ? i : -1).filter(i => i >= 0); return rank(P.LINES.map(l => unk.map(u => (l.includes(u) ? 1 : 0)))) === unk.length; };

test('数塔：每档出 200 题，都能一步步填满、等于完整答案、每格 = 下面两格的和、顶不超上限、方程组只有一组解', () => {
  P.TIERS.pyramid.forEach((t, k) => { const r = P.rng(100 + k);
    for (let n = 0; n < 200; n++) { const p = P.pyramid(r, t); assert.ok(p, `第 ${k} 档出不了题`);
      const s = P.solvePyramid(p.given); assert.ok(s); assert.deepEqual(s.grid, p.answer);
      p.answer.forEach((row, i) => row.forEach((x, j) => { assert.ok(Number.isInteger(x) && x > 0); if (i < p.answer.length - 1) assert.equal(x, p.answer[i + 1][j] + p.answer[i + 1][j + 1]); }));
      assert.equal(p.given.flat().filter(x => x === null).length, t.blanks); assert.ok(p.answer[0][0] <= t.maxTop); assert.ok(pyrUnique(p.given), JSON.stringify(p.given)); } });
});

test('3 层数塔暴力核对：底行 1–40 全部枚举，和已知格相符的只有一组', () => {
  const r = P.rng(7);
  for (let n = 0; n < 40; n++) { const p = P.pyramid(r, P.TIERS.pyramid[0]); let hit = 0;
    for (let a = 1; a <= 40; a++) for (let b = 1; b <= 40; b++) for (let c = 1; c <= 40; c++) {
      const g = [[a + 2 * b + c], [a + b, b + c], [a, b, c]];
      if (g.every((row, i) => row.every((x, j) => p.given[i][j] === null || p.given[i][j] === x))) hit++;
    }
    assert.equal(hit, 1, JSON.stringify(p.given)); }
});

test('幻方：每档出 200 题，能一步步填满、等于完整答案、8 条线的和都对、1–9 平移、方程组只有一组解', () => {
  P.TIERS.magic.forEach((t, k) => { const r = P.rng(200 + k);
    for (let n = 0; n < 200; n++) { const p = P.magic(r, t); assert.ok(p, `第 ${k} 档出不了题`);
      const s = P.solveMagic(p.given, p.sum); assert.ok(s); assert.deepEqual(s.grid, p.answer);
      const f = p.answer.flat(); P.LINES.forEach(l => assert.equal(l.reduce((a, i) => a + f[i], 0), p.sum));
      assert.equal(new Set(f).size, 9); assert.equal(Math.min(...f) + 8, Math.max(...f));
      assert.equal(p.given.flat().filter(x => x === null).length, t.blanks); assert.ok(magicUnique(p.given), JSON.stringify(p.given)); } });
});

test('推不出来的题判为 null：数塔只给底行一格，幻方只给一格', () => {
  assert.equal(P.solvePyramid([[null], [null, null], [3, null, null]]), null);
  assert.equal(P.solveMagic([[2, null, null], [null, null, null], [null, null, null]], 15), null);
  assert.equal(P.solvePyramid([[5], [null, 3], [4, null, null]]), null, '算出 0 或负数不算');
});
