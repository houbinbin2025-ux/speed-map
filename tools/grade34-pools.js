// 三四年级第一批题池（docs/说明书-到四年级第一批.md），由 tools/build-hard.js 并入 v2/hardbank.js
// 每题 {q: {view, say?, text, qk, why}, ans, c?}：qk = 固定短编号（旧题的 q.k 另有含义，不能用 k）；c = 校验算式（tests/grade34.test.js 用独立算法重算）。答案不超过 4 位
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (l, r) => l[Math.floor(r() * l.length)];
const P = {};
// 不重复地取 n 道：make(r) 返回 {q, ans, c} 或 null（这组数不合要求）
function fill(id, seed, n, make) {
  const r = rng(seed), out = [], seen = new Set();
  for (let i = 0; i < n * 60 && out.length < n; i++) {
    const x = make(r); if (!x || x.ans >= 10000 || x.ans < 0) continue;
    const key = x.q.qk; if (seen.has(key)) continue; seen.add(key); out.push(x);
  }
  P[id] = out;
}
const eq = (k, text, ans, why) => ({q: {view: 'eq', text, qk: k, why}, ans});
const st = (k, say, ans, why, c, text = '□') => ({q: {view: 'story', say, text, qk: k, why}, ans, c});

const THINGS = [['苹果', '个'], ['贝壳', '个'], ['面包', '个'], ['木板', '块'], ['石块', '块'], ['小鱼', '条'], ['金币', '枚'], ['火把', '支']];
const WHO = ['小狐狸', '小猫', '小狼', '小羊'];
const SHOP = THINGS.filter(t => t[0] !== '金币');   // 用钱买的东西，不买金币

// ---------- 第 10 级 ----------
fill('speed:g10:rem', 101, 150, r => { const b = int(r, 3, 9), q = int(r, 3, 9), x = int(r, 1, b - 1), a = b * q + x; return eq(`${a}/${b}r`, `${a} ÷ ${b} = ${q} 余 □`, x, `${q} × ${b} = ${q * b}，${a} − ${q * b} = ${x}`); });
fill('speed:g10:quo', 102, 150, r => { const b = int(r, 3, 9), q = int(r, 3, 9), x = int(r, 1, b - 1), a = b * q + x; return eq(`${a}/${b}q`, `${a} ÷ ${b} = □ 余 ${x}`, q, `${q} × ${b} + ${x} = ${a}，商是 ${q}`); });
fill('speed:g10:add3', 103, 150, r => { const a = int(r, 101, 899), b = int(r, 101, 899); if (a + b >= 1000 || (a % 10 + b % 10 < 10 && a % 100 + b % 100 < 100)) return null; return eq(`${a}+${b}`, `${a} + ${b} =`, a + b, `按个、十、百加，满十进一，是 ${a + b}`); });
fill('speed:g10:sub3', 104, 150, r => { const a = int(r, 201, 999), b = int(r, 101, 899); if (a <= b || (a % 10 >= b % 10 && a % 100 >= b % 100)) return null; return eq(`${a}-${b}`, `${a} − ${b} =`, a - b, `不够减向前一位借一，是 ${a - b}`); });
fill('place:g10:thou', 105, 120, r => { const t = int(r, 1, 9), h = int(r, 0, 9), o = int(r, 1, 9), n = t * 1000 + h * 100 + o; return h ? eq(`${n}`, `${t * 1000} + ${h * 100} + ${o} =`, n, `${t} 个千、${h} 个百、没有十、${o} 个一，是 ${n}`) : eq(`${n}`, `${t * 1000} + ${o} =`, n, `${t} 个千、没有百和十、${o} 个一，是 ${n}`); });
fill('market:g10:conv', 106, 120, r => {
  const kind = int(r, 0, 3), a = int(r, 2, 9), b = int(r, 1, 9) * 100;
  if (kind === 0) return st(`kg${a}-${b}`, `${a} 千克 ${b} 克是几克？`, a * 1000 + b, `${a} 千克是 ${a * 1000} 克，加 ${b}，是 ${a * 1000 + b}`, `${a}*1000+${b}`, `${a} 千克 ${b} 克 = □ 克`);
  if (kind === 1) return st(`km${a}-${b}`, `${a} 千米 ${b} 米是几米？`, a * 1000 + b, `${a} 千米是 ${a * 1000} 米，加 ${b}，是 ${a * 1000 + b}`, `${a}*1000+${b}`, `${a} 千米 ${b} 米 = □ 米`);
  if (kind === 2) return st(`l${a}-${b}`, `${a} 升 ${b} 毫升是几毫升？`, a * 1000 + b, `${a} 升是 ${a * 1000} 毫升，加 ${b}，是 ${a * 1000 + b}`, `${a}*1000+${b}`, `${a} 升 ${b} 毫升 = □ 毫升`);
  const s = int(r, 6, 59); return st(`min${a}-${s}`, `${a} 分 ${s} 秒是几秒？`, a * 60 + s, `${a} 分是 ${a * 60} 秒，加 ${s}，是 ${a * 60 + s}`, `${a}*60+${s}`, `${a} 分 ${s} 秒 = □ 秒`);
});
fill('dock:g10:remain', 107, 120, r => { const b = int(r, 3, 9), q = int(r, 3, 9), x = int(r, 1, b - 1), a = b * q + x; return r() < .5
  ? st(`boat${a}-${b}`, `${a} 人坐船，每条船坐 ${b} 人。至少要几条船？`, q + 1, `${a} ÷ ${b} = ${q} 余 ${x}，多的 ${x} 人还要 1 条，是 ${q + 1}`, `(${a}-${x})/${b}+1`)
  : st(`buy${a}-${b}`, `有 ${a} 元，每本书 ${b} 元。最多买几本？`, q, `${a} ÷ ${b} = ${q} 余 ${x}，余的钱不够再买，是 ${q}`, `(${a}-${x})/${b}`); });
