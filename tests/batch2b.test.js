// 到四年级第二批 2b-1 分数（docs/说明书-到四年级第二批.md §2b-1）：只问一个整数。每个答案用分数独立重算
const test = require('node:test'), assert = require('node:assert');
const K = require('../v2/skills.js'), HB = require('../v2/hardbank.js'), R = require('../v2/render.js');
const IDS = ['dock:g11:fracbar', 'speed:g12:fracadd', 'cmp:g12:fraccmp', 'cmp:g15:fraccmp2', 'speed:g15:equiv'];
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const val = t => { const [a, b] = t.split('/').map(Number); return a / b; };
const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

test('5 个分数题型都在技能里：late、挂概念、级别 = 编号里的 gN；一半和四分之一也挂「分数」', () => {
  const want = {'dock:g11:fracbar': 'frac', 'speed:g12:fracadd': 'fracadd', 'cmp:g12:fraccmp': 'fraccmp', 'cmp:g15:fraccmp2': 'fraccmp2', 'speed:g15:equiv': 'equiv'};
  IDS.forEach(id => { const s = K.BY[K.ITEM[id].skill]; assert.ok(s.late, id); assert.equal(s.concept, want[id], id); assert.equal(K.itemLevels(id)[0], +id.match(/:g(\d+):/)[1], id); });
  assert.equal(K.BY[K.ITEM['dock:g11:part'].skill].concept, 'frac');
  assert.equal(K.BY[K.ITEM['cmp:g12:fraccmp'].skill].input, 'pick');
});

test('题池 30–300 道（等值分数受分母 ≤ 12 限制，至少 30），编号不重复，每题有讲解、朗读', () => {
  IDS.forEach(id => { const p = HB.pools[id]; assert.ok(p.length >= 30 && p.length <= 300, `${id} ${p.length}`);
    assert.equal(new Set(p.map(x => x.q.qk)).size, p.length, id); p.forEach(x => { assert.ok(x.q.why && x.q.read && x.q.view, `${id} ${x.q.qk}`); }); });
});

test('分数读图：分子 = 涂的格数，分母 = 一共几格；分母 2–10，真分数；约三分之一问分母', () => {
  const p = HB.pools['dock:g11:fracbar']; let den = 0;
  p.forEach(x => { const {n, on} = x.q.data; assert.ok(n >= 2 && n <= 10 && on.length >= 1 && on.length < n, x.q.qk);
    assert.equal(new Set(on).size, on.length); on.forEach(i => assert.ok(i >= 0 && i < n));
    if (x.q.text === `□/${n}`) assert.equal(x.ans, on.length); else { assert.equal(x.q.text, `${on.length}/□`); assert.equal(x.ans, n); den++; }
    assert.ok(x.q.why.endsWith(`${on.length}/${n}`), x.q.why); });
  assert.ok(den > p.length * .2 && den < p.length * .5, `问分母 ${den}`);
});

test('同分母加减：结果是真分数（1 ≤ 分子 < 分母），答案 = 结果的分子；分母 3–12', () => {
  HB.pools['speed:g12:fracadd'].forEach(x => { const m = /^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+) = □\/(\d+)$/.exec(x.q.text); assert.ok(m, x.q.text);
    const [, a, d1, op, b, d2, d3] = m, d = +d1; assert.ok(d === +d2 && d === +d3 && d >= 3 && d <= 12);
    const r = op === '+' ? val(`${a}/${d}`) + val(`${b}/${d}`) : val(`${a}/${d}`) - val(`${b}/${d}`);
    assert.ok(Math.abs(r - x.ans / d) < 1e-9, x.q.text); assert.ok(x.ans >= 1 && x.ans < d && +a < d && +b < d, x.q.text); });
});

test('比大小：3 个分数各不相等（值也不等），同分母或同分子，「最大 / 最小」只有一个对', () => {
  [['cmp:g12:fraccmp', 'd'], ['cmp:g15:fraccmp2', 'n']].forEach(([id, same]) => HB.pools[id].forEach(x => {
    const o = x.q.opts, v = o.map(val); assert.equal(o.length, 3); assert.equal(new Set(v).size, 3, o.join(' '));
    const parts = o.map(t => t.split('/').map(Number)); assert.equal(new Set(parts.map(p => same === 'd' ? p[1] : p[0])).size, 1, o.join(' '));
    parts.forEach(([a, b]) => assert.ok(a >= 1 && a < b && b <= 12));
    const max = /最大/.test(x.q.say), want = v.indexOf((max ? Math.max : Math.min)(...v)); assert.equal(x.ans, want, `${x.q.say} ${o.join(' ')}`);
  }));
});

