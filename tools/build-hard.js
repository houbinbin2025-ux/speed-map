// 生成 v2/hardbank.js（高级别题库）。规则见 docs/说明书-难度分级.md；能出的题 ≤ 120 全收，更多的用固定种子抽。用法：node tools/build-hard.js
const fs = require('fs'), path = require('path');
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const shuffle = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const range = (a, b, s = 1) => { const o = []; for (let x = a; x <= b; x += s) o.push(x); return o; };
const take = (l, seed, n = 120) => shuffle(l, rng(seed)).slice(0, n);
const P = {};
// 看数
P['look:h:grid'] = range(2, 5).flatMap(rows => range(2, 6).filter(cols => rows !== cols || rows > 2).map(cols => ({q: {view: 'grid', rows, cols, why: `${rows} 排，每排 ${cols} 个，一共 ${rows * cols} 个`}, ans: rows * cols})));
P['look:h:h100'] = take(range(21, 99), 1, 60).map(n => { const t = Math.floor(n / 10), o = n % 10; return {q: {view: 'h100', n, why: o ? `${t} 行是 ${t * 10}，再加 ${o} 个，是 ${n}` : `${t} 行，每行 10 个，是 ${n}`}, ans: n}; });
// 分合
P['bond:h:tens'] = range(30, 90, 10).flatMap(n => range(10, n - 10, 10).map(a => ({q: {view: 'eq', text: `${n} = ${a} + □`, why: `${n / 10} 个十分成 ${a / 10} 个十和 ${(n - a) / 10} 个十`}, ans: n - a})));
P['bond:h:to100'] = range(10, 90, 10).map(a => ({q: {view: 'eq', text: `${a} + □ = 100`, why: `${a / 10} 个十，再要 ${(100 - a) / 10} 个十就是 100`}, ans: 100 - a})).concat(take(range(11, 89).filter(a => a % 10), 2, 50).map(a => { const up = (Math.floor(a / 10) + 1) * 10; return {q: {view: 'eq', text: `${a} + □ = 100`, why: `${a} 先加 ${up - a} 到 ${up}，再加 ${100 - up} 到 100，一共 ${100 - a}`}, ans: 100 - a}; }));
// 数位
P['place:h:read'] = take(range(101, 999).filter(n => n % 100), 3).map(n => { const h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, o = n % 10; return {q: {view: 'hto', h, t, o, why: `${h} 个百、${t} 个十、${o} 个一，是 ${n}`}, ans: n}; });
const ASK = {h: ['百', n => Math.floor(n / 100)], t: ['十', n => Math.floor(n / 10) % 10], o: ['一', n => n % 10]};
P['place:h:split'] = take(range(101, 999), 4).map((n, i) => { const k = 'hto'[i % 3], [nm, f] = ASK[k]; return {q: {view: 'eq', text: `${n} 里有 □ 个${nm}`, why: `${n} = ${Math.floor(n / 100)} 个百、${Math.floor(n / 10) % 10} 个十、${n % 10} 个一`}, ans: f(n)}; });
// 比大小（大数左右各一半）
const lr = (list) => list.map((x, i) => (i % 2 ? x : {q: Object.assign({}, x.q, {a: x.q.b, b: x.q.a, la: x.q.lb, lb: x.q.la}), ans: x.ans}));
const r5 = rng(5);
P['cmp:h:1000'] = lr(range(1, 120).map(i => { const a = 100 + Math.floor(r5() * 900); let b; const mode = i % 3; if (mode === 0) b = a - a % 100 + (a + 1 + Math.floor(r5() * 8)) % 100; else if (mode === 1) b = (Math.floor(a / 100) % 9 + 1) * 100 + a % 100; else b = 100 + Math.floor(r5() * 900); if (b === a) b = a === 999 ? 998 : a + 1; const hi = Math.max(a, b), lo = Math.min(a, b); return {q: {view: 'pick', a: hi, b: lo, why: Math.floor(hi / 100) !== Math.floor(lo / 100) ? '先比百位，百位大的就大' : '百位一样，再比十位、个位'}, ans: hi}; }));
const exprs = range(2, 9).flatMap(x => range(2, 9).map(y => ({t: `${x} + ${y}`, v: x + y})));
const r6 = rng(6), eq2 = [];
for (let i = 0; i < 400 && eq2.length < 80; i++) { const A = exprs[Math.floor(r6() * exprs.length)], B = exprs[Math.floor(r6() * exprs.length)]; if (A.v === B.v || Math.abs(A.v - B.v) > 4) continue; const hi = A.v > B.v ? A : B, lo = A.v > B.v ? B : A; if (eq2.some(e => e.q.la === hi.t && e.q.lb === lo.t)) continue; eq2.push({q: {view: 'pick', a: hi.v, b: lo.v, la: hi.t, lb: lo.t, why: `${hi.t} = ${hi.v}，${lo.t} = ${lo.v}`}, ans: hi.v}); }
P['cmp:h:expr'] = lr(eq2);
// 数线
P['line:h:1000t'] = range(100, 900, 100).map(target => ({q: {max: 1000, target}, ans: target}));
P['line:h:1000'] = take(range(10, 990, 10).filter(n => n % 100), 7, 60).map(target => ({q: {max: 1000, target, any: true}, ans: target}));
// 秒答
const r8 = rng(8), chain = [];
while (chain.length < 80) { const a = 2 + Math.floor(r8() * 8), b = 1 + Math.floor(r8() * 8), c = 1 + Math.floor(r8() * 8), add = r8() < .4, mix = r8() < .5; let text, ans, why; if (add) { ans = a + b + c; text = `${a} + ${b} + ${c} =`; why = `先算 ${a} + ${b} = ${a + b}，再加 ${c}，是 ${ans}`; } else if (mix) { if (a + b - c < 0) continue; ans = a + b - c; text = `${a} + ${b} − ${c} =`; why = `先算 ${a} + ${b} = ${a + b}，再减 ${c}，是 ${ans}`; } else { const t = 10 + a; if (t - b - c < 0) continue; ans = t - b - c; text = `${t} − ${b} − ${c} =`; why = `先算 ${t} − ${b} = ${t - b}，再减 ${c}，是 ${ans}`; } if (ans > 20 || chain.some(x => x.q.text === text)) continue; chain.push({q: {view: 'eq', text, why}, ans}); }
P['speed:h:chain'] = chain;
const r9 = rng(9), two = [];
while (two.length < 120) { const add = two.length % 2 === 0; let a = 12 + Math.floor(r9() * 76), b = 11 + Math.floor(r9() * 76); if (add) { if (a + b >= 100 || (a % 10) + (b % 10) < 10 || b % 10 === 0 || a % 10 === 0) continue; const t = b - b % 10, up = a + t; two.push({q: {view: 'eq', text: `${a} + ${b} =`, why: `${a} 先加 ${t} 到 ${up}，再加 ${b % 10}，是 ${a + b}`}, ans: a + b}); } else { if (a <= b || (a % 10) >= (b % 10) || b % 10 === 0) continue; const t = b - b % 10; two.push({q: {view: 'eq', text: `${a} − ${b} =`, why: `${a} 先减 ${t} 到 ${a - t}，再减 ${b % 10}，是 ${a - b}`}, ans: a - b}); } if (two.filter(x => x.q.text === two[two.length - 1].q.text).length > 1) two.pop(); }
P['speed:h:two'] = two;
P['speed:h:mul'] = [2, 5, 10].flatMap(k => range(1, 10).map(n => ({q: {view: 'eq', text: `${n} × ${k} =`, why: `${n} 个 ${k}：${Array.from({length: Math.min(n, 4)}, (_, i) => k * (i + 1)).join('、')}${n > 4 ? '…' : ''}，是 ${n * k}`}, ans: n * k})));
// ---------- 11-06 分 15 级补的题（说明书-难度分级） ----------
const story = (say, eq, ans, why) => ({q: {view: 'story', say, text: eq, why}, ans});
const pick = (l, r) => l[Math.floor(r() * l.length)];
P['bond:h:20'] = range(11, 20).flatMap(n => range(1, n - 1).filter(a => a !== n - a || a > 5).map(a => ({q: {view: 'eq', text: `${n} = ${a} + □`, why: `${n} 分成 ${a} 和 ${n - a}`}, ans: n - a})));
// 应用题：只用文字，数大了画不下；每种情况都有
const THINGS = [['苹果', '个'], ['松果', '颗'], ['钻石', '颗'], ['石块', '块'], ['小鱼', '条'], ['贝壳', '个'], ['面包', '个'], ['箭', '支']], WHO = ['小狐狸', '小猫', '小狼', '小羊'];
function stories(maxN, count, seed, ok) {
  const r = rng(seed), out = [], seen = new Set();
  for (let i = 0; i < 5000 && out.length < count; i++) {
    const a = 2 + Math.floor(r() * (maxN - 2)), b = 1 + Math.floor(r() * (maxN - 2)), [th, u] = pick(THINGS, r), w = pick(WHO, r), w2 = pick(WHO.filter(x => x !== w), r), kind = out.length % 4;
    let x = null;
    if (kind === 0 && a + b <= maxN && ok(a, b, '+')) x = story(`${w}有 ${a} ${u}${th}，又得到 ${b} ${u}。一共几${u}？`, `${a} + ${b} = □`, a + b, `合起来用加法：${a} + ${b}`);
    if (kind === 1 && a > b && ok(a, b, '-')) x = story(`${w}有 ${a} ${u}${th}，送出 ${b} ${u}。还剩几${u}？`, `${a} − ${b} = □`, a - b, `送出去了用减法：${a} − ${b}`);
    if (kind === 2 && a > b && ok(a, b, '-')) x = story(`${w}要 ${a} ${u}${th}，已经有 ${b} ${u}。还差几${u}？`, `${a} − ${b} = □`, a - b, `要的减去有的：${a} − ${b}`);
    if (kind === 3 && a > b && ok(a, b, '-')) x = story(`${w}有 ${a} ${u}${th}，${w2}有 ${b} ${u}。${w}多几${u}？`, `${a} − ${b} = □`, a - b, `多的减去少的：${a} − ${b}`);
    if (x && !seen.has(x.q.say)) { seen.add(x.q.say); out.push(x); }
  }
  return out;
}
P['dock:h:20'] = stories(20, 60, 21, (a, b) => Math.max(a, b) > 10);
P['dock:h:50'] = stories(50, 60, 22, (a, b) => Math.max(a, b) > 20 && Math.min(a, b) < 10);   // 第 9 级：两位数和一位数
P['dock:h:100'] = stories(99, 60, 23, (a, b) => Math.max(a, b) > 50);
const rM = rng(24), rD = rng(25);
P['dock:h:mul2'] = [2, 5, 10].flatMap(k => range(2, 9).map(n => { const w = pick(WHO, rM), [th, u] = pick(THINGS, rM); return story(`${w}有 ${n} 盒${th}，每盒 ${k} ${u}。一共几${u}？`, `${n} × ${k} = □`, n * k, `${n} 个 ${k}：${n} × ${k}`); }));
P['dock:h:mul'] = [3, 4, 6, 7, 8, 9].flatMap(k => range(2, 9).map(n => { const w = pick(WHO, rM), [th, u] = pick(THINGS, rM); return story(`${w}有 ${n} 盒${th}，每盒 ${k} ${u}。一共几${u}？`, `${n} × ${k} = □`, n * k, `${n} 个 ${k}：${n} × ${k}`); }));
P['dock:h:div'] = range(2, 9).flatMap(k => range(2, 9).map(n => { const w = pick(WHO, rD), [th, u] = pick(THINGS, rD); return story(`${w}有 ${n * k} ${u}${th}，平均分成 ${k} 份，每份一样多。每份几${u}？`, `${n * k} ÷ ${k} = □`, n, `每份一样多叫平均分，用除法：${n * k} ÷ ${k}`); }));
// 付钱、找零（现行面额，没有 2 元）
const yuan = (l) => { const c = {}; l.forEach(v => { c[v] = (c[v] || 0) + 1; }); return Object.keys(c).sort((a, b) => b - a).map(v => `${c[v]} 张 ${v} 元`).join('，'); };
const rP = rng(26), pay = [], seenP = new Set();
for (let i = 0; i < 3000 && pay.length < 50; i++) { const l = Array.from({length: 2 + Math.floor(rP() * 4)}, () => pick([20, 10, 5, 1], rP)), t = l.reduce((a, b) => a + b, 0), say = `有 ${yuan(l)}。一共几元？`; if (t <= 20 || t > 50 || seenP.has(say)) continue; seenP.add(say); pay.push(story(say, `${l.slice().sort((a, b) => b - a).join(' + ')} = □`, t, `先加大的，再加小的：${l.slice().sort((a, b) => b - a).join(' + ')}`)); }
P['market:h:pay'] = pay;
P['market:h:change'] = [20, 50, 100].flatMap(paid => range(paid === 20 ? 11 : paid === 50 ? 21 : 51, paid - 1).filter(p => paid === 100 ? p % 3 === 0 : true).map(p => story(`东西 ${p} 元，付了 ${paid} 元。找回几元？`, `${paid} − ${p} = □`, paid - p, `付的钱减去东西的价钱：${paid} − ${p}`)));
// 几点几分（5 分钟刻度，写分钟数）
P['market:h:clock'] = range(1, 12).flatMap(h => range(5, 55, 5).filter(m => m !== 30).map(m => ({q: {view: 'clock5', h, m, say: `现在是 ${h} 点几分？`, text: `${h} 点 □ 分`, why: `长针指 ${m / 5}，${m / 5} 个 5 分钟是 ${m} 分`}, ans: m})));
// 跳着数
P['garden:h:skip'] = [3, 4].flatMap(st => range(1, 12).map(k => { const a = st * k; return {q: {view: 'eq', text: `${a}、${a + st}、${a + 2 * st}、□`, why: `每次多 ${st}：${a + 2 * st} + ${st}`}, ans: a + 3 * st}; }));
P['garden:h:down'] = [2, 5, 10].flatMap(st => range(4, 15).filter(k => st * (k + 3) <= 100).map(k => { const a = st * (k + 3); return {q: {view: 'eq', text: `${a}、${a - st}、${a - 2 * st}、□`, why: `每次少 ${st}：${a - 2 * st} − ${st}`}, ans: a - 3 * st}; }));
// 乘除法口诀
P['speed:h:mul2'] = [3, 4, 6, 7, 8, 9].flatMap(k => range(2, 9).map(n => ({q: {view: 'eq', text: `${n} × ${k} =`, why: `${n} 个 ${k} 是 ${n * k}`}, ans: n * k})));
P['speed:h:div'] = range(2, 9).flatMap(k => range(2, 9).map(n => ({q: {view: 'eq', text: `${n * k} ÷ ${k} =`, why: `想乘法：${n} × ${k} = ${n * k}，所以是 ${n}`}, ans: n})));
Object.assign(P, require('./grade34-pools.js'));   // 三四年级第一批（docs/说明书-到四年级第一批.md）
Object.assign(P, require('./grade34b-pools.js'));   // 第二批 2a：线段图、条形图、长方形、选择题（docs/说明书-到四年级第二批.md）
Object.assign(P, require('./grade34c-pools.js'));   // 第二批 2b-1：分数（只问一个数）
Object.assign(P, require('./fun-pools.js'));   // 第三批 3a：趣味题（docs/说明书-第三批.md §四）
const out = `// 空空数学岛 · 挑战题题库（只有数据）。由 tools/build-hard.js 生成；规则见 docs/说明书-难度分级.md；npm test 检查答案\n(function (root, data) {\n  if (typeof module === 'object' && module.exports) module.exports = data;\n  else root.HARDBANK = data;\n})(typeof self !== 'undefined' ? self : this, ${JSON.stringify({pools: P})});\n`;
fs.writeFileSync(path.join(__dirname, '../v2/hardbank.js'), out);
console.log(Object.entries(P).map(([k, v]) => `${k} ${v.length}`).join(' · '), `· ${(out.length / 1024).toFixed(0)} KB`);
