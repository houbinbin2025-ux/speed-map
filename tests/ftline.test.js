// 秒答校准第二步：攒够样本的技能按空空自己的速度定秒答线和闪电线（说明书-秒答时间校准 §2；C 11-09 对齐闪电）
// 口径：倍数 = (用时 − 写字) ÷ 估计的「读题 + 想」；线 = 写字 + 估计的「读题 + 想」× 倍数，再夹在类范围里
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../v2/core.js'), K = require('../v2/skills.js'), E = require('../v2/engine.js'), G = require('../v2/gems.js');
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const o0 = {speed: 900};
const core = inst => K.thinkMs(inst) + K.readMs(inst, o0), wr = inst => K.writeMs(inst, o0);
const lo = inst => Math.min(Math.max(K.thinkMs(inst) * 0.5, K.THINK_FLOOR) + K.readMs(inst, o0) * 0.5, core(inst));   // 想的部分 ≥ 估计一半且 ≥ 1 秒，读题 ≥ 一半
const hi = inst => core(inst) * (K.FT_HI[K.fastClass(inst.id)] || 1);   // 上限 = 倍数上限（简单类 1、难类 1.5），不用类范围
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// 每类挑一个手写题型（点选、数线按原样），估计「读题 + 想」≥ 类下限 1.5 倍
const pickId = cls => Object.keys(K.ITEM).find(i => K.fastClass(i) === cls && (cls === 'line' || cls === 'pick' || K.BY[K.ITEM[i].skill].input === 'write') && core(K.make(i, seeded(1))) >= K.FAST_CLASS[cls].lo * 1500);
const ft = (id, arr) => ({[K.ITEM[id].skill]: arr});
const ten = v => Array(10).fill(v);
const withFt = f => Object.assign({ft: f}, o0);

test('没有样本、样本不到 8 条、数据坏：秒答线和闪电线都和估计值一样', () => {
  Object.keys(K.FAST_CLASS).forEach(cls => {
    const id = pickId(cls), inst = K.make(id, seeded(3)), est = K.fastMs(inst, o0);
    assert.equal(est, core(inst) + wr(inst), '估计 = 读题 + 想 + 写字');
    [undefined, null, 'bad', [], {}, ft(id, Array(7).fill(0.3)), ft(id, ['x', -1, NaN, 99, null, 0.3, 0.3, 0.3, 0.3]), ft(id, 'oops')].forEach(f => {
      assert.equal(K.fastMs(inst, withFt(f)), est, cls + ' ' + JSON.stringify(f));
      assert.equal(K.boltMs(inst, withFt(f), G.BOLT), est * G.BOLT, cls);
    });
  });
});

test('简单类（口算卡、短题、点选、数线）只收紧不放宽：自己快 → 线变短；自己慢 → 还是估计值', () => {
  ['card', 'short', 'pick', 'line'].forEach(cls => {
    const id = pickId(cls), inst = K.make(id, seeded(4)), est = K.fastMs(inst, o0);
    const fastKid = K.fastMs(inst, withFt(ft(id, ten(0.5))));
    assert.equal(fastKid, wr(inst) + Math.round(clamp(core(inst) * 0.6, lo(inst), hi(inst))), cls + '：中位数 0.5 × 1.2 = 0.6 倍，再夹在类范围里');
    assert.ok(fastKid < est, cls + ' 线变短');
    assert.equal(K.fastMs(inst, withFt(ft(id, ten(1.8)))), est, cls + '：慢也不放宽');
  });
});

test('简单类的尺子是「这一类里最快那部分」：别的技能熟了，还在一步一步算的技能过不了线', () => {
  const cards = K.SKILLS.filter(s => s.items.length && K.fastClass(s.items[0].id) === 'card');
  const big = s => s.items.find(it => core(K.make(it.id, seeded(2))) >= 4000), slow = cards.find(big), quick = cards.filter(s => s !== slow).slice(0, 3);
  const f = {}; quick.forEach(s => { f[s.id] = ten(0.3); }); f[slow.id] = ten(0.9);   // 熟的技能 0.3，这个技能 0.9（每次都在算）
  const inst = K.make(big(slow).id, seeded(5)), cr = core(inst);
  const pool = [].concat(...Object.values(f)).sort((a, b) => a - b), p25 = pool[Math.floor((pool.length - 1) * 0.25)];
  assert.equal(K.fastMs(inst, withFt(f)), wr(inst) + Math.round(clamp(cr * clamp(p25 * 2, 0.5, 1), lo(inst), hi(inst))));
  assert.ok(K.fastMs(inst, withFt(f)) < wr(inst) + cr * 0.9, '照它自己的 0.9 倍过不了');
  assert.equal(K.ftNote(inst.id, f).by, '类');
  // 只有一个技能有样本：不按类（防止一个技能代表全类）
  assert.equal(K.ftNote(inst.id, {[slow.id]: ten(0.9)}).by, '技能');
});

