// 回归浏览器必须静音（11-09 D）：直接 p.chromium.launch() 会让跑回归的电脑外放朗读
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'tools', 'e2e');
test('tools/e2e 的脚本都用 quiet.launch 起浏览器', () => {
  const bad = fs.readdirSync(DIR).filter(f => f.endsWith('.py') && f !== 'quiet.py')
    .filter(f => /\.(chromium|webkit|firefox)\.launch\(/.test(fs.readFileSync(path.join(DIR, f), 'utf8')));
  assert.deepStrictEqual(bad, [], '改成 __import__(\'quiet\').launch(p)');
});
