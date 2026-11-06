// 独立核对题目草稿。用法：node docs/题目草稿/核对答案.js
// 不读题源、不复用生成脚本的任何函数，只读 L*.json。答案用精确分数（BigInt）从题面或校验算式重算；谜题用穷举。
'use strict';
const fs = require('fs'), path = require('path');
const DIR = __dirname;

// ---------- 精确有理数 ----------
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; };
const R = (n, d = 1n) => { if (d === 0n) throw new Error('除以 0'); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d); return {n: n / g, d: d / g}; };
const add = (a, b) => R(a.n * b.d + b.n * a.d, a.d * b.d), sub = (a, b) => R(a.n * b.d - b.n * a.d, a.d * b.d), mul = (a, b) => R(a.n * b.n, a.d * b.d), div = (a, b) => R(a.n * b.d, a.d * b.n);
const eq = (a, b) => a.n === b.n && a.d === b.d;
const num = s => { const [i, f = ''] = String(s).split('.'); return R(BigInt(i + f), 10n ** BigInt(f.length)); };
const show = a => { const whole = a.d === 1n ? String(a.n) : `${a.n}/${a.d}`; return whole; };
// 递归下降：+ − × ÷ / ( )
function evalExpr(src) {
  const t = String(src).replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '').replace(/\s+/g, '');
  let i = 0;
  const atom = () => {
    if (t[i] === '(') { i++; const v = expr(); if (t[i] !== ')') throw new Error('括号不配对：' + src); i++; return v; }
    const m = /^\d+(\.\d+)?/.exec(t.slice(i)); if (!m) throw new Error('无法解析：' + src);
    i += m[0].length; return num(m[0]);
  };
  const term = () => { let v = atom(); while (t[i] === '*' || t[i] === '/') { const o = t[i++]; const w = atom(); v = o === '*' ? mul(v, w) : div(v, w); } return v; };
  const expr = () => { let v = term(); while (t[i] === '+' || t[i] === '-') { const o = t[i++]; const w = term(); v = o === '+' ? add(v, w) : sub(v, w); } return v; };
  const v = expr(); if (i !== t.length) throw new Error('有多余内容：' + src); return v;
}

// ---------- 从算式题面解答案 ----------
function holds(text, x) {
  const s = text.replace(/□/g, String(x));
  // 比如 3.□ = 把数字接进小数；17 ÷ 5 = 3 余 2
  let m;
  if ((m = /^(.+)=(.+)余(.+)$/.exec(s))) {
    const a = evalExpr(m[1].split('÷')[0]), b = evalExpr(m[1].split('÷')[1]), q = evalExpr(m[2]), r = evalExpr(m[3]);
    return eq(add(mul(b, q), r), a) && r.n >= 0n && sub(r, b).n < 0n;
  }
  const parts = s.split('=');
  if (parts.length !== 2) throw new Error('不是等式：' + text);
  return eq(evalExpr(parts[0]), evalExpr(parts[1]));
}
function checkEq(it) {
  const t = it.q.text;
  if (/=\s*$/.test(t) && !t.includes('□')) { const v = evalExpr(t.replace(/=\s*$/, '')); return eq(v, evalExpr(String(it.ans))) ? null : `算出 ${show(v)}，写的 ${it.ans}`; }
  if (!t.includes('□')) return '题面没有空位，也没有校验算式';
  if ((t.match(/□/g) || []).length !== 1) return '题面有多个空位';
  if (!holds(t, it.ans)) return `代入 ${it.ans} 不成立`;
  const digitSlot = /\d□|\.□/.test(t);   // 3.□、1.8□ 这种空位只能填一个数字
  for (let x = 0; x <= (digitSlot ? 9 : 300); x++) if (x !== it.ans) { let ok = false; try { ok = holds(t, x); } catch (e) { ok = false; } if (ok) return `答案不唯一：${x} 也成立`; }
  return null;
}

