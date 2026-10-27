// 本地预览垫片：只用于自审截图，把 x-dc 模板展开成普通 HTML（不发布到画布）
// 画布上传的图片在本机换成品牌文件
window.__BLOB = {'/_blob/a1d9ed587aabb05fe35c37e75b35eed5': '../../品牌/A-像素方块岛/mark.svg', '/_blob/cc91cf6c51a92872f1ab6f1be1276f17': '../../品牌/A-像素方块岛/wordmark-cn-dark.svg'};
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
      if (ch.tagName === 'SC-IF') {
        const m = ch.getAttribute('value').match(/\{\{\s*([^}]+?)\s*\}\}/);
        if (get(scope, m[1])) { expand(ch, scope); ch.replaceWith(...ch.childNodes); } else ch.remove();
        return;
      }
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
  document.querySelectorAll('img').forEach(i => { const s = i.getAttribute('src'); if (window.__BLOB[s]) i.src = window.__BLOB[s]; });
  document.body.style.margin = '0';
});
