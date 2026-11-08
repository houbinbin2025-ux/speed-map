// 到四年级第二批 2a（docs/说明书-到四年级第二批.md）：线段图、条形图、长方形、选择题。答案从图的数据独立重算
const test = require('node:test'), assert = require('node:assert');
const K = require('../v2/skills.js'), HB = require('../v2/hardbank.js');
const LATE = K.HARD.filter(s => s.late), IDS = LATE.flatMap(s => s.items.map(it => it.id));
const sum = l => l.reduce((a, b) => a + b, 0);
const nums = s => (String(s).match(/\d+(\.\d+)?/g) || []).map(Number);

test('2a 的 12 个题型都在技能里，标了 late 和概念，级别和编号一致', () => {
  assert.equal(IDS.length, 12);
  LATE.forEach(s => { assert.ok(s.concept, s.id); s.items.forEach(it => assert.equal(K.itemLevels(it.id)[0], +it.id.match(/:g(\d+):/)[1], it.id)); });
});

test('题池 30–300 道，短编号不重复，每题有讲解且讲解里有答案', () => {
  IDS.forEach(id => {
    const p = HB.pools[id]; assert.ok(p && p.length >= 30 && p.length <= 300, `${id} ${p && p.length}`);
    assert.equal(new Set(p.map(x => x.q.qk)).size, p.length, id);
    p.forEach(x => { const a = x.q.view === 'choice' ? x.q.opts[x.ans] : String(x.ans); assert.ok(x.q.why.includes(a), `${id} ${x.q.why} / ${a}`); assert.ok(x.q.view, id); });
  });
});

test('线段图：答案 = 问号那一段（或那一行、整条）的长度；已知的数和图一致，题干里都有', () => {
  IDS.filter(id => HB.pools[id][0].q.view === 'bar').forEach(id => HB.pools[id].forEach(x => {
    const d = x.q.data, rowSum = r => sum(r.segs.map(g => g.v)), asks = [];
    d.rows.forEach(r => { r.segs.forEach(g => { if (g.ask) asks.push(g.v); else if (g.label) assert.equal(+g.label, g.v, x.q.qk); }); if (r.sum) { if (r.sum.ask) asks.push(rowSum(r)); else assert.equal(+r.sum.label, rowSum(r)); } });
    if (d.top) { if (d.top.ask) asks.push(rowSum(d.rows[0])); else assert.equal(+d.top.label, rowSum(d.rows[0]), x.q.qk); }
    if (d.side) { if (d.side.ask) asks.push(sum(d.rows.map(rowSum))); else assert.equal(+d.side.label, sum(d.rows.map(rowSum)), x.q.qk); }
    assert.deepEqual(asks, [x.ans], `${id} ${x.q.say}`);
    const shown = d.rows.flatMap(r => r.segs.filter(g => g.label && g.label !== '?').map(g => +g.label)).concat([d.top, d.side].filter(b => b && !b.ask).map(b => +b.label));
    shown.forEach(n => assert.ok(nums(x.q.say).includes(n), `${x.q.say} 没有 ${n}`));
  }));
});

test('条形图：答案从条的高度算；高度是刻度的整数倍、不超过纵轴', () => {
  IDS.filter(id => HB.pools[id][0].q.view === 'chart').forEach(id => HB.pools[id].forEach(x => {
    const {bars, max, step, ask} = x.q.data, v = i => bars[i][1];
    bars.forEach(([, h]) => assert.ok(h % step === 0 && h > 0 && h <= max, `${id} ${h}`));
    const want = ask.kind === 'read' ? v(ask.i) : ask.kind === 'sum' ? v(ask.i) + v(ask.j) : v(ask.i) - v(ask.j);
    assert.ok(want > 0); assert.equal(x.ans, want, `${id} ${x.q.say}`);
    bars.forEach(([n]) => assert.equal(bars.filter(b => b[0] === n).length, 1));
    const named = bars.filter(([n]) => x.q.say.includes(n)).length; assert.ok(named === (ask.kind === 'read' ? 1 : 2), `${x.q.say}`);
  }));
});

test('长方形：周长 = 2 ×（长 + 宽），面积 = 长 × 宽；只标一条边的必须是正方形', () => {
  IDS.filter(id => HB.pools[id][0].q.view === 'rect').forEach(id => HB.pools[id].forEach(x => {
    const {w, h, labels, ask} = x.q.data;
    assert.equal(x.ans, ask === 'perim' ? 2 * (w + h) : w * h, `${id} ${x.q.qk}`);
    if (labels === 'one') assert.equal(w, h); if (labels === 'none') assert.ok(x.q.data.grid);
    assert.ok(x.q.say.includes(ask === 'perim' ? (labels === 'all' ? '四条边' : '周长') : '面积'), x.q.say);
  }));
});

test('选择题：3 个不同的数，「最大 / 最小」只有一个正确选项', () => {
  IDS.filter(id => HB.pools[id][0].q.view === 'choice').forEach(id => HB.pools[id].forEach(x => {
    const v = x.q.opts.map(Number); assert.equal(x.q.opts.length, 3); assert.equal(new Set(v).size, 3, x.q.qk);
    const max = x.q.say.includes('最大'); assert.ok(max || x.q.say.includes('最小'));
    assert.equal(v[x.ans], max ? Math.max(...v) : Math.min(...v), `${id} ${x.q.opts}`);
  }));
});

test('没有「所有数字都不超过 5」的题（小数比大小豁免：规划 §6，Ben 11-05 针对的是 5 以内加减）', () => {
  IDS.forEach(id => HB.pools[id].forEach(x => { if (x.q.view === 'choice') return;
    const d = x.q.data || {}, all = nums(x.q.say).concat(nums(JSON.stringify(d.bars || d.rows || [d.w, d.h])), x.q.opts ? x.q.opts.map(Number) : [x.ans]);
    assert.ok(all.some(n => n > 5), `${id} ${x.q.say}`);
  }));
});

test('答案不超过 4 位，选择题以外都是正整数', () => {
  IDS.forEach(id => HB.pools[id].forEach(x => { if (x.q.view !== 'choice') assert.ok(Number.isInteger(x.ans) && x.ans > 0 && x.ans < 10000, `${id} ${x.ans}`); }));
});
