// 第三批 3a 趣味题题池（docs/说明书-第三批.md §四）：数塔、幻方、植树 ×3、锯木头、谁最高、猜数 ×2、算式谜。由 tools/build-hard.js 并入 v2/hardbank.js
// 每题 {q: {view, say, text, qk, why, data?}, ans}；选择题 {q: {view: 'choice', say, opts, qk, why}, ans: 正确选项的编号}
// 题面都带朗读文字 say（秒答分类按「读题题」算）；qk 是去重键（题面文字不同 = 不重样）；tests/fun.test.js 用另一种方法重算每道题的答案
const NP = require('./numpuzzles.js');
const rng = NP.rng;
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (l, r) => l[Math.floor(r() * l.length)];
const shuffle = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const P = {};
const N = 200;   // 每个题型的题数（说明书：≥ 150）
function fill(id, seed, make, n) {
  n = n || N;
  const r = rng(seed), out = [], seen = new Set();
  for (let i = 0; i < n * 200 && out.length < n; i++) {
    const x = make(r); if (!x) continue;
    if (x.q.view !== 'choice' && low((String(x.q.say) + ' ' + x.q.text + ' ' + JSON.stringify(x.q.data || '')).match(/\d+/g).map(Number).concat(x.ans))) continue;   // 所有数都 ≤ 5 的不要
    if (seen.has(x.q.qk)) continue; seen.add(x.q.qk); out.push(x);
  }
  P[id] = out;
}
// 所有数都 ≤ 5 的题不要（同 C.isLow；带 view 的题运行时不过滤，只能在这里剔）
const low = l => l.every(x => x <= 5);

// ---------- 数塔：三层，上面的数是下面两个数的和，只空一格 ----------
const PYR_SAY = '上面的数是下面两个数的和。问号是几？';
// 只空一格：不在最下面就是下面两个数相加；在最下面就是上面的数减去旁边那个
const pyrWhy = (g, i, j) => {
  if (i < g.length - 1) { const a = g[i + 1][j], b = g[i + 1][j + 1]; return `下面两个数相加：${a} + ${b} = ${a + b}`; }
  const tj = j > 0 ? j - 1 : j, top = g[i - 1][tj], other = g[i][tj === j ? j + 1 : j - 1];
  return `上面的数减去旁边的数：${top} − ${other} = ${top - other}`;
};
function pyrQ(r, lo, hi, maxTop, tag) {
  const base = [int(r, lo, hi), int(r, lo, hi), int(r, lo, hi)], mid = [base[0] + base[1], base[1] + base[2]], top = mid[0] + mid[1];
  if (top > maxTop) return null;
  const full = [[top], mid, base], cells = full.flatMap((row, i) => row.map((_, j) => [i, j])), [hi_, hj] = pick(cells, r);
  const g = full.map(row => row.slice()); g[hi_][hj] = null;
  if (!NP.solvePyramid(g) || low(full.flat())) return null;
  const why = pyrWhy(g, hi_, hj);
  return {q: {view: 'pyr', say: PYR_SAY, text: '□', qk: `${tag}${g.flat().map(x => x === null ? '?' : x).join('-')}`, why, data: {g}}, ans: full[hi_][hj]};
}
fill('garden:g4:pyr', 3401, r => pyrQ(r, 1, 9, 20, 'p'));
fill('garden:g7:pyr2', 3402, r => pyrQ(r, 10, 35, 100, 'P'));

