// 生成 v2/bank.js（题库）——只在建题库时跑一次，结果提交；以后改题直接改 v2/bank.js，这个脚本留档说明"题是怎么挑出来的"
// 规则（说明书-题库 §2–3）：能出的题 ≤ FULL_MAX 种 → 全收；更多 → 按难点情况分层，每层用固定种子打乱后取（每次跑结果一样；
// 不用"排好序等间隔取"——10-29 审查实测它会和排序撞拍，整类题被漏掉、大数总在右边）
// 用法：node tools/build-bank.js
const fs = require('fs'), path = require('path');
const FULL_MAX = 400, SAMPLE = 120;
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
// 固定种子的随机数（mulberry32）和洗牌
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const shuffle = (list, r) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// 按标签分层：quota = [[标签, 题量]]；每层打乱后取前 n 道（不够就全取）
function strata(all, tagOf, quota, seed) {
  const r = rng(seed), out = [];
  quota.forEach(([tag, n]) => shuffle(all.filter(x => tagOf(x) === tag), r).slice(0, n).forEach(x => out.push(Object.assign({}, x, {tag}))));
  return out;
}
const pairs = (lo, hi) => { const o = []; for (let a = lo; a <= hi; a++) for (let b = lo; b <= hi; b++) if (a !== b) o.push({q: {a, b}, ans: Math.max(a, b)}); return o; };
// 比大小抽样：先按"一对数"抽，再轮流决定大数在左还是在右（左右各一半）
const lr = list => list.map((x, i) => { const lo = Math.min(x.q.a, x.q.b), hi = Math.max(x.q.a, x.q.b); return Object.assign({}, x, {q: i % 2 ? {a: lo, b: hi} : {a: hi, b: lo}}); });
const ALL = {}; // 每个题型能出几种（给家长页显示"能出 N 种，收 M 道"）
const tagAll = (list, tag) => list.map(x => tag ? Object.assign({}, x, {tag: tag(x)}) : x);

// ---------- 理解技能：卡 ----------
const cards = {
  look1: range(1, 6).map(n => ({id: 'look:dice:' + n, q: {n, layout: 'dice'}, ans: n})),
  look2: range(1, 5).map(n => ({id: 'look:scat:' + n, q: {n, layout: 'scat'}, ans: n})),
  look3: range(1, 10).map(n => ({id: 'look:tf:' + n, q: {n, layout: 'tf'}, ans: n})),
  look4: range(11, 20).map(n => ({id: 'look:tf2:' + n, q: {n, layout: 'tf2'}, ans: n})),
};
const bondCards = (lo, hi) => { const o = []; for (let n = lo; n <= hi; n++) for (let a = 1; a < n; a++) o.push({id: `bond:${n}=${a}+_`, q: {n, a, blank: 'part'}, ans: n - a}); return o; };
cards.bond1 = bondCards(2, 5); cards.bond2 = bondCards(6, 9);
cards.bond3 = range(1, 9).map(a => ({id: `bond:10=${a}+_`, q: {n: 10, a, blank: 'part'}, ans: 10 - a}));

