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
  assert.equal(V.parse({id: 'speed:g12:dec', q: {text: '7.0 − 4.2 = 2.□'}, ans: 8}), null);
  assert.equal(V.parse({id: 'speed:g13:order', q: {text: '356 − 272 ÷ 8 ='}, ans: 322}), null);
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
  const p = {ans: 179};
  assert.deepEqual(V.judge(['', '1', '7', '9'], p), {ok: true, text: '179', tip: ''});
  assert.equal(V.judge(['1', '', '9'], p).ok, false);
  assert.equal(V.judge(['0', '1', '7', '9'], p).tip, '最高位不写 0');
  assert.deepEqual(V.judge(['两17', '', '9'], p), {ok: false, text: '17_9', tip: '一格只写一个数'});
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
