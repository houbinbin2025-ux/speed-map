// iPad 竖式（docs/说明书-iPad竖式.md）：7 个题型每道题都能排出竖式、得数和题库一致、示范每一步中英都有、判题规则
const test = require('node:test'), assert = require('node:assert/strict');
const V = require('../v2/vert.js'), K = require('../v2/skills.js'), I18N = require('../v2/i18n.js');
const poolOf = id => (K.rawPool(id) || []).map(x => ({id, q: x.q, ans: x.ans}));
const ALL = Object.keys(V.IDS).flatMap(poolOf);
const ZH = I18N.ZH;
// 竖式里每格的字按行拼起来，查最后一行（答案 / 商）
const rowsText = B => B.rows.map(r => r.map(c => c.v).join(''));

test('7 个题型都在题库里，每道都能用竖式', () => {
  Object.keys(V.IDS).forEach(id => assert.ok(poolOf(id).length > 50, id + ' 题太少'));
  ALL.forEach(i => assert.ok(V.parse(i), `${i.id} ${i.q.text} 用不了竖式`));
});
test('别的题型、口算小数字不走竖式', () => {
  assert.equal(V.parse({id: 'speed:h:mul2', q: {text: '2 × 3 ='}, ans: 6}), null);
  assert.equal(V.parse({id: 'speed:g12:dec', q: {view: 'eq', text: '7.0 − 4.2 = 2.□'}, ans: 8}).kind, 'fill');
  assert.equal(V.parse({id: 'speed:g10:add3', q: {text: '360 + 268 ='}, ans: 627}), null, '得数和题库对不上就不用');
});
test('竖式算出来的得数和题库一致；示范每一步都写出东西、句子中英都有', () => {
  ALL.forEach(i => {
    const p = V.parse(i), B = V.build(p), rows = rowsText(B);
    if (p.op === '÷') assert.equal(+rows[0], i.ans, `${i.q.text} 商`);
    else assert.equal(+rows[rows.length - 1], i.ans, `${i.q.text} 得数`);
    assert.ok(B.steps.length >= 2);
    B.steps.forEach(s => {
      assert.ok(s.say && !/undefined|NaN/.test(s.say), `${i.q.text}：${s.say}`);
      assert.ok(s.en && !ZH.test(s.en) && !/undefined|NaN/.test(s.en), `${i.q.text} 英文：${s.en}`);
    });
    // 示范结束时，藏起来的格子（答案、进位、部分积）都已经亮出来
    const shown = new Set(B.steps.flatMap(s => s.show)), hidden = B.rows.flat().filter(c => c.h && c.v !== '');
    hidden.forEach(c => assert.ok(shown.has(c.id), `${i.q.text} 有一格 ${c.v} 示范里没写出来`));
  });
});
test('加减从个位算起：第一步是个位；减法连续退位讲得通', () => {
  const s = V.build({kind: 'vert', a: 325, op: '+', b: 148, ans: 473}).steps;
  assert.equal(s[0].say, '个位：5 + 8 = 13，写 3，向十位进 1');
  assert.match(s[1].say, /^十位：2 \+ 4 \+ 进的 1 = 7，写 7$/);
  const z = V.build({kind: 'vert', a: 1003, op: '-', b: 8, ans: 995}).steps;
  assert.match(z[0].say, /十位、百位都是 0，向千位借 1/);
  assert.ok(z.every(x => !/-\d/.test(x.say)), '不出现负数');
});
test('乘两位数：先个位乘、再十位乘、画线、两行相加', () => {
  const s = V.build({kind: 'mul', a: 23, op: '×', b: 14, ans: 322}).steps.map(x => x.say);
  assert.match(s[0], /^先用个位上的 4/); assert.equal(s[1], '4 × 3 = 12，写 2，进 1');
  assert.ok(s.indexOf('画横线，两行相加') > s.findIndex(x => /^再用十位/.test(x)));
});
test('两位除数：从前几位够除的地方起商', () => {
  const s = V.build({kind: 'div', a: 1508, op: '÷', b: 29, ans: 52}).steps.map(x => x.say);
  assert.equal(s[0], '15 不够除以 29，看前 3 位：150');
});
test('判：前面空格不算；中间空着、一格两个数、最高位写 0 都错；认不出要重写；没写要提示', () => {
  const p = {kind: 'vert', ans: 179};
  assert.deepEqual(V.judge(['', '1', '7', '9'], p), {ok: true, text: '179', tip: ''});
  assert.deepEqual(V.judge(['1', '', '9'], p), {ok: false, text: '1□9', tip: '中间空了一格'}, '中间空格显示成空框，提示说清楚（捣蛋鬼第 1 轮第 18 条）');
  assert.equal(V.judge(['0', '1', '7', '9'], p).tip, '最高位不写 0');
  assert.deepEqual(V.judge(['两17', '', '9'], p), {ok: false, text: '17□9', tip: '一格只写一个数'});
  assert.deepEqual(V.judge(['1', '7', '9', ''], p), {ok: false, text: '179', tip: '个位写在最右边的格子里'});
  assert.deepEqual(V.judge(['1', '?', '9'], p), {retry: true});
  assert.deepEqual(V.judge(['', '', ''], p), {empty: true});
  assert.equal(V.judge(['0', '1', '7', '9'], p, true).tip, "Don't write 0 in front");
});
test('版面和示范的文字中英都有；答案格数由题目定（不随答案变）', () => {
  Object.values(V.LAB).forEach(([zh, en]) => { assert.ok(ZH.test(zh)); assert.ok(!ZH.test(en), en); });
  Object.values(V.DEMO).forEach(d => { assert.ok(!ZH.test(d.tip[1])); const s = V.build(d.p).steps; assert.ok(s.length >= 3); });
  ALL.slice(0, 300).forEach(i => {
    const p = V.parse(i), h = V.layout(p, true), n = (h.match(/class="vcell"/g) || []).length;
    assert.ok(!ZH.test(h.replace(/<[^>]+>/g, '')), '英文版面还有中文');
    const want = p.kind === 'vert' ? Math.max(String(p.a).length, String(p.b).length) + (p.op === '+' ? 1 : 0) : p.kind === 'mul' ? String(p.a).length + String(p.b).length : String(p.a).length;
    assert.equal(n, want, i.q.text);
    assert.ok(n >= String(i.ans).length, `${i.q.text} 答案格不够`);
  });
});

