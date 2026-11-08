// 三四年级第二批 2b-1 分数题池（docs/说明书-到四年级第二批.md §2b-1）。由 tools/build-hard.js 并入 v2/hardbank.js
// 每题只问一个整数（分子或分母或选项编号），判题、停笔、错题走现有流程，不识别分数线。
// 题面里的 a/b、□/b、a/□ 由 render.js 画成上下结构；q.read 是朗读用的说法（八分之三）；选择题 {view: 'choice', opts: ['3/8', …], ans: 正确选项编号}
// 「所有数字都不超过 5 的题剔除」对分数题豁免（规划 §6：那条规则针对 5 以内加减）。tests/batch2b.test.js 用分数独立重算每个答案
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const P = {};
function fill(id, seed, n, make) {
  const r = rng(seed), out = [], seen = new Set();
  for (let i = 0; i < n * 80 && out.length < n; i++) { const x = make(r); if (!x || seen.has(x.q.qk)) continue; seen.add(x.q.qk); out.push(x); }
  P[id] = out;
}
const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const rd = (a, b) => `${CN[b]}分之${CN[a]}`;   // 3/8 → 八分之三
const shuffle = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// 第 11 级 分数读图：一条平均分成 n 份（2–10），涂了 k 份；约三分之二问分子（□/n），三分之一问分母（k/□）。涂的格子靠左 / 靠右 / 分开三种摆法
fill('dock:g11:fracbar', 1101, 120, r => {
  const n = int(r, 2, 10), k = int(r, 1, n - 1), den = r() < 1 / 3, lay = n - k >= 2 && k >= 2 ? ['l', 'r', 's'][int(r, 0, 2)] : ['l', 'r'][int(r, 0, 1)];
  const on = lay === 'l' ? [...Array(k).keys()] : lay === 'r' ? [...Array(k).keys()].map(i => n - 1 - i) : shuffle([...Array(n).keys()], r).slice(0, k).sort((a, b) => a - b);
  if (lay === 's' && on.every((v, i) => !i || v === on[i - 1] + 1)) return null;   // 「分开」至少断开一次
  return {q: {view: 'fracbar', data: {n, on}, say: '涂色部分是几分之几？', read: den ? `涂色部分是几分之${CN[k]}？` : `涂色部分是${CN[n]}分之几？`,
    text: den ? `${k}/□` : `□/${n}`, qk: `${k}/${n}${den ? 'd' : 'n'}${lay}`, why: `平均分成 ${n} 份，涂了 ${k} 份：${k}/${n}`}, ans: den ? n : k};
});

// 第 12 级 同分母加减：分母 3–12，加：和 < 分母；减：差 ≥ 1；答案就是分子，不约分
fill('speed:g12:fracadd', 1201, 150, r => {
  const d = int(r, 3, 12), add = r() < .5, a = int(r, 1, d - 1), b = int(r, 1, d - 1);
  if (add ? a + b >= d : a <= b) return null;
  const s = add ? a + b : a - b, op = add ? '+' : '−';
  return {q: {view: 'eq', text: `${a}/${d} ${op} ${b}/${d} = □/${d}`, read: `${rd(a, d)}${add ? '加' : '减'}${rd(b, d)}，等于${CN[d]}分之几？`, qk: `${a}${add ? '+' : '-'}${b}/${d}`,
    why: `分母不变，分子${add ? '相加' : '相减'}：${a} ${op} ${b} = ${s}`}, ans: s};
});

// 比大小（选择）：3 个分数各不相等；同分母比分子（第 12 级），同分子比分母（第 15 级）
const choice = (k, say, opts, right, why, r) => { const o = shuffle(opts, r); return {q: {view: 'choice', say, read: say + o.map(t => rd(...t.split('/').map(Number))).join('、'), opts: o, qk: k, why}, ans: o.indexOf(right)}; };   // 朗读带上三个选项：「哪个分数最大？八分之三、八分之五、八分之一」
fill('cmp:g12:fraccmp', 1202, 120, r => {
  const d = int(r, 4, 12), ns = shuffle([...Array(d - 1).keys()].map(i => i + 1), r).slice(0, 3), max = r() < .5;
  const right = (max ? Math.max : Math.min)(...ns), l = ns.map(a => `${a}/${d}`);
  return choice(`${max ? 'x' : 'n'}${ns.slice().sort((a, b) => a - b).join('-')}/${d}`, max ? '哪个分数最大？' : '哪个分数最小？', l, `${right}/${d}`, `分母一样，分子${max ? '大' : '小'}的${max ? '大' : '小'}`, r);
});
fill('cmp:g15:fraccmp2', 1501, 100, r => {
  const a = int(r, 1, 6), ds = shuffle([...Array(12 - a).keys()].map(i => i + a + 1), r).slice(0, 3), max = r() < .5;
  if (ds.length < 3) return null;
  const right = (max ? Math.min : Math.max)(...ds), l = ds.map(d => `${a}/${d}`);   // 分子一样：分母越大每份越小
  return choice(`${max ? 'x' : 'n'}${a}/${ds.slice().sort((x, y) => x - y).join('-')}`, max ? '哪个分数最大？' : '哪个分数最小？', l, `${a}/${right}`, `分子一样，分母越大，每份越小；所以分母${max ? '小' : '大'}的${max ? '大' : '小'}`, r);
});

// 第 15 级 等值分数：先取最简真分数 p/q，再取倍数 k（2–4），分母不超过 12。扩分 p/q = □/(qk)，答 pk；约分 (pk)/(qk) = □/q，答 p（答案一定是整数、唯一）
fill('speed:g15:equiv', 1502, 80, r => {
  const q = int(r, 2, 6), p = int(r, 1, q - 1), k = int(r, 2, 4), up = r() < .5;
  if (gcd(p, q) !== 1 || q * k > 12) return null;
  return up
    ? {q: {view: 'eq', text: `${p}/${q} = □/${q * k}`, read: `${rd(p, q)}等于${CN[q * k]}分之几？`, qk: `${p}/${q}u${k}`, why: `分母乘 ${k}，分子也乘 ${k}：${p} × ${k} = ${p * k}`}, ans: p * k}
    : {q: {view: 'eq', text: `${p * k}/${q * k} = □/${q}`, read: `${rd(p * k, q * k)}等于${CN[q]}分之几？`, qk: `${p}/${q}d${k}`, why: `分母除以 ${k}，分子也除以 ${k}：${p * k} ÷ ${k} = ${p}`}, ans: p};
});

module.exports = P;
if (require.main === module) for (const id in P) console.log(id, P[id].length, P[id].slice(0, 3).map(x => (x.q.text || x.q.opts.join(' ')) + ' → ' + x.ans).join(' | '));
