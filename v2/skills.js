// 空空数学岛 · 技能图谱（纯逻辑，无 DOM）：理解数的 19 个技能 + 秒答地图各级，出题、显示、判题、前置关系
// 浏览器里挂到 window.SKILLS（依赖 window.SM），node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./bank.js'), require('./hardbank.js'), require('./placebank.js'));
  else root.SKILLS = factory(root.SM, root.BANK, root.HARDBANK, root.PLACEBANK);
})(typeof self !== 'undefined' ? self : this, function (C, B, HB, NB) {
  'use strict';

  const rint = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const SK = [], BY = {}, ITEM = {};
  // kind：card 一道固定题一个格子 / type8 题型（最近 8 次合格 ≥ 7）/ day5 秒答题型（同一天合格 5 次，同 v2）
  function skill(o) {
    const s = Object.assign({input: 'write', pre: [], items: []}, o);
    s.items = s.items.filter(Boolean); if (!s.items.length) return null;   // 题全被剔除的技能（如 5 以内分合）不再存在
    s.items.forEach(it => { it.skill = s.id; ITEM[it.id] = it; });
    SK.push(s); BY[s.id] = s; return s;
  }
  // 题目都来自题库（bank.js）：卡 = 题库里这个技能的固定题；题型 = 从题库池里发牌（一轮发完再洗，同一轮不重复）
  const cards = sid => B.cards[sid].filter(c => !C.isLow(c.q)).map(c => ({id: c.id, q: c.q, ans: c.ans}));
  const POOL = {}, pool = id => POOL[id] || (POOL[id] = B.pools[id].filter(x => !C.isLow(x.q)));
  const fromPool = id => r => { const p = pool(id), x = p[C.deal(id, p.length, r)]; return {q: Object.assign({}, x.q), ans: x.ans}; };
  const type = id => (pool(id).length ? {id, gen: fromPool(id)} : null);
  // 三个新地方（docs/意图-v6-三个新关卡.md）：题在 placebank.js，排在各自前置学完之后
  const place = (id, group, name, pre, ids, input) => skill({id, group, name, nb: true, kind: 'type8', input: input || 'write', pre, items: ids.map(i => ({id: i, gen: r => { const p = NB.pools[i], x = p[C.deal(i, p.length, r)]; return {q: Object.assign({}, x.q), ans: x.ans}; }}))});

  // ---------- 看数（一眼看出有几个） ----------
  skill({id: 'look1', group: 'look', name: '骰子点', kind: 'card', items: cards('look1')});
  skill({id: 'look2', group: 'look', name: '乱点', kind: 'card', items: cards('look2')});
  skill({id: 'cmp1', group: 'cmp', name: '10 以内谁大', kind: 'type8', input: 'pick', items: [type('cmp:t:10')]});
  skill({id: 'look3', group: 'look', name: '一个十格框', kind: 'card', pre: ['look1'], items: cards('look3')});
  place('gardenA', 'garden', '接方块', ['look3'], ['garden:t:next'], 'pick');
  // ---------- 分合（分合图：整体在上，两部分在下；先卡后题型） ----------
  skill({id: 'bond1', group: 'bond', name: '5 以内分合', kind: 'card', pre: ['look3'], items: cards('bond1').concat([type('bond:t:whole5')])});
  skill({id: 'look4', group: 'look', name: '两个十格框', kind: 'card', pre: ['look3'], items: cards('look4')});
  skill({id: 'bond2', group: 'bond', name: '6–9 分合', kind: 'card', pre: ['bond1'], items: cards('bond2').concat([type('bond:t:whole9')])});
  place('dockA', 'dock', '装到一起', ['bond2'], ['dock:t:join']);
  place('dockB', 'dock', '拿走', ['bond2'], ['dock:t:take']);
  skill({id: 'line1', group: 'line', name: '0—10 数线', kind: 'type8', input: 'line', pre: ['cmp1'], items: [type('line:t:10')]});
  place('clockA', 'market', '整点', ['line1'], ['market:t:hour']);
  place('clockB', 'market', '半点', ['clockA'], ['market:t:half'], 'pick');
  skill({id: 'bond3', group: 'bond', name: '凑十', kind: 'card', pre: ['bond2'], items: cards('bond3')});
  place('money1', 'market', '付钱', ['bond3'], ['market:t:pay']);
  skill({id: 'cmp2', group: 'cmp', name: '20 以内谁大', kind: 'type8', input: 'pick', pre: ['cmp1', 'look4'], items: [type('cmp:t:20')]});
  // 缺数四种：□+a=b（答 b−a）、a+□=b（答 b−a）、□−a=b（答 a+b）、a−□=b（答 a−b）
  skill({id: 'bond4', group: 'bond', name: '缺数算式', kind: 'type8', pre: ['bond3'],
    items: ['addL', 'addR', 'subL', 'subR'].map(f => type('bond:t:' + f))});
  place('dockC', 'dock', '还差几个', ['bond4'], ['dock:t:need']);
  place('money2', 'market', '找零', ['bond4'], ['market:t:change']);
  // 过十准备：k + a = 10 + □（和在 11–17）
  skill({id: 'bond5', group: 'bond', name: '过十准备', kind: 'type8', pre: ['bond3', 'look4'], items: [9, 8, 7].map(k => type('bond:t:to10-' + k))});
  place('dockD', 'dock', '比多少', ['bond4', 'cmp2'], ['dock:t:more']);
  skill({id: 'line2', group: 'line', name: '0—20 数线', kind: 'type8', input: 'line', pre: ['line1', 'cmp2'], items: [type('line:t:20')]});
  // ---------- 数位（几个十和几个一） ----------
  skill({id: 'place1', group: 'place', name: '看十和一写数', kind: 'type8', pre: ['look4'],
    items: [type('place:t:read')]});
  place('gardenB', 'garden', '跳着数', ['place1'], ['garden:t:skip']);
  place('gardenC', 'garden', '找错的', ['gardenB'], ['garden:t:bad'], 'pick');
  skill({id: 'place2', group: 'place', name: '几个十几个一', kind: 'type8', pre: ['place1'],
    items: [type('place:t:split')]});
  skill({id: 'cmp3', group: 'cmp', name: '两位数谁大', kind: 'type8', input: 'pick', pre: ['cmp2', 'place2'],
    items: [type('cmp:t:100'), type('cmp:t:swap')]});
  skill({id: 'cmp4', group: 'cmp', name: '前后数', kind: 'type8', pre: ['cmp3'],
    items: ['p1', 'm1', 'p10', 'm10'].map(k => type('cmp:t:' + k))});
  skill({id: 'line3', group: 'line', name: '0—100 整十', kind: 'type8', input: 'line', pre: ['line2', 'cmp3'], items: [type('line:t:100t')]});
  skill({id: 'line4', group: 'line', name: '0—100 任意', kind: 'type8', input: 'line', pre: ['line3'], items: [type('line:t:100')]});

  const LINE_TOL = {10: 0.5, 20: 1, 100: 5, '100a': 10, 1000: 50, '1000a': 100};
  const tolOf = (q, settings) => { const key = q.any ? q.max + 'a' : q.max; return (settings && settings.lineTol && settings.lineTol[key]) || LINE_TOL[key]; };

  // ---------- 秒答地图接进图谱：L1 / L2 每个世界一个技能（卡），L3 / L4 加法、减法各一个技能（同一天合格 5 次） ----------
  const speedPre = (L, w) => {
    if (L === 0) return w === 5 ? ['bond3'] : w <= 1 || w === 6 ? [] : ['bond2'];   // 世界 2（6 以内）是零进度时第一个能练的秒答
    if (L === 1) return w === 0 ? ['look4'] : ['bond5'];
    if (L === 2) return ['place2'].concat((w === 0 ? [1, 2, 3] : [4, 5, 6, 7]).map(k => 'speed:L2:' + k)); // 50 以内进位 / 退位要先会 20 以内的进位 / 退位（28+5 用到 8+5）
    return ['speed:L3:' + w];
  };
  C.LEVELS.forEach((LV, L) => {
    const byW = {};
    C.unitsOf(L).forEach(u => (byW[u.w] = byW[u.w] || []).push(u));
    Object.keys(byW).forEach(w => {
      w = +w;
      const name = L < 2 ? `${LV.name} · ${LV.worlds[w].name}` : `${LV.name} · ${w === 0 ? '加法' : '减法'}题型`;
      skill({id: `speed:L${L + 1}:${w}`, group: 'speed', name, kind: L < 2 ? 'card' : 'day5', pre: speedPre(L, w),
        items: byW[w].map(u => u.gen ? {id: u.id, gen: () => { const g = u.gen(); return {q: {a: g.a, op: u.op, b: g.b}, ans: g.ans}; }} : {id: u.id, q: {a: u.a, op: u.op, b: u.b}, ans: u.ans}),
        speed: true, L});
    });
  });

  // ---------- 判题 ----------
  SK.forEach(s => { s.pre = s.pre.filter(p => BY[p]); });   // 被剔除的技能不再是前置

  // ---------- 高级别题（不进 SK：现有地图、奖状、伙伴不受影响。说明书-难度分级） ----------
  const HARD = [];
  const hard = o => { const s = Object.assign({hard: true, kind: 'type8', input: 'write', pre: []}, o); s.items = o.ids.map(id => ({id, skill: s.id, gen: r => { const p = HB.pools[id], x = p[C.deal(id, p.length, r)]; return {q: Object.assign({}, x.q), ans: x.ans}; }})); s.items.forEach(it => { ITEM[it.id] = it; }); BY[s.id] = s; HARD.push(s); };
  hard({id: 'lookH1', group: 'look', name: '几排几个', ids: ['look:h:grid']});
  hard({id: 'lookH2', group: 'look', name: '百格图数数', pre: ['lookH1'], ids: ['look:h:h100']});
  hard({id: 'bondH1', group: 'bond', name: '整十分合', ids: ['bond:h:tens']});
  hard({id: 'bondH2', group: 'bond', name: '凑一百', pre: ['bondH1'], ids: ['bond:h:to100']});
  hard({id: 'placeH1', group: 'place', name: '看百十个写数', ids: ['place:h:read']});
  hard({id: 'placeH2', group: 'place', name: '几个百几个十', pre: ['placeH1'], ids: ['place:h:split']});
  hard({id: 'cmpH1', group: 'cmp', name: '算式谁大', input: 'pick', ids: ['cmp:h:expr']});
  hard({id: 'cmpH2', group: 'cmp', name: '三位数谁大', input: 'pick', pre: ['cmpH1'], ids: ['cmp:h:1000']});
  hard({id: 'lineH1', group: 'line', name: '0—1000 整百', input: 'line', ids: ['line:h:1000t']});
  hard({id: 'lineH2', group: 'line', name: '0—1000 任意', input: 'line', pre: ['lineH1'], ids: ['line:h:1000']});
  hard({id: 'speedH1', group: 'speedH', name: '连加连减', ids: ['speed:h:chain']});
  hard({id: 'speedH2', group: 'speedH', name: '两位数加减两位数', pre: ['speedH1'], ids: ['speed:h:two']});
  hard({id: 'speedH3', group: 'speedH', name: '乘法 2、5、10', pre: ['speedH2'], ids: ['speed:h:mul']});
  // 11-06 分 15 级补的题（说明书-难度分级）；旧的挑战题也并进分级，家长选难度才出或自动开放
  hard({id: 'bondH3', group: 'bond', name: '20 以内分合', pre: ['bond3'], ids: ['bond:h:20']});   // 先会凑十再练 20 以内分合（捣蛋鬼第 1 轮第 6 条）
  hard({id: 'dockH1', group: 'dock', name: '20 以内应用题', ids: ['dock:h:20']});
  hard({id: 'dockH2', group: 'dock', name: '50 以内应用题', pre: ['dockH1'], ids: ['dock:h:50']});
  hard({id: 'dockH3', group: 'dock', name: '100 以内应用题', pre: ['dockH2'], ids: ['dock:h:100']});
  hard({id: 'dockH4', group: 'dock', name: '乘法应用题 2、5、10', ids: ['dock:h:mul2']});
  hard({id: 'dockH5', group: 'dock', name: '乘法应用题', pre: ['dockH4'], ids: ['dock:h:mul']});
  hard({id: 'dockH6', group: 'dock', name: '除法应用题', pre: ['dockH5'], ids: ['dock:h:div']});
  hard({id: 'marketH1', group: 'market', name: '50 元以内付钱', ids: ['market:h:pay']});
  hard({id: 'marketH2', group: 'market', name: '大钱找零', pre: ['marketH1'], ids: ['market:h:change']});
  hard({id: 'marketH3', group: 'market', name: '几点几分', ids: ['market:h:clock']});
  hard({id: 'gardenH1', group: 'garden', name: '3 和 4 跳着数', ids: ['garden:h:skip']});
  hard({id: 'gardenH2', group: 'garden', name: '倒着跳', pre: ['gardenH1'], ids: ['garden:h:down']});
  hard({id: 'speedH4', group: 'speedH', name: '表内乘法', pre: ['speedH3'], ids: ['speed:h:mul2']});
  hard({id: 'speedH5', group: 'speedH', name: '表内除法', pre: ['speedH4'], ids: ['speed:h:div']});

  // ---------- 三四年级第一批（说明书-到四年级第一批）：不进地图格子和奖励 ----------
  const g34 = (group, name, ids) => hard({id: 'g34:' + ids[0].split(':').slice(1).join(':'), group, name, ids});
  g34('speedH', '有余数除法', ['speed:g10:rem', 'speed:g10:quo']); g34('speedH', '三位数加减', ['speed:g10:add3', 'speed:g10:sub3']); g34('place', '千位', ['place:g10:thou']);
  g34('market', '单位换算', ['market:g10:conv']); g34('market', '经过时间', ['market:g10:span']); g34('dock', '余数应用题', ['dock:g10:remain']); g34('dock', '两步应用题', ['dock:g10:two']);
  g34('speedH', '乘一位数', ['speed:g11:mul']); g34('speedH', '除以一位数', ['speed:g11:div', 'speed:g11:divrem']); g34('dock', '周长', ['dock:g11:perim']); g34('dock', '倍', ['dock:g11:times']); g34('dock', '买东西和剩下', ['dock:g11:two']); g34('dock', '速度和路程', ['dock:g11:speed']); g34('dock', '一半和四分之一', ['dock:g11:part']);
  g34('speedH', '两位数乘两位数', ['speed:g12:mul2']); g34('speedH', '一位小数', ['speed:g12:dec']); g34('dock', '面积', ['dock:g12:area']); g34('dock', '单价和总价', ['dock:g12:price']); g34('market', '24 时', ['market:g12:24']); g34('market', '年月周天', ['market:g12:year']);
  g34('speedH', '乘两位数', ['speed:g13:mul3']); g34('speedH', '两位除数', ['speed:g13:div2']); g34('speedH', '四则混合', ['speed:g13:order']); g34('place', '取整', ['place:g13:round']); g34('dock', '归一', ['dock:g13:unit']); g34('dock', '路程', ['dock:g13:speed']); g34('dock', '平均分', ['dock:g13:share']);
  g34('speedH', '运算律', ['speed:g14:law', 'speed:g14:lawfill']); g34('speedH', '两位小数', ['speed:g14:dec2']); g34('speedH', '小数点移动', ['speed:g14:move']); g34('dock', '平均数', ['dock:g14:avg']); g34('dock', '相遇', ['dock:g14:meet']); g34('dock', '内角和', ['dock:g14:tri']); g34('market', '小数换算', ['market:g14:unit']);
  g34('place', '公倍数', ['place:g15:lcm']); g34('place', '公因数', ['place:g15:gcd']); g34('dock', '多步应用题', ['dock:g15:three']); g34('dock', '和差', ['dock:g15:sumdiff']); g34('dock', '和倍差倍', ['dock:g15:timessum']); g34('dock', '鸡兔同笼', ['dock:g15:legs']); g34('dock', '年龄', ['dock:g15:age']);
  // 第二批 2a（说明书-到四年级第二批）：late = 引入 lvMax 之后加的（迁移不算它们，见 engine.js FROZEN）；concept = 第一次碰到时出讲解卡
  const g2 = (group, name, ids, concept, o) => hard(Object.assign({id: 'g34:' + ids[0].split(':').slice(1).join(':'), group, name, ids, late: true, concept}, o));
  g2('dock', '线段图', ['dock:g7:bar'], 'bar'); g2('dock', '条形图', ['dock:g8:chart'], 'chart'); g2('place', '边长相加', ['place:g8:side'], 'perim');
  g2('dock', '条形图比较', ['dock:g9:chart2'], 'chart'); g2('dock', '倍的线段图', ['dock:g9:times'], 'times'); g2('dock', '和倍入门', ['dock:g9:sumtimes'], 'bar');
  g2('dock', '一格代表几', ['dock:g10:chart5'], 'chart'); g2('dock', '看图求周长', ['dock:g11:perim2'], 'perim'); g2('place', '数方格求面积', ['place:g12:area2'], 'area');
  g2('cmp', '小数比大小', ['cmp:g12:deccmp'], 'dec', {input: 'pick'}); g2('cmp', '两位小数比大小', ['cmp:g14:deccmp'], 'dec', {input: 'pick'}); g2('dock', '和差线段图', ['dock:g15:barsum'], 'bar');
  // 第二批 2b-1 分数：只问一个整数（说明书-到四年级第二批 §2b-1）
  g2('dock', '分数读图', ['dock:g11:fracbar'], 'frac'); g2('speedH', '同分母加减', ['speed:g12:fracadd'], 'fracadd'); g2('cmp', '分数比大小', ['cmp:g12:fraccmp'], 'fraccmp', {input: 'pick'});
  g2('cmp', '同分子比大小', ['cmp:g15:fraccmp2'], 'fraccmp2', {input: 'pick'}); g2('speedH', '等值分数', ['speed:g15:equiv'], 'equiv');
  // 第一批已上线、当时没讲解的技能也挂上概念（第二批 §2）
  Object.entries({'g34:g10:rem': 'rem', 'g34:g11:div': 'rem', 'g34:g10:remain': 'rem', 'g34:g11:perim': 'perim', 'g34:g12:area': 'area', 'g34:g11:times': 'times', 'g34:g14:avg': 'avg', 'g34:g15:lcm': 'factor', 'g34:g15:gcd': 'factor', 'g34:g12:dec': 'dec', 'g34:g11:part': 'frac'}).forEach(([id, c]) => { BY[id].concept = c; });

  // ---------- 15 级难度（说明书-难度分级）：每道题一个级别，按题算，题库数据不改 ----------
  // ---------- 级别说明（中控 11-08，Ben：「新内容加入时定级没有增补和调整」）----------
  // 每一级的说明 = 这一级实际出的内容词，按顺序拼起来；每个技能在 TOPIC 里写一个内容词。
  // tests/levels.test.js 逐级核对：这一级出的每个技能的内容词都在说明里，说明里的每个词这一级都真的出。新增技能不写 TOPIC、不改说明，测试就拦。
  const LEVEL_TOPICS = [
    ['10 以内的数与分合', ['看数', '比大小', '数线', '6–9 分合', '整点', '接规律', '加减应用题', '10 以内秒答']],
    ['凑十', ['凑十', '缺数算式', '加减应用题', '10 以内秒答']],
    ['20 以内的数', ['十格框', '比大小', '数线', '十几加减几', '20 以内分合']],
    ['20 以内进位退位', ['过十加减', '过十准备', '20 以内分合', '半点', '付钱', '找零', '应用题']],
    ['100 以内的数', ['数位', '比大小', '前后数', '数线', '跳着数', '找错的', '几排几个']],
    ['两位数加减一位数', ['进退位加减', '连加连减', '整十分合', '算式比大小', '付钱', '3 和 4 跳着数', '应用题']],
    ['两位数加减两位数', ['进退位加减', '两位数加减两位数', '凑一百', '百格图', '几点几分', '找零', '倒着跳', '应用题', '线段图']],
    ['三位数与乘法入门', ['百十个', '三位数比大小', '0—1000 数线', '乘法入门', '乘法应用题', '条形图', '边长相加']],
    ['表内乘除', ['全部口诀', '表内除法', '乘法应用题', '除法应用题', '条形图比较', '倍的线段图', '和倍入门']],
    ['万以内的数与有余数除法', ['余数', '三位数加减', '千位', '千克和千米', '经过时间', '余数应用题', '两步应用题', '一格代表几']],
    ['乘除一位数', ['多位数乘除一位数', '周长', '看图求周长', '倍', '速度', '买东西', '一半和四分之一', '分数读图']],
    ['两位数乘法与小数入门', ['两位数乘两位数', '一位小数', '小数比大小', '面积', '数方格求面积', '单价', '24 时', '年月日', '同分母加减', '分数比大小']],
    ['多位数乘除与四则混合', ['三位数乘两位数', '两位除数', '四则混合', '取整', '归一', '路程', '平均分']],
    ['运算律与两位小数', ['简便算', '两位小数', '两位小数比大小', '小数点移动', '小数换算', '平均数', '相遇', '内角和']],
    ['综合应用', ['公倍数', '公因数', '多步应用题', '和差', '和倍差倍', '和差线段图', '鸡兔同笼', '年龄', '同分子比大小', '等值分数']],
  ];
  const LEVELS = LEVEL_TOPICS.map(([name, topics], i) => ({n: i + 1, name, topics, what: topics.join('、')}));
  // 技能 → 内容词。秒答地图的世界按所在级别统一写
  const TOPIC = {
    look1: '看数', look3: '看数', look4: '十格框', cmp1: '比大小', cmp2: '比大小', cmp3: '比大小', cmp4: '前后数', line1: '数线', line2: '数线', line3: '数线', line4: '数线',
    bond2: '6–9 分合', bond3: '凑十', bond4: '缺数算式', bond5: '过十准备', place1: '数位', place2: '数位', clockA: '整点', clockB: '半点', money1: '付钱', money2: '找零',
    gardenA: '接规律', gardenB: '跳着数', gardenC: '找错的', dockA: '加减应用题', dockB: '加减应用题', dockC: '加减应用题', dockD: '加减应用题',
    lookH1: '几排几个', lookH2: '百格图', bondH1: '整十分合', bondH2: '凑一百', bondH3: '20 以内分合', placeH1: '百十个', placeH2: '百十个', cmpH1: '算式比大小', cmpH2: '三位数比大小',
    lineH1: '0—1000 数线', lineH2: '0—1000 数线', speedH1: '连加连减', speedH2: '两位数加减两位数', speedH3: '乘法入门', speedH4: '全部口诀', speedH5: '表内除法',
    dockH1: '应用题', dockH2: '应用题', dockH3: '应用题', dockH4: '乘法应用题', dockH5: '乘法应用题', dockH6: '除法应用题', marketH1: '付钱', marketH2: '找零', marketH3: '几点几分', gardenH1: '3 和 4 跳着数', gardenH2: '倒着跳',
    'g34:g10:rem': '余数', 'g34:g10:add3': '三位数加减', 'g34:g10:thou': '千位', 'g34:g10:conv': '千克和千米', 'g34:g10:span': '经过时间', 'g34:g10:remain': '余数应用题', 'g34:g10:two': '两步应用题',
    'g34:g11:mul': '多位数乘除一位数', 'g34:g11:div': '多位数乘除一位数', 'g34:g11:perim': '周长', 'g34:g11:times': '倍', 'g34:g11:two': '买东西', 'g34:g11:speed': '速度', 'g34:g11:part': '一半和四分之一',
    'g34:g12:mul2': '两位数乘两位数', 'g34:g12:dec': '一位小数', 'g34:g12:area': '面积', 'g34:g12:price': '单价', 'g34:g12:24': '24 时', 'g34:g12:year': '年月日',
    'g34:g13:mul3': '三位数乘两位数', 'g34:g13:div2': '两位除数', 'g34:g13:order': '四则混合', 'g34:g13:round': '取整', 'g34:g13:unit': '归一', 'g34:g13:speed': '路程', 'g34:g13:share': '平均分',
    'g34:g14:law': '简便算', 'g34:g14:dec2': '两位小数', 'g34:g14:move': '小数点移动', 'g34:g14:avg': '平均数', 'g34:g14:meet': '相遇', 'g34:g14:tri': '内角和', 'g34:g14:unit': '小数换算',
    'g34:g15:lcm': '公倍数', 'g34:g15:gcd': '公因数', 'g34:g15:three': '多步应用题', 'g34:g15:sumdiff': '和差', 'g34:g15:timessum': '和倍差倍', 'g34:g15:legs': '鸡兔同笼', 'g34:g15:age': '年龄',
    'g34:g7:bar': '线段图', 'g34:g8:chart': '条形图', 'g34:g8:side': '边长相加', 'g34:g9:chart2': '条形图比较', 'g34:g9:times': '倍的线段图', 'g34:g9:sumtimes': '和倍入门', 'g34:g10:chart5': '一格代表几',
    'g34:g11:perim2': '看图求周长', 'g34:g12:area2': '数方格求面积', 'g34:g12:deccmp': '小数比大小', 'g34:g14:deccmp': '两位小数比大小', 'g34:g15:barsum': '和差线段图',
    'g34:g11:fracbar': '分数读图', 'g34:g12:fracadd': '同分母加减', 'g34:g12:fraccmp': '分数比大小', 'g34:g15:fraccmp2': '同分子比大小', 'g34:g15:equiv': '等值分数',
  };
  // 秒答地图（speed:Lx:y）按级别：第 1–2 级「10 以内秒答」，第 3 级十几加减几，第 4 级过十加减，第 6–7 级进退位加减
  const SPEED_TOPIC = {1: '10 以内秒答', 2: '10 以内秒答', 3: '十几加减几', 4: '过十加减', 6: '进退位加减', 7: '进退位加减'};
  const topicOf = (s, lv) => s.speed ? SPEED_TOPIC[lv] : TOPIC[s.id];
  // ---------- 错题按知识点分组（家长页用，F 的 docs/方案-错题数据字段.md；中控 11-08）----------
  // 类别 → 技能；家长看得懂的说法，粒度参考 docs/原型/错题-家长视角。同一技能里题型知识点不同的，在 MIST_CAT_ITEM 按题型单独归。
  // 只是显示时的映射，错题数据按技能存，改类别不用迁移。tests/mistcat.test.js：每个技能、每个题型都有且只有一个类别
  const MIST_GROUPS = [
    ['看图数数', ['look1', 'look3', 'look4', 'lookH1', 'lookH2']],
    ['数的分合', ['bond2', 'bondH3']], ['凑十', ['bond3', 'bond5']], ['缺数算式', ['bond4']], ['整十、整百分合', ['bondH1', 'bondH2']],
    ['10 以内加减', ['speed:L1:1', 'speed:L1:2', 'speed:L1:3', 'speed:L1:4', 'speed:L1:5']], ['十几加减几', ['speed:L2:0']],
    ['20 以内进位加法', ['speed:L2:1', 'speed:L2:2', 'speed:L2:3']], ['20 以内退位减法', ['speed:L2:4', 'speed:L2:5', 'speed:L2:6', 'speed:L2:7']],
    ['100 以内加法', ['speed:L3:0', 'speed:L4:0']], ['100 以内减法', ['speed:L3:1', 'speed:L4:1']], ['两位数加减两位数', ['speedH2']], ['连加连减', ['speedH1']],
    ['20 以内比大小', ['cmp1', 'cmp2']], ['两位数比大小', ['cmp3']], ['三位数比大小', ['cmpH2']], ['前后数', ['cmp4']], ['算式比大小', ['cmpH1']],
    ['数线', ['line1', 'line2', 'line3', 'line4', 'lineH1', 'lineH2']],
    ['两位数的数位', ['place1', 'place2']], ['百、千的数位', ['placeH1', 'placeH2', 'g34:g10:thou']], ['取整（四舍五入）', ['g34:g13:round']],
    ['找规律', ['gardenA', 'gardenC']], ['跳着数', ['gardenB', 'gardenH1', 'gardenH2']],
    ['认钟', ['clockA', 'clockB', 'marketH3']], ['时间计算', ['g34:g10:span', 'g34:g12:24', 'g34:g12:year']], ['付钱和找零', ['money1', 'money2', 'marketH1', 'marketH2']], ['单位换算', ['g34:g10:conv', 'g34:g14:unit']],
    ['表内乘除', ['speedH3', 'speedH4', 'speedH5']], ['有余数除法', ['g34:g10:rem', 'g34:g10:remain']],
    ['三位数加减', ['g34:g10:add3']], ['多位数乘法', ['g34:g11:mul', 'g34:g12:mul2', 'g34:g13:mul3']], ['多位数除法', ['g34:g11:div', 'g34:g13:div2']],
    ['四则混合运算', ['g34:g13:order']], ['简便运算', ['g34:g14:law']],
    ['小数加减', ['g34:g12:dec', 'g34:g14:dec2']], ['小数比大小', ['g34:g12:deccmp', 'g34:g14:deccmp']], ['小数点移动', ['g34:g14:move']],
    ['认识分数', ['g34:g11:fracbar', 'g34:g11:part']], ['分数加减', ['g34:g12:fracadd']], ['分数比大小', ['g34:g12:fraccmp', 'g34:g15:fraccmp2']], ['等值分数', ['g34:g15:equiv']],
    ['加减应用题', ['dockA', 'dockB', 'dockC', 'dockD', 'dockH1', 'dockH2', 'dockH3']], ['乘除应用题', ['dockH4', 'dockH5', 'dockH6']],
    ['两步、多步应用题', ['g34:g10:two', 'g34:g11:two', 'g34:g15:three']], ['线段图应用题', ['g34:g7:bar']], ['倍', ['g34:g9:times', 'g34:g11:times']],
    ['和倍差倍', ['g34:g9:sumtimes', 'g34:g15:timessum']], ['和差', ['g34:g15:sumdiff', 'g34:g15:barsum']],
    ['路程和速度', ['g34:g11:speed', 'g34:g13:speed', 'g34:g14:meet']], ['单价和归一', ['g34:g12:price', 'g34:g13:unit']], ['平均分和平均数', ['g34:g13:share', 'g34:g14:avg']],
    ['鸡兔同笼', ['g34:g15:legs']], ['年龄问题', ['g34:g15:age']],
    ['条形图读数', ['g34:g8:chart', 'g34:g9:chart2', 'g34:g10:chart5']],
    ['周长', ['g34:g8:side', 'g34:g11:perim', 'g34:g11:perim2']], ['面积', ['g34:g12:area', 'g34:g12:area2']], ['三角形内角和', ['g34:g14:tri']],
    ['公倍数和公因数', ['g34:g15:lcm', 'g34:g15:gcd']],
  ];
  const MIST_CAT = {}; MIST_GROUPS.forEach(([cat, ids]) => ids.forEach(id => { MIST_CAT[id] = cat; }));
  const MIST_CAT_ITEM = {'speed:g11:divrem': '有余数除法'};   // 「除以一位数」里商和余数一起写的题型
  // 题型编号或技能编号 → 类别；查不到返回 null（测试保证不会）
  const mistCat = id => MIST_CAT_ITEM[id] || MIST_CAT[id] || (ITEM[id] && MIST_CAT[ITEM[id].skill]) || null;
  // 思维地点（puzzles.js，自由练习，不进每日排课）每一档的建议级别：孩子到这一级大概就能玩。只做家长区参考，不锁
  // 天平桥：两边和在 7–15，过十 → 第 4 级起；凑数矿：只用加、10 以内 → 第 2 级，带减、15–20 → 第 4 级；
  // 线索营地：三行 / 四行 / 粗线框的数独式推理，数字只到 4 → 按推理步数排；方块工坊：轴对称是二年级下（第 8 级），旋转更难（第 11、13 级）
  const THINK_LEVEL = {balance: [3, 4, 4, 4], target: [2, 4, 4], clue: [2, 3, 5, 5], block: [8, 8, 11, 13]};
  const SKILL_LEVEL = {look1: 1, look3: 1, look4: 4, cmp1: 1, cmp2: 4, cmp3: 7, cmp4: 7, line1: 1, line2: 4, line3: 7, line4: 7, bond2: 2, bond3: 3, bond4: 3, bond5: 5, place1: 7, place2: 7,
    gardenA: 1, gardenB: 7, gardenC: 7, clockA: 2, clockB: 6, money2: 6,
    lookH1: 7, lookH2: 10, bondH1: 9, placeH1: 12, placeH2: 12, cmpH1: 9, cmpH2: 12, lineH1: 12, lineH2: 12, speedH1: 9, speedH2: 11, speedH3: 13, speedH4: 14, speedH5: 15,
    dockH1: 6, dockH2: 9, dockH3: 11, dockH4: 13, dockH5: 14, dockH6: 15, marketH1: 9, marketH2: 11, marketH3: 10, gardenH1: 9, gardenH2: 10};
  const SPEED_L1 = {1: 2, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3}, SPEED_L2 = {0: 4, 1: 5, 2: 5, 3: 5, 4: 6, 5: 6, 6: 6, 7: 6};
  const SPEED_TYPE = {add10: 8, addT: 8, sub10: 8, subT: 8, add1n: 8, sub1n: 8, add1c: 9, sub1c: 9, add2n: 10, sub2n: 10, add2c: 11, sub2c: 11};
  function levelOfQ(id, q, ans) { const g = /:g(\d+):/.exec(id); return g ? +g[1] : C.LEVEL_REMAP[oldLevelOfQ(id, q, ans)]; }
  function oldLevelOfQ(id, q, ans) {
    const it = ITEM[id], s = BY[it.skill];
    if (s.speed) { const u = C.BYID[id]; return u.L === 0 ? SPEED_L1[u.w] : u.L === 1 ? SPEED_L2[u.w] : SPEED_TYPE[id.split(':')[1]]; }
    if (SKILL_LEVEL[s.id]) return SKILL_LEVEL[s.id];
    if (s.id === 'money1') return ans <= 10 ? 5 : 8;
    if (s.id === 'bondH2') return /^\d*0 \+/.test(q.text) ? 10 : 11;                     // 凑一百：整十第 10 级，要退位的第 11 级
    if (s.id === 'bondH3') { const a = +q.text.match(/= (\d+)/)[1]; return a >= 10 || ans >= 10 ? 4 : 6; }   // 20 以内分合：含十的第 4 级，要过十的第 6 级
    if (s.group === 'dock') return Math.max(q.a || 0, q.b || 0, ans) <= 8 ? 2 : 3;   // 故事码头原来的题：8 以内第 2 级，9、10 第 3 级
    return 0;
  }
  const levelOf = inst => levelOfQ(inst.id, inst.q || {}, inst.ans);
  // 一格里有哪几级的题（只算一次）
  const IL = {};
  function itemLevels(id) {
    if (IL[id]) return IL[id];
    const it = ITEM[id], s = BY[it.skill], set = new Set();
    if (!it.gen) set.add(levelOfQ(id, it.q, it.ans));
    else if (s.speed) set.add(levelOfQ(id, {}, 0));
    else (rawPool(id) || []).forEach(x => set.add(levelOfQ(id, x.q, x.ans)));
    return (IL[id] = [...set].sort((a, b) => a - b));
  }

  // 输入：write → 写的数字；pick → 点的那个数；line → 放的位置（数值）
  function judge(item, inst, input, settings) {
    const s = BY[item.skill];
    if (s.input === 'line') { const err = Math.abs(input - inst.ans); return {ok: err < tolOf(inst.q, settings) || err === 0, err}; }
    return {ok: input === inst.ans};
  }
  const rawPool = id => (ITEM[id].gen && !B.pools[id] && !HB.pools[id] && !NB.pools[id]) ? null : (B.pools[id] ? pool(id) : HB.pools[id] || NB.pools[id]);
  // 出一道题：卡用固定题，题型每次新数字；fixed 给错题复习用（原题原数）
  function make(itemId, r, fixed) {
    const it = ITEM[itemId];
    if (fixed) return {id: itemId, q: fixed.q, ans: fixed.ans};
    if (it.gen) { const g = it.gen(r || Math.random); return {id: itemId, q: g.q, ans: g.ans}; }
    return {id: itemId, q: it.q, ans: it.ans};
  }
  // 错题编号：卡 = 卡编号；题型 = 编号 | 题目数据
  // 新题带固定短编号 q.qk：键短，改讲解不换键；旧题的键一字不改
  const mkey = inst => !ITEM[inst.id].gen ? inst.id : inst.q && inst.q.qk ? inst.id + '|' + inst.q.qk : inst.id + '|' + JSON.stringify(inst.q);
  // 固定例题（示范卡用，不受发牌影响）：卡 = 卡本身；题型 = 题库池第 1 道；秒答题型 = 池第 1 道
  function example(itemId) {
    const it = ITEM[itemId]; if (!it.gen) return {id: itemId, q: it.q, ans: it.ans};
    const p = rawPool(itemId); if (p) return {id: itemId, q: Object.assign({}, p[0].q), ans: p[0].ans};
    const u = C.BYID[itemId], [a, b] = B.speedPools[itemId].pool[0]; return {id: itemId, q: {a, op: u.op, b}, ans: u.op === '+' ? a + b : a - b};
  }
  const isType = itemId => !!ITEM[itemId].gen;

  // ---------- 秒答时间（说明书-秒答时间）：想的时间（秒，按题型定）+ 读题 + 写字；秒答才算学会 ----------
  // 新增题型必须在这里定时间（tests/fasttime.test.js 会拦）；秒答卡和题型沿用 core.js 的 fast
  const FAST_THINK = {
    look1: 3, look3: 3, look4: 3, lookH1: 4, lookH2: 4,
    bond1: 3, bond2: 3, bond3: 3, bond4: 3, bond5: 3, bondH1: 3, bondH2: 4, bondH3: 3,
    place1: 3, place2: 3, placeH1: 3, placeH2: 4,
    cmp1: 2, cmp2: 2, cmp3: 2, cmp4: 3, cmpH1: 5, cmpH2: 3,
    line1: 4, line2: 4, line3: 4, line4: 5, lineH1: 5, lineH2: 6,
    speedH1: 6, speedH2: 6, speedH3: 3, speedH4: 3, speedH5: 3,
    gardenA: 4, gardenB: 4, gardenC: 5, gardenH1: 6, gardenH2: 6,
    clockA: 3, clockB: 4, money1: 5, money2: 4, marketH1: 6, marketH2: 4, marketH3: 5,
    dockA: 3, dockB: 3, dockC: 4, dockD: 4, dockH1: 4, dockH2: 5, dockH3: 6, dockH4: 4, dockH5: 4, dockH6: 5,
    'speed:g10:rem': 5, 'speed:g10:quo': 5, 'speed:g10:add3': 12, 'speed:g10:sub3': 12, 'place:g10:thou': 4, 'market:g10:conv': 6, 'market:g10:span': 6, 'dock:g10:remain': 6, 'dock:g10:two': 20,
    'speed:g11:mul': 15, 'speed:g11:div': 20, 'speed:g11:divrem': 8, 'dock:g11:perim': 10, 'dock:g11:times': 15, 'dock:g11:two': 15, 'dock:g11:speed': 10, 'dock:g11:part': 15,
    'speed:g12:mul2': 30, 'speed:g12:dec': 8,   /* 小数加减写完整得数（11-08）：整数部分也要算，一位 8 秒、两位 12 秒 */ 'dock:g12:area': 25, 'dock:g12:price': 30, 'market:g12:24': 4, 'market:g12:year': 15,
    'speed:g13:mul3': 45, 'speed:g13:div2': 25, 'speed:g13:order': 20, 'place:g13:round': 5, 'dock:g13:unit': 25, 'dock:g13:speed': 25, 'dock:g13:share': 25,
    'speed:g14:law': 12, 'speed:g14:lawfill': 6, 'speed:g14:dec2': 12, 'speed:g14:move': 5, 'dock:g14:avg': 20, 'dock:g14:meet': 25, 'dock:g14:tri': 6, 'market:g14:unit': 4,
    'dock:g7:bar': 8, 'dock:g8:chart': 5, 'place:g8:side': 10, 'dock:g9:chart2': 8, 'dock:g9:times': 10, 'dock:g9:sumtimes': 15, 'dock:g10:chart5': 8, 'dock:g11:perim2': 12, 'place:g12:area2': 10, 'cmp:g12:deccmp': 6, 'cmp:g14:deccmp': 8, 'dock:g15:barsum': 20,
    'dock:g11:fracbar': 6, 'speed:g12:fracadd': 6, 'cmp:g12:fraccmp': 5, 'cmp:g15:fraccmp2': 5, 'speed:g15:equiv': 8,   // 2b-1 分数：A 估计值，B 按真实用时定
    'place:g15:lcm': 10, 'place:g15:gcd': 10, 'dock:g15:three': 30, 'dock:g15:sumdiff': 20, 'dock:g15:timessum': 20, 'dock:g15:legs': 25, 'dock:g15:age': 8,
  };
  const READ_MS = 400, EN_READ = 1.5;   // 题面每个汉字；英文日读得慢，多给一半（按中文字数估）
  const fastThink = id => (C.BYID[id] ? C.BYID[id].fast / 1000 : FAST_THINK[id] || FAST_THINK[ITEM[id].skill]);

  // ---------- 秒答时间分类（Ben 11-08：难题和简单题的秒答时间不同；说明书-秒答时间 §分类） ----------
  // 每个题型归一类；lo / hi 是这一类「想的时间」的合理范围（秒），新题型定的时间不在范围里 tests/fastclass.test.js 会拦
  // 秒答卡和多位笔算按这一道题现算（进退位、位数），其他类按 FAST_THINK 的题型时间（已按步骤数定）+ 读题 + 写字
  const FAST_CLASS = {
    card:   {name: '口算卡', lo: 2, hi: 6, how: '10 / 20 以内一步 2–3 秒；两位数不进退位 3–4 秒、进退位 5–6 秒（两个两位数多 1 秒）'},
    short:  {name: '短题（看图数数、分与合、数位、一步口诀）', lo: 3, hi: 6, how: '一步想出 3 秒，要换算或两步的 4–6 秒'},
    pick:   {name: '点选（比大小、钟面、找规律）', lo: 2, hi: 8, how: '比大小 2 秒，要先算的 3–5 秒，三四年级小数比大小（先对齐数位）6–8 秒；不写字'},
    line:   {name: '数线估位', lo: 4, hi: 6, how: '拖到大概位置，100 以内 4–5 秒，1000 以内 5–6 秒'},
    word:   {name: '读题题（应用题、钟面、钱币、规律口述）', lo: 3, hi: 30, how: '按步骤数 3–30 秒，另按题面字数加读题时间'},
    multi:  {name: '三四年级算式（递等式、简便算、小数、余数）', lo: 4, hi: 20, how: '按步骤数 4–20 秒'},
    column: {name: '多位笔算（竖式加减乘除）', lo: 6, hi: 60, how: '按这道题现算：每位 2.5 秒、每次进退位 1.5 秒；乘法每次一位乘一位 3.5 秒；除法商每位 6 秒（除数两位 11 秒）；中间写的积和余数算写字'},
  };
  const COLUMN = ['speed:g10:add3', 'speed:g10:sub3', 'speed:g11:mul', 'speed:g12:mul2', 'speed:g13:mul3', 'speed:g11:div', 'speed:g13:div2'];   // 和 vert.js 的竖式题型同一批
  const CLS = {};
  function fastClass(id) {
    if (CLS[id]) return CLS[id];
    const s = BY[ITEM[id].skill];
    let c;
    if (C.BYID[id]) c = 'card';
    else if (COLUMN.includes(id)) c = 'column';
    else if (s.input === 'line') c = 'line';
    else if (s.input === 'pick') c = 'pick';
    else { const q = example(id).q || {}; c = q.say ? 'word' : /:g\d+:/.test(id) ? 'multi' : 'short'; }
    return (CLS[id] = c);
  }
  // 多位笔算：按数字算想的时间（秒）和中间要写的位数（进位、积、余数；答案另算）
  const nd = n => String(n).length, dg = (n, i) => Math.floor(n / Math.pow(10, i)) % 10;
  function carries(a, op, b) {
    let c = 0, k = 0;
    for (let i = 0, n = Math.max(nd(a), nd(b)); i < n; i++) { const v = op === '+' ? dg(a, i) + dg(b, i) + c : dg(a, i) - dg(b, i) - c; c = op === '+' ? (v >= 10 ? 1 : 0) : (v < 0 ? 1 : 0); k += c; }
    return k;
  }
  function column(inst) {
    const m = String((inst.q || {}).text || '').match(/^(\d+) ([+−×÷-]) (\d+) =$/); if (!m) return null;
    const a = +m[1], op = m[2] === '−' ? '-' : m[2], b = +m[3];
    if (op === '+' || op === '-') { const k = carries(a, op, b); return {think: 2 + 2.5 * Math.max(nd(a), nd(b)) + 1.5 * k, work: k}; }
    if (op === '×') {
      let t = 2, work = 0; const parts = [];
      for (let j = 0; j < nd(b); j++) { let c = 0; for (let i = 0; i < nd(a); i++) { c = Math.floor((dg(a, i) * dg(b, j) + c) / 10); t += 3.5 + (c ? 1 : 0); } parts.push(a * dg(b, j)); }
      if (parts.length > 1) { parts.forEach(p => { work += nd(p); }); t += 2.5 * nd(inst.ans) + 1.5 * carries(parts[0], '+', parts[1] * 10); }
      return {think: t, work};
    }
    const qd = nd(inst.ans); return {think: 2 + (b < 10 ? 6 : 11) * qd, work: 2 * qd * nd(b)};   // 除法：每位商 试商、乘、减（写乘积和余数）
  }
  // 想的时间（毫秒）：秒答卡按卡、多位笔算按这道题、其他按题型
  function thinkMs(inst) {
    const col = fastClass(inst.id) === 'column' && column(inst);
    return (col ? col.think : fastThink(inst.id) || 5) * 1000;
  }
  // o = {oral, speed, en}：speed 是测到的写一个数字的用时（INKS.speed），en 英文日
  function fastMs(inst, o) {
    o = o || {};
    const s = BY[ITEM[inst.id].skill], q = inst.q || {}, read = (String(q.say || q.text || '').match(/[\u4e00-\u9fff]/g) || []).length * READ_MS * (o.en ? EN_READ : 1);
    const col = fastClass(inst.id) === 'column' && column(inst), sp = o.speed || 1000;
    // 竖式中间的数（积、余数、进位）口答也得算出来记住，照样给时间；答案本身口答不用写
    const write = s.input === 'write' ? (o.oral ? 0 : sp * C.digits(inst.ans)) + (col ? sp * col.work : 0) : 0;
    return thinkMs(inst) + read + write;
  }
  // 题库页：这个题型想的时间（按题算的写范围）
  const LB = {};
  function fastLabel(id) {
    if (LB[id]) return LB[id];
    if (fastClass(id) !== 'column') return (LB[id] = fastThink(id) + ' 秒');
    const ts = (rawPool(id) || []).map(x => thinkMs({id, q: x.q, ans: x.ans}) / 1000);
    const lo = Math.min(...ts), hi = Math.max(...ts);
    return (LB[id] = ts.length ? (lo === hi ? lo : lo + '–' + hi) + ' 秒，按进位和位数' : fastThink(id) + ' 秒');
  }
  // 三四年级多位计算和文字题：写到一半会停下想，不算写完
  const slowWrite = inst => /:g\d+:/.test(inst.id);

  // 前置关系检查（测试用）：所有前置都存在、没有环
  function topoOk() {
    const seen = new Set(), stack = new Set();
    const visit = id => { if (stack.has(id)) return false; if (seen.has(id)) return true; stack.add(id); const ok = BY[id].pre.every(p => BY[p] && visit(p)); stack.delete(id); seen.add(id); return ok; };
    return SK.every(s => visit(s.id));
  }

  return {LEVELS, TOPIC, topicOf, THINK_LEVEL, MIST_GROUPS, MIST_CAT, mistCat, levelOf, levelOfQ, itemLevels, pool, rawPool, SKILLS: SK, HARD, BY, ITEM, judge, make, mkey, isType, example, topoOk, tolOf, LINE_TOL, fastThink, fastMs, slowWrite, FAST_CLASS, fastClass, thinkMs, fastLabel,
    understand: SK.filter(s => !s.speed), speed: SK.filter(s => s.speed)};
});
