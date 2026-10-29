// 改了 v2/ 下任何一个脚本以后跑：node tools/bump-version.js → 7 个 ?v= 一起加 1，指纹改成新的（npm test 会检查）
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dir = path.join(__dirname, '../v2'), FILES = ['bank.js', 'core.js', 'ink.js', 'skills.js', 'engine.js', 'render.js', 'world.js'];
const file = path.join(dir, 'index.html');
let html = fs.readFileSync(file, 'utf8');
const fp = crypto.createHash('sha256').update(FILES.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('')).digest('hex').slice(0, 12);
const m = html.match(/脚本指纹 v(\d+):([0-9a-f]{12})/);
if (m[2] === fp) { console.log('脚本没改，版本不变：v' + m[1]); process.exit(0); }
const v = +m[1] + 1;
html = html.replace(/脚本指纹 v\d+:[0-9a-f]{12}/, `脚本指纹 v${v}:${fp}`);
FILES.forEach(f => { html = html.replace(new RegExp(`${f.replace('.', '\\.')}\\?v=\\d+`), `${f}?v=${v}`); });
fs.writeFileSync(file, html);
console.log(`v${m[1]} → v${v}（指纹 ${fp}）`);
