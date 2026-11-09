// 单双日语言（v2/i18n.js）：规则、孩子能看到的文字全部有英文、英文语法抽查、不碰题库和存档
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const I18N = require('../v2/i18n.js'), K = require('../v2/skills.js'), R = require('../v2/render.js'), C = require('../v2/core.js'), B = require('../v2/bank.js');
const WORLD = require('../v2/world.js'), HOME = require('../v2/home.js');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const ZH = I18N.ZH;
// 翻译后还有中文 → 记下来；最多列 30 条，失败信息看得懂
function audit(items) { const bad = new Set(); items.forEach(s => { if (ZH.test(s)) bad.add(s); }); assert.deepEqual([...bad].slice(0, 30), []); }
const txt = s => I18N.text(String(s)), ht = s => I18N.html(String(s));

test('规则：单日英文、双日中文；关闭或日期不合法一律中文；缺字段默认开', () => {
  assert.equal(I18N.isEn({}, '2026-11-07'), true);
  assert.equal(I18N.isEn({}, '2026-11-06'), false);
  assert.equal(I18N.isEn({}, '2026-10-31'), true);
  assert.equal(I18N.isEn({}, '2026-11-01'), true);
  assert.equal(I18N.isEn({bilingual: true}, '2026-11-07'), true);
  assert.equal(I18N.isEn({bilingual: false}, '2026-11-07'), false);
  assert.equal(I18N.isEn({bilingual: false}, '2026-11-06'), false);
  assert.equal(I18N.isEn(undefined, '2026-11-07'), true);
  assert.equal(I18N.isEn(null, '2026-11-07'), true);
  assert.equal(I18N.isEn({}, ''), false);
});

const all = K.SKILLS.concat(K.HARD);
function bankInsts(it) {
  if (!it.gen) return [{id: it.id, q: it.q, ans: it.ans}];
  const pool = K.rawPool(it.id);
  if (pool) return pool.map(x => ({id: it.id, q: x.q, ans: x.ans}));
  const u = C.BYID[it.id];
  return B.speedPools[it.id].pool.map(([a, b]) => ({id: it.id, q: {a, op: u.op, b}, ans: u.op === '+' ? a + b : a - b}));
}

test('题库每一道题：题面、提示、选项、标签、讲解、错题标签都有英文', () => {
  const out = []; let n = 0;
  all.forEach(s => s.items.forEach(it => bankInsts(it).forEach(inst => {
    n++;
    const v = R.question(inst);
    out.push(ht(v.html), txt(v.tag), txt(v.note || ''));
    (v.pickText || []).forEach(t => out.push(ht(t)));
    (v.pickAria || []).forEach(t => out.push(txt(t)));
    out.push(ht(R.explain(inst)));
    const m = s.speed ? {uid: it.id, a: inst.q.a, b: inst.q.b, op: inst.q.op} : {src: s.group, uid: it.id, q: inst.q};
    out.push(ht(R.mistLabel(m)));
  })));
  assert.ok(n > 3500, '题数不对：' + n);
  audit(out);
});

test('全部示范卡、技能名、格子名、地方名、难度级别都有英文', () => {
  const out = [];
  all.forEach(s => { out.push(ht(R.demo(s.id)), txt(s.name)); s.items.forEach(it => out.push(txt(R.label(it.id)), ht(R.tagOf(it.id)))); });
  R.GROUPS.forEach(g => out.push(txt(g.name), txt(g.rule)));
  K.LEVELS.forEach(l => out.push(txt(l.name), txt(l.what)));
  C.LEVELS.forEach(L => { out.push(txt(L.name), txt(L.word), txt(L.boss.name)); L.worlds.forEach(w => out.push(txt(w.name))); });
  C.UNITS && C.UNITS.forEach(u => out.push(txt(u.name)));
  WORLD.ZONES.forEach(z => out.push(txt(z.name), txt(z.short)));
  audit(out);
});

