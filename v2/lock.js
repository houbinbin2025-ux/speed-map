// 家长区密码锁（F 模块，Ben 11-09：「家长区设置一个秘密，进入的时候要输入」；说明书 docs/说明书-家长区密码.md）
// 这是防孩子误入的锁，不是安全防护：密码只存 SHA-256 哈希，但网页源码谁都能看，懂行的人能绕过。
// 解锁状态只放内存：这一次打开 App 或页面期间有效，刷新、关掉 App 后要重输。纯函数部分 node 可测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LOCK = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LEN = 6;
  const HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';   // 现在的家长密码（6 位数字）的 SHA-256；改密码功能以后再做
  // 家长区的页面：没解锁时 show() 一律拦下（兜底，防以后新加的入口漏锁）
  const SCREENS = ['parent', 'habit', 'mistp', 'bankv'];

  // ---------- SHA-256（FIPS 180-4）：不用 crypto.subtle，App 里本地页面不一定是安全上下文 ----------
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function utf8(s) { const out = []; for (const ch of String(s)) { let c = ch.codePointAt(0); if (c < 0x80) out.push(c); else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63); else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63); else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63); } return out; }
  function sha256(str) {
    const b = utf8(str), bits = b.length * 8;
    b.push(0x80); while (b.length % 64 !== 56) b.push(0);
    for (let i = 7; i >= 0; i--) b.push(i >= 4 ? 0 : (bits >>> (i * 8)) & 255);   // 长度（位）写成 8 字节大端；这里的输入远小于 2^32 位
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], W = new Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < b.length; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = (b[o + i * 4] << 24 | b[o + i * 4 + 1] << 16 | b[o + i * 4 + 2] << 8 | b[o + i * 4 + 3]) >>> 0;
      for (let i = 16; i < 64; i++) { const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10); W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0; }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + bb) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0; H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(x => x.toString(16).padStart(8, '0')).join('');
  }

  // ---------- 锁 ----------
  // 每次 create() 是一把新锁（页面加载一次 = 一次打开），解锁只在这把锁的内存里
  function create(hash) {
    const want = hash || HASH;
    let open = false;
    return {
      LEN, SCREENS,
      isOpen: () => open,
      guarded: id => SCREENS.includes(id) && !open,
      // 输满 6 位才判；对了解锁并返回 true，错了返回 false（不锁死、不计次数）
      tryPin(pin) { const s = String(pin || ''); if (s.length !== LEN || !/^\d+$/.test(s)) return false; open = sha256(s) === want; return open; },
    };
  }
  return {create, sha256, LEN, HASH, SCREENS};
});