// ---------- 理解技能：题型的题目池 ----------
const pools = {};
const whole = (lo, hi) => { const o = []; for (let n = lo; n <= hi; n++) for (let a = 1; a < n; a++) o.push({q: {n, a, b: n - a, blank: 'whole'}, ans: n}); return o; };
pools['bond:t:whole5'] = whole(2, 5);
pools['bond:t:whole9'] = whole(6, 9);
const dTag = x => { const d = Math.abs(x.q.a - x.q.b); return d === 1 ? '差 1' : d <= 3 ? '差 2–3' : '差 4 以上'; };
pools['cmp:t:10'] = tagAll(pairs(1, 10), dTag);
const line = (max, step, any) => range(1, max / step - 1).map(k => { const q = {max, target: k * step}; if (any) q.any = true; return {q, ans: k * step}; });
pools['line:t:10'] = line(10, 1);
pools['line:t:20'] = line(20, 1);
pools['line:t:100t'] = line(100, 10);
pools['line:t:100'] = line(100, 1, true);
// 20 以内谁大（380 种，全收）：每一对数都归进一种情况，不许有"其他"
const c20 = x => { const {a, b} = x.q, k = n => n <= 9 ? 'o' : n % 10 === 0 ? 'r' : 't', s = [k(a), k(b)].sort().join('');
  if (s === 'tt') return '十几比十几';
  if (s === 'ot') return Math.max(a, b) % 10 === Math.min(a, b) ? '十几比一位数 · 13 和 3' : '十几比一位数';
  if (s === 'or') return Math.max(a, b) / 10 === Math.min(a, b) || Math.max(a, b) % 10 === Math.min(a, b) ? '10、20 比一位数 · 20 和 2' : '10、20 比一位数';
  if (s === 'rt') return '10、20 比十几';
  if (s === 'rr') return '10 比 20';
  return '一位数比一位数'; };
pools['cmp:t:20'] = tagAll(pairs(1, 20), c20);
// 缺数算式四种（10 以内全收）
const miss = [];
['addL', 'addR'].forEach(form => { for (let b = 2; b <= 10; b++) for (let a = 1; a < b; a++) miss.push([form, {q: {form, a, b}, ans: b - a}]); });
for (let a = 1; a <= 9; a++) for (let b = 1; b <= 10 - a; b++) miss.push(['subL', {q: {form: 'subL', a, b}, ans: a + b}]);
for (let a = 2; a <= 10; a++) for (let x = 1; x < a; x++) miss.push(['subR', {q: {form: 'subR', a, b: a - x}, ans: x}]);
['addL', 'addR', 'subL', 'subR'].forEach(f => { pools['bond:t:' + f] = miss.filter(m => m[0] === f).map(m => m[1]); });
// 过十准备：k + a = 10 + □，和 11–17
[9, 8, 7].forEach(k => { pools['bond:t:to10-' + k] = range(11 - k, Math.min(9, 17 - k)).map(a => ({q: {k, a}, ans: k + a - 10})); });
// 看十和一写数 20–99（全收），整十单独标出
pools['place:t:read'] = range(20, 99).map(n => ({q: {n, tens: Math.floor(n / 10), ones: n % 10}, ans: n, tag: n % 10 === 0 ? '整十' : '几十几'}));
// 几个十几个一（178 种，全收）：问十 / 问一 × 整十、十几、两位一样、其他
const sTag = x => { const {n, ask} = x.q, w = ask === 'tens' ? '问几个十' : '问几个一';
  return w + ' · ' + (n % 10 === 0 ? '整十' : n < 20 ? '十几' : Math.floor(n / 10) === n % 10 ? '两位一样' : '一般两位数'); };
const split = []; range(11, 99).forEach(n => ['tens', 'ones'].forEach(ask => split.push({q: {n, ask}, ans: ask === 'tens' ? Math.floor(n / 10) : n % 10})));
pools['place:t:split'] = tagAll(split, sTag);
// 两位数谁大（8010 种，抽 120）：十位相同按个位差 1 / 2–4 / 5 以上；十位不同分"十位大、个位小"（41 和 38，只看个位会选错）和"个位也大"
const c100 = x => { const {a, b} = x.q, hi = Math.max(a, b), lo = Math.min(a, b), th = Math.floor(hi / 10), tl = Math.floor(lo / 10), d = hi % 10 - lo % 10;
  if (a % 10 === 0 || b % 10 === 0) return '有整十';
  if (th === tl) return d === 1 ? '十位相同 · 个位差 1' : d <= 4 ? '十位相同 · 个位差 2–4' : '十位相同 · 个位差 5 以上';
  return hi % 10 < lo % 10 ? '十位大、个位小' : '十位大、个位也大'; };