test('等值分数：左边是最简分数 × 倍数（2–4），答案唯一、是整数，两边值相等；分母 ≤ 12', () => {
  let up = 0;
  HB.pools['speed:g15:equiv'].forEach(x => { const m = /^(\d+)\/(\d+) = □\/(\d+)$/.exec(x.q.text); assert.ok(m, x.q.text);
    const [, a, b, c] = m.map(Number); assert.ok(Math.abs(a / b - x.ans / c) < 1e-9, x.q.text); assert.ok(b <= 12 && c <= 12 && a < b);
    const big = Math.max(b, c), small = Math.min(b, c); assert.ok(big % small === 0 && [2, 3, 4].includes(big / small), x.q.text);
    const p = c < b ? x.ans : a, q = c < b ? c : b; assert.equal(gcd(p, q), 1, `${x.q.text} 小的那边要最简`); if (c > b) up++; });
  assert.ok(up > 10, '扩分、约分都有');
});

test('朗读：q.read 用「几分之几」读法，题面不出现斜杠读法', () => {
  HB.pools['dock:g11:fracbar'].forEach(x => { const n = x.q.data.n, k = x.q.data.on.length; assert.equal(x.q.read, x.q.text.startsWith('□') ? `涂色部分是${CN[n]}分之几？` : `涂色部分是几分之${CN[k]}？`); });
  HB.pools['speed:g12:fracadd'].forEach(x => { assert.ok(!/\//.test(x.q.read) && /分之几？$/.test(x.q.read), x.q.read); });
  HB.pools['speed:g15:equiv'].forEach(x => { assert.ok(!/\//.test(x.q.read) && /分之几？$/.test(x.q.read), x.q.read); });
});

test('题面：分数画成上下结构，方框在分子或分母的位置；喇叭读 q.read；选项有读屏文字；错题标签不只是一个 □', () => {
  const inst = (id, x) => ({id, q: x.q, ans: x.ans});
  const add = HB.pools['speed:g12:fracadd'][0], h = R.question(inst('speed:g12:fracadd', add)).html;
  assert.equal((h.match(/class="frac"/g) || []).length, 3, h); assert.ok(h.includes(`data-say="${add.q.read}"`) || !h.includes('data-say'), h);
  const fb = HB.pools['dock:g11:fracbar'][0], v = R.question(inst('dock:g11:fracbar', fb));
  assert.ok(v.html.includes(`data-say="${fb.q.read}"`), '读图题喇叭读 q.read'); assert.ok(/class="frac"/.test(v.html) && /<svg/.test(v.html)); assert.match(v.note, /方框/);
  const c = HB.pools['cmp:g12:fraccmp'][0], cv = R.question(inst('cmp:g12:fraccmp', c));
  assert.ok(cv.pickText.every(t => /class="frac"/.test(t))); assert.ok(cv.pickAria.every(t => /^.+分之.+$/.test(t)), cv.pickAria.join(' '));
  IDS.forEach(id => { const x = HB.pools[id][0], l = R.mistLabel({src: K.BY[K.ITEM[id].skill].group, uid: id, q: x.q}); assert.ok(/<svg/.test(l) || String(l).replace(/<[^>]+>/g, '').trim().length > 2, id); });
  // 答错讲解：答案填进方框所在的位置
  const ex = R.explain(inst('speed:g12:fracadd', add), add.ans); assert.ok(ex.includes('ansv'), ex);
});

test('5 张分数讲解卡：3–5 页，每页有图；朗读把 a/b 读成「b 分之 a」', () => {
  ['frac', 'fracadd', 'fraccmp', 'fraccmp2', 'equiv'].forEach(c => { const k = R.card(c); assert.ok(k && k.pages.length >= 3 && k.pages.length <= 5, c);
    k.pages.forEach((p, i) => { assert.ok(/<svg/.test(p.fig), `${c} ${i}`); if (/\d\/\d/.test(p.line)) assert.ok(p.read && !/\//.test(p.read), p.read); }); });
  assert.equal(R.card('frac').pages[2].read, '平均分成 8 份，涂了 3 份：八分之三');
});
