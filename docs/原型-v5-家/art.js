// 家里的像素画：全部原创，代码绘制。每件 16×16 以内，原点在左上；draw(g, x, y)
(function (root) {
  'use strict';
  const r = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const list = (g, ox, oy, a) => a.forEach(([c, x, y, w, h]) => r(g, c, ox + x, oy + y, w || 1, h || 1));
  const W1 = '#c08a52', W2 = '#8a5a2c', W3 = '#5a3a20', K = '#1b1d22', S1 = '#9a9da4', S2 = '#6c6f76', S3 = '#c9ccd2', G = '#f2c14e', G2 = '#b98a22', D = '#5fd9e6', D2 = '#2f9fae', Rd = '#b3261e', Wt = '#ecebe4';
  const pick = (m, m2) => [[W3, 7, 5, 2, 11], [W2, 8, 5, 1, 11], [m, 2, 2, 12, 2], [m, 1, 3, 2, 3], [m, 13, 3, 2, 3], [m2, 3, 4, 10, 1], [m2, 1, 5, 2, 1], [m2, 13, 5, 2, 1]];
  const ITEM = {
    torch: {t: 'W', a: [[W3, 7, 8, 2, 8], [W2, 7, 8, 1, 8], [K, 6, 6, 4, 2]]},
    bed: {t: 'F', w: 24, a: [[W2, 0, 11, 24, 3], [W3, 0, 14, 2, 2], [W3, 22, 14, 2, 2], [W3, 0, 5, 2, 9], [Rd, 7, 7, 15, 4], ['#8a1c16', 7, 10, 15, 1], [Wt, 2, 7, 6, 4], ['#c9c6ba', 2, 10, 6, 1]]},
    bench: {t: 'F', a: [[W1, 1, 3, 14, 13], [W2, 1, 3, 14, 3], [K, 1, 6, 14, 1], [K, 7, 3, 1, 3], [W3, 3, 8, 3, 8], [W3, 10, 8, 3, 8], [S1, 2, 1, 5, 2], [W3, 10, 0, 2, 3]]},
    furnace: {t: 'F', a: [[S1, 1, 1, 14, 15], [S2, 1, 1, 14, 2], [S2, 1, 7, 14, 1], [S2, 1, 13, 14, 1], [K, 4, 8, 8, 5]], fx: 'fire'},
    shelf: {t: 'F', a: [[W2, 1, 0, 14, 16], [W3, 2, 1, 12, 6], [W3, 2, 9, 12, 6], ['#b3261e', 3, 2, 2, 5], ['#6ea8fe', 5, 3, 2, 4], ['#7bd88f', 7, 2, 2, 5], ['#f2c14e', 10, 3, 2, 4], ['#f6a5a0', 3, 10, 2, 5], ['#7bd88f', 6, 11, 2, 4], ['#6ea8fe', 8, 10, 2, 5], ['#b3261e', 11, 10, 2, 5]]},
    pick1: {t: 'W', a: pick(S3, S2)}, pick2: {t: 'W', a: pick(G, G2)}, pick3: {t: 'W', a: pick(D, D2)},
    kennel: {t: 'F', w: 18, a: [[W1, 1, 6, 16, 10], [Rd, 0, 3, 18, 3], ['#8a1c16', 3, 1, 12, 2], [K, 6, 9, 6, 7]]},
    glass: {t: 'W', a: [[S2, 2, 4, 9, 4], [G2, 10, 3, 4, 6], [D, 14, 4, 1, 4], [W3, 6, 8, 2, 7], [W3, 3, 14, 8, 2]]},
    lamp: {t: 'W', a: [[K, 7, 0, 2, 3], [K, 4, 3, 8, 1], [G, 5, 4, 6, 8], ['#fff3b0', 6, 5, 4, 6], [K, 4, 12, 8, 1]]},
    jukebox: {t: 'F', a: [[W2, 1, 6, 14, 10], [W3, 1, 6, 14, 2], [K, 3, 2, 10, 4], [S2, 5, 3, 6, 2], [G, 7, 3, 2, 1], [G, 3, 10, 3, 3], [D, 9, 10, 4, 3]], fx: 'note'},
    armor: {t: 'F', a: [[W3, 7, 0, 2, 15], [W3, 3, 3, 10, 1], [W2, 4, 15, 8, 1]]},
    trophy: {t: 'F', a: [[G, 3, 1, 10, 7], ['#fff3b0', 4, 2, 2, 5], [G2, 1, 2, 2, 4], [G2, 13, 2, 2, 4], [G2, 6, 8, 4, 3], [G, 4, 11, 8, 2], [K, 3, 13, 10, 3]]},
    cake: {t: 'F', a: [[W2, 1, 11, 14, 5], [Wt, 3, 6, 10, 5], ['#f6a5a0', 3, 8, 10, 1], [Rd, 7, 4, 2, 2], [G, 7, 3, 2, 1]]},
    apple: {t: 'F', a: [[W2, 3, 12, 10, 4], [G, 5, 5, 6, 7], ['#fff3b0', 6, 6, 2, 2], [G2, 5, 11, 6, 1], [W3, 8, 3, 1, 2], ['#3d7524', 9, 3, 3, 2]]},
    cat: {t: 'F', a: [['#6c6f76', 4, 8, 9, 6], ['#6c6f76', 2, 5, 6, 6], ['#6c6f76', 2, 3, 1, 2], ['#6c6f76', 7, 3, 1, 2], [K, 3, 7, 1, 1], [K, 6, 7, 1, 1], ['#6c6f76', 4, 14, 1, 2], ['#6c6f76', 11, 14, 1, 2], ['#6c6f76', 13, 6, 1, 6]]},
    deco0: {t: 'F', a: [[W1, 5, 11, 6, 5], [W2, 4, 10, 8, 2], ['#3d7524', 7, 5, 2, 5], ['#f6a5a0', 5, 2, 6, 4], [G, 7, 3, 2, 2]]},
    deco1: {t: 'F', w: 24, a: [[Rd, 0, 14, 24, 2], [G, 2, 14, 20, 1], ['#8a1c16', 5, 15, 14, 1]]},
    deco2: {t: 'W', a: [[W2, 1, 2, 14, 12], ['#bfe3ff', 2, 3, 12, 10], ['#6fae3a', 2, 9, 12, 4], [G, 10, 4, 2, 2], [W3, 5, 7, 2, 2]]},
    deco3: {t: 'W', a: [[W3, 3, 1, 1, 14], [Rd, 4, 2, 9, 3], [G, 4, 5, 9, 3], ['#6ea8fe', 4, 8, 9, 3]]},
    deco4: {t: 'W', a: [[W2, 2, 2, 12, 12], [Wt, 3, 3, 10, 10], [K, 8, 4, 1, 4], [K, 8, 8, 3, 1], [Rd, 8, 3, 1, 1]]},
    deco5: {t: 'W', a: [[W3, 0, 0, 16, 2], ['#6ea8fe', 0, 2, 4, 13], ['#6ea8fe', 12, 2, 4, 13], ['#bfe3ff', 4, 2, 8, 12]]},
    deco6: {t: 'F', a: [[W1, 3, 6, 10, 10], [W1, 4, 2, 8, 5], [W2, 3, 1, 3, 2], [W2, 10, 1, 3, 2], [K, 6, 4, 1, 1], [K, 9, 4, 1, 1], [W2, 7, 5, 2, 1]]},
    deco7: {t: 'F', a: [[W3, 6, 13, 4, 3], [W2, 7, 11, 2, 2], ['#6ea8fe', 3, 2, 10, 9], ['#6fae3a', 4, 3, 4, 4], ['#6fae3a', 9, 6, 3, 3]]},
    deco8: {t: 'F', a: [[W2, 3, 2, 1, 14], [W2, 12, 2, 1, 14], [Wt, 2, 2, 12, 9], ['#f6a5a0', 4, 4, 3, 3], ['#6ea8fe', 8, 6, 4, 3], [W3, 1, 11, 14, 1]]},
    deco9: {t: 'F', a: [[S3, 1, 4, 14, 12], ['#6ea8fe', 2, 6, 12, 9], [G, 5, 9, 3, 2], [Rd, 9, 11, 3, 2], ['#3d7524', 3, 12, 1, 3]]},
    deco10: {t: 'W', a: [[K, 7, 0, 2, 4], [G2, 2, 4, 12, 2], [G, 2, 6, 2, 3], [G, 7, 6, 2, 3], [G, 12, 6, 2, 3]]},
    deco11: {t: 'F', a: [[W2, 2, 9, 12, 7], [W3, 2, 9, 12, 1], [G, 6, 2, 4, 7], [G2, 7, 8, 2, 1], [K, 5, 12, 6, 2]]},
    deco12: {t: 'F', a: [[W2, 2, 11, 12, 3], [W3, 7, 2, 1, 9], [Wt, 8, 3, 5, 6], [Wt, 4, 5, 3, 4], [W3, 5, 14, 6, 2]]},
    deco13: {t: 'W', a: [[K, 7, 0, 1, 3], [G, 7, 3, 2, 8], [G, 4, 6, 8, 2], ['#fff3b0', 7, 5, 2, 4]]},
    deco14: {t: 'F', a: [[S1, 2, 8, 12, 8], [S1, 1, 4, 3, 5], [S1, 12, 4, 3, 5], [S1, 6, 2, 4, 7], [K, 7, 11, 2, 5], [Rd, 8, 0, 3, 2], [W3, 7, 0, 1, 2]]},
  };
  const PIECE = {helm: [[D, 5, 0, 6, 3], [D2, 5, 3, 1, 1], [D2, 10, 3, 1, 1]], chest2: [[D, 4, 4, 8, 5], [D2, 2, 4, 2, 3], [D2, 12, 4, 2, 3]], legs: [[D2, 5, 9, 6, 3], [D, 5, 9, 2, 3], [D, 9, 9, 2, 3]], boots: [[D, 4, 13, 3, 2], [D, 9, 13, 3, 2]]};
  function item(g, id, x, y) { list(g, x, y, ITEM[id].a); }
  function armorParts(g, x, y, ids) { ids.forEach(id => list(g, x, y, PIECE[id])); }
  // 影子：还没得到的下一个目标
  function shadow(g, id, x, y) { const c = document.createElement('canvas'); c.width = 24; c.height = 16; const h = c.getContext('2d'); item(h, id, 0, 0); h.globalCompositeOperation = 'source-in'; h.fillStyle = 'rgba(10,8,6,.42)'; h.fillRect(0, 0, 24, 16); g.drawImage(c, x, y); }
  function icon(cv, id) { cv.width = 24; cv.height = 16; const g = cv.getContext('2d'); g.clearRect(0, 0, 24, 16); if (ITEM[id]) item(g, id, (24 - (ITEM[id].w || 16)) >> 1, 0); }
  function ingot(g, x, y, c, c2) { r(g, K, x, y + 1, 7, 4); r(g, c, x + 1, y, 5, 3); r(g, c2, x, y + 3, 7, 1); }
  root.ART = {ITEM, item, armorParts, shadow, icon, ingot, r, list, COL: {K, W1, W2, W3, S1, S2, S3, G, G2, D, D2, Rd, Wt}};
})(this);
// ---------- 生物：全部原创，按模板 + 配色画 ----------
(function (root) {
  'use strict';
  const A = root.ART, r = A.r, K = '#1b1d22';
  const T = {
    quad(g, c, x, y, f) { // 四足
      r(g, c.c, x + 1, y - 9, 10, 6); r(g, c.c, x + 9, y - 12, 6, 6); r(g, K, x + 13, y - 10, 1, 1);
      if (c.f) r(g, c.f, x + 13, y - 8, 2, 2); if (c.e) { r(g, c.e, x + 10, y - 14, 1, 2); r(g, c.e, x + 13, y - 14, 1, 2); }
      if (c.s) { r(g, c.s, x + 3, y - 8, 3, 3); r(g, c.s, x + 7, y - 6, 2, 2); } if (c.h) r(g, c.h, x + 4, y - 11, 4, 2); if (c.tail) r(g, c.tail, x - 1, y - 9, 2, 2);
      const d = f % 2; r(g, c.l || c.c, x + 2, y - 3, 2, 3 - d); r(g, c.l || c.c, x + 5, y - 3, 2, 2 + d); r(g, c.l || c.c, x + 8, y - 3, 2, 3 - d); r(g, c.l || c.c, x + 10, y - 3, 1, 2 + d);
    },
    bird(g, c, x, y, f) {
      r(g, c.c, x + 3, y - 10, 8, 8); r(g, c.w || c.c, x + 4, y - 7, 4, 4); r(g, K, x + 9, y - 9, 1, 1); r(g, c.f || '#f2c14e', x + 11, y - 8, 2, 2);
      if (c.e) r(g, c.e, x + 7, y - 12, 3, 2); r(g, '#f2c14e', x + 5, y - 2, 1, 2); r(g, '#f2c14e', x + 8, y - 2, 1, 2 - (f % 2));
    },
    small(g, c, x, y, f) {
      const d = f % 2; r(g, c.c, x + 3, y - 7 - d, 9, 7); r(g, K, x + 9, y - 6 - d, 1, 1); r(g, K, x + 5, y - 6 - d, 1, 1);
      if (c.e) { r(g, c.e, x + 4, y - 11 - d, 2, 4); r(g, c.e, x + 9, y - 11 - d, 2, 4); } if (c.f) r(g, c.f, x + 6, y - 4 - d, 3, 1);
    },
    fly(g, c, x, y, f) {
      const d = f % 2, by = y - 9 - d; r(g, c.c, x + 4, by, 8, 6); r(g, K, x + 9, by + 2, 1, 1); if (c.s) { r(g, c.s, x + 5, by, 1, 6); r(g, c.s, x + 7, by, 1, 6); }
      r(g, c.w || 'rgba(236,235,228,.75)', x + (d ? 1 : 2), by - (d ? 2 : 0), 3, 3); r(g, c.w || 'rgba(236,235,228,.75)', x + (d ? 12 : 11), by - (d ? 2 : 0), 3, 3);
    },
    ghost(g, c, x, y, f) {
      const by = y - 13 - (f % 2); r(g, c.c, x + 3, by, 10, 10); r(g, c.c, x + 3, by + 10, 2, 2); r(g, c.c, x + 7, by + 10, 2, 2); r(g, c.c, x + 11, by + 10, 2, 2);
      r(g, c.f || K, x + 5, by + 3, 2, 2); r(g, c.f || K, x + 9, by + 3, 2, 2);
    },
    swim(g, c, x, y, f) {
      r(g, c.c, x + 3, y - 8, 10, 6); r(g, c.w || c.c, x + (f % 2), y - 8, 3, 6); r(g, K, x + 11, y - 7, 1, 1); if (c.s) { r(g, c.s, x + 5, y - 10, 6, 3); r(g, c.c, x + 5, y - 2, 2, 2); r(g, c.c, x + 10, y - 2, 2, 2); }
    },
    blob(g, c, x, y, f) {
      const d = f % 2; r(g, c.c, x + 2, y - 11 + d, 12, 11 - d); r(g, c.d || c.c, x + 2, y - 3, 12, 3); r(g, c.f || K, x + 5, y - 8 + d, 2, 2); r(g, c.f || K, x + 10, y - 8 + d, 2, 2);
      if (c.cap) { r(g, c.cap, x + 1, y - 14 + d, 14, 4); r(g, '#ecebe4', x + 4, y - 13 + d, 2, 2); r(g, '#ecebe4', x + 10, y - 13 + d, 2, 2); }
    },
    hum(g, c, x, y, f) {
      const d = f % 2; r(g, c.c, x + 5, y - 16, 6, 6); r(g, c.f || K, x + 6, y - 14, 1, 1); r(g, c.f || K, x + 9, y - 14, 1, 1); r(g, c.b || c.c, x + 5, y - 10, 6, 6);
      r(g, c.c, x + (c.arm ? 11 : 3), y - 10, c.arm ? 4 : 2, 2); r(g, c.c, x + 11, y - 8 + (c.arm ? 0 : 0), c.arm ? 4 : 2, 2); r(g, c.l || c.b || c.c, x + 5, y - 4, 2, 4 - d); r(g, c.l || c.b || c.c, x + 9, y - 4, 2, 3 + d);
      if (c.hat) { r(g, c.hat, x + 3, y - 17, 10, 1); r(g, c.hat, x + 6, y - 21, 4, 4); } if (c.s) r(g, c.s, x + 7, y - 9, 2, 4);
    },
    snow(g, c, x, y) { r(g, '#ecebe4', x + 3, y - 7, 10, 7); r(g, '#ecebe4', x + 5, y - 13, 6, 6); r(g, K, x + 6, y - 11, 1, 1); r(g, K, x + 9, y - 11, 1, 1); r(g, '#e0762a', x + 10, y - 10, 3, 1); r(g, '#b3261e', x + 5, y - 8, 6, 1); },
    spider(g, c, x, y, f) {
      const d = f % 2; r(g, c.c, x + 3, y - 8, 10, 6); r(g, c.d || c.c, x + 9, y - 9, 5, 6); r(g, c.f || '#b3261e', x + 11, y - 8, 1, 1); r(g, c.f || '#b3261e', x + 13, y - 8, 1, 1);
      [1, 4, 7, 10].forEach((k, i) => { r(g, c.c, x + k, y - 5 + ((i + d) % 2), 1, 5 - ((i + d) % 2)); r(g, c.c, x + k - 1, y - 6, 3, 1); });
      if (c.tail) { r(g, c.tail, x, y - 11, 3, 1); r(g, c.tail, x + 1, y - 10, 2, 4); }
    },
    dragon(g, c, x, y, f) {
      const d = f % 2; r(g, c.c, x + 2, y - 8, 11, 6); r(g, c.c, x + 11, y - 12, 2, 5); r(g, c.c, x + 11, y - 15, 6, 4); r(g, c.f || '#f2c14e', x + 15, y - 14, 1, 1); r(g, c.d, x + 4, y - 14 + d * 2, 6, 6); r(g, c.c, x - 2, y - 7, 4, 2); r(g, c.d, x + 4, y - 2, 2, 2); r(g, c.d, x + 9, y - 2, 2, 2);
    },
  };
  // 一个技能一只，顺序 = K.SKILLS（理解 19 + 秒答 19）
  const CREATURES = [
    {n: '羊', t: 'quad', c: '#ecebe4', f: '#e6b89c', l: '#6c6f76'}, {n: '小鸡', t: 'bird', c: '#fff3b0', w: '#f2c14e', e: '#b3261e'}, {n: '小猪', t: 'quad', c: '#f6a5a0', f: '#d97f7a', tail: '#f6a5a0'}, {n: '奶牛', t: 'quad', c: '#ecebe4', s: '#2b2b2b', f: '#f6a5a0', l: '#2b2b2b'},
    {n: '兔子', t: 'small', c: '#c9a98a', e: '#c9a98a', f: '#f6a5a0'}, {n: '蜜蜂', t: 'fly', c: '#f2c14e', s: '#2b2b2b'}, {n: '狐狸', t: 'quad', c: '#e0762a', f: '#ecebe4', e: '#e0762a', tail: '#ecebe4'}, {n: '海龟', t: 'swim', c: '#7bd88f', s: '#3d7524'},
    {n: '灰狼', t: 'quad', c: '#9a9da4', f: '#2b2b2b', e: '#6c6f76', tail: '#6c6f76'}, {n: '熊猫', t: 'quad', c: '#ecebe4', s: '#2b2b2b', e: '#2b2b2b', l: '#2b2b2b'}, {n: '鹦鹉', t: 'bird', c: '#b3261e', w: '#6ea8fe', e: '#7bd88f'}, {n: '猫头鹰', t: 'bird', c: '#8a5a2c', w: '#c9a98a', e: '#5a3a20'},
    {n: '小丑鱼', t: 'swim', c: '#e0762a', w: '#ecebe4'}, {n: '蝙蝠', t: 'fly', c: '#3a2a58', w: '#2b2140'}, {n: '骆驼', t: 'quad', c: '#d9b479', h: '#b98a22', f: '#b98a22'}, {n: '企鹅', t: 'bird', c: '#2b2b2b', w: '#ecebe4', f: '#e0762a'},
    {n: '青蛙', t: 'small', c: '#6fae3a', f: '#2f5e1c'}, {n: '小鹿', t: 'quad', c: '#b27d48', s: '#ecebe4', e: '#5a3a20'}, {n: '水母', t: 'ghost', c: '#c79bf0', f: '#3a2a58'},
    {n: '绿史莱姆', t: 'blob', c: '#7bd88f', d: '#4f8a2e'}, {n: '蘑菇怪', t: 'blob', c: '#e6d8c0', cap: '#b3261e'}, {n: '木乃伊', t: 'hum', c: '#d9cfae', s: '#b5a97e', arm: 1}, {n: '雪人', t: 'snow'},
    {n: '矿洞蜘蛛', t: 'spider', c: '#3a3d44', d: '#2b2b2b'}, {n: '岩浆怪', t: 'blob', c: '#a8322d', d: '#e0762a', f: '#f2c14e'}, {n: '幽灵', t: 'ghost', c: '#dfe6ee'},
    {n: '僵尸', t: 'hum', c: '#6fae3a', b: '#2f6fb0', l: '#3a2a58', arm: 1}, {n: '骷髅兵', t: 'hum', c: '#d9d9d2', f: '#2b2b2b'}, {n: '小女巫', t: 'hum', c: '#e6b89c', b: '#5b3fa8', hat: '#2b2140'}, {n: '石头人', t: 'hum', c: '#8a8d94', b: '#6c6f76', f: '#f2c14e'},
    {n: '树精', t: 'hum', c: '#5a3a20', b: '#3d7524', f: '#7bd88f'}, {n: '蝎子', t: 'spider', c: '#c9a227', d: '#8a6d18', tail: '#8a6d18', f: '#2b2b2b'}, {n: '闪电虫', t: 'fly', c: '#6ea8fe', s: '#f2c14e'}, {n: '蓝史莱姆', t: 'blob', c: '#6ea8fe', d: '#2f6fb0'},
    {n: '铁巨人', t: 'hum', c: '#c9ccd2', b: '#9a9da4', f: '#b3261e', arm: 1}, {n: '火焰精', t: 'ghost', c: '#f2c14e', f: '#b3261e'}, {n: '水晶龙', t: 'dragon', c: '#5fd9e6', d: '#2f9fae'}, {n: '金龙', t: 'dragon', c: '#f2c14e', d: '#b98a22', f: '#b3261e'},
  ];
  const BOSS = {'speed:L1': {t: 'blob', c: '#7bd88f', d: '#4f8a2e', cap: '#f2c14e'}, 'speed:L2': {t: 'hum', c: '#d9d9d2', f: '#b3261e', hat: '#6c6f76'}, 'speed:L3': {t: 'spider', c: '#3a2a58', d: '#b3261e', f: '#f2c14e'}, 'speed:L4': {t: 'dragon', c: '#a8322d', d: '#6b1a14'}};
  // 画一只：x,y = 左下角；flip 朝左；scale 放大
  const cache = document.createElement('canvas'); cache.width = 22; cache.height = 24;
  function creature(g, c, x, y, f, opt) {
    opt = opt || {}; const h = cache.getContext('2d'), s = opt.scale || 1; h.imageSmoothingEnabled = false; h.clearRect(0, 0, 22, 24); T[c.t](h, c, 2, 24, f || 0);
    if (opt.shadow) { h.globalCompositeOperation = 'source-in'; h.fillStyle = opt.shadow; h.fillRect(0, 0, 22, 24); h.globalCompositeOperation = 'source-over'; }
    g.save(); g.imageSmoothingEnabled = false;
    if (opt.flip) { g.translate(x + 18 * s, 0); g.scale(-1, 1); g.drawImage(cache, 2, 0, 20, 24, 0, y - 24 * s, 20 * s, 24 * s); } else g.drawImage(cache, 2, 0, 20, 24, x, y - 24 * s, 20 * s, 24 * s);
    g.restore();
  }
  // 精灵：小人 / 小狗
  function spr(g, S, fr, x, y, flip, scale) { const c = document.createElement('canvas'); WORLD.drawSprite(c, S, fr, flip); g.imageSmoothingEnabled = false; g.drawImage(c, x, y - c.height * (scale || 1), c.width * (scale || 1), c.height * (scale || 1)); }
  function ground(g, W, H, y, top, mid) { r(g, mid, 0, y, W, H - y); for (let x = 0; x < W; x += 2) r(g, (x * 7) % 5 ? top : mid, x, y, 2, 2); r(g, top, 0, y, W, 1); }
  function sky(g, W, H, c1, c2) { r(g, c1, 0, 0, W, H); r(g, c2, 0, H * .45, W, H * .55); }
  function clouds(g, f) { const o = (f >> 1) % 20; r(g, '#f2f6fb', 8 + o, 6, 16, 3); r(g, '#f2f6fb', 12 + o, 4, 8, 2); r(g, '#f2f6fb', 60 + o / 2, 9, 12, 2); }
  // 奖状画面：96×54；keep = 附魔版；f = 动画帧；jump = 点一下全体跳
  function scene(g, id, keep, f, jump) {
    const W = 96, H = 54, J = jump ? -2 - (f % 2) * 2 : 0, G = 44, C = CREATURES;
    if (id === 'look') {
      sky(g, W, H, '#8ec8ff', '#bfe3ff'); clouds(g, f); ground(g, W, H, G, '#6fae3a', '#4f8a2e');
      [[40, 36], [66, 36], [53, 43], [40, 50], [66, 50]].forEach(([x, y], i) => creature(g, C[0], x, y + J, f + i, {flip: i % 2 === 1}));
      spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 14, G + 4 + J); r(g, '#6b4628', 24, G - 14 + J, 1, 18); r(g, '#6b4628', 24, G - 14 + J, 3, 1); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 2, G + 5 + J);
    } else if (id === 'bond') {
      r(g, '#2a2c33', 0, 0, W, H); for (let i = 0; i < 26; i++) r(g, i % 3 ? '#34373f' : '#3f434c', (i * 37) % W, (i * 23) % 40, 8, 4); ground(g, W, H, G, '#6c6f76', '#4a4d55');
      r(g, '#f2c14e', 20, 12, 3, 3); r(g, '#6b4628', 21, 15, 1, 6); r(g, '#f2c14e', 74, 12, 3, 3); r(g, '#6b4628', 75, 15, 1, 6);
      [[52, 22, '#f2c14e'], [62, 28, '#f2c14e'], [58, 16, '#f2c14e'], [72, 24, '#5fd9e6'], [78, 30, '#5fd9e6']].forEach(([x, y, c], i) => { r(g, '#000', x - 1, y - 1, 8, 8); r(g, c, x, y, 6, 6); r(g, '#fff', x + 1, y + 1, 2, 1); });
      spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 30, G + 4 + J); A.item(g, 'pick3', 38, G - 16 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 16, G + 5 + J);
    } else if (id === 'place') {
      sky(g, W, H, '#8ec8ff', '#bfe3ff'); clouds(g, f); ground(g, W, H, G, '#6fae3a', '#7a5230');
      r(g, '#c08a52', 58, 26, 26, 18); r(g, '#b3261e', 54, 20, 34, 6); r(g, '#8a1c16', 60, 15, 22, 5); r(g, '#4a2f1b', 68, 34, 7, 10); r(g, '#bfe3ff', 60, 30, 5, 5);
      for (let c = 0; c < 3; c++) for (let k = 0; k < 8; k++) { r(g, '#000', 34 + c * 6, G - 4 - k * 4, 6, 4); r(g, '#7bd88f', 34 + c * 6, G - 4 - k * 4, 5, 3); }
      spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 12, G + 4 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 2, G + 5 + J);
    } else if (id === 'cmp') {
      sky(g, W, H, '#ffcf9e', '#ffe2c0'); clouds(g, f); ground(g, W, H, G, '#6fae3a', '#4f8a2e');
      const tw = (x, h) => { for (let y = G - h; y < G; y += 4) for (let c = 0; c < 3; c++) { r(g, '#6c6f76', x + c * 6, y, 6, 4); r(g, '#9a9da4', x + c * 6, y, 5, 3); } for (let c = 0; c < 3; c += 2) r(g, '#9a9da4', x + c * 6, G - h - 3, 6, 3); };
      tw(16, 14); tw(62, 26); r(g, '#6b4628', 70, G - 42, 1, 12); r(g, '#b3261e', 71, G - 42, 7, 4);
      spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 66, G - 26 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 44, G + 5 + J);
    } else if (id === 'line') {
      sky(g, W, H, '#8ec8ff', '#bfe3ff'); clouds(g, f); ground(g, W, H, G + 4, '#6fae3a', '#7a5230');
      for (let x = 0; x < W; x += 5) r(g, '#6b4628', x, G + 1, 3, 2); r(g, '#9a9da4', 0, G, W, 1);
      for (let i = 0; i <= 10; i++) r(g, i % 5 ? '#ecebe4' : '#f2c14e', 4 + i * 9, i % 5 ? G - 4 : G - 7, 1, i % 5 ? 4 : 7);
      const cx = 10 + (f * 3) % 56; spr(g, WORLD.HERO, 'a', cx + 3, G - 3 + J); r(g, '#2b2b2b', cx, G - 8, 20, 7); r(g, '#8a8d94', cx + 1, G - 7, 18, 5); r(g, '#f2c14e', cx + 3, G - 6, 2, 2); r(g, '#2b2b2b', cx + 3, G - 1, 3, 2); r(g, '#2b2b2b', cx + 14, G - 1, 3, 2);
    } else if (id.startsWith('speed')) {
      const L = +id.slice(-1), bg = {1: ['#3d7524', '#6fae3a'], 2: ['#3f434c', '#6c6f76'], 3: ['#2b2140', '#3a2a58'], 4: ['#6b1a14', '#a8322d']}[L];
      sky(g, W, H, bg[0], bg[0]); for (let i = 0; i < 18; i++) r(g, bg[1], (i * 29) % W, (i * 17) % 40, 3 + i % 4, 2); ground(g, W, H, G, bg[1], '#2b2b2b');
      if (keep) {
        creature(g, BOSS[id], 44, G + 3 + J, f, {scale: 1, flip: true}); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 26, G + 4 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 12, G + 5 + J);
        r(g, '#f6a5a0', 38, 16 - (f % 3), 2, 2); r(g, '#f6a5a0', 42, 16 - (f % 3), 2, 2); r(g, '#f6a5a0', 38, 18 - (f % 3), 6, 2); r(g, '#f6a5a0', 40, 20 - (f % 3), 2, 2);
      } else {
        creature(g, BOSS[id], 48, G + 4 + (f % 2), f, {scale: 2, flip: true}); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 18, G + 4 + J); A.item(g, 'pick3', 26, G - 18 + J);
        r(g, '#fff3b0', 38 + (f % 3) * 2, 26, 3, 3);
      }
    } else if (id.startsWith('day')) {
      const n = +id.split(':')[1];
      if (n === 1) { sky(g, W, H, '#14182e', '#232a4a'); r(g, '#f2f6fb', 72, 8, 8, 8); r(g, '#14182e', 75, 8, 5, 5); ground(g, W, H, G, '#3d6a22', '#2b2b2b'); for (let i = 0; i < 16; i++) if ((i + f) % 3) r(g, '#fff', (i * 37) % W, (i * 13) % 26, 1, 1); A.item(g, 'bed', 48, G - 16); r(g, '#6b4628', 38, G - 10, 2, 10); r(g, f % 2 ? '#f2c14e' : '#e0762a', 37, G - 14, 4, 4); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 22, G + 4 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 8, G + 5 + J); }
      else if (n === 7) { sky(g, W, H, '#ffb07a', '#ffdcb0'); ground(g, W, H, G, '#6fae3a', '#4f8a2e'); for (let k = 0; k < 7; k++) r(g, k % 2 ? '#b3261e' : '#ecebe4', 58 - k * 2, G - 4 - k * 3, 12 + k * 0 + (6 - k) * 4 - 12, 3); r(g, '#2b2b2b', 62, G - 8, 4, 8); r(g, '#6b4628', 42, G - 2, 10, 2); r(g, f % 2 ? '#f2c14e' : '#e0762a', 44, G - 7, 6, 5); r(g, '#fff3b0', 46, G - 5, 2, 3); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 22, G + 4 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 8, G + 5 + J); }
      else if (n === 30) { sky(g, W, H, '#8ec8ff', '#bfe3ff'); clouds(g, f); for (let i = 0; i < 4; i++) { r(g, '#9a9da4', 44 + i * 4, 40 - i * 7, 40 - i * 8, 8); } r(g, '#ecebe4', 56, 19, 16, 6); ground(g, W, H, G, '#6fae3a', '#4f8a2e'); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 18, G + 4 + J); r(g, '#f4ecd8', 28, G - 12 + J, 10, 8); r(g, '#b3261e', 33, G - 9 + J, 2, 2); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 4, G + 5 + J); }
      else { sky(g, W, H, '#14182e', '#2b2140'); [[16, 12, '#f2c14e'], [40, 8, '#f6a5a0'], [78, 14, '#5fd9e6']].forEach(([x, y, c], i) => { const s = (f + i * 2) % 4; r(g, c, x - s * 2, y, 2, 2); r(g, c, x + s * 2, y, 2, 2); r(g, c, x, y - s * 2, 2, 2); r(g, c, x, y + s * 2, 2, 2); }); ground(g, W, H, G, '#3d6a22', '#2b2b2b'); r(g, '#8a8d94', 52, 20, 34, 24); r(g, '#8a8d94', 50, 14, 8, 30); r(g, '#8a8d94', 80, 14, 8, 30); r(g, '#1b1d22', 64, 32, 10, 12); r(g, '#b3261e', 54, 8, 1, 6); r(g, '#b3261e', 55, 8, 5, 3); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 24, G + 4 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 10, G + 5 + J); }
    } else {
      const n = +id.split(':')[1]; r(g, '#3f2c1a', 0, 0, W, H); for (let i = 0; i < 12; i++) r(g, '#4a3522', (i * 31) % W, (i * 19) % 40, 10, 3); ground(g, W, H, G, '#6c6f76', '#4a4d55');
      A.item(g, 'furnace', 42, G - 16); r(g, f % 2 ? '#f2c14e' : '#e0762a', 47, G - 7 - (f % 2), 6, 4); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 20, G + 4 + J);
      const k = n === 1 ? 1 : n === 10 ? 4 : 9; for (let i = 0; i < k; i++) A.ingot(g, 62 + (i % 3) * 8, G - 5 - Math.floor(i / 3) * 5, '#f2c14e', '#b98a22');
      r(g, '#f6a5a0', 44, G - 28 + ((f * 2) % 8), 3, 1); r(g, '#f6a5a0', 45, G - 29 + ((f * 2) % 8), 1, 3);
    }
    if (keep) { for (let i = 0; i < 8; i++) { const p = (f + i * 3) % 12; if (p < 3) r(g, p === 1 ? '#fff' : '#e9c6ff', (i * 41 + 7) % W, (i * 23 + 5) % (H - 8), 2, 2); } const x = ((f * 6) % 160) - 40; g.fillStyle = 'rgba(180,100,255,.26)'; for (let y = 0; y < H; y++) g.fillRect(x - y / 2, y, 16, 1); }
  }
  // 奖状墙上的小图：主角色 + 底色
  const THUMB = {look: ['#8ec8ff', 'c', 0], bond: ['#2a2c33', 'i', 'pick3'], place: ['#bfe3ff', 'i', 'bench'], cmp: ['#ffdcb0', 'i', 'deco14'], line: ['#bfe3ff', 'i', 'cartish']};
  function thumb(g, c, x, y, w, h, f) {
    const sc = c.scene, keep = c.kind === 'keep';
    const bg = sc.startsWith('speed') ? '#3a2a58' : sc.startsWith('day') ? (sc === 'day:7' || sc === 'day:30' ? '#8ec8ff' : '#1d2340') : sc.startsWith('fix') ? '#3f2c1a' : THUMB[sc][0];
    r(g, bg, x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const cx = x + (w >> 1) - 7, by = y + h - 1;
    if (sc.startsWith('speed')) creature(g, BOSS[sc], cx - 1, by + 1, 0, {flip: true});
    else if (sc === 'look') creature(g, CREATURES[0], cx - 1, by, 0);
    else if (sc === 'line') { r(g, '#2b2b2b', x + 3, by - 7, w - 6, 6); r(g, '#8a8d94', x + 4, by - 6, w - 8, 4); r(g, '#2b2b2b', x + 5, by - 1, 2, 1); r(g, '#2b2b2b', x + w - 7, by - 1, 2, 1); }
    else if (sc === 'cmp') { r(g, '#9a9da4', x + 3, by - 5, 5, 5); r(g, '#9a9da4', x + 11, by - 11, 5, 11); r(g, '#b3261e', x + 13, by - 13, 3, 2); }
    else if (sc === 'place') { r(g, '#c08a52', x + 4, by - 6, 11, 6); r(g, '#b3261e', x + 2, by - 9, 15, 3); r(g, '#4a2f1b', x + 8, by - 3, 3, 3); }
    else { const id = sc === 'bond' ? 'pick3' : sc === 'day:1' ? 'bed' : sc.startsWith('fix') ? 'furnace' : sc === 'day:7' ? 'deco3' : sc === 'day:30' ? 'glass' : 'trophy'; const t = document.createElement('canvas'); t.width = 24; t.height = 16; A.item(t.getContext('2d'), id, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, 24, 16, x + (id === 'bed' ? 1 : 3), y + 1, id === 'bed' ? 18 : 18, 12); }
    if (keep) { const p = ((f || 0) * 4) % 40 - 8; g.fillStyle = 'rgba(190,110,255,.42)'; for (let i = 0; i < h; i++) g.fillRect(x + p - i / 2, y + i, 6, 1); }
    g.restore();
  }
  Object.assign(A, {CREATURES, BOSS, creature, scene, thumb});
})(this);
