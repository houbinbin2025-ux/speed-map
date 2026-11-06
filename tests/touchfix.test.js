// 手指搭在屏幕上时补点击（v2/touchfix.js）：时间和定时器都由测试控制
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '../v2/touchfix.js'), 'utf8');
function env() {
  let t = 1000; const on = {}, timers = [], clicks = [];
  const window = {addEventListener: (k, f) => { on[k] = f; }};
  const mk = (name, skip) => { const el = {name, isConnected: true, closest: () => (skip ? el : null), contains: x => x === el, click: () => clicks.push(name)}; return el; };
  const ctx = {window, performance: {now: () => t}, setTimeout: (f, ms) => timers.push({f, at: t + ms}), Map, Math, document: {top: null, elementFromPoint() { return this.top; }}};
  vm.runInNewContext(src, ctx);
  const ev = (k, id, el, primary, x = 10, type = 'touch') => on[k]({pointerId: id, target: el, isPrimary: primary, clientX: x, clientY: 10, pointerType: type});
  const advance = ms => { t += ms; timers.splice(0).forEach(x => (x.at <= t ? x.f() : timers.push(x))); };
  const nativeClick = el => { const e = {isTrusted: true, target: el, stopped: false, stopImmediatePropagation() { this.stopped = true; }, preventDefault() {}}; on.click(e); return e.stopped; };
  return {ev, advance, clicks, mk, nativeClick, doc: ctx.document, tf: window.TOUCHFIX};
}
test('一根手指：不补点击', () => {
  const E = env(), b = E.mk('b'); E.doc.top = b;
  E.ev('pointerdown', 1, b, true); E.advance(50); E.ev('pointerup', 1, b, true); E.advance(100);
  assert.deepStrictEqual(E.clicks, []);
});
test('另一根手指搭在地图上：点按钮补一次，地图不补', () => {
  const E = env(), map = E.mk('map', true), b = E.mk('b'); E.doc.top = b;
  E.ev('pointerdown', 1, map, true); E.ev('pointerdown', 2, b, false); E.advance(50); E.ev('pointerup', 2, b, false); E.ev('pointerup', 1, map, true); E.advance(100);
  assert.deepStrictEqual(E.clicks, ['b']);
});
test('搭着的手指先抬起，按钮后抬起：同样补一次', () => {
  const E = env(), map = E.mk('map', true), b = E.mk('b'); E.doc.top = b;
  E.ev('pointerdown', 1, map, true); E.ev('pointerdown', 2, b, false); E.advance(50); E.ev('pointerup', 1, map, true); E.ev('pointerup', 2, b, false); E.advance(100);
  assert.deepStrictEqual(E.clicks, ['b']);
});
test('两根手指都按在按钮上：只补一次', () => {
  const E = env(), x = E.mk('x'), y = E.mk('y'); E.doc.top = y;
  E.ev('pointerdown', 1, x, true); E.advance(10); E.ev('pointerdown', 2, y, false); E.advance(50); E.ev('pointerup', 2, y, false); E.advance(60); E.doc.top = x; E.ev('pointerup', 1, x, true); E.advance(100);
  assert.deepStrictEqual(E.clicks, ['y']);
});
test('手指一直搭着，先后点两次按钮：两次都算', () => {
  const E = env(), map = E.mk('map', true), b = E.mk('b'); E.doc.top = b;
  E.ev('pointerdown', 1, map, true);
  for (const id of [2, 3]) { E.advance(10); E.ev('pointerdown', id, b, false); E.advance(50); E.ev('pointerup', id, b, false); E.advance(100); }
  assert.deepStrictEqual(E.clicks, ['b', 'b']);
});
test('系统已发 click：不再补；补过之后系统才发：拦掉；之后再点不受影响', () => {
  let E = env(), map = E.mk('map', true), b = E.mk('b'); E.doc.top = b;
  E.ev('pointerdown', 1, map, true); E.ev('pointerdown', 2, b, false); E.advance(50); E.ev('pointerup', 2, b, false); E.advance(5);
  assert.strictEqual(E.nativeClick(b), false); E.advance(100); assert.deepStrictEqual(E.clicks, []);
  E = env(); map = E.mk('map', true); b = E.mk('b'); E.doc.top = b;
  E.ev('pointerdown', 1, map, true); E.ev('pointerdown', 2, b, false); E.advance(50); E.ev('pointerup', 2, b, false); E.advance(60);
  assert.deepStrictEqual(E.clicks, ['b']); E.advance(10); assert.strictEqual(E.nativeClick(b), true, '紧跟着的系统点击要拦掉');
  E.advance(300); assert.strictEqual(E.nativeClick(b), false, '之后真的再点一次不能吞');
});
test('不补的情况：拖动过、按太久、按钮被盖住、按钮已移除、鼠标', () => {
  const run = (fn, moved = 10, hold = 50) => { const E = env(), map = E.mk('map', true), b = E.mk('b'); E.doc.top = b; E.ev('pointerdown', 1, map, true); E.ev('pointerdown', 2, b, false); E.advance(hold); E.ev('pointerup', 2, b, false, moved); if (fn) fn(E, b); E.advance(100); return E.clicks.length; };
  assert.strictEqual(run(), 1, '对照：正常情况会补');
  assert.strictEqual(run(null, 40), 0, '拖动过');
  assert.strictEqual(run(null, 10, 800), 0, '按太久');
  assert.strictEqual(run(E => { E.doc.top = E.mk('mask'); }), 0, '被盖住');
  assert.strictEqual(run((E, b) => { b.isConnected = false; }), 0, '已移除');
  const E = env(), map = E.mk('map', true), b = E.mk('b'); E.doc.top = b;
  E.ev('pointerdown', 1, map, true); E.ev('pointerdown', 2, b, false, 10, 'mouse'); E.advance(50); E.ev('pointerup', 2, b, false, 10, 'mouse'); E.advance(100);
  assert.deepStrictEqual(E.clicks, []);
});
test('地图判断：多指期间不算点，之后的单指算', () => {
  const E = env(), map = E.mk('map', true), b = E.mk('b');
  E.ev('pointerdown', 1, map, true); E.ev('pointerdown', 2, b, false); assert.strictEqual(E.tf.multiSince(1000), true);
  E.ev('pointerup', 2, b, false); E.ev('pointerup', 1, map, true); E.advance(100); assert.strictEqual(E.tf.multiSince(1100), false);
});
