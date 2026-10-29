// 空空数学岛 · 题面和图解（纯函数，只出 HTML 字符串，无 DOM、无状态）：各种题长什么样、答错时的图解、「学一学」示范卡、技能组统计
// 浏览器里挂到 window.RENDER（依赖 window.SM、window.SKILLS、window.ENGINE），node 里 require 后直接测
// 颜色规则：四档熟练度色只表示熟练度；题目和图解里的点、旗子用 --counter（蓝）和浅灰
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./skills.js'), require('./engine.js'));
  else root.RENDER = factory(root.SM, root.SKILLS, root.ENGINE);
})(typeof self !== 'undefined' ? self : this, function (C, K, E) {
  'use strict';

  // ---------- 技能组（首页 6 块地） ----------
  const GROUPS = [
    {id: 'look', name: '看数', rule: '看一眼，写出有几个'},
    {id: 'bond', name: '分合', rule: '先做对，再做快'},
    {id: 'place', name: '数位', rule: '一根是 10，一块是 1'},
    {id: 'cmp', name: '比大小', rule: '看清楚，再点大的'},
    {id: 'line', name: '数线', rule: '把旗子插到这个数的位置'},
    {id: 'speed', name: '秒答地图', rule: '又对又快'},
  ];
  const GNAME = Object.fromEntries(GROUPS.map(g => [g.id, g.name]));
  const itemsOf = g => K.SKILLS.filter(s => s.group === g).flatMap(s => s.items);
  // 每块地的格子统计：counts[档位]、亮了几格、共几格
  function groupStat(S, g) {
    const counts = [0, 0, 0, 0];
    itemsOf(g).forEach(it => counts[Math.min(3, Math.max(0, E.lv(S, it.id) || 0))]++);
    return {counts, lit: counts[1] + counts[2] + counts[3], total: counts.reduce((a, b) => a + b, 0)};
  }
  const skillOf = id => K.BY[K.ITEM[id].skill];
  const tagOf = id => { const s = skillOf(id); return s.speed ? s.name : GNAME[s.group] + ' · ' + s.name; };

  // ---------- 小零件 ----------
  const dot = cls => `<i class="dot${cls ? ' ' + cls : ''}"></i>`;
  const N = n => `<span class="num">${n}</span>`;
  const box = '<span class="box"></span>';
  const ans = n => `<span class="num ansv">${n}</span>`;
  // 十格框：两行各 5 格，先填满上一行；cells = 每格的样子（'' 空 / 'on' 点 / 'moved' 挪来的 / 'gone' 挪走的虚线）
  const frame = cells => `<div class="tf">${cells.map(c => `<i class="cell">${c ? dot(c) : ''}</i>`).join('')}</div>`;
  const fill = (n, k, kind) => Array.from({length: 10}, (_, i) => (i < n ? 'on' : i < n + (k || 0) ? kind : ''));
  // 骰子点位（3×3 格里的位置）
  const DICE = {1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]};
  // 乱点：位置由数字决定（每次一样，方便答错时原样再显示），点和点不挨着
  function scatPos(n) {
    let s = n * 7919 + 13; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, out = [];
    for (let tries = 0; out.length < n && tries < 400; tries++) {
      const p = {x: 10 + r() * 80, y: 10 + r() * 80};
      if (out.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 26)) out.push(p);
    }
    return out;
  }
  function pattern(q) {
    if (q.layout === 'dice') return `<div class="dice">${Array.from({length: 9}, (_, i) => `<i>${DICE[q.n].includes(i) ? dot() : ''}</i>`).join('')}</div>`;
    if (q.layout === 'scat') return `<div class="scat">${scatPos(q.n).map(p => `<b style="left:${p.x.toFixed(1)}%;top:${p.y.toFixed(1)}%">${dot()}</b>`).join('')}</div>`;
    if (q.layout === 'tf') return frame(fill(q.n));
    return `<div class="tfs">${frame(fill(10))}${frame(fill(q.n - 10))}</div>`;
  }
  // 分合图：上面一个圆是整体，下面两个圆是部分
  const circ = (v, big) => `<span class="circ${big ? ' big' : ''}${v === null ? ' blank' : ''}">${v === null ? '' : v}</span>`;
  const bondFig = (whole, a, b) => `<div class="bondfig">${circ(whole, true)}<svg class="legs" viewBox="0 0 120 26" aria-hidden="true"><path d="M60 0 L22 26 M60 0 L98 26"></path></svg><div class="parts">${circ(a)}${circ(b)}</div></div>`;
  // 十条（整根，不画格线，长度 = 10 块 + 9 个间隙）+ 散方块（5 个一行）
  const rods = (tens, ones) => `<div class="rods"><div class="rodset">${'<i class="rod"></i>'.repeat(tens)}</div><div class="ones">${'<i class="one"></i>'.repeat(ones)}</div></div>`;
  const opSign = op => (op === '+' ? '+' : '−');
  const nearWord = d => (d === 1 ? '多 1' : d === -1 ? '少 1' : d === 10 ? '多 10' : '少 10');

  // ---------- 题面 ----------
  // 返回 {input:'write'|'pick'|'line', tag, html（左栏题目）, note（左栏底部小字）, flash（看数：要闪现的部分）, pick:[a,b], line:{max, target, mid}}
  function question(inst) {
    const it = K.ITEM[inst.id], s = skillOf(inst.id), q = inst.q, tag = tagOf(inst.id);
    if (s.speed) return {input: 'write', tag, html: `<div class="eq num">${q.a} ${opSign(q.op)} ${q.b} =</div>`, note: '在右边写出答案，写完停一下就好'};
    if (s.group === 'look') return {input: 'write', tag, html: `<div class="look">${pattern(q)}</div>`, flash: true, note: '有几个？写在右边'};
    if (s.group === 'bond') {
      if (q.blank === 'part') return {input: 'write', tag, html: bondFig(q.n, q.a, null), note: '空着的圆是几？写在右边'};
      if (q.blank === 'whole') return {input: 'write', tag, html: bondFig(null, q.a, q.b), note: '合起来是几？写在右边'};
      if (q.form) return {input: 'write', tag, html: `<div class="eq num">${missingEq(q, box)}</div>`, note: '写方框里的数'};
      return {input: 'write', tag, html: `<div class="eq num">${q.k} + ${q.a} = 10 + ${box}</div>`, note: '写方框里的数'};
    }
    if (s.group === 'place') {
      if (it.id === 'place:t:read') return {input: 'write', tag, html: rods(q.tens, q.ones), note: '一根是 10，一块是 1。一共是几？'};
      return {input: 'write', tag, html: `<div class="say2">${N(q.n)} 里有几个${q.ask === 'tens' ? '十' : '一'}？</div>`, note: '在右边写出答案'};
    }
    if (s.group === 'cmp') {
      if (s.input === 'pick') return {input: 'pick', tag, html: '<div class="say2">哪个大？点它</div>', pick: [q.a, q.b]};
      return {input: 'write', tag, html: `<div class="say2">比 ${N(q.n)} ${nearWord(q.d).slice(0, 1)} ${N(Math.abs(q.d))}</div><div class="say2">是 ${box}</div>`, note: '在右边写出答案'};
    }
    // 数线
    return {input: 'line', tag, html: `<div class="say2">把旗子插到 ${N(q.target)} 的位置</div>`, note: '手指按在线上，可以拖，松手停一下就好', line: {max: q.max, target: q.target, mid: q.any ? q.max / 2 : null}};
  }
  // 缺数四种：□+a=b、a+□=b、□−a=b、a−□=b
  function missingEq(q, slot) {
    if (q.form === 'addL') return `${slot} + ${q.a} = ${q.b}`;
    if (q.form === 'addR') return `${q.a} + ${slot} = ${q.b}`;
    if (q.form === 'subL') return `${slot} − ${q.a} = ${q.b}`;
    return `${q.a} − ${slot} = ${q.b}`;
  }

  // ---------- 秒答答错时的一句讲解：进位先凑整十，退位先退到整十，两位数先算几个十（10 以内的口算不讲，前置分合已经教过） ----------
  function stepAdd(x, y) { // x 加一位数 y
    const k = 10 - x % 10;
    if (x % 10 + y < 10) return x >= 10 ? `几个一：${x % 10} + ${y} = ${x % 10 + y}，是 ${x + y}` : '';
    return y === k ? `${x} 和 ${y} 正好凑成 ${x + y}` : `${x} 先加 ${k} 凑成 ${x + k}，再加 ${y - k}，是 ${x + y}`;
  }
  function stepSub(x, y) { // x 减一位数 y
    const k = x % 10;
    if (x < 10) return `${x} − ${y} = ${x - y}`;
    if (y <= k) return y === k ? `${x} 去掉 ${y} 个一，剩 ${x - y}` : `几个一：${k} − ${y} = ${k - y}，是 ${x - y}`;
    if (x === 10) return `10 − ${y} = ${10 - y}`;
    if (k === 0) return `${x} 拿出 1 个十：10 − ${y} = ${10 - y}，${x - 10} + ${10 - y} = ${x - y}`;
    return `${x} 先减 ${k} 到 ${x - k}，再减 ${y - k}，是 ${x - y}`;
  }
  function speedWhy(a, op, b) {
    if (op === '+') {
      if (a < 10 && b < 10) return a + b >= 11 ? (a < b ? `从大的 ${b} 开始：` : '') + stepAdd(Math.max(a, b), Math.min(a, b)) : '';
      if (a === 10 && b < 10) return `10 和 ${b} 是 ${a + b}`;
      if (b % 10 === 0) return `${a} 加 ${b / 10} 个十，是 ${a + b}`;
      if (b < 10) return stepAdd(a, b);
      const m = a + b - b % 10; return `先加几个十：${a} + ${b - b % 10} = ${m}；再加 ${b % 10}：${stepAdd(m, b % 10)}`;
    }
    if (a <= 10) return '';
    if (b % 10 === 0) return `${a} 减 ${b / 10} 个十，是 ${a - b}`;
    if (b < 10) return stepSub(a, b);
    const m = a - (b - b % 10); return `先减几个十：${a} − ${b - b % 10} = ${m}；再减 ${b % 10}：${stepSub(m, b % 10)}`;
  }

  // ---------- 答错时的图解（左栏）：图 + 一句话；正确答案用 --ok 绿色 ----------
  function explain(inst) {
    const s = skillOf(inst.id), q = inst.q, a = inst.ans;
    const pack = (fig, line) => `<div class="explain">${fig}<div class="why">${line}</div></div>`;
    if (s.speed) return pack(`<div class="eq num">${q.a} ${opSign(q.op)} ${q.b} = ${ans(a)}</div>`, speedWhy(q.a, q.op, q.b, a));
    if (s.group === 'look') {
      const five = q.layout === 'tf' && q.n > 5 ? `5 和 ${q.n - 5}，是 ${ans(q.n)}` : q.layout === 'tf2' ? `10 和 ${q.n - 10}，是 ${ans(q.n)}` : `一共是 ${ans(q.n)}`;
      return pack(`<div class="look">${pattern(q)}</div>`, five);
    }
    if (s.group === 'bond') {
      if (q.blank === 'part') {
        const fig = q.n <= 10 ? frame(fill(q.a, q.n - q.a, 'gone').slice(0, 10)) : '';
        return pack(`<div class="eq num">${q.n} = ${q.a} + ${ans(a)}</div>${fig}`, q.n === 10 ? `${q.a} 个点，还空 ${a} 格，凑满 10` : `${q.n} 里有 ${q.a} 个，还差 ${a} 个`);
      }
      if (q.blank === 'whole') return pack(`<div class="eq num">${q.a} + ${q.b} = ${ans(a)}</div>${frame(fill(q.a, q.b, 'on2'))}`, `${q.a} 和 ${q.b} 合起来是 ${a}`);
      if (q.form) {
        const why = {addL: `${q.b} 里拿走 ${q.a}，还剩 ${a}`, addR: `${q.b} 里拿走 ${q.a}，还剩 ${a}`, subL: `${q.b} 再加回 ${q.a}，是 ${a}`, subR: `${q.a} 里拿走几个剩 ${q.b}？拿走 ${a} 个`}[q.form];
        return pack(`<div class="eq num">${missingEq(q, ans(a))}</div>`, why);
      }
      const need = 10 - q.k, rest = q.a - need;          // 过十准备：从 a 里拿 need 个凑满第一框
      const f1 = fill(q.k, need, 'moved'), f2 = Array.from({length: 10}, (_, i) => (i < rest ? 'on' : i < rest + need ? 'gone' : ''));
      return pack(`<div class="eq num">${q.k} + ${q.a} = 10 + ${ans(a)}</div><div class="tfs">${frame(f1)}${frame(f2)}</div><div class="cap"><span>${q.k} 个 + 挪来 ${need} 个</span><span>${q.a} 个挪走 ${need} 个，剩 ${rest}</span></div>`,
        `从 ${q.a} 里拿 ${need} 个凑满 10，还剩 ${rest}`);
    }
    if (s.group === 'place') {
      if (inst.id === 'place:t:read') return pack(`${rods(q.tens, q.ones)}<div class="cap"><span>${q.tens} 个十</span><span>${q.ones} 个一</span></div>`, `${q.tens} 个十和 ${q.ones} 个一，是 ${ans(q.n)}`);
      const t = Math.floor(q.n / 10), o = q.n % 10;
      return pack(rods(t, o), `${q.n} 是 ${q.ask === 'tens' ? ans(t) : t} 个十和 ${q.ask === 'ones' ? ans(o) : o} 个一`);
    }
    if (s.group === 'cmp') {
      if (s.input === 'pick') {
        const lo = Math.min(q.a, q.b), hi = Math.max(q.a, q.b);
        // 两位数：只画这两个数所在的那几个十（例：17 和 21 → 10—30），挨得近也分得开；还是太近（< 14%）就把小的那个数标到上面一层
        const [L0, L1] = hi <= 10 ? [0, 10] : hi <= 20 ? [0, 20] : [Math.floor(lo / 10) * 10, Math.floor(hi / 10) * 10 + 10];
        return pack(`<div class="cards2"><b class="${q.a === hi ? 'win' : ''}">${q.a}</b><b class="${q.b === hi ? 'win' : ''}">${q.b}</b></div>${miniLine(L0, L1, [[lo, ''], [hi, 'win']])}`, `${hi} 在 ${lo} 的右边，${hi} 大`);
      }
      const from = q.n, to = q.n + q.d, big = Math.abs(q.d) === 10;
      const lo = big ? Math.floor(Math.min(from, to) / 10) * 10 : Math.min(from, to) - 4, hi = big ? lo + 20 : Math.max(from, to) + 4;
      const why = {1: '多 1：往后数 1 个', '-1': '少 1：往前数 1 个', 10: '多 10：多 1 个十，一不变', '-10': '少 10：少 1 个十，一不变'}[q.d];
      return pack(`<div class="say2">比 ${N(from)} ${nearWord(q.d)} 是 ${ans(a)}</div>${miniLine(lo, hi, [[from, 'from'], [to, 'win']], true)}`, why);
    }
    return pack('', '');                                  // 数线的图解画在数线上（页面负责）
  }
  // 小数线：标出几个点，jump = 画一条从第一个点到第二个点的弧
  function miniLine(lo, hi, marks, jump) {
    const pos = v => ((v - lo) / (hi - lo) * 100).toFixed(2);
    const step = hi - lo <= 20 ? 1 : 10, ticks = [];
    for (let v = lo; v <= hi; v += step) ticks.push(`<i class="tick" style="left:${pos(v)}%"></i>`);
    const arc = jump && marks.length === 2 ? `<svg class="arc" style="left:${Math.min(pos(marks[0][0]), pos(marks[1][0]))}%;width:${Math.abs(pos(marks[1][0]) - pos(marks[0][0]))}%" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="M1 29 Q50 -8 99 29" vector-effect="non-scaling-stroke"></path></svg>` : '';
    const close = marks.length === 2 && Math.abs(marks[0][0] - marks[1][0]) / (hi - lo) < 0.14, left = close ? Math.min(marks[0][0], marks[1][0]) : null;
    return `<div class="mline"><i class="mbar"></i>${ticks.join('')}${arc}${marks.map(([v, c]) => `<b class="${['mk', c, v === left ? 'up' : ''].filter(Boolean).join(' ')}" style="left:${pos(v)}%">${v}</b>`).join('')}<span class="end l">${lo}</span><span class="end r">${hi}</span></div>`;
  }
  // 数线答错的那句话：差一个合格范围以内说"一点"
  function lineHint(target, given, tol) {
    const right = target > given, near = Math.abs(target - given) <= tol * 2;
    return (right ? '再往右' : '再往左') + (near ? '一点' : '') + ` · ${target} 在绿旗这里`;
  }

  // ---------- 答对时的字（说明书 3.4「孩子看到的字」） ----------
  function okWords(inst, out, wasLv) {
    const s = skillOf(inst.id), timed = s.timedFrom !== null && wasLv >= s.timedFrom, card = !K.ITEM[inst.id].gen;
    if (s.input === 'line') return {big: '很接近！', small: ''};
    if (s.speed) return out.pass ? {big: '⚡ 秒答！', small: out.up ? '点亮了' : ''} : {big: '✓ 对了', small: '再快一点就能升级'};
    if (timed && !out.pass) return {big: '✓ 对了', small: '再快一点就能升级'};
    if (out.up) return {big: card ? '✓ 对了！点亮了' : '✓ 点亮了！', small: ''};
    if (timed) return {big: '⚡ 又对又快！', small: ''};
    return {big: '✓ 对了！', small: ''};
  }

  // ---------- 「学一学」示范卡：三步动画（具体 → 图形 → 抽象），约 3 秒 ----------
  // 每一步带 class st1 / st2 / st3，页面用 CSS 动画依次显示
  const arrow = '<svg class="arr" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 12h32M26 4l8 8-8 8"></path></svg>';
  const step = (k, inner, cap) => `<div class="dstep st${k}">${inner}<span class="dcap">${cap}</span></div>`;
  // 示范用的题：数字固定（同一个技能每次一样），用固定种子出题
  function demo(skillId) {
    const s = K.BY[skillId], ex = K.example(s.items[0].id), q = ex.q;
    let title, body, foot;
    if (s.speed) {
      title = '秒答：看到算式，马上写答案';
      const it = s.items.find(x => !x.gen) || s.items[0], e = K.example(it.id);
      body = step(1, `<div class="eq num">${e.q.a} ${opSign(e.q.op)} ${e.q.b} =</div>`, '看到算式') + arrow + step(2, `<div class="eq num">${ans(e.ans)}</div>`, '马上写答案') + arrow + step(3, '<div class="say2">⚡</div>', '又对又快就点亮');
      foot = '不会就点「不会」，会告诉你答案';
    } else if (s.group === 'look') {
      title = '看数：看一眼，写出有几个';
      body = step(1, `<div class="look">${pattern(q)}</div>`, '图会闪一下') + arrow + step(2, `<div class="look">${q.layout === 'dice' || q.layout === 'scat' ? pattern(q) : pattern(q)}</div>`, q.layout === 'tf' || q.layout === 'tf2' ? '上面一行是 5 个' : '一眼看出来') + arrow + step(3, `<div class="eq num">${ans(q.n)}</div>`, '写出有几个');
      foot = '没看清可以点「再看一次」';
    } else if (s.group === 'bond') {
      title = '分合：一个数可以拆成两个数';
      const n = q.n || 5, a = q.a || 2;
      body = step(1, `<div class="row">${'<i class="dot"></i>'.repeat(n)}</div>`, `${n} 个圆点`) + arrow + step(2, `<div class="row">${'<i class="dot"></i>'.repeat(a)}<b class="gap"></b>${'<i class="dot on2"></i>'.repeat(n - a)}</div>`, `分成 ${a} 个和 ${n - a} 个`) + arrow + step(3, bondFig(n, a, n - a), '分合图');
      foot = '上面是整个数，下面是拆出来的两个数';
      if (q.form) { title = '缺数：方框里藏着一个数'; body = step(1, `<div class="eq num">${missingEq(q, box)}</div>`, '方框里是几？') + arrow + step(2, `<div class="eq num">${missingEq(q, ans(ex.ans))}</div>`, '想一想分合') + arrow + step(3, '<div class="say2">✓</div>', '写方框里的数'); foot = '想想这几个数怎么分、怎么合'; }
      if (q.k) { const need = 10 - q.k; title = '过十准备：先凑满 10'; body = step(1, `<div class="tfs">${frame(fill(q.k))}${frame(fill(q.a))}</div>`, `${q.k} 个和 ${q.a} 个`) + arrow + step(2, `<div class="tfs">${frame(fill(q.k, need, 'moved'))}${frame(Array.from({length: 10}, (_, i) => (i < q.a - need ? 'on' : i < q.a ? 'gone' : '')))}</div>`, `挪 ${need} 个凑满 10`) + arrow + step(3, `<div class="eq num">10 + ${ans(q.a - need)}</div>`, `还剩 ${q.a - need}`); foot = '先把 10 凑满，再看剩几个'; }
    } else if (s.group === 'place') {
      title = '数位：10 个一拼成 1 个十';
      body = step(1, `<div class="col10">${'<i class="one"></i>'.repeat(10)}</div>`, '10 个一') + arrow + step(2, '<div class="rodset"><i class="rod"></i></div>', '拼成 1 根') + arrow + step(3, rods(4, 0), '4 根是 4 个十，是 40');
      foot = '一根就是 10，数根数就行，不用一个一个数';
    } else if (s.group === 'cmp') {
      if (s.input === 'pick') {
        const lo = Math.min(q.a, q.b), hi = Math.max(q.a, q.b), max = hi <= 10 ? 10 : hi <= 20 ? 20 : 100;
        title = '比大小：在数线上越往右越大';
        body = step(1, `<div class="cards2"><b>${q.a}</b><b>${q.b}</b></div>`, '两个数') + arrow + step(2, miniLine(0, max, [[lo, ''], [hi, 'win']]), '放到数线上') + arrow + step(3, `<div class="cards2"><b class="win">${hi}</b></div>`, '点右边那个');
        foot = '看清楚，再点大的那个数';
      } else {
        const to = q.n + q.d, big = Math.abs(q.d) === 10, lo = big ? Math.floor(Math.min(q.n, to) / 10) * 10 : Math.min(q.n, to) - 4, hi = big ? lo + 20 : Math.max(q.n, to) + 4;
        title = '前后数：在数线上跳一跳';
        body = step(1, `<div class="say2">比 ${N(q.n)} ${nearWord(q.d)}</div>`, '从这个数出发') + arrow + step(2, miniLine(lo, hi, [[q.n, 'from'], [to, 'win']], true), big ? '跳 1 个十' : '跳 1 格') + arrow + step(3, `<div class="eq num">${ans(to)}</div>`, '落在这里');
        foot = big ? '多 10：多 1 个十，一不变' : '多 1 往后数，少 1 往前数';
      }
    } else {
      title = '数线：0 在左边，越往右越大';
      body = step(1, miniLine(0, q.max, [[0, ''], [q.max, '']]), `两头是 0 和 ${q.max}`) + arrow + step(2, miniLine(0, q.max, [[q.max / 2, 'from']]), `中间是 ${q.max / 2}`) + arrow + step(3, miniLine(0, q.max, [[q.target, 'win']]), `${q.target} 在这里`);
      foot = '手指按在线上，可以拖，松手停一下就好';
    }
    return `<div class="demo"><div class="dhead"><span class="learn">学一学</span><span class="dtitle">${title}</span></div><div class="dbody">${body}</div><div class="dfoot">${foot}</div></div>`;
  }

  // ---------- 名称：技能组地图的题型格子、结算的"今天点亮的"、错题本的题 ----------
  const TYPE_LABEL = {
    'bond:t:whole5': '合起来是几', 'bond:t:whole9': '合起来是几',
    'bond:t:addL': '□ + 3 = 7', 'bond:t:addR': '4 + □ = 9', 'bond:t:subL': '□ − 2 = 5', 'bond:t:subR': '8 − □ = 6',
    'bond:t:to10-9': '9 + 4 = 10 + □', 'bond:t:to10-8': '8 + 5 = 10 + □', 'bond:t:to10-7': '7 + 6 = 10 + □',
    'place:t:read': '看图写数', 'place:t:split': '47 里有几个十',
    'cmp:t:10': '10 以内', 'cmp:t:20': '20 以内', 'cmp:t:100': '两位数', 'cmp:t:swap': '47 和 74 这种',
    'cmp:t:p1': '多 1', 'cmp:t:m1': '少 1', 'cmp:t:p10': '多 10', 'cmp:t:m10': '少 10',
    'line:t:10': '0 到 10', 'line:t:20': '0 到 20', 'line:t:100t': '0 到 100 整十', 'line:t:100': '0 到 100 任意数',
  };
  // 一个格子的短名字（卡 = 题本身，题型 = 题型名）
  function label(id) {
    const it = K.ITEM[id], s = skillOf(id);
    if (s.speed) return C.label(C.BYID[id]);
    if (it.gen) return TYPE_LABEL[id] || s.name;
    const q = it.q;
    if (s.group === 'look') return {dice: '骰子', scat: '乱点', tf: '十格框', tf2: '两个十格框'}[q.layout] + ' ' + q.n;
    return `${q.n} = ${q.a} + ${q.n - q.a}`;
  }
  // 错题本里一道题的样子（秒答 = 算式；理解题 = 题目本身，空着的写 □）
  function mistLabel(m) {
    if (!m.src) return `${m.a} ${opSign(m.op)} ${m.b}`;
    const q = m.q || {}, s = skillOf(m.uid);
    if (s.group === 'look') return `看数 · ${q.n}`;
    if (s.group === 'bond') {
      if (q.blank === 'part') return `${q.n} = ${q.a} + □`;
      if (q.blank === 'whole') return `${q.a} + ${q.b} = □`;
      if (q.form) return missingEq(q, '□');
      return `${q.k} + ${q.a} = 10 + □`;
    }
    if (s.group === 'place') return m.uid === 'place:t:read' ? `${q.tens} 根十 ${q.ones} 块一` : `${q.n} 里有几个${q.ask === 'tens' ? '十' : '一'}`;
    if (s.group === 'cmp') return s.input === 'pick' ? `${q.a} 和 ${q.b} 谁大` : `比 ${q.n} ${nearWord(q.d)}`;
    return `数线 · ${q.target}`;
  }

  return {speedWhy, GROUPS, GNAME, groupStat, itemsOf, tagOf, question, explain, okWords, demo, lineHint, miniLine, scatPos, TYPE_LABEL, label, mistLabel};
});