// 递等式 / 填空 / 应用题（Ben 11-08「做完上线」）
const BALL = V.BOARD.flatMap(poolOf);
const maxLen = id => Math.max(...poolOf(id).map(x => String(x.ans).length));
test('三四年级手写题（含 2a 看图题、2b-1 分数题，11-08 起）都用 iPad 版面；格数：方框夹在数字里一格，否则按这个题型最长答案多一格（同一题型格数不变）', () => {
  V.BOARD.forEach(id => assert.ok(poolOf(id).length > 10, id));
  const seen = {};
  BALL.forEach(i => {
    const p = V.parse(i, maxLen(i.id)); assert.ok(p, i.id);
    assert.equal(seen[i.id] = seen[i.id] || p.n, p.n, i.id + ' 格数随题变了');
    assert.equal(p.kind, ['speed:g13:order', 'speed:g14:law'].includes(i.id) ? 'step' : ['story', 'riddle'].includes(i.q.view) ? 'word' : ['bar', 'chart', 'rect', 'pyr', 'magic', 'trees'].includes(i.q.view) ? 'fig' : 'fill', i.id);
    assert.equal(p.n, /[\d.]□|□[\d.]/.test(i.q.text) ? 1 : maxLen(i.id) + 1, i.q.text);
    assert.ok(p.n >= String(i.ans).length);
    const h = V.layout(p, true); assert.equal((h.match(/class="vcell"/g) || []).length, p.n);
  });
});
test('递等式一行一步算到得数，和题库一致；先乘除后加减、括号先算', () => {
  BALL.filter(i => V.parse(i).kind === 'step').forEach(i => { const L = V.stepLines(i.q.text).lines; assert.equal(+L[L.length - 1].slice(2), i.ans, i.q.text); });
  assert.deepEqual(V.stepLines('356 − 272 ÷ 8 =').lines, ['= 356 − 34', '= 322']);
  assert.deepEqual(V.stepLines('(12 + 14) × 3 + (8 − 2) × 5 =').lines, ['= 26 × 3 + 6 × 5', '= 78 + 30', '= 108']);
  assert.deepEqual(V.plan(V.DEMO.step.p).steps.map(s => s.say), ['先算 4 × 6 = 24', '先算 56 + 24 = 80']);
  const law = V.parse(BALL.find(i => i.id === 'speed:g14:law'));
  assert.equal(V.worked(law), '', '运算律的正确写法交给讲解（简便算法）'); assert.equal(V.demoKey(law), 'law'); assert.ok(!V.DEMO.law);
});
test('填空的正确写法把方框填上；应用题没有正确写法框（讲解里有）', () => {
  assert.match(V.worked(V.parse({id: 'speed:g12:dec', q: {view: 'eq', text: '7.0 − 4.2 = 2.□'}, ans: 8})), /2\.<b class="vfillv">8<\/b>/);
  assert.match(V.worked(V.parse({id: 'speed:g10:quo', q: {view: 'eq', text: '47 ÷ 7 = □ 余 5'}, ans: 6})), />6<\/b> 余 5/);
  assert.equal(V.worked(V.parse(BALL.find(i => i.q.view === 'story'))), '');
  assert.match(V.worked(V.parse({id: 'place:g10:thou', q: {view: 'eq', text: '2000 + 300 + 9 ='}, ans: 2309})), /= <b class="vfillv">2309<\/b>/, '没有方框的题，正确写法也要写出得数');
  BALL.filter(i => V.parse(i).kind === 'fill').forEach(i => assert.match(V.worked(V.parse(i)), /vfillv/, i.q.text));
});