// ---------- 幻方：3×3，题面写出和，只空一格；一般幻方（中心 c，其余格是 c 加减 a、b），9 个数不成等差 ----------
const LINES = NP.LINES;
const MAGICS = [];
for (let c = 3; c <= 20; c++) for (let a = -19; a <= 19; a++) for (let b = -19; b <= 19; b++) {
  const m = [c - b, c + a + b, c - a, c - a + b, c, c + a - b, c + a, c - a - b, c + b];
  if (m.some(x => x < 1 || x > 20) || new Set(m).size < 9) continue;
  const s = m.slice().sort((x, y) => x - y), d = s[1] - s[0]; if (s.every((x, i) => !i || x - s[i - 1] === d)) continue;
  MAGICS.push(m);
}
const LNAME = ['第一行', '第二行', '第三行', '第一列', '第二列', '第三列', '斜线', '斜线'];
fill('garden:g7:magic', 3403, r => {
  const m = pick(MAGICS, r), hole = int(r, 0, 8), sum = m[0] + m[1] + m[2], g = m.slice(); g[hole] = null;
  if (low(m)) return null;
  const li = LINES.findIndex(l => l.includes(hole)), others = LINES[li].filter(i => i !== hole).map(i => m[i]);
  return {q: {view: 'magic', say: `横、竖、斜，每条线上三个数加起来都是 ${sum}。问号是几？`, text: '□', qk: `m${g.map(x => x === null ? '?' : x).join('-')}`, why: `看${LNAME[li]}：${sum} − ${others[0]} − ${others[1]} = ${m[hole]}`, data: {g, sum}}, ans: m[hole]};
});

// ---------- 植树、锯木头：段数和棵数 ----------
const ROADS = ['一条小路', '河边的路', '操场边的路'], ITEMS = [['树', '棵', '种'], ['路灯', '盏', '装'], ['旗子', '面', '插'], ['花盆', '个', '摆']];
// kind：both 两头都种（棵 = 段 + 1）、one 只种一头（棵 = 段）、none 两头都不种（棵 = 段 − 1）
const KIND = {both: ['两头都', 1], one: ['一头也', 0], none: ['两头都不', -1]};
// 两头都种：用「树和树之间有几段」问（两头都种时树和树之间的段 = 整条路的段）。
// 只种一头 / 两头都不种：「树和树之间」的段数和路的段数不一样，改用「路分成几段一样长，树种在段和段之间」问（审查 11-09：原题按字面答案是错的）
function treeQ(r, kinds, lo, hi, tag) {
  const kind = pick(kinds, r), [kw, dk] = KIND[kind], [it, u, v] = pick(ITEMS, r), pl = pick(ROADS, r), back = r() < .4;
  const seg = int(r, lo, hi), cnt = seg + dk; if (cnt < 2) return null;
  const hw = `${kw}${v}`;   // 两头都种 / 只在一头摆 / 两头都不插
  const why = back ? (dk ? `${hw}：段比${it}${dk > 0 ? '少' : '多'} 1，${cnt} ${dk > 0 ? '−' : '+'} 1 = ${seg}` : `${hw}：段和${it}一样多，是 ${seg}`)
    : (dk ? `${hw}：${it}比段${dk > 0 ? '多' : '少'} 1，${seg} ${dk > 0 ? '+' : '−'} 1 = ${cnt}` : `${hw}：${it}和段一样多，是 ${cnt}`);
  const data = {kind, seg, it, lab: back ? `共 ${cnt} ${u}` : `共 ${seg} 段`}, ans = back ? seg : cnt, qk = `${tag}${kind}${back ? 'b' : ''}${pl}${it}${back ? cnt : seg}`;
  if (kind === 'both') return {q: {view: 'trees', say: back ? `${pl}两头都${v}${it}，一共 ${cnt} ${u}${it}。${it}和${it}之间有几段？` : `${pl}两头都${v}${it}，${it}和${it}之间有 ${seg} 段。一共几${u}${it}？`, text: '□', qk, why, data}, ans};
  const rule = kind === 'one' ? `一头也${v}、另一头不${v}` : `两头都不${v}`;
  return {q: {view: 'trees', say: back ? `${pl}分成一样长的几段，${it}${v}在段和段之间，${rule}，共 ${cnt} ${u}。分成了几段？` : `${pl}分成一样长的 ${seg} 段，${it}${v}在段和段之间，${rule}。一共几${u}？`, text: '□', qk, why, data}, ans};
}
fill('dock:g5:tree', 3501, r => treeQ(r, ['both'], 6, 25, 't'));
fill('dock:g7:tree2', 3701, r => treeQ(r, ['one', 'none'], 6, 30, 'T'));
const CUTS = [['木头', '锯', '次'], ['绳子', '剪', '刀'], ['面包', '切', '刀'], ['纸条', '剪', '刀'], ['竹子', '锯', '次'], ['甘蔗', '砍', '刀']];
fill('dock:g5:saw', 3502, r => {
  const [th, v, u] = pick(CUTS, r), k = int(r, 6, 25), back = r() < .4;
  if (!back) return {q: {view: 'trees', say: `把一根${th}${v} ${k} ${u}，${v}成几段？`, text: '□', qk: `s${th}${k}`, why: `${v} 1 ${u}是 2 段，段比${u}数多 1：${k} + 1 = ${k + 1}`, data: {kind: 'saw', seg: k + 1, it: th, lab: `共 ${k} ${u}`}}, ans: k + 1};
  return {q: {view: 'trees', say: `要把一根${th}${v}成 ${k + 1} 段，要${v}几${u}？`, text: '□', qk: `S${th}${k}`, why: `${u}数比段少 1：${k + 1} − 1 = ${k}`, data: {kind: 'saw', seg: k + 1, it: th, lab: `共 ${k + 1} 段`}}, ans: k};
});
// 先算段数：路长 = 每段 × 段数（表内除法）
fill('dock:g9:tree3', 3901, r => {
  const kind = pick(['both', 'both', 'one', 'none'], r), [kw, dk] = KIND[kind], [it, u, v] = pick(ITEMS, r), pl = pick(ROADS, r), d = int(r, 2, 9), seg = int(r, 3, 9), L = d * seg, cnt = seg + dk;
  return {q: {view: 'trees', say: `${pl}长 ${L} 米，每隔 ${d} 米${v}一${u}${it}，${kind === 'one' ? `一头也${v}、另一头不${v}` : kw + v}。一共几${u}？`, text: '□', qk: `L${kind}${pl}${it}${L}-${d}`, why: `先算段数：${L} ÷ ${d} = ${seg} 段；${kind === 'one' ? `一头也${v}` : kw + v}，${kind === 'both' ? `${seg} + 1 = ${cnt}` : kind === 'one' ? `和段一样多，是 ${cnt}` : `${seg} − 1 = ${cnt}`}`, data: {kind, seg, it, d, lab: ''}}, ans: cnt};
});

