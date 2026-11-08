// 秒答时间按题目难度分类（Ben 11-08：难题和简单题的秒答时间应该不同）：说明书-秒答时间 §分类
'use strict';
const test = require('node:test'), assert = require('node:assert');
const C = require('../v2/core.js'), K = require('../v2/skills.js');
const ALL = K.SKILLS.concat(K.HARD);
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const eq = (id, text, ans) => ({id, q: {view: 'eq', text}, ans});

test('每个题型都归到一类；类在 K.FAST_CLASS 里有名字', () => {
  ALL.forEach(s => s.items.forEach(it => {
    const c = K.fastClass(it.id);
    assert.ok(K.FAST_CLASS[c] && K.FAST_CLASS[c].name, it.id + ' 没有分类：' + c);
  }));
});

test('每类的想的时间都在这一类的范围里（新题型定的时间不合类就拦）', () => {
  ALL.forEach(s => s.items.forEach(it => {
    const c = K.FAST_CLASS[K.fastClass(it.id)];
    for (let k = 1; k <= 8; k++) {
      const t = K.thinkMs(K.make(it.id, seeded(k * 13))) / 1000;
      assert.ok(t >= c.lo && t <= c.hi, `${it.id}（${c.name}）想的时间 ${t} 秒不在 ${c.lo}–${c.hi}`);
    }
  }));
});

test('分类：秒答卡、多位笔算、应用题、点选、数线各归各类', () => {
  assert.equal(K.fastClass('3+4'), 'card');
  assert.equal(K.fastClass('L4:add2c'), 'card');
  assert.equal(K.fastClass('speed:g12:mul2'), 'column');
  assert.equal(K.fastClass('speed:g11:div'), 'column');
  assert.equal(K.fastClass('dock:g13:share'), 'word');
  assert.equal(K.fastClass(K.BY.cmp1.items[0].id), 'pick');
  assert.equal(K.fastClass(K.BY.line1.items[0].id), 'line');
  assert.equal(K.fastClass('speed:g13:order'), 'multi');
});

test('多位笔算按这道题算：进位多的比不进位的多给，位数多的多给', () => {
  const o = {speed: 500};
  assert.ok(K.fastMs(eq('speed:g10:add3', '248 + 568 =', 816), o) > K.fastMs(eq('speed:g10:add3', '213 + 341 =', 554), o), '两次进位 > 不进位');
  assert.ok(K.fastMs(eq('speed:g10:sub3', '802 − 468 =', 334), o) > K.fastMs(eq('speed:g10:sub3', '865 − 432 =', 433), o), '退位 > 不退位');
  assert.ok(K.fastMs(eq('speed:g11:mul', '374 × 3 =', 1122), o) > K.fastMs(eq('speed:g11:mul', '213 × 3 =', 639), o), '乘法进位 > 不进位');
  assert.ok(K.fastMs(eq('speed:g11:div', '128 ÷ 4 =', 32), o) < K.fastMs(eq('speed:g11:div', '777 ÷ 7 =', 111), o), '商两位 < 商三位');
  assert.ok(K.fastMs(eq('speed:g13:mul3', '393 × 12 =', 4716), o) > K.fastMs(eq('speed:g12:mul2', '81 × 77 =', 6237), o), '三位乘两位 > 两位乘两位');
});

