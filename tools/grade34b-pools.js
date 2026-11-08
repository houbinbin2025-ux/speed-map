// 三四年级第二批 2a 题池（docs/说明书-到四年级第二批.md）：线段图 bar、条形图 chart、长方形 rect、选择题 choice。由 tools/build-hard.js 并入 v2/hardbank.js
// 每题 {q: {view, say, text: '□', qk, why, data}, ans}；选择题 {q: {view: 'choice', say, opts, qk, why}, ans: 正确选项的编号}
// 图的数据放 q.data，tests/batch2a.test.js 直接从图的数据重算答案；题面数字都 > 5 的至少一个（不出「所有数字都不超过 5」的题）
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (l, r) => l[Math.floor(r() * l.length)];
const shuffle = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const P = {};
function fill(id, seed, n, make) {
  const r = rng(seed), out = [], seen = new Set();
  for (let i = 0; i < n * 80 && out.length < n; i++) {
    const x = make(r); if (!x) continue;
    if (seen.has(x.q.qk)) continue; seen.add(x.q.qk); out.push(x);
  }
  P[id] = out;
}
const fig = (k, view, say, ans, why, data) => ({q: {view, say, text: '□', qk: k, why, data}, ans});
// 颜色跟着名字走：红花是红色，蓝球是蓝色（原型走查 11-07）
const COL = n => (/^红/.test(n) ? 'red' : /^黄/.test(n) ? 'yellow' : /^蓝/.test(n) ? 'blue' : /^白/.test(n) ? 'white' : /^黑/.test(n) ? 'gray' : null);
const PAIRS = [['红花', '黄花', '朵', '花'], ['红球', '蓝球', '个', '球'], ['大鱼', '小鱼', '条', '鱼'], ['男生', '女生', '个', '学生'], ['红气球', '黄气球', '个', '气球'], ['白羊', '黑羊', '只', '羊']];
const WHO = ['小狐狸', '小猫', '小狼', '小羊'];
const THINGS = [['贝壳', '个'], ['苹果', '个'], ['小鱼', '条'], ['石块', '块']];

// ---------- 第 7 级：线段图求总数、求部分 ----------
fill('dock:g7:bar', 701, 150, r => {
  const [n1, n2, u, noun] = pick(PAIRS, r), seg = (v, name, ask) => ({v, label: ask ? '?' : String(v), name, col: COL(name), ask: ask || undefined});
  if (r() < .5) {
    const a = int(r, 6, 40), b = int(r, 6, 40); if (a + b > 80) return null;
    return fig(`t${a}-${b}-${noun}`, 'bar', `${n1} ${a} ${u}，${n2} ${b} ${u}。一共几${u}？`, a + b, `${a} + ${b} = ${a + b}`, {rows: [{segs: [seg(a, n1), seg(b, n2)]}], top: {label: '?', ask: true}});
  }
  const t = int(r, 14, 80), a = int(r, 6, t - 6), b = t - a;
  return fig(`p${t}-${a}-${noun}`, 'bar', `一共 ${t} ${u}${noun}，${a} ${u}是${n1}，剩下的是${n2}。${n2}几${u}？`, b, `${t} − ${a} = ${b}`, {rows: [{segs: [seg(a, n1), seg(b, n2, true)]}], top: {label: String(t)}});
});