// ---------- 谜题求解器 ----------
function solveGrid4(g) { // 4×4 数独，用格子里出现的四个数字，0 是空
  const sym = [...new Set(g.flat().filter(Boolean))]; if (sym.length !== 4) return {err: '提示里必须出现全部 4 个数字'};
  const a = g.map(r => r.slice()), sols = [];
  const ok = (r, c, v) => { for (let k = 0; k < 4; k++) if (a[r][k] === v || a[k][c] === v) return false; const R0 = r - r % 2, C0 = c - c % 2; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (a[R0 + i][C0 + j] === v) return false; return true; };
  const go = p => { if (sols.length > 1) return; if (p === 16) { sols.push(a.map(r => r.slice())); return; } const r = p >> 2, c = p & 3; if (a[r][c]) { const v = a[r][c]; a[r][c] = 0; if (ok(r, c, v)) { a[r][c] = v; go(p + 1); } a[r][c] = v; return; } for (const v of sym) if (ok(r, c, v)) { a[r][c] = v; go(p + 1); a[r][c] = 0; } };
  go(0); return {sols};
}
function solveMagic(g, sum) { // 3×3 幻方，0 是空；每行每列每条对角线之和 = sum
  const blanks = []; g.forEach((r, i) => r.forEach((v, j) => { if (!v) blanks.push([i, j]); }));
  const a = g.map(r => r.slice()), used = new Set(g.flat().filter(Boolean)), sols = [];
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const go = k => { if (k === blanks.length) { const f = a.flat(); if (lines.every(l => l.reduce((s, x) => s + f[x], 0) === sum)) sols.push(f.slice()); return; } const [i, j] = blanks[k]; for (let v = 1; v <= 30; v++) if (!used.has(v)) { a[i][j] = v; used.add(v); go(k + 1); used.delete(v); a[i][j] = 0; } };
  go(0); return sols;
}
function solvePyr(rows, op) { // 数塔：上层每格 = 下面相邻两格之和（op=+）。rows 从上到下，0 是空，只有一个空
  const row = rows.findIndex(r => r.includes(0)), col = rows[row].indexOf(0);
  const f = (a, b) => a + b; const res = [];
  for (let v = 0; v <= 2000; v++) { const t = rows.map(r => r.slice()); t[row][col] = v; let ok = true; for (let i = 0; i + 1 < t.length; i++) for (let j = 0; j < t[i].length; j++) if (t[i][j] !== f(t[i + 1][j], t[i + 1][j + 1])) ok = false; if (ok) res.push(v); }
  return res;
}
function solveOrder(pairs, ask) { // pairs: [[大, 小], …]；ask: max / min。答案必须唯一
  const names = [...new Set(pairs.flat())], low = n => pairs.some(p => p[1] === n), high = n => pairs.some(p => p[0] === n);
  const c = names.filter(n => (ask === 'max' ? !low(n) : !high(n)));
  return c;
}
function legs(o) { // 鸡兔同笼式穷举：o = {heads, legs, a, b, ask:'a'|'b'}
  const res = []; for (let x = 0; x <= o.heads; x++) { const y = o.heads - x; if (x * o.a + y * o.b === o.legs) res.push(o.ask === 'a' ? x : y); } return res;
}
function digitPuzzle(o) { // 算式谜 □ 换成同一个数字：o = {expr:'□ × 7 = 5□' , range}
  const res = []; for (let d = 0; d <= 9; d++) { const s = o.expr.replace(/□/g, String(d)); const [l, r] = s.split('='); if (eq(evalExpr(l), evalExpr(r))) res.push(d); } return res;
}

