// 第三批 3a 趣味题（docs/说明书-第三批.md §四、§4.4 单元测试）：技能登记、级别、前置、秒答时间、题量；每道题的答案用另一种方法重算
const test = require('node:test'), assert = require('node:assert');
const K = require('../v2/skills.js'), R = require('../v2/render.js'), HB = require('../v2/hardbank.js'), NP = require('../tools/numpuzzles.js');
const FUN = K.FUN, POOL = id => HB.pools[id];
const EXPECT = {'garden:g4:pyr': 4, 'garden:g7:pyr2': 7, 'garden:g7:magic': 7, 'dock:g5:tree': 5, 'dock:g5:saw': 5, 'dock:g7:tree2': 7, 'dock:g9:tree3': 9, 'dock:g5:order': 5, 'dock:g7:riddle': 7, 'dock:g9:riddle2': 9, 'dock:g7:cipher': 7};
const nums = s => (String(s).match(/\d+/g) || []).map(Number);
const all = (id, f) => POOL(id).forEach((x, i) => f(x, i));

test('11 个趣味题型：fun、late、读题题类、组、级别 = 编号里的 gN；前置存在且级别不高于本题', () => {
  assert.deepEqual(FUN.flatMap(s => s.items.map(it => it.id)).sort(), Object.keys(EXPECT).sort());
  const groups = R.GROUPS.map(g => g.id);
  FUN.forEach(s => {
    assert.ok(s.late && s.fastClass === 'word' && groups.includes(s.group), s.id);
    const id = s.items[0].id; assert.deepEqual(K.itemLevels(id), [EXPECT[id]], id);
    assert.ok(s.pre.length, s.id);
    s.pre.forEach(p => { const b = K.BY[p]; assert.ok(b, `${s.id} 前置 ${p} 不存在`); const lv = Math.min(...b.items.flatMap(it => K.itemLevels(it.id))); assert.ok(lv <= EXPECT[id], `${s.id} 前置 ${p} 在第 ${lv} 级`); });
    assert.ok(K.TOPIC[s.id] && (K.FUN_SEC > 0 ? K.LEVELS[EXPECT[id] - 1].topics.includes(K.TOPIC[s.id]) : true), `${s.id} 内容词`);   // 关掉趣味题时级别说明不写趣味内容词（B 的保险）
    assert.ok(K.mistCat(s.id), `${s.id} 错题类别`);
  });
});

test('每题有朗读文字；整题秒答时间中文 8–25 秒、英文 ≤ 38 秒', () => {
  FUN.forEach(s => { const id = s.items[0].id; all(id, x => {
    assert.ok(x.q.say, id);
    const inst = {id, q: x.q, ans: x.ans}, zh = K.fastMs(inst, {speed: 800}) / 1000, en = K.fastMs(inst, {speed: 800, en: true}) / 1000;
    assert.ok(zh >= 8 && zh <= 25 && en <= 38, `${id} ${zh} ${en} ${x.q.say}`);
  }); });
});

test('每个题型 ≥ 150 道不重样（题面文字不同）；讲解里有答案；不出「所有数都 ≤ 5」的题（选择题不适用）', () => {
  FUN.forEach(s => { const id = s.items[0].id, p = POOL(id);
    assert.ok(p.length >= 150, `${id} ${p.length}`);
    const key = x => x.q.say + '|' + x.q.text + '|' + JSON.stringify(x.q.data || '');
    assert.equal(new Set(p.map(key)).size, p.length, id);
    p.forEach(x => {
      const a = x.q.view === 'choice' ? x.q.opts[x.ans] : String(x.ans); assert.ok(x.q.why.includes(a), `${id} ${x.q.why}`);
      if (x.q.view !== 'choice') { assert.ok(Number.isInteger(x.ans) && x.ans > 0, `${id} ${x.ans}`); assert.ok(nums(x.q.say + ' ' + x.q.text + ' ' + JSON.stringify(x.q.data || '')).concat(x.ans).some(n => n > 5), `${id} ${x.q.say}`); }
    });
  });
});

test('数塔：只空一格，逐步推出唯一；每格 = 下面两格的和；答案 = 推出来的那格', () => {
  ['garden:g4:pyr', 'garden:g7:pyr2'].forEach(id => all(id, x => {
    const g = x.q.data.g, holes = g.flat().filter(v => v === null).length; assert.equal(holes, 1);
    const s = NP.solvePyramid(g); assert.ok(s, JSON.stringify(g));
    s.grid.forEach((row, i) => row.forEach((v, j) => { if (i < 2) assert.equal(v, s.grid[i + 1][j] + s.grid[i + 1][j + 1]); }));
    const [i, j] = g.flatMap((row, i) => row.map((v, j) => [i, j, v])).find(c => c[2] === null); assert.equal(x.ans, s.grid[i][j]);
    assert.ok(s.grid[0][0] <= (id === 'garden:g4:pyr' ? 20 : 100));
  }));
});