test('多位笔算：整个题型的平均秒答时间和原来的表差不多（不整体收紧也不整体放松）', () => {
  const OLD = {'speed:g10:add3': 12, 'speed:g10:sub3': 12, 'speed:g11:mul': 15, 'speed:g12:mul2': 30, 'speed:g13:mul3': 45, 'speed:g11:div': 20, 'speed:g13:div2': 25};
  Object.keys(OLD).forEach(id => {
    const p = K.rawPool(id), o = {speed: 500};
    const avg = p.reduce((a, x) => a + K.fastMs({id, q: x.q, ans: x.ans}, o), 0) / p.length / 1000;
    const old = OLD[id] + 0.5 * C.digits(p[0].ans);
    assert.ok(avg >= old * 0.85 && avg <= old * 1.15, `${id} 平均 ${avg.toFixed(1)} 秒，原来约 ${old} 秒`);
    const oral = p.reduce((a, x) => a + K.fastMs({id, q: x.q, ans: x.ans}, {oral: true, speed: 500}), 0) / p.length / 1000;
    assert.ok(oral >= OLD[id] * 0.85 && oral <= OLD[id] * 1.15, `${id} 口答平均 ${oral.toFixed(1)} 秒，原来 ${OLD[id]} 秒`);
  });
});

test('多位笔算写的字多：写字速度慢的孩子多给的时间按要写的位数算（中间的积、进位也算）', () => {
  const inst = eq('speed:g12:mul2', '81 × 77 =', 6237);
  const diff = K.fastMs(inst, {speed: 1500}) - K.fastMs(inst, {speed: 500});
  assert.ok(diff > 1000 * C.digits(6237), '中间两行积也要写：' + diff);
  assert.ok(K.fastMs(inst, {oral: true, speed: 500}) < K.fastMs(inst, {speed: 500}), '口答不写答案');
  assert.equal(K.fastMs(K.make('3+4'), {oral: true, speed: 1500}), K.thinkMs(K.make('3+4')), '口算卡口答不算写字');
});

test('两位数秒答卡：两个两位数的多 1 秒，一位数和 20 以内的不变', () => {
  const f = id => C.BYID[id].fast;
  assert.equal(f('L3:add2n'), 4000); assert.equal(f('L4:sub2n'), 4000);
  assert.equal(f('L3:add2c'), 6000); assert.equal(f('L4:sub2c'), 6000);
  assert.equal(f('L3:add1n'), 3000); assert.equal(f('L3:add1c'), 5000); assert.equal(f('L4:add10'), 3000);
  C.UNITS.filter(u => u.L <= 1).forEach(u => assert.ok(u.fast <= 3000, u.id));
});

test('英文日读题多给一半，只加在读题上', () => {
  const word = K.make('dock:g13:share', seeded(3)), zh = (word.q.say.match(/[一-鿿]/g) || []).length;
  assert.equal(K.fastMs(word, {oral: true, en: true}) - K.fastMs(word, {oral: true}), zh * 200);
});

test('题库页的秒答时间说明：按题算的写范围', () => {
  assert.match(K.fastLabel('speed:g12:mul2'), /^\d+(\.\d)?–\d+(\.\d)? 秒/);
  assert.equal(K.fastLabel('3+4'), K.fastThink('3+4') + ' 秒');
  assert.doesNotMatch(K.fastLabel('speed:g13:div2'), /(\d+)–\1 秒/, '两头一样只写一个数');
});

test('iPad 竖式和秒答时间对齐：点「写好了」的 1.5 秒从用时里扣掉，秒答和闪电都用扣过的用时，竖式题型都在笔算类或有分类', () => {
  const fs = require('node:fs'), path = require('node:path');
  const VERT = require('../v2/vert.js'), html = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
  assert.equal(VERT.TAP_MS, 1500);
  assert.match(html, /Q\.ms = Math\.max\(0, performance\.now\(\) - Q\.t0 - VERT\.TAP_MS\)/, '竖式用时要扣掉点「写好了」');
  assert.match(html, /const qLimit = inst => K\.fastMs\(inst, \{oral: S\.oral, speed: INKS\.speed, en: I18N\.on\}\)/, 'qLimit 要走 K.fastMs');
  assert.match(html, /const used = Q\.v\.input === 'write' \|\| Q\.v\.input === 'vert' \? Q\.ms/, '闪电也用扣过的用时');
  Object.keys(VERT.IDS).forEach(id => assert.equal(K.fastClass(id), 'column', id + ' 是竖式，要归多位笔算'));
});