// ---------- 范围 ----------
const CAP = {1: 10, 2: 10, 3: 20, 4: 20, 5: 100, 6: 100, 7: 100, 8: 1000, 9: 100, 10: 10000, 11: 10000, 12: 10000, 13: 1e9, 14: 1e9, 15: 1e9};
const OPS = {1: '+−', 2: '+−', 3: '+−', 4: '+−', 5: '+−', 6: '+−', 7: '+−', 8: '+−×', 9: '+−×÷'};
const CONST = new Set(['0', '1', '2', '3', '4', '5', '7', '10', '12', '24', '60', '100', '180', '360', '1000']);   // 换算和图形常数
const KINDS = ['计算', '填空', '应用题', '钱', '时间', '长度重量', '分数', '小数', '几何', '图表', '规律', '逻辑', '谜题', '趣味'];
const TRAD = /[數學題們這個為與對點時間錢長圖問選應總買賣車過還邊麼樣]/;
const BAD_UNIT = /美元|美分|新元|新币|台币|新台币|韩元|日元|港元|英寸|英尺|\d\s*码(?!头)|磅|盎司|加仑|英里|dollar|cent/;
const numsIn = s => (String(s).match(/\d+(?:\.\d+)?/g) || []);

function checkItem(it, L) {
  const errs = [], q = it.q || {};
  for (const f of ['id', 'pool', 'input', 'kind', 'source']) if (!it[f]) errs.push('缺字段 ' + f);
  if (!KINDS.includes(it.kind)) errs.push('类型不在清单：' + it.kind);
  if (!q.why) errs.push('缺讲解');
  if (!q.view) errs.push('缺 view');
  const shown = [q.say, q.text, (q.optText || []).join(' ')].filter(Boolean).join(' ');
  if (!shown) errs.push('没有题面');
  if (/[！!]/.test(shown + q.why)) errs.push('有感叹号');
  if (/[吧啦哦呢呀哇]/.test(shown)) errs.push('有语气词');
  if (TRAD.test(shown + q.why)) errs.push('有繁体字');
  if (BAD_UNIT.test(shown + q.why)) errs.push('有外国单位或货币');
  if (q.say && q.say.length > 48) errs.push(`题干 ${q.say.length} 字，超过 48`);
  if (q.why.length > 42) errs.push(`讲解 ${q.why.length} 字，超过 42`);
  // 题面数据格式：和 render.js 现有读法对齐（读法见规划 §6）
  if (it.input === 'write' && (!q.text || (!q.text.includes('□') && !/=\s*$/.test(q.text)))) errs.push('手写题的 q.text 必须有 □ 或以 = 结尾');
  if (q.view === 'clock5' && (q.h === undefined || q.m === undefined)) errs.push('clock5 缺 q.h 或 q.m');
  if (q.view === 'grid' && (q.rows === undefined || q.cols === undefined)) errs.push('grid 缺 q.rows 或 q.cols');
  if (q.view === 'chart' && numsIn(q.say).some(n => q.data.vals.includes(Number(n)))) errs.push('图表题把数据写进了题干，没考读图');
  // 浮点误差外泄：小数位最多 3 位
  if (/\d\.\d{4,}/.test(shown + q.why)) errs.push('小数位过多，疑似浮点误差');
  if (/^方框里是/.test(q.why)) errs.push('讲解只有模板句，没讲怎么算');
  // 答案
  let manual = false;
  const c = it.check;
  try {
    if (it.input === 'pick') {
      if (!Array.isArray(q.opts) || !Array.isArray(q.optText) || q.opts.length !== q.optText.length) errs.push('点选项不完整');
      else if (!q.opts.includes(it.ans)) errs.push('答案不在选项里');
      if (new Set(q.optText).size !== q.optText.length) errs.push('选项重复');
      const right = q.optText[q.opts.indexOf(it.ans)];
      if (right && !q.why.includes(right)) errs.push('讲解里没有正确选项');
      if (c && c.vals) { // 每个选项一个算式，按 rule 选
        const v = c.vals.map(evalExpr);
        let best = 0; v.forEach((x, i) => { const cmp = sub(x, v[best]); if (c.rule === 'max' ? cmp.n > 0n : cmp.n < 0n) best = i; });
        if (v.filter(x => eq(x, v[best])).length > 1) errs.push('最大或最小不唯一');
        if (q.opts[best] !== it.ans) errs.push(`算出应选第 ${best + 1} 项`);
      } else if (c && c.value) { // 选等于 value 的项
        const target = evalExpr(c.value), v = c.of.map(evalExpr), hit = v.map((x, i) => (eq(x, target) ? i : -1)).filter(i => i >= 0);
        if (hit.length !== 1) errs.push('等于目标的选项不是 1 个'); else if (q.opts[hit[0]] !== it.ans) errs.push('选错了等值项');
      } else if (c && c.order) {
        const s = solveOrder(c.order, c.ask); if (s.length !== 1) errs.push('排序结论不唯一：' + s); else if (s[0] !== right) errs.push(`排序应选 ${s[0]}`);
      } else if (c && c.mod7) {
        const days = ['日', '一', '二', '三', '四', '五', '六'], d = (c.mod7[0] + c.mod7[1]) % 7; if (!right.endsWith(days[d])) errs.push('星期算错，应是星期' + days[d]);
      } else if (c && c.cycle) {
        const w = c.cycle.list[(c.cycle.n - 1) % c.cycle.list.length]; if (w !== right) errs.push('周期应选 ' + w);
      } else if (c && c.manual) manual = true;
      else errs.push('点选题没有校验');
    } else {
      if (!/^\d+$/.test(String(it.ans))) errs.push('手写答案必须是非负整数：' + it.ans);
      if (!q.why.includes(String(it.ans))) errs.push('讲解里没有答案');
      if (c && c.expr) {
        const v = evalExpr(c.expr); if (!eq(v, evalExpr(String(it.ans)))) errs.push(`校验算式得 ${show(v)}，写的 ${it.ans}`);
        // 校验算式里的数必须来自题面、图或换算常数
        const pool = new Set(numsIn(shown + ' ' + JSON.stringify(Object.assign({}, q, {why: '', opts: []})) + ' ' + (c.from || '')).map(x => String(Number(x))));
        numsIn(c.expr).forEach(n => { const k = String(Number(n)); if (!pool.has(k) && !CONST.has(k)) errs.push(`校验算式里的 ${n} 不在题面`); });
      } else if (c && c.grid4) {
        const r = solveGrid4(q.data.g); if (r.err) errs.push(r.err); else if (r.sols.length !== 1) errs.push(`数独解数 ${r.sols.length}`); else if (r.sols[0][q.data.r][q.data.c] !== it.ans) errs.push(`数独这一格应是 ${r.sols[0][q.data.r][q.data.c]}`);
        if (q.data.g[q.data.r][q.data.c] !== 0) errs.push('问的格子不是空格');
      } else if (c && c.magic) {
        const s = solveMagic(q.data.g, q.data.sum); const i = q.data.r * 3 + q.data.c; if (s.length !== 1) errs.push(`幻方解数 ${s.length}`); else if (s[0][i] !== it.ans) errs.push(`幻方这一格应是 ${s[0][i]}`);
      } else if (c && c.pyr) {
        const s = solvePyr(q.data.rows); if (s.length !== 1 || s[0] !== it.ans) errs.push(`数塔应是 ${s}`);
      } else if (c && c.legs) {
        const s = legs(c.legs); if (s.length !== 1 || s[0] !== it.ans) errs.push(`穷举得 ${s}`);
      } else if (c && c.digit) {
        const s = digitPuzzle(c.digit); if (s.length !== 1 || s[0] !== it.ans) errs.push(`算式谜解 ${s}`);
      } else if (c && c.manual) manual = true;
      else { const e = checkEq(it); if (e) errs.push(e); }
    }
  } catch (e) { errs.push('求解出错：' + e.message); }
  // 范围
  const {why: _w, say: _s, text: _t, optText: _o, opts: _p, view: _v, ...figure} = q;   // 只留图里的数据
  const allNums = numsIn(shown + ' ' + (it.input === 'write' ? it.ans : '') + ' ' + JSON.stringify(figure));
  const big = Math.max(0, ...allNums.map(Number));
  if (big > CAP[L]) errs.push(`数 ${big} 超过第 ${L} 级上限 ${CAP[L]}`);
  if (OPS[L]) { const ops = (q.text || '').match(/[+−×÷]/g) || []; ops.forEach(o => { if (!OPS[L].includes(o)) errs.push(`第 ${L} 级不该有 ${o}`); }); }
  if (L < 11 && /\d\/\d/.test(shown)) errs.push('第 11 级以前不该有分数');
  if (L < 12 && /\d\.\d/.test(shown + q.why)) errs.push('第 12 级以前不该有小数');
  // Ben 11-05：题里所有数字都不超过 5 的不再出
  const fracDec = /\d\.\d|\d\/\d/.test(shown);   // 小数、分数不是「5 以内加减」这一档
  const allLow = allNums.length > 0 && allNums.every(n => Number(n) <= 5);
  if (!fracDec && allLow && !it.lowOk) errs.push('所有数字都 ≤ 5（isLow），未标 lowOk');
  if (it.lowOk && !allLow) errs.push('标了 lowOk，但题里有大于 5 的数');
  return {errs, manual, fracLow: fracDec && allLow};
}