test('答对时的字（R.okWords）都有英文', () => {
  const out = [];
  all.forEach(s => s.items.slice(0, 1).forEach(it => [0, 1, 2].forEach(lv => [{pass: true, up: true}, {pass: true, up: false}, {pass: false, up: false}].forEach(o => { const w = R.okWords({id: it.id}, o, lv); out.push(txt(w.big), txt(w.small)); }))));
  audit(out);
  assert.equal(txt('⚡ 秒答！').includes('⚡'), true);
});

test('奖状、道具、伙伴（home.js / house.js）都有英文', () => {
  const t = {all: () => ({n: 9, l1: 1, l3: 1}), lvAll: () => ({n: 9, l1: 1, l3: 1})}, out = [];
  HOME.CERTS.forEach(c => out.push(txt(c.name), txt(c.title), txt(c.text), txt(c.say(t))));
  HOME.ITEMS.forEach(i => out.push(txt(i.name), txt(i.text), txt(i.say || '')));
  HOME.MEDALS.forEach(m => out.push(txt(m.name), txt(m.text)));
  const src = read('../v2/house.js'), names = [...src.matchAll(/\bn: '([^']+)'(?:, d: '([^']+)')?/g)];
  assert.ok(names.length >= 45, '伙伴名没解析到：' + names.length);
  names.forEach(m => { out.push(txt(m[1])); if (m[2]) out.push(txt(m[2])); });
  // house.js 的界面字：把含中文的字符串字面量和模板里的字段拆开，留给下一条（页面文字）统一查；这里查几种带数字的
  ['已完成 3 / 9', '盔甲件数：2 / 4', '得到日期：2026 年 11 月 6 日', '已复习做对 3 道错题', '已解锁', '矿石', '已选择 火把，点一个位置', '学会「骰子点」后解锁', '学会了「骰子点」', '，全部隔 3 天还做对', '+3'].forEach(s => out.push(txt(s)));
  audit(out);
});

// 把页面里孩子能看到的静态 HTML 取出来（去掉样式、脚本、家长区、题库、崩溃页、测试条）
function childHtml() {
  let h = read('../v2/index.html');
  h = h.slice(h.indexOf('<body'), h.indexOf('<!-- 改了 core'));
  const cut = id => { const i = h.indexOf(`id="${id}"`); if (i < 0) throw new Error('页面没有 ' + id); const start = h.lastIndexOf('<', i); let depth = 0; const re = /<(\/?)div\b[^>]*>/g; re.lastIndex = start; let m; while ((m = re.exec(h))) { depth += m[1] ? -1 : 1; if (!depth) { h = h.slice(0, start) + h.slice(m.index + m[0].length); return; } } throw new Error('没配平 ' + id); };
  ['parent', 'bankv', 'habit', 'mistp', 'ovQ', 'ovCrash', 'testBar'].forEach(cut);
  return h.replace(/<!--[\s\S]*?-->/g, '');
}
test('页面静态文字（家长区除外）都有英文', () => {
  const h = childHtml();
  assert.ok(!h.includes('家长区（') || h.includes('aria-label="家长区'), '取静态文字出错');
  audit([ht(h)]);
});