fill('dock:g10:two', 108, 120, r => { const a = int(r, 3, 9) * 100, b = int(r, 110, a - 40), c = int(r, 110, 390); return st(`two${a}-${b}-${c}`, `仓库有 ${a} 箱货，运走 ${b} 箱，又运来 ${c} 箱。现在几箱？`, a - b + c, `${a} − ${b} = ${a - b}，${a - b} + ${c} = ${a - b + c}`, `${a}-${b}+${c}`); });
fill('market:g10:span', 109, 90, r => { const h = int(r, 7, 10), m0 = int(r, 2, 10) * 5, m1 = int(r, 1, 8) * 5; if (m0 + m1 <= 60) return null; const d = 60 - m0 + m1; return st(`span${h}-${m0}-${m1}`, `${h} 点 ${m0} 分出发，${h + 1} 点 ${m1} 分到。路上几分钟？`, d, `到 ${h + 1} 点要 ${60 - m0} 分钟，再过 ${m1} 分钟，是 ${d}`, `60-${m0}+${m1}`); });
// ---------- 第 11 级 ----------
fill('speed:g11:mul', 111, 200, r => { const a = int(r, 102, 999), b = int(r, 3, 9); if (a * b >= 10000 || a % 100 === 0) return null; return eq(`${a}x${b}`, `${a} × ${b} =`, a * b, `每一位都乘 ${b}，满几十进几，是 ${a * b}`); });
fill('speed:g11:div', 112, 200, r => { const b = int(r, 3, 9), q = int(r, 12, 199), a = b * q; return eq(`${a}/${b}`, `${a} ÷ ${b} =`, q, `从高位除起，${q} × ${b} = ${a}，是 ${q}`); });
fill('speed:g11:divrem', 113, 150, r => { const b = int(r, 3, 9), q = int(r, 12, 199), x = int(r, 1, b - 1), a = b * q + x; return eq(`${a}/${b}r`, `${a} ÷ ${b} = ${q} 余 □`, x, `${q} × ${b} = ${q * b}，${a} − ${q * b} = ${x}`); });
fill('dock:g11:perim', 114, 120, r => { const s = r() < .3; if (s) { const a = int(r, 6, 60); return st(`sq${a}`, `正方形边长 ${a} 厘米。周长几厘米？`, a * 4, `${a} × 4 = ${a * 4}`, `${a}*4`); } const a = int(r, 8, 60), b = int(r, 3, a - 1); return st(`re${a}-${b}`, `长方形长 ${a} 厘米，宽 ${b} 厘米。周长几厘米？`, (a + b) * 2, `(${a} + ${b}) × 2 = ${(a + b) * 2}`, `(${a}+${b})*2`); });
fill('dock:g11:times', 115, 120, r => { const [th, u] = pick(THINGS, r), w = pick(WHO, r), w2 = pick(WHO.filter(x => x !== w), r), a = int(r, 12, 240), t = int(r, 2, 9); return r() < .5
  ? st(`t${a}-${t}-${th}`, `${w}有 ${a} ${u}${th}，${w2}的${th}是${w}的 ${t} 倍。${w2}有几${u}？`, a * t, `${a} × ${t} = ${a * t}`, `${a}*${t}`)
  : st(`d${a}-${t}-${th}`, `${w}有 ${a * t} ${u}${th}，是${w2}的 ${t} 倍。${w2}有几${u}？`, a, `${a * t} ÷ ${t} = ${a}`, `${a * t}/${t}`); });