// ---------- 主流程 ----------
const files = fs.readdirSync(DIR).filter(f => /^L\d\d-.*\.json$/.test(f)).sort();
let total = 0, fail = 0, manual = [], fun = 0, lowOk = 0, newV = 0, fracLow = [], picks = 0, firsts = 0, big = [], newViews = {};
const rows = [], ids = new Set(), kindsAll = {};
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')), L = d.level, seen = new Set();
  let lfun = 0, lnew = 0, bad = 0; const kinds = {};
  for (const it of d.items) {
    const r = checkItem(it, L);
    const key = JSON.stringify([it.q.say, it.q.text, it.q.data, it.q.optText]);
    if (seen.has(key)) r.errs.push('本级题目重复'); seen.add(key);
    if (ids.has(it.id)) r.errs.push('编号重复'); ids.add(it.id);
    if (r.manual) manual.push(`${it.id}：${it.q.say || it.q.text} → ${it.input === 'pick' ? it.q.optText[it.q.opts.indexOf(it.ans)] : it.ans}`);
    if (r.errs.length) { bad++; fail++; console.log(`✗ ${it.id} ${it.q.say || it.q.text || ''}\n    ${r.errs.join('；')}`); }
    if (it.fun) { lfun++; fun++; } if (it.newView) { lnew++; newV++; newViews[it.newView] = (newViews[it.newView] || 0) + 1; } if (it.lowOk) lowOk++;
    if (r.fracLow) fracLow.push(it.id);
    if (it.input === 'pick') { picks++; if (it.ans === 1) firsts++; }
    if (it.input === 'write' && String(it.ans).length >= 5) big.push(it.id);
    kinds[it.kind] = (kinds[it.kind] || 0) + 1; kindsAll[it.kind] = (kindsAll[it.kind] || 0) + 1; total++;
  }
  if (d.items.length < 30) { fail++; console.log(`✗ ${f} 只有 ${d.items.length} 道，少于 30`); }
  rows.push(`L${L}\t${d.items.length}\t${lfun}\t${(lfun / d.items.length * 100).toFixed(0)}%\t${lnew}\t${bad}\t${Object.entries(kinds).map(([k, v]) => k + v).join(' ')}`);
}
console.log('级\t题数\t趣味\t占比\t需新题面\t不通过\t类型');
rows.forEach(r => console.log(r));
console.log(`\n合计 ${total} 道（${files.length} 级），趣味 ${fun} 道（${(fun / total * 100).toFixed(1)}%），需新题面 ${newV} 道，标 lowOk ${lowOk} 道，不通过 ${fail} 道`);
console.log(`点选 ${picks} 道，答案在第 1 项的 ${firsts} 道；手写答案 ≥ 5 位的 ${big.length} 道：${big.join(' ')}`);
console.log(`分数小数题里数字都 ≤ 5、按规则豁免的 ${fracLow.length} 道：${fracLow.join(' ')}`);
console.log('新题面用量：' + Object.entries(newViews).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log('类型分布：' + Object.entries(kindsAll).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log(`\n无法用程序判定、需人工看的 ${manual.length} 道：`); manual.forEach(m => console.log('  ' + m));
process.exitCode = fail ? 1 : 0;
