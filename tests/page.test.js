const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
const C = require('../v2/core.js'), I = require('../v2/ink.js');

test('页面用到的 C.xxx / I.xxx 在模块里都有（防止页面调了不存在的函数，一写字就报错）', () => {
  const used = (p, mod) => [...new Set([...html.matchAll(new RegExp(`\\b${p}\\.([A-Za-z_]\\w*)`, 'g'))].map(m => m[1]))].filter(k => !(k in mod));
  assert.deepEqual(used('C', C), []);
  assert.deepEqual(used('I', I), []);
});

test('脚本引用带版本号（防止手机缓存旧脚本配新页面）', () => {
  assert.match(html, /<script src="core\.js\?v=\d+"><\/script>/);
  assert.match(html, /<script src="ink\.js\?v=\d+"><\/script>/);
});

test('改了 core.js / ink.js 就必须把 ?v= 加 1（用脚本指纹提醒）', () => {
  const crypto = require('node:crypto');
  const src = ['core.js', 'ink.js'].map(f => fs.readFileSync(path.join(__dirname, '../v2', f), 'utf8')).join('');
  const now = crypto.createHash('sha256').update(src).digest('hex').slice(0, 12);
  const m = html.match(/脚本指纹 v(\d+):([0-9a-f]{12})/);
  assert.ok(m, '页面里缺少「脚本指纹」注释');
  const v = html.match(/ink\.js\?v=(\d+)/)[1];
  assert.equal(m[1], v, '指纹注释里的版本号要和 ?v= 一致');
  assert.equal(m[2], now, `脚本改过了：请把 core.js / ink.js 的 ?v= 都加 1，并把指纹改成 v${+v + 1}:${now}`);
});
