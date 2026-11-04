// 生成 v2/hardbank.js（挑战题题库）。规则见 docs/说明书-挑战题.md；能出的题 ≤ 120 全收，更多的用固定种子抽。用法：node tools/build-hard.js
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
const out = `// 空空数学岛 · 挑战题题库（只有数据）。由 tools/build-hard.js 生成；规则见 docs/说明书-挑战题.md；npm test 检查答案\n(function (root, data) {\n  if (typeof module === 'object' && module.exports) module.exports = data;\n  else root.HARDBANK = data;\n})(typeof self !== 'undefined' ? self : this, ${JSON.stringify({pools: P})});\n`;
fs.writeFileSync(path.join(__dirname, '../v2/hardbank.js'), out);
console.log(Object.entries(P).map(([k, v]) => `${k} ${v.length}`).join(' · '), `· ${(out.length / 1024).toFixed(0)} KB`);
