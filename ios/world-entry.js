// 只打包进 App：岛上左上角标题下方的世界入口。网页和手机不受影响（见 sync-web.sh）
(function () {
  function add() {
    var host = document.getElementById('island');
    if (!host) return;
    var b = document.createElement('button');
    b.id = 'worldEntry';
    b.setAttribute('aria-label', 'World');
    b.style.cssText = 'position:absolute;left:14px;top:66px;z-index:40;width:68px;height:68px;padding:0;border:3px solid #4d3a2a;background:#f3ecd8;box-shadow:0 4px 0 #4d3a2a;cursor:pointer';
    b.innerHTML = '<svg viewBox="0 0 32 32" width="52" height="52" shape-rendering="crispEdges"><path fill="#79c48f" d="M16 3 29 10 16 17 3 10z"/><path fill="#b9774d" d="M3 10 16 17V30L3 23z"/><path fill="#8f5834" d="M29 10 16 17V30L29 23z"/><path fill="#5fae7a" d="M3 10 16 17 29 10V13L16 20 3 13z"/></svg>';
    b.addEventListener('click', function (e) { e.stopPropagation(); location.href = 'world/index.html'; });
    host.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