test('难类（读题、三四年级算式、多位笔算）按这个技能自己，只松不紧：慢 → 放宽到 1.5 倍为止；快 → 还是估计值', () => {
  ['word', 'multi', 'column'].forEach(cls => {
    const id = pickId(cls), inst = K.make(id, seeded(5)), est = K.fastMs(inst, o0);
    assert.equal(K.fastMs(inst, withFt(ft(id, ten(1.1)))), wr(inst) + Math.round(clamp(core(inst) * 1.32, lo(inst), hi(inst))), cls + ' 1.1 × 1.2 = 1.32 倍');
    assert.equal(K.fastMs(inst, withFt(ft(id, ten(5)))), wr(inst) + Math.round(clamp(core(inst) * 1.5, lo(inst), hi(inst))), cls + ' 最多 1.5 倍');
    assert.equal(K.fastMs(inst, withFt(ft(id, ten(0.4)))), est, cls + ' 快了也不收紧（只松不紧）');
  });
});

test('任何样本下，线不低于估计一半（想的部分 ≥ 1 秒）、不高于估计 × 倍数上限', () => {
  const ids = Object.keys(K.ITEM).filter((_, i) => i % 5 === 0), rnd = seeded(11);
  ids.forEach(id => {
    const inst = K.make(id, rnd), cr = core(inst);
    [0.05, 0.3, 1, 3, 10].forEach(v => {
      const line = K.fastMs(inst, withFt(ft(id, ten(v)))) - wr(inst);
      assert.ok(line >= lo(inst) - 1 && line <= hi(inst) + 1, `${id} ${v}：${line}`);
      assert.ok(line >= Math.min(cr * 0.5, lo(inst)) - 1 && line <= cr * 1.5 + 1, id);
      if (v >= 1.25 && K.FT_HI[K.fastClass(id)] > 1) assert.ok(line > cr, `${id}：难类慢了一定放宽（估计在类上限也一样）`);
    });
  });
});

test('闪电线：写字 + 读题和想 × 这个技能自己的第 25 百分位，这部分夹在个人线的 0.35 到 BOLT 倍；技能自己不够 8 条照旧', () => {
  const lc = (inst, o) => K.fastMs(inst, o) - wr(inst);   // 个人线里「读题 + 想」那部分
  const id = pickId('word'), inst = K.make(id, seeded(6));
  const s = [0.3, 0.35, 0.4, 0.45, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9], o = withFt(ft(id, s));   // 第 25 百分位 = 0.4125
  assert.ok(Math.abs(K.boltMs(inst, o, G.BOLT) - (wr(inst) + clamp(core(inst) * 0.4125, lc(inst, o) * K.BOLT_FLOOR, lc(inst, o) * G.BOLT))) < 1);
  const lowF = withFt(ft(id, ten(0.05)));
  assert.equal(K.boltMs(inst, lowF, G.BOLT), wr(inst) + lc(inst, lowF) * K.BOLT_FLOOR, '下限 0.35 倍');
  const easy = pickId('card'), ie = K.make(easy, seeded(7)), oe = withFt(ft(easy, ten(1.6)));
  assert.equal(K.boltMs(ie, oe, G.BOLT), wr(ie) + lc(ie, oe) * G.BOLT, '上限 = 个人线 × BOLT');
  // 熟练的 10 以内口算卡：闪电线的「想」部分不会被压到够不着（≥ 0.35 × 个人线，个人线 ≥ 1 秒）
  const c10 = K.make(K.BY['speed:L1:3'].items[0].id, seeded(3)), f10 = withFt({'speed:L1:3': ten(0.35), 'speed:L1:1': ten(0.35), 'speed:L1:2': ten(0.35)});
  assert.ok(K.boltMs(c10, f10, G.BOLT) - wr(c10) >= 350, '10 以内口算卡闪电里想的部分 ≥ 0.35 秒');
  // 类尺子有了、这个技能自己没样本：写字 + 个人线 × BOLT
  const cards = K.SKILLS.filter(x => x.items.length && K.fastClass(x.items[0].id) === 'card'), f = {};
  cards.slice(1, 4).forEach(x => { f[x.id] = ten(0.3); });
  const ic = K.make(cards[0].items[0].id, seeded(8)), oc = withFt(f);
  assert.equal(K.boltMs(ic, oc, G.BOLT), wr(ic) + lc(ic, oc) * G.BOLT);
});
test('只用最近 10 条；坏值不算数', () => {
  const id = pickId('multi'), inst = K.make(id, seeded(8));
  const a = K.fastMs(inst, withFt(ft(id, ten(1))));
  assert.equal(K.fastMs(inst, withFt(ft(id, [3, 3, 3].concat(ten(1))))), a, '最旧的 3 条不算');
  assert.equal(K.fastMs(inst, withFt(ft(id, ['x', NaN, 20].concat(ten(1))))), a, '坏值不算');
});