// ---------- 条形图：第 8 级读数，第 9 级比较，第 10 级一格代表 2 或 5 ----------
const SETS = [{names: ['苹果', '梨', '桃', '橘子'], ask: n => `${n}有几个？`, u: '个'}, {names: ['红花', '黄花', '白花', '蓝花'], ask: n => `${n}有几朵？`, u: '朵'}, {names: ['小猫', '小狗', '小羊', '小兔'], ask: n => `${n}钓了几条鱼？`, u: '条'}];
const bars = (r, k, lo, hi, step) => { const set = pick(SETS, r), names = shuffle(set.names, r).slice(0, k), vals = names.map(() => int(r, lo / step, hi / step) * step); return {set, bars: names.map((n, i) => [n, vals[i]])}; };
fill('dock:g8:chart', 801, 150, r => {
  const {set, bars: b} = bars(r, int(r, 3, 4), 2, 10, 1), i = int(r, 0, b.length - 1), [n, v] = b[i]; if (v < 6) return null;
  return fig(`r${b.map(x => x[1]).join('-')}-${i}-${set.u}`, 'chart', set.ask(n), v, `${n}的条顶对着 ${v}`, {bars: b, max: 10, step: 1, ask: {kind: 'read', i}});
});
fill('dock:g9:chart2', 901, 150, r => {
  const {set, bars: b} = bars(r, 3, 2, 10, 1), i = int(r, 0, 2), j = (i + int(r, 1, 2)) % 3, [n1, a] = b[i], [n2, c] = b[j];
  if (a === c || b.every(x => x[1] <= 5)) return null;   // 所有数字都不超过 5 的题剔除
  const big = a > c ? [n1, a] : [n2, c], small = a > c ? [n2, c] : [n1, a], kind = pick(['more', 'less', 'sum'], r);
  if (kind === 'sum') { if (a + c < 6) return null; return fig(`s${b.map(x => x[1]).join('-')}-${i}${j}-${set.u}`, 'chart', `${n1}和${n2}一共几${set.u}？`, a + c, `${a} + ${c} = ${a + c}`, {bars: b, max: 10, step: 1, ask: {kind: 'sum', i, j}}); }
  const d = big[1] - small[1], say = kind === 'more' ? `${big[0]}比${small[0]}多几${set.u}？` : `${small[0]}比${big[0]}少几${set.u}？`;
  return fig(`${kind[0]}${b.map(x => x[1]).join('-')}-${i}${j}-${set.u}`, 'chart', say, d, `${big[1]} − ${small[1]} = ${d}`, {bars: b, max: 10, step: 1, ask: {kind: 'diff', i: b.indexOf(b.find(x => x[0] === big[0])), j: b.indexOf(b.find(x => x[0] === small[0]))}});
});
fill('dock:g10:chart5', 1001, 120, r => {
  const step = r() < .5 ? 2 : 5, max = step * 10, {set, bars: b} = bars(r, int(r, 3, 4), step, max, step), i = int(r, 0, b.length - 1), [n, v] = b[i];
  return fig(`k${step}-${b.map(x => x[1]).join('-')}-${i}-${set.u}`, 'chart', set.ask(n), v, `一格是 ${step}，${n}的条顶对着 ${v}`, {bars: b, max, step, ask: {kind: 'read', i}});
});

// ---------- 长方形：第 8 级边长相加，第 11 级看图求周长，第 12 级面积 ----------
fill('place:g8:side', 802, 120, r => {
  const w = int(r, 4, 15), h = int(r, 3, 12); if (w === h) return null;
  return fig(`s${w}-${h}`, 'rect', '长方形四条边一共长几厘米？', 2 * (w + h), `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}`, {w, h, labels: 'all', ask: 'perim'});
});
fill('dock:g11:perim2', 1101, 120, r => {
  if (r() < .25) { const a = int(r, 6, 30); return fig(`q${a}`, 'rect', '这个正方形的周长是几厘米？', 4 * a, `${a} × 4 = ${4 * a}`, {w: a, h: a, labels: 'one', ask: 'perim'}); }
  const w = int(r, 6, 30), h = int(r, 3, 20); if (w <= h) return null;
  return fig(`r${w}-${h}`, 'rect', '这个长方形的周长是几厘米？', 2 * (w + h), `(${w} + ${h}) × 2 = ${2 * (w + h)}`, {w, h, labels: 'two', ask: 'perim'});
});
fill('place:g12:area2', 1201, 120, r => {
  if (r() < .5) { const w = int(r, 3, 9), h = int(r, 2, 6); if (w * h < 6) return null; return fig(`g${w}-${h}`, 'rect', '每个小方格是 1 平方厘米。这个长方形的面积是几平方厘米？', w * h, `一行 ${w} 格，有 ${h} 行，${w} × ${h} = ${w * h}`, {w, h, labels: 'none', grid: true, ask: 'area'}); }
  const w = int(r, 4, 15), h = int(r, 2, 9); if (w <= h) return null;
  return fig(`a${w}-${h}`, 'rect', '这个长方形的面积是几平方厘米？', w * h, `长 × 宽：${w} × ${h} = ${w * h}`, {w, h, labels: 'two', ask: 'area'});
});