test('幻方：题面写的和 = 8 条线的和；只空一格；9 个数 1–20、不重复、不成等差数列；答案 = 和 − 同一条线上另两个数', () => {
  all('garden:g7:magic', x => {
    const g = x.q.data.g, sum = x.q.data.sum, hole = g.indexOf(null); assert.equal(g.filter(v => v === null).length, 1);
    assert.ok(x.q.say.includes(String(sum)));
    const f = g.slice(); f[hole] = x.ans;
    NP.LINES.forEach(l => assert.equal(l.reduce((a, i) => a + f[i], 0), sum, JSON.stringify(f)));
    assert.equal(new Set(f).size, 9); assert.ok(f.every(v => v >= 1 && v <= 20));
    const s = f.slice().sort((a, b) => a - b), d = s[1] - s[0]; assert.ok(!s.every((v, i) => !i || v - s[i - 1] === d), `等差 ${s}`);
    const l = NP.LINES.find(l => l.includes(hole)); assert.equal(x.ans, sum - l.filter(i => i !== hole).reduce((a, i) => a + g[i], 0));
  });
});

// 植树另一种算法：不用生成器的「段 ± 1」，按题面的字把路画出来——路分成 S 段，分点 0..S，按题面说的种法在哪些分点种，数一数
function plant(say, S) {
  if (/两头都(种|装|插|摆)/.test(say) && !/两头都不/.test(say)) return {trees: S + 1, between: S};   // 两头都种：每个分点都种；树和树之间的段 = 路的段
  const pts = []; for (let k = 0; k <= S; k++) { const edge = k === 0 || k === S; if (!edge || (/一头也/.test(say) && k === 0)) pts.push(k); }
  return {trees: pts.length, between: pts.length - 1};
}
test('植树：按题面的字把树一棵棵放到路上再数，答案对得上；倒着问的只有一个段数符合；种法词和图一致', () => {
  ['dock:g5:tree', 'dock:g7:tree2'].forEach(id => all(id, x => {
    const say = x.q.say, n = nums(say)[0];
    if (/之间有 \d+ 段/.test(say)) { const S = n; assert.equal(plant(say, S).trees, x.ans, say); }   // 两头都种，给的是树和树之间的段数
    else if (/分成一样长的 \d+ 段/.test(say)) assert.equal(plant(say, n).trees, x.ans, say);
    else { const ok = []; for (let S = 1; S <= 60; S++) if (plant(say, S).trees === n) ok.push(/之间有几段/.test(say) ? plant(say, S).between : S); assert.deepEqual(ok, [x.ans], say); }
    if (/两头都不/.test(say)) assert.equal(x.q.data.kind, 'none', say); else if (/一头也/.test(say)) assert.equal(x.q.data.kind, 'one', say); else assert.equal(x.q.data.kind, 'both', say);
    if (id === 'dock:g5:tree') assert.equal(x.q.data.kind, 'both');
    if (x.q.data.kind !== 'both') assert.ok(!/(树|路灯|旗子|花盆)和\1之间/.test(say), `只种一头 / 两头不种不许问「树和树之间」：${say}`);
    assert.ok(n <= 30, say);
  }));
});

test('锯木头：锯 k 次是 k + 1 段（逐次加一段数出来）；先算段数：路长 ÷ 间隔，再按种法数树；数字组合 ≥ 50 种', () => {
  all('dock:g5:saw', x => { const n = nums(x.q.say)[0], pieces = k => { let p = 1; for (let i = 0; i < k; i++) p++; return p; };
    if (/成几段/.test(x.q.say)) assert.equal(x.ans, pieces(n), x.q.say); else { const ok = []; for (let k = 1; k <= 40; k++) if (pieces(k) === n) ok.push(k); assert.deepEqual(ok, [x.ans], x.q.say); } });
  const combos = new Set();
  all('dock:g9:tree3', x => {
    const [L, dd] = nums(x.q.say), S = L / dd; assert.ok(Number.isInteger(S) && dd >= 2 && dd <= 9 && S >= 2 && S <= 9, x.q.say);
    const say = x.q.say;
    assert.equal(x.ans, plant(say, S).trees, x.q.say); combos.add(`${L}-${dd}-${x.q.data.kind}`);
  });
  assert.ok(combos.size >= 50, `组合 ${combos.size}`);
});