test('故事题题干只出现一次（单位换算曾经连喇叭重复两行）', () => {
  const R = require('../v2/render.js');
  ['market:g10:conv', 'market:g14:unit', 'dock:g10:two'].forEach(id => { const x = K.rawPool(id)[0], h = R.question({id, q: x.q, ans: x.ans}).html; assert.equal((h.match(/class="nbsay"/g) || []).length, 1, id); });
});

test('蓝框题（递等式 / 填空 / 应用题）靠左写也判对；竖式仍要个位对齐（捣蛋鬼第 1 轮 P1）', () => {
  assert.equal(V.judge(['2', ''], {kind: 'fill', ans: 2}).ok, true);
  assert.equal(V.judge(['5', '8', '1', ''], {kind: 'word', ans: 581}).ok, true);
  assert.equal(V.judge(['', '5', '8', '1'], {kind: 'word', ans: 581}).ok, true);
  assert.equal(V.judge(['5', '', '1', ''], {kind: 'word', ans: 51}).ok, false, '中间空格仍算错');
  assert.equal(V.judge(['1', '7', '9', ''], {kind: 'vert', ans: 179}).tip, '个位写在最右边的格子里');
});

test('加法竖式的进位格只写「进位」，减法只写「退位」（捣蛋鬼第 1 轮第 13 条）', () => {
  const add = V.layout({kind: 'vert', a: 360, op: '+', b: 268, ans: 628}, false), sub = V.layout({kind: 'vert', a: 802, op: '-', b: 468, ans: 334}, false);
  assert.ok(add.includes('>进位<') && !add.includes('退位'), '加法');
  assert.ok(sub.includes('>退位<') && !sub.includes('进位'), '减法');
  assert.ok(V.layout({kind: 'vert', a: 360, op: '+', b: 268, ans: 628}, true).includes('>Carry<'));
});

