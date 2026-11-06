// 生成 v2/placebank.js（故事码头、规律花园、钟楼集市的题）。意图：docs/意图-v6-三个新关卡.md。用法：node tools/build-places.js
const fs = require('fs'), path = require('path');
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const shuffle = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const range = (a, b, s = 1) => { const o = []; for (let x = a; x <= b; x += s) o.push(x); return o; };
const P = {};
const ORES = ['金', '钻', '铁'];
// 故事码头（答案或总数都超过 5）
P['dock:t:join'] = range(1, 9).flatMap(a => range(1, 9).filter(b => a + b >= 6 && a + b <= 10).map(b => ({q: {view: 'join', a, b, c: (a * 7 + b) % 3, say: `矿车里有 ${a} 块${ORES[(a * 7 + b) % 3]}矿，又装进 ${b} 块。一共几块？`, eq: `${a} + ${b} = ${a + b}`, why: `${a} 块和 ${b} 块合起来`}, ans: a + b})));
P['dock:t:take'] = range(6, 10).flatMap(a => range(1, a - 1).map(b => ({q: {view: 'take', a, b, say: `有 ${a} 只羊，跑走 ${b} 只。还剩几只？`, eq: `${a} − ${b} = ${a - b}`, why: `从 ${a} 只里去掉 ${b} 只`}, ans: a - b})));
P['dock:t:need'] = range(6, 10).flatMap(a => range(2, a - 1).map(b => ({q: {view: 'need', a, b, say: `${a} 只小狼，每只吃 1 根骨头。有 ${b} 根，还差几根？`, eq: `${a} − ${b} = ${a - b}`, why: `一只对一根，没对上的就是还差的`}, ans: a - b})));
P['dock:t:more'] = range(6, 10).flatMap(a => range(2, a - 1).map(b => ({q: {view: 'more', a, b, say: `小狐狸 ${a} 个苹果，小猫 ${b} 个。小狐狸多几个？`, eq: `${a} − ${b} = ${a - b}`, why: `一个对一个，多出来的就是多几个`}, ans: a - b})));
// 规律花园：颜色编号 1 红 2 蓝 3 金 4 钻 5 绿 6 铁
const pats = [[1, 2], [3, 3, 4], [5, 1, 1], [2, 3, 5], [1, 1, 2, 2], [4, 6], [3, 4, 4], [6, 6, 1]], NM = {1: '红', 2: '蓝', 3: '黄', 4: '青', 5: '绿', 6: '灰'};
const r1 = rng(11);
P['garden:t:next'] = pats.flatMap(p => range(p.length * 2, p.length * 3 - 1).map(n => { const seq = Array.from({length: n}, (_, i) => p[i % p.length]), ans = p[n % p.length], others = shuffle([1, 2, 3, 4, 5, 6].filter(x => x !== ans), r1).sort((x, y) => p.includes(y) - p.includes(x)).slice(0, 2); return {q: {view: 'pat', seq, opts: shuffle([ans, ...others], r1), say: '下一块是什么？', why: `规律是 ${p.map(c => NM[c]).join(' ')}，下一块是${NM[ans]}`}, ans}; }));
P['garden:t:skip'] = [2, 5, 10].flatMap(st => range(1, 6).map(k => { const a = st * k, l = [a, a + st, a + 2 * st]; return {q: {view: 'seq', l, say: `每次多 ${st}。下一个是几？`, eq: `${l[2]} + ${st} = ${l[2] + st}`, why: `每次多 ${st}`}, ans: l[2] + st}; }));
const r2 = rng(12);
P['garden:t:bad'] = [2, 5, 10].flatMap(st => range(1, 6).flatMap(k => [1, 2, 3].map(pos => { const l = range(0, 4).map(i => st * k + st * i), right = l[pos]; l[pos] += r2() < .5 ? 1 : -1; if (l.includes(right)) return null; return {q: {view: 'bad', l, say: '哪个数错了？', why: `每次多 ${st}，这里应该是 ${right}`}, ans: l[pos]}; }))).filter(Boolean);
// 钟楼集市
P['market:t:hour'] = range(1, 12).map(h => ({q: {view: 'clock', h, m: 0, say: '现在是几点？', eq: `${h} 点`, why: `短针指 ${h}，长针指 12`}, ans: h}));
const r3 = rng(13);
P['market:t:half'] = range(1, 11).map(h => ({q: {view: 'clock', h, m: 30, say: '现在是几点？', opts: shuffle([h * 10 + 3, (h + 1) * 10 + 3, h * 10], r3), why: `长针指 6 是半点；短针刚过 ${h}，是 ${h} 点半`}, ans: h * 10 + 3}));
const bills = [[5, 1], [5, 1, 1], [5, 1, 1, 1], [5, 5], [5, 5, 1], [10, 1], [10, 1, 1], [10, 5], [10, 5, 1], [10, 5, 1, 1], [5, 5, 5], [10, 10], [1, 1, 1, 1, 1, 1], [5, 5, 1, 1], [10, 10, 1]];   // 只用现行面额，没有 2 元
const items = ['torch', 'cake', 'deco0', 'pick1'];
P['market:t:pay'] = bills.map((l, i) => { const t = l.reduce((a, b) => a + b, 0); return {q: {view: 'pay', bills: l, item: items[i % 4], say: '把钱加起来。一共几元？', eq: `${l.join(' + ')} = ${t}`, why: `先加大的，再加小的`}, ans: t}; });
P['market:t:change'] = range(1, 9).map((p, i) => ({q: {view: 'change', p, item: items[i % 4], say: `东西 ${p} 元，付了 10 元。找回几元？`, eq: `10 − ${p} = ${10 - p}`, why: `付的钱减去东西的价钱`}, ans: 10 - p}));
const TEXT = {
  dockA: ['两堆东西合起来是多少', '先看两边各有几个，再合起来；不会就一个一个数图'], dockB: ['从一堆里拿走一些，还剩多少', '看半透明的是跑走的，数剩下的'], dockC: ['一一对应，看缺几个', '上下一个对一个，没对上的就是还差的'], dockD: ['两堆比，多几个（最难的一种）', '左边对齐，多出来的就是多几个，也就是减法'],
  gardenA: ['看出颜色的规律，接下一块', '先读出来：红蓝、红蓝……读顺了就知道下一块'], gardenB: ['2 个 2 个、5 个 5 个、10 个 10 个地数', '为以后的乘法口诀打底；可以用手指跳着数'], gardenC: ['在一串有规律的数里找错的', '先看前面两个数差几，再一个个往后查'],
  clockA: ['认整点', '短针指几就是几点，长针指 12'], clockB: ['认半点', '长针指 6 是半点，短针刚过几就是几点半'], money1: ['几张钱合起来是多少', '先加大的，再加小的'], money2: ['付 10 元能找回多少', '就是 10 减几，和凑十是一回事'],
};
const out = `// 空空数学岛 · 故事码头、规律花园、钟楼集市的题库（只有数据）。由 tools/build-places.js 生成；npm test 检查答案\n(function (root, data) {\n  if (typeof module === 'object' && module.exports) module.exports = data;\n  else root.PLACEBANK = data;\n})(typeof self !== 'undefined' ? self : this, ${JSON.stringify({pools: P, text: TEXT})});\n`;
fs.writeFileSync(path.join(__dirname, '../v2/placebank.js'), out);
console.log(Object.entries(P).map(([k, v]) => `${k} ${v.length}`).join(' · '));
