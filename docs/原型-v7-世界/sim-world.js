// 方块世界模拟：调用真实排课（v2/engine.js，只读）+ 真实世界规则（world-core.js）。
// 用法：KONG_BACKUP=<iPad 备份 JSON，含 speedmap.v2> node docs/原型-v7-世界/sim-world.js > docs/原型-v7-世界/模拟结果.md
// 一次运行产出全部表，同种子逐字节可复现。对错来自遗忘模型（假设，不是空空的真实数据）：隔 gap 天记得的概率 = 能力 × 0.9^(gap/s)。
const fs = require('fs'), path = require('path'), V2 = path.join(__dirname, '../../v2/');
const realRandom = Math.random;
const C = require(V2 + 'core.js'), K = require(V2 + 'skills.js'), E = require(V2 + 'engine.js'), H = require(V2 + 'home.js'), W = require('./world-core.js');
const seeded = s => { let x = s >>> 0 || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const rng3 = a => `${med(a)} [${Math.min(...a)}–${Math.max(...a)}]`;
const pct = v => Math.round(v * 100) + '%';
const ITEMS0 = K.SKILLS.concat(K.HARD).flatMap(s => s.items.map(it => ({id: it.id, gen: !!it.gen, pick: s.input === 'pick', level: K.itemLevels(it.id)[0] || 1, group: s.group === 'speed' || s.group === 'speedH' ? 'bond' : s.group})));
const BACKUP = process.env.KONG_BACKUP;
const S0 = BACKUP ? JSON.parse(JSON.parse(fs.readFileSync(BACKUP, 'utf8'))['speedmap.v2']) : null;
const SEEDS = 8;

function runKid(o) {
  const {ability, seed, days = 180, attend = () => true, guard = true, mode = 'normal', worldOn = true, real = false, memK = 1, fastK = 1, secK = 1, castle = false, quitAfter = 0, guardCap = W.GUARD_SEC} = o;
  Math.random = seeded(seed * 104729 + 7); C._resetDecks();
  const r = seeded(seed * 7919 + 13);
  const start = real ? '2026-11-07' : '2026-11-01', D = n => C.addDays(start, n);
  const S = real ? JSON.parse(JSON.stringify(S0)) : C.blank(); if (!real) S.placedAt = 1;
  const w = W.blank(), mem = {};
  const st = id => mem[id] || (mem[id] = {s: 0, last: null});
  const R = (id, dn) => { const x = st(id); return x.s === 0 ? 1 : Math.pow(0.9, (dn - x.last) / x.s); };
  const P = (id, dn) => (st(id).s === 0 ? ability * 0.8 : ability * R(id, dn));
  const learn = (id, dn, ok) => { const x = st(id); if (x.s === 0) { x.s = ok ? 1.5 : 0.7; x.last = dn; return; } const gap = dn - x.last, rr = R(id, dn); if (ok) x.s = gap === 0 ? x.s * 1.02 : x.s * (1 + memK * (2.2 * (1 - rr) + 0.35)); else x.s = Math.max(0.5, x.s * 0.55); x.last = dn; };
  const after = (id, days2) => { const x = st(id); return x.s ? ability * Math.pow(0.9, days2 / x.s) : 0; };
  const items = ITEMS0.map(i => Object.assign({}, i));
  const IDX = Object.fromEntries(items.map(x => [x.id, x]));
  const stat = {tempClaims: 0, reclaims: 0, bossTries: 0, bossStuckDays: 0, big: [], small: [], permDays: [], claims: 0, wilded: 0, backs: 0, ench: 0, guardQ: 0, guardSec: [], snaps: {}, boss: [], s3Mem: [], s4Mem: [], lv3Mem: [], naiveMem: [], ok5: {}, lv3Seen: {}, chk: [0, 0], rej: {}, minutes: [], correctDay: [], builtBlocks: 0, spentBack: 0, firstWild: null, gems: 0};
  if (real) { // 真实起点：档位 → 记忆强度估计（假设）
    W.migrate(w, items, id => E.lv(S, id) || 0, id => (E.peek(S, id).d || []), (S.home && S.home.ore) || 0, D(0));
    items.forEach(i => { const lv = E.lv(S, i.id) || 0; if (lv) { const x = st(i.id); x.s = [0, 1.5, 3, 6][lv]; x.last = -1; i.seen = true; stat.lv3Seen[i.id] = 1; } });
  }
  const answer = (id, dn) => {
    const it = IDX[id];
    if (mode === 'guess') { const ok = r() < (it.pick ? 0.34 : 0.05); return {ok, fast: ok, secs: 3}; }
    const p = P(id, dn);
    if (mode === 'peekWeak' && p < 0.6) { learn(id, dn, true); return {ok: true, fast: true, secs: 8, peeked: true}; }
    const ok = r() < p, fast = ok && r() < fastK * Math.min(0.85, 0.3 + 0.07 * st(id).s);
    learn(id, dn, ok);
    return {ok, fast, secs: secK * (ok ? (fast ? 5 : 8) : 11)};
  };
  const onEv = (d, list) => list.forEach(ev => { if (ev.type === 'perm' || ev.type === 'back') { stat.permDays.push(d); stat.big.push(d); if (ev.type === 'back') stat.backs++; } if (ev.type === 'ench') { stat.ench++; stat.big.push(d); } });
  for (let d = 0; d < days; d++) {
    const day = D(d);
    items.forEach(i => { i.spent = E.outOf(S, i.id); const pk = E.peek(S, i.id); if (pk.seen > 0 || pk.lv > 0) i.seen = true; });
    if (attend(d)) {
      let coal = 0, cor = 0, ans = 0;
      const rec = (x, res, id) => {
        const it = IDX[id]; it.seen = true;
        const out = W.onAttempt(w, it, {ok: res.ok, fast: res.fast, needFast: E.needFast(S, id), peeked: res.peeked, retry: x && x.retry}, day);
        if (!(x && x.retry) && !res.peeked) { ans++; if (res.ok) { cor++; W.gain(w, 'ore', 1); stat.ok5[id] = (stat.ok5[id] || 0) + 1; if (stat.ok5[id] === 5) stat.naiveMem.push(after(id, 14)); } }
        if (x && x.mkey && res.ok && !res.peeked && coal < W.COAL_DAY) { W.gain(w, 'coal', 1); coal++; }
        if (out.advanced) stat.small.push(d);
        if (out.advanced && out.step === 3) { stat.s3Mem.push(after(id, 14)); stat.gems += W.creditOf(it); }
        if (out.advanced && out.step === 4) stat.s4Mem.push(after(id, 14));
        const chk = w.proof[id] && w.proof[id].chk; if (chk && chk.day === day && !w.proof[id].chkSeen) { w.proof[id].chkSeen = 1; stat.chk[chk.ok]++; }
        onEv(d, out.events);
      };
      if (worldOn) { const pe = W.pruneBound(w, items, day); onEv(d, pe); stat.wilded += pe.filter(e => e.type === 'wild').length; }
      const s = E.session(S, day, {rnd: seeded(seed * 1000 + d)});
      if (guard && worldOn) {   // 守护题和复查题：排在今天前段。没下架的走真实排课路径（inject → answer → settle）；已下架的不碰引擎，只记证明和时间，并计回来次数
        W.enchList(w, items, day).concat(W.guardList(w, items, day)).forEach(item => {   // 复查排前面：被上限挡住会拉长间隔、拉低主指标

          if (guardCap && (stat.guardSec[d] || 0) >= guardCap) return;   // 守护题和复查题的时间上限
          for (let k = 0; k < W.needOf(item); k++) {
            const res = answer(item.id, d);
            if (item.spent) { W.noteBack(w, item.id, day); stat.spentBack++; rec(null, res, item.id); E.addTime(S, day, res.secs); }
            else { s.inject({kind: 'q', inst: K.make(item.id, seeded(seed + d + k)), seg: 'fluency'}); rec({}, res, item.id); s.answer(res); }
            stat.guardQ++; stat.guardSec[d] = (stat.guardSec[d] || 0) + res.secs;
            if (!res.ok || res.peeked) break;
          }
        });
      }
      for (let x = s.next(), g = 0; x && g < (quitAfter || 500); x = s.next(), g++) if (x.kind === 'q') { const res = answer(x.inst.id, d); rec(x, res, x.inst.id); s.answer(res); }
      if (mode === 'grind') for (let g = 0; g < 5; g++) {
        const f = E.free(S, day, ['look', 'bond', 'place', 'cmp', 'line'][g], {rnd: seeded(seed * 77 + d * 13 + g)});
        for (let x = f.next(), n = 0; x && n < 40; x = f.next(), n++) if (x.kind === 'q') { const res = answer(x.inst.id, d); rec(x, res, x.inst.id); f.answer(res); }
      }
      items.forEach(i => { if (!stat.lv3Seen[i.id] && E.lv(S, i.id) === 3) { stat.lv3Seen[i.id] = 1; stat.lv3Mem.push(after(i.id, 14)); } });
      const today = S.stats[day] || {};
      if (worldOn && ((today.sec || 0) >= 300 || today.done)) {
        const wild = W.endOfPractice(w, day); stat.wilded += wild.length; if (wild.length && stat.firstWild === null) stat.firstWild = d + 1;
        stat.minutes.push(W.dayMinutes(cor, ans)); stat.correctDay.push(cor);
        const lit = W.skillsLit(w, items);
        W.TOOLS.forEach(t => { if (W.craftTool(w, t.id, day)) stat.big.push(d); });
        for (let g = 0; g < 8; g++) {
          const f = W.frontier(w, items).filter(a => a.ok).sort((a, b) => a.ring - b.ring)[0]; if (!f) { stat.rej.noFrontier = (stat.rej.noFrontier || 0) + 1; break; }
          if (w.bag.flag < 1 && !W.craftFlag(w, W.flagRing(w))) break;
          const wasWild = !!w.plots[W.pkey(f.x, f.y)], c = W.claim(w, f.x, f.y, items, day);
          if (!c.ok) { stat.rej[c.why] = (stat.rej[c.why] || 0) + 1; break; }
          W.digPlot(w, f.x, f.y, lit); stat.big.push(d); stat.claims++; if (c.plot.st === 'temp' && !wasWild) stat.tempClaims++; else if (c.plot.st === 'temp') stat.reclaims++;
          if (c.plot.st === 'perm') stat.permDays.push(d);
        }
        // 盖房：一天放方块上限 60；普通孩子用矿石和木头；城堡孩子把钻石全盖成钻石块
        let placed = 0;
        if (castle) while (W.craftBlock(w, 'diamondb')) { w.blocks.diamondb = w.blocks.diamondb; placed++; }
        while (placed < 60 && w.bag.ore > 100) { W.craftBlock(w, 'stone'); placed += 4; stat.builtBlocks += 4; }
        while (placed < 60 && w.bag.wood > 30) { W.craftBlock(w, 'plank'); placed += 4; stat.builtBlocks += 4; }
        const bi = W.BANDS.findIndex((b, i) => W.bossCanTry(w, i, items, day));
        if (bi >= 0) { const band = W.BANDS[bi], pool = W.bossPool(w, band, items); let okN = 0; for (let k = 0; k < W.BOSS_N; k++) { const i = pool[Math.floor(r() * pool.length)]; if (r() < P(i.id, d)) okN++; } stat.bossTries++; if (W.bossEnd(w, bi, okN, day)) { stat.boss.push([band.name, d + 1]); stat.big.push(d); } }
      }
      if (H.sync(S, day).length) stat.small.push(d);
    }
    [7, 14, 30, 60, 90, 120, 180].forEach(n => { if (d === n - 1) { const t = w.total; stat.snaps[n] = {perm: W.count(w, 'perm') - 1, temp: W.count(w, 'temp'), wild: W.count(w, 'wild'), claims: stat.claims, ore: w.bag.ore, iron: t.iron, gold: t.gold, diamond: t.diamond, wood: w.bag.wood, coal: w.bag.coal, tier: W.toolTier(w), s3: items.filter(i => W.stepOf(w, i.id) >= 3).length, lv3: items.filter(i => E.lv(S, i.id) === 3).length, lit: items.filter(i => (E.lv(S, i.id) || 0) >= 1).length}; } });
  }
  const permPlots = Object.values(w.plots).filter(p => p.st === 'perm' && (p.x || p.y)), crOf = p => p.bound.reduce((a, id) => a + W.creditOf(IDX[id] || {}), 0);
  stat.perm3 = permPlots.filter(p => crOf(p) >= 3).length; stat.permLess = permPlots.filter(p => p.bound.length && crOf(p) < 3).length; stat.permEmpty = permPlots.filter(p => !p.bound.length).length;
  stat.bossStuck = !w.boss.meadow; stat.gapPermAll = 0; { const a = [...new Set(stat.permDays)].sort((x, y) => x - y); a.forEach((x, i) => { if (i) stat.gapPermAll = Math.max(stat.gapPermAll, x - a[i - 1]); }); }
  const gapOf = (list, upto) => { const a = [...new Set(list)].filter(x => x < upto).sort((x, y) => x - y); let g = a.length ? a[0] : upto; a.forEach((x, i) => { if (i) g = Math.max(g, x - a[i - 1]); }); return Math.max(g, a.length ? upto - 1 - a[a.length - 1] : upto); };
  stat.gapBig90 = gapOf(stat.big, Math.min(90, days)); stat.gapBig = gapOf(stat.big, days); stat.gapAny = gapOf(stat.big.concat(stat.small), days); stat.gapPerm90 = gapOf(stat.permDays, Math.min(90, days));
  stat.w = w; stat.finish = JSON.stringify([stat.snaps, stat.boss, Object.keys(w.plots).length]);
  Math.random = realRandom;
  return stat;
}
const cache = {};
const runs = o => { const k = JSON.stringify(o, (kk, v) => (typeof v === 'function' ? v.toString() : v)); return cache[k] || (cache[k] = Array.from({length: SEEDS}, (_, s) => runKid(Object.assign({seed: s + 1}, o)))); };
const kids = [['强 .98', 0.98], ['中 .9', 0.9], ['弱 .75', 0.75]];
const attends = [['每天', () => true], ['周一到周五', d => (d + 6) % 7 < 5], ['一周 3 天', d => d % 7 === 0 || d % 7 === 2 || d % 7 === 4], ['第 20–33 天没来', d => d < 19 || d > 32]];
const toolName = t => (W.TOOLS.find(x => x.tier === t) || {name: '无'}).name;
const avgOf = a => (a.length ? a.reduce((x, y) => x + (y || 0), 0) / a.length : 0);
function pace(real) {
  console.log(`\n## 节奏 · ${real ? '空空 iPad 真实起点' : '空白起点'}（8 个种子，中位 [最差–最好]）\n`);
  console.log('| 孩子 | 来的频率 | 永久 30 天 | 永久 90 天 | 永久 180 天 | 180 天 满 3 分/不足/空 | 到期率（到期 ÷ 临时插旗含拓回） | 最长没有大事（前 90 天，天） | 最长没有永久地块（全程，天） | 守护题 秒/天（平均 / 最多） | 世界分钟/天 | 第一次到期（最早第几天） | 180 天还没赢青草原 Boss 的种子 | Boss（种子 1） |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [kn, ab] of kids) for (const [an, at] of attends) {
    const R = runs({ability: ab, attend: at, real});
    const g = (n, k) => R.map(x => x.snaps[n][k]);
    const sec = R.map(x => avgOf(x.guardSec.filter(Boolean))), secMax = R.map(x => Math.max(0, ...x.guardSec.filter(Boolean)));
    console.log(`| ${kn} | ${an} | ${rng3(g(30, 'perm'))} | ${rng3(g(90, 'perm'))} | ${rng3(g(180, 'perm'))} | ${med(R.map(x => x.perm3))}/${med(R.map(x => x.permLess))}/${med(R.map(x => x.permEmpty))} | ${pct(med(R.map(x => x.wilded / Math.max(1, x.tempClaims + x.reclaims))))} [最差 ${pct(Math.max(...R.map(x => x.wilded / Math.max(1, x.tempClaims + x.reclaims))))}] | ${rng3(R.map(x => x.gapBig90))} | ${rng3(R.map(x => x.gapPermAll))} | ${Math.round(med(sec))} / ${Math.round(Math.max(...secMax))} | ${(avgOf(R.flatMap(x => x.minutes))).toFixed(1)} | ${R.map(x => x.firstWild).filter(Boolean).sort((a, b) => a - b)[0] || '无'} | ${R.filter(x => x.bossStuck).length}/8 | ${R[0].boss.map(b => b[0][0] + b[1]).join(' ') || '无'} |`);
  }
}
function econ(real) {
  console.log(`\n## 经济 · ${real ? '真实起点' : '空白起点'}（每天来，中位）\n`);
  console.log('| 孩子 | 天 | 永久 | 累计插旗 | 工具 | 第 3 步的题 | 深红格 | 累计铁/金/钻 | 剩矿石 | 剩木 | 剩煤 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [kn, ab] of kids) { const R = runs({ability: ab, real, attend: attends[0][1]});
    for (const n of [7, 14, 30, 60, 90, 120, 180]) { const g = k => med(R.map(x => x.snaps[n][k])); console.log(`| ${kn} | ${n} | ${g('perm')} | ${g('claims')} | ${toolName(g('tier'))} | ${g('s3')} | ${g('lv3')} | ${g('iron')}/${g('gold')}/${g('diamond')} | ${g('ore')} | ${g('wood')} | ${g('coal')} |`); } }
  console.log('\n题库：' + ITEMS0.length + ' 格 / ' + ITEMS0.reduce((a, i) => a + W.creditOf(i), 0) + ' 分。');
  W.BANDS.forEach(b => { const its = ITEMS0.filter(i => i.level >= b.levels[0] && i.level <= b.levels[1]); const cr = its.reduce((a, i) => a + W.creditOf(i), 0); let n = 0; for (let r = b.rings[0]; r <= b.rings[1]; r++) n += 8 * r; console.log(`- ${b.name}：${its.length} 格 / ${cr} 分 ≈ ${Math.round(cr / 3)} 块地；地块位 ${n}`); });
}
function proof() {
  console.log('\n## 判定精度（到达判定当时，再隔 14 天不练还记得的概率；空白起点，180 天；全部依赖遗忘模型）\n');
  console.log('| 孩子 | 规则 | 达到的题数 | 隔 14 天记得（中位） | ≥ 80% 的比例 |');
  console.log('|---|---|---|---|---|');
  for (const [kn, ab] of kids) { const R = runs({ability: ab, real: false, attend: attends[0][1]});
    const row = (name, k) => { const all = R.flatMap(x => x[k]); console.log(`| ${kn} | ${name} | ${med(R.map(x => x[k].length))} | ${pct(med(all))} | ${pct(all.filter(v => v >= 0.8).length / Math.max(1, all.length))} |`); };
    row('累计答对 5 次', 'naiveMem'); row('引擎深红', 'lv3Mem'); row('证明链第 3 步（永久）', 's3Mem'); row('证明链第 4 步（附魔）', 's4Mem');
    console.log(`| ${kn} | 复查首次通过率（主指标） | ${med(R.map(x => x.chk[0] + x.chk[1]))} | ${pct(med(R.map(x => x.chk[1] / Math.max(1, x.chk[0] + x.chk[1]))))} | |`); }
}
function cheat() {
  console.log('\n## 刷得出来吗（第 30 天，真实起点，中等孩子，8 个种子，中位 [最差–最好]）\n');
  console.log('| 怎么做 | 永久地块 | 第 3 步的题 | 累计钻石 | 说明 |');
  console.log('|---|---|---|---|---|');
  const row = (name, o, say) => { const R = runs(Object.assign({ability: 0.9, days: 30, real: true}, o)); const g = k => rng3(R.map(x => x.snaps[30][k])); console.log(`| ${name} | ${g('perm')} | ${g('s3')} | ${g('diamond')} | ${say} |`); };
  row('正常', {}, '基线');
  row('每天额外加练 60 题', {mode: 'grind'}, '加练多证明了不同的题，钻石和地块都变多，这是真实练习；同一道题当天刷多少次都不算');
  row('不会的题就偷看', {mode: 'peekWeak'}, '会的题照常算，所以不比正常少；偷看过的题当天不算，靠偷看证明不了');
  row('全程乱点', {mode: 'guess'}, '真实起点里有不少题只差一步，碰巧写对的 5% 也算');
  const G = (real, days) => { const R = runs({ability: 0.9, days, real, mode: 'guess'}); return `${med(R.map(x => x.snaps[days].perm))}（满 3 分 ${med(R.map(x => x.perm3))}、不足 ${med(R.map(x => x.permLess))}、空 ${med(R.map(x => x.permEmpty))}），累计钻石 ${med(R.map(x => x.snaps[days].diamond))}`; };
  console.log(`\n全程乱点更长时间：真实起点 180 天永久 ${G(true, 180)}；空白起点 180 天永久 ${G(false, 180)}。`);
}
function variants() {
  console.log('\n## 对照（中等孩子，每天来，90 天，8 个种子中位）\n');
  console.log('| 起点 | 方案 | 30 天永久 | 90 天永久 | 到期率 | 90 天点亮格 | 90 天深红格 | 90 天累计矿石来源题量/天 |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const real of [true, false]) {
    const row = (name, o) => { const R = runs(Object.assign({ability: 0.9, days: 90, real}, o)); const g = (n, k) => med(R.map(x => x.snaps[n][k])); console.log(`| ${real ? '真实' : '空白'} | ${name} | ${o.worldOn === false ? '–' : g(30, 'perm')} | ${o.worldOn === false ? '–' : g(90, 'perm')} | ${o.worldOn === false ? '–' : pct(med(R.map(x => x.wilded / Math.max(1, x.tempClaims + x.reclaims))))} | ${g(90, 'lit')} | ${g(90, 'lv3')} | ${o.worldOn === false ? '–' : Math.round(avgOf(R.flatMap(x => x.correctDay)))} |`); };
    row('没有世界（现状）', {worldOn: false});
    row('本方案', {});
    row('关掉守护题', {guard: false});
    row('钻石全盖城堡的孩子', {castle: true});
    row('每天只答 30 题就退出（约 3 分钟，够不上练习日）', {quitAfter: 30});
    row('每天只答 50 题就退出（约 5 分钟）', {quitAfter: 50});
    const save = W.GAPS.slice(); W.GAPS[2] = 5; for (const k in cache) if (k.includes('GAP5')) delete cache[k];
    row('第 3 步隔 5 天', {tag: 'GAP5'}); save.forEach((v, i) => { W.GAPS[i] = v; });
  }
}
function sens() {
  console.log('\n## 敏感性（真实起点，每天来，8 个种子中位；假设偏差时结论怎么变）\n');
  console.log('| 孩子 | 假设 | 30 / 90 / 180 天永久 | 到期率 [最差] | 第 3 步隔 14 天记得 | 90 天深红格 | 没赢青草原 Boss 的种子 |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [kn, ab] of [['中 .9', 0.9], ['弱 .75', 0.75]]) for (const [name, o] of [['基线', {}], ['记忆增长减半', {memK: 0.5}], ['秒答概率减半', {fastK: 0.5}], ['用时 ×1.5', {secK: 1.5}], ['三者一起', {memK: 0.5, fastK: 0.5, secK: 1.5}]]) {
    const R = runs(Object.assign({ability: ab, days: 180, real: true}, o)), g = (n, k) => med(R.map(x => x.snaps[n][k])), all = R.flatMap(x => x.s3Mem);
    console.log(`| ${kn} | ${name} | ${g(30, 'perm')} / ${g(90, 'perm')} / ${g(180, 'perm')} | ${pct(med(R.map(x => x.wilded / Math.max(1, x.tempClaims + x.reclaims))))} [${pct(Math.max(...R.map(x => x.wilded / Math.max(1, x.tempClaims + x.reclaims))))}] | ${pct(med(all))} | ${g(90, 'lv3')} | ${R.filter(x => x.bossStuck).length}/8 |`);
  }
}
function torchGrid() {
  console.log('\n## 火把支数（真实起点，90 天）\n');
  console.log('| 火把 | 中 到期率 | 弱 到期率 | 中 第一次到期（最早第几天） | 弱 第一次到期 |');
  console.log('|---|---|---|---|---|');
  for (const t of [3, 5, 7]) { W.TUNE.torch = t; const go = ab => Array.from({length: SEEDS}, (_, s) => runKid({ability: ab, days: 90, real: true, seed: s + 1}));
    const a = go(0.9), b = go(0.75), fw = R => R.map(x => x.firstWild).filter(Boolean).sort((p, q) => p - q)[0] || '无';
    console.log(`| ${t} | ${pct(med(a.map(x => x.wilded / Math.max(1, x.tempClaims + x.reclaims))))} | ${pct(med(b.map(x => x.wilded / Math.max(1, x.tempClaims + x.reclaims))))} | ${fw(a)} | ${fw(b)} |`); }
  W.TUNE.torch = W.TORCH;
}
function guardTable() {
  const M3 = {attend: d => d % 7 === 0 || d % 7 === 2 || d % 7 === 4};
  const conds = [['强', {ability: .98}], ['中', {ability: .9}], ['弱', {ability: .75}], ['中，用时 ×1.5', {ability: .9, secK: 1.5}], ['弱，用时 ×1.5', {ability: .75, secK: 1.5}], ['中，一周 3 天', Object.assign({ability: .9}, M3)], ['弱，一周 3 天', Object.assign({ability: .75}, M3)], ['中，三个假设一起', {ability: .9, memK: .5, fastK: .5, secK: 1.5}], ['弱，三个假设一起', {ability: .75, memK: .5, fastK: .5, secK: 1.5}]];
  const caps = (process.env.KONG_CAPS || '0,60,40,20').split(',').map(Number);
  console.log('\n## 护栏 1：练习被挤占（90 天深红格，8 个种子中位；守护题时间上限对比）\n');
  console.log('| 孩子和假设 | 起点 | 没有世界 | ' + caps.map(c => c ? `上限 ${c} 秒` : '只限题数').join(' | ') + ' |');
  console.log('|---|---|---|' + caps.map(() => '---').join('|') + '|');
  for (const [n, o] of conds) for (const real of [true, false]) {
    const lv = x => med(runs(Object.assign({real, days: 90}, o, x)).map(r => r.snaps[90].lv3)), base = lv({worldOn: false});
    console.log(`| ${n} | ${real ? '真实' : '空白'} | ${base} | ` + caps.map(c => { const v = lv({guardCap: c}); return `${v}（${v >= base ? '+' : '−'}${Math.abs((v - base) / Math.max(1, base) * 100).toFixed(1)}%）`; }).join(' | ') + ' |');
  }
}
function wildWindow() {   // 护栏 3：任意 14 天到期块数，看日志算，不信规则
  console.log('\n## 任意 14 天到期块数最大值（真实起点，180 天，8 个种子）\n');
  console.log('| 孩子 | 假设 | 最大值 |\n|---|---|---|');
  for (const [n, o] of [['中', {ability: .9}], ['弱', {ability: .75}], ['弱，三者一起', {ability: .75, memK: .5, fastK: .5, secK: 1.5}]]) {
    const max = Math.max(...runs(Object.assign({real: true, days: 180}, o)).map(r => { const ds = r.w.log.filter(l => l.type === 'wild').map(l => l.day); return Math.max(0, ...ds.map(a => ds.filter(b => { const q = W.dayDiff(a, b); return q >= 0 && q < 14; }).length)); }));
    console.log(`| ${n} | | ${max} |`);
  }
}
function guardCost() {
  const caps = (process.env.KONG_CAPS || '0,60,40,20').split(',').map(Number);
  console.log('\n## 守护题时间上限的代价（真实起点，每天来，180 天，8 个种子中位）\n');
  console.log('| 孩子 | 上限 | 30 / 90 / 180 天永久 | 到期率 | 第 3 步隔 14 天记得 |');
  console.log('|---|---|---|---|---|');
  for (const [n, ab] of [['中', .9], ['弱', .75]]) for (const c of caps) { const R = runs({ability: ab, days: 180, real: true, guardCap: c}), g = k => med(R.map(x => x.snaps[k].perm)); console.log(`| ${n} | ${c ? c + ' 秒' : '只限题数'} | ${g(30)} / ${g(90)} / ${g(180)} | ${pct(med(R.map(x => x.wilded / Math.max(1, x.tempClaims + x.reclaims))))} | ${pct(med(R.flatMap(x => x.s3Mem)))} |`); }
}
if (process.env.KONG_GUARD) { guardTable(); process.exit(0); }
if (process.env.KONG_GUARD2) { guardCost(); process.exit(0); }
if (process.env.KONG_PROOF) { proof(); process.exit(0); }
// 可复现检查
const a1 = runKid({ability: 0.9, seed: 2, days: 60}).finish, a2 = runKid({ability: 0.9, seed: 2, days: 60}).finish;
console.log(`# 模拟结果\n\n同种子连跑两次结果${a1 === a2 ? '相同' : '**不同**'}。起点：${S0 ? '空空 iPad 11-06 真实进度 + 空白' : '只有空白（没给 KONG_BACKUP）'}。对错来自遗忘模型，不是空空的真实作答。`);
if (S0) { pace(true); econ(true); }
pace(false); econ(false); proof();
if (S0) { cheat(); variants(); sens(); torchGrid(); guardTable(); guardCost(); wildWindow(); }