fill('dock:g11:two', 116, 120, r => { const [th, u] = pick(SHOP, r), b = int(r, 4, 9), n = int(r, 12, 60), c = int(r, 7, b * n - 1); return st(`p${b}-${n}-${c}-${th}`, `每盒 ${b} ${u}${th}，买 ${n} 盒，送出 ${c} ${u}。还剩几${u}？`, b * n - c, `${n} × ${b} = ${b * n}，${b * n} − ${c} = ${b * n - c}`, `${n}*${b}-${c}`); });
fill('dock:g11:speed', 117, 90, r => { const v = int(r, 12, 90), t = int(r, 2, 9); return st(`v${v}-${t}`, `小船每小时行 ${v} 千米，行了 ${t} 小时。一共几千米？`, v * t, `${v} × ${t} = ${v * t}`, `${v}*${t}`); });
fill('dock:g11:part', 118, 90, r => { const half = r() < .5, d = half ? 2 : 4, n = int(r, 4, 240) * d, [th, u] = pick(THINGS, r); return st(`f${d}-${n}-${th}`, `${n} ${u}${th}的${half ? '一半' : '四分之一'}是几${u}？`, n / d, `${n} ÷ ${d} = ${n / d}`, `${n}/${d}`); });
// ---------- 第 12 级 ----------
fill('speed:g12:mul2', 121, 220, r => { const a = int(r, 12, 99), b = int(r, 12, 99); if (a % 10 === 0 || b % 10 === 0) return null; return eq(`${a}x${b}`, `${a} × ${b} =`, a * b, `拆开 ${b} 分两步乘，再相加，是 ${a * b}`); });
// 小数加减写完整得数（捣蛋鬼 1-4，docs/说明书-小数加减写完整得数.md）：ans 存去掉小数点的整数，q.dp = 小数位数；至少一半过整数（进位 / 借位跨小数点）
const decq = (r, dp, lo, hi) => { const add = r() < .5, A0 = int(r, lo, hi), B0 = int(r, lo, hi), A = add ? A0 : Math.max(A0, B0), B = add ? B0 : Math.min(A0, B0), u = 10 ** dp, f = x => (x / u).toFixed(dp), s = add ? A + B : A - B;
  if (A % 10 === 0 || B % 10 === 0 || s <= u || s % 10 === 0) return null;
  const cross = add ? A % u + B % u >= u : A % u < B % u; if (!cross && r() < .5) return null;
  const op = add ? '+' : '−', k = `${A}${add ? "+" : "-"}${B}`;
  return {q: {view: 'eq', text: `${f(A)} ${op} ${f(B)} =`, qk: k, dp, why: `小数点对齐：${f(A)} ${op} ${f(B)} = ${f(s)}`}, ans: s}; };
