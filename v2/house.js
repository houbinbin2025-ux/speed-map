// 空空数学岛 · 空空的家（屋内）：原创像素画、奖状、伙伴图鉴、战利品箱、摆放。奖励判断在 home.js；进度只通过 o.S() 读写
// 全部原创，不用任何现成游戏的角色、怪物造型和名称。来源：原型 v5（Ben 11-04 同意上线）；说明书：docs/说明书-v5-家.md
// ---------- 像素画：每件 16×16 以内，原点在左上 ----------
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
    {n: '小丑鱼', t: 'swim', c: '#e0762a', w: '#ecebe4'}, {n: '蝙蝠', t: 'fly', c: '#8d7ab8', w: '#b6a6d8'}, {n: '骆驼', t: 'quad', c: '#d9b479', h: '#b98a22', f: '#b98a22'}, {n: '企鹅', t: 'bird', c: '#2b2b2b', w: '#ecebe4', f: '#e0762a'},
    {n: '青蛙', t: 'small', c: '#6fae3a', f: '#2f5e1c'}, {n: '小鹿', t: 'quad', c: '#b27d48', s: '#ecebe4', e: '#5a3a20'}, {n: '水母', t: 'ghost', c: '#c79bf0', f: '#3a2a58'},
    {n: '绿果冻', t: 'blob', c: '#7bd88f', d: '#4f8a2e'}, {n: '蘑菇怪', t: 'blob', c: '#e6d8c0', cap: '#b3261e'}, {n: '木乃伊', t: 'hum', c: '#d9cfae', s: '#b5a97e', arm: 1}, {n: '雪人', t: 'snow'},
    {n: '矿洞蜘蛛', t: 'spider', c: '#3a3d44', d: '#2b2b2b'}, {n: '熔岩团', t: 'blob', c: '#a8322d', d: '#e0762a', f: '#f2c14e'}, {n: '幽灵', t: 'ghost', c: '#dfe6ee'},
    {n: '丧尸兵', t: 'hum', c: '#8aa37b', b: '#7a5230', l: '#5a3a20'}, {n: '骨头兵', t: 'hum', c: '#d9d9d2', f: '#2b2b2b'}, {n: '小巫师', t: 'hum', c: '#e6b89c', b: '#b3261e', hat: '#8a1c16'}, {n: '石头人', t: 'hum', c: '#8a8d94', b: '#6c6f76', f: '#f2c14e'},
    {n: '树精', t: 'hum', c: '#5a3a20', b: '#3d7524', f: '#7bd88f'}, {n: '蝎子', t: 'spider', c: '#c9a227', d: '#8a6d18', tail: '#8a6d18', f: '#2b2b2b'}, {n: '闪电虫', t: 'fly', c: '#6ea8fe', s: '#f2c14e'}, {n: '蓝果冻', t: 'blob', c: '#6ea8fe', d: '#2f6fb0'},
    {n: '机器人', t: 'hum', c: '#c9ccd2', b: '#9a9da4', f: '#b3261e', arm: 1}, {n: '火焰精', t: 'ghost', c: '#f2c14e', f: '#b3261e'}, {n: '水晶龙', t: 'dragon', c: '#5fd9e6', d: '#2f9fae'}, {n: '金龙', t: 'dragon', c: '#f2c14e', d: '#b98a22', f: '#b3261e'},
  ];
  const BOSS = {'speed:L1': {t: 'blob', c: '#7bd88f', d: '#4f8a2e', cap: '#f2c14e'}, 'speed:L2': {t: 'hum', c: '#d9d9d2', f: '#b3261e', hat: '#6c6f76'}, 'speed:L3': {t: 'spider', c: '#c9365a', d: '#7a1a40', f: '#f2c14e'}, 'speed:L4': {t: 'dragon', c: '#a8322d', d: '#6b1a14'}};
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
      sky(g, W, H, '#8ec8ff', '#bfe3ff'); clouds(g, f); ground(g, W, H, 22, '#6fae3a', '#5c9a30');
      [[40, 32], [66, 32], [53, 41], [40, 50], [66, 50]].forEach(([x, y], i) => creature(g, C[0], x, y + J, f + i, {flip: i % 2 === 1}));
      spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 14, G + 4 + J); r(g, '#6b4628', 24, G - 14 + J, 1, 18); r(g, '#6b4628', 24, G - 14 + J, 3, 1); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 2, G + 5 + J);
    } else if (id === 'bond') {
      r(g, '#2a2c33', 0, 0, W, H); for (let i = 0; i < 26; i++) r(g, i % 3 ? '#34373f' : '#3f434c', (i * 37) % W, (i * 23) % 40, 8, 4); ground(g, W, H, G, '#6c6f76', '#4a4d55');
      r(g, '#f2c14e', 20, 12, 3, 3); r(g, '#6b4628', 21, 15, 1, 6); r(g, '#f2c14e', 74, 12, 3, 3); r(g, '#6b4628', 75, 15, 1, 6);
      [[52, 22, '#f2c14e'], [62, 28, '#f2c14e'], [58, 16, '#f2c14e'], [72, 24, '#5fd9e6'], [78, 30, '#5fd9e6']].forEach(([x, y, c], i) => { r(g, '#000', x - 1, y - 1, 8, 8); r(g, c, x, y, 6, 6); r(g, '#fff', x + 1, y + 1, 2, 1); });
      spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 30, G + 4 + J); A.item(g, 'pick3', 38, G - 16 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 16, G + 5 + J);
    } else if (id === 'place') {
      sky(g, W, H, '#8ec8ff', '#bfe3ff'); clouds(g, f); ground(g, W, H, G, '#6fae3a', '#7a5230');
      r(g, '#c08a52', 58, 26, 26, 18); r(g, '#b3261e', 54, 20, 34, 6); r(g, '#8a1c16', 60, 15, 22, 5); r(g, '#4a2f1b', 68, 34, 7, 10); r(g, '#bfe3ff', 60, 30, 5, 5);
      for (let c = 0; c < 3; c++) for (let k = 0; k < 10; k++) { r(g, '#000', 34 + c * 6, G - 4 - k * 4, 6, 4); r(g, '#7bd88f', 34 + c * 6, G - 4 - k * 4, 5, 3); }
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
      const L = +id.slice(-1), bg = {1: ['#3d7524', '#6fae3a'], 2: ['#3f434c', '#6c6f76'], 3: ['#2b2140', '#3a2a58'], 4: ['#1d2340', '#2f3a6b']}[L];
      sky(g, W, H, bg[0], bg[0]); for (let i = 0; i < 18; i++) r(g, bg[1], (i * 29) % W, (i * 17) % 40, 3 + i % 4, 2); ground(g, W, H, G, bg[1], '#2b2b2b');
      if (keep) {
        creature(g, BOSS[id], 44, G + 3 + J, f, {scale: 1, flip: true}); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 26, G + 4 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 12, G + 5 + J);
        r(g, '#f6a5a0', 38, 16 - (f % 3), 2, 2); r(g, '#f6a5a0', 42, 16 - (f % 3), 2, 2); r(g, '#f6a5a0', 38, 18 - (f % 3), 6, 2); r(g, '#f6a5a0', 40, 20 - (f % 3), 2, 2);
      } else {
        creature(g, BOSS[id], 48, G + 4 + (f % 2), f, {scale: 2, flip: true}); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 18, G + 4 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 4, G + 5 + J); A.item(g, 'pick3', 26, G - 18 + J);
        r(g, '#fff3b0', 38 + (f % 3) * 2, 26, 3, 3);
      }
    } else if (id.startsWith('day')) {
      const n = +id.split(':')[1];
      if (n === 1) { sky(g, W, H, '#14182e', '#232a4a'); r(g, '#f2f6fb', 73, 7, 6, 1); r(g, '#f2f6fb', 72, 8, 8, 6); r(g, '#f2f6fb', 73, 14, 6, 1); r(g, '#c9d2e0', 74, 9, 2, 2); r(g, '#c9d2e0', 77, 12, 1, 1); ground(g, W, H, G, '#3d6a22', '#2b2b2b'); for (let i = 0; i < 16; i++) if ((i + f) % 3) r(g, '#fff', (i * 37) % W, (i * 13) % 26, 1, 1); A.item(g, 'bed', 48, G - 16); r(g, '#6b4628', 38, G - 10, 2, 10); r(g, f % 2 ? '#f2c14e' : '#e0762a', 37, G - 14, 4, 4); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 22, G + 4 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 8, G + 5 + J); }
      else if (n === 7) { sky(g, W, H, '#ffb07a', '#ffdcb0'); ground(g, W, H, G, '#6fae3a', '#4f8a2e'); for (let k = 0; k < 8; k++) r(g, k % 2 ? '#b3261e' : '#ecebe4', 52 + k * 2, G - 3 - k * 3, 28 - k * 4, 3); r(g, '#2b2b2b', 64, G - 9, 4, 9); r(g, '#6b4628', 42, G - 2, 10, 2); r(g, f % 2 ? '#f2c14e' : '#e0762a', 44, G - 7, 6, 5); r(g, '#fff3b0', 46, G - 5, 2, 3); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 22, G + 4 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 8, G + 5 + J); }
      else if (n === 30) { sky(g, W, H, '#8ec8ff', '#bfe3ff'); clouds(g, f); for (let i = 0; i < 4; i++) { r(g, '#9a9da4', 44 + i * 4, 40 - i * 7, 40 - i * 8, 8); } r(g, '#ecebe4', 56, 19, 16, 6); ground(g, W, H, G, '#6fae3a', '#4f8a2e'); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 18, G + 4 + J); r(g, '#f4ecd8', 28, G - 12 + J, 10, 8); r(g, '#b3261e', 33, G - 9 + J, 2, 2); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 4, G + 5 + J); }
      else { sky(g, W, H, '#14182e', '#2b2140'); [[16, 12, '#f2c14e'], [40, 8, '#f6a5a0'], [78, 14, '#5fd9e6']].forEach(([x, y, c], i) => { const s = (f + i * 2) % 4; r(g, c, x - s * 2, y, 2, 2); r(g, c, x + s * 2, y, 2, 2); r(g, c, x, y - s * 2, 2, 2); r(g, c, x, y + s * 2, 2, 2); }); ground(g, W, H, G, '#3d6a22', '#2b2b2b'); r(g, '#8a8d94', 52, 20, 34, 24); r(g, '#8a8d94', 50, 14, 8, 30); r(g, '#8a8d94', 80, 14, 8, 30); r(g, '#1b1d22', 64, 32, 10, 12); r(g, '#b3261e', 54, 8, 1, 6); r(g, '#b3261e', 55, 8, 5, 3); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 24, G + 4 + J); spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 10, G + 5 + J); }
    } else {
      const n = +id.split(':')[1]; r(g, '#3f2c1a', 0, 0, W, H); for (let i = 0; i < 12; i++) r(g, '#4a3522', (i * 31) % W, (i * 19) % 40, 10, 3); ground(g, W, H, G, '#6c6f76', '#4a4d55');
      A.item(g, 'furnace', 42, G - 16); r(g, f % 2 ? '#f2c14e' : '#e0762a', 47, G - 7 - (f % 2), 6, 4); spr(g, WORLD.HERO, f % 2 ? 'a' : 'b', 20, G + 4 + J);
      const k = n === 1 ? 1 : n === 10 ? 4 : 9; for (let i = 0; i < k; i++) A.ingot(g, 62 + (i % 3) * 8, G - 5 - Math.floor(i / 3) * 5, '#f2c14e', '#b98a22');
      spr(g, WORLD.DOG, f % 2 ? 'a' : 'b', 6, G + 5 + J);
    }
    if (keep) { for (let i = 0; i < 8; i++) { const p = (f + i * 3) % 12; if (p < 3) r(g, p === 1 ? '#fff' : '#e9c6ff', (i * 41 + 7) % W, (i * 23 + 5) % (H - 8), 2, 2); } const x = ((f * 6) % 160) - 40; g.fillStyle = 'rgba(180,100,255,.26)'; for (let y = 0; y < H; y++) g.fillRect(x - y / 2, y, 16, 1); }
  }
  // 奖状墙上的小图：主角色 + 底色
  const THUMB = {look: ['#8ec8ff'], bond: ['#2a2c33'], place: ['#bfe3ff'], cmp: ['#ffdcb0'], line: ['#bfe3ff']};
  function thumb(g, c, x, y, w, h, f) {
    const sc = c.scene, keep = c.kind === 'keep';
    const bg = sc.startsWith('speed') ? '#3a2a58' : sc.startsWith('day') ? (sc === 'day:7' || sc === 'day:30' ? '#8ec8ff' : '#1d2340') : sc.startsWith('fix') ? '#3f2c1a' : THUMB[sc][0];
    r(g, bg, x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const cx = x + (w >> 1) - 7, by = y + h - 1;
    if (sc.startsWith('speed')) creature(g, BOSS[sc], x + 4, by + 1, 0, {flip: true, scale: .62});
    else if (sc === 'look') creature(g, CREATURES[0], x + 3, by + 1, 0);
    else if (sc === 'line') { r(g, '#2b2b2b', x + 3, by - 7, w - 6, 6); r(g, '#8a8d94', x + 4, by - 6, w - 8, 4); r(g, '#2b2b2b', x + 5, by - 1, 2, 1); r(g, '#2b2b2b', x + w - 7, by - 1, 2, 1); }
    else if (sc === 'cmp') { r(g, '#9a9da4', x + 3, by - 5, 5, 5); r(g, '#9a9da4', x + 11, by - 11, 5, 11); r(g, '#b3261e', x + 13, by - 13, 3, 2); }
    else if (sc === 'place') { r(g, '#c08a52', x + 4, by - 6, 11, 6); r(g, '#b3261e', x + 2, by - 9, 15, 3); r(g, '#4a2f1b', x + 8, by - 3, 3, 3); }
    else { const id = sc === 'bond' ? 'pick3' : sc === 'day:1' ? 'bed' : sc.startsWith('fix') ? 'furnace' : sc === 'day:7' ? 'deco3' : sc === 'day:30' ? 'glass' : 'trophy'; const t = document.createElement('canvas'); t.width = 24; t.height = 16; A.item(t.getContext('2d'), id, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, 24, 16, x + (id === 'bed' ? 1 : 3), y + 1, id === 'bed' ? 18 : 18, 12); }
    if (keep) { const p = ((f || 0) * 4) % 40 - 8; g.fillStyle = 'rgba(190,110,255,.42)'; for (let i = 0; i < h; i++) g.fillRect(x + p - i / 2, y + i, 6, 1); }
    g.restore();
  }
  Object.assign(A, {CREATURES, BOSS, creature, scene, thumb});
})(this);

