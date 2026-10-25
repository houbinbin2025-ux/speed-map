// 本地预览垫片：只用于自审截图，把 x-dc 模板展开成普通 HTML
window.DCLogic = class { constructor(p){ this.props = p || {}; this.state = {}; } setState(){} };
document.addEventListener('DOMContentLoaded', () => {
  const sc = document.querySelector('script[data-dc-script]');
  const Cls = new Function(sc.textContent + '; return Component;')();
  const vals = new Cls({}).renderVals();
  const root = document.querySelector('x-dc');
  const helmet = root.querySelector('helmet');
  if (helmet) { document.head.insertAdjacentHTML('beforeend', helmet.innerHTML); helmet.remove(); }
  const get = (scope, path) => path.trim().split('.').reduce((o, k) => (o == null ? o : o[k]), scope);
  const fill = (s, scope) => s.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => { const v = get(scope, p); return v == null ? '' : v; });
  function expand(node, scope) {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) { ch.textContent = fill(ch.textContent, scope); return; }
      if (ch.nodeType !== 1) return;
      if (ch.tagName === 'SC-FOR') {
        const m = ch.getAttribute('list').match(/\{\{\s*([^}]+?)\s*\}\}/);
        const list = get(scope, m[1]) || [], as = ch.getAttribute('as');
        const frag = document.createDocumentFragment();
        list.forEach((item, i) => { const t = document.createElement('div'); t.innerHTML = ch.innerHTML; expand(t, Object.assign({}, scope, {[as]: item, $index: i})); [...t.childNodes].forEach(n => frag.appendChild(n)); });
        ch.replaceWith(frag); return;
      }
      [...ch.attributes].forEach(a => a.value = fill(a.value, scope));
      expand(ch, scope);
    });
  }
  expand(root, vals);
  document.body.style.margin = '0';
});
