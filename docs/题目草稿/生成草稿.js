// 把 题源-*.js 写成每级一个 JSON，格式对齐 tools/build-hard.js 的 {q, ans}，外加编号、类型、结构出处和校验。用法：node docs/题目草稿/生成草稿.js
'use strict';
const fs = require('fs'), path = require('path');
const NAMES = {
  1: '10 以内的数与分合', 2: '凑十与 10 以内加减', 3: '20 以内的数与不进退位', 4: '20 以内进位退位', 5: '100 以内的数',
  6: '两位数加减一位数', 7: '两位数加减两位数', 8: '三位数与乘法入门', 9: '表内乘除', 10: '万以内的数与有余数除法',
  11: '乘除一位数与分数入门', 12: '两位数乘法、面积、小数入门', 13: '大数、多位数乘除、四则混合', 14: '运算律与小数', 15: '分数进阶与综合应用',
};
let cur, L;
const push = (pool, input, q, ans, source, o = {}, check) => {
  if (o.skip) return;
  const it = {id: `L${String(L).padStart(2, '0')}-${String(cur.length + 1).padStart(3, '0')}`, pool, input, q, ans, kind: o.kind || '应用题', source, fun: !!o.fun};
  if (o.newView) it.newView = o.newView;
  if (o.lowOk) it.lowOk = o.lowOk;
  if (check) it.check = check;
  cur.push(it);
};
// 算式题：不写校验算式时，由核对脚本直接解题面
// 加减缺数题的讲解写出怎么算：a + □ + c = r → r − a − c；a − □ − c = r → a − c − r
function fillWhy(text, ans) {
  const m = /^(.+) = (\d+)$/.exec(text); if (!m || !/^[\d□ +−]+$/.test(m[1])) return null;
  const toks = m[1].split(' '), terms = []; let sign = '+';
  toks.forEach(t => { if (t === '+' || t === '−') sign = t; else terms.push([sign, t]); });
  const box = terms.find(t => t[1] === '□'), rest = terms.filter(t => t !== box), R = m[2];
  if (box[0] === '+') return `${R} ${rest.map(([g, t]) => `${g === '+' ? '−' : '+'} ${t}`).join(' ')} = ${ans}`;
  const [first, ...more] = rest;
  return `${first[1]} ${more.map(([g, t]) => `${g} ${t} `).join('')}− ${R} = ${ans}`;
}
const E = (pool, text, ans, why, source, o = {}) => push(pool, 'write', {view: 'eq', text, why: /^方框里是/.test(why) ? (fillWhy(text, ans) || why) : why}, ans, source, o, o.check);
// 文字题：check 是算式字符串或校验对象
const S = (pool, say, ans, why, check, source, o = {}) => {
  const q = {view: o.view || o.newView || 'story', say, text: o.text || '□'};
  if (o.data) { if (['clock5', 'grid'].includes(q.view)) Object.assign(q, o.data); else q.data = o.data; }
  q.why = why;
  const c = o.check || (typeof check === 'string' ? {expr: check} : check);
  push(pool, 'write', q, ans, source, o, c);
};
// 点选题：选项编号从 1 开始
let seed = 20261106;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const P = (pool, say, optText, ans, why, check, source, o = {}) => {
  const idx = optText.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const shown = idx.map(i => optText[i]), c = Object.assign({}, check);
  if (c.vals) c.vals = idx.map(i => c.vals[i]); if (c.of) c.of = idx.map(i => c.of[i]);
  const q = {view: o.view || o.newView || 'choice', say, opts: shown.map((_, i) => i + 1), optText: shown}; if (o.data) q.data = o.data; q.why = why;
  push(pool, 'pick', q, idx.indexOf(ans - 1) + 1, source, o, c);
};
// 4×4 数独：用 6、7、8、9（避开「所有数字 ≤ 5」）
const G = (pool, g, r, c, ans, why, extra = []) => {
  const grid = g.map(x => x.slice()); extra.forEach(([i, j]) => { grid[i][j] = 0; });
  const q = {view: 'grid4', say: '每行、每列、每个粗线框里 6、7、8、9 各一个。□ 是几？', text: '□', data: {g: grid, r, c}, why: `${why}，是 ${ans}`};
  push(pool, 'write', q, ans, '思维 · 数独入门', {kind: '谜题', fun: true, newView: 'grid4'}, {grid4: 1});
};
const sources = ['题源-L01-05.js', '题源-L06-10.js', '题源-L11-15.js'].map(f => require('./' + f)({E, S, P, G}));
const all = Object.assign({}, ...sources);
fs.readdirSync(__dirname).filter(f => /^L\d\d-.*\.json$/.test(f)).forEach(f => fs.unlinkSync(path.join(__dirname, f)));
Object.keys(all).forEach(k => {
  L = +k; cur = []; all[k]();
  const file = `L${String(L).padStart(2, '0')}-${NAMES[L].replace(/[、 ]/g, '')}.json`;
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify({level: L, name: NAMES[L], items: cur}, null, 1) + '\n');
  console.log(file, cur.length);
});