(function (root) {
  'use strict';
  const A = root.ART, H = root.HOME, E = root.ENGINE, C = root.SM, K = root.SKILLS;
  // o: {S(), today(), save(), show(), leave(), practice(r), doneToday()}
  function create(rootEl, o) {
  rootEl.innerHTML = `<div id="h_vp"><div id="h_world"><canvas id="h_cvRoom"></canvas><canvas id="h_cvFx"></canvas><canvas id="h_cvHero"></canvas></div></div>
  <div class="hud">
    <button class="btn" id="h_btnOut">回到岛上</button>
    <span class="sp"></span>
    <button class="btn" id="h_btnEdit">摆放</button>
    <div class="tally"><span>奖状 <b id="h_tC">0</b></span><span>伙伴 <b id="h_tM">0</b></span><span>钻石 <b id="h_tD">0</b></span></div>
  </div>
  <div class="toast" id="h_toast" hidden></div>
  <div class="nav" id="h_nav"></div>
  <aside class="sheet" id="h_sheet"></aside>
  <div id="h_certV" hidden></div>
  <div id="h_book" hidden></div>
  <div id="h_loot" hidden></div>
`;
  const el = id => rootEl.querySelector('#' + id);
  let S = o.S(), E0 = H.earned(S);
  // ---------- 屋子布局（art 像素） ----------
  const RH = 76, FLOOR = 62, RW = 900;
  const CW = {x: 8, y: 8, dx: 24, dy: 17.5, w: 19, h: 14};   // 奖状墙：3 排大图
  const certPos = {};
  H.CERTS.forEach(c => {
    const list = c.kind === 'learn' ? H.CERTS.filter(x => x.kind === 'learn') : c.kind === 'keep' ? H.CERTS.filter(x => x.kind === 'keep') : H.CERTS.filter(x => x.kind === 'day' || x.kind === 'fix');
    const row = c.kind === 'learn' ? 0 : c.kind === 'keep' ? 1 : 2, col = list.indexOf(c);
    certPos[c.id] = {x: CW.x + col * CW.dx, y: CW.y + row * CW.dy};
  });
  const DOOR = {x: 239, w: 18}, LOOT = {x: 215, w: 18}, CHEST = {x: 265, w: 16}, SIGN = {x: 261, y: 12, w: 22, h: 18}, BOOK = {x: 289, w: 22}, CAB = {x: 319, w: 30};
  const FS = [], WS = [];
  for (let i = 0; i < 22; i++) FS.push({id: 'F' + i, t: 'F', x: 359 + i * 24, y: FLOOR - 16});
  for (let i = 0; i < 18; i++) WS.push({id: 'W' + i, t: 'W', x: 359 + i * 24, y: 16});
  const SLOTS = {}; FS.concat(WS).forEach(s => { SLOTS[s.id] = s; });
  const placeable = () => E0.items.filter(i => !i.part);
  function autoPlace() {
    const pl = S.home.place, used = new Set(Object.values(pl));
    placeable().forEach(i => { if (pl[i.id]) return; const t = A.ITEM[i.id].t, s = (t === 'F' ? FS : WS).find(s => !used.has(s.id)); if (s) { pl[i.id] = s.id; used.add(s.id); } });
  }
  const parts = () => E0.items.filter(i => i.part).map(i => i.id);

  // ---------- 画屋子 ----------
  const cvRoom = el('h_cvRoom'), cvFx = el('h_cvFx'), cvHero = el('h_cvHero');
  const frameCol = {learn: ['#c9a36b', '#f4ecd8'], keep: ['#f2c14e', '#fff3b0'], day: ['#6ea8fe', '#e6f0ff'], fix: ['#7bd88f', '#e7f8ea']};
  let shadows = [];
  function drawRoom() {
    cvRoom.width = RW; cvRoom.height = RH; const g = cvRoom.getContext('2d'), C2 = A.COL, r = A.r;
    // 墙（木板）、天花、地板
    for (let x = 0; x < RW; x += 8) for (let y = 4; y < FLOOR; y += 4) { r(g, (x + y) % 16 === 0 ? '#a97a47' : (x * 3 + y) % 24 === 4 ? '#b58450' : '#b98a55', x, y, 8, 4); r(g, '#8f6538', x, y + 3, 8, 1); if ((y >> 2) % 2 === (x >> 3) % 2) r(g, '#8f6538', x, y, 1, 3); }
    r(g, '#5a3a20', 0, 0, RW, 4); r(g, '#3b2513', 0, 3, RW, 1);
    for (let x = 0; x < RW; x += 8) { r(g, x % 16 ? '#7c7f86' : '#8a8d94', x, FLOOR, 8, 7); r(g, '#55585f', x + 7, FLOOR, 1, 7); r(g, '#55585f', x, FLOOR + 6, 8, 1); r(g, x % 16 ? '#5a5d64' : '#65686f', x, FLOOR + 7, 8, 7); }
    for (let x = 0; x < RW; x += 80) { r(g, '#5a3a20', x + 2, 4, 3, FLOOR - 4); }
    // 奖状墙
    r(g, '#6b4628', 3, 4, 225, 56); r(g, '#8a5a2c', 4, 5, 223, 54);
    H.CERTS.forEach(c => {
      const p = certPos[c.id], got = E0.certs.includes(c);
      if (got) { const a = frameCol[c.kind][0]; r(g, '#000', p.x - 2, p.y - 2, CW.w + 4, CW.h + 4); r(g, a, p.x - 1, p.y - 1, CW.w + 2, CW.h + 2); A.thumb(g, c, p.x, p.y, CW.w, CW.h, 0); }
      else { r(g, '#5a3a20', p.x - 1, p.y - 1, CW.w + 2, CW.h + 2); r(g, '#3f2c1a', p.x, p.y, CW.w, CW.h); r(g, '#6b4628', p.x + 8, p.y + 3, 3, 2); r(g, '#6b4628', p.x + 10, p.y + 5, 2, 2); r(g, '#6b4628', p.x + 9, p.y + 7, 2, 2); r(g, '#6b4628', p.x + 9, p.y + 10, 2, 2); }
    });
    // 门
    r(g, '#000', DOOR.x - 1, FLOOR - 29, DOOR.w + 2, 29); r(g, '#4a2f1b', DOOR.x, FLOOR - 28, DOOR.w, 28); r(g, '#5a3a20', DOOR.x + 2, FLOOR - 26, 6, 10); r(g, '#5a3a20', DOOR.x + 10, FLOOR - 26, 6, 10); r(g, '#bfe3ff', DOOR.x + 3, FLOOR - 25, 4, 8); r(g, '#bfe3ff', DOOR.x + 11, FLOOR - 25, 4, 8); r(g, '#f2c14e', DOOR.x + 14, FLOOR - 13, 2, 2);
    // 告示牌
    r(g, '#000', SIGN.x - 1, SIGN.y - 1, SIGN.w + 2, SIGN.h + 2); r(g, '#c08a52', SIGN.x, SIGN.y, SIGN.w, SIGN.h); [3, 7, 11, 15].forEach(y => r(g, '#5a3a20', SIGN.x + 3, SIGN.y + y - 1, SIGN.w - 6 - (y % 4) * 2, 1)); r(g, '#b3261e', SIGN.x + 9, SIGN.y - 2, 4, 2);
    // 伙伴图鉴（讲台 + 打开的书）
    r(g, '#5a3a20', BOOK.x + 8, FLOOR - 14, 6, 14); r(g, '#3b2513', BOOK.x + 4, FLOOR - 2, 14, 2); r(g, '#000', BOOK.x - 1, FLOOR - 25, BOOK.w + 2, 12); r(g, '#5b3fa8', BOOK.x, FLOOR - 24, BOOK.w, 10); r(g, '#f4ecd8', BOOK.x + 1, FLOOR - 23, 9, 8); r(g, '#f4ecd8', BOOK.x + 12, FLOOR - 23, 9, 8); r(g, '#8a5a2c', BOOK.x + 3, FLOOR - 21, 5, 1); r(g, '#8a5a2c', BOOK.x + 3, FLOOR - 18, 4, 1); r(g, '#7bd88f', BOOK.x + 14, FLOOR - 21, 5, 4);
    // 矿物柜
    r(g, '#000', CAB.x - 1, FLOOR - 49, CAB.w + 2, 49); r(g, '#6b4628', CAB.x, FLOOR - 48, CAB.w, 48); [0, 16, 32].forEach((y, i) => { r(g, '#2a1d12', CAB.x + 2, FLOOR - 46 + y, CAB.w - 4, 12); r(g, '#8a5a2c', CAB.x, FLOOR - 34 + y, CAB.w, 2); });
    const t = E0.t, shelf = (n, c, c2, y) => { const show = Math.min(n, 12); for (let i = 0; i < show; i++) A.ingot(g, CAB.x + 3 + (i % 4) * 6, FLOOR - 39 + y - (i >> 2) * 3 - (i >= 4 ? 1 : 0), c, c2); };
    shelf(t.diamond, '#5fd9e6', '#2f9fae', 0); shelf(t.gold, '#f2c14e', '#b98a22', 16); shelf(t.iron, '#c9ccd2', '#6c6f76', 32);
    // 木箱
    const cx = CHEST.x, cy = FLOOR - 13; r(g, '#000', cx - 1, cy - 1, 18, 14); r(g, '#c08a52', cx, cy, 16, 13); r(g, '#8a5a2c', cx, cy + 4, 16, 1); r(g, '#f2c14e', cx + 7, cy + 3, 2, 3);
    // 战利品箱：有新奖励才出现
    if (S.home.loot && S.home.loot.length) { const lx = LOOT.x, ly = FLOOR - 15; r(g, '#000', lx - 1, ly - 1, 20, 16); r(g, '#5b3fa8', lx, ly, 18, 15); r(g, '#3a2a58', lx, ly + 5, 18, 2); r(g, '#f2c14e', lx, ly, 18, 1); r(g, '#f2c14e', lx, ly + 14, 18, 1); r(g, '#f2c14e', lx, ly, 1, 15); r(g, '#f2c14e', lx + 17, ly, 1, 15); r(g, '#f2c14e', lx + 7, ly + 3, 4, 6); }
    // 已摆放
    placeable().forEach(i => { const s = SLOTS[S.home.place[i.id]]; if (!s) return; A.item(g, i.id, s.x, s.y); if (i.id === 'armor') A.armorParts(g, s.x, s.y, parts()); });
    // 下一个目标的影子
    shadows = [];
    const used = new Set(Object.values(S.home.place));
    H.next(S, 3).filter(n => n.r.need && !n.r.kind && A.ITEM[n.r.id] && !n.r.part).slice(0, 3).forEach(n => { const t2 = A.ITEM[n.r.id].t, sl = (t2 === 'F' ? FS : WS).find(s => !used.has(s.id)); if (sl) { used.add(sl.id); A.shadow(g, n.r.id, sl.x, sl.y); shadows.push({slot: sl.id, n}); } });
    if (editing) (function () { FS.concat(WS).forEach(s => { if (!used.has(s.id)) { g.strokeStyle = '#f2c14e'; g.setLineDash([2, 2]); g.strokeRect(s.x + .5, s.y + .5, 15, 15); g.setLineDash([]); } }); }());
    if (editing && sel) { const s = SLOTS[S.home.place[sel]]; if (s) { g.strokeStyle = '#fff'; g.strokeRect(s.x - .5, s.y - .5, 17, 17); } }
    el('h_tC').textContent = E0.certs.length + '/' + H.CERTS.length; el('h_tM').textContent = E0.medals.filter(m => m.kind === 'bronze').length + '/' + K.SKILLS.length; el('h_tD').textContent = t.diamond;
  }
  // 动态：火、音符
  let fxT = 0;
  function drawFx() {
    cvFx.width = RW; cvFx.height = RH; const g = cvFx.getContext('2d'); fxT++;
    placeable().forEach(i => {
      const s = SLOTS[S.home.place[i.id]]; if (!s) return;
      if (i.id === 'furnace') { A.r(g, fxT % 2 ? '#f2c14e' : '#e0762a', s.x + 5, s.y + 10 - (fxT % 2), 6, 3 + (fxT % 2)); A.r(g, '#fff3b0', s.x + 7, s.y + 11, 2, 2); }
      if (i.id === 'torch') { A.r(g, fxT % 2 ? '#f2c14e' : '#e0762a', s.x + 6, s.y + 3 + (fxT % 2), 4, 3); A.r(g, '#fff3b0', s.x + 7, s.y + 4, 2, 2); }
      if (i.id === 'jukebox' && playing) { if (fxT % 2 === 0) blip([[[392, 523, 659, 523, 440, 587, 698, 587][(fxT >> 1) % 8], 0, .16]]); A.r(g, '#fff', s.x + 4 + (fxT % 8), s.y - 4 - (fxT % 5), 2, 2); A.r(g, '#fff', s.x + 10 - (fxT % 6), s.y - 2 - (fxT % 4), 2, 2); }
      if (i.id === 'lamp' || i.id === 'deco13') { g.fillStyle = 'rgba(255,243,176,.12)'; g.fillRect(s.x - 3, s.y - 3, 22, 22); }
    });
    E0.certs.filter(c => c.kind === 'keep').forEach(c => { const p = certPos[c.id], off = ((fxT * 3 + p.x) % 40) - 8; g.save(); g.beginPath(); g.rect(p.x, p.y, CW.w, CW.h); g.clip(); g.fillStyle = 'rgba(190,110,255,.5)'; for (let i = 0; i < CW.h; i++) g.fillRect(p.x + off - i / 2, p.y + i, 6, 1); g.restore(); });
    if (S.home.loot && S.home.loot.length) { const q = fxT % 4; A.r(g, '#fff3b0', LOOT.x - 2 + q * 5, FLOOR - 20 - (q % 2) * 2, 2, 2); A.r(g, '#fff', LOOT.x + 18 - q * 4, FLOOR - 24 + q, 1, 1); }
    if (fresh) { const s = fresh.pos; if (s && fxT % 2) { A.r(g, '#fff', s.x - 2, s.y - 2, 2, 2); A.r(g, '#f2c14e', s.x + 14, s.y + 2, 2, 2); A.r(g, '#fff', s.x + 8, s.y - 4, 2, 2); } }
  }
  let playing = false, fresh = null;

  // ---------- 小人、小狗、伙伴 ----------
  const hero = {x: DOOR.x + 2, flip: false}, dog = {x: DOOR.x + 12};
  let pets = [], petF = 0, heroF = 'a';
  const crOf = sid => A.CREATURES[H.creatureOf(sid) < 0 ? 0 : H.creatureOf(sid)];   // 新增技能还没配伙伴时不报错（tests/home.test.js 会拦）
  const learned = () => E0.medals.filter(m => m.kind === 'bronze').map(m => m.skill.id);
  const isGold = sid => E0.medals.some(m => m.kind === 'gold' && m.skill.id === sid);
  function syncPets() {
    const h = S.home, L = learned(); if (!h.pets) h.pets = L.slice(-3);
    h.pets = h.pets.filter(i => L.includes(i));
    pets = h.pets.map((i, k) => (pets.find(p => p.i === i) || {i, x: 370 + k * 70, dir: k % 2 ? -1 : 1, hop: 0}));
  }
  function drawHero(f) {
    heroF = f || heroF; cvHero.width = RW; cvHero.height = RH; const g = cvHero.getContext('2d');
    pets.forEach(p => { A.creature(g, crOf(p.i), Math.round(p.x), FLOOR + 2 - (p.hop > 0 ? 3 : 0), petF, {flip: p.dir < 0}); if (isGold(p.i) && petF % 3 === 0) A.r(g, '#e9c6ff', p.x + 4 + (petF % 7), FLOOR - 14, 1, 1); });
    const a = document.createElement('canvas'), b = document.createElement('canvas');
    WORLD.drawSprite(a, WORLD.HERO, heroF, hero.flip); WORLD.drawSprite(b, WORLD.DOG, heroF, hero.flip);
    g.drawImage(a, Math.round(hero.x), FLOOR + 1 - a.height); g.drawImage(b, Math.round(dog.x), FLOOR + 1 - b.height);
  }
  setInterval(() => { if (rootEl.hidden) return; petF++; pets.forEach(p => { if (p.hop > 0) p.hop--; if (Math.random() < .05) p.dir *= -1; p.x = Math.max(352, Math.min(RW - 20, p.x + p.dir * .9)); if (p.x <= 352 || p.x >= RW - 20) p.dir *= -1; }); if (!walking) drawHero(); }, 220);
  // 8 位音效：全部现场合成
  let AC = null;
  function blip(notes) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t0 = AC.currentTime; notes.forEach(([f, at, len]) => { const o = AC.createOscillator(), v = AC.createGain(); o.type = 'square'; o.frequency.value = f; v.gain.setValueAtTime(.035, t0 + at); v.gain.linearRampToValueAtTime(0, t0 + at + len); o.connect(v); v.connect(AC.destination); o.start(t0 + at); o.stop(t0 + at + len); }); } catch (e) {} }
  const SND = {tap: [[660, 0, .07]], open: [[392, 0, .08], [523, .08, .08], [659, .16, .08], [784, .24, .16]], get: [[784, 0, .07], [1047, .07, .12]], pet: [[880, 0, .05], [660, .06, .06]]};
  let walking = null;
  function walkTo(tx, done) {
    if (walking) cancelAnimationFrame(walking);
    const from = hero.x, ms = Math.min(700, 120 + Math.abs(tx - from) * 4), t0 = performance.now(); hero.flip = tx < from; let last = 0, f = 'a';
    const step = now => { const k = Math.min(1, (now - t0) / ms); hero.x = from + (tx - from) * k; dog.x = hero.x + (hero.flip ? 10 : -10); if (now - last > 110) { f = f === 'a' ? 'b' : 'a'; last = now; } drawHero(f); if (k < 1) walking = requestAnimationFrame(step); else { walking = null; drawHero('a'); done && done(); } };
    walking = requestAnimationFrame(step);
  }

  // ---------- 镜头、拖动 ----------
  const vp = el('h_vp'), world = el('h_world');
  let P = 4, camX = 0, maxX = 0;
  const VW = () => innerWidth, VH = () => innerHeight;
  function layout() {
    P = VH() / RH; [cvRoom, cvFx, cvHero].forEach(c => { c.style.width = RW * P + 'px'; c.style.height = RH * P + 'px'; });
    maxX = Math.max(0, RW * P - VW()); setCam(camX);
  }
  function setCam(x) { camX = x; world.style.transform = `translate3d(${-Math.round(camX)}px,0,0)`; nav(); }
  function panTo(x, ms, done) { const a = camX, b = Math.max(0, Math.min(maxX, x)), t0 = performance.now(); ms = ms || 260; const st = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); setCam(a + (b - a) * e); if (k < 1) requestAnimationFrame(st); else done && done(); }; requestAnimationFrame(st); }
  let drag = null, vx = 0, inert = 0;
  vp.addEventListener('pointerdown', e => { cancelAnimationFrame(inert); drag = {x: e.clientX, y: e.clientY, cam: camX, t: performance.now(), moved: 0, lx: e.clientX, lt: performance.now()}; vx = 0; try { vp.setPointerCapture(e.pointerId); } catch (x) {} });
  vp.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; drag.moved = Math.max(drag.moved, Math.abs(dx)); const now = performance.now(); vx = (e.clientX - drag.lx) / Math.max(1, now - drag.lt); drag.lx = e.clientX; drag.lt = now; let c = drag.cam - dx; if (c < 0) c *= .35; if (c > maxX) c = maxX + (c - maxX) * .35; setCam(c); });
  vp.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null;
    if (d.moved < 14 && performance.now() - d.t < 700) { tap((e.clientX + camX) / P, e.clientY / P); return; }
    let v = -vx * 16; const st = () => { v *= .94; let c = camX + v; if (c < 0 || c > maxX) { c = Math.max(0, Math.min(maxX, c)); setCam(c); return; } setCam(c); if (Math.abs(v) > .5) inert = requestAnimationFrame(st); };
    if (camX < 0 || camX > maxX) panTo(camX); else st();
  });
  vp.addEventListener('pointercancel', () => { drag = null; panTo(camX); });

  // ---------- 导航 ----------
  const NAVS = [['奖状墙', 116], ['门口', 259], ['矿物柜', 334], ['道具', 470]];
  el('h_nav').innerHTML = NAVS.map(([n, x], i) => `<button data-i="${i}">${n}</button>`).join('') + '<button class="toGo">开始今天的探险</button>';
  el('h_nav').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.classList.contains('toGo')) { go(null); return; } closeSheet(); const i = +b.dataset.i, sl = placeable().map(x => SLOTS[S.home.place[x.id]]).filter(Boolean).sort((p, q) => p.x - q.x)[0]; panTo(i === 3 && sl ? (sl.x - 10) * P : NAVS[i][1] * P - VW() / 2, 300); });
  function nav() { const c = (camX + VW() / 2) / P; let k = 0; NAVS.forEach(([, x], i) => { if (c >= x - 40) k = i; }); [...el('h_nav').children].forEach((b, i) => { if (!b.classList.contains('toGo')) b.classList.toggle('on', i === k); }); }

  // ---------- 点东西 ----------
  let editing = false, sel = null, nearT = 0, enteredAt = 0;
  function tap(ax, ay) {
    if (performance.now() - enteredAt < 350) return;   // 连点门进来的那几下不算
    if (editing) return tapEdit(ax, ay);
    for (const c of H.CERTS) { const p = certPos[c.id]; if (ax >= p.x - 1 && ax <= p.x + CW.w + 1 && ay >= p.y - 2 && ay <= p.y + CW.h + 3) return E0.certs.includes(c) ? showCert(c) : goal(c, p.x); }
    if (ax >= DOOR.x && ax <= DOOR.x + DOOR.w && ay > FLOOR - 30) return leave();
    if (ax >= SIGN.x && ax <= SIGN.x + SIGN.w && ay >= SIGN.y && ay <= SIGN.y + SIGN.h) return showNext();
    if (S.home.loot && S.home.loot.length && ax >= LOOT.x - 2 && ax <= LOOT.x + LOOT.w + 2 && ay > FLOOR - 18 && ay <= FLOOR + 4) return openLoot();
    if (ax >= BOOK.x && ax <= BOOK.x + BOOK.w && ay > FLOOR - 28 && ay <= FLOOR + 4) return showBook();
    if (ax >= CAB.x && ax <= CAB.x + CAB.w && ay > FLOOR - 50 && ay <= FLOOR) return showOres();
    if (ax >= CHEST.x && ax <= CHEST.x + CHEST.w && ay > FLOOR - 16 && ay <= FLOOR) return showChest();
    for (const i of placeable()) { const s = SLOTS[S.home.place[i.id]]; if (s && ax >= s.x && ax <= s.x + (A.ITEM[i.id].w || 16) && ay >= s.y - 1 && ay <= s.y + 17) return showItem(i, s); }
    for (const p of pets) if (ax >= p.x - 1 && ax <= p.x + 18 && ay > FLOOR - 20 && ay <= FLOOR + 4) { p.hop = 3; blip(SND.pet); toast(crOf(p.i).n); return; }
    for (const sh of shadows) { const s = SLOTS[sh.slot]; if (ax >= s.x && ax <= s.x + 16 && ay >= s.y && ay <= s.y + 16) return goal(sh.n.r, s.x); }
    closeSheet(); if (ay > FLOOR - 24) walkTo(Math.max(0, Math.min(RW - 12, ax - 4)));
  }
  function near(x, then) { closeSheet(); const t = ++nearT; panTo(x * P - VW() * .28, 240); walkTo(Math.max(0, x - 10), () => { if (t === nearT) then(); }); }
  const dateCN = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${y} 年 ${+m} 月 ${+dd} 日`; };
  function sheet(html) { rootEl.classList.add('shOpen'); const s = el('h_sheet'); s.innerHTML = html; s.classList.add('on'); s.scrollTop = 0; const x = s.querySelector('.sh-x'); if (x) x.onclick = closeSheet; }
  function closeSheet() { nearT++; rootEl.classList.remove('shOpen'); el('h_sheet').classList.remove('on'); playing = false; }
  const head = (title, ic) => `<div class="sh-h"><canvas id="h_shI" width="24" height="16"></canvas><h2>${title}</h2><button class="sh-x" aria-label="关闭">×</button></div>`;
  function setIcon(id) { const c = el('h_shI'); if (c && A.ITEM[id]) { A.icon(c, id); c.style.height = '43px'; c.style.width = '64px'; } else if (c) c.remove(); }

  function showItem(i, s) {
    near(s.x, () => {
      sheet(head(i.name) + `<div class="sh-b">${i.text}${i.id === 'armor' ? '<br>盔甲件数：' + parts().length + ' / 4' : ''}</div><div class="muted">得到日期：${dateCN(S.home.got[i.id])}</div>${i.id === 'armor' ? armorRows() : ''}${i.id === 'furnace' ? `<div class="sh-b muted">已复习做对 ${E0.t.passed} 道错题</div>` : ''}${i.id === 'jukebox' ? '<div class="sh-f"><button class="btn go" id="h_play">播放</button></div>' : ''}`);
      setIcon(i.id);
      if (i.id === 'jukebox') el('h_play').onclick = () => { playing = !playing; el('h_play').textContent = playing ? '停止' : '播放'; };
    });
  }
  function armorRows() { const P2 = H.ITEMS.filter(x => x.part); return `<div class="rows">${P2.map(x => { const [a, b] = x.need(E0.t); return `<div class="row"><span>${x.name}</span><em>${Math.min(a, b)} / ${b}</em></div>`; }).join('')}</div>`; }
  const goLabel = () => (o.doneToday() ? '回到岛上' : '开始今天的探险');
  function go(r) { const sec = stopClock(); hideAll(); o.practice(r); return sec; }
  function goal(r, x) {
    const [a0, b] = r.need(E0.t), a = Math.min(a0, b), pct = Math.round(a / b * 100), name = r.title || r.name, drill = r.place || r.skill;
    near(x, () => {
      sheet(head(name) + `<div class="sh-b"><b>获得条件</b><br>${r.text}</div><div class="muted">已完成 ${a} / ${b}</div><div class="barw"><i style="width:${pct}%"></i></div><div class="sh-f"><button class="btn go" id="h_goP">${drill ? '去练这一块' : goLabel()}</button></div>`);
      setIcon(r.id); el('h_goP').onclick = () => go(drill ? r : null);
    });
  }
  function showNext() {
    near(SIGN.x, () => {
      const ns = H.next(S, 3);
      sheet(`<div class="sh-h"><h2>下一个目标</h2><button class="sh-x">×</button></div><div class="rows">${ns.map(n => `<div class="row"><span>${n.r.title || n.r.name}<br><small class="muted">${n.r.text}</small></span><em>${n.a} / ${n.b}</em></div>`).join('') || '<div class="muted">全部目标已完成</div>'}</div><div class="sh-f"><button class="btn go" id="h_goP">${goLabel()}</button></div>`);
      el('h_goP').onclick = () => go(null);
    });
  }
  function showOres() {
    near(CAB.x + 4, () => {
      const t = E0.t, row = (n, name, what, c) => `<div class="row"><i class="md" style="background:${c}"></i><span>${name}<br><small class="muted">${what}</small></span><em>${n} / ${t.total}</em></div>`;
      sheet(`<div class="sh-h"><h2>矿物柜</h2><button class="sh-x">×</button></div><div class="ore3">${row(t.diamond, '钻石', '隔 3 天仍然做对', '#5fd9e6')}${row(t.gold, '金锭', '另一天再次做对', '#f2c14e')}${row(t.iron, '铁锭', '格子第一次点亮', '#c9ccd2')}</div><div class="muted">格子每升一档，多一件。只增不减。</div>`);
    });
  }
  function showChest() {
    near(CHEST.x, () => sheet(`<div class="sh-h"><h2>木箱</h2><button class="sh-x">×</button></div><div class="sh-b">矿石 <b style="font-size:30px;color:var(--warn)">${S.home.ore}</b> 块</div><div class="muted">练习时每答对一题，得到 1 块矿石。</div>`));
  }
  // ---------- 伙伴图鉴 ----------
  function showBook() {
    closeSheet(); const v = el('h_book'), L = learned(), SK = K.SKILLS;
    v.innerHTML = `<div class="bkh"><button class="btn" id="h_bkClose">合上图鉴</button><h2>伙伴图鉴</h2><span class="tally"><span>已解锁 <b>${L.length}/${SK.length}</b></span></span></div><div class="bkg">${SK.map(s => `<button class="bkc${L.includes(s.id) ? '' : ' lock'}${isGold(s.id) ? ' gold' : ''}${S.home.pets.includes(s.id) ? ' home' : ''}" data-i="${s.id}"><canvas data-c="${s.id}" width="20" height="24"></canvas><small>${L.includes(s.id) ? crOf(s.id).n : '？'}</small></button>`).join('')}</div><div class="bkd" id="h_bkD">学会一个技能，解锁一只伙伴</div>`;
    v.hidden = false; v.querySelectorAll('canvas[data-c]').forEach(c => { const i = c.dataset.c; A.creature(c.getContext('2d'), crOf(i), 0, 24, 0, L.includes(i) ? {} : {shadow: '#0c0d10'}); });
    el('h_bkClose').onclick = closeBook;
    v.querySelector('.bkg').onclick = e => {
      const b = e.target.closest('.bkc'); if (!b) return; const i = b.dataset.i, s = K.BY[i], has = L.includes(i); blip(SND.tap);
      if (!has) { el('h_bkD').innerHTML = `<span><b>未解锁</b> · 学会「${s.name}」后解锁</span><button class="btn go" id="h_bkGo">去练这一块</button>`; el('h_bkGo').onclick = () => go({skill: s}); return; }
      const at = S.home.pets.includes(i);
      el('h_bkD').innerHTML = `<span><b>${crOf(i).n}${isGold(i) ? ' · 附魔' : ''}</b> · 学会了「${s.name}」${isGold(i) ? '，全部隔 3 天还做对' : ''}</span><button class="btn go" id="h_bkPet">${at ? '留在图鉴' : '带回家'}</button>`;
      el('h_bkPet').onclick = () => { const p = S.home.pets; if (at) p.splice(p.indexOf(i), 1); else { if (p.length >= 4) p.shift(); p.push(i); blip(SND.get); } o.save(); v.querySelectorAll('.bkc').forEach(x => x.classList.toggle('home', p.includes(x.dataset.i))); b.click(); };
    };
  }
  function closeBook() { el('h_book').hidden = true; blip(SND.tap); syncPets(); drawHero(); }
  // 奖状大图：称号 + 会动的画面；记牢 = 附魔版；点画面全体跳一下
  let certT = 0;
  function showCert(c) {
    closeSheet(); blip(SND.get);
    const v = el('h_certV'), cols = {learn: ['#8a5a2c', '#f2c14e'], keep: ['#6d3bc9', '#e9c6ff'], day: ['#2f6fb0', '#bfe3ff'], fix: ['#2e7d4a', '#bfe8c8']}[c.kind], keep = c.kind === 'keep';
    v.innerHTML = `<div class="cert${keep ? ' ench' : ''}" style="--fr:${cols[0]};--fr2:${cols[1]}"><canvas id="h_certC" width="96" height="54"></canvas><div class="certR"><div class="clab">奖状${keep ? ' · 附魔' : ''}</div><h1>${c.title}</h1><div class="cwho">空空</div><div class="csay">${c.say(E0.t)}</div><div class="cdate">${dateCN(S.home.got[c.id])}</div></div></div><div class="certbtns"><button class="btn" id="h_cClose">收好</button><button class="btn" id="h_cPrint">打印奖状</button></div>`;
    v.hidden = false; const g = el('h_certC').getContext('2d'); let f = 0, jump = 0;
    clearInterval(certT); const draw = () => { g.clearRect(0, 0, 96, 54); A.scene(g, c.scene, keep, f, jump > 0); f++; if (jump > 0) jump--; }; draw(); certT = setInterval(draw, 200);
    el('h_certC').onclick = () => { jump = 4; blip(SND.pet); };
    el('h_cClose').onclick = () => { clearInterval(certT); v.hidden = true; nextCert(); }; el('h_cPrint').onclick = () => print();
  }
  let certQ = [];
  function nextCert() { const c = certQ.shift(); if (c) panTo(certPos[c.id].x * P - VW() / 2, 300, () => showCert(c)); }
  // ---------- 战利品箱 ----------
  const kindOf = x => (x.kind === 'bronze' ? '新伙伴' : x.kind === 'gold' ? '伙伴附魔' : x.scene ? '奖状' : '道具');
  function openLoot() {
    closeSheet(); const rank = x => (x.scene ? 0 : x.hidden ? 1 : x.skill ? 3 : 2), news = (S.home.loot || []).map(k => H.BY[k]).filter(Boolean).sort((a, b) => rank(a) - rank(b)), v = el('h_loot');
    v.innerHTML = `<canvas id="h_lootC" width="40" height="32"></canvas><div class="lootT">点箱子打开</div><div class="lootL" id="h_lootL"></div><button class="btn go" id="h_lootOk" hidden>收好</button>`; v.hidden = false;
    const g = el('h_lootC').getContext('2d'), paint = open => { g.clearRect(0, 0, 40, 32); const y = open ? 14 : 8; A.r(g, '#000', 3, y + 7, 34, 18); A.r(g, '#5b3fa8', 4, y + 8, 32, 16); A.r(g, '#f2c14e', 18, y + 8, 4, 6); if (open) { A.r(g, '#000', 3, 2, 34, 12); A.r(g, '#3a2a58', 4, 3, 32, 10); A.r(g, '#fff3b0', 6, 13, 28, 3); } else { A.r(g, '#000', 3, y - 1, 34, 9); A.r(g, '#6d4fc4', 4, y, 32, 7); A.r(g, '#f2c14e', 18, y + 3, 4, 5); } }; paint(false);
    el('h_lootC').onclick = () => {
      if (el('h_lootC').dataset.o) return; el('h_lootC').dataset.o = 1; paint(true); blip(SND.open); v.querySelector('.lootT').textContent = '战利品';
      const list = news.slice(0, 5); el('h_lootL').innerHTML = list.map((x, i) => `<div class="lootI stamp" style="animation-delay:${.15 + i * .18}s"><canvas data-x="${x.id}"></canvas><b>${x.title || (x.skill ? crOf(x.skill.id).n : x.name)}</b><small>${kindOf(x)}</small></div>`).join('') + (news.length > 5 ? `<div class="lootI"><b>+${news.length - 5}</b><small>已放入家中</small></div>` : '');
      list.forEach((x, i) => setTimeout(() => blip(SND.get), 150 + i * 180));
      el('h_lootL').querySelectorAll('canvas').forEach(c => { const x = news.find(n => n.id === c.dataset.x); if (x.skill) { c.width = 20; c.height = 24; A.creature(c.getContext('2d'), crOf(x.skill.id), 0, 24, 0); } else if (x.scene) { c.width = 19; c.height = 14; A.thumb(c.getContext('2d'), x, 0, 0, 19, 14, 3); } else A.icon(c, x.id); });
      el('h_lootOk').hidden = false;
    };
    el('h_lootOk').onclick = () => { v.hidden = true; certQ = news.filter(x => x.scene).slice(0, 3); S.home.loot = [];   // 补发时可能十几张：只连弹 3 张，其余已上墙
      o.save(); syncPets(); drawRoom(); drawHero(); nextCert(); };
  }
  // 摆放
  function tapEdit(ax, ay) {
    const slot = FS.concat(WS).find(s => ax >= s.x && ax <= s.x + 18 && ay >= s.y - 1 && ay <= s.y + 17);
    if (!slot) return;
    const pl = S.home.place, who = placeable().find(i => pl[i.id] === slot.id);
    if (!sel) { if (who) { sel = who.id; toast('已选择 ' + who.name + '，点一个位置'); drawRoom(); } return; }
    const iT = A.ITEM[sel].t;
    if (slot.t !== iT) { toast(iT === 'F' ? '这件摆在地上' : '这件挂在墙上'); return; }
    const old = pl[sel]; if (who && who.id !== sel) pl[who.id] = old; pl[sel] = slot.id; sel = null; o.save(); drawRoom();
  }
  el('h_btnEdit').addEventListener('click', () => { editing = !editing; sel = null; closeSheet(); el('h_btnEdit').textContent = editing ? '完成' : '摆放'; toast(editing ? '点一件东西，再点新位置' : '已保存摆放'); drawRoom(); });
  let toastT = 0; function toast(t) { const el = el('h_toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 1800); }


  // ---------- 进出 ----------
  function navGo() { const b = el('h_nav').querySelector('.toGo'); if (b) b.hidden = o.doneToday(); }
  function hideAll() { certQ = []; closeSheet(); clearInterval(certT); el('h_certV').hidden = true; el('h_book').hidden = true; el('h_loot').hidden = true; editing = false; sel = null; el('h_btnEdit').textContent = '摆放'; }
  let clock = 0;
  function stopClock() { if (!clock) return 0; const sec = Math.min(600, Math.round((Date.now() - clock) / 1000)); clock = 0; S.home.sec += sec; const st = E.stat(S, o.today()); st.home = (st.home || 0) + sec; o.save(); return sec; }
  function enter() {
    S = o.S(); H.sync(S, o.today()); E0 = H.earned(S); autoPlace(); pets = []; syncPets(); hideAll();
    hero.x = DOOR.x + 2; hero.flip = false; dog.x = DOOR.x + 12; clock = Date.now(); enteredAt = performance.now(); o.save();
    navGo(); o.show(); layout(); drawHero('a'); drawRoom(); setCam(Math.max(0, Math.min(maxX, (DOOR.x + 10) * P - VW() / 2)));
  }
  function leave() { closeSheet(); walkTo(DOOR.x + 2, () => { stopClock(); hideAll(); o.leave(); }); }
  el('h_btnOut').addEventListener('click', leave);
  addEventListener('resize', () => { if (!rootEl.hidden) layout(); });
  setInterval(() => { if (!rootEl.hidden) drawFx(); }, 200);
  setInterval(() => { if (!rootEl.hidden && !walking) { drawHero('b'); setTimeout(() => { if (!walking) drawHero('a'); }, 160); } }, 2600);
  // 系统返回手势：先关最上面一层；没有可关的返回 false（页面负责回岛）
  function back() {
    if (!el('h_loot').hidden) { el('h_loot').hidden = true; return true; }
    if (!el('h_certV').hidden) { clearInterval(certT); el('h_certV').hidden = true; return true; }
    if (!el('h_book').hidden) { closeBook(); return true; }
    if (el('h_sheet').classList.contains('on')) { closeSheet(); return true; }
    if (editing) { el('h_btnEdit').click(); return true; }
    return false;
  }
  return {enter, back, leave: () => { stopClock(); hideAll(); }, tap: (x, y) => tap(x, y), get P() { return P; }, get cam() { return camX; }, certPos, SLOTS, get E0() { return E0; }, CAB, BOOK, LOOT, SIGN, CHEST, DOOR, get pets() { return pets; }};
  }
  root.HOUSE = {create};
})(this);
