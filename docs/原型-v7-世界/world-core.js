// 空空数学岛 · 方块世界规则（纯逻辑，无 DOM，不依赖 v2 代码）。原型和模拟共用这一份，落地时搬到 v2/worldcore.js。
// 说明书：docs/说明书-v7-方块世界.md。全部名称、生物原创，不用任何现成游戏的名称和素材。测试：world-core.test.js
// 浏览器里挂到 window.WORLDCORE，node 里 require。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WORLDCORE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const dayNum = d => Math.round(Date.parse(d + 'T00:00:00Z') / 86400000);
  const dayDiff = (a, b) => dayNum(b) - dayNum(a);

  // ---------- 真实擅长：每道题一条证明链 ----------
  // 第 0→1 步当天证明；1→2 隔 ≥ 1 天；2→3 再隔 ≥ 3 天（永久的条件）；3→4 再隔 ≥ 14 天（附魔）
  const GAPS = [0, 1, 3], ENCH_GAP = 14;
  const needOf = it => (it.pick ? 3 : it.gen ? 2 : 1);   // 当天前几次都对才算证明：固定题 1、题型 2（数字不同）、选择题 3（防蒙）
  const creditOf = it => (it.gen ? 3 : 1);               // 题型一格抵 3 道固定题
  const BACK_MAX = 4;                                    // 已下架的题，为地块最多再回来几次（硬上限）

  // ---------- 六个地带：和 15 级难度对应；新增级别往后加一行 ----------
  const BANDS = [
    {id: 'meadow', name: '青草原', levels: [1, 3], rings: [1, 3], boss: '苔藓石人', tool: 0},
    {id: 'pine', name: '松木林', levels: [4, 6], rings: [4, 4], boss: '树根巨人', tool: 1},
    {id: 'sand', name: '赤沙地', levels: [7, 9], rings: [5, 5], boss: '沙鳞蝎王', tool: 2},
    {id: 'frost', name: '白霜岭', levels: [10, 11], rings: [6, 6], boss: '霜角巨鹿', tool: 3},
    {id: 'lava', name: '熔岩谷', levels: [12, 13], rings: [7, 7], boss: '熔壳巨龟', tool: 3},
    {id: 'cloud', name: '云顶岛', levels: [14, 15], rings: [8, 8], boss: '雷云巨鲸', tool: 4},
  ];
  const ring = (x, y) => Math.max(Math.abs(x), Math.abs(y));
  const bandOfRing = r => BANDS.find(b => r >= b.rings[0] && r <= b.rings[1]) || BANDS[BANDS.length - 1];
  const BOSS_SHARE = 0.4, BOSS_N = 12, BOSS_PASS = 9, BOSS_HP = 24;    // 这一带 40% 的题到第 2 步可以挑战（达到一次就一直开放）；12 题对 9 题赢，或累计打中 24 下（血量不回）；一天一次；不扣任何东西；不算当天练习

  // ---------- 技能：八个地方各对应一项世界能力（这个地方的题 50% 到第 1 步点亮） ----------
  const SKILLS = [
    {id: 'look', name: '望远', place: '看数草原', does: '迷雾外能看出地块里有什么'},
    {id: 'bond', name: '下矿', place: '分合矿洞', does: '能挖地块里的矿脉'},
    {id: 'place', name: '盖房', place: '数位村庄', does: '能合成村民屋'},
    {id: 'cmp', name: '守塔', place: '比大小双塔', does: '能合成瞭望塔'},
    {id: 'line', name: '架桥', place: '数线铁轨', does: '能拓水面地块'},
    {id: 'garden', name: '种田', place: '规律花园', does: '能合成田地'},
    {id: 'market', name: '交易', place: '钟楼集市', does: '能合成集市摊'},
    {id: 'dock', name: '造船', place: '故事码头', does: '能拓远处的小岛'},
  ];

  // ---------- 工具：看累计材料解锁（need 不消耗），只消耗 cost。盖城堡花光钻石也不会锁死工具 ----------
  const TOOLS = [
    {id: 'pick0', name: '木镐', tier: 0, need: {}, cost: {wood: 3}},
    {id: 'pick00', name: '石镐', tier: 1, need: {}, cost: {ore: 30, wood: 2}},
    {id: 'pick1', name: '铁镐', tier: 2, need: {iron: 80}, cost: {wood: 5}},
    {id: 'pick2', name: '金镐', tier: 3, need: {gold: 150}, cost: {wood: 5}},
    {id: 'pick3', name: '钻石镐', tier: 4, need: {diamond: 200}, cost: {wood: 5}},
  ];
  // 建造方块：材料 → 一份（count 块）。skill = 要点亮对应技能才能合成
  const BLOCKS = [
    {id: 'plank', name: '木板', cost: {wood: 1}, count: 4},
    {id: 'stone', name: '石砖', cost: {ore: 2}, count: 4},
    {id: 'yellow', name: '黄墙砖', cost: {ore: 3}, count: 4},
    {id: 'purple', name: '紫墙砖', cost: {ore: 3}, count: 4},
    {id: 'glass', name: '玻璃', cost: {ore: 2, coal: 1}, count: 4},
    {id: 'torch', name: '火把', cost: {wood: 1, coal: 1}, count: 4},
    {id: 'water', name: '水', cost: {ore: 2}, count: 4},
    {id: 'lava', name: '岩浆', cost: {ore: 3, coal: 1}, count: 2},
    {id: 'bridge', name: '吊桥', cost: {wood: 2, iron: 1}, count: 2},
    {id: 'lever', name: '拉杆', cost: {wood: 1, iron: 1}, count: 1},
    {id: 'door', name: '门', cost: {wood: 2}, count: 1},
    {id: 'bed', name: '床', cost: {wood: 3, ore: 2}, count: 1},
    {id: 'chair', name: '椅子', cost: {wood: 2}, count: 2},
    {id: 'paint', name: '暗门画', cost: {wood: 2, gold: 1}, count: 1},
    {id: 'chest', name: '箱子', cost: {wood: 3}, count: 1},
    {id: 'trap', name: '陷阱', cost: {ore: 5, iron: 1}, count: 1},
    {id: 'ironb', name: '铁块', cost: {iron: 1}, count: 1},
    {id: 'goldb', name: '金块', cost: {gold: 1}, count: 1},
    {id: 'diamondb', name: '钻石块', cost: {diamond: 1}, count: 1, gem: true},
    {id: 'hut', name: '村民屋', cost: {wood: 4, ore: 4}, count: 1, skill: 'place'},
    {id: 'tower', name: '瞭望塔', cost: {ore: 8, wood: 2}, count: 1, skill: 'cmp'},
    {id: 'farm', name: '田地', cost: {wood: 1, ore: 1}, count: 4, skill: 'garden'},
    {id: 'stall', name: '集市摊', cost: {wood: 3, iron: 1}, count: 1, skill: 'market'},
  ];
  const TEMP_CAP = 5, TEMP_CAP_LOW = 3, TORCH = 5, TORCH_EASY = 7, WILD_MAX = 3, GUARD_SEC = 40, GUARD_MAX = 8, ENCH_MAX = 3, COAL_DAY = 5, AGE_MAX = 10, BOSS_GOLD = 6;
  const TUNE = {torch: TORCH};
  const flagRing = W => 1 + Math.max(0, ...Object.values(W.plots).filter(p => p.st !== 'wild').map(p => ring(p.x, p.y)));   // 旗价看地盘大小
  const flagCost = r => ({wood: 2, ore: Math.min(70, 15 + 5 * r)});   // 拓荒旗（1 旗 = 拓 1 块地）

  // ---------- 地图：坐标决定一切，固定不随机（走到哪里都有惊喜，但不是抽奖） ----------
  const hash = (x, y, k) => { let h = Math.imul(x * 73856093 ^ y * 19349663 ^ k * 83492791, 0x5bd1e995); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); return ((h ^ h >>> 15) >>> 0) / 4294967296; };
  function terrain(x, y) {
    if (!x && !y) return 'home';
    if (ring(x, y) <= 1) return 'land';   // 家门口一圈都是陆地
    const h = hash(x, y, 1);
    return h < 0.12 ? 'water' : h < 0.2 ? 'island' : 'land';
  }
  const TERRAIN_NEED = {water: 'line', island: 'dock'};
  function feature(x, y) {
    if (!x && !y) return null;
    const h = hash(x, y, 2), r = ring(x, y);
    if (h < 0.34) return {kind: 'tree', wood: 3 + Math.floor(hash(x, y, 3) * 4)};
    if (h < 0.62) return {kind: 'vein', tier: Math.min(4, Math.floor(r / 2)), ore: 6 + Math.floor(hash(x, y, 4) * 6)};
    if (h < 0.72) return {kind: 'chest', block: 'glass', n: 8};
    if (h < 0.80) return {kind: 'village'};
    if (h < 0.86) return {kind: 'ruin', block: 'stone', n: 12};
    return {kind: 'none'};
  }

  // ---------- 存档 S.world ----------
  // 世界不跨设备合并（说明书 §6.2），所以材料就是简单余额；累计量 total 由证明链算出
  function blank() {
    const W = {v: 3, proof: {}, evs: {}, bag: {ore: 0, wood: 6, coal: 0, flag: 1, iron: 0, gold: 0, diamond: 0}, blocks: {}, total: {iron: 0, gold: 0, diamond: 0},
      gemQ: [], built: {}, tools: {}, boss: {}, bossHp: {}, bossOpen: {}, bossDay: '', plots: {'0,0': {x: 0, y: 0, st: 'perm', bound: [], born: '', torch: 0, dug: 1}}, burned: '', log: [], settings: {expire: true}, migrated: ''};
    return W;
  }
  const MATERIAL = [null, 'iron', 'gold', 'diamond'];   // 第 1、2、3 步各发一次；第 4 步不发材料，只让地块附魔
  const bump = (W, k, n) => { if (k.startsWith('b:')) W.blocks[k.slice(2)] = (W.blocks[k.slice(2)] || 0) + n; else W.bag[k] = (W.bag[k] || 0) + n; };
  const gain = (W, k, n) => bump(W, k, n);
  const spendOne = (W, k, n) => bump(W, k, -n);
  const logPush = (W, e) => { W.log.push(e); if (W.log.length > 300) W.log.splice(0, W.log.length - 300); };
  const canPay = (W, cost) => Object.entries(cost).every(([k, v]) => (W.bag[k] || 0) >= v);
  const pay = (W, cost) => Object.entries(cost).forEach(([k, v]) => spendOne(W, k, v));
  const pkey = (x, y) => x + ',' + y;
  const proofOf = (W, id) => W.proof[id] || (W.proof[id] = {s: 0, top: 0, last: '', days: [], back: 0});
  const stepOf = (W, id) => (W.proof[id] ? W.proof[id].s : 0);
  const count = (W, st) => Object.values(W.plots).filter(p => p.st === st).length;
  function dayEv(W, day) {
    if (!W.evs[day]) { W.evs[day] = {}; Object.keys(W.evs).sort().filter(k => k !== day).slice(0, -2).forEach(k => delete W.evs[k]); }   // 最多留 3 天，当天不删
    return W.evs[day];
  }

  // 记一次作答。it = {id, gen, pick}；r = {ok, fast, needFast, peeked, retry}。返回 {advanced, step, events}
  function onAttempt(W, it, r, day) {
    const out = {advanced: false, step: stepOf(W, it.id), events: []};
    if (r.retry) return out;                               // 当场再来一次：不算
    const ev = dayEv(W, day), e = ev[it.id] || (ev[it.id] = {n: 0, p: 0, done: 0});
    if (e.done) return out;                                // 今天这道题已经判过了
    if (r.peeked) { e.done = 1; return out; }              // 今天看过答案：今天不再算
    e.n++;
    const p = proofOf(W, it.id);
    if (p.last && p.last > day) p.last = day;              // 记录里的日期在未来（改过系统日期）：夹回今天，间隔重新算，证明链不冻结
    const due = p.s === 0 || (p.last && dayDiff(p.last, day) >= (p.s >= GAPS.length ? ENCH_GAP : GAPS[p.s]));
    if (!r.ok) {                                           // 写错：第 3 步以前退一步，间隔从今天重新算；第 3 步以后不退
      e.done = 1; e.bad = 1;
      if (p.s === 3 && due && !p.chk) p.chk = {day, ok: 0};  // 复查第一次的结果，主指标用
      if (p.s > 0 && p.s < 3) p.s--;
      if (p.s > 0) p.last = day;
      out.step = p.s; return out;
    }
    if (r.needFast && !r.fast) { e.done = 1; e.slow = 1; return out; } // 对了但不够快：今天不进不退
    e.p++;
    if (e.p < needOf(it)) return out;
    e.done = 1; e.ok = 1;
    if (p.s > GAPS.length || !due) return out;
    if (p.s === 3 && !p.chk) p.chk = {day, ok: 1};
    p.s++; p.last = day; p.days.push(day); e.adv = 1;
    if (p.s <= GAPS.length && p.s > (p.top || 0)) {        // 每一步只发一次：退一步再升回来不重复发
      p.top = p.s; p.cr = creditOf(it); if (p.s === 3) p.d3 = day;
      const m = MATERIAL[p.s]; W.bag[m] += p.cr; W.total[m] += p.cr;
    }
    out.advanced = true; out.step = p.s;
    out.events = settlePlots(W, day);
    return out;
  }

  // 绑定的题全到第 3 步 → 永久（临时的、迷雾里的都一样，迷雾里的自动回来，不花东西）；全到第 4 步 → 附魔
  function settlePlots(W, day) {
    const ev = [];
    Object.values(W.plots).forEach(pl => {
      if ((pl.st === 'temp' || pl.st === 'wild') && pl.bound.length && pl.bound.every(id => stepOf(W, id) >= 3)) {
        ev.push({type: pl.st === 'wild' ? 'back' : 'perm', x: pl.x, y: pl.y});
        pl.st = 'perm'; pl.permDay = day; pl.torch = 0;
        logPush(W, {day, type: 'perm', x: pl.x, y: pl.y});
      }
      if (pl.st === 'perm' && !pl.ench && pl.bound.length && pl.bound.every(id => stepOf(W, id) >= 4)) {
        pl.ench = day; ev.push({type: 'ench', x: pl.x, y: pl.y});
        logPush(W, {day, type: 'ench', x: pl.x, y: pl.y});
      }
    });
    return ev;
  }

  // 练完一天（当天练满 5 分钟或题做完）调用一次。火把只在下面几种情况烧：
  // 绑定的题今天只有写错；地块超过 10 个练习日今天还没有前进。
  // 今天答对的（包括慢答、在等间隔的）不烧；题没轮到不烧；没来的日子不调用，一支都不烧。
  function endOfPractice(W, day) {
    if (W.burned && day <= W.burned) { W.burned = day; return []; }   // 同一天或日期往回调：今天不再烧、不再发木头；未来日期夹回今天，明天恢复，不冻结
    W.burned = day;
    const ev = [], today = W.evs[day] || {};
    let quota = WILD_MAX - recentWild(W, day);   // 保险：任意 14 天最多到期 3 块，额度用完这批地块不扣火把
    Object.values(W.plots).filter(pl => pl.st === 'temp' && pl.born !== day).sort((a, b) => a.torch - b.torch || (b.age || 0) - (a.age || 0)).forEach(pl => {
      if (W.settings.expire === false) return;   // 到期开关关着：不烧，也不计龄
      pl.age = (pl.age || 0) + 1;
      const es = pl.bound.map(id => today[id]).filter(Boolean);
      if (es.some(e => e.adv)) return;
      let burn = pl.age > AGE_MAX;
      if (!burn) {
        if (es.some(e => e.ok || e.slow)) return;
        if (es.some(e => e.bad)) burn = true;
      }
      if (!burn) return;
      if (pl.torch <= 1) { if (quota <= 0) return; quota--; }
      pl.torch--;
      if (pl.torch <= 0) { pl.st = 'wild'; pl.wildDay = day; ev.push({type: 'wild', x: pl.x, y: pl.y}); logPush(W, {day, type: 'wild', x: pl.x, y: pl.y}); }
    });
    gain(W, 'wood', dailyWood(W));
    return ev;
  }
  function dailyWood(W) { return Math.min(8, 2 + Math.floor((count(W, 'perm') - 1) / 8)); }   // 每个练习日 2 根，每 8 块永久地块多 1 根，上限 8

  function toolTier(W) { let t = -1; TOOLS.forEach(x => { if (W.tools[x.id]) t = Math.max(t, x.tier); }); return t; }
  const toolReady = (W, t) => !W.tools[t.id] && toolTier(W) >= t.tier - 1 && Object.entries(t.need).every(([k, v]) => (W.total[k] || 0) >= v) && canPay(W, t.cost);
  function craftTool(W, id, day) {
    const t = TOOLS.find(x => x.id === id);
    if (!t || !toolReady(W, t)) return false;
    pay(W, t.cost); W.tools[id] = day; logPush(W, {day, type: 'tool', id}); return true;
  }
  // 钻石的来源：第 3 步以上的题（题型一道给 3 颗）减去已经变成钻石块的
  function gemPool(W) {
    const used = {}; W.gemQ.forEach(id => { if (id) used[id] = (used[id] || 0) + 1; });
    Object.values(W.built).forEach(m => Object.values(m).forEach(v => { if (v.from) used[v.from] = (used[v.from] || 0) + 1; }));
    const out = [];
    Object.entries(W.proof).forEach(([id, p]) => { if ((p.top || 0) >= 3) for (let i = (used[id] || 0); i < (p.cr || 1); i++) out.push(id); });
    return out;
  }
  function craftBlock(W, id, lit) {
    const b = BLOCKS.find(x => x.id === id);
    if (!b || !canPay(W, b.cost) || (b.skill && lit && !lit[b.skill])) return false;
    if (b.gem) { const pool = gemPool(W); W.gemQ.push(pool.length ? pool[0] : null); }
    pay(W, b.cost); gain(W, 'b:' + id, b.count);
    return true;
  }
  function craftFlag(W, r) { const c = flagCost(r); if (!canPay(W, c)) return false; pay(W, c); gain(W, 'flag', 1); return true; }
  // 放方块、拆方块：钻石块带来源；拆除退回方块和来源
  function place(W, x, y, i, j, id, day) {
    const pk = pkey(x, y), ck = i + ',' + j, m = W.built[pk] || (W.built[pk] = {});
    if (m[ck] || !(W.blocks[id] > 0)) return null;
    spendOne(W, 'b:' + id, 1);
    const v = {b: id, t: day};
    if (id === 'diamondb') v.from = W.gemQ.shift() || null;
    m[ck] = v; return v;
  }
  function unplace(W, x, y, i, j) {
    const m = W.built[pkey(x, y)], ck = i + ',' + j, v = m && m[ck];
    if (!v) return null;
    gain(W, 'b:' + v.b, 1);
    if (v.b === 'diamondb') W.gemQ.push(v.from || null);
    delete m[ck]; return v;
  }

  function skillsLit(W, items) {
    const lit = {};
    SKILLS.forEach(s => {
      const its = items.filter(i => i.group === s.id);
      lit[s.id] = its.length > 0 && its.filter(i => stepOf(W, i.id) >= 1).length / its.length >= 0.5;
    });
    return lit;
  }
  function bandShare(W, band, items, st) {
    const its = items.filter(i => i.level >= band.levels[0] && i.level <= band.levels[1]);
    const tot = its.reduce((a, i) => a + creditOf(i), 0);
    return tot ? its.filter(i => stepOf(W, i.id) >= (st || 2)).reduce((a, i) => a + creditOf(i), 0) / tot : 0;
  }
  // 挑战的题：只考这一带已证明到第 2 步的，优先没下架的；下架的题在这里是第二个例外（一天最多一场）
  const bossPool = (W, band, items) => items.filter(i => i.level >= band.levels[0] && i.level <= band.levels[1] && stepOf(W, i.id) >= 2).sort((a, b) => (a.spent ? 1 : 0) - (b.spent ? 1 : 0));
  function bossReady(W, bi, items) {
    const id = BANDS[bi].id;
    if (W.boss[id] || (bi > 0 && !W.boss[BANDS[bi - 1].id])) return false;
    if (!W.bossOpen[id] && bandShare(W, BANDS[bi], items) >= BOSS_SHARE) W.bossOpen[id] = 1;
    return !!W.bossOpen[id] && toolTier(W) >= BANDS[bi].tool;
  }
  const bossCanTry = (W, bi, items, day) => bossReady(W, bi, items) && W.bossDay !== day && bossPool(W, BANDS[bi], items).length >= 3;
  function bossEnd(W, bi, okN, day, need, hp) {
    const id = BANDS[bi].id;
    W.bossDay = day; W.bossHp[id] = (W.bossHp[id] || 0) + okN;
    if (okN < (need === undefined ? BOSS_PASS : need) && W.bossHp[id] < (hp === undefined ? BOSS_HP : hp)) return false;
    W.boss[BANDS[bi].id] = day; gain(W, 'b:goldb', BOSS_GOLD); logPush(W, {day, type: 'boss', id: BANDS[bi].id});
    return true;
  }
  function maxRing(W) { let i = 0; while (i < BANDS.length - 1 && W.boss[BANDS[i].id]) i++; return BANDS[i].rings[1]; }

  function frontier(W, items) {
    const lit = skillsLit(W, items), mr = maxRing(W), seen = {}, out = [];
    Object.values(W.plots).forEach(p => {
      if (p.st === 'wild') return;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const x = p.x + dx, y = p.y + dy, k = pkey(x, y);
        if (seen[k] || (W.plots[k] && W.plots[k].st !== 'wild')) return;
        seen[k] = 1;
        const r = ring(x, y), t = terrain(x, y), need = TERRAIN_NEED[t];
        out.push({x, y, ring: r, terrain: t, ok: r <= mr && (!need || lit[need]), why: r > mr ? 'boss' : need && !lit[need] ? need : null, wild: !!W.plots[k]});
      });
    });
    return out;
  }
  // 临时地块上限：平时 5 块；最近 14 天到期过 2 块，降到 3 块，新地也只绑 2 分（先把手上的守住）
  const recentWild = (W, day) => W.log.filter(l => l.type === 'wild' && dayDiff(l.day, day) < 14 && dayDiff(l.day, day) >= 0).length;   // 未来日期不算
  const struggling = (W, day) => recentWild(W, day) >= 2;
  const tempCap = (W, day) => (struggling(W, day) ? TEMP_CAP_LOW : TEMP_CAP);
  const usedIds = W => { const u = new Set(); Object.values(W.plots).forEach(p => p.bound.forEach(id => u.add(id))); return u; };
  // 选一组分值刚好够 goal（默认 3）的题。rest = 还没绑地块的题；正在进行的优先，题少时有多少绑多少
  function fitCredit(list, goal) {
    const out = []; let cr = 0;
    for (const i of list) { if (cr >= goal) break; if (cr + creditOf(i) > goal && cr > 0) continue; out.push(i); cr += creditOf(i); }
    if (cr < goal) { const big = list.find(i => creditOf(i) >= goal); if (big) return {ids: [big.id], cr: creditOf(big)}; }
    return {ids: out.map(i => i.id), cr};
  }
  const maxedOut = (W, i) => !!(i.spent && W.proof[i.id] && (W.proof[i.id].back || 0) >= BACK_MAX);
  function pickBound(W, items, goal) {
    const used = usedIds(W), rest = items.filter(i => i.seen && !used.has(i.id));
    const live = rest.filter(i => stepOf(W, i.id) < 3 && !maxedOut(W, i))
      .sort((a, b) => stepOf(W, b.id) - stepOf(W, a.id) || (W.proof[b.id] ? W.proof[b.id].last : '').localeCompare(W.proof[a.id] ? W.proof[a.id].last : '') || (a.level - b.level));
    const proven = rest.filter(i => stepOf(W, i.id) >= 3);
    return {live: fitCredit(live, goal || 3), proven: fitCredit(proven, goal || 3)};
  }
  // 这次插旗会怎样：提示条和 claim 共用。返回 {kind: 'temp'|'perm'|'free'|'cap'|'learn', bound}
  function claimPlan(W, items, day, old) {
    const room = count(W, 'temp') < tempCap(W, day), goal = struggling(W, day) ? 2 : 3;
    if (old && old.bound.length) return room ? {kind: 'temp', bound: old.bound} : {kind: 'cap'};
    const c = pickBound(W, items, goal), full = pickBound(W, items, 3), waiting = Object.values(W.plots).some(p => (p.st === 'temp' || p.st === 'wild') && p.bound.length);
    if (full.proven.cr >= 3) return {kind: 'perm', bound: full.proven.ids};   // 已学会的题攒够 3 分（减负时也一样）：直接永久，不占临时名额
    if (c.live.ids.length) { if (room) return {kind: 'temp', bound: c.live.ids}; return {kind: 'cap'}; }
    if (waiting) return room ? {kind: 'learn'} : {kind: 'cap'};
    // 题库到头：没有在进行的题，也没有在等的地块
    if (full.proven.ids.length) return {kind: 'perm', bound: full.proven.ids};
    const open = items.filter(i => i.open !== false), done = open.filter(i => stepOf(W, i.id) >= 3).length;
    if (open.length && done / open.length >= 0.7) return {kind: 'free', bound: []};   // 开放的题 70% 以上都学会了：地块直接给
    return {kind: 'learn'};
  }
  // 提示条用：地图上现在能不能拓、拓不了卡在哪
  function nextStep(W, items, day) {
    const fr = frontier(W, items), places = fr.filter(a => a.ok && !W.plots[pkey(a.x, a.y)]), plan = claimPlan(W, items, day);
    const bi = BANDS.findIndex(b => !W.boss[b.id]), band = BANDS[bi];
    return {places: places.length, plan: plan.kind, bossBand: bi, bossTry: bi >= 0 && bossCanTry(W, bi, items, day), bossShare: band ? bandShare(W, band, items) : 0, wall: !places.length && fr.some(a => a.why === 'boss')};
  }
  // 插旗拓地。返回 {ok, why, plot}。拓不了不扣东西
  function claim(W, x, y, items, day) {
    const k = pkey(x, y), f = frontier(W, items).find(a => a.x === x && a.y === y);
    if (!f || !f.ok) return {ok: false, why: f ? f.why : 'far'};
    if (W.bag.flag < 1) return {ok: false, why: 'flag'};
    const old = W.plots[k], plan = claimPlan(W, items, day, old);
    if (plan.kind === 'cap' || plan.kind === 'learn') return {ok: false, why: plan.kind};
    spendOne(W, 'flag', 1);
    const st = plan.kind === 'temp' ? 'temp' : 'perm';
    const plot = {x, y, st, bound: plan.bound, born: day, torch: struggling(W, day) ? TORCH_EASY : TUNE.torch, age: 0, dug: old ? old.dug : 0};
    if (st === 'perm') plot.permDay = day;
    W.plots[k] = plot;
    logPush(W, {day, type: 'claim', x, y, kind: plan.kind, cr: plan.bound.reduce((a, id) => a + ((items.find(i => i.id === id) || {gen: false}).gen ? 3 : 1), 0)});
    return {ok: true, plot};
  }
  // 回来次数满了不等于学会：换一道没绑的题；换不了就去掉；绑定空了的地块进迷雾等重新绑，绝不白给永久。
  // 题下线同样处理，并退还旗子。题库列表为空（加载异常）时什么都不做
  function pruneBound(W, items, day) {
    W.itemMax = Math.max(W.itemMax || 0, items.length);
    if (!items.length || items.length < W.itemMax * 0.9) return [];   // 题库列表空或缩水超过 10%：一定是传错了，什么都不做（必须传全量题库）
    const by = Object.fromEntries(items.map(i => [i.id, i])), ev = [];
    Object.values(W.plots).forEach(p => {
      if (p.st === 'perm' || !p.bound.length) return;
      const gone = p.bound.filter(id => !by[id]), maxed = p.bound.filter(id => by[id] && stepOf(W, id) < 3 && maxedOut(W, by[id]));
      if (!gone.length && !maxed.length) return;
      const lost = gone.length + maxed.reduce((a, id) => a + creditOf(by[id]), 0);   // 题下线按 1 分算，满额按原分值：换回同样的分
      p.bound = p.bound.filter(id => !gone.includes(id) && !maxed.includes(id));
      const c = pickBound(W, items, lost);
      p.bound = p.bound.concat(c.live.ids);
      if (!p.bound.length) { if (p.st === 'temp') { ev.push({type: 'wild', x: p.x, y: p.y}); logPush(W, {day, type: 'wild', x: p.x, y: p.y, by: 'prune'}); } p.st = 'wild'; if (gone.length) gain(W, 'flag', 1); }
    });
    return ev.concat(settlePlots(W, day));
  }
  // 今天要补考的题（守护题）：绑在临时和迷雾地块上、今天还没判、够间隔的。火把少的优先。先过滤再截取
  function guardList(W, items, day, max) {
    const by = Object.fromEntries(items.map(i => [i.id, i]));
    const pl = Object.values(W.plots).filter(p => p.st === 'temp' || p.st === 'wild').sort((a, b) => (a.st === 'temp' ? 0 : 1) - (b.st === 'temp' ? 0 : 1) || a.torch - b.torch);
    const out = [], done = W.evs[day] || {};
    pl.forEach(p => p.bound.forEach(id => {
      const pr = W.proof[id], s = pr ? pr.s : 0, it = by[id];
      if (!it || s >= 3 || (done[id] && done[id].done) || out.includes(id)) return;
      if (maxedOut(W, it)) return;
      if (s === 0 || !pr.last || dayDiff(pr.last, day) >= GAPS[s]) out.push(id);
    }));
    return out.slice(0, max === undefined ? GUARD_MAX : max).map(id => by[id]);
  }
  // 今天要复查的题（附魔）：永久地块绑定的题，到第 3 步后隔够 14 天；每天最多 3 道
  function enchList(W, items, day, max) {
    const by = Object.fromEntries(items.map(i => [i.id, i])), out = [], done = W.evs[day] || {};
    Object.values(W.plots).filter(p => p.st === 'perm' && !p.ench).forEach(p => p.bound.forEach(id => {
      const pr = W.proof[id], it = by[id];
      if (!it || !pr || pr.s !== 3 || (done[id] && done[id].done) || out.includes(id)) return;
      if (pr.last && dayDiff(pr.last, day) >= ENCH_GAP) out.push(id);
    }));
    return out.slice(0, max === undefined ? ENCH_MAX : max).map(id => by[id]);
  }
  // 已下架的题回来：按天计次（题型一天答 2 次也算 1 次）。复查不走这里，每 14 天最多 1 次
  function noteBack(W, id, day) { const p = proofOf(W, id); if (p.backDay !== day) { p.backDay = day; p.back = (p.back || 0) + 1; } }
  // 拓地时揭开地块里的东西。矿脉要「下矿」技能和工具等级，够了才给（工具合成后可以回来挖）
  function digPlot(W, x, y, lit) {
    const k = pkey(x, y), pl = W.plots[k], f = feature(x, y); if (!pl || pl.dug || !f) return null;
    if (f.kind === 'vein') {
      if (toolTier(W) < f.tier) return {kind: 'vein', lockTier: f.tier};
      if (lit && !lit.bond) return {kind: 'vein', lockSkill: 'bond'};
      gain(W, 'ore', f.ore); pl.dug = 1; return {kind: 'vein', ore: f.ore};
    }
    pl.dug = 1;
    if (f.kind === 'tree') { gain(W, 'wood', f.wood); return {kind: 'tree', wood: f.wood}; }
    if (f.block) { gain(W, 'b:' + f.block, f.n); return {kind: f.kind, block: f.block, n: f.n}; }
    return {kind: f.kind};
  }
  // 世界时间（分钟）：看今天答对多少，不看坐了多久。正确率不到一半最多 1 分钟
  const dayMinutes = (correct, answered) => { if (!correct) return 0; if (correct / Math.max(1, answered) < 0.5) return 1; return Math.min(6, 1 + Math.floor(correct / 12)); };

  // 迁移：按题补，没有证明记录的题按格子档位建证明，已有的不动，随时可以再跑（导入进度后也要跑一次）。lvOf(id) 给档位，dOf(id) 给升级日期
  function catchUp(W, items, lvOf, dOf, today) {
    const proven = [];
    items.forEach(it => {
      if (W.proof[it.id]) return;
      const lv = lvOf(it.id) || 0; if (!lv) return;
      const d = dOf(it.id) || [], p = proofOf(W, it.id);
      // 深红且真的隔了 3 天才算第 3 步；靠「秒答 4 次下架」直接到深红的只算第 2 步，要再证明一次
      const real3 = lv === 3 && d[1] && d[2] && dayDiff(d[1], d[2]) >= 3;
      p.s = lv === 3 ? (real3 ? 3 : 2) : lv; p.top = p.s; p.cr = creditOf(it);
      p.last = d[p.s - 1] || d[lv - 1] || today; if (p.last > today) p.last = today; p.days = d.slice(0, p.s);
      for (let k = 1; k <= p.s; k++) { const m = MATERIAL[k]; W.bag[m] += p.cr; W.total[m] += p.cr; }
      if (p.s === 3) { proven.push(it); p.d3 = d[2]; }
    });
    return proven;
  }
  // 第一次进世界：补证明、发累计矿石、把旧的真实擅长铺成永久地块（每 3 分 1 块，铺满青草原为止，剩下的之后插旗用）
  function migrate(W, items, lvOf, dOf, oreTotal, today) {
    if (W.migrated) { catchUp(W, items, lvOf, dOf, today); return false; }
    const pool = catchUp(W, items, lvOf, dOf, today), cells = [];
    W.bag.ore += oreTotal || 0;
    for (let r = 1; r <= BANDS[0].rings[1]; r++) for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) if (ring(x, y) === r && terrain(x, y) === 'land' && !W.plots[pkey(x, y)]) cells.push([x, y]);
    while (pool.length && cells.length) {
      const bound = []; let cr = 0;
      while (pool.length && cr < 3) { const i = pool.shift(); bound.push(i.id); cr += creditOf(i); }
      if (cr < 3) break;
      const [x, y] = cells.shift();
      W.plots[pkey(x, y)] = {x, y, st: 'perm', bound, born: today, permDay: today, torch: 0, dug: 0};
    }
    W.migrated = today;
    return true;
  }
  // 合并导入时世界不做字段合并，也不自动比较：本机世界玩过（插过旗或盖过东西）就不动；没玩过才接收备份里的世界。
  // 整份导入是回到备份那一刻，导入前把当前世界存到 S.worldBak，家长可以恢复。结构不对的世界不接收
  const worldOk = W => !!(W && W.plots && W.proof && W.bag && W.log && W.built);
  const played = W => worldOk(W) && (W.log.some(l => l.type === 'claim') || Object.values(W.built).some(m => Object.keys(m).length));
  function pickWorld(local, incoming) {
    const keep = played(local) || !worldOk(local);
    const W = JSON.parse(JSON.stringify(worldOk(local) && keep ? local : worldOk(incoming) ? incoming : local));
    if (worldOk(local) && local.settings) W.settings = JSON.parse(JSON.stringify(local.settings));   // 家长设置留本机的
    return W;
  }

  return {TUNE, GAPS, ENCH_GAP, BANDS, SKILLS, TOOLS, BLOCKS, TEMP_CAP, TORCH, GUARD_MAX, BOSS_SHARE, BOSS_N, BOSS_PASS, BOSS_HP, BACK_MAX, TORCH_EASY, MATERIAL, COAL_DAY, ENCH_MAX,
    flagRing, blank, gain, claimPlan, catchUp, pickWorld, played, worldOk, maxedOut, nextStep, GUARD_SEC, WILD_MAX, recentWild, onAttempt, endOfPractice, settlePlots, dailyWood, frontier, pickBound, claim, pruneBound, guardList, enchList, noteBack, tempCap, struggling, digPlot,
    craftTool, toolReady, craftBlock, craftFlag, flagCost, canPay, pay, place, unplace, gemPool,
    skillsLit, bandShare, bossReady, bossCanTry, bossPool, bossEnd, maxRing, toolTier, terrain, feature, ring, bandOfRing, pkey, proofOf, stepOf, creditOf, needOf, count, dayMinutes, migrate, dayDiff};
});
