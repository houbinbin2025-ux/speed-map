// 错题按知识点分组（skills.js MIST_GROUPS / mistCat，家长页用）：每个技能、每个题型都有且只有一个类别；新加技能不写类别就拦
const test = require('node:test'), assert = require('node:assert');
const K = require('../v2/skills.js');
const ALL = K.SKILLS.concat(K.HARD, K.FUN);   // 趣味技能登记了但不进 HARD（B 的保险）

test('每个技能都在且只在一个类别里，类别里没有不存在的技能', () => {
  const seen = {};
  K.MIST_GROUPS.forEach(([cat, ids]) => { assert.ok(cat && ids.length, cat);
    ids.forEach(id => { assert.ok(K.BY[id], `类别「${cat}」里的 ${id} 不是技能`); assert.ok(!seen[id], `${id} 同时在「${seen[id]}」和「${cat}」`); seen[id] = cat; }); });
  ALL.forEach(s => assert.ok(seen[s.id], `${s.id}（${s.name}）没有错题类别：在 skills.js 的 MIST_GROUPS 里加`));
  assert.equal(new Set(K.MIST_GROUPS.map(g => g[0])).size, K.MIST_GROUPS.length, '类别名重复');
});

test('每个题型（含挑战题型）都查得到类别；题型单独归的类别也是已有类别', () => {
  const cats = new Set(K.MIST_GROUPS.map(g => g[0]));
  ALL.forEach(s => s.items.forEach(it => { const c = K.mistCat(it.id); assert.ok(c && cats.has(c), `${it.id} 没有类别`); }));
  assert.equal(K.mistCat('speed:g11:divrem'), '有余数除法'); assert.equal(K.mistCat('speed:g11:div'), '多位数除法');
  assert.equal(K.mistCat('g34:g8:chart'), '条形图读数'); assert.equal(K.mistCat('nope'), null);
});

test('类别名是家长能看懂的中文短语（不带编号、不超过 10 个字）', () => {
  K.MIST_GROUPS.forEach(([cat]) => { assert.ok(!/[a-z_:]/i.test(cat), cat); assert.ok(cat.length <= 10, cat); });
});
