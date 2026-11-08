// gemui.js 的接口一个不能少（11-08 两次踩坑：往一行写满的 api 对象里加 // 注释，把后半行的方法一起注释掉，页面点按钮才报错）
const test = require('node:test');
const assert = require('node:assert/strict');
test('GEMUI 接口齐全', () => {
  global.window = {};
  delete require.cache[require.resolve('../v2/gemui.js')];
  require('../v2/gemui.js');
  const api = global.window.GEMUI;
  for (const k of ['init', 'enabled', 'exportState', 'importBackup', 'total', 'syncNow', 'answerQ', 'answerP', 'summary', 'bind', 'openForge', 'state', 'parentStats', 'islandBtn', 'askQuit', 'finishChallenge'])
    assert.equal(typeof api[k], 'function', `GEMUI.${k} 不见了`);
});
