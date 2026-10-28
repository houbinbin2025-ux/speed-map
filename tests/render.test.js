// 题面、图解、示范卡：每个格子都能出、没有 undefined / NaN；全产品只说"几个十、几个一"；数位十条不画格线
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), R = require('../v2/render.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const clean = (h, where) => { assert.ok(h && h.length > 10, where + ' 是空的'); assert.ok(!/undefined|NaN|\[object/.test(h), where + '：' + h.slice(0, 200)); assert.ok(!/十位|个位/.test(h), where + ' 用了"十位 / 个位"'); };

test('每个格子出 20 次题：题面、作答方式、图解都完整', () => {
  const r = seeded(7);
  K.SKILLS.forEach(s => s.items.forEach(it => {
    for (let k = 0; k < (it.gen ? 20 : 1); k++) {
      const inst = K.make(it.id, r), v = R.question(inst);
      assert.ok(['write', 'pick', 'line'].includes(v.input), it.id);
      assert.equal(v.input, s.input === 'pick' ? 'pick' : s.input === 'line' ? 'line' : 'write', it.id);
      clean(v.html + v.tag, '题面 ' + it.id);
      if (v.input === 'pick') assert.deepEqual(v.pick.slice().sort((a, b) => a - b), [inst.q.a, inst.q.b].sort((a, b) => a - b));
      if (v.input === 'line') assert.ok(v.line.max > 0 && v.line.target > 0 && v.line.target < v.line.max);
      if (v.input !== 'line') clean(R.explain(inst), '图解 ' + it.id);
    }
  }));
});

test('图解里写的正确答案就是这题的答案', () => {
  const r = seeded(3);
  K.understand.filter(s => s.input === 'write').forEach(s => s.items.forEach(it => {
    const inst = K.make(it.id, r), h = R.explain(inst);
    assert.ok(new RegExp(`class="num ansv">${inst.ans}<`).test(h), it.id + ' 图解里没有答案 ' + inst.ans);
  }));
});

test('数位：十条画成整根（没有格子），散方块按实际个数', () => {
  const inst = {id: 'place:t:read', q: {n: 47, tens: 4, ones: 7}, ans: 47};
  const h = R.question(inst).html;
  assert.equal((h.match(/class="rod"/g) || []).length, 4);
  assert.equal((h.match(/class="one"/g) || []).length, 7);
  assert.ok(!/cell/.test(h));
});

test('示范卡：每个技能都有，三步，标题和说明完整', () => {
  K.SKILLS.forEach(s => { const h = R.demo(s.id); clean(h, '示范卡 ' + s.id); ['st1', 'st2', 'st3'].forEach(c => assert.ok(h.includes(c), s.id + ' 缺 ' + c)); });
});

test('首页每块地的格子数：看数 31、分合 54、数位 2、比大小 8、数线 4、秒答 = v1 全部卡和题型', () => {
  const S = C.blank();
  const t = g => R.groupStat(S, g).total;
  assert.deepEqual(['look', 'bond', 'place', 'cmp', 'line'].map(t), [31, 54, 2, 8, 4]);
  assert.equal(t('speed'), C.UNITS.length);
  E.record(S, 'look:tf:3', {ok: true}, '2026-11-01');
  assert.deepEqual(R.groupStat(S, 'look').counts, [30, 1, 0, 0]);
});

test('答对的字：卡第一次合格「对了！点亮了」；题型升级「点亮了！」；淡黄以后对但慢「再快一点」；数线「很接近！」', () => {
  const card = {id: 'bond:7=3+_'}, type = {id: 'cmp:t:100'}, line = {id: 'line:t:10'};
  assert.equal(R.okWords(card, {pass: true, up: true}, 0).big, '✓ 对了！点亮了');
  assert.equal(R.okWords(type, {pass: true, up: true}, 0).big, '✓ 点亮了！');
  assert.equal(R.okWords(type, {pass: true, up: false}, 0).big, '✓ 对了！');
  assert.equal(R.okWords(card, {pass: false, up: false}, 1).small, '再快一点就能升级');
  assert.equal(R.okWords(card, {pass: true, up: false}, 1).big, '⚡ 又对又快！');
  assert.equal(R.okWords(line, {pass: true}, 0).big, '很接近！');
});

test('数线答错：差得少说"再往右一点"，差得多说"再往右"', () => {
  assert.match(R.lineHint(7, 6.2, 0.5), /^再往右一点/);
  assert.match(R.lineHint(7, 4, 0.5), /^再往右 ·/);
  assert.match(R.lineHint(3, 6, 0.5), /^再往左 ·/);
});

test('名称：每个格子都有短名字；每种错题都能列出来；题型名不用字母', () => {
  const r = seeded(9);
  K.SKILLS.forEach(s => s.items.forEach(it => {
    const l = R.label(it.id); clean(l + '··········', '名字 ' + it.id); assert.ok(!/[a-z]/.test(l), it.id + '：' + l);
    if (!s.speed) { const inst = K.make(it.id, r); clean(R.mistLabel({src: s.group, uid: it.id, q: inst.q, ans: inst.ans}) + '··········', '错题 ' + it.id); }
  }));
  assert.equal(R.mistLabel({a: 3, op: '-', b: 1}), '3 − 1');
});
