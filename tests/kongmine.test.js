const test = require('node:test');
const assert = require('node:assert/strict');
const KM = require('../v2/kongmine.js');

// 与空空矿场 App（MineCore/EarnLinkTests.testKnownSignatureVector）共用的固定向量
test('签名与空空矿场 App 一致', async () => {
  assert.equal(await KM.sign('mathmap', 12, 'n1', 1761958800, 'test-key'),
    'c96fc379602b06a3b798860c996a2d32a8f243bc8f235fdf56395299c2db758f');
});

test('earnLink 生成带签名的空空矿场链接', async () => {
  const url = await KM.earnLink(12, { now: 1761958800000, nonce: 'n1', key: 'test-key' });
  assert.equal(url, 'kongmine://earn?src=mathmap&correct=12&nonce=n1&ts=1761958800&sig=c96fc379602b06a3b798860c996a2d32a8f243bc8f235fdf56395299c2db758f');
});

test('每次生成的一次性编号不同', async () => {
  const a = await KM.earnLink(3), b = await KM.earnLink(3);
  const n = u => new URL(u.replace('kongmine://', 'http://x/')).searchParams.get('nonce');
  assert.notEqual(n(a), n(b));
  assert.match(n(a), /^[0-9a-f]{16}$/);
});

test('题数取整并限制在 0…200', async () => {
  const c = async v => new URL((await KM.earnLink(v)).replace('kongmine://', 'http://x/')).searchParams.get('correct');
  assert.equal(await c(-3), '0');
  assert.equal(await c(7.8), '7');
  assert.equal(await c(999), '200');
});
