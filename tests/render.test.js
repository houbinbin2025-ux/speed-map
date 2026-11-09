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
      if (v.input === 'pick' && !s.nb) assert.deepEqual(v.pick.slice().sort((a, b) => a - b), [inst.q.a, inst.q.b].sort((a, b) => a - b));
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

test('首页每块地的格子数：看数 16、分合 43、数位 2、比大小 8、数线 4、秒答 = 没被剔除的卡和题型', () => {
  const S = C.blank();
  const t = g => R.groupStat(S, g).total;
  assert.deepEqual(['look', 'bond', 'place', 'cmp', 'line'].map(t), [16, 43, 2, 8, 4]);
  assert.equal(t('speed'), C.UNITS.filter(u => !u.retired).length);
  E.record(S, 'look:tf:7', {ok: true, fast: true}, '2026-11-01');
  assert.deepEqual(R.groupStat(S, 'look').counts, [15, 1, 0, 0]);
});

test('答对的字：秒答都说「秒答！」，升级加「点亮了」；慢了只说对了和再快一点', () => {
  const card = {id: 'bond:7=3+_'}, type = {id: 'cmp:t:100'}, line = {id: 'line:t:10'};
  assert.deepEqual(R.okWords(card, {pass: true, up: true}, 0), {big: '⚡ 秒答！', small: '点亮了'});
  assert.deepEqual(R.okWords(type, {pass: true, up: false}, 0), {big: '⚡ 秒答！', small: ''});
  assert.deepEqual(R.okWords(card, {pass: false, up: false}, 1), {big: '✓ 对了', small: '再快一点才算学会'});
  assert.equal(R.okWords(line, {pass: false}, 0).big, '✓ 很接近');
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

test('地块的技能和格子（R.skillsOf / groupStat）= 老技能 + 当前级别开放的高级技能；手选每一级都和能出题的技能对上（分级同步审查第 1 条）', () => {
  const ZONES = ['look', 'bond', 'place', 'cmp', 'line', 'garden', 'market', 'dock'];
  for (let L = 1; L <= 15; L++) {
    const S = C.blank(); S.placedAt = 1; S.settings = {levels: [L], levelsV: 2};
    ZONES.forEach(g => {
      const sk = R.skillsOf(S, g), ids = sk.map(s => s.id);
      // 这块地这一级能出题的技能，全在卡片里
      K.SKILLS.concat(K.HARD).filter(s => s.group === g && s.items.some(it => E.itemOn(S, it.id))).forEach(s => assert.ok(ids.includes(s.id), `第 ${L} 级 ${g} 卡片缺 ${s.id}`));
      // 卡片里的高级技能，这一级都能出题（没开放的不显示）
      sk.filter(s => s.hard).forEach(s => assert.ok(s.items.some(it => E.itemOn(S, it.id)), `第 ${L} 级 ${g} 卡片多了 ${s.id}`));
      // 老技能一直都在；格子数 = 这些技能的格子
      K.SKILLS.filter(s => s.group === g).forEach(s => assert.ok(ids.includes(s.id)));
      assert.equal(R.groupStat(S, g).total, R.itemsOf(S, g).length);
    });
    assert.ok(!R.skillsOf(S, 'speed').some(s => s.hard) && R.skillsOf(S, 'speedH').every(s => s.group === 'speedH'));
  }
});
