// 人声朗读：预先用 Gemini 生成的音频（voice/a/<key>.webm），点到哪句才下载哪句；没有音频的句子回到系统语音
// 文件名算法 key() 同时给 tools/voice-corpus.js 用，改了要重新生成全部音频
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VOICE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // FNV-1a 32 位，取语言+原文；同步算，不依赖 crypto.subtle（App 内页面也能用）
  function key(lang, text) {
    const s = (lang === 'en-US' ? 'e|' : 'z|') + String(text).trim();
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return (lang === 'en-US' ? 'e' : 'z') + h.toString(36);
  }
  return {key};
});