const half = pairs(10, 99).filter(x => x.q.a < x.q.b);
ALL['cmp:t:100'] = half.length * 2;
pools['cmp:t:100'] = lr(shuffle(strata(half, c100, [['十位相同 · 个位差 1', 12], ['十位相同 · 个位差 2–4', 12], ['十位相同 · 个位差 5 以上', 12], ['十位大、个位小', 42], ['十位大、个位也大', 30], ['有整十', 12]], 100), rng(101)));
const swap = []; for (let t = 1; t <= 9; t++) for (let o = 1; o <= 9; o++) if (t !== o) { const a = t * 10 + o, b = o * 10 + t; swap.push({q: {a, b}, ans: Math.max(a, b)}); }
pools['cmp:t:swap'] = swap;
// 前后数（全收）；多 1 / 少 1 里跨十的单独标出
const near = (d, lo, hi) => range(lo, hi).map(n => { const m = n + d, x = {q: {n, d}, ans: m}; if (Math.abs(d) === 1) x.tag = Math.floor(m / 10) !== Math.floor(n / 10) ? '跨十' : '不跨十'; return x; });  // 多 10 / 少 10 每道都变十位，不分情况
pools['cmp:t:p1'] = near(1, 10, 98); pools['cmp:t:m1'] = near(-1, 11, 99);
pools['cmp:t:p10'] = near(10, 10, 89); pools['cmp:t:m10'] = near(-10, 20, 99);

// ---------- 秒答 L1 / L2：卡（和 core.js 原来的循环一模一样的顺序和编号） ----------
const speedCards = [];
const sc = (L, w, a, op, b, fast) => speedCards.push({L, w, a, op, b, fast});
[[2, 3, 4, 5], [6], [7], [8], [9], [10], null].forEach((nums, w) => {
  const add = [], sub = [];
  if (!nums) { [2, 4, 6, 8, 10].forEach(n => { add.push([n, 0]); sub.push([n, 0]); }); [1, 3, 5, 7, 9].forEach(n => { add.push([0, n]); sub.push([n, n]); }); }
  else nums.forEach(n => { for (let a = 1; a < n; a++) { add.push([a, n - a]); sub.push([n, a]); } });
  add.forEach(([a, b]) => sc(0, w, a, '+', b, 2000)); sub.forEach(([a, b]) => sc(0, w, a, '-', b, 2000));
});
for (let n = 1; n <= 9; n++) sc(1, 0, 10, '+', n, 3000);
for (let n = 1; n <= 9; n++) sc(1, 0, 10 + n, '-', n, 3000);
const addMax = (w, m) => { for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if (a + b >= 11 && Math.max(a, b) === m) sc(1, w, a, '+', b, 3000); };
addMax(1, 9); addMax(2, 8); addMax(3, 7); addMax(3, 6);
const subBy = (w, b) => { for (let s = 11; s <= 18; s++) if (s - b <= 9 && s - b >= 1) sc(1, w, s, '-', b, 3000); };
subBy(4, 9); subBy(5, 8); subBy(6, 7); subBy(6, 6); [5, 4, 3, 2].forEach(b => subBy(7, b));