// ---------- 选择题：第 12 级一位小数比大小，第 14 级两位小数比大小（3 个选项；常见错误：位数多的看起来大） ----------
const choice = (k, say, opts, right, why, r) => { const o = shuffle(opts, r); return {q: {view: 'choice', say, opts: o, qk: k, why}, ans: o.indexOf(right)}; };
fill('cmp:g12:deccmp', 1202, 120, r => {
  const ip = int(r, 0, 9), near = r() < .6, vals = new Set();
  while (vals.size < 3) vals.add(near ? `${ip}.${int(r, 1, 9)}` : `${int(r, 0, 9)}.${int(r, 1, 9)}`);
  const l = [...vals], nums = l.map(Number); if (new Set(nums).size < 3) return null;
  const max = r() < .6, right = l[nums.indexOf(max ? Math.max(...nums) : Math.min(...nums))];
  return choice(`${max ? 'x' : 'n'}${l.slice().sort().join('-')}`, max ? '哪个数最大？' : '哪个数最小？', l, right, `${right} ${max ? '最大' : '最小'}`, r);
});
fill('cmp:g14:deccmp', 1401, 120, r => {
  const ip = int(r, 0, 9), a = int(r, 1, 9), b = int(r, 1, 9), l = [`${ip}.${a}`, `${ip}.${b}${int(r, 1, 9)}`, `${ip}.${int(r, 1, 9)}${int(r, 1, 9)}`];
  const nums = l.map(Number); if (new Set(nums).size < 3 || new Set(l).size < 3) return null;
  const max = r() < .5, right = l[nums.indexOf(max ? Math.max(...nums) : Math.min(...nums))];
  return choice(`${max ? 'x' : 'n'}${l.slice().sort().join('-')}`, max ? '哪个数最大？' : '哪个数最小？', l, right, `先比整数，再比十分位、百分位：${right} ${max ? '最大' : '最小'}`, r);
});

// ---------- 倍的线段图（第 9 级）、和倍入门（第 9 级）、和差线段图（第 15 级） ----------
fill('dock:g9:times', 902, 120, r => {
  const [a, b] = shuffle(WHO, r), [th, un] = pick(THINGS, r), u = int(r, 2, 9), k = int(r, 2, 5); if (u * k <= 5) return null;
  return fig(`t${u}-${k}-${th}`, 'bar', `${a}有 ${u} ${un}${th}，${b}的是${a}的 ${k} 倍。${b}有几${un}？`, u * k, `${k} 个 ${u}：${u} × ${k} = ${u * k}`,
    {rows: [{name: a, segs: [{v: u, label: String(u)}]}, {name: b, segs: Array.from({length: k}, () => ({v: u, label: String(u)})), sum: {label: '?', ask: true}}]});
});
fill('dock:g9:sumtimes', 903, 100, r => {
  const [a, b] = shuffle(WHO, r), [th, un] = pick(THINGS, r), u = int(r, 2, 9), k = int(r, 2, 4), t = u * (k + 1); if (t > 50) return null;
  return fig(`s${u}-${k}-${th}`, 'bar', `${a}和${b}一共有 ${t} ${un}${th}，${b}的是${a}的 ${k} 倍。${a}有几${un}？`, u, `一共 ${k + 1} 份，${t} ÷ ${k + 1} = ${u}`,
    {rows: [{name: a, segs: [{v: u, label: '?', ask: true}]}, {name: b, segs: Array.from({length: k}, () => ({v: u, label: ''}))}], side: {label: String(t)}});
});
fill('dock:g15:barsum', 1501, 100, r => {
  const s = int(r, 6, 80), d = int(r, 4, 40), t = 2 * s + d; if (t > 200) return null;
  return fig(`d${t}-${d}`, 'bar', `两个数的和是 ${t}，大的数比小的数多 ${d}。小的数是几？`, s, `去掉多的 ${d}，剩下两个小的数：(${t} − ${d}) ÷ 2 = ${s}`,
    {rows: [{name: '大的数', segs: [{v: s, label: ''}, {v: d, label: String(d)}]}, {name: '小的数', segs: [{v: s, label: '?', ask: true}]}], side: {label: String(t)}});
});

module.exports = P;