test('倍数的分母永远是估计值：传不传 ft，thinkRatio 一样；用时正好等于估计秒答线 → 1', () => {
  ['short', 'word', 'column', 'pick'].forEach(cls => {
    const id = pickId(cls), inst = K.make(id, seeded(9)), f = withFt(ft(id, ten(0.3)));
    [500, 2000, 4000, 9000].forEach(ms => assert.equal(K.thinkRatio(inst, ms, f), K.thinkRatio(inst, ms, o0)));
    assert.equal(K.thinkRatio(inst, K.fastMs(inst, o0), o0), 1, cls);
    assert.equal(K.thinkRatio(inst, wr(inst) + core(inst) / 2, o0), 0.5, cls);
  });
});

test('引擎：样本记进 S.ftime 以后，下一题的秒答线就变了（判完才记，不用这一次自己算线）', () => {
  const S = C.blank(), id = pickId('card'), inst = K.make(id, seeded(10)), sk = K.ITEM[id].skill;
  const lim = () => K.fastMs(inst, withFt(S.ftime));
  const est = lim();
  for (let i = 0; i < 7; i++) E.noteThink(S, sk, 0.3);
  assert.equal(lim(), est, '7 条：还是估计值');
  E.noteThink(S, sk, 0.3);
  assert.ok(lim() < est, '第 8 条记进去以后收紧');
});

test('页面：秒答线带 S.ftime，闪电走 K.boltMs，识别确认过的不记用时', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '../v2/index.html'), 'utf8');
  assert.match(html, /ft: S\.ftime\}\), qLimit = inst => K\.fastMs\(inst, limOpt\(\)\)/);
  assert.match(html, /r\.bolt = !!r\.fast && used <= K\.boltMs\(inst, limOpt\(\), GEMS\.BOLT\)/);
  assert.match(html, /think: r\.ok && !r\.oral && !r\.confirm/);
  assert.match(html, /confirm: !!viaConfirm/);
});

test('审查 R1：慢技能的闪电线明显低于秒答线（不会线多高闪电就多高）', () => {
  [['word', 2.2], ['multi', 1.4], ['card', 1.6]].forEach(([cls, v]) => {
    const id = pickId(cls), inst = K.make(id, seeded(12)), o = withFt(ft(id, ten(v)));
    assert.ok(K.boltMs(inst, o, G.BOLT) <= wr(inst) + (K.fastMs(inst, o) - wr(inst)) * G.BOLT + 1, cls);
  });
  // 简单类里这个技能比全类慢：秒答线按类尺子收紧，闪电线也不超过 × BOLT
  const cards = K.SKILLS.filter(x => x.items.length && K.fastClass(x.items[0].id) === 'card'), f = {};
  cards.slice(1, 4).forEach(x => { f[x.id] = ten(0.3); }); f[cards[0].id] = ten(1.2);
  const ic = K.make(cards[0].items[0].id, seeded(13)), oc = withFt(f);
  assert.ok(K.boltMs(ic, oc, G.BOLT) <= wr(ic) + (K.fastMs(ic, oc) - wr(ic)) * G.BOLT + 1);
});

test('审查 R1：类尺子 19 条不启用、20 条启用', () => {
  const cards = K.SKILLS.filter(x => x.items.length && K.fastClass(x.items[0].id) === 'card');
  const T = cards[3], it = T.items.find(i => K.thinkMs(K.make(i.id, seeded(2))) >= 3000) || T.items[0];
  const f19 = {[cards[0].id]: ten(0.3), [cards[1].id]: Array(9).fill(0.3)}, f20 = {[cards[0].id]: ten(0.3), [cards[1].id]: ten(0.3)};
  assert.equal(K.ftNote(it.id, f19), null, '19 条、这个技能自己没样本：用估计');
  assert.equal(K.ftNote(it.id, f20).by, '类');
});

test('审查 R1：乱点、写字估慢的极快作答不记，不会把类尺子拉到底', () => {
  const id = pickId('pick'), inst = K.make(id, seeded(14)), S = C.blank();
  [300, 450].forEach(ms => { const t = K.thinkRatio(inst, ms, o0); if (t !== null) E.noteThink(S, K.ITEM[id].skill, t); });
  assert.equal(S.ftime, undefined);
});

test('审查 R1：页面判题、发奖励、显示「秒答要 M 秒内」用同一条线（记用时之前算好）；重写过、冷静过的不记', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '../v2/index.html'), 'utf8');
  const at = html.indexOf('function resolve(r)'), body = html.slice(at, at + 6000);
  const iLim = body.indexOf('const lim = qLimit(inst)'), iRec = body.indexOf('Q.sess.answer(');
  assert.ok(iLim > 0 && iLim < iRec, '线在记录之前算');
  assert.match(body, /GM\.answerQ\(Q, x, r, secs, lim\)/);
  assert.match(body, /R\.okWords\(inst, out, Q\.wasLv, \{used, limit: lim\}, gain\)/);
  assert.match(body, /!r\.confirm && !x\.asked && !Q\.pickDelay \? K\.thinkRatio/);
  assert.ok(!/qLimit\(inst\)/.test(body.slice(iRec)), '记录之后不再取线');
});