fill('speed:g12:dec', 122, 180, r => decq(r, 1, 11, 89));
fill('dock:g12:area', 123, 150, r => { const sq = r() < .25; if (sq) { const a = int(r, 6, 40); return st(`sq${a}`, `正方形边长 ${a} 米。面积几平方米？`, a * a, `${a} × ${a} = ${a * a}`, `${a}*${a}`); } const a = int(r, 8, 60), b = int(r, 3, a - 1); if (r() < .3) { const L = int(r, 3, 9), W = int(r, 11, 60); return st(`w${L * W}-${L}`, `长方形面积 ${L * W} 平方厘米，宽 ${L} 厘米。长几厘米？`, W, `${L * W} ÷ ${L} = ${W}`, `${L * W}/${L}`); } return st(`re${a}-${b}`, `长方形长 ${a} 厘米，宽 ${b} 厘米。面积几平方厘米？`, a * b, `${a} × ${b} = ${a * b}`, `${a}*${b}`); });
fill('dock:g12:price', 124, 150, r => { const [th, u] = pick(SHOP, r), p = int(r, 3, 30), n = int(r, 11, 60), pay = r() < .35; if (pay) { const c = int(r, 3, 9), m = (Math.floor(p * c / 100) + 1) * 100; return st(`pay${p}-${c}-${th}`, `${th}每${u} ${p} 元，买 ${c} ${u}，付 ${m} 元。找回几元？`, m - p * c, `${c} × ${p} = ${p * c}，${m} − ${p * c} = ${m - p * c}`, `${m}-${c}*${p}`); } return st(`to${p}-${n}-${th}`, `${th}每${u} ${p} 元，买 ${n} ${u}。一共几元？`, p * n, `${p} × ${n} = ${p * n}`, `${p}*${n}`); });
P['market:g12:24'] = Array.from({length: 11}, (_, i) => i + 1).flatMap(h => [
  st(`to24-${h}`, `${h <= 5 ? '下午' : '晚上'} ${h} 点用 24 时记时是几点？`, 12 + h, `12 + ${h} = ${12 + h}`, `12+${h}`),
  st(`from24-${h}`, `${12 + h} 点是下午或晚上几点？`, h, `${12 + h} − 12 = ${h}`, `${12 + h}-12`),
]);
fill('market:g12:year', 125, 60, r => { const kind = int(r, 0, 2), a = int(r, 2, 12); return kind === 0 ? st(`y${a}`, `1 年有 12 个月。${a} 年是几个月？`, a * 12, `12 × ${a} = ${a * 12}`, `12*${a}`) : kind === 1 ? st(`w${a}`, `1 周有 7 天。${a} 周是几天？`, a * 7, `7 × ${a} = ${a * 7}`, `7*${a}`) : st(`d${a}`, `1 天有 24 小时。${a} 天是几小时？`, a * 24, `24 × ${a} = ${a * 24}`, `24*${a}`); });
// ---------- 第 13 级 ----------
fill('speed:g13:mul3', 131, 200, r => { const a = int(r, 102, 499), b = int(r, 12, 30); if (a * b >= 10000 || a % 10 === 0 || b % 10 === 0) return null; return eq(`${a}x${b}`, `${a} × ${b} =`, a * b, `拆开 ${b} 分两步乘，再相加，是 ${a * b}`); });
fill('speed:g13:div2', 132, 200, r => { const b = int(r, 12, 60), q = int(r, 12, 99), a = b * q; if (a >= 10000) return null; return eq(`${a}/${b}`, `${a} ÷ ${b} =`, q, `试商：${q} × ${b} = ${a}，是 ${q}`); });
fill('speed:g13:order', 133, 200, r => { const kind = int(r, 0, 4), a = int(r, 12, 90), b = int(r, 12, 40), c = int(r, 3, 9); const W = '先乘除后加减，括号先算，';
  if (kind === 0) return eq(`o0-${a}-${b}-${c}`, `${a} + ${b} × ${c} =`, a + b * c, `${W}是 ${a + b * c}`);
  if (kind === 1) return eq(`o1-${a}-${b}-${c}`, `(${a} + ${b}) × ${c} =`, (a + b) * c, `${W}是 ${(a + b) * c}`);
  if (kind === 2) { const t = b * c; return eq(`o2-${a}-${t}-${c}`, `${a + t} − ${t} ÷ ${c} =`, a + t - b, `${W}是 ${a + t - b}`); }
  if (kind === 3) { const t = c * b; if (t <= a) return null; return eq(`o3-${t + a}-${a}-${c}`, `(${t + a} − ${a}) ÷ ${c} =`, b, `${W}是 ${b}`); }
  const d = int(r, 3, 9); return eq(`o4-${b}-${c}-${a}-${d}`, `${b} × ${c} + ${a} × ${d} =`, b * c + a * d, `${W}是 ${b * c + a * d}`); });
