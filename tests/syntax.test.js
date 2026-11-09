// v2/ 下每个脚本都要能编译（11-08、11-09 三次踩坑：往写成一行的代码里加 // 注释，把后半行一起注释掉，语法错误要到真页面才看出来；
// page.test.js 只查 index.html 里的内嵌脚本，查不到 house.js 这类单独的文件）
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'v2');
test('v2/*.js 全部编译得过', () => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  assert.ok(files.length >= 10, '脚本数量不对：' + files.length);
  files.forEach(f => { try { new Function(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { assert.fail(`v2/${f} 编译不过：${e.message}`); } });
});