// 小数加减写完整得数（A 9afb562，捣蛋鬼 1-4）：ans 存去掉小数点的整数 + q.dp；iPad 蓝框答案格印一个固定小数点，孩子不写点
test('小数蓝框：小数点印在倒数第 dp 格前，格数 = 最长答案 + 1，正确写法带小数点', () => {
  const K = require('../v2/skills.js');
  [['speed:g12:dec', 1], ['speed:g14:dec2', 2]].forEach(([id, dp]) => {
    const pool = K.rawPool(id), max = Math.max(...pool.map(x => String(x.ans).length));
    pool.slice(0, 40).forEach(x => {
      const p = V.parse({id, q: x.q, ans: x.ans}, max);
      assert.ok(p && p.kind === 'fill' && p.dp === dp && p.n === max + 1 && !p.inNum, id + ' ' + x.q.text);
      const html = V.layout(Object.assign({qhtml: ''}, p), false);
      const before = html.split('vdotc')[0].split('class="vcell"').length - 1, after = html.split('vdotc')[1].split('class="vcell"').length - 1;
      assert.equal(after, dp, '小数点后面 dp 格'); assert.equal(before, p.n - dp, '小数点前面其余的格');
      assert.ok(V.worked(p, false).includes((x.ans / 10 ** dp).toFixed(dp)), '正确写法带小数点：' + x.q.text);
    });
  });
});
test('小数蓝框判题：整数部分靠着小数点写、小数部分写满才对；小数部分没写到最右提示写在小数点后面', () => {
  const p = {kind: 'fill', ans: 143, dp: 1, n: 4};
  assert.deepEqual(V.judge(['', '1', '4', '3'], p), {ok: true, text: '143', tip: ''});
  assert.deepEqual(V.judge(['', '', '2', '7'], {kind: 'fill', ans: 27, dp: 1, n: 4}), {ok: true, text: '27', tip: ''});
  const left = V.judge(['1', '4', '3', ''], p);
  assert.equal(left.ok, false); assert.equal(left.tip, '小数部分写在小数点后面的格子里');
  assert.equal(V.judge(['1', '4', '3', ''], p, true).tip, 'Write the decimal part in the boxes after the point');
  assert.equal(V.judge(['2', '', '', '7'], {kind: 'fill', ans: 27, dp: 1, n: 4}).ok, false, '整数部分要靠着小数点');
  // 没有小数的蓝框照旧靠左写也对（v112 热修）
  assert.equal(V.judge(['5', '1', '', ''], {kind: 'fill', ans: 51, n: 4}).ok, true);
});

// 2b-1 分数和 2a 看图题进 iPad 蓝框（中控 11-08）：统一点「写好了」交卷
test('分数题和看图题都进蓝框：分数按填空、看图题按看图版面；格数 = 最长答案 + 1', () => {
  const K = require('../v2/skills.js'), R = require('../v2/render.js');
  const FRAC = ['dock:g11:fracbar', 'speed:g12:fracadd', 'speed:g15:equiv'];
  const FIG = ['dock:g7:bar', 'dock:g8:chart', 'place:g8:side', 'dock:g9:chart2', 'dock:g9:times', 'dock:g9:sumtimes', 'dock:g10:chart5', 'dock:g11:perim2', 'place:g12:area2', 'dock:g15:barsum'];
  FRAC.concat(FIG).forEach(id => {
    assert.ok(V.BOARD.includes(id), id + ' 登记进 BOARD');
    const pool = K.rawPool(id), max = Math.max(...pool.map(x => String(x.ans).length));
    pool.slice(0, 30).forEach(x => {
      const p = V.parse({id, q: x.q, ans: x.ans}, max);
      assert.ok(p, id + ' 能解析'); assert.equal(p.n, max + 1, id + ' 格数'); assert.ok(!p.inNum, id + ' 不是夹在数字中间的一格');
      assert.equal(p.kind, FRAC.includes(id) ? 'fill' : 'fig', id);
      const html = V.layout(Object.assign({qhtml: '<i class="q"></i>'}, p), false);
      assert.ok(html.includes('class="q"') && (html.match(/class="vcell"/g) || []).length === p.n, id + ' 题面在上、答案格对');
    });
  });
  // 看图题：正确写法不重复（讲解里有算式）；分数题：正确写法用页面传进来的上下结构整式
  const f = V.parse({id: 'dock:g7:bar', q: K.rawPool('dock:g7:bar')[0].q, ans: K.rawPool('dock:g7:bar')[0].ans}, 2);
  assert.equal(V.worked(f, false), '');
  const x = K.rawPool('speed:g12:fracadd')[0], p = V.parse({id: 'speed:g12:fracadd', q: x.q, ans: x.ans}, 2);
  p.ahtml = R.fr(x.q.text, `<b>${x.ans}</b>`);
  const w = V.worked(p, false); assert.ok(w.includes('class="frac"') && w.includes(`<b>${x.ans}</b>`), '正确写法是上下结构的整式');
  assert.ok(R.hasFr('2/4 − 1/4 = □/4') && !R.hasFr('3 / 10 题'));
});