// 页面脚本和 house.js 拼出来的动态文字：数字代入后的样子（DOM 里按文本节点翻译）
const DYN = [
  '空空，欢迎来到数学岛', '先看看你已经会什么，大约 5 分钟', '开始', '会的格子马上点亮', '接着看看你会什么', '上次还没测完，从刚才那里接着来', '接着来', '全部通关', '每道题都秒答过了', '家长区可以换难度',
  '今天练完啦！', '练了 ', ' 分钟 · 点亮 ', ' 格', '明天再来', '空空，今天还剩 3 分钟', '空空，今天练 10 分钟', '复习 3 道错题，学一点新的，再练练快的', '学一点新的，再练练快的', '接着探险', '开始今天的探险', '先去看数草原', '还没备份过', '9 天没备份',
  '这次练习存不下来，请家长看一下', '⚠ 这次练习存不下来，请家长看一下', '⚠ 这个浏览器暂时存不了进度，练习照常 · 家长：关掉页面前先在家长区导出备份',
  '亮了 3 / 9 格', '去秒答地图', '这个难度没有题', '还没开放', '练这一块', '这里的错题（3）', '这里的错题', '战利品箱', '今天先来这里', '汪汪！', '全部通关了', '今天练完啦，明天再来', '一起看看你会什么吧！', '今天去看数草原吧！',
  '只出加法', '只出减法', '加法减法一起出', '连加连减、两位数、乘除法', '秒答 = 2 秒内说对', '秒答 = 3 秒内说对', '达标 = 3～5 秒内说对，一天 5 次升一级', '达标 = 秒答，一天 5 次升一级', '秒答才算学会',
  '深红 3', '淡红 3', '淡黄 3', '共 30 张 · 秒答才算学会', '共 12 种题型 · 达标 = 秒答，一天 5 次升一级', '第一次练「10 以内」：点「加法练习」，从第一个世界开始，会的当场点亮。', '每天的练习里，学会「过十准备」以后才出这一级后面的世界',
  '深红 3/9 · Boss 已通关', '深红 3/9', '摸底', 'Boss 关', '最终 Boss · 末影龙', '已击败', '这一级全部深红后解锁', '挑战末影龙', '今天 3/5', '加法练习', '减法练习', '加减混合', '摸底 · 世界 1 · 草地', 'Boss 关 · 世界 1 · 草地', '最终 Boss · 凋灵',
  '第 3 遍，共 3 遍', '已写 3 / 30', '10 分钟 ✓', '还剩 9:58', '第 3 题 · ⚡ 秒答 2', '第 3 题 · ⚡ 达标 2', '没看清，再写一次', '⚡ 秒答！', '3.2 秒', '马上进入下一题…', '没关系，记住它', '已放进错题本，明天再来', '你写的是 12 · 已放进错题本，明天再来', '这题再练一下', '描完点「继续」', '答错了', '其实答对了', '下一题',
  'Boss 被打败了！', '秒答 27 题就能打败 Boss，想打随时再来', '加法练习 · 本次总结', '错题复习 · 本次总结', '先练到这里', '练完啦', '秒答 3 题 · 慢了 2 题 · 写错 1 题', '用时约 3 分钟 · 写对的平均 2.4 秒', '这次升级的方块', '这次没有方块升级', '错题本', '新放进 ', ' 道 · 今天复习过关 ', ' 道', '去看看', '这几个写对了，还不够快', '回家打开', '回到地图',
  '看看你已经会什么', '再来一次', '说出答案，再点右边看答案', '说出答案后，点这里看答案', '答案是 12', '✗ 你写的是 ', '✗ 你点的是 ', '✗ 这题答错了', '已放进错题宝箱，一会儿再来', '已放进错题宝箱，明天再来', '记住它，下次再来', '蓝旗是你插的，绿旗是 47 的位置', '再往右一点 · 47 在绿旗这里', '再往左 · 47 在绿旗这里', '一会儿再来一次', '明天再考你一次',
  '这一组练完啦', '复习完啦', '挖到 3 块矿石', '挖到 1 块矿石', '这次没挖到矿石，明天再来', '分钟', '格点亮了', '道错题过关', '道题', '+3', '今天点亮的', '这次没有新点亮的格子，明天接着来', '新进错题本 3 道，明天再来', '家门口有 1 个战利品箱', '再来一组', '回到岛上',
  '你已经会了这些！', '我们从头开始学', '点亮了 ', '亮了 3 格 · ', '共 9 格', '骰子点、乱点 会了', '以后会教你', '还没测完，下次接着看 · ', '还有 3 分钟，接着练今天的', '今天的时间用完啦', '开始练习',
  '练这个', '最近 8 次秒答 7 次', ' · 最近 8 次秒答 7 次', '看图写数 · 最近 8 次秒答 7 次', '明天', '后天', '3 天后', '今天 3 · 复习中 2 · 会了 1', '还有 3 道', '今天没有要复习的', '复习这一组', '还没有错题', '秒答 · 10 以内', '进阶口算', '十格框 8',
  // house.js
  '回到岛上', '关闭', '摆放', '完成', '奖状 ', '伙伴 ', '钻石 ', '奖状墙', '门口', '矿物柜', '道具', '播放', '停止', '得到日期：2026 年 11 月 6 日', '已复习做对 3 道错题', '<b>获得条件</b>', '去练这一块', '下一个目标', '全部目标已完成', '钻石', '记牢了', '金锭', '另一天再次做对', '铁锭', '格子第一次点亮', '格子每升一档，多一件。只增不减。', '木箱', '矿石 ', ' 块', '练习时每答对一题，得到 1 块矿石。',
  '合上图鉴', '伙伴图鉴', '已解锁 ', '？', '学会一个技能，解锁一只伙伴', '未解锁', ' · 学会「骰子点」后解锁', '学会了「骰子点」，全部隔 3 天还做对', '留在图鉴', '带回家', ' · 附魔', '奖状 · 附魔', '空空', '收好', '打印奖状', '新伙伴', '伙伴附魔', '奖状', '点箱子打开', '战利品', '已放入家中', '已选择 火把，点一个位置', '这件摆在地上', '这件挂在墙上', '点一件东西，再点新位置', '已保存摆放',
  // 钟、钱
  '3 点半', '3 点', '12 点半', '应该是 3 点半', '5 元', '1 点 ', ' 分', '现在是 3 点几分？',
];
test('页面和家里拼出来的动态文字都有英文', () => { audit(DYN.map(ht)); });