// ---------- 秒答 L3 / L4：题型池（规则同 core.js 原来的 TYPES） ----------
const TYPES = [
  ['add10', '+', (a, b) => a % 10 === 0 && b % 10 === 0 && a >= 10 && b >= 10],
  ['add1n', '+', (a, b) => a >= 11 && a % 10 > 0 && b <= 9 && a % 10 + b <= 9],
  ['add1c', '+', (a, b) => a >= 11 && b <= 9 && a % 10 + b >= 10],
  ['addT', '+', (a, b) => a >= 11 && a % 10 > 0 && b >= 10 && b % 10 === 0],
  ['add2n', '+', (a, b) => a >= 11 && b >= 11 && a % 10 > 0 && b % 10 > 0 && a % 10 + b % 10 <= 9],
  ['add2c', '+', (a, b) => a >= 11 && b >= 11 && a % 10 + b % 10 >= 10],
  ['sub10', '-', (a, b) => a % 10 === 0 && b % 10 === 0 && b >= 10 && a > b],
  ['sub1n', '-', (a, b) => a >= 11 && b <= 9 && a % 10 >= b],
  ['sub1c', '-', (a, b) => a >= 11 && b <= 9 && b > a % 10],
  ['subT', '-', (a, b) => a >= 11 && a % 10 > 0 && b >= 10 && b % 10 === 0 && b < a],
  ['sub2n', '-', (a, b) => b >= 11 && b % 10 > 0 && b < a && a % 10 >= b % 10],
  ['sub2c', '-', (a, b) => b >= 11 && b < a && b % 10 > a % 10],
];
const speedPools = {};
const HARD = {add2c: x => x.ans % 10 === 0, sub2c: x => x.a % 10 === 0, sub2n: x => x.ans < 10, add1c: x => x.ans % 10 === 0, sub1c: x => x.a % 10 === 0};
[['L3', 50], ['L4', 100]].forEach(([L, R]) => TYPES.forEach(([k, op, ok]) => {
  const all = [];
  for (let a = 1; a <= R; a++) for (let b = 1; b <= R; b++) {
    const ans = op === '+' ? a + b : a - b;
    if (ans < 0 || ans > R || !ok(a, b)) continue;
    if (R === 100 && Math.max(a, b, ans) <= 50) continue;
    all.push({a, b, ans});
  }
  let pick = all;
  if (all.length > FULL_MAX) { // 先留难点题（凑成整十 / 被减数是整十 / 得数是一位数）最多 24 道，其余按第二个数的个位分层，每个个位都有
    const r = rng(L === 'L3' ? 3 : 4), hard = HARD[k] ? shuffle(all.filter(x => HARD[k](x)), r).slice(0, 24) : [];
    const rest = all.filter(x => !hard.includes(x)), by = {}; rest.forEach(x => (by[x.b % 10] = by[x.b % 10] || []).push(x));
    const keys = Object.keys(by).map(Number).sort((x, y) => x - y), left = SAMPLE - hard.length;
    const quota = keys.map(d => Math.max(2, Math.round(left * by[d].length / rest.length)));
    while (quota.reduce((s, n) => s + n, 0) > left) quota[quota.indexOf(Math.max(...quota))]--;
    while (quota.reduce((s, n) => s + n, 0) < left) quota[quota.indexOf(Math.max(...quota))]++;
    pick = hard.concat(keys.flatMap((d, i) => shuffle(by[d], r).slice(0, quota[i]))).sort((x, y) => x.a - y.a || x.b - y.b);
  }
  speedPools[L + ':' + k] = {all: all.length, pool: pick.map(x => [x.a, x.b])};
}));

