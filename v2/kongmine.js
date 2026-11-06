// 空空数学岛 · 空空矿场宝石上报：点「领宝石」时生成 kongmine://earn 链接，报近 7 天每天炼出的宝石，矿场只补差额（所以可以重发）
// 签名算法须与空空矿场 App（~/01_业务/个人项目/空空矿场/MineCore/Sources/MineCore/EarnLink.swift）一致：
// HMAC-SHA256(key, "src|items|ts") 的小写十六进制。密钥公开在网页里，只防随手改链接
// 浏览器里挂到 window.KM，node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = '48dbd815a5cefbc6c3380eba9c38d45c', SRC = 'mathmap';
  const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');

  async function sign(src, items, ts, key) {
    const enc = new TextEncoder(), subtle = globalThis.crypto.subtle;
    const k = await subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return hex(await subtle.sign('HMAC', k, enc.encode(`${src}|${items}|${ts}`)));
  }

  // items = 日期.当天宝石.答对.总题数，逗号分隔（GEMS.items 生成）
  async function earnLink(items, opt = {}) {
    const ts = Math.floor((opt.now || Date.now()) / 1000);
    const sig = await sign(SRC, items, ts, opt.key || KEY);
    return `kongmine://earn?src=${SRC}&items=${items}&ts=${ts}&sig=${sig}`;
  }

  return { sign, earnLink };
});