fill('place:g13:round', 134, 120, r => { const n = int(r, 1010, 9490); if (n % 100 === 0) return null; const up = n % 100 >= 50, a = Math.round(n / 100) * 100, t = Math.floor(n / 10) % 10; return eq(`${n}`, `${n} 四舍五入到百位 = □`, a, `十位是 ${t}，${up ? '大于等于 5，进一' : '小于 5，舍去'}，是 ${a}`); });
fill('dock:g13:unit', 135, 150, r => { const [th, u] = pick(SHOP, r), p = int(r, 3, 30), a = int(r, 3, 9), n = int(r, 11, 40); return st(`u${p}-${a}-${n}-${th}`, `${a} ${u}${th}共 ${p * a} 元。同样的${th} ${n} ${u}要几元？`, p * n, `${p * a} ÷ ${a} = ${p}，${p} × ${n} = ${p * n}`, `${p * a}/${a}*${n}`); });
fill('dock:g13:speed', 136, 100, r => { const v = int(r, 12, 80), a = int(r, 2, 6), n = int(r, 7, 15); return st(`v${v}-${a}-${n}`, `小船 ${a} 小时行 ${v * a} 千米。照这样，${n} 小时行几千米？`, v * n, `${v * a} ÷ ${a} = ${v}，${v} × ${n} = ${v * n}`, `${v * a}/${a}*${n}`); });
fill('dock:g13:share', 137, 100, r => { const [th, u] = pick(SHOP, r), b = int(r, 12, 48), n = int(r, 6, 25), k = int(r, 3, 8); if ((b * n) % k) return null; return st(`s${b}-${n}-${k}-${th}`, `每盒 ${b} ${u}${th}，买 ${n} 盒，平均分给 ${k} 个班。每班几${u}？`, b * n / k, `${b} × ${n} = ${b * n}，${b * n} ÷ ${k} = ${b * n / k}`, `${b}*${n}/${k}`); });
// ---------- 第 14 级 ----------
fill('speed:g14:law', 141, 200, r => { const kind = int(r, 0, 4), a = int(r, 12, 89), b = int(r, 12, 89);
  if (kind === 0) return eq(`l0-${a}`, `25 × ${a} × 4 =`, a * 100, `25 × 4 = 100，100 × ${a} = ${a * 100}`);
  if (kind === 1) { if (a % 10 === 0) return null; return eq(`l1-${a}-${b}`, `${a} + ${b} + ${100 - a} =`, 100 + b, `${a} + ${100 - a} = 100，再加 ${b}，是 ${100 + b}`); }
  if (kind === 2) { const c = int(r, 110, 390); if (a % 10 === 0) return null; return eq(`l2-${c}-${a}`, `${c} − ${a} − ${100 - a} =`, c - 100, `${a} + ${100 - a} = 100，${c} − 100 = ${c - 100}`); }
  if (kind === 3) return eq(`l3-${a}`, `99 × ${a} =`, 99 * a, `100 × ${a} − ${a} = ${99 * a}`);
  return eq(`l4-${a}-${b}`, `${a} × ${b} + ${100 - a} × ${b} =`, 100 * b, `${a} + ${100 - a} = 100，100 × ${b} = ${100 * b}`); });