// ---------- 给家长看的话：学什么 / 怎么教（"怎样算学会"按格子规则自动生成，不写在这里） ----------
const TEXT = {
  look1: ['一眼认出骰子上的 1–6 个点，不一个一个数', '示范卡演示"看形状就知道是几"；答错重新显示图案和数字'],
  look2: ['一眼认出随便摆的 1–5 个点', '答错重新显示图案和数字'],
  look3: ['看一个十格框就知道是几：上面一排满了是 5，再看下面几个', '答错按"5 和几"标出来'],
  look4: ['看两个十格框：满的一框是 10，再加第二框的几个，认出 11–20', '答错标出"10 和几"'],
  bond1: ['2–5 能分成哪两个数，两个数合起来是几', '示范卡把圆点分成两堆、再变成分合图；答错用十格框画出两部分'],
  bond2: ['6–9 能分成哪两个数，两个数合起来是几', '答错用十格框画出两部分'],
  bond3: ['一个数和几凑成 10（以后算进位加法要用）', '答错用十格框画出几个实心点和几个空格'],
  bond4: ['看懂 □ + 3 = 7、7 − □ = 3 这类算式，用分合找出空格里的数', '答错用分合图讲'],
  bond5: ['9 + 5 先拿 1 凑成 10，还剩几（为 20 以内进位加法做准备）', '答错用两个十格框演示"挪过去凑满 10，还剩几"'],
  cmp1: ['两个 10 以内的数，点出大的那个', '答错把两个数放在小数线上，右边的大'],
  cmp2: ['两个 20 以内的数，点出大的那个（含 13 和 3 这种）', '答错把两个数放在小数线上，右边的大'],
  cmp3: ['两个两位数比大小：先比几个十，几个十一样再比几个一（含 47 和 74 这种易混的）', '答错把两个数放在小数线上，右边的大'],
  cmp4: ['比一个数多 1、少 1、多 10、少 10 是几（多 10 = 多 1 个十，一不变）', '答错在小数线上从这个数跳过去'],
  place1: ['看几根十条和几个一，写出这个数（4 根十条、3 个一是 43）', '示范卡演示"10 个一拼成 1 根十条"；答错在十条和方块旁标数字'],
  place2: ['说出一个两位数里有几个十、几个一', '答错在十条和方块旁标数字'],
  line1: ['在 0—10 的线上把旗子插到这个数的位置', '答错插绿旗标出正确位置，说"再往左 / 右一点"'],
  line2: ['在 0—20 的线上把旗子插到这个数的位置', '答错插绿旗标出正确位置'],
  line3: ['在 0—100 的线上找整十的位置', '答错插绿旗标出正确位置'],
  line4: ['在 0—100 的线上找任意数的大概位置（中间标了 50）', '答错插绿旗标出正确位置'],
  speedL1: ['10 以内加减口算，又对又快（2 秒内）', '答错显示正确算式，进错题本按间隔再出'],
  speedL2: ['20 以内加减口算（进位、退位），又对又快（3 秒内）', '答错显示正确算式和一句做法（进位先凑整十，退位先退到整十，两位数先算几个十），进错题本按间隔再出'],
  speedL3: ['50 以内加减，按题型练到又对又快', '答错显示正确算式和一句做法（进位先凑整十，退位先退到整十，两位数先算几个十），进错题本按间隔再出'],
  speedL4: ['100 以内加减，按题型练到又对又快', '答错显示正确算式和一句做法（进位先凑整十，退位先退到整十，两位数先算几个十），进错题本按间隔再出'],
};

Object.keys(pools).forEach(id => { if (!ALL[id]) ALL[id] = pools[id].length; });
const bank = {meta: {FULL_MAX, SAMPLE, built: '2026-10-29', how: 'tools/build-bank.js 生成后人工核对',
  rules: '改题规则：卡和题型的编号只增不删；卡的题目不许改（要改就换新编号，否则孩子在这张卡上的颜色变成另一道题的）；题型的题目池可以增删', all: ALL}, text: TEXT, cards, pools, speedCards, speedPools};
const body = JSON.stringify(bank, null, 0).replace(/\],"/g, '],\n"').replace(/\},\{/g, '},\n{');
const out = `// 空空数学岛 · 题库（只有数据，没有逻辑）：每个技能有哪些题、答案、属于哪种难点；出题只从这里取
// 规则见 docs/说明书-题库.md；最初由 tools/build-bank.js 生成，以后改题直接改这里（npm test 会检查答案、范围、覆盖）
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.BANK = data;
})(typeof self !== 'undefined' ? self : this, ${body});
`;
fs.writeFileSync(path.join(__dirname, '../v2/bank.js'), out);
const nP = Object.values(pools).reduce((s, p) => s + p.length, 0), nC = Object.values(cards).reduce((s, c) => s + c.length, 0), nS = Object.values(speedPools).reduce((s, p) => s + p.pool.length, 0);
console.log(`题库：理解卡 ${nC} · 理解题型 ${Object.keys(pools).length} 个共 ${nP} 道 · 秒答卡 ${speedCards.length} · 秒答题型 ${Object.keys(speedPools).length} 个共 ${nS} 道 · ${(out.length / 1024).toFixed(0)} KB`);
