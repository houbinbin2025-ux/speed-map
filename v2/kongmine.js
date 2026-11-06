// 空空数学岛 · 空空矿场宝石上报：点「领宝石」时生成 kongmine://earn 链接，报近 7 天每天炼出的宝石，矿场只补差额（所以可以重发）
// 签名算法须与空空矿场 App（~/01_业务/个人项目/空空矿场/MineCore/Sources/MineCore/EarnLink.swift）一致：
// HMAC-SHA256(key, "src|items|ts") 的小写十六进制。密钥公开在网页里，只防随手改链接
// 不用 crypto.subtle：App 里的页面是 file:// 打开的，不能指望它可用
// 浏览器里挂到 window.KM，node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = '48dbd815a5cefbc6c3380eba9c38d45c', SRC = 'mathmap';
  const K256 = [];
  (() => { const frac = x => ((x - Math.floor(x)) * 4294967296) >>> 0; let n = 0; for (let p = 2; n < 64; p++) { let prime = true; for (let d = 2; d * d <= p; d++) if (p % d === 0) { prime = false; break; } if (prime) K256[n++] = frac(Math.cbrt(p)); } })();
  const H0 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  function sha256(bytes) {
    const len = bytes.length, padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
    padded.set(bytes); padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, Math.floor(len / 536870912)); dv.setUint32(padded.length - 4, (len << 3) >>> 0);
    const h = H0.slice(), w = new Uint32Array(64);
    for (let o = 0; o < padded.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15], b = w[i - 2];
        w[i] = (w[i - 16] + (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) + w[i - 7] + (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10))) >>> 0;
      }
      let [a, b, c, d, e, f, g, x] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (x + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        x = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      [a, b, c, d, e, f, g, x].forEach((v, i) => { h[i] = (h[i] + v) >>> 0; });
    }
    const out = new Uint8Array(32), odv = new DataView(out.buffer);
    h.forEach((v, i) => odv.setUint32(i * 4, v));
    return out;
  }
  function hmac(keyText, msgText) {
    const enc = new TextEncoder(); let key = enc.encode(keyText);
    if (key.length > 64) key = sha256(key);
    const msg = enc.encode(msgText), inner = new Uint8Array(64 + msg.length), outer = new Uint8Array(96);
    for (let i = 0; i < 64; i++) { const b = key[i] || 0; inner[i] = b ^ 0x36; outer[i] = b ^ 0x5c; }
    inner.set(msg, 64); outer.set(sha256(inner), 64);
    return Array.from(sha256(outer), b => b.toString(16).padStart(2, '0')).join('');
  }

  const sign = (src, items, ts, key) => hmac(key, `${src}|${items}|${ts}`);

  // items = 日期.当天宝石.答对.总题数，逗号分隔（GEMS.items 生成）
  function earnLink(items, opt = {}) {
    const ts = Math.floor((opt.now || Date.now()) / 1000);
    return `kongmine://earn?src=${SRC}&items=${items}&ts=${ts}&sig=${sign(SRC, items, ts, opt.key || KEY)}`;
  }

  return { sign, earnLink };
});
