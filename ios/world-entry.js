// 只打包进 App：岛上左上角标题下方的世界入口，和家长区的「方块世界」时间设置。网页和手机不受影响（见 sync-web.sh）
(function () {
  // ---- 方块世界每日时长：数据在 localStorage mc_unlock（和方块世界 unlock.js 同一份），规则见 minecraft-web/unlock.js playStatus ----
  var KEY = 'mc_unlock', MATH_SEC = 600, MATH_N = 100, TRIAL_SEC = 20;
  function day() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    // 还没进过方块世界：写一份和游戏 blank() 一样的空存档，游戏第一次进来照常初始化
    if (!s || typeof s !== 'object' || !s.total) s = { v: 1, origin: null, chunks: {}, pts: 0, keys: 0, total: { pts: 0, keys: 0 }, unlocked: {}, proof: {}, noLimit: false, last: '' };
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function daily(s) { return Math.max(5, Math.min(60, +(s.limits && s.limits.daily) || 10)); }
  function mathToday(d) {
    try { var o = JSON.parse(localStorage.getItem('speedmap.v2') || 'null'), st = o && o.stats && o.stats[d]; return { sec: +(st && st.sec) || 0, n: +(st && st.h && st.h.a) || 0 }; } catch (e) { return { sec: 0, n: 0 }; }
  }
  function bonusMin(d, s) {
    var q = null; try { q = JSON.parse(localStorage.getItem('mc_quest') || 'null'); } catch (e) {}
    return ((q && q.playtimeBonus && q.playtimeBonus[d]) || 0) + (s.extra && s.extra.day === d ? s.extra.min : 0);
  }
  // 和 unlock.js playStatus 同一口径：达标（或家长放行）后 = 每天分钟数 + 今天加时；没达标一律试用 20 秒
  function status() {
    var s = load(), d = day(), m = mathToday(d), pass = !!(s.pass && s.pass.day === d);
    var met = (m.sec >= MATH_SEC && m.n >= MATH_N) || pass;
    var used = s.play && s.play.day === d ? +s.play.sec || 0 : 0, extra = s.extra && s.extra.day === d ? s.extra.min : 0;
    var allow = daily(s) + bonusMin(d, s), limit = met ? allow * 60 : TRIAL_SEC;
    return { s: s, m: m, pass: pass, met: met, used: used, extra: extra, allow: allow, left: Math.max(0, limit - used) };
  }
  function renderWorld(box) {
    var t = status(), s = t.s, m = t.m, met = t.met, used = t.used, extra = t.extra, left = t.left;
    var now = met ? '今天可玩 ' + t.allow + ' 分钟 · 已玩 ' + Math.floor(used / 60) + ' 分钟 · 还剩 ' + Math.ceil(left / 60) + ' 分钟'
                  : '未达标：仅可试用 20 秒，还剩 ' + Math.ceil(left) + ' 秒';
    box.innerHTML =
      '<div class="ptitle">方块世界</div>' +
      '<div class="kv" id="wTimeNow">' + now + '</div>' +
      '<div class="kv">数学岛今日：练习 ' + Math.floor(m.sec / 60) + ' / 10 分钟 · 作答 ' + m.n + ' / 100 题</div>' +
      '<div class="kv">每天可玩</div>' +
      '<div class="seg" id="wDaily"><button data-w="-5">−5</button><span id="wDailyN" style="align-self:center;padding:0 10px;font-weight:700">' + daily(s) + ' 分钟</span><button data-w="+5">+5</button></div>' +
      '<div class="kv">今天加时（达标后才算）</div>' +
      '<div class="seg" id="wExtra">' + [0, 10, 20, 30].map(function (n) { return '<button data-x="' + n + '" class="' + (extra === n ? 'on' : '') + '">' + (n ? '+' + n + ' 分钟' : '不加') + '</button>'; }).join('') + '</div>' +
      '<label style="display:flex;align-items:center;gap:10px;font-size:14px;line-height:1.5"><span style="flex:1">今天不需达标</span><input type="checkbox" id="wPass"' + (t.pass ? ' checked' : '') + '></label>' +
      '<div class="muted" style="font-size:12px;line-height:1.5">达标条件：数学岛练习满 10 分钟且作答 100 题</div>';
  }
  function addWorldPanel() {
    var par = document.getElementById('parent'), grid = par && par.querySelector('.pgrid');
    if (!grid || document.getElementById('worldPanel')) return;
    var box = document.createElement('div');
    box.className = 'panel'; box.id = 'worldPanel';
    grid.insertBefore(box, grid.firstChild);
    renderWorld(box);
    box.addEventListener('click', function (e) {
      var t = e.target, s = load(), d = day();
      if (t.dataset && t.dataset.w) s.limits = { daily: Math.max(5, Math.min(60, daily(s) + +t.dataset.w)) };
      else if (t.dataset && t.dataset.x !== undefined) s.extra = +t.dataset.x ? { day: d, min: +t.dataset.x } : null;   // 选一档，不叠加，可改回「不加」
      else return;
      save(s); renderWorld(box);
    });
    box.addEventListener('change', function (e) {
      if (e.target.id !== 'wPass') return;
      var s = load(); s.pass = e.target.checked ? { day: day() } : null; save(s); renderWorld(box);
    });
    // 每次进家长区都重读一遍（玩过之后时间会变）
    new MutationObserver(function () { if (!par.hidden) renderWorld(box); }).observe(par, { attributes: true, attributeFilter: ['hidden'] });
  }

  function add() {
    addWorldPanel();
    var host = document.getElementById('island');
    if (!host) return;
    var b = document.createElement('button');
    b.id = 'worldEntry';
    b.setAttribute('aria-label', 'World');
    b.style.cssText = 'position:absolute;left:14px;top:66px;z-index:40;width:68px;height:68px;padding:0;border:3px solid #4d3a2a;background:#f3ecd8;box-shadow:0 4px 0 #4d3a2a;cursor:pointer';
    b.innerHTML = '<svg viewBox="0 0 32 32" width="52" height="52" shape-rendering="crispEdges"><path fill="#79c48f" d="M16 3 29 10 16 17 3 10z"/><path fill="#b9774d" d="M3 10 16 17V30L3 23z"/><path fill="#8f5834" d="M29 10 16 17V30L29 23z"/><path fill="#5fae7a" d="M3 10 16 17 29 10V13L16 20 3 13z"/></svg>';
    b.addEventListener('click', function (e) { e.stopPropagation(); location.href = 'world/index.html'; });
    host.appendChild(b);
    // 入口旁的状态条：告诉孩子还差多少才能玩、还能玩多久（单日英文跟岛上的 lang 走，自己翻，不进 i18n）
    var chip = document.createElement('div');
    chip.id = 'worldChip'; chip.setAttribute('data-i18n-skip', '');
    chip.style.cssText = 'position:absolute;left:90px;top:84px;z-index:40;padding:6px 10px;border:2px solid #4d3a2a;background:#f3ecd8;color:#4d3a2a;font-size:15px;font-weight:700;line-height:1.3;pointer-events:none;white-space:nowrap';
    host.appendChild(chip);
    function paint() {
      var t = status(), en = document.documentElement.lang === 'en', parts = [];
      if (!t.met) {
        var mm = Math.ceil(Math.max(0, MATH_SEC - t.m.sec) / 60), nn = Math.max(0, MATH_N - t.m.n);
        if (mm) parts.push(en ? mm + ' more min' : '再练 ' + mm + ' 分钟');
        if (nn) parts.push(en ? nn + ' more answers' : '再答 ' + nn + ' 题');
        chip.textContent = parts.join(' · ');
      } else if (t.left > 0) chip.textContent = en ? Math.ceil(t.left / 60) + ' min to play' : '可玩 ' + Math.ceil(t.left / 60) + ' 分钟';
      else chip.textContent = en ? 'Done for today' : '今天已玩完';
    }
    paint();
    setInterval(function () { if (!host.hidden) paint(); }, 3000);
    new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    new MutationObserver(function () { if (!host.hidden) paint(); }).observe(host, { attributes: true, attributeFilter: ['hidden'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
