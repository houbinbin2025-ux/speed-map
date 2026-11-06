const test = require('node:test');
const assert = require('node:assert/strict');
const KM = require('../v2/kongmine.js');

const ITEMS = '20261106.6.66.75,20261105.4.40.52';

// 与空空矿场 App（MineCore/EarnLinkTests.testKnownSignatureVector）共用的固定向量
test('签名与空空矿场 App 一致', async () => {
  assert.equal(await KM.sign('mathmap', ITEMS, 1761958800, 'test-key'),
    'e00da4b344f138ac4cce480c22d26dbe9570d809aa02aac2d1bbc2b68b2b4aed');
});

test('earnLink 生成带签名的空空矿场链接', async () => {
  const url = await KM.earnLink(ITEMS, { now: 1761958800000, key: 'test-key' });
  assert.equal(url, `kongmine://earn?src=mathmap&items=${ITEMS}&ts=1761958800&sig=e00da4b344f138ac4cce480c22d26dbe9570d809aa02aac2d1bbc2b68b2b4aed`);
});

test('链接里没有一次性编号：矿场按天补差额，重发安全', async () => {
  const a = await KM.earnLink(ITEMS, { now: 1761958800000 }), b = await KM.earnLink(ITEMS, { now: 1761958800000 });
  assert.equal(a, b);
  assert.ok(!a.includes('nonce'));
});
