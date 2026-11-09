// iPad 竖式答题（docs/说明书-iPad竖式.md，原型 docs/原型/ipad/）：加减、乘法、除法竖式三种版面
// 答案一格一位，草稿和进位不判；点「写好了」才判。示范卡和答错后的「正确写法」都用同一套按数字现算的竖式，
// 每一步记下「写什么、看哪几个数、怎么说」（中英两套句子，英文日直接用英文，不走翻译层）
// 纯函数部分 node 可测；mount / demo 只在浏览器里用
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(null);
  else root.VERT = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  // 只给这 7 个纯计算题型（都是「a 运算 b =」、得数是整数）
  const IDS = {'speed:g10:add3': 'vert', 'speed:g10:sub3': 'vert', 'speed:g11:mul': 'mul', 'speed:g12:mul2': 'mul', 'speed:g13:mul3': 'mul', 'speed:g11:div': 'div', 'speed:g13:div2': 'div'};
  // 其他三四年级手写题（Ben 11-08「做完上线」，原型的递等式 / 填空 / 应用题三种）：题在上，草稿在中间，答案写在下面蓝框
  const STEP = ['speed:g13:order', 'speed:g14:law'];
  const BOARD = ['speed:g10:rem', 'speed:g10:quo', 'place:g10:thou', 'market:g10:conv', 'market:g10:span', 'dock:g10:remain', 'dock:g10:two', 'speed:g11:divrem',
    'dock:g11:perim', 'dock:g11:times', 'dock:g11:two', 'dock:g11:speed', 'dock:g11:part', 'speed:g12:dec', 'dock:g12:area', 'dock:g12:price', 'market:g12:24', 'market:g12:year',
    'speed:g13:order', 'place:g13:round', 'dock:g13:unit', 'dock:g13:speed', 'dock:g13:share', 'speed:g14:law', 'speed:g14:lawfill', 'speed:g14:dec2', 'speed:g14:move',
    'dock:g14:avg', 'dock:g14:meet', 'dock:g14:tri', 'market:g14:unit', 'place:g15:lcm', 'place:g15:gcd', 'dock:g15:three', 'dock:g15:sumdiff', 'dock:g15:timessum', 'dock:g15:legs', 'dock:g15:age',
    // 中控 11-08：2a 看图题（线段图、条形图、长方形）和 2b-1 分数手写题也用蓝框，统一点「写好了」交卷；题面的图 / 上下结构分数放在版面上方
    'dock:g7:bar', 'dock:g8:chart', 'place:g8:side', 'dock:g9:chart2', 'dock:g9:times', 'dock:g9:sumtimes', 'dock:g10:chart5', 'dock:g11:perim2', 'place:g12:area2', 'dock:g15:barsum',
    'dock:g11:fracbar', 'speed:g12:fracadd', 'speed:g15:equiv',
    // 第三批趣味题（中控 11-09）：数塔、幻方、植树 / 锯木头（题面有图）、算式谜（方框夹在数字里，一格）、猜数（纯文字，同应用题）
    'garden:g4:pyr', 'garden:g7:pyr2', 'garden:g7:magic', 'dock:g5:tree', 'dock:g5:saw', 'dock:g7:tree2', 'dock:g9:tree3', 'dock:g7:cipher', 'dock:g7:riddle', 'dock:g9:riddle2'];
  const FIG = ['bar', 'chart', 'rect', 'pyr', 'magic', 'trees'], WORD = ['story', 'riddle'];   // 看图题：正确写法不重复题面（讲解里有算式）
  const OPS = {'+': '+', '−': '-', '-': '-', '×': '×', '÷': '÷'};
  // 答案格数：方框夹在数字中间（2.□、11.□8）就一格；否则比答案多一格（不泄露位数到个位）
  // maxLen：这个题型里最长的答案有几位（页面从题库算好传进来），格数按它定，不随这道题变，免得格子数泄露位数
  function board(inst, maxLen) {
    const q = inst.q || {}, text = String(q.text || ''), ans = inst.ans;
    if (!Number.isInteger(ans) || ans < 0) return null;
    // 小数加减写完整得数（q.dp = 小数位数，ans 是去掉小数点的整数）：答案格里印一个固定小数点，孩子不写点
    const dp = q.dp > 0 ? q.dp : 0, inNum = !dp && /[\d.]□|□[\d.]/.test(text), len = Math.max(String(ans).length, maxLen || 0);
    return {kind: STEP.includes(inst.id) ? 'step' : WORD.includes(q.view) ? 'word' : FIG.includes(q.view) ? 'fig' : 'fill', law: inst.id === 'speed:g14:law', ans, text, inNum, dp, n: inNum ? 1 : len + 1};
  }
  const TAP_MS = 1500;   // 点「写好了」的时间，不算进用时
  function parse(inst, maxLen) {
    if (inst && BOARD.includes(inst.id)) return board(inst, maxLen);
    const kind = IDS[inst && inst.id]; if (!kind) return null;
    const m = String((inst.q && inst.q.text) || '').match(/^(\d+) ([+−×÷-]) (\d+) =$/); if (!m) return null;
    const a = +m[1], op = OPS[m[2]], b = +m[3];
    if ((kind === 'vert') !== (op === '+' || op === '-') || (kind === 'mul') !== (op === '×')) return null;
    const ans = op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b;
    if (ans !== inst.ans || !Number.isInteger(ans) || ans < 0) return null;
    return {kind, a, op, b, ans};
  }
  // 示范用另一组数（不剧透练习题）；加、减各一张
  const demoKey = p => (p.law ? 'law' : p.op === '+' ? 'add' : p.op === '-' ? 'sub' : p.kind);   // fill / word 没有示范（只是把得数写进蓝框）
  const DEMO = {
    add: {p: {kind: 'vert', a: 325, op: '+', b: 148, ans: 473}, tip: ['从个位算起，满十向前一位进 1', 'Start from the ones. When you make 10, carry 1 to the next place']},
    sub: {p: {kind: 'vert', a: 352, op: '-', b: 174, ans: 178}, tip: ['从个位算起，不够减就向前一位借 1，借走的那一位点一个点', 'Start from the ones. If it is too small, borrow 1 from the next place and put a dot on it']},
    mul: {p: {kind: 'mul', a: 23, op: '×', b: 14, ans: 322}, tip: ['先用个位乘，再用十位乘，最后两行相加', 'Multiply by the ones, then by the tens, then add the two rows']},
    div: {p: {kind: 'div', a: 96, op: '÷', b: 4, ans: 24}, tip: ['从最高位除起：商、乘、减、落下', 'Start from the highest place: divide, multiply, subtract, bring down']},
    step: {p: {kind: 'step', text: '56 + 4 × 6 =', ans: 80}, tip: ['先算乘除，再算加减，有括号先算括号；一步写一行', 'Times and divide first, then plus and minus; brackets first. One step per line']},
  };

  // ---------- 竖式：格子 {v 文字, c 样式（u 下划线 · s 小字进位/退位点 · q 蓝框答案 · br 厂字 · t 上横线）, id, h 示范时先藏} ----------
  let UID = 0;
  const mk = () => 'vk' + (UID++);
  const blank = o => Object.assign({v: '', id: mk()}, o || {});
  const cellRow = (s, n, extra) => { const a = String(s).split(''); return Array(n - a.length).fill(0).map(() => blank()).concat(a.map(v => blank(Object.assign({v}, extra || {})))); };
  const PLACE = [['个位', 'ones'], ['十位', 'tens'], ['百位', 'hundreds'], ['千位', 'thousands'], ['万位', 'ten thousands'], ['十万位', 'hundred thousands']];
  const say = (zh, en) => ({say: zh, en});
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  // 加减：从个位起一列一列算
  function bAddSub(A, op, Bv) {
    const sa = String(A), sb = String(Bv), sr = String(op === '+' ? A + Bv : A - Bv), n = Math.max(sa.length, sb.length) + (op === '+' ? 1 : 0);
    const marks = Array(n).fill(0).map(() => blank({c: 's', h: true}));
    const ra = cellRow(sa, n), rb = cellRow(sb, n).map(c => Object.assign(c, {c: 'u'})), rr = cellRow(sr, n, {c: 'q', h: true});
    const nm = i => PLACE[n - 1 - i] || ['', ''];
    const steps = []; let carry = 0;
    const eff = ra.map(c => (/\d/.test(c.v) ? +c.v : 0)), lent = {};   // eff：这一位实际剩下的数；lent：被借过
    for (let i = n - 1; i >= 0; i--) {
      const j = i - 1, q = +(rb[i].v || 0), hasA = ra[i].v !== '', hasB = rb[i].v !== '', [z, e] = nm(i);
      if (op === '+') {
        if (!hasA && !hasB) { if (carry) steps.push(Object.assign({show: [rr[i].id], hi: [marks[i].id]}, say(`${z}：进上来的 1，写 1`, `${cap(e)}: the carried 1, write 1`))); break; }
        const p = eff[i], s = p + q + carry, nc = s >= 10 ? 1 : 0, show = [rr[i].id];
        if (nc && j >= 0) { marks[j].v = '1'; show.push(marks[j].id); }
        const terms = [hasA ? p : null, hasB ? q : null].filter(v => v !== null);
        const one = terms.length === 1 && !carry;
        const zh = one ? `只有 ${s}，写 ${s}` : `${terms.join(' + ')}${carry ? ' + 进的 1' : ''} = ${s}，写 ${s % 10}${nc ? `，向${nm(j)[0]}进 1` : ''}`;
        const en = one ? `only ${s}, write ${s}` : `${terms.join(' + ')}${carry ? ' + carried 1' : ''} = ${s}, write ${s % 10}${nc ? `, carry 1 to the ${nm(j)[1]}` : ''}`;
        steps.push(Object.assign({show, hi: [ra[i].id, rb[i].id].concat(carry ? [marks[i].id] : [])}, say(`${z}：${zh}`, `${cap(e)}: ${en}`)));
        carry = nc;
      } else {
        if (!hasA && !hasB) break;
        let pre = lent[i] || ['', ''], show = [], x = eff[i], how;
        if (x < q) {   // 不够减：向前一位借；前一位是 0 就继续往前借，中间的 0 借来后变 9
          const zeros = []; let k = j;
          while (k >= 0 && eff[k] === 0) { zeros.push(k); k--; }
          eff[k] -= 1; lent[k] = [`${ra[k].v} 被借走 1，剩 ${eff[k]}；`, `${ra[k].v} lent 1, now ${eff[k]}; `]; marks[k].v = '·'; show.push(marks[k].id);
          zeros.forEach(zz => { eff[zz] = 9; lent[zz] = ['借来的 10 又借出 1，剩 9；', 'the borrowed 10 lent 1, now 9; ']; marks[zz].v = '·'; show.push(marks[zz].id); });
          const zn = zeros.map(zz => nm(zz)[0]).join('、'), ze = zeros.map(zz => 'the ' + nm(zz)[1]).join(' and ');
          how = zeros.length
            ? [`${x} 不够减 ${q}，${zn}${zeros.length > 1 ? '都' : ''}是 0，向${nm(k)[0]}借 1，${zn}变成 10，再借 1 给${z}；${x + 10} − ${q} = ${x + 10 - q}`,
              `${x} is less than ${q}, ${ze} ${zeros.length > 1 ? 'are' : 'is'} 0, so borrow 1 from the ${nm(k)[1]}, ${ze} ${zeros.length > 1 ? 'become' : 'becomes'} 10, then lend 1 to the ${e}; ${x + 10} − ${q} = ${x + 10 - q}`]
            : [`${x} 不够减 ${q}，向${nm(j)[0]}借 1，${x + 10} − ${q} = ${x + 10 - q}`, `${x} is less than ${q}, borrow 1 from the ${nm(j)[1]}, ${x + 10} − ${q} = ${x + 10 - q}`];
          x += 10;
        } else how = hasB ? [`${x} − ${q} = ${x - q}`, `${x} − ${q} = ${x - q}`] : [`只有 ${x}，写 ${x}`, `only ${x}, write ${x}`];
        if (rr[i].v !== '') show.unshift(rr[i].id);
        if (rr[i].v === '' && !hasB) { pre = [pre[0].replace(/；$/, ''), pre[1].replace(/; $/, '')]; how = ['', '']; }   // 最高位借完剩 0：不写
        const top = rr[i].v === '';
        steps.push(Object.assign({show, hi: [ra[i].id, rb[i].id]}, say(`${z}：${pre[0]}${how[0]}${top ? '，最高位的 0 不写' : ''}`, `${cap(e)}: ${pre[1]}${how[1]}${top ? ", don't write the 0 in front" : ''}`)));
      }
    }
    return {n, steps, rows: [[blank({c: 's'})].concat(marks), [blank()].concat(ra), [blank({v: op === '-' ? '−' : '+', c: 'u'})].concat(rb), [blank()].concat(rr)]};
  }
  // 乘法：乘一位数一行；乘两位数先用个位乘、再用十位乘（末位对着十位），两行再相加。进位写在这一行积的正上方
  function bMul(a, b) {
    const sa = String(a), sb = String(b), prod = a * b, n = Math.max(String(prod).length, sa.length, sb.length) + 1;
    const ra = cellRow(sa, n), rb = cellRow(sb, n).map(c => Object.assign(c, {c: 'u'}));
    const ad = sa.split('').map(Number), bd = sb.split('').map(Number).reverse(), steps = [];
    const part = (d, shift, blue) => {
      const C = Array(n).fill(0).map(() => blank({c: 's', h: true})), R = Array(n).fill(0).map(() => blank({h: true}));
      let c = 0;
      for (let k = ad.length - 1; k >= 0; k--) {
        const col = n - 1 - shift - (ad.length - 1 - k), v = ad[k] * d + c, show = [];
        const zh = `${d} × ${ad[k]}${c ? ` + 进的 ${c}` : ''} = ${v}`, en = `${d} × ${ad[k]}${c ? ` + carried ${c}` : ''} = ${v}`;
        const hiA = [ra[n - ad.length + k].id, rb[n - 1 - shift].id];   // 这一步乘的两个数（上面那个数补了前导空位）
        if (k === 0) { const s = String(v); for (let u = 0; u < s.length; u++) { const cc = col - (s.length - 1 - u); R[cc].v = s[u]; show.push(R[cc].id); } steps.push(Object.assign({show, hi: hiA.concat(c ? [C[col].id] : [])}, say(`${zh}，写 ${v}`, `${en}, write ${v}`))); }
        else { R[col].v = String(v % 10); show.push(R[col].id); const nc = Math.floor(v / 10); if (nc) { C[col - 1].v = String(nc); show.push(C[col - 1].id); } steps.push(Object.assign({show, hi: hiA.concat(c ? [C[col].id] : [])}, say(`${zh}，写 ${v % 10}${nc ? `，进 ${nc}` : ''}`, `${en}, write ${v % 10}${nc ? `, carry ${nc}` : ''}`))); c = nc; }
      }
      if (blue) R.forEach(x => { if (x.v !== '') x.c = 'q'; });
      return [C, R];
    };
    const rows = [[blank()].concat(ra), [blank({v: '×', c: 'u'})].concat(rb)];
    if (bd.length === 1) {
      const [C, R] = part(bd[0], 0, true);
      rows.push([blank({c: 's'})].concat(C), [blank()].concat(R));
      return {n, rows, steps};
    }
    steps.push(Object.assign({show: [], hi: [rb[n - 1].id]}, say(`先用个位上的 ${bd[0]} 去乘 ${a}`, `First multiply ${a} by the ones digit ${bd[0]}`)));
    const [C1, R1] = part(bd[0], 0, false);
    steps.push(Object.assign({show: [], hi: [rb[n - 2].id]}, say(`再用十位上的 ${bd[1]} 去乘 ${a}，积的末位对着十位写，个位空着`, `Then multiply ${a} by the tens digit ${bd[1]}. Its last digit goes under the tens; leave the ones empty`)));
    const [C2, R2] = part(bd[1], 1, false);
    const LN = Array(n + 1).fill(0).map(() => blank({c: 's u', h: true}));   // 两行相加前画的横线，整条一起出现
    const S = cellRow(String(prod), n, {c: 'q', h: true});
    let carry = 0;
    steps.push(Object.assign({show: LN.map(x => x.id)}, say('画横线，两行相加', 'Draw a line and add the two rows')));
    for (let col = n - 1; col >= 0; col--) {
      const p = +(R1[col].v || 0), q = +(R2[col].v || 0), has = R1[col].v !== '' || R2[col].v !== '';
      if (!has && !carry) break;
      const s = p + q + carry, terms = [R1[col].v, R2[col].v].filter(v => v !== ''), one = terms.length === 1 && !carry;
      const [z, e] = PLACE[n - 1 - col];
      const zh = !has ? '进上来的 1，写 1' : one ? `只有 ${s}，写 ${s}` : `${terms.join(' + ')}${carry ? ' + 进的 1' : ''} = ${s}，写 ${s % 10}${s >= 10 ? '，进 1' : ''}`;
      const en = !has ? 'the carried 1, write 1' : one ? `only ${s}, write ${s}` : `${terms.join(' + ')}${carry ? ' + carried 1' : ''} = ${s}, write ${s % 10}${s >= 10 ? ', carry 1' : ''}`;
      steps.push(Object.assign({show: [S[col].id], hi: has ? [R1[col].id, R2[col].id] : []}, say(`两行相加，${z}：${zh}`, `Add the rows, ${e}: ${en}`)));
      carry = s >= 10 ? 1 : 0;
    }
    rows.push([blank({c: 's'})].concat(C1), [blank()].concat(R1), [blank({c: 's'})].concat(C2), [blank()].concat(R2), LN, [blank()].concat(S));
    return {n, rows, steps};
  }
  // 除法（厂字形）：从最高位除起；每一步 商 → 乘 → 减 → 落下下一位
  function bDiv(a, b) {
    const ds = String(a).split('').map(Number), Ln = ds.length, n = Ln + 2, steps = [];
    const qrow = Array(Ln).fill(0).map(() => blank({h: true})), dcell = ds.map(d => blank({v: String(d), c: 't'}));
    const rows = [[blank(), blank(), blank()].concat(qrow), [blank(), blank({v: String(b)}), blank({c: 'br'})].concat(dcell)];
    const line = () => Array(n).fill(0).map(() => blank({h: true}));
    const put = (row, s, end) => { const str = String(s), ids = []; for (let u = 0; u < str.length; u++) { const cc = 2 + end - (str.length - 1 - u); row[cc].v = str[u]; ids.push(row[cc].id); } return ids; };
    const pl = i => PLACE[Ln - 1 - i];
    let i = 0, cur = ds[0];
    while (cur < b && i < Ln - 1) cur = cur * 10 + ds[++i];
    const head = String(a).slice(0, i);
    steps.push(Object.assign({show: [], hi: dcell.slice(0, i + 1).map(c => c.id)}, i === 0 ? say(`从最高位除起，先看 ${cur}`, `Start from the highest place: ${cur}`)
      : say(`${head} 不够除以 ${b}，看前 ${i + 1} 位：${cur}`, `${head} is less than ${b}, so look at the first ${i + 1} digits: ${cur}`)));
    let row = null;
    for (;;) {
      const q = Math.floor(cur / b), prod = q * b, rest = cur - prod, cn = String(cur).length;
      qrow[i].v = String(q); qrow[i].c = 'q';
      if (q === 0 && row) {
        steps.push(Object.assign({show: [qrow[i].id], hi: []}, say(`${cur} 不够除以 ${b}，商 0${i === Ln - 1 && cur ? `，余 ${cur}` : ''}`, `${cur} is less than ${b}, so the quotient digit is 0${i === Ln - 1 && cur ? `, remainder ${cur}` : ''}`)));
        if (i === Ln - 1) break;
        i++; cur = cur * 10 + ds[i];
        steps.push(Object.assign({show: put(row, ds[i], i), hi: [dcell[i].id]}, say(`落下 ${ds[i]}，是 ${cur}`, `Bring down ${ds[i]}: ${cur}`)));
        continue;
      }
      steps.push(Object.assign({show: [qrow[i].id], hi: []}, say(`${cur} 里面有 ${q} 个 ${b}，商 ${q} 写在${pl(i)[0]}上面`, `${cur} has ${q} ${q === 1 ? 'group' : 'groups'} of ${b}; write ${q} above the ${pl(i)[1]}`)));
      const pr = line(), ids = put(pr, prod, i);
      for (let u = i - cn + 1; u <= i; u++) pr[2 + u].c = 'u';
      rows.push([blank()].concat(pr));
      steps.push(Object.assign({show: ids.concat(pr.filter(x => x.c === 'u').map(x => x.id)), hi: [qrow[i].id]}, say(`${q} × ${b} = ${prod}，写在 ${cur} 下面`, `${q} × ${b} = ${prod}, write it under ${cur}`)));
      row = line(); rows.push([blank()].concat(row));
      if (i === Ln - 1) { steps.push(Object.assign({show: put(row, rest, i), hi: []}, say(`${cur} − ${prod} = ${rest}${rest ? `，余 ${rest}` : '，正好除尽'}`, `${cur} − ${prod} = ${rest}${rest ? `, remainder ${rest}` : ', no remainder'}`))); break; }
      steps.push(Object.assign({show: rest ? put(row, rest, i) : [], hi: []}, say(`${cur} − ${prod} = ${rest}${rest ? '' : '，0 不写'}`, `${cur} − ${prod} = ${rest}${rest ? '' : ", don't write the 0"}`)));
      i++; cur = rest * 10 + ds[i];
      steps.push(Object.assign({show: put(row, ds[i], i), hi: [dcell[i].id]}, say(`落下 ${ds[i]}，是 ${cur}`, `Bring down ${ds[i]}: ${cur}`)));
    }
    return {n, rows, steps};
  }
  // 递等式：最里面的括号先算；同一层先把每一段乘除算完，再算加减。一行一步，返回每一行（不含第一行的原式）
  const fmt = v => String(Math.round(v * 1e6) / 1e6);
  const toks = s => s.replace(/=\s*$/, '').match(/\d+(?:\.\d+)?|[+−×÷()-]/g).map(x => (x === '-' ? '−' : /\d/.test(x) ? +x : x));
  const show = a => a.map(x => (typeof x === 'number' ? fmt(x) : x)).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
  let OPLOG = [];   // 这一行算了哪几步，示范时说出来
  function flatOnce(a) {   // a：没有括号的一段；有乘除先把每一段乘除算完，否则从左到右算完
    if (a.length === 1) return a;
    const f0 = (x, op, y) => (op === '+' ? x + y : op === '−' ? x - y : op === '×' ? x * y : x / y);
    const f = (x, op, y) => { const r = f0(x, op, y); OPLOG.push(`${fmt(x)} ${op} ${fmt(y)} = ${fmt(r)}`); return r; };
    if (a.some(x => x === '×' || x === '÷')) {
      const o = [];
      for (let i = 0; i < a.length; i++) {
        if ((a[i] === '×' || a[i] === '÷') && typeof o[o.length - 1] === 'number') { o[o.length - 1] = f(o[o.length - 1], a[i], a[++i]); continue; }
        o.push(a[i]);
      }
      return o;
    }
    let v = a[0]; for (let i = 1; i < a.length; i += 2) v = f(v, a[i], a[i + 1]);
    return [v];
  }
  function stepLines(text) {
    let a = toks(text); const lines = [], why = [];
    for (let g = 0; g < 12 && a.length > 1; g++) {
      OPLOG = [];
      const deep = a.lastIndexOf('(') >= 0;
      if (deep) {   // 所有最里层括号各算一步；只剩一个数就去掉括号
        const o = [];
        for (let i = 0; i < a.length; i++) {
          if (a[i] === '(') { const j = a.indexOf(')', i); const inner = a.slice(i + 1, j); if (!inner.includes('(')) { const r = flatOnce(inner); o.push(...(r.length === 1 ? r : ['('].concat(r, [')']))); i = j; continue; } }
          o.push(a[i]);
        }
        a = o;
      } else a = flatOnce(a);
      lines.push('= ' + show(a)); why.push(OPLOG.join('，'));
    }
    return {first: show(toks(text)), lines, why};
  }
  const build = p => (p.op === '×' ? bMul(p.a, p.b) : p.op === '÷' ? bDiv(p.a, p.b) : bAddSub(p.a, p.op, p.b));
  // 竖式的样子：答案在蓝框里，进位小字，示范时先藏（all = 全部显示）
  const CLS = {u: 'vu', s: 'vs', q: 'vqa', br: 'vbr', t: 'vt'};
  const renderB = (B, all) => `<div class="vg" style="grid-template-columns:30px repeat(${B.n}, 40px)">${B.rows.map(r => r.map(x => `<div id="${x.id}" class="${(x.c || '').split(' ').filter(Boolean).map(k => CLS[k]).join(' ')}${x.h && !all ? ' vhid' : ''}">${x.v}</div>`).join('')).join('')}</div>`;
  // 示范和正确写法：竖式是格子；递等式是一行一行；填空是把方框填上的整个算式；应用题没有（讲解里有算式）
  function plan(p, all) {
    if (p.law) return {html: '', steps: []};
    if (p.kind === 'step') {
      const S = stepLines(p.text), ids = S.lines.map(() => mk());
      return {html: `<div class="vls"><div>${S.first}</div>${S.lines.map((l, i) => `<div id="${ids[i]}"${all ? '' : ' class="vhid"'}>${l}</div>`).join('')}</div>`,
        steps: S.lines.map((l, i) => ({show: [ids[i]], hi: [], say: `先算 ${S.why[i]}`, en: `First ${S.why[i].replace(/，/g, ', ')}`}))};
    }
    const box = v => `<b class="vfillv">${v}</b>`;
    const full = p.dp ? (p.ans / 10 ** p.dp).toFixed(p.dp) : p.ans;
    if (p.kind === 'fill' && p.noWorked) return {html: '', steps: []};   // 分数题：讲解里已经是上下结构的整式，不再重复一张「正确写法」（E 核对第 5 条）
    if (p.kind === 'fig') return {html: '', steps: []};
    if (p.kind === 'fill') return {html: `<div class="vls"><div>${p.text.includes('□') ? p.text.replace('□', box(p.inNum ? String(p.ans).slice(-1) : full)) : p.text.replace(/=\s*$/, '= ' + box(full))}</div></div>`, steps: []};
    if (p.kind === 'word') return {html: '', steps: []};
    const B = build(p); return {html: renderB(B, all), steps: B.steps};
  }
  const worked = (p, en) => { const h = plan(p, true).html; return h ? `<div class="vwk"><h4>${en ? 'The right way' : '正确写法'}</h4>${h}</div>` : ''; };

  // ---------- 输入版面（手指尺寸，同原型） ----------
  const LAB = {carry1: ['进位', 'Carry'], borrow: ['退位', 'Borrow'], gap: ['中间空了一格', 'A box in the middle is empty'], ans: ['答案', 'Answer'], quo: ['商', 'Quotient'], draft: ['草稿', 'Work'],
    done: ['写好了', 'Done'], clear: ['擦一笔', 'Undo'], dunno: ['不会', "I don't know"], demo: ['看示范', 'Show me'], step: ['一步一步看', 'Step by step'],
    demoH: ['先看一遍怎么写', 'Watch how to write it'], go: ['我会了，开始写', 'Got it, let me write'], again: ['再看一遍', 'Watch again'], ex: ['例题', 'Example'], first: ['先看题', 'Look at the problem'],
    empty: ['在蓝框里写答案', 'Write the answer in the blue boxes'], unclear: ['这一格没看清，再写一次', "Couldn't read that box. Write it again"],
    two: ['一格只写一个数', 'One digit in each box'], dpPlace: ['小数部分写在小数点后面的格子里', 'Write the decimal part in the boxes after the point'], place: ['个位写在最右边的格子里', 'Write the ones digit in the rightmost box'], zero: ['最高位不写 0', "Don't write 0 in front"], same: ['这道题的写法', 'How to write this one']};
  const L = (k, en) => LAB[k][en ? 1 : 0];
  const cells = n => Array.from({length: n}, () => '<div class="vcell"><canvas></canvas></div>').join('');
  const minis = n => Array.from({length: n}, () => '<div class="vmini"><canvas></canvas></div>').join('');
  const digs = (s, n) => Array(n - String(s).length).fill('').concat(String(s).split('')).map(d => `<div>${d}</div>`).join('');
  function layout(p, en) {
    if (p.kind === 'step' || p.kind === 'fill' || p.kind === 'word' || p.kind === 'fig') {
      const rows = p.kind === 'step' ? [0, 1].map(() => `<div class="veq"><b>=</b><div class="vstrip vplain"><canvas></canvas></div></div>`).join('') : '';
      return `<div class="vboard vb-${p.kind}"><div class="vbq">${p.qhtml || ''}</div><div class="vcard">${rows}
        <div class="vrow" style="grid-template-columns:80px 1fr"><div class="vlab">${L('draft', en)}</div><div class="vgrid vstrip"><canvas></canvas></div></div>
        <div class="vrow" style="grid-template-columns:80px auto;justify-content:start;padding-top:8px"><div class="vlab">${L('ans', en)}</div>${p.dp
          ? `<div style="display:grid;grid-template-columns:repeat(${p.n - p.dp}, 96px) 22px repeat(${p.dp}, 96px);gap:8px">${cells(p.n - p.dp)}<div class="vdotc"></div>${cells(p.dp)}</div>`
          : `<div style="display:grid;grid-template-columns:repeat(${p.n}, 96px);gap:8px">${cells(p.n)}</div>`}</div></div></div>`;
    }
    if (p.kind === 'vert') {
      const n = Math.max(String(p.a).length, String(p.b).length) + (p.op === '+' ? 1 : 0), col = `80px repeat(${n}, 104px)`;
      return `<div class="vcard"><div class="vrow" style="grid-template-columns:${col}"><div class="vlab">${L(p.op === '+' ? 'carry1' : 'borrow', en)}</div>${minis(n)}</div>
        <div class="vrow vdig" style="grid-template-columns:${col}"><div></div>${digs(p.a, n)}</div>
        <div class="vrow vdig vline" style="grid-template-columns:${col}"><div>${p.op === '-' ? '−' : '+'}</div>${digs(p.b, n)}</div>
        <div class="vrow" style="grid-template-columns:${col};padding-top:10px"><div class="vlab">${L('ans', en)}</div>${cells(n)}</div></div>`;
    }
    if (p.kind === 'mul') {
      const two = String(p.b).length > 1, n = String(p.a).length + String(p.b).length, col = `80px repeat(${n}, 96px)`;
      const strip = (lab, cls) => `<div class="vrow" style="grid-template-columns:${col}"><div class="vlab">${lab}</div><div class="vstrip ${cls || ''}" style="grid-column:2/-1"><canvas></canvas></div></div>`;
      return `<div class="vcard"><div class="vrow vdig" style="grid-template-columns:${col};font-size:64px;line-height:76px"><div></div>${digs(p.a, n)}</div>
        <div class="vrow vdig vline" style="grid-template-columns:${col};font-size:64px;line-height:76px"><div>×</div>${digs(p.b, n)}</div>
        ${strip(L('carry1', en), 'sm')}${two ? strip(L('draft', en)) + strip(L('carry1', en), 'sm') + `<div class="vline">${strip(L('draft', en))}</div>` : ''}
        <div class="vrow" style="grid-template-columns:${col};padding-top:8px"><div class="vlab">${L('ans', en)}</div>${cells(n)}</div></div>`;
    }
    const n = String(p.a).length, col = `auto 18px repeat(${n}, 96px)`;
    return `<div class="vcard"><div class="vrow" style="grid-template-columns:${col}"><div class="vlab">${L('quo', en)}</div><div></div>${cells(n)}</div>
      <div class="vrow vdig" style="grid-template-columns:${col};font-size:66px;line-height:92px"><div style="min-width:80px;text-align:right;padding-right:6px">${p.b}</div><div style="border-left:5px solid #2b2920;border-top:5px solid #2b2920;border-top-left-radius:16px;height:92px"></div>${String(p.a).split('').map(d => `<div style="border-top:5px solid #2b2920">${d}</div>`).join('')}</div>
      <div class="vrow" style="grid-template-columns:${col}"><div class="vlab">${L('draft', en)}</div><div></div><div class="vstrip" style="grid-column:3/-1;height:${Math.min(300, 58 * (2 * n))}px;background-image:repeating-linear-gradient(90deg,transparent 0 101px,#e3dccb 101px 102px),repeating-linear-gradient(transparent 0 57px,#e3dccb 57px 58px);background-position:-3px 0"><canvas></canvas></div></div></div>`;
  }

  // ---------- 判：答案格去掉前面的空格；中间空着、一格两个数、最高位写 0 都算错 ----------
  // read：每格认出来的 '' | '0'–'9' | '两12'（一格写了两个数，后面是认出的字）| '?'（认不出）
  // 个位要写在最右边那格：写对了数字但整体往左挪了，提示「个位写在最右边的格子里」
  function judge(read, p, en) {
    if (read.includes('?')) return {retry: true};
    const f = read.findIndex(x => x !== '');
    if (f < 0) return {empty: true};
    let l = read.length - 1; while (read[l] === '') l--;
    const body = read.slice(f, l + 1), text = body.map(x => (x === '' ? '□' : x.charAt(0) === '两' ? x.slice(1) || '?' : x)).join('');
    // 竖式的答案格对着数位，个位必须在最右；递等式 / 填空 / 应用题的蓝框只是一排格子，靠左写也算（捣蛋鬼第 1 轮 P1）
    // 带固定小数点的蓝框（小数题）也按格对齐：小数部分要写到最右格，整数部分靠着小数点
    const columns = p.kind === 'vert' || p.kind === 'mul' || p.kind === 'div' || p.dp > 0;
    const tip = body.some(x => x.charAt(0) === '两') ? L('two', en) : body.includes('') ? L('gap', en) : body.length > 1 && body[0] === '0' ? L('zero', en) : columns && l < read.length - 1 ? L(p.dp > 0 ? 'dpPlace' : 'place', en) : '';
    return {ok: !tip && body.every(x => /^\d$/.test(x)) && text === String(p.ans), text, tip};
  }

  const api = {IDS, BOARD, TAP_MS, parse, demoKey, DEMO, build, plan, worked, layout, judge, LAB, stepLines};
  if (!root) return api;

  // ================= 浏览器部分 =================
  const doc = root.document;
  const en = () => !!(root.I18N && root.I18N.on);
  const CSS = `
.vq{position:relative;flex:1;min-height:0;display:flex;gap:16px;color:#f3f1ea}
.vq .varea{flex:1;position:relative;min-width:0;overflow:hidden;background:#24262b;border:2px solid #000}
.vq .vfit{position:absolute;left:0;top:0;transform-origin:0 0}
.vq .vside{width:150px;flex:none;display:flex;flex-direction:column;gap:12px}
.vq .vside .big{width:100%;min-width:0}
.vq .vside .vdone{min-height:88px;font-size:22px}
.vq .vnote{min-height:22px;font-size:15px;color:#f0b46c;text-align:center;line-height:1.3}
.vcard{background:#f7f4ec;border:3px solid #000;border-radius:12px;color:#2b2920;padding:18px 34px;display:flex;flex-direction:column;gap:6px;font-family:'PingFang SC',system-ui,sans-serif}
.vrow{display:grid;gap:10px;align-items:center;text-align:center}
.vlab{font-size:17px;color:#6b6555;font-weight:700;text-align:left;line-height:1.2}
.vdig{font-size:72px;font-weight:800;line-height:96px}
.vline{border-bottom:5px solid #2b2920;padding-bottom:8px}
.vq canvas{display:block;width:100%;height:100%;touch-action:none}
.vcell{position:relative;height:116px;border:3px solid #2f6db5;border-radius:10px;background:#fff}
.vcell.ok{border-color:#3f9a52;background:#eef7ef}.vcell.bad{border-color:#c4472f;background:#fbeeea}
.vmini{height:60px;border:2px dashed #c9c1ac;border-radius:8px}
.vstrip{height:84px;border:2px dashed #c9c1ac;border-radius:8px;background-image:repeating-linear-gradient(90deg,transparent 0 105px,#e3dccb 105px 106px);background-position:-5px 0}
.vstrip.sm{height:56px}
.vboard{width:1000px;display:flex;flex-direction:column;gap:14px}
.vboard .vbq{font-size:30px;line-height:1.4;color:#f3f1ea;zoom:1.25}
.vboard.vb-word .vbq{zoom:1.75}.vboard.vb-word .vgrid{height:220px}
.vboard:has(.fig2w) .vbq .nbsay{font-size:25px}.vboard:has(.fig2w) .vbq .spk{transform:scale(1.3)}.vboard:has(.fig2w) .fig2w{text-align:center}.vboard:has(.fig2w) .fig2{max-height:270px;width:auto;max-width:100%}.vboard:has(.fig2w) .vgrid{height:130px}.vboard:has(.fig2w) .vbq .eq{text-align:center;justify-content:center}.vboard.vb-fill .vbq .nbsay{font-size:25px;justify-content:center}.vboard.vb-fill .vbq .eq{justify-content:center}   /* .eq 是 flex，居中要 justify-content； 看图题（题面有图）：图限高、题干和应用题一样大、草稿区矮一点，整块不再缩到答案格 < 60 点（A 方案，中控 11-09） */
.vboard .vcard{padding:14px 24px}.vdotc{align-self:end;justify-self:center;width:16px;height:16px;border-radius:50%;background:#2b2920;margin-bottom:14px}.vboard .vlab{font-size:22px}
.vboard .vgrid{height:250px;background-color:#fbf9f3;background-image:linear-gradient(#e3dccb 1px,transparent 1px),linear-gradient(90deg,#e3dccb 1px,transparent 1px);background-size:64px 64px;border:2px solid #ddd6c5}
.vboard .veq{display:flex;align-items:center;gap:14px;height:84px}.vboard .veq b{font-size:52px;width:66px;text-align:center}.vboard .veq .vplain{flex:1;height:76px;background-image:none;border-style:solid;border-width:0 0 2px;border-radius:0}
.vls{font-family:'Chalkboard SE','Comic Sans MS',cursive;font-size:30px;line-height:48px}.vls .vfillv{color:#2f6db5;border:2px solid #2f6db5;border-radius:6px;background:#fff;padding:0 6px;font-weight:400}
.vq .vres{position:absolute;right:0;top:0;bottom:0;width:55%;background:#1b1d22;border-left:3px solid #000;padding:14px 18px;display:flex;flex-direction:column;gap:10px;transform:translateX(105%);transition:transform .25s}
.vq .vres.show{transform:none}
.vq.vres-on .vboard .vbq,.vq.vres-on .vboard .vrow:has(.vgrid){display:none}.vq.vres-on .vboard:not(.vb-step){width:max-content;min-width:520px}.vq.vres-on.vres-wide .vres{width:42%}   /* 递等式的行是孩子写在画布上的，不能压窄（字会变形）：改为讲解栏让出 10% */   /* 写错后：蓝框题左边只留孩子写的（递等式的行、答案格），题面和草稿收起，放大看得清（E 核对第 2 条、台账第 16 条） */
.vq .vres .explain{color:#e6e3da}
#qplay #qWide .vq .vres .explain{display:flex;flex-direction:column;gap:8px;align-items:stretch}   /* 宽版讲解的两栏规则（index.html #qplay.wide #qWide .explain）不用在讲解栏里：看图题的图会被挤进 0 宽的一栏 */
.vq .vres .vresc{flex:1;min-height:0;overflow-y:auto}.vq .vres .vresi{display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.vq .vres .vresh{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.vq .vres .vfoot{flex:none;display:flex;align-items:center;gap:12px}
.vq .vres .vfoot #qNext{flex:1}.vq .vres .vfoot .qnote{flex:1;font-size:14px}
.vwk{background:#f7f4ec;color:#2b2920;border-radius:10px;padding:12px 18px;align-self:flex-start}
.vwk h4{margin:0 0 6px;font-size:15px;color:#8b8676}
.vg{display:grid;gap:3px 0;font-family:'Chalkboard SE','Comic Sans MS',cursive;font-size:30px;line-height:42px;text-align:center;align-items:center}
.vg>div{min-height:42px;display:flex;align-items:center;justify-content:center}
.vg>.vs{min-height:20px;font-size:16px;line-height:20px;color:#b4512e;font-weight:700}
.vg .vu{border-bottom:3px solid #2b2920;align-self:stretch}
.vg .vqa{color:#2f6db5;border:2px solid #2f6db5;border-radius:6px;background:#fff;margin:0 3px}
.vg .vbr{border-left:3px solid #2b2920;border-top:3px solid #2b2920;border-top-left-radius:10px}
.vg .vt{border-top:3px solid #2b2920}
.vg .vhi{background:#ffe08a;border-radius:6px}
.vhid{visibility:hidden}
.vq .vdemo{position:absolute;inset:0;z-index:5;background:#1b1d22;display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px}
.vq .vdemo h2{margin:0;font-size:26px;flex:none}
.vq .vdemo .vdb{flex:1;min-height:0;align-self:stretch;position:relative}
.vq .vdemo .vdb .vwk{position:absolute;left:0;top:0;transform-origin:0 0}
.vq .vdemo .vbtns{flex:none}
.vq .vdemo .vtip{flex:none;min-height:72px;max-width:760px;font-size:24px;font-weight:700;color:#ffe08a;text-align:center;line-height:1.5}
.vq .vdemo .vbtns{display:flex;gap:14px}.vq .vdemo .vbtns .big{min-width:180px}`;
  function style() { if (doc.getElementById('vertCss')) return; const s = doc.createElement('style'); s.id = 'vertCss'; s.textContent = CSS; doc.head.appendChild(s); }

  // 写字板（只认第一根手指；版面缩放后按实际大小换算坐标）
  function Pad(cv, width, can, onDown) {
    const ctx = cv.getContext('2d'); let strokes = [], cur = null, active = null;
    const fit = () => { const dpr = root.devicePixelRatio || 1; cv.width = Math.round(cv.offsetWidth * dpr); cv.height = Math.round(cv.offsetHeight * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); redraw(); };
    const pt = e => { const r = cv.getBoundingClientRect(), k = cv.offsetWidth / (r.width || 1); return {x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, t: root.performance.now()}; };
    function redraw() {
      ctx.clearRect(0, 0, cv.offsetWidth, cv.offsetHeight); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = width; ctx.lineCap = ctx.lineJoin = 'round';
      strokes.forEach(s => { ctx.beginPath(); s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y); ctx.stroke(); });
    }
    cv.addEventListener('pointerdown', e => { e.preventDefault(); if (!can() || active !== null) return; active = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) {} cur = [pt(e)]; strokes.push(cur); onDown && onDown(); redraw(); });
    cv.addEventListener('pointermove', e => { if (!cur || e.pointerId !== active) return; e.preventDefault(); const l = e.getCoalescedEvents ? e.getCoalescedEvents() : []; (l.length ? l : [e]).forEach(v => cur.push(pt(v))); redraw(); });
    const end = e => { if (e.pointerId !== active) return; active = null; cur = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    fit();
    return {strokes: () => strokes, clear() { strokes = []; redraw(); }, undo() { strokes.pop(); redraw(); }, fit};
  }

  // 装一道题：o = {can() 能不能写, onDone, onDunno, onDown}
  function mount(host, p, o) {
    style();
    const E = en();
    host.innerHTML = `<div class="vq"><div class="varea"><div class="vfit">${layout(p, E)}</div><div class="vres"></div></div>
      <div class="vside"><button class="btn vdemoB"${DEMO[demoKey(p)] ? '' : ' style="visibility:hidden"'}>${L('demo', E)}</button><div style="flex:1"></div><div class="vnote"></div>
      <button class="big go vdone">${L('done', E)}</button><button class="big vclear">${L('clear', E)}</button><button class="big vdunno">${L('dunno', E)}</button></div></div>`;
    const box = host.querySelector('.vq'), area = box.querySelector('.varea'), fitEl = box.querySelector('.vfit'), note = box.querySelector('.vnote');
    // 答错后右边滑出讲解栏：孩子自己写的竖式缩到左边留着，好对照（捣蛋鬼第 1 轮第 16 条）
    const resEl = () => box.querySelector('.vres.show');
    const fitNow = () => {
      fitEl.style.transform = '';
      const rv = resEl(), w = area.clientWidth - (rv ? rv.offsetWidth : 0);
      const k = Math.min(1.15, (w - 16) / fitEl.offsetWidth, (area.clientHeight - 16) / fitEl.offsetHeight);
      fitEl.style.transform = `translate(${Math.max(0, (w - fitEl.offsetWidth * k) / 2)}px,${Math.max(0, (area.clientHeight - fitEl.offsetHeight * k) / 2)}px) scale(${k})`;
      fitRes();
    };
    // 讲解栏放不下（iPad App 932×651）：整体按比例缩小，不用滑（捣蛋鬼第 1 轮第 7 条）；缩到 0.6 还放不下才允许滑
    const fitRes = () => {
      const rv = resEl(), c = rv && rv.querySelector('.vresc'), i = c && c.querySelector('.vresi'); if (!i) return;
      i.style.zoom = ''; const k = Math.min(1, c.clientHeight / i.offsetHeight, c.clientWidth / i.scrollWidth);
      if (k < 1) i.style.zoom = String(Math.max(0.6, Math.floor(k * 100) / 100));
    };
    if (root.I18N && root.I18N.flush) root.I18N.flush();   // 英文日先翻好再量尺寸（英文题面更长）
    fitNow();
    const cellEls = [...box.querySelectorAll('.vcell')];
    const say = t => { note.textContent = t || ''; };
    const hist = [];   // 按写的先后记哪块板落了笔，「擦一笔」撤最后一笔
    const pads = cellEls.map(c => { const pd = Pad(c.querySelector('canvas'), 8, o.can, () => { hist.push(pd); say(''); c.classList.remove('bad'); }); return pd; });
    const scratch = [...box.querySelectorAll('.vstrip canvas, .vmini canvas')].map(cv => { const pd = Pad(cv, cv.closest('.vmini') ? 4 : 5, o.can, () => hist.push(pd)); return pd; });
    box.querySelector('.vdone').onclick = () => o.onDone();
    box.querySelector('.vdunno').onclick = () => o.onDunno();
    box.querySelector('.vclear').onclick = () => { if (!o.can()) return; const pd = hist.pop(); if (pd) pd.undo(); say(''); };
    box.querySelector('.vdemoB').onclick = () => o.onDemo();
    const onR = () => { fitNow(); pads.concat(scratch).forEach(x => x.fit()); };
    root.addEventListener('resize', onR);
    // 答对后上面多出「秒答」一行、框变矮：跟着重新缩放，不让卡片钻出屏幕
    const ro = root.ResizeObserver ? new root.ResizeObserver(() => fitNow()) : null; if (ro) { ro.observe(area); ro.observe(fitEl); }
    return {
      box, note: say,
      cells: () => pads.map(x => x.strokes().filter(s => { const xs = s.map(q => q.x), ys = s.map(q => q.y); return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) >= 12; })),
      touched: () => pads.concat(scratch).some(x => x.strokes().length),
      clearCells: which => which.forEach((w, k) => { if (w) { pads[k].clear(); cellEls[k].classList.add('bad'); } }),
      mark: ok => cellEls.forEach(c => { c.classList.remove('bad', 'ok'); c.classList.add(ok ? 'ok' : 'bad'); }),
      done() { box.querySelector('.vside').style.visibility = 'hidden'; },
      // 答错 / 不会：右边滑出正确写法和讲解；foot 放「继续」
      result(top, explainHtml, onStep) {
        const r = box.querySelector('.vres'), E2 = en();
        const can = plan(p).steps.length > 0;
        r.innerHTML = `<div class="vresc"><div class="vresi"><div class="vresh">${top}${can ? `<button class="btn vstep">${L('step', E2)}</button>` : ''}</div>${worked(p, E2)}${explainHtml || ''}</div></div><div class="vfoot"></div>`;
        if (can) r.querySelector('.vstep').onclick = onStep;
        box.querySelector('.vside').style.display = 'none'; box.classList.add('vres-on'); if (p.kind === 'step') box.classList.add('vres-wide');   // 答完右边按钮用不上了，让出地方给讲解栏和孩子的竖式
        r.classList.add('show'); if (root.I18N && root.I18N.flush) root.I18N.flush(); fitNow();   // 英文日先翻好再量
        return r.querySelector('.vfoot');
      },
      refit() { if (root.I18N && root.I18N.flush) root.I18N.flush(); fitNow(); },
      destroy() { root.removeEventListener('resize', onR); if (ro) ro.disconnect(); clearTimeout(demoT); },
    };
  }

  // 示范：先摆整道题，再一步一步写（2.8 秒一步），正在用的数涂黄。p = 这道题本身（答错后「一步一步看」）或示范题
  let demoT = null;   // 同一时间只有一个示范在放
  function demo(host, d, onClose) {
    style();
    const E = en();
    const wrap = doc.createElement('div'); wrap.className = 'vdemo';
    wrap.innerHTML = `<h2>${d.title || L('demoH', E)}</h2><div class="vdb"></div><div class="vtip"></div>
      <div class="vbtns"><button class="big vagain" hidden>${L('again', E)}</button><button class="big go vgo">${d.title ? L('go', E).split(/，|, /)[0] : L('go', E)}</button></div>`;
    (host.querySelector('.vq') || host).appendChild(wrap);
    const tip = wrap.querySelector('.vtip'), again = wrap.querySelector('.vagain');
    let lastB = null;
    const start = () => { lastB = plan(d.p); runB(); };
    function runB() {
      clearTimeout(demoT);
      const db = wrap.querySelector('.vdb');
      db.innerHTML = `<div class="vwk">${d.title ? '' : `<h4>${L('ex', E)}</h4>`}${lastB.html}</div>`;
      const wk = db.firstChild, z = Math.min(1.6, db.clientWidth / wk.offsetWidth, db.clientHeight / wk.offsetHeight);
      wk.style.transform = `translate(${Math.max(0, (db.clientWidth - wk.offsetWidth * z) / 2)}px,${Math.max(0, (db.clientHeight - wk.offsetHeight * z) / 2)}px) scale(${z})`;
      tip.textContent = L('first', E); again.hidden = true;
      let k = 0;
      const step = () => {
        wrap.querySelectorAll('.vhi').forEach(e => e.classList.remove('vhi'));
        if (k >= lastB.steps.length) { if (d.tip) tip.textContent = d.tip[E ? 1 : 0]; again.hidden = false; return; }
        const s = lastB.steps[k++];
        s.show.forEach(id => { const e = doc.getElementById(id); if (e) e.classList.remove('vhid'); });
        (s.hi || []).forEach(id => { const e = doc.getElementById(id); if (e) e.classList.add('vhi'); });
        tip.textContent = E ? s.en : s.say;
        demoT = setTimeout(step, 2800);
      };
      demoT = setTimeout(step, 1500);
    }
    again.onclick = () => { lastB = plan(d.p); runB(); };
    wrap.querySelector('.vgo').onclick = () => { clearTimeout(demoT); wrap.remove(); onClose && onClose(); };
    start();
    return {close() { clearTimeout(demoT); wrap.remove(); }};
  }

  return Object.assign(api, {mount, demo});
});