fill('speed:g14:lawfill', 142, 120, r => { const kind = int(r, 0, 3), a = int(r, 12, 89), b = int(r, 12, 89), c = int(r, 12, 89); if (a === b || a === c || b === c) return null;
  if (kind === 0) return eq(`f0-${a}-${b}`, `□ + ${a} = ${a} + ${b}`, b, `加法交换律，两个加数换位置，是 ${b}`);
  if (kind === 1) return eq(`f1-${a}-${b}`, `${a} × □ = ${b} × ${a}`, b, `乘法交换律，两个因数换位置，是 ${b}`);
  if (kind === 2) return eq(`f2-${a}-${b}-${c}`, `(${a} + ${b}) + ${c} = ${a} + (${b} + □)`, c, `加法结合律，换括号，得数不变，是 ${c}`);
  return eq(`f3-${a}-${b}-${c}`, `${a} × ${c} + ${b} × ${c} = (${a} + □) × ${c}`, b, `乘法分配律，相同的 ${c} 提出来，是 ${b}`); });
fill('speed:g14:dec2', 143, 180, r => decq(r, 2, 102, 899));
fill('speed:g14:move', 144, 100, r => { const n = int(r, 12, 98), big = r() < .5; if (n % 10 === 0) return null; const dec = (n / (big ? 100 : 10)).toFixed(big ? 2 : 1); return eq(`m${dec}`, `${dec} × ${big ? 100 : 10} =`, n, `乘 ${big ? 100 : 10}，小数点右移 ${big ? 2 : 1} 位，是 ${n}`); });
fill('dock:g14:avg', 145, 150, r => { const n = int(r, 3, 5), m = int(r, 12, 95), l = Array.from({length: n}, () => m); for (let i = 0; i + 1 < n; i += 2) { const d = int(r, 1, 6); l[i] += d; l[i + 1] -= d; } const s = l.join('、'); return st(`a${s}`, `${n} 次成绩是 ${s}。平均每次多少？`, m, `(${l.join(' + ')}) ÷ ${n} = ${m}`, `(${l.join('+')})/${n}`); });
fill('dock:g14:meet', 146, 90, r => { const a = int(r, 10, 60), b = int(r, 10, 60), t = int(r, 2, 8); if (a === b) return null; return st(`m${a}-${b}-${t}`, `甲每小时行 ${a} 千米，乙每小时行 ${b} 千米，相向走 ${t} 小时相遇。全程几千米？`, (a + b) * t, `(${a} + ${b}) × ${t} = ${(a + b) * t}`, `(${a}+${b})*${t}`); });
fill('dock:g14:tri', 147, 90, r => { const a = int(r, 3, 12) * 5, b = int(r, 3, 12) * 5; if (a + b >= 170) return null; return st(`t${a}-${b}`, `三角形两个角是 ${a} 度和 ${b} 度。第三个角几度？`, 180 - a - b, `180 − ${a} − ${b} = ${180 - a - b}`, `180-${a}-${b}`); });
fill('market:g14:unit', 148, 90, r => { const kind = int(r, 0, 2), n = int(r, 12, 98); if (n % 10 === 0) return null; const d = (n / 10).toFixed(1); return kind === 0 ? st(`me${d}`, `${d} 米是几厘米？`, n * 10, `${d} × 100 = ${n * 10}`, `${d}*100`, `${d} 米 = □ 厘米`) : kind === 1 ? st(`kg${d}`, `${d} 千克是几克？`, n * 100, `${d} × 1000 = ${n * 100}`, `${d}*1000`, `${d} 千克 = □ 克`) : st(`km${d}`, `${d} 千米是几米？`, n * 100, `${d} × 1000 = ${n * 100}`, `${d}*1000`, `${d} 千米 = □ 米`); });
// ---------- 第 15 级 ----------
const gcd = (a, b) => (b ? gcd(b, a % b) : a), lcm = (a, b) => a * b / gcd(a, b);
P['place:g15:lcm'] = []; P['place:g15:gcd'] = [];
for (let a = 2; a <= 12; a++) for (let b = a + 1; b <= 20; b++) { const l = lcm(a, b); if (l !== b && l !== a * b && l <= 180) P['place:g15:lcm'].push(st(`l${a}-${b}`, `${a} 和 ${b} 最小的公倍数是几？`, l, `${l} 既是 ${a} 的倍数，也是 ${b} 的倍数，是 ${l}`, `${a}*${b}/${gcd(a, b)}`)); }
for (let a = 12; a <= 60; a += 2) for (let b = a + 2; b <= 72; b += 2) { const g = gcd(a, b); if (g >= 6 && g !== a && P['place:g15:gcd'].length < 90 && (a + b) % 4 === 0) P['place:g15:gcd'].push(st(`g${a}-${b}`, `${a} 和 ${b} 最大的公因数是几？`, g, `${a} 和 ${b} 都能被 ${g} 整除，最大是 ${g}`, `${g}`)); }
fill('dock:g15:three', 151, 150, r => { const [th, u] = pick(THINGS, r), a = int(r, 3, 9), p = int(r, 12, 40), b = int(r, 3, 9), q = int(r, 11, 30); if (p === q) return null; const t = a * p + b * q, m = (Math.floor(t / 100) + 1) * 100; return st(`th${a}-${p}-${b}-${q}`, `买 ${a} 本 ${p} 元的书和 ${b} 支 ${q} 元的笔，付 ${m} 元。找回几元？`, m - t, `${a * p} + ${b * q} = ${t}，${m} − ${t} = ${m - t}`, `${m}-(${a}*${p}+${b}*${q})`); });
fill('dock:g15:sumdiff', 152, 120, r => { const big = int(r, 20, 400), d = int(r, 4, 80) * 2, sm = big - d; if (sm <= 3) return null; const ask = r() < .5; return st(`sd${big + sm}-${d}-${ask}`, `两数的和是 ${big + sm}，差是 ${d}。${ask ? '大' : '小'}的数是几？`, ask ? big : sm, ask ? `(${big + sm} + ${d}) ÷ 2 = ${big}` : `(${big + sm} − ${d}) ÷ 2 = ${sm}`, ask ? `(${big + sm}+${d})/2` : `(${big + sm}-${d})/2`); });
fill('dock:g15:timessum', 153, 120, r => { const t = int(r, 2, 6), a = int(r, 6, 90); return r() < .5 ? st(`ts${t}-${a}`, `甲是乙的 ${t} 倍，甲乙的和是 ${a * (t + 1)}。乙是几？`, a, `一共 ${t + 1} 份，${a * (t + 1)} ÷ ${t + 1} = ${a}`, `${a * (t + 1)}/(${t}+1)`) : st(`td${t}-${a}`, `甲是乙的 ${t} 倍，甲比乙多 ${a * (t - 1)}。乙是几？`, a, `多 ${t - 1} 份，${a * (t - 1)} ÷ ${t - 1} = ${a}`, `${a * (t - 1)}/(${t}-1)`); });
fill('dock:g15:legs', 154, 80, r => { const h = int(r, 8, 40), rab = int(r, 2, h - 2), legs = (h - rab) * 2 + rab * 4; return st(`c${h}-${legs}`, `笼里 ${h} 个头、${legs} 条腿，有鸡有兔。兔有几只？`, rab, `都当鸡是 ${h * 2} 条，多 ${legs - h * 2} 条，每兔多 2 条，是 ${rab}`, `(${legs}-${h}*2)/2`); });
fill('dock:g15:age', 155, 80, r => { const k = int(r, 5, 12), gap = int(r, 22, 36), later = int(r, 3, 15); return st(`ag${k}-${gap}-${later}`, `弟弟 ${k} 岁，妈妈 ${k + gap} 岁。弟弟 ${k + later} 岁时，妈妈几岁？`, k + later + gap, `差 ${gap} 岁不变，${k + later} + ${gap} = ${k + later + gap}`, `${k + later}+(${k + gap}-${k})`); });

module.exports = P;
