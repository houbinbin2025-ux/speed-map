// 空空数学岛 · 派金积分上报：练完后生成 paijin://earn 链接，在 iPad 上打开即把答对题数记进派金 App
// 签名算法须与派金 App（~/01_业务/个人项目/派金/PaijinCore/Sources/PaijinCore/EarnLink.swift）一致：
// HMAC-SHA256(key, "src|correct|nonce|ts") 的小写十六进制。密钥公开在网页里，只防随手改链接；
// 防刷靠 App 端的一次性编号 + 每日封顶
// 浏览器里挂到 window.PJ，node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PJ = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = '48dbd815a5cefbc6c3380eba9c38d45c', SRC = 'mathmap', MAX = 200;
  const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');

  async function sign(src, correct, nonce, ts, key) {
    const enc = new TextEncoder(), subtle = globalThis.crypto.subtle;
    const k = await subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return hex(await subtle.sign('HMAC', k, enc.encode(`${src}|${correct}|${nonce}|${ts}`)));
  }

  async function earnLink(correct, opt = {}) {
    const n = Math.min(MAX, Math.max(0, Math.floor(Number(correct) || 0)));
    const nonce = opt.nonce || hex(globalThis.crypto.getRandomValues(new Uint8Array(8)));
    const ts = Math.floor((opt.now || Date.now()) / 1000);
    const sig = await sign(SRC, n, nonce, ts, opt.key || KEY);
    return `paijin://earn?src=${SRC}&correct=${n}&nonce=${nonce}&ts=${ts}&sig=${sig}`;
  }

  return { sign, earnLink };
});
