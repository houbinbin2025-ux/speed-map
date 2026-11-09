// 人声朗读：列出所有要预先生成的句子（中文题干 + 英文日的译文），写到 voice/corpus.json
// 用法：node tools/voice-corpus.js [--sample N]
// 文件名 = voiceKey(lang, text)，网页端用同一个函数算（v2/voice.js），两边必须一致
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const B = require('../v2/bank.js'), NB = require('../v2/placebank.js'), H = require('../v2/hardbank.js'), I = require('../v2/i18n.js');
const V = require('../v2/voice.js');

const zh = new Set();
(function walk(o, d) {
  if (!o || d > 8) return;
  if (Array.isArray(o)) return o.forEach(x => walk(x, d + 1));
  if (typeof o === 'object') { if (typeof o.say === 'string' && o.say.trim()) zh.add(o.say.trim()); for (const k in o) walk(o[k], d + 1); }
})([B, NB, H], 0);

const items = [];
for (const t of zh) {
  items.push({lang: 'zh-CN', text: t});
  const en = I.text(t);
  if (en && en !== t && !/[一-鿿]/.test(en)) items.push({lang: 'en-US', text: en});
}
const seen = new Map();
for (const it of items) {
  it.key = V.key(it.lang, it.text);
  const was = seen.get(it.key);
  if (was && was !== it.lang + '|' + it.text) throw new Error('文件名撞车：' + it.key + ' ' + it.text);
  seen.set(it.key, it.lang + '|' + it.text);
}
const uniq = [...new Map(items.map(x => [x.key, x])).values()];
const n = process.argv.indexOf('--sample');
let out = uniq;
if (n > 0) {   // 抽样：中英各半，均匀取，覆盖不同题型
  const k = +process.argv[n + 1] || 50, pick = arr => arr.filter((_, i) => i % Math.max(1, Math.floor(arr.length / (k / 2))) === 0).slice(0, k / 2);
  out = [...pick(uniq.filter(x => x.lang === 'zh-CN')), ...pick(uniq.filter(x => x.lang === 'en-US'))];
}
fs.mkdirSync(path.join(ROOT, 'voice'), {recursive: true});
const file = path.join(ROOT, 'voice', n > 0 ? 'corpus-sample.json' : 'corpus.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1));
const zhN = out.filter(x => x.lang === 'zh-CN').length;
console.log(`句子 ${out.length} 条（中文 ${zhN}，英文 ${out.length - zhN}），总字符 ${out.reduce((s, x) => s + x.text.length, 0)} → ${path.relative(ROOT, file)}`);
