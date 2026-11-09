// 空空数学岛 · 家的奖励清单和解锁判断（纯逻辑，无 DOM；画面和手势在 house.js）
// 全部从进度算出来；得到过的记在 S.home.got，只增不减；旧进度第一次打开时补发。不是积分，不能花（说明书-v5-家）
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./skills.js'), require('./engine.js'));
  else root.HOME = factory(root.SM, root.SKILLS, root.ENGINE);
})(typeof self !== 'undefined' ? self : this, function (C, K, E) {
  'use strict';
  const DAY_SEC = 300, DAY_N = 10;
  const PLACES = [['look', '看数草原'], ['bond', '分合矿洞'], ['place', '数位村庄'], ['cmp', '比大小双塔'], ['line', '数线铁轨'], ['garden', '规律花园'], ['market', '钟楼集市'], ['dock', '故事码头']];
  const LV = C.LEVELS.map((l, i) => ['speed:L' + (i + 1), '秒答 ' + l.name]);
  const inGroup = (s, g) => (s.speed ? 'speed:L' + (s.L + 1) : s.group) === g;
  const cells = g => K.SKILLS.filter(s => inGroup(s, g)).flatMap(s => s.items);
  // 三四年级（K.HARD，第 4–15 级）：按级别发奖状和伙伴（C 方案 11-09：A 审查发现练了拿不到奖励）。一格算在它最高的那一级
  const HARD = K.HARD || [], ALLSK = K.SKILLS.concat(HARD);
  const lvOfSkill = s => Math.max(...s.items.map(i => Math.max(...K.itemLevels(i.id))));
  // 第 4、5 级的三四年级技能只有 3 个（各 1 格），合成一组，免得 1 格就换一张奖状加一只伙伴（审查 11-09）；组名用最高那一级
  const groupOf = n => (n <= 5 ? 5 : n), lvsOf = g => (g === 5 ? [4, 5] : [g]);
  const HARD_LV = [...new Set(HARD.map(s => groupOf(lvOfSkill(s))))].sort((a, b) => a - b);
  const lvCells = g => HARD.filter(s => groupOf(lvOfSkill(s)) === g).flatMap(s => s.items);

  function stats(S) {
    const all = ALLSK.flatMap(s => s.items), lv = id => E.lv(S, id) || 0;   // 格子、道具按全部技能算（含三四年级）
    const practiced = new Set(); // 这一天算「练过」：练满 5 分钟或今天的题做完了（防止每天答 1 题刷奖励，也不亏待都学会了的孩子）；秒答（含 v1 旧日子）不进时长，答满 10 题算
    Object.entries(S.stats || {}).forEach(([d, v]) => { if (v && (v.sec >= DAY_SEC || v.done)) practiced.add(d); });
    Object.entries(S.log || {}).forEach(([d, v]) => { if (v && v.n >= DAY_N) practiced.add(d); });
    const days = practiced.size;
    const fullDays = Object.values(S.stats || {}).filter(d => d.sec >= 600).length;
    const ms = Object.values(S.mistakes || {});
    return {
      S, iron: all.filter(i => lv(i.id) >= 1).length, gold: all.filter(i => lv(i.id) >= 2).length, diamond: all.filter(i => lv(i.id) >= 3).length, total: all.length,
      days, fullDays, passed: ms.filter(m => m.passes >= 1 || m.due === null).length, solved: ms.filter(m => m.due === null).length,   // 错题真的会了 = 复习满 5 次，或秒答满 3 次被下架（m.out，项目里「学会」的标准，比 5 次复习更严）。C 方案 4 甲，F、中控 11-09 同意；F 的合并口径和错题记录不动
      learned: ALLSK.filter(s => s.items.every(i => lv(i.id) >= 1)).length,
      started: PLACES.concat([['speed', '']]).filter(([g]) => ALLSK.some(s => (g === 'speed' ? s.speed || s.group === 'speedH' : inGroup(s, g)) && s.items.some(i => lv(i.id) >= 1))).length,
      ore: (S.home && S.home.ore) || 0,
      lvAll: n => { const c = lvCells(n); return {n: c.length, l1: c.filter(i => lv(i.id) >= 1).length, l3: c.filter(i => lv(i.id) >= 3).length}; },
      all: g => { const c = cells(g); return {n: c.length, l1: c.filter(i => lv(i.id) >= 1).length, l3: c.filter(i => lv(i.id) >= 3).length}; },
    };
  }
  // 进度 = [已有, 目标]。奖状 = 称号 + 画面（art.js 按 scene 画）；title 是孩子看到的大字，say 才写数学内容
  const prog = (f, goal) => t => [Math.min(f(t), goal), goal];
  const TITLES = {
    look: ['草原牧羊人', '草原牧羊大师'], bond: ['矿洞矿工', '矿洞大师'], place: ['村庄建筑师', '村庄建筑大师'], cmp: ['双塔哨兵', '双塔将军'], line: ['铁轨列车长', '铁轨大师'],
    garden: ['花园园丁', '花园大师'], market: ['集市伙计', '集市掌柜'], dock: ['码头水手', '码头船长'],
    'speed:L1': ['打败果冻王', '驯服果冻王'], 'speed:L2': ['打败骷髅将军', '驯服骷髅将军'], 'speed:L3': ['打败蜘蛛女王', '驯服蜘蛛女王'], 'speed:L4': ['打败巨龙', '驯服巨龙'],
  };
  const CERTS = [];
  PLACES.concat(LV).forEach(([g, name]) => {
    CERTS.push({id: 'c:' + g + ':1', kind: 'learn', scene: g, place: g, name, title: TITLES[g][0], need: t => [t.all(g).l1, t.all(g).n], text: name + '全部格子点亮', say: t => `学会了${name}全部 ${t.all(g).n} 格`});
    CERTS.push({id: 'c:' + g + ':3', kind: 'keep', scene: g, place: g, name, title: TITLES[g][1], need: t => [t.all(g).l3, t.all(g).n], text: name + '全部格子变深红', say: t => `${name}全部 ${t.all(g).n} 格，都记牢了`});
  });
  // 三四年级：每一级一对奖状（全部点亮 / 全部深红），lv = 这一级开放后才显示、才进「下一个目标」
  const LV_TITLES = {5: ['林间探路人', '林间向导'], 6: ['沙漠旅人', '沙漠向导'], 7: ['丛林猎人', '丛林之王'], 8: ['雪原骑士', '雪原守护者'], 9: ['海底潜水员', '海底探险家'],
    10: ['山巅攀登者', '山巅守望者'], 11: ['下界勇士', '下界征服者'], 12: ['要塞侦察兵', '要塞指挥官'], 13: ['末地旅人', '末地守卫'], 14: ['天空工匠', '天空建筑师'], 15: ['末影龙骑士', '驯服末影龙']};
  const lvName = g => (g === 5 ? '第 4–5 级' : `第 ${g} 级`);
  HARD_LV.forEach(n => {
    const T = LV_TITLES[n] || [lvName(n) + '新本领', lvName(n) + '大师'];
    CERTS.push({id: 'c:lv:' + n + ':1', kind: 'learn', scene: 'lv:' + n, lv: n, name: lvName(n), title: T[0], need: t => [t.lvAll(n).l1, t.lvAll(n).n], text: lvName(n) + '新本领全部点亮', say: t => `学会了${lvName(n)}的 ${t.lvAll(n).n} 个新本领`});
    CERTS.push({id: 'c:lv:' + n + ':3', kind: 'keep', scene: 'lv:' + n, lv: n, name: lvName(n), title: T[1], need: t => [t.lvAll(n).l3, t.lvAll(n).n], text: lvName(n) + '新本领全部变深红', say: t => `${lvName(n)}的 ${t.lvAll(n).n} 个新本领，都记牢了`});
  });
  [[1, '平安度过第一夜'], [7, '搭好营地'], [30, '老探险家'], [100, '百日传奇']].forEach(([n, title]) => CERTS.push({id: 'c:day:' + n, kind: 'day', scene: 'day:' + n, name: title, title, need: prog(t => t.days, n), text: `累计练习 ${n} 天`, say: () => `累计练习 ${n} 天`}));
  CERTS.push({id: 'c:fix:1', kind: 'fix', scene: 'fix:1', name: '点燃熔炉', title: '点燃熔炉', need: prog(t => t.passed, 1), text: '错题第一次复习做对', say: () => '写错的题，复习时做对了'});
  CERTS.push({id: 'c:fix:10', kind: 'fix', scene: 'fix:10', name: '熔炉师傅', title: '熔炉师傅', need: prog(t => t.solved, 10), text: '10 道错题真的会了', say: () => '10 道错题过完 5 次复习'});
  CERTS.push({id: 'c:fix:50', kind: 'fix', scene: 'fix:50', name: '炼金大师', title: '炼金大师', need: prog(t => t.solved, 50), text: '50 道错题真的会了', say: () => '50 道错题过完 5 次复习'});

  // 道具：摆在屋里；hidden = 没得到前显示「？」（意料之外的奖励）
  const ITEMS = [
    {id: 'torch', name: '火把', need: prog(t => t.iron, 1), text: '点亮第 1 个格子'},
    {id: 'bed', name: '木床', need: prog(t => t.fullDays, 1), text: '第一次练满 10 分钟'},
    {id: 'bench', name: '工作台', need: prog(t => t.learned, 1), text: '学会第 1 个技能'},
    {id: 'furnace', name: '熔炉', need: prog(t => t.passed, 1), text: '错题第一次复习做对', say: '错的题，在这里炼成会的题'},
    {id: 'shelf', name: '书架', need: prog(t => t.days, 7), text: '累计练习 7 天'},
    {id: 'pick1', name: '铁镐', need: prog(t => t.iron, 30), text: '30 个格子点亮'},
    {id: 'kennel', name: '小狗窝', need: prog(t => t.days, 14), text: '累计练习 14 天'},
    {id: 'glass', name: '望远镜', need: prog(t => t.started, 6), text: '岛上 6 个地方都点亮过格子'},
    {id: 'pick2', name: '金镐', need: prog(t => t.gold, 40), text: '40 个格子变淡红'},
    {id: 'lamp', name: '灯笼', need: prog(t => t.learned, 15), text: '学会 15 个技能'},
    {id: 'jukebox', name: '唱片机', need: prog(t => t.days, 30), text: '累计练习 30 天'},
    {id: 'pick3', name: '钻石镐', need: prog(t => t.diamond, 40), text: '40 个格子变深红'},
    {id: 'armor', name: '盔甲架', need: prog(t => t.diamond, 20), text: '20 个格子变深红'},
    {id: 'helm', name: '钻石头盔', part: 'armor', need: prog(t => t.diamond, 60), text: '60 个格子变深红'},
    {id: 'chest2', name: '钻石胸甲', part: 'armor', need: prog(t => t.diamond, 120), text: '120 个格子变深红'},
    {id: 'legs', name: '钻石护腿', part: 'armor', need: prog(t => t.diamond, 190), text: '190 个格子变深红'},
    {id: 'boots', name: '钻石靴子', part: 'armor', need: prog(t => t.diamond, 260), text: '260 个格子变深红'},
    {id: 'trophy', name: '金奖杯', need: t => [t.diamond, t.total], text: '全部格子变深红'},
    {id: 'cake', name: '蛋糕', hidden: true, need: t => [Math.min(1, CERTS.filter(c => c.kind === 'keep' && done(c, t)).length), 1], text: '第 1 张附魔奖状'},
    {id: 'apple', name: '金苹果', hidden: true, need: prog(t => t.solved, 5), text: '5 道错题真的会了'},
    {id: 'cat', name: '小猫', hidden: true, need: prog(t => t.days, 50), text: '累计练习 50 天'},
  ];
  // 摆设：按累计练习天数（当天练满 5 分钟），保证任何孩子都隔几天有一件（不看对错；断了不扣）
  [[3, '花盆'], [10, '地毯'], [20, '挂画'], [25, '小旗'], [40, '时钟'], [60, '窗帘'], [70, '小熊'], [80, '地球仪'], [90, '画架'], [110, '鱼缸'], [120, '吊灯'], [135, '留声盒'], [150, '船模'], [165, '星星灯'], [180, '城堡模型']].forEach(([n, name], i) =>
    ITEMS.push({id: 'deco' + i, name, deco: true, need: prog(t => t.days, n), text: `累计练习 ${n} 天`}));
  // 伙伴图鉴：每个技能一只生物（art.js 的 CREATURES 按技能顺序对应）。学会 = 解锁；全部深红 = 附魔版
  const MEDALS = K.SKILLS.flatMap(s => [
    {id: 'm:' + s.id + ':1', kind: 'bronze', skill: s, name: s.name, need: t => [s.items.filter(i => E.lv(t.S, i.id) >= 1).length, s.items.length], text: '这个技能全部格子点亮'},
    {id: 'm:' + s.id + ':3', kind: 'gold', skill: s, name: s.name, need: t => [s.items.filter(i => E.lv(t.S, i.id) >= 3).length, s.items.length], text: '这个技能全部格子变深红'},
  ]);
  // 三四年级的伙伴：每一级一只（85 个新技能不各配一只，美术量太大）；这一级新本领全部点亮 = 解锁，全部深红 = 附魔版
  HARD_LV.forEach(n => {
    const sk = {id: 'lv:' + n, name: lvName(n) + '伙伴', items: lvCells(n), level: n};
    MEDALS.push({id: 'm:lv:' + n + ':1', kind: 'bronze', skill: sk, lv: n, name: sk.name, need: t => [t.lvAll(n).l1, t.lvAll(n).n], text: '这一级新本领全部点亮'});
    MEDALS.push({id: 'm:lv:' + n + ':3', kind: 'gold', skill: sk, lv: n, name: sk.name, need: t => [t.lvAll(n).l3, t.lvAll(n).n], text: '这一级新本领全部变深红'});
  });
  const done = (r, t) => { const [a, b] = r.need(t); return a >= b; };
  const ALL = CERTS.concat(ITEMS, MEDALS), BY = Object.fromEntries(ALL.map(r => [r.id, r]));
  // 伙伴：编号固定对应生物（art 在 house.js 的 CREATURES 里按这个下标取）。新增技能往后加
  const CREATURE_IDS = ['look1', 'cmp1', 'look3', 'look4', 'bond2', 'line1', 'bond3', 'cmp2', 'bond4', 'bond5', 'line2', 'place1', 'place2', 'cmp3', 'cmp4', 'line3', 'line4', 'dockC', 'clockB', 'speed:L1:1', 'speed:L1:2', 'speed:L1:3', 'speed:L1:4', 'speed:L1:5', 'speed:L1:6', 'dockD', 'speed:L2:0', 'speed:L2:1', 'speed:L2:2', 'speed:L2:3', 'speed:L2:4', 'speed:L2:5', 'speed:L2:6', 'speed:L2:7', 'speed:L3:0', 'speed:L3:1', 'speed:L4:0', 'speed:L4:1', 'dockA', 'dockB', 'gardenA', 'gardenB', 'gardenC', 'clockA', 'money1', 'money2', 'lv:5', 'lv:6', 'lv:7', 'lv:8', 'lv:9', 'lv:10', 'lv:11', 'lv:12', 'lv:13', 'lv:14', 'lv:15'];   // 下标 = house.js 的 CREATURES
  const creatureOf = sid => CREATURE_IDS.indexOf(sid);

  function ensure(S) {
    S.home = Object.assign({ore: 0, got: {}, loot: [], place: {}, pets: null, sec: 0, go: 0}, S.home || {});
    S.home.got = S.home.got || {}; S.home.loot = S.home.loot || []; S.home.place = S.home.place || {};
    return S.home;
  }
  // 把新达成的记下来、放进战利品箱；返回这次新得到的
  function sync(S, day) {
    const h = ensure(S), t = stats(S), news = ALL.filter(r => !h.got[r.id] && done(r, t));
    news.forEach(r => { h.got[r.id] = day; h.loot.push(r.id); });
    return news;
  }
  // 已得到的（以 got 为准，统计变少也不收回）
  function earned(S) {
    const h = ensure(S), has = r => !!h.got[r.id];
    return {certs: CERTS.filter(has), items: ITEMS.filter(has), medals: MEDALS.filter(has), t: stats(S)};
  }
  function addOre(S, n) { const h = ensure(S); if (n > 0) h.ore += n; }
  // 这一级开放了没有（家长选了这一级，或自动模式到过）：没开放的三四年级奖状不显示、不进「下一个目标」，得到了的照常显示
  // 家长手选：只认选中的级别；自动模式：开到的级别以内（审查 11-09：练不到的奖状不能挂在目标里）
  // 审查 R2：组里每一格都能出题才算开放（第 4–5 级组的格子分属第 4、5 级，只选其中一级时另一级的格子练不到）；直接用排课的 itemOn，手选、自动一个判断
  const opened = (S, g) => lvCells(g).every(i => E.itemOn(S, i.id));
  const shown = (S, r) => !r.lv || !!(ensure(S).got[r.id]) || opened(S, r.lv);
  // 下一个最接近的目标：屋里只提示 3 个，避免一屏清单
  function next(S, n) {
    const h = ensure(S), t = stats(S);
    return CERTS.concat(ITEMS.filter(i => !i.hidden)).filter(r => !h.got[r.id] && shown(S, r)).map(r => { const [a, b] = r.need(t); return {r, a: Math.min(a, b), b, left: b - a}; }).sort((x, y) => x.left - y.left).slice(0, n || 3);
  }
  return {PLACES, CERTS, ITEMS, MEDALS, BY, HARD_LV, stats, sync, earned, ensure, addOre, next, done, creatureOf, opened, shown};
});