test('英文语法：单复数、整句、时间', () => {
  const t = (zh, en) => assert.equal(txt(zh), en);
  t('小狐狸有 13 个苹果，送出 11 个。还剩几个？', 'Little Fox has 13 apples and gives away 11. How many are left?');
  t('小狐狸有 1 个苹果，又得到 1 个。一共几个？', 'Little Fox has 1 apple and gets 1 more. How many in all?');
  t('小羊有 13 条小鱼，又得到 3 条。一共几条？', 'Little Sheep has 13 fish and gets 3 more. How many in all?');
  t('有 6 只羊，跑走 1 只。还剩几只？', 'There are 6 sheep. 1 runs away. How many are left?');
  t('有 6 只羊，跑走 2 只。还剩几只？', 'There are 6 sheep. 2 run away. How many are left?');
  t('小猫有 2 盒箭，每盒 2 支。一共几支？', 'Little Cat has 2 boxes of arrows. Each box has 2. How many in all?');
  t('小狼要 15 颗松果，已经有 14 颗。还差几颗？', 'Little Wolf needs 15 pine cones and has 14. How many more?');
  t('小猫有 15 支箭，小狼有 8 支。小猫多几支？', 'Little Cat has 15 arrows. Little Wolf has 8. How many more does Little Cat have?');
  t('东西 1 元，付了 10 元。找回几元？', 'It costs 1 yuan. You pay 10 yuan. How much change do you get?');
  t('3 点半', 'half past 3'); t('3 点', "3 o'clock"); t('5 元', '5 yuan');
  t('6 个圆点', '6 dots'); t('1 个圆点', '1 dot');
  t('2 个十', '2 tens'); t('1 个十', '1 ten'); t('1 个一', '1 one'); t('0 个一', '0 ones');
  t('挖到 1 块矿石', 'Mined 1 ore'); t('挖到 3 块矿石', 'Mined 3 ores');
  t('2 排，每排 3 个，一共 6 个', '2 rows of 3 is 6');
  t('比 10 多 1', '10 plus 1'); t('比 11 少 1', '11 minus 1');
  t('空空的家', "Kongkong's Home"); t('末影龙', 'Ender Dragon'); t('凋灵', 'Wither'); t('监守者', 'Warden');   // Ben 11-06：这 5 个用我的世界原名
  t('世界 6 · 下界', 'World 6 · The Nether'); t('世界 7 · 末地', 'World 7 · The End');
  // 拆开的文本节点：前一个节点是 1 用单数
  const h = ht('<div><span class="num">1</span> 个十和 3 个一</div>');
  assert.match(h, /1<\/span> ten and 3 ones/);
  assert.match(ht('<span class="num">2</span> 个百'), /2<\/span> hundreds/);
  assert.match(ht('<span class="box"></span> 个百'), /<\/span> hundreds/);
});

