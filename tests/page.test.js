const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
const FILES = ['bank.js', 'core.js', 'ink.js', 'skills.js', 'engine.js', 'render.js'];
const MODS = {C: require('../v2/core.js'), I: require('../v2/ink.js'), K: require('../v2/skills.js'), E: require('../v2/engine.js'), R: require('../v2/render.js')};

test('页面用到的 C. / I. / K. / E. / R. 函数在模块里都有（防止页面调了不存在的函数，一点就报错）', () => {
  Object.entries(MODS).forEach(([p, mod]) => {
    const used = [...new Set([...html.matchAll(new RegExp(`\\b${p}\\.([A-Za-z_]\\w*)`, 'g'))].map(m => m[1]))].filter(k => !(k in mod));
    assert.deepEqual(used, [], p + ' 里没有：' + used.join());
  });
});

test('5 个脚本都带同一个版本号（防止手机缓存旧脚本配新页面）', () => {
  const vs = FILES.map(f => { const m = html.match(new RegExp(`<script src="${f.replace('.', '\\.')}\\?v=(\\d+)"></script>`)); assert.ok(m, f + ' 没带 ?v='); return m[1]; });
  assert.equal(new Set(vs).size, 1, '版本号不一致：' + vs.join());
});

test('改了任何一个脚本就必须把 ?v= 加 1（用脚本指纹提醒）', () => {
  const crypto = require('node:crypto');
  const src = FILES.map(f => fs.readFileSync(path.join(__dirname, '../v2', f), 'utf8')).join('');
  const now = crypto.createHash('sha256').update(src).digest('hex').slice(0, 12);
  const m = html.match(/脚本指纹 v(\d+):([0-9a-f]{12})/);
  assert.ok(m, '页面里缺少「脚本指纹」注释');
  const v = html.match(/core\.js\?v=(\d+)/)[1];
  assert.equal(m[1], v, '指纹注释里的版本号要和 ?v= 一致');
  assert.equal(m[2], now, `脚本改过了：请把 5 个脚本的 ?v= 都加 1，并把指纹改成 v${+v + 1}:${now}`);
});

test('页面里的 id 都唯一；脚本里 $(\'xx\') 取的 id 页面里都有', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepEqual(dup, []);
  const dyn = new Set(['sumHome', 'sumMist', 'qsHome', 'qsAgain', 'prGo', 'lineBox', 'myFlag']);   // 结算等页面里动态生成的
  const missing = [...new Set([...html.matchAll(/\$\('([A-Za-z0-9_]+)'\)/g)].map(m => m[1]))].filter(id => !ids.includes(id) && !dyn.has(id));
  assert.deepEqual(missing, []);
});