test('谁最高：枚举 3 个人的 6 种排法，只有 1 种符合两句话；答案是最高 / 最低那个；答案是第一个出现的人名约占 1/3；正确项位置大致均匀', () => {
  const POS = {高: 1, 重: 1, 跑得快: 1, 年纪大: 1, 矮: -1, 轻: -1, 跑得慢: -1, 年纪小: -1};
  let first = 0, n = 0; const at = [0, 0, 0];
  all('dock:g5:order', x => {
    const m = /^(.+?)比(.+?)(高|矮|重|轻|跑得快|跑得慢|年纪大|年纪小)，(.+?)比(.+?)(高|矮|重|轻|跑得快|跑得慢|年纪大|年纪小)。(.+)$/.exec(x.q.say); assert.ok(m, x.q.say);
    const names = x.q.opts; assert.equal(new Set(names).size, 3);
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(p => p.map(i => names[i]));   // 排法：从「大」到「小」
    const rank = (p, who) => -p.indexOf(who), ok = p => [[m[1], m[2], m[3]], [m[4], m[5], m[6]]].every(([a, b, c]) => (rank(p, a) - rank(p, b)) * POS[c] > 0);
    const good = perms.filter(ok); assert.equal(good.length, 1, x.q.say);
    const top = /最高|最重|最快|最大/.test(m[7]); assert.equal(names[x.ans], top ? good[0][0] : good[0][2], x.q.say);
    if (names[x.ans] === m[1]) first++; n++; at[x.ans]++;
  });
  assert.ok(first / n >= .25 && first / n <= .42, `第一个人名 ${first}/${n}`);
  at.forEach(c => assert.ok(c / n >= .2 && c / n <= .47, `位置 ${at}`));
});

test('猜数：答案正着代回去等于题里的结果', () => {
  const OP = {加上: (a, b) => a + b, 减去: (a, b) => a - b, 乘: (a, b) => a * b, 除以: (a, b) => a / b};
  ['dock:g7:riddle', 'dock:g9:riddle2'].forEach(id => all(id, x => {
    const m = /^一个数(加上|减去|乘|除以) (\d+)，再(加上|减去) (\d+)，得 (\d+)。/.exec(x.q.say); assert.ok(m, x.q.say);
    const y = OP[m[1]](x.ans, +m[2]); assert.ok(Number.isInteger(y) && y > 0, x.q.say);
    assert.equal(OP[m[3]](y, +m[4]), +m[5], x.q.say);
    if (id === 'dock:g9:riddle2') assert.ok(['乘', '除以'].includes(m[1])); else assert.ok(['加上', '减去'].includes(m[1]));
  }));
});

test('算式谜：代 0–9 只有答案那个数字成立；十位不为 0；□ 只在前两个数里；要进位或退位', () => {
  all('dock:g7:cipher', x => {
    const [l, r] = x.q.text.split(' = '); assert.ok(!r.includes('□') && l.includes('□'), x.q.text);
    const ok = []; for (let d = 0; d <= 9; d++) { const [a, op, b] = l.replace('□', d).split(' '); if (/^0\d/.test(a) || /^0\d/.test(b)) continue; if ((op === '+' ? +a + +b : +a - +b) === +r) ok.push(d); }
    assert.deepEqual(ok, [x.ans], x.q.text);
    const [a, op, b] = l.replace('□', x.ans).split(' '); assert.ok(op === '+' ? (+a % 10) + (+b % 10) >= 10 : (+a % 10) < (+b % 10), x.q.text);
  });
});

test('讲解卡：植树、锯木头、植树三种种法、倒着算挂在对应技能上；每个题型都有示范卡', () => {
  const C = {'g34:g5:tree': 'tree', 'g34:g5:saw': 'saw', 'g34:g7:tree2': 'tree2', 'g34:g7:riddle': 'riddle'};
  Object.entries(C).forEach(([id, c]) => { assert.equal(K.BY[id].concept, c); assert.ok(R.CONCEPTS.includes(c)); });
  FUN.forEach(s => { const d = R.demo(s.id), x = HB.pools[s.items[0].id][0]; assert.ok(d.includes(x.q.say), `${s.id} 示范卡没有题目`); assert.ok(d.includes(String(x.q.view === 'choice' ? x.q.opts[x.ans] : x.ans)), `${s.id} 示范卡没有答案`); });
  ['dock:g5:tree', 'dock:g7:tree2', 'dock:g5:saw'].forEach(id => assert.ok(!/几段？$|几次？$|几刀？$/.test(HB.pools[id][0].q.say) || /成几段？$/.test(HB.pools[id][0].q.say), `${id} 示范用正着问的题`));
});