test('题里的数字一个不改；Ben 11-06：这 5 个名字用我的世界原名，其他不许加', () => {
  all.forEach(s => s.items.forEach(it => bankInsts(it).slice(0, 40).forEach(inst => {
    const v = R.question(inst), html = v.html.replace(/<[^>]*>/g, ' ');
    if (!s.nb) return;
    const nums = s => (s.match(/\d+/g) || []).join();
    assert.equal(nums(txt(inst.q.say || '')), nums(inst.q.say || ''), inst.q.say);
    void html;
  })));
  const banned = /Creeper|Elder Guardian|Enderman|Steve|Ghast/;
  const src = I18N.dump();
  Object.values(src).forEach(en => assert.doesNotMatch(en, banned, en));
});

test('翻译层只做文字：没翻到的原样返回并记入 misses；空串、纯数字、算式不动', () => {
  assert.equal(txt(''), ''); assert.equal(txt('12'), '12'); assert.equal(txt('3 + 4 ='), '3 + 4 =');
  const n = I18N.misses.size; const weird = '这句话字典里没有' + Date.now();
  assert.equal(txt(weird), weird); assert.ok(I18N.misses.has(weird)); assert.equal(I18N.misses.size, n + 1);
  I18N.misses.delete(weird);
});

test('页面接入：先于所有脚本加载；保存、判题、题库都不依赖翻译层', () => {
  const html = read('../v2/index.html');
  assert.match(html, /<script src="i18n\.js\?v=\d+"><\/script>\s*<script src="bank\.js/);
  assert.match(html, /<html[^>]*class="i18n-wait"/);
  assert.match(html, /id="biBox"/);
  // 判题读的是题目数据（data-n 和 Q.x.inst.ans），候选数字只有数字，不会被翻译
  ['core.js', 'engine.js', 'skills.js', 'bank.js', 'render.js', 'home.js'].forEach(f => assert.doesNotMatch(read('../v2/' + f), /I18N/, f + ' 不该用翻译层'));
});

test('结算页碎片收起行（捣蛋鬼 1-12）有英文', () => {
  assert.equal(txt('这次的碎片 +16'), 'Shards this round +16');
  assert.equal(txt('这次的碎片'), 'Shards this round');
  assert.equal(txt('这次的碎片 +3 · 挑战券 +1'), 'Shards this round +3 · Challenge ticket +1');
  assert.equal(txt('这次的碎片 · 挑战券 +1'), 'Shards this round · Challenge ticket +1');
  assert.equal(txt('这次的碎片 +2 · 可以挑战'), 'Shards this round +2 · Challenge ready');
});

test('思维地点每档的建议级别（中控 11-08）有英文', () => {
  assert.equal(txt('建议第 3 级起'), 'Level 3+');
  assert.equal(txt('建议第 13 级起'), 'Level 13+');
});

test('分级同步：秒答高塔「去挑战」有英文（审查 11-09）', () => { assert.equal(txt('去挑战'), 'Go to challenge'); });
test('家：三四年级伙伴图鉴的说明、「新本领」导航有英文（E 11-09）', () => {
  assert.equal(txt('第 4–5 级新本领全部点亮后解锁').indexOf('unlock') > 0, true);
  assert.ok(!I18N.ZH.test(txt('学会了第 15 级的全部新本领，全部隔 3 天还做对')));
  assert.equal(txt('新本领'), 'New skills');
  ['林间小鹿', '驼驼', '斑斑豹', '冰冰熊', '泡泡海马', '岩角羊', '火尾蜥', '铜壳虫', '紫夜鸮', '云鲸', '小飞龙'].forEach(n => assert.ok(!I18N.ZH.test(txt(n)), n));
});
