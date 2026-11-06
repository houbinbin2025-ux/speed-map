// 把 world-core.js 内联进页面，得到可离线打开的单文件原型：node docs/原型-v7-世界/build.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '世界.src.html'), 'utf8');
const core = fs.readFileSync(path.join(__dirname, 'world-core.js'), 'utf8');
fs.writeFileSync(path.join(__dirname, '世界.html'), src.replace('/*WORLD_CORE*/', () => core));
console.log('世界.html 已生成');
