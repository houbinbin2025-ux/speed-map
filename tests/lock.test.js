// 家长区密码锁（v2/lock.js；说明书 docs/说明书-家长区密码.md）
const test = require('node:test'), assert = require('node:assert'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const L = require('../v2/lock.js');
const ref = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

test('sha256 和 node crypto 一致：空串、短串、正好跨块的长度、长串、中文', () => {
  for (const s of ['', 'abc', '123456', '000000', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(1000), '家长区密码锁', '😀x']) assert.equal(L.sha256(s), ref(s), JSON.stringify(s).slice(0, 20));
});

test('存的是 123456 的哈希；源码里没有明文密码', () => {
  assert.equal(L.HASH, ref('123456'));
  for (const f of ['v2/lock.js', 'v2/index.html']) assert.ok(!fs.readFileSync(path.join(__dirname, '..', f), 'utf8').includes('123456'), f + ' 里出现了明文密码');
});

test('输对解锁；输错、位数不对、非数字都不解锁，也不锁死', () => {
  const k = L.create();
  assert.equal(k.isOpen(), false);
  for (const bad of ['', '12345', '1234567', '654321', 'abcdef', '12345a', null, 123456]) { assert.equal(k.tryPin(bad), bad === 123456, String(bad)); }
  const k2 = L.create(); for (let i = 0; i < 20; i++) k2.tryPin('000000');
  assert.equal(k2.tryPin('123456'), true); assert.equal(k2.isOpen(), true);   // 错 20 次后输对照样能进
});

test('家长区页面没解锁时被拦；解锁后放行；新建一把锁（= 刷新页面 / 重开 App）又锁上', () => {
  const k = L.create();
  for (const id of ['parent', 'habit', 'mistp', 'bankv']) assert.equal(k.guarded(id), true, id);
  for (const id of ['island', 'qplay', 'mist', 'house']) assert.equal(k.guarded(id), false, id);
  k.tryPin('123456'); assert.equal(k.guarded('parent'), false);
  assert.equal(L.create().guarded('parent'), true);
});

test('解锁状态不进任何存储：lock.js 里没有 localStorage / sessionStorage / cookie', () => {
  const src = fs.readFileSync(path.join(__dirname, '../v2/lock.js'), 'utf8');
  assert.ok(!/localStorage|sessionStorage|document\.cookie|indexedDB/.test(src));
});