// ---------- 谁最高：两句话连成一串，3 选 1 ----------
const NAMES = ['小林', '小方', '小月', '小冬', '小青', '小雨', '小石', '小禾'];
const PROPS = [['高', '矮', '谁最高？', '谁最矮？', '从高到矮'], ['重', '轻', '谁最重？', '谁最轻？', '从重到轻'], ['跑得快', '跑得慢', '谁跑得最快？', '谁跑得最慢？', '从快到慢'], ['年纪大', '年纪小', '谁年纪最大？', '谁年纪最小？', '从大到小']];
fill('dock:g5:order', 3503, r => {
  const [A, B, Cn] = shuffle(NAMES, r).slice(0, 3), [pos, neg, askP, askN, ord] = pick(PROPS, r);   // 真实顺序：A > B > Cn
  const s1 = r() < .5 ? `${A}比${B}${pos}` : `${B}比${A}${neg}`, s2 = r() < .5 ? `${B}比${Cn}${pos}` : `${Cn}比${B}${neg}`;
  const two = r() < .5 ? [s1, s2] : [s2, s1], top = r() < .5, right = top ? A : Cn;
  const opts = shuffle([A, B, Cn], r);
  return {q: {view: 'choice', say: `${two[0]}，${two[1]}。${top ? askP : askN}`, opts, qk: `o${two.join('|')}${top}`, why: `排一排，${ord}：${A}、${B}、${Cn}`}, ans: opts.indexOf(right)};
});

