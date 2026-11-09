// 三四年级第二批 2b-2 分步作答题池（docs/说明书-到四年级第二批.md §2b-2；存法按 B 的 docs/方案-2b-2多格作答.md §6，中控和 A 已同意）：
// 一题两个空，答案仍存一个整数——各格依次拼起来（17 ÷ 5 = 3 余 2 → ans: 32），q.cells 记每格几位（[1, 1]）。存档结构不变，不用迁移。
// 每格都不以 0 开头、不为 0（商、余数、整数部分、分子都 ≥ 1），所以按 cells 切开是唯一的。q.cells 按这道题写，不按题型固定（以后有商 12 就是 [2, 1]）。
// 只出两种：商和余数一起写、假分数化带分数。小数加减走「写完整得数」（speed:g12:dec、g14:dec2），这里不出 decadd。
// 由 tools/build-hard.js 并入 v2/hardbank.js；tests/batch2b2.test.js 按 cells 切开后独立重算。
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const P = {};
function fill(id, seed, n, make) {
  const r = rng(seed), out = [], seen = new Set();
  for (let i = 0; i < n * 80 && out.length < n; i++) { const x = make(r); if (!x || seen.has(x.q.qk)) continue; seen.add(x.q.qk); out.push(x); }
  P[id] = out;
}
// 各格拼成一个整数，并记每格几位
const cells = parts => ({ans: Number(parts.map(String).join('')), cells: parts.map(x => String(x).length)});
const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const cn = n => n <= 10 ? CN[n] : n < 20 ? '十' + CN[n - 10] : CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');   // 1–99 的中文读法（朗读用）

// 第 10 级 商和余数一起写：除数 3–9，商 2–9，余数 1 到 除数 − 1（剔除商 0、余数 0）
fill('speed:g10:divrem2', 1001, 150, r => {
  const b = int(r, 3, 9), q = int(r, 2, 9), x = int(r, 1, b - 1), a = b * q + x, c = cells([q, x]);
  return {q: {view: 'eq', text: `${a} ÷ ${b} = □ 余 □`, cells: c.cells, qk: `${a}/${b}`, why: `${q} × ${b} = ${q * b}，${a} − ${q * b} = ${x}，比 ${b} 小`}, ans: c.ans};
});

// 第 15 级 假分数化带分数：分母 2–9，整数部分 1–5，分子余数 1 到 分母 − 1（剔除能整除的）；不要求约分（余数部分照原分母写）
fill('speed:g15:mixed', 1503, 120, r => {
  const d = int(r, 2, 9), w = int(r, 1, 5), x = int(r, 1, d - 1), n = w * d + x, c = cells([w, x]); if (n <= 5) return null;   // 所有数都 ≤ 5 的不出（同 C.isLow）
  return {q: {view: 'eq', text: `${n}/${d} = □ 又 □/${d}`, cells: c.cells, read: `${cn(d)}分之${cn(n)}等于几又${cn(d)}分之几？`, qk: `${n}/${d}`, why: `${n} ÷ ${d} = ${w} 余 ${x}：${w} 个整的，还剩 ${x} 份`}, ans: c.ans};
});

module.exports = P;
if (require.main === module) for (const id in P) console.log(id, P[id].length, P[id].slice(0, 3).map(x => x.q.text + ' → ' + x.ans + ' ' + JSON.stringify(x.q.cells)).join(' | '));
