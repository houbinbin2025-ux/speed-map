// 手指搭在屏幕上时也要点得动（Ben 11-07，iPhone 实测）
// iOS：一根手指按在屏幕上时，另一根手指点按钮只有按下和抬起，系统不发 click。这里补上那次点击。
// 只在多指时补；一根手指的点击完全走系统，不碰。
(function (root) {
  'use strict';
  const MOVE = 14, SLOW = 700, WAIT = 50, DUP = 120;
  const SKIP = '.w-vp,#h_vp,canvas,.linebox,.padwrap,.gear,.hold-btn,input,textarea,select';   // 这些自己处理手势
  const down = new Map();
  let lastMulti = -1, spent = -1, native = {t: -1}, made = {t: -1, el: null};
  const now = () => performance.now();

  root.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    if (e.isPrimary) down.clear();   // 第一根手指：之前没收到抬起的都作废，防止一直算多指
    if (down.size) lastMulti = now();
    down.set(e.pointerId, {el: e.target, x: e.clientX, y: e.clientY, t: now()});
  }, true);

  root.addEventListener('pointerup', e => {
    const d = down.get(e.pointerId);
    if (!d) return;
    if (down.size > 1) lastMulti = now();
    down.delete(e.pointerId);
    if (lastMulti < d.t) return;   // 这根手指按着期间一直只有它自己
    const up = now(), el = d.el;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= MOVE || up - d.t >= SLOW) return;
    if (!el || !el.closest || el.closest(SKIP)) return;
    if (d.t <= spent) return;   // 两根手指都按在按钮上：一次多指只补一次，后抬起的那根不算
    spent = up;
    const x = e.clientX, y = e.clientY;
    setTimeout(() => {
      if (native.t >= up || !el.isConnected) return;   // 系统已经发了，或者按钮已经不在了
      const top = document.elementFromPoint(x, y);
      if (!top || !(el.contains(top) || top.contains(el))) return;   // 已经被盖住或换了界面
      made = {t: now(), el};
      el.click();
    }, WAIT);
  }, true);

  root.addEventListener('pointercancel', e => {
    if (down.size > 1) lastMulti = now();
    down.delete(e.pointerId);
  }, true);

  root.addEventListener('click', e => {
    if (!e.isTrusted) return;
    if (now() - made.t < DUP && made.el && made.el.contains(e.target)) { e.stopImmediatePropagation(); e.preventDefault(); return; }   // 补过了，系统又发了一次
    native = {t: now()};
  }, true);

  // 地图和家：从 t0 按下到现在，屏幕上是否同时有过别的手指。有就不算点地图
  root.TOUCHFIX = {multiSince: t0 => lastMulti >= t0};
})(window);