// ---------- 猜数：倒着算 ----------
fill('dock:g7:riddle', 3702, r => {
  const x = int(r, 10, 60), a = int(r, 3, 30), b = int(r, 3, 30), ops = pick([['+', '−'], ['−', '+'], ['+', '+'], ['−', '−']], r);
  const w = {'+': '加上', '−': '减去'}, ap = (v, op, k) => (op === '+' ? v + k : v - k), y = ap(x, ops[0], a), c = ap(y, ops[1], b);
  if (y < 1 || c < 1 || y > 100 || c > 100 || x + a > 100) return null;
  const inv = op => (op === '+' ? '−' : '+');
  return {q: {view: 'riddle', say: `一个数${w[ops[0]]} ${a}，再${w[ops[1]]} ${b}，得 ${c}。这个数是几？`, text: '□', qk: `r${x}${ops.join('')}${a}-${b}`, why: `倒着算：${c} ${inv(ops[1])} ${b} = ${y}，${y} ${inv(ops[0])} ${a} = ${x}`}, ans: x};
});
fill('dock:g9:riddle2', 3902, r => {
  const kind = int(r, 0, 2), a = int(r, 2, 9), b = int(r, 2, 9);
  if (kind === 0) { const x = int(r, 2, 9), c = x * a + b; return {q: {view: 'riddle', say: `一个数乘 ${a}，再加上 ${b}，得 ${c}。这个数是几？`, text: '□', qk: `R0-${x}-${a}-${b}`, why: `倒着算：${c} − ${b} = ${c - b}，${c - b} ÷ ${a} = ${x}`}, ans: x}; }
  if (kind === 1) { const x = int(r, 2, 9), c = x * a - b; if (c < 1) return null; return {q: {view: 'riddle', say: `一个数乘 ${a}，再减去 ${b}，得 ${c}。这个数是几？`, text: '□', qk: `R1-${x}-${a}-${b}`, why: `倒着算：${c} + ${b} = ${c + b}，${c + b} ÷ ${a} = ${x}`}, ans: x}; }
  const q = int(r, 2, 9), x = q * a, c = q + b;
  return {q: {view: 'riddle', say: `一个数除以 ${a}，再加上 ${b}，得 ${c}。这个数是几？`, text: '□', qk: `R2-${x}-${a}-${b}`, why: `倒着算：${c} − ${b} = ${q}，${q} × ${a} = ${x}`}, ans: x};
});

// ---------- 算式谜（缺一个数字）：两位数加减两位数，□ 在前两个数里，十位不为 0 ----------
fill('dock:g7:cipher', 3703, r => {
  const add = r() < .5, a = int(r, 12, 89), b = int(r, 12, 89), c = add ? a + b : a - b;
  if (c < 10 || c > 99) return null;
  if (add ? (a % 10) + (b % 10) < 10 : (a % 10) >= (b % 10)) return null;   // 要进位 / 退位，才要想
  const which = int(r, 0, 1), pos = int(r, 0, 1), n = which ? b : a, d = pos ? n % 10 : Math.floor(n / 10);
  const sn = String(n), hid = pos ? sn[0] + '□' : '□' + sn[1], op = add ? '+' : '−';
  const text = which ? `${a} ${op} ${hid} = ${c}` : `${hid} ${op} ${b} = ${c}`;
  const back = which ? (add ? `${c} − ${a} = ${b}` : `${a} − ${c} = ${b}`) : (add ? `${c} − ${b} = ${a}` : `${c} + ${b} = ${a}`);
  if (d === 0) return null;   // 答案都是正整数（题库通则）
  return {q: {view: 'eq', say: '方框里是几？', text, qk: `c${text}`, why: `${back}，所以 □ 是 ${d}`}, ans: d};
});

// 第一次见的示范用题池第 1 道（K.example）：植树、锯木头放一道正着问的在最前面
['dock:g5:tree', 'dock:g7:tree2', 'dock:g5:saw'].forEach(id => { const i = P[id].findIndex(x => !/几段？$|几次？$|几刀？$/.test(x.q.say) || /成几段？$/.test(x.q.say)); if (i > 0) P[id].unshift(P[id].splice(i, 1)[0]); });
module.exports = P;
if (require.main === module) Object.entries(P).forEach(([k, v]) => console.log(k, v.length, JSON.stringify(v[0]).slice(0, 220)));
