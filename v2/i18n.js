// 空空数学岛 · 单双日语言：单日英文、双日中文，家长区可关（S.settings.bilingual === false 一直中文）
// 只翻译屏幕上的字，不改业务代码、题库和存档：文本节点和 aria-label / title / data-say 按「整句字典 → 正则模式」换成英文，原文存在 WeakMap 里，切回中文时还原
// 家长区（#parent、#habit）、题库（#bankv、#ovQ）、崩溃页（#ovCrash）、测试条（#testBar）不翻译。新增孩子能看到的文字要在这里加英文（tests/i18n.test.js 会查）
// 浏览器里挂到 window.I18N，最先加载；node 里 require 后直接测
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.I18N = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const ZH = /[　-〿㐀-鿿＀-￯]/, HAN = /[㐀-鿿]/;

  // ---------- 规则 ----------
  function isEn(settings, day) {
    if (settings && settings.bilingual === false) return false;
    const d = +String(day || '').slice(8, 10);
    return d % 2 === 1;
  }

  // ---------- 小工具 ----------
  const pl = (n, one, many) => `${n} ${+n === 1 ? one : many || one + 's'}`;
  const NAME = {小狐狸: 'Little Fox', 小狼: 'Little Wolf', 小羊: 'Little Sheep', 小猫: 'Little Cat'};
  const THING = {苹果: ['apple', 'apples'], 贝壳: ['shell', 'shells'], 面包: ['bun', 'buns'], 松果: ['pine cone', 'pine cones'], 钻石: ['diamond', 'diamonds'], 小鱼: ['fish', 'fish'], 箭: ['arrow', 'arrows'], 石块: ['rock', 'rocks']};
  const ORE = {金矿: 'gold', 钻矿: 'diamond', 铁矿: 'iron'};
  const COLOR = {红: 'red', 蓝: 'blue', 黄: 'yellow', 青: 'teal', 绿: 'green', 灰: 'gray'};
  const WHO = '(小狐狸|小狼|小羊|小猫)', M = '[个颗条支块]', THG = '(苹果|贝壳|面包|松果|钻石|小鱼|箭|石块)';
  const thing = (n, t) => pl(n, THING[t][0], THING[t][1]);
  const colors = s => s.trim().split(/\s+/).map(c => COLOR[c]).join(', ');
  const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const andList = a => (a.length < 2 ? a[0] : a.length === 2 ? a.join(' and ') : a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1]);

  // ---------- 整句字典 ----------
  // 岛上小地图按钮只有 48 点宽、技能地图有 8 个标签，用短名字
  const SHORT = {看数: 'Count', 分合: 'Bonds', 数位: 'Place', 数线: 'Line', 规律: 'Pattern', 规律花园: 'Patterns', 钟楼集市: 'Market', 故事码头: 'Dock'};
  const D = {
    // 名字和地方
    空空数学岛: 'Kongkong Math Island', 空空: 'Kongkong', 空空的家: "Kongkong's Home", 家: 'Home',
    看数草原: 'Counting Meadow', 分合矿洞: 'Number Bond Mine', 数位村庄: 'Place Value Village', 比大小双塔: 'Compare Towers', 数线铁轨: 'Number Line Railway', 秒答高塔: 'Speed Tower', 规律花园: 'Pattern Garden', 钟楼集市: 'Clock Tower Market', 故事码头: 'Story Dock',
    看数: 'Counting', 分合: 'Number Bonds', 数位: 'Place Value', 比大小: 'Compare', 数线: 'Number Line', 秒答地图: 'Speed Map', 秒答: 'Speed', 规律: 'Patterns', 集市: 'Market', 码头: 'Dock', 进阶口算: 'Advanced Math',
    达标: 'On target',
    草地: 'Meadow', 森林: 'Forest', 沙漠: 'Desert', 雪山: 'Snow Mountain', 矿洞: 'Mine', 下界: 'Lava Land', 末地: 'Sky End',
    末影龙: 'Void Dragon', 凋灵: 'Shadow King', 监守者: 'Deep Guard', 远古守卫者: 'Ancient Keeper',
    十几加减几: 'Teens: Adding and Subtracting', '7、6 加几': 'Adding to 7 and 6', '十几减 7、6': 'Teens minus 7 and 6', '十几减 5～2': 'Teens minus 5 to 2', 加法题型: 'Addition types', 减法题型: 'Subtraction types',
    整十加整十: 'Tens plus tens', 两位数加一位数: '2-digit plus 1-digit', 两位数加整十: '2-digit plus tens', 两位数加两位数: '2-digit plus 2-digit', 整十减整十: 'Tens minus tens', 两位数减一位数: '2-digit minus 1-digit', 两位数减整十: '2-digit minus tens', 两位数减两位数: '2-digit minus 2-digit',
    不进位: 'no regrouping', 进位: 'regrouping', 不退位: 'no regrouping', 退位: 'regrouping',
    // 技能
    骰子点: 'Dice Dots', 乱点: 'Scattered Dots', 一个十格框: 'One Ten Frame', 两个十格框: 'Two Ten Frames', 接方块: 'Next Block', '6–9 分合': 'Bonds of 6–9', '5 以内分合': 'Bonds to 5', 装到一起: 'Put Together', 拿走: 'Take Away', 整点: "O'Clock", 半点: 'Half Past', 凑十: 'Make 10', 付钱: 'Paying', 缺数算式: 'Missing Numbers', 还差几个: 'How Many More', 找零: 'Making Change', 过十准备: 'Bridge to 10', 比多少: 'Compare Amounts', 看十和一写数: 'Read Tens and Ones', 跳着数: 'Skip Counting', 找错的: 'Find the Mistake', 几个十几个一: 'Tens and Ones', 两位数谁大: 'Bigger 2-Digit Number', 前后数: 'Number Neighbors', '0—100 整十': 'Line 0—100 by Tens', '0—100 任意': 'Line 0—100, Any Number',
    几排几个: 'Rows and Columns', 百格图数数: 'Hundred Chart', 整十分合: 'Bonds of Tens', 凑一百: 'Make 100', 看百十个写数: 'Read Hundreds, Tens, Ones', 几个百几个十: 'Hundreds and Tens', 算式谁大: 'Bigger Expression', 三位数谁大: 'Bigger 3-Digit Number', '0—1000 整百': 'Line 0—1000 by Hundreds', '0—1000 任意': 'Line 0—1000, Any Number', 连加连减: 'Chain Adding and Subtracting', 两位数加减两位数: '2-Digit Plus or Minus 2-Digit', '乘法 2、5、10': 'Times 2, 5, 10', '20 以内分合': 'Bonds to 20', '乘法应用题 2、5、10': 'Multiplication Stories 2, 5, 10', 乘法应用题: 'Multiplication Stories', 除法应用题: 'Division Stories', '50 元以内付钱': 'Paying up to 50 Yuan', 大钱找零: 'Change from Big Bills', 几点几分: 'Hours and Minutes', '3 和 4 跳着数': 'Skip Counting by 3 and 4', 倒着跳: 'Skip Counting Backward', 表内乘法: 'Times Tables', 表内除法: 'Division Facts',
    // 格子名
    合起来是几: "What's the total", 看图写数: 'Read the picture', '47 里有几个十': 'How many tens in 47', 两位数: '2-digit', '47 和 74 这种': 'Like 47 and 74',
    // 难度级别
    '10 以内的数': 'Numbers to 10', '10 以内分合': 'Bonds to 10', '20 以内的数': 'Numbers to 20', '20 以内进位加': 'Adding across 10', '20 以内退位减': 'Subtracting across 10', '100 以内的数': 'Numbers to 100', 两位数加减一位数: '2-digit plus or minus 1-digit', 进位退位: 'Regrouping', 两位数进位退位: '2-digit regrouping', 三位数: '3-digit numbers', 乘法入门: 'Intro to multiplication',
    '看数、比大小、数线、接方块': 'Counting, comparing, number line, next block', '6–9 分合、8 以内加减、整点': "Bonds of 6–9, adding and subtracting to 8, o'clock", '凑十、缺数算式、9 和 10 的加减': 'Make 10, missing numbers, adding and subtracting 9 and 10', '十格框、比大小、数线、十几加减几': 'Ten frames, comparing, number line, teens', '过十准备、9/8/7/6 加几、付钱': 'Bridge to 10, 9/8/7/6 plus, paying', '十几减几、找零、半点、应用题': 'Teens minus, making change, half past, stories', '数位、两位数比大小、前后数、跳着数': 'Place value, comparing 2-digit numbers, neighbors, skip counting', '不进退位、整十、付钱': 'No regrouping, tens, paying', '进退位、连加连减、整十分合、应用题': 'Regrouping, chains, bonds of tens, stories', '不进退位、凑一百、百格图、几点几分': 'No regrouping, make 100, hundred chart, hours and minutes', '进退位、100 以内应用题、找零': 'Regrouping, stories to 100, making change', '百十个、比大小、0—1000 数线': 'Hundreds, comparing, number line to 1000', '2、5、10 的乘法、应用题': 'Times 2, 5, 10, stories', '3、4、6、7、8、9 的乘法、应用题': 'Times 3, 4, 6, 7, 8, 9, stories', '除法、应用题': 'Division, stories',
    // 技能组一句话
    '看一眼，写出有几个': 'Take one look and write how many', '先做对，再做快': 'Get it right, then get it fast', '一根是 10，一块是 1': 'A rod is 10, a cube is 1', '看清楚，再点大的': 'Look carefully, then tap the bigger one', 把旗子插到这个数的位置: 'Put the flag where this number goes', 又对又快: 'Right and fast', '找到规律，接下去': 'Find the pattern and keep it going', '看钟、买东西': 'Tell time and go shopping', '看图想一想，写答案': 'Look, think, and write the answer',
    // 首页
    预览版: 'Preview', 错题宝箱: 'Mistake Chest', '家长区（长按 2 秒）': 'Parent area (hold for 2 seconds)', '◀ 拖一拖': '◀ Drag', '，看看整座岛': ' to see the whole island',
    '空空，今天练 10 分钟': 'Kongkong, 10 minutes of practice today', 开始今天的探险: "Start today's adventure", '再练一会（5 分钟）': 'Practice a little more (5 min)', '练满 10 分钟去贴 1 颗珠子': 'Practice 10 minutes to add 1 bead', 关上: 'Close', 练这一块: 'Practice here', 看全部格子: 'See all squares', 这里的错题: 'Mistakes here', 返回: 'Back', 关闭: 'Close',
    '空空，欢迎来到数学岛': 'Kongkong, welcome to Math Island', '先看看你已经会什么，大约 5 分钟': "Let's see what you already know. About 5 minutes", 开始: 'Start', 会的格子马上点亮: 'Squares you know light up right away', 接着看看你会什么: "Let's keep checking what you know", '上次还没测完，从刚才那里接着来': "You didn't finish last time. Pick up where you left off", 接着来: 'Keep going', 全部通关: 'All clear', 每道题都秒答过了: 'You answered every question fast', 家长区可以换难度: 'A parent can change the level', '今天练完啦！': 'All done for today!', 明天再来: 'See you tomorrow', '学一点新的，再练练快的': 'Learn something new, then build speed', 接着探险: 'Continue adventure', 还没备份过: 'Not backed up yet',
    '这次练习存不下来，请家长看一下': "This practice can't be saved. Please ask a parent", '这个浏览器暂时存不了进度，练习照常': "This browser can't save progress right now. You can still practice", '家长：关掉页面前先在家长区导出备份': 'Parents: export a backup before closing this page',
    去秒答地图: 'Go to Speed Map', 这个难度没有题: 'No questions at this level', 还没开放: 'Not open yet', 战利品箱: 'Loot Chest', 今天先来这里: 'Start here today', '汪汪！': 'Woof!', 全部通关了: 'All clear!', '今天练完啦，明天再来': 'All done today. See you tomorrow', '一起看看你会什么吧！': "Let's see what you know!",
    // 摸底
    看看你已经会什么: "Let's see what you know", '会的就做出来，会的格子马上点亮。': 'Answer what you know, and those squares light up right away.', '不会的点「不会」，没关系，以后会教你。': 'If you\'re not sure, tap "Don\'t know". We\'ll teach it later.', '大约 3–5 分钟，最多 40 题': 'About 3–5 minutes, 40 questions at most',
    '你已经会了这些！': 'You already know these!', 我们从头开始学: "Let's start from the beginning", 以后会教你: "We'll teach this later", '还没测完，下次接着看': 'Not finished yet. Continue next time', 今天的时间用完啦: "Today's time is up", 开始练习: 'Start practice',
    // 练习
    长按结束: 'Hold to end', 要结束就按住左上角: 'To end, hold the top-left button', 你写的是: 'You wrote', '？': '?', '虚线这一位是哪个？': 'Which digit goes on the dotted line?', '都不是，我重写': "Neither. I'll write it again", 照着描一遍: 'Trace it', '说出答案后，点这里看答案': 'Say the answer, then tap here to check', 再看一次: 'Look again', 答错了: 'Wrong', 其实答对了: 'Actually right', 下一题: 'Next', 擦掉: 'Erase', 不会: "Don't know", 继续: 'Continue', 我知道了: 'Got it', 回到岛上: 'Back to island', 练这个: 'Practice this', 再来一次: 'Try again',
    加法练习: 'Addition', 减法练习: 'Subtraction', 加减混合: 'Mixed', 只出加法: 'Addition only', 只出减法: 'Subtraction only', 加法减法一起出: 'Addition and subtraction together', '连加连减、两位数、乘除法': 'Chains, 2-digit, times, and division', 错题本: 'Mistake Book', '这里随便挑着练，每天的练习在岛上': 'Pick anything here. Daily practice is on the island.',
    摸底: 'Quick check', 'Boss 关': 'Boss Level', 已击败: 'Defeated', 这一级全部深红后解锁: 'Unlocks when this level is all dark red', 'Boss 已通关': 'Boss beaten',
    '第一次用手写，先认识一下你的字': "First time writing. Let's learn your handwriting", 教我认识: 'Teach me', 你写的数字: 'your numbers', 请写: 'Write', '0 到 9 每个写 3 遍': 'Write 0 to 9, 3 times each', 写完停一下会自动记下来: 'Pause to save', '像平时一样写，不用特别慢': 'Write the way you normally do, no need to go slow',
    '要按住不放，才能结束': 'Keep holding to end', '在右边写出答案，写完停一下就好': 'Write the answer on the right, then pause', '说出答案，再点右边看答案': 'Say the answer, then tap the right side to check', '没看清，再写一次': "Couldn't read that. Write it again", '⚡ 秒答！': '⚡ Super fast!', '⚡ 又快又对！': '⚡ Fast and right!', '⚡ 又对又快！': '⚡ Right and fast!', '✓ 写对了': '✓ Correct', 下次再快一点: 'A little faster next time', '马上进入下一题…': 'Next question coming…', '没关系，记住它': "That's OK. Remember this one", '已放进错题本，明天再来': 'Added to the Mistake Book. Back tomorrow', 这题再练一下: 'Practice this one more', '描完点「继续」': 'Trace it, then tap "Continue"',
    '✗ 你写的是': '✗ You wrote', '✗ 你点的是': '✗ You tapped', '✗ 这题答错了': '✗ Not quite', '已放进错题宝箱，一会儿再来': 'Added to the Mistake Chest. Back soon', '已放进错题宝箱，明天再来': 'Added to the Mistake Chest. Back tomorrow', '记住它，下次再来': 'Remember it for next time', 一会儿再来一次: 'One more try soon', 明天再考你一次: "We'll ask again tomorrow", '很接近！': 'So close!', 点亮了: 'Lit up', '✓ 对了': '✓ Correct', 再快一点就能升级: 'A little faster to level up', '✓ 对了！点亮了': '✓ Correct! Lit up', '✓ 点亮了！': '✓ Lit up!', '✓ 对了！': '✓ Correct!',
    '慢一点，看清楚再点': 'Slow down and look before you tap',
    // 示范卡
    学一学: 'Learn', 图会闪一下: 'The picture flashes', 一眼看出来: 'See it at a glance', 写出有几个: 'Write how many', '没看清可以点「再看一次」': 'Missed it? Tap "Look again"', '看数：看一眼，写出有几个': 'Counting: take one look and write how many', 两个数: 'Two numbers', 放到数线上: 'Put them on the line', 点右边那个: 'Tap the one on the right', '看清楚，再点大的那个数': 'Look carefully, then tap the bigger number', '比大小：在数线上越往右越大': 'Compare: farther right on the line is bigger', 看题: 'Read', 想一想: 'Think', 点它: 'Tap it', 写答案: 'Write', 点错了会告诉你答案: "If you miss, you'll see the answer", '不会就点「不会」，会告诉你答案': 'Stuck? Tap "Don\'t know" to see the answer', '分合：一个数可以拆成两个数': 'Number Bonds: one number splits into two', 分合图: 'Number bond', '上面是整个数，下面是拆出来的两个数': 'The whole is on top, the two parts are below', '缺数：方框里藏着一个数': 'Missing Numbers: a number is hiding in the box', '方框里是几？': "What's in the box?", 想一想分合: 'Think about number bonds', '想想这几个数怎么分、怎么合': 'Think about how these numbers split and join', 写方框里的数: 'Write the number in the box', '过十准备：先凑满 10': 'Bridge to 10: fill up 10 first', '先把 10 凑满，再看剩几个': 'Fill up 10, then see what is left', '数位：10 个一拼成 1 个十': 'Place Value: 10 ones make 1 ten', '10 个一': '10 ones', '一根就是 10，数根数就行，不用一个一个数': 'Each rod is 10. Count the rods, not every cube', '前后数：在数线上跳一跳': 'Number Neighbors: jump along the line', 从这个数出发: 'Start at this number', 落在这里: 'Land here', '多 1 往后数，少 1 往前数': '1 more counts forward, 1 less counts back', '数线：0 在左边，越往右越大': 'Number Line: numbers grow to the right', '手指按在线上，可以拖，松手停一下就好': 'Press on the line, drag, then let go and wait', '秒答：看到算式，马上写答案': 'Speed: see the problem, write the answer right away', 看到算式: 'See the problem', 马上写答案: 'Write the answer', 又对又快就点亮: 'Right and fast lights it up', 两边比一比: 'Compare both sides', 点大的那个: 'Tap the bigger one',
    // 题面和提示
    '有几个？写在右边': 'How many? Write it on the right', '哪个大？点它': 'Which is bigger? Tap it', '下一块是什么？': 'What block comes next?', 朗读题目: 'Read aloud', 红色: 'Red', 蓝色: 'Blue', 绿色: 'Green', 青色: 'Teal', 黄色: 'Yellow', 灰色: 'Gray', '现在是几点？': 'What time is it?', 钟面: 'Clock face', '把钱加起来。一共几元？': 'Add up the money. How many yuan in all?', 付了: 'You paid', '哪个数错了？': 'Which number is wrong?', '空着的圆是几？写在右边': 'What goes in the empty circle? Write it on the right', '合起来是几？写在右边': "What's the total? Write it on the right", '一根是 10，一块是 1。一共是几？': 'A rod is 10 and a cube is 1. What number is it?', 在右边写出答案: 'Write the answer on the right', '一排一排数，写在右边': 'Count row by row and write it on the right', '一行是 10，一共涂了几格？': 'Each row is 10. How many squares are shaded?', '方块是 100，一根是 10，一块是 1': 'A flat is 100, a rod is 10, a cube is 1',
    // 讲解
    一共是: 'In all:', 应该是: 'It should be', '先加大的，再加小的': 'Add the big ones first, then the small ones', '付的钱减去东西的价钱': 'What you paid minus the price', '一只对一根，没对上的就是还差的': 'Match one bone to each wolf. The ones without a match still need a bone', '一个对一个，多出来的就是多几个': 'Match them one to one. The extras show how many more', 拼成: 'Make', '更大': 'is bigger', '先比百位，百位大的就大': 'Compare hundreds first. More hundreds means bigger', '百位一样，再比十位、个位': 'Same hundreds? Compare the tens, then the ones', 合起来用加法: 'Putting together means adding', 送出去了用减法: 'Giving away means subtracting', 要的减去有的: 'What you need minus what you have', 多的减去少的: 'The bigger amount minus the smaller', 每份一样多叫平均分: 'Equal groups means sharing evenly', 用除法: 'so divide',
    // 结算
    '练满 10 分钟了，去贴 1 颗珠子': 'You practiced 10 minutes. Go add 1 bead', 本次总结: 'Summary', 错题复习: 'Mistake review', 先练到这里: "That's all for now", 练完啦: 'All done', 这次升级的方块: 'Squares leveled up', '这次升级的方块（去墙上的地图涂上这个颜色）': 'Squares leveled up (color them on your wall map)', 这次没有方块升级: 'No squares leveled up this time', 去看看: 'Take a look', '这几个写对了，还不够快': 'These were right, but not fast enough yet', 回家打开: 'Open at home', 回到地图: 'Back to map', 'Boss 被打败了！': 'Boss defeated!',
    这一组练完啦: 'Set complete', 复习完啦: 'Review complete', '这次没挖到矿石，明天再来': 'No ore this time. Try again tomorrow', 分钟: 'Min', 格点亮了: 'Squares lit', 道错题过关: 'Mistakes fixed', 道题: 'Questions', 今天点亮的: 'Lit up today', '这次没有新点亮的格子，明天接着来': 'No new squares this time. Keep going tomorrow', '练满 10 分钟了，去墙上贴 1 颗珠子': 'You practiced 10 minutes. Add 1 bead to the wall', '家门口有 1 个战利品箱': 'A Loot Chest is at your door', 再来一组: 'Another set', '贴好珠子，回到岛上': 'Add the bead, then go back to the island',
    明天: 'tomorrow', 后天: 'in 2 days', 今天没有要复习的: 'Nothing to review today', 复习这一组: 'Review this set', 还没有错题: 'No mistakes yet',
    今天要复习: 'To review today:', '写错的题会隔 1、2、4、7、15 天回来，每次都做对就过 1 次复习；过完 5 次就算真的会了。每天的练习会自动带上它们。': 'Missed questions come back after 1, 2, 4, 7, and 15 days. Get one right to pass a review. Pass 5 reviews and you really know it. Daily practice brings them back automatically.',
    // 异常、竖屏
    把手机横过来: 'Turn your phone sideways', '把手机从竖着转成横着': 'Turn the phone from upright to sideways', '横着放，右边有地方写字': 'Hold it sideways so you have room to write on the right', '休息好了吗？': 'Ready to keep going?', '计时停住了，回来接着练': 'The timer stopped. Come back and keep practicing', 另一个页面也开着: 'Another page is open', '这一页先停一下，免得两个页面把进度弄乱。': 'This page has paused so the two pages don\'t mix up your progress.', '请先把另一个页面关掉，再点下面的按钮': 'Close the other page, then tap the button below', 在这里继续: 'Continue here', '点了会读取最新的进度，回到首页': 'This loads your latest progress and goes back to the start', 新版已经上线了: 'A new version is here', 这个旧页面不再保存进度: 'This old page no longer saves progress', 去新版: 'Go to new version',
    // 家
    摆放: 'Arrange', 完成: 'Done', 奖状: 'Award', 伙伴: 'Pals', 钻石: 'Diamonds', 奖状墙: 'Award Wall', 门口: 'Door', 矿物柜: 'Ore Cabinet', 道具: 'Items', 播放: 'Play', 停止: 'Stop', 获得条件: 'How to get it', 去练这一块: 'Practice this', 下一个目标: 'Next goals', 全部目标已完成: 'All goals complete', 记牢了: 'Remembered', 金锭: 'Gold', 另一天再次做对: 'Right again on another day', 铁锭: 'Iron', 格子第一次点亮: 'Square lit for the first time', '格子每升一档，多一件。只增不减。': 'Each square that levels up adds one. They never go away.', 木箱: 'Wooden Chest', 矿石: 'Ore', '练习时每答对一题，得到 1 块矿石。': 'Each right answer in practice earns 1 ore.',
    合上图鉴: 'Close book', 伙伴图鉴: 'Pal Book', 已解锁: 'Unlocked', '学会一个技能，解锁一只伙伴': 'Learn a skill to unlock a pal', 未解锁: 'Locked', 留在图鉴: 'Keep in book', 带回家: 'Bring home', 附魔: 'Enchanted', 收好: 'Keep it', 打印奖状: 'Print award', 新伙伴: 'New pal', 伙伴附魔: 'Pal enchanted', 点箱子打开: 'Tap the chest to open', 战利品: 'Loot', 已放入家中: 'Added to your home', 这件摆在地上: 'This goes on the floor', 这件挂在墙上: 'This goes on the wall', '点一件东西，再点新位置': 'Tap an item, then tap a new spot', 已保存摆放: 'Arrangement saved',
    // 奖状
    草原牧羊人: 'Meadow Shepherd', 草原牧羊大师: 'Master Shepherd', 矿洞矿工: 'Mine Worker', 矿洞大师: 'Mine Master', 村庄建筑师: 'Village Builder', 村庄建筑大师: 'Master Builder', 双塔哨兵: 'Tower Lookout', 双塔将军: 'Tower General', 铁轨列车长: 'Train Conductor', 铁轨大师: 'Railway Master', 花园园丁: 'Gardener', 花园大师: 'Garden Master', 集市伙计: 'Market Helper', 集市掌柜: 'Market Owner', 码头水手: 'Sailor', 码头船长: 'Ship Captain', 打败果冻王: 'Beat the Jelly King', 驯服果冻王: 'Tamed the Jelly King', 打败骷髅将军: 'Beat the Bone General', 驯服骷髅将军: 'Tamed the Bone General', 打败蜘蛛女王: 'Beat the Spider Queen', 驯服蜘蛛女王: 'Tamed the Spider Queen', 打败巨龙: 'Beat the Great Dragon', 驯服巨龙: 'Tamed the Great Dragon', 平安度过第一夜: 'Safe First Night', 搭好营地: 'Camp Builder', 老探险家: 'Seasoned Explorer', 百日传奇: '100-Day Legend', 点燃熔炉: 'Furnace Lit', 熔炉师傅: 'Furnace Expert', 炼金大师: 'Master Smith',
    错题第一次复习做对: 'Get a mistake right on review for the first time', '写错的题，复习时做对了': 'You got a missed question right on review', '错的题，在这里炼成会的题': 'This is where mistakes turn into things you know', 这个技能全部格子点亮: 'Every square in this skill lit', 这个技能全部格子变深红: 'Every square in this skill dark red', 全部格子变深红: 'Every square dark red', '第 1 张附魔奖状': 'First enchanted award', '第一次练满 10 分钟': 'First 10-minute practice', '点亮第 1 个格子': 'Light your first square', '学会第 1 个技能': 'Learn your first skill', '岛上 6 个地方都点亮过格子': 'Light squares in 6 places on the island',
    // 道具
    火把: 'Torch', 木床: 'Wooden Bed', 工作台: 'Workbench', 熔炉: 'Furnace', 书架: 'Bookshelf', 铁镐: 'Iron Pickaxe', 小狗窝: 'Dog House', 望远镜: 'Telescope', 金镐: 'Gold Pickaxe', 灯笼: 'Lantern', 唱片机: 'Record Player', 钻石镐: 'Diamond Pickaxe', 盔甲架: 'Armor Stand', 钻石头盔: 'Diamond Helmet', 钻石胸甲: 'Diamond Chestplate', 钻石护腿: 'Diamond Leggings', 钻石靴子: 'Diamond Boots', 金奖杯: 'Gold Trophy', 蛋糕: 'Cake', 金苹果: 'Golden Apple', 小猫: 'Little Cat', 花盆: 'Flowerpot', 地毯: 'Rug', 挂画: 'Painting', 小旗: 'Little Flag', 时钟: 'Clock', 窗帘: 'Curtains', 小熊: 'Teddy Bear', 地球仪: 'Globe', 画架: 'Easel', 鱼缸: 'Fish Tank', 吊灯: 'Chandelier', 留声盒: 'Music Box', 船模: 'Model Ship', 星星灯: 'Star Lamp', 城堡模型: 'Model Castle',
    // 伙伴
    小狼: 'Little Wolf', 美西螈: 'Axolotl', 蜜蜂: 'Bee', 狐狸: 'Fox', 鹦鹉: 'Parrot', 熊猫: 'Panda', 羊: 'Sheep', 小猪: 'Piglet', 奶牛: 'Cow', 海龟: 'Sea Turtle', 青蛙: 'Frog', 小鸡: 'Chick', 兔子: 'Rabbit', 羊驼: 'Llama', 海豚: 'Dolphin', 北极熊: 'Polar Bear', 小马: 'Pony', 山羊: 'Goat', 鱿鱼: 'Squid', 河豚: 'Pufferfish',
    炸弹蘑菇: 'Bomb Mushroom', 弹弹果冻: 'Bouncy Jelly', 跳跳仙人掌: 'Hopping Cactus', 雪球怪: 'Snowball Beast', 矿灯蜘蛛: 'Headlamp Spider', 熔岩龟: 'Lava Tortoise', 闪现星: 'Blink Star', 铁皮骑士: 'Tin Knight', 骨头鼓手: 'Bone Drummer', 雷电小巫: 'Thunder Wizard', 章鱼海盗: 'Octopus Pirate', 夜翼蝠: 'Night Wing Bat', 绷带怪: 'Bandage Beast', 岩石巨人: 'Rock Giant', 齿轮机器人: 'Gear Robot', 火花精灵: 'Spark Sprite', 水晶龙: 'Crystal Dragon', 金龙: 'Gold Dragon', 海鸥: 'Seagull', 螃蟹: 'Crab', 蝴蝶: 'Butterfly', 蜗牛: 'Snail', 瓢虫: 'Ladybug', 布谷鸟: 'Cuckoo', 小货郎: 'Peddler', 金币猪: 'Coin Pig',
    '引线一闪一闪，碰一下就冒烟': 'Its fuse sparkles, and one touch makes it smoke', 最爱在草地上弹来弹去: 'Loves bouncing around the meadow', 沙漠里跑得最快的仙人掌: 'The fastest cactus in the desert', '住在雪山顶，打喷嚏会下雪': 'Lives on a snowy peak. Its sneezes make it snow', '戴着矿灯，在黑暗里帮你找路': 'Wears a headlamp and finds the way in the dark', 背上驮着一座小火山: 'Carries a tiny volcano on its back', 一眨眼就跑到你身后: "Behind you in the blink of an eye", '盔甲叮当响，从不后退': 'Armor clanking, never backing down', '一敲鼓，大家都想跳舞': 'One drumbeat and everyone wants to dance', '挥一挥手杖，就有一道闪电': 'One wave of the staff brings lightning', '八只手，抢的全是好吃的': 'Eight arms, and all of them grab snacks', '白天睡觉，晚上巡逻': 'Sleeps by day, patrols by night', 身上的绷带总是散开: 'Its bandages keep coming loose', '睡一觉，身上就长满青苔': 'One nap and it is covered in moss', 算题比谁都快: 'Solves math faster than anyone', '走到哪里，哪里就亮': 'Lights up wherever it goes', 翅膀像冰一样透明: 'Wings as clear as ice', 岛上最厉害的伙伴: 'The greatest pal on the island', 码头上最爱抢薯条的: 'The dock\'s top french fry thief', '横着走，从不撞船': 'Walks sideways and never hits a boat', 翅膀上的花纹左右一样: 'The patterns on both wings match', 一步一步数着走: 'Counts every step', 背上的点一边一样多: 'The same number of spots on each side', 整点准时出来叫: 'Calls right on the hour', 背包里什么都有: 'Has everything in the pack', 肚子里全是零钱: 'A belly full of coins',
  };

  // ---------- 正则模式（整句） ----------
  const P = [
    // 应用题
    [new RegExp(`^${WHO}有 (\\d+) ${M}${THG}，又得到 (\\d+) ${M}。一共几${M}？$`), (m, w, a, t, b) => `${NAME[w]} has ${thing(a, t)} and gets ${b} more. How many in all?`],
    [new RegExp(`^${WHO}有 (\\d+) ${M}${THG}，送出 (\\d+) ${M}。还剩几${M}？$`), (m, w, a, t, b) => `${NAME[w]} has ${thing(a, t)} and gives away ${b}. How many are left?`],
    [new RegExp(`^${WHO}要 (\\d+) ${M}${THG}，已经有 (\\d+) ${M}。还差几${M}？$`), (m, w, a, t, b) => `${NAME[w]} needs ${thing(a, t)} and has ${b}. How many more?`],
    [new RegExp(`^${WHO}有 (\\d+) ${M}${THG}，${WHO}有 (\\d+) ${M}。${WHO}多几${M}？$`), (m, w, a, t, w2, b, w3) => `${NAME[w]} has ${thing(a, t)}. ${NAME[w2]} has ${b}. How many more does ${NAME[w3]} have?`],
    [new RegExp(`^${WHO} (\\d+) ${M}${THG}，${WHO} (\\d+) ${M}。${WHO}多几${M}？$`), (m, w, a, t, w2, b, w3) => `${NAME[w]} has ${thing(a, t)}. ${NAME[w2]} has ${b}. How many more does ${NAME[w3]} have?`],
    [new RegExp(`^${WHO}有 (\\d+) 盒${THG}，每盒 (\\d+) ${M}。一共几${M}？$`), (m, w, a, t, b) => `${NAME[w]} has ${pl(a, 'box', 'boxes')} of ${THING[t][1]}. Each box has ${b}. How many in all?`],
    [new RegExp(`^${WHO}有 (\\d+) ${M}${THG}，平均分成 (\\d+) 份，每份一样多。每份几${M}？$`), (m, w, a, t, b) => `${NAME[w]} has ${thing(a, t)} and shares them evenly into ${pl(b, 'group')}. How many are in each group?`],
    [/^矿车里有 (\d+) 块(金矿|钻矿|铁矿)，又装进 (\d+) 块。一共几块？$/, (m, a, o, b) => `The cart has ${pl(a, 'chunk')} of ${ORE[o]} ore, and ${b} more ${+b === 1 ? 'goes' : 'go'} in. How many chunks in all?`],
    [/^有 (\d+) 只羊，跑走 (\d+) 只。还剩几只？$/, (m, a, b) => `There are ${a} sheep. ${b} ${+b === 1 ? 'runs' : 'run'} away. How many are left?`],
    [/^(\d+) 只小狼，每只吃 (\d+) 根骨头。有 (\d+) 根，还差几根？$/, (m, a, b, c) => `${pl(a, 'little wolf', 'little wolves')} each ${+a === 1 ? 'eats' : 'eat'} ${pl(b, 'bone')}. There ${+c === 1 ? 'is' : 'are'} ${pl(c, 'bone')}. How many more are needed?`],
    [/^东西 (\d+) 元，付了 (\d+) 元。找回几元？$/, (m, a, b) => `It costs ${a} yuan. You pay ${b} yuan. How much change do you get?`],
    [/^有 (.+元)。一共几元？$/, (m, l) => `You have ${andList(l.split('，').map(x => { const r = /^(\d+) 张 (\d+) 元$/.exec(x); return `${pl(r[1], 'bill')} of ${r[2]} yuan`; }))}. How many yuan in all?`],
    [/^每次多 (\d+)。下一个是几？$/, (m, a) => `It goes up by ${a} each time. What comes next?`],
    [/^现在是 (\d+) 点几分？$/, (m, h) => `It's after ${h} o'clock. How many minutes past?`],
    // 时间、钱
    [/^(\d+) 点半$/, (m, h) => `half past ${h}`],
    [/^(\d+) 点$/, (m, h) => `${h} o'clock`],
    [/^点$/, () => "o'clock"],
    [/^(\d+) 元$/, (m, a) => `${a} yuan`],
    [/^应该是 (.+)$/, (m, a) => { const r = one(a); return r === null ? null : `It should be ${r}`; }],
    [/^(\d+) 年 (\d+) 月 (\d+) 日$/, (m, y, mo, d) => `${MONTH[+mo - 1]} ${+d}, ${y}`],
    // 数位
    [/^(\d+) 里有 □ 个(百|十|一)$/, (m, n, u) => `${n} has □ ${{百: 'hundreds', 十: 'tens', 一: 'ones'}[u]}`],
    [/^(\d+) 里有$/, (m, n) => `${n} has`],
    [/^(\d+) 里有几个(十|一)$/, (m, n, u) => `How many ${u === '十' ? 'tens' : 'ones'} in ${n}`],
    [/^(\d+) 个十和 (\d+) 个一，是$/, (m, t, o) => `${pl(t, 'ten')} and ${pl(o, 'one')} make`],
    [/^(\d+) 个十$/, (m, a) => pl(a, 'ten')], [/^(\d+) 个一$/, (m, a) => pl(a, 'one')],
    [/^(\d+) 是$/, (m, a) => `${a} is`],
    [/^(\d+) 是 (\d+) 个十和$/, (m, a, t) => `${a} is ${pl(t, 'ten')} and`],
    [/^(\d+) 根十 (\d+) 块一$/, (m, t, o) => `${pl(t, 'rod')}, ${pl(o, 'cube')}`],
    [/^拼成 (\d+) 根$/, (m, a) => `Make ${pl(a, 'rod')}`],
    [/^(\d+) 根是 (\d+) 个十，是 (\d+)$/, (m, a, b, c) => `${pl(a, 'rod')} ${+a === 1 ? 'is' : 'are'} ${pl(b, 'ten')}, which is ${c}`],
    [/^(\d+) 个百、(\d+) 个十、(\d+) 个一，是 (\d+)$/, (m, h, t, o, n) => `${pl(h, 'hundred')}, ${pl(t, 'ten')}, and ${pl(o, 'one')} make ${n}`],
    [/^(\d+) = (\d+) 个百、(\d+) 个十、(\d+) 个一$/, (m, n, h, t, o) => `${n} = ${pl(h, 'hundred')}, ${pl(t, 'ten')}, and ${pl(o, 'one')}`],
    [/^(\d+) 百 (\d+) 十 (\d+) 个$/, (m, h, t, o) => `${pl(h, 'hundred')} ${pl(t, 'ten')} ${pl(o, 'one')}`],
    // 比大小
    [/^(\d+) 在 (\d+) 的右边，\1 大$/, (m, a, b) => `${a} is to the right of ${b}, so ${a} is bigger`],
    [/^(.+) 和 (.+) 谁大$/, (m, a, b) => `Which is bigger: ${a} or ${b}?`],
    [/^比 (\d+) 多 (\d+)$/, (m, a, b) => `${a} plus ${b}`], [/^比 (\d+) 少 (\d+)$/, (m, a, b) => `${a} minus ${b}`],
    [/^多 (\d+)$/, (m, a) => `${a} more`], [/^少 (\d+)$/, (m, a) => `${a} less`],
    [/^多 (\d+)：往后数 (\d+) 个$/, (m, a, b) => `${a} more: count forward ${b}`], [/^少 (\d+)：往前数 (\d+) 个$/, (m, a, b) => `${a} less: count back ${b}`],
    [/^多 10：多 1 个十，一不变$/, () => '10 more: 1 more ten, same ones'], [/^少 10：少 1 个十，一不变$/, () => '10 less: 1 less ten, same ones'],
    [/^跳 (\d+) 格$/, (m, a) => `Jump ${pl(a, 'space')}`], [/^跳 (\d+) 个十$/, (m, a) => `Jump ${pl(a, 'ten')}`],
    [/^(\d+) 以内$/, (m, a) => `Within ${a}`], [/^(\d+) 以内谁大$/, (m, a) => `Bigger Number to ${a}`], [/^(\d+) 以内应用题$/, (m, a) => `Word Problems to ${a}`],
    // 看数、分合
    [/^骰子 (\d+)$/, (m, a) => `Dice ${a}`], [/^乱点 (\d+)$/, (m, a) => `Scattered dots ${a}`], [/^十格框 (\d+)$/, (m, a) => `Ten frame ${a}`], [/^两个十格框 (\d+)$/, (m, a) => `Two ten frames ${a}`],
    [/^(\d+) 和 (\d+)，是$/, (m, a, b) => `${a} and ${b} make`], [/^上面一行是 (\d+) 个$/, (m, a) => `The top row has ${a}`], [/^(\d+) 个圆点$/, (m, a) => pl(a, 'dot')], [/^分成 (\d+) 个和 (\d+) 个$/, (m, a, b) => `Split into ${a} and ${b}`],
    [/^(\d+) 里有 (\d+) 个，还差 (\d+) 个$/, (m, a, b, c) => `${a} has ${b}, with ${c} more to go`], [/^(\d+) 和 (\d+) 合起来是 (\d+)$/, (m, a, b, c) => `${a} and ${b} make ${c}`], [/^(\d+) 个点，还空 (\d+) 格，凑满 (\d+)$/, (m, a, b, c) => `${pl(a, 'dot')} and ${pl(b, 'empty space')} make ${c}`],
    [/^(\d+) 里拿走 (\d+)，还剩 (\d+)$/, (m, a, b, c) => `${a} take away ${b} leaves ${c}`], [/^(\d+) 再加回 (\d+)，是 (\d+)$/, (m, a, b, c) => `${a}, add ${b} back, is ${c}`], [/^(\d+) 里拿走几个剩 (\d+)？拿走 (\d+) 个$/, (m, a, b, c) => `Take how many from ${a} to leave ${b}? Take ${c}`],
    [/^(\d+) 个 \+ 挪来 (\d+) 个$/, (m, a, b) => `${a} + ${b} moved over`], [/^(\d+) 个挪走 (\d+) 个，剩 (\d+)$/, (m, a, b, c) => `${a}, move ${b}, ${c} left`], [/^从 (\d+) 里拿 (\d+) 个凑满 (\d+)，还剩 (\d+)$/, (m, a, b, c, d) => `Take ${b} from ${a} to make ${c}, and ${d} ${+d === 1 ? 'is' : 'are'} left`],
    [/^(\d+) 个和 (\d+) 个$/, (m, a, b) => `${a} and ${b}`], [/^挪 (\d+) 个凑满 (\d+)$/, (m, a, b) => `Move ${a} to make ${b}`], [/^还剩 (\d+)$/, (m, a) => `${a} left`],
    [/^(\d+) 和 (\d+)$/, (m, a, b) => `${a} and ${b}`],
    // 规律
    [/^规律是 ([红蓝黄青绿灰 ]+)，下一块是(.)$/, (m, l, c) => `The pattern is ${colors(l)}, so ${COLOR[c]} comes next`],
    [/^每次多 (\d+)$/, (m, a) => `It goes up by ${a} each time`], [/^每次多 (\d+)：(.+)$/, (m, a, e) => `It goes up by ${a} each time: ${e}`], [/^每次少 (\d+)：(.+)$/, (m, a, e) => `It goes down by ${a} each time: ${e}`], [/^(\d+) 是错的$/, (m, a) => `${a} is wrong`], [/^每次多 (\d+)，这里应该是 (\d+)$/, (m, a, b) => `It goes up by ${a} each time, so this should be ${b}`], [/^每次少 (\d+)，这里应该是 (\d+)$/, (m, a, b) => `It goes down by ${a} each time, so this should be ${b}`],
    // 钟
    [/^短针指 (\d+)，长针指 (\d+)$/, (m, a, b) => `The short hand points to ${a} and the long hand points to ${b}`], [/^长针指 6 是半点；短针刚过 (\d+)，是 \1 点半$/, (m, a) => `The long hand on 6 means half past. The short hand just passed ${a}, so it's half past ${a}`], [/^长针指 (\d+)，(\d+) 个 5 分钟是 (\d+) 分$/, (m, a, b, c) => `The long hand points to ${a}. ${pl(b, 'group')} of 5 minutes is ${c} minutes`],
    // 应用题讲解
    [/^(\d+) 块和 (\d+) 块合起来$/, (m, a, b) => `Put ${a} and ${b} together`], [/^从 (\d+) 只里去掉 (\d+) 只$/, (m, a, b) => `Take ${b} away from ${a}`],
    [/^(\d+) 个 (\d+)：(\d+) × (\d+)$/, (m, a, b, c, d) => `${pl(a, 'group')} of ${b}: ${c} × ${d}`], [/^(\d+) 个 (\d+)：([\d、…]+)，是 (\d+)$/, (m, a, b, l, n) => `${pl(a, 'group')} of ${b}: ${l.replace(/、/g, ', ')}. That's ${n}`], [/^(\d+) 个 (\d+) 是 (\d+)$/, (m, a, b, c) => `${pl(a, 'group')} of ${b} is ${c}`], [/^想乘法：(.+)，所以是 (\d+)$/, (m, e, a) => `Think multiplication: ${e}, so it's ${a}`],
    [/^每份一样多叫平均分，用除法：(.+)$/, (m, e) => `Equal groups means sharing evenly, so divide: ${e}`],
    // 进阶讲解
    [/^(\d+) 排，每排 (\d+) 个，一共 (\d+) 个$/, (m, a, b, c) => `${pl(a, 'row')} of ${b} is ${c}`], [/^(\d+) 排 (\d+) 个$/, (m, a, b) => `${pl(a, 'row')} of ${b}`], [/^(\d+) 行是 (\d+)，再加 (\d+) 个，是 (\d+)$/, (m, a, b, c, d) => `${pl(a, 'row')} ${+a === 1 ? 'is' : 'are'} ${b}, plus ${c} more is ${d}`], [/^(\d+) 行，每行 10 个，是 (\d+)$/, (m, a, b) => `${pl(a, 'row')} of 10 is ${b}`], [/^百格 (\d+)$/, (m, a) => `Chart ${a}`],
    [/^(\d+) 个十分成 (\d+) 个十和 (\d+) 个十$/, (m, a, b, c) => `${pl(a, 'ten')} ${+a === 1 ? 'splits' : 'split'} into ${pl(b, 'ten')} and ${pl(c, 'ten')}`], [/^(\d+) 个十，再要 (\d+) 个十就是 100$/, (m, a, b) => `${pl(a, 'ten')}, and ${b} more ${+b === 1 ? 'ten makes' : 'tens make'} 100`], [/^(\d+) 分成 (\d+) 和 (\d+)$/, (m, a, b, c) => `${a} splits into ${b} and ${c}`],
    [/^先算 (.+)，再(加|减) (\d+)，是 (\d+)$/, (m, e, o, b, c) => `First ${e}, then ${o === '加' ? 'add' : 'subtract'} ${b} to get ${c}`],
    // 秒答讲解（render.js 的 speedWhy）
    [/^从大的 (\d+) 开始：(.+)$/, (m, a, r) => { const t = one(r); return t === null ? null : `Start with the bigger ${a}: ${t}`; }],
    [/^几个一：(.+)，是 (\d+)$/, (m, e, a) => `Ones: ${e}, so it's ${a}`],
    [/^(\d+) 和 (\d+) 正好凑成 (\d+)$/, (m, a, b, c) => `${a} and ${b} make exactly ${c}`], [/^(\d+) 和 (\d+) 是 (\d+)$/, (m, a, b, c) => `${a} and ${b} make ${c}`],
    [/^(\d+) 先加 (\d+) (?:凑成|到) (\d+)，再加 (\d+)，(?:是|一共) (\d+)$/, (m, a, b, c, d, e) => `${a} plus ${b} is ${c}, plus ${d} more is ${e}`], [/^(\d+) 先减 (\d+) 到 (\d+)，再减 (\d+)，是 (\d+)$/, (m, a, b, c, d, e) => `${a} minus ${b} is ${c}, minus ${d} more is ${e}`],
    [/^(\d+) 去掉 (\d+) 个一，剩 (\d+)$/, (m, a, b, c) => `Take ${pl(b, 'one')} from ${a} to get ${c}`], [/^(\d+) 拿出 1 个十：(.+)，(.+)$/, (m, a, e, f) => `Take 1 ten from ${a}: ${e}, then ${f}`],
    [/^(\d+) 加 (\d+) 个十，是 (\d+)$/, (m, a, b, c) => `${a} plus ${pl(b, 'ten')} is ${c}`], [/^(\d+) 减 (\d+) 个十，是 (\d+)$/, (m, a, b, c) => `${a} minus ${pl(b, 'ten')} is ${c}`],
    [/^先(加|减)几个十：(.+)；再(加|减) (\d+)：(.+)$/, (m, o, e, o2, b, r) => { const t = one(r); return t === null ? null : `${o === '加' ? 'Add' : 'Subtract'} the tens first: ${e}. Then ${o2 === '加' ? 'add' : 'subtract'} ${b}: ${t}`; }],
    [/^(\d+) 先加 (\d+) 到 (\d+)，再加 (\d+) 到 100，一共 (\d+)$/, (m, a, b, c, d, e) => `${a} plus ${b} is ${c}, plus ${d} more is 100. That's ${e} in all`],
    [/^⚠ (.+)$/, (m, r) => { const t = one(r); return t === null ? null : `⚠ ${t}`; }],
    // 价钱讲解、标签
    [/^先加大的，再加小的：(.+)$/, (m, e) => `Add the big ones first, then the small ones: ${e}`], [/^付的钱减去东西的价钱：(.+)$/, (m, e) => `What you paid minus the price: ${e}`],
    [/^合起来用加法：(.+)$/, (m, e) => `Putting together means adding: ${e}`], [/^送出去了用减法：(.+)$/, (m, e) => `Giving away means subtracting: ${e}`], [/^要的减去有的：(.+)$/, (m, e) => `What you need minus what you have: ${e}`], [/^多的减去少的：(.+)$/, (m, e) => `The bigger amount minus the smaller: ${e}`],
    [/^两头是 0 和 (\d+)$/, (m, a) => `Ends: 0 and ${a}`], [/^中间是 (\d+)$/, (m, a) => `Middle: ${a}`], [/^(\d+) 在这里$/, (m, a) => `${a} is here`],
    [/^0—(\d+) 数线$/, (m, a) => `Number Line 0—${a}`], [/^0 到 (\d+)$/, (m, a) => `0 to ${a}`], [/^0 到 (\d+) (整十|整百|任意数)$/, (m, a, w) => `0 to ${a}, ${{整十: 'tens', 整百: 'hundreds', 任意数: 'any number'}[w]}`],
    [/^世界 (\d+)$/, (m, a) => `World ${a}`], [/^(\d+) 加几$/, (m, a) => `Adding to ${a}`], [/^十几减 (\d+)$/, (m, a) => `Teens minus ${a}`],
    // 首页
    [/^空空，今天还剩 (\d+) 分钟$/, (m, a) => `Kongkong, ${pl(a, 'minute')} left today`],
    [/^(\d+) 天没备份$/, (m, a) => `No backup for ${a} days`],
    [/^复习 (\d+) 道错题，(.+)$/, (m, a, r) => { const t = one(r); return t === null ? null : `Review ${pl(a, 'mistake')}. ${t}`; }],
    [/^先去(.+)$/, (m, z) => { const t = one(z); return t === null ? null : `First stop: ${t}`; }],
    [/^亮了 (\d+) \/ (\d+) 格$/, (m, a, b) => `${a} of ${pl(b, 'square')} lit`],
    [/^这里的错题（(\d+)）$/, (m, a) => `Mistakes here (${a})`],
    [/^今天去(.+)吧！$/, (m, z) => { const t = one(z); return t === null ? null : `Let's go to ${t} today!`; }],
    // 秒答地图
    [/^秒答 = (\d+) 秒内说对$/, (m, a) => `Speed = say it right within ${a} seconds`], [/^秒答 = 又对又快$/, () => 'Speed = right and fast'], [/^达标 = 3～5 秒内说对，一天 5 次升一级$/, () => 'Target = say it right in 3–5 seconds. 5 times in a day levels up'], [/^达标 = 又对又快，一天 5 次升一级$/, () => 'Target = right and fast. 5 times in a day levels up'],
    [/^深红 (\d+)$/, (m, a) => `Dark red ${a}`], [/^淡红 (\d+)$/, (m, a) => `Light red ${a}`], [/^淡黄 (\d+)$/, (m, a) => `Light yellow ${a}`], [/^共 (\d+) 张$/, (m, a) => `${pl(a, 'card')} in all`], [/^共 (\d+) 种题型$/, (m, a) => `${pl(a, 'type')} in all`], [/^共 (\d+) 格$/, (m, a) => `${pl(a, 'square')} in all`],
    [/^第一次练「(.+)」：点「加法练习」，从第一个世界开始，会的当场点亮。$/, (m, a) => { const t = one(a); return t === null ? null : `First time on "${t}": tap "Addition" and start with the first world. What you know lights up right away.`; }],
    [/^每天的练习里，学会「(.+)」以后才出这一级后面的世界$/, (m, a) => { const t = one(a); return t === null ? null : `In daily practice, later worlds at this level appear after you learn "${t}"`; }],
    [/^深红 (\d+)\/(\d+)$/, (m, a, b) => `Dark red ${a}/${b}`], [/^最终 Boss$/, () => 'Final Boss'], [/^挑战(.+)$/, (m, a) => { const t = one(a); return t === null ? null : `Challenge the ${t}`; }], [/^今天 (\d+)\/(\d+)$/, (m, a, b) => `Today ${a}/${b}`],
    // 校准
    [/^第 (\d+) 遍，共 (\d+) 遍$/, (m, a, b) => `Try ${a} of ${b}`], [/^已写 (\d+) \/ (\d+)$/, (m, a, b) => `Written ${a} / ${b}`],
    // 练习
    [/^(\d+) 分钟 ✓$/, (m, a) => `${a} minutes ✓`], [/^还剩 (\d+:\d+)$/, (m, a) => `${a} left`], [/^第 (\d+) 题$/, (m, a) => `Question ${a}`], [/^⚡ 秒答 (\d+)$/, (m, a) => `⚡ Fast ${a}`], [/^⚡ 达标 (\d+)$/, (m, a) => `⚡ On target ${a}`], [/^([\d.]+) 秒$/, (m, a) => `${a} seconds`],
    [/^你写的是 (\d+)$/, (m, a) => `You wrote ${a}`], [/^答案是 (.+)$/, (m, a) => `The answer is ${a}`], [/^蓝旗是你插的，绿旗是 (\d+) 的位置$/, (m, a) => `The blue flag is yours. The green flag marks ${a}`], [/^再往(右|左)(一点)?$/, (m, d, n) => `${n ? 'A little more' : 'Move'} to the ${d === '右' ? 'right' : 'left'}`], [/^(\d+) 在绿旗这里$/, (m, a) => `${a} is at the green flag`],
    // 结算
    [/^(秒答|达标) (\d+) 题就能打败 Boss，想打随时再来$/, (m, w, a) => `${w === '秒答' ? 'Answer' : 'Hit the target on'} ${a} ${w === '秒答' ? 'fast ' : ''}to beat the Boss. Try again anytime`], [/^(秒答|达标) (\d+) 题$/, (m, w, a) => `${w === '秒答' ? 'Fast' : 'On target'}: ${a}`], [/^慢了 (\d+) 题$/, (m, a) => `Slow: ${a}`], [/^写错 (\d+) 题$/, (m, a) => `Wrong: ${a}`], [/^用时约 (\d+) 分钟$/, (m, a) => `About ${pl(a, 'minute')}`], [/^写对的平均 ([\d.–]+) 秒$/, (m, a) => (a === '–' ? 'Average when right: –' : `Average when right: ${a} seconds`)],
    [/^挖到 (\d+) 块矿石$/, (m, a) => `Mined ${pl(a, 'ore')}`], [/^新进错题本 (\d+) 道，明天再来$/, (m, a) => `${pl(a, 'new mistake')} added. Back tomorrow`],
    // 摸底结果
    [/^亮了 (\d+) 格$/, (m, a) => `${pl(a, 'square')} lit`], [/^(.+) 会了$/, (m, l) => { const a = l.split(/(?<!\d)、|、(?!\d)/).map(one); return a.includes(null) ? null : `Got it: ${a.join(', ')}`; }], [/^还有 (\d+) 分钟，接着练今天的$/, (m, a) => `${pl(a, 'minute')} left. Keep going with today's practice`],
    // 技能地图、错题
    [/^最近 (\d+) 次对了 (\d+) 次$/, (m, a, b) => `${b} of the last ${a} right`], [/^(\d+) 天后$/, (m, a) => `in ${a} days`], [/^今天 (\d+)$/, (m, a) => `Today ${a}`], [/^复习中 (\d+)$/, (m, a) => `Reviewing ${a}`], [/^会了 (\d+)$/, (m, a) => `Learned ${a}`], [/^还有 (\d+) 道$/, (m, a) => `${a} more`],
    // 家
    [/^已完成 (\d+) \/ (\d+)$/, (m, a, b) => `Done ${a} / ${b}`], [/^盔甲件数：(\d+) \/ (\d+)$/, (m, a, b) => `Armor pieces: ${a} / ${b}`], [/^得到日期：(.+)$/, (m, d) => { const t = one(d); return t === null ? null : `Earned: ${t}`; }], [/^已复习做对 (\d+) 道错题$/, (m, a) => `${pl(a, 'mistake')} fixed on review`], [/^已选择 (.+)，点一个位置$/, (m, a) => { const t = one(a); return t === null ? null : `${t} selected. Tap a spot`; }], [/^学会「(.+)」后解锁$/, (m, a) => { const t = one(a); return t === null ? null : `Learn "${t}" to unlock`; }], [/^学会了「(.+)」(?:，全部隔 3 天还做对)?$/, (m, a) => { const t = one(a); return t === null ? null : `Learned "${t}"${m.includes('隔') ? ', still right 3 days later' : ''}`; }], [/^，全部隔 3 天还做对$/, () => ', still right 3 days later'],
    // 奖状和道具
    [/^(.+)全部格子点亮$/, (m, a) => { const t = one(a); return t === null ? null : `Every square lit in ${t}`; }], [/^(.+)全部格子变深红$/, (m, a) => { const t = one(a); return t === null ? null : `Every square dark red in ${t}`; }], [/^学会了(.+)全部 (\d+) 格$/, (m, a, n) => { const t = one(a); return t === null ? null : `Learned all ${n} squares of ${t}`; }], [/^(.+)全部 (\d+) 格，都记牢了$/, (m, a, n) => { const t = one(a); return t === null ? null : `All ${n} squares of ${t}, remembered for good`; }], [/^累计练习 (\d+) 天$/, (m, a) => `${pl(a, 'day')} of practice`], [/^(\d+) 道错题真的会了$/, (m, a) => `Really learn ${pl(a, 'mistake')}`], [/^(\d+) 道错题过完 5 次复习$/, (m, a) => `${pl(a, 'mistake')} passed 5 reviews`], [/^(\d+) 个格子点亮$/, (m, a) => `Light ${pl(a, 'square')}`], [/^(\d+) 个格子变淡红$/, (m, a) => `Turn ${pl(a, 'square')} light red`], [/^(\d+) 个格子变深红$/, (m, a) => `Turn ${pl(a, 'square')} dark red`], [/^学会 (\d+) 个技能$/, (m, a) => `Learn ${pl(a, 'skill')}`], [/^秒答 (.+)$/, (m, a) => { const t = one(a); return t === null ? null : `Speed ${t}`; }],
  ];

  // 拆开的文本节点：跟在一个数字节点后面，要看前面是不是 1 才知道单复数
  const AFTER = [
    [/^ 个百$/, o => (o ? ' hundred' : ' hundreds')], [/^ 个十$/, o => (o ? ' ten' : ' tens')], [/^ 个一$/, o => (o ? ' one' : ' ones')],
    [/^ 个十和 (\d+) 个一$/, (o, n) => ` ${o ? 'ten' : 'tens'} and ${pl(n, 'one')}`],
    [/^ 格$/, o => (o ? ' square' : ' squares')],
    [/^ 分$/, o => (o ? ' minute' : ' minutes')],
  ];
  // 带空格才有意义的片段（前后接着一个数字节点）
  const RAW = {
    '比 ': 'Start at ', ' 多 ': ', count on ', ' 少 ': ', count back ', '是 ': 'You land on ', '把旗子插到 ': 'Put the flag on ', ' 的位置': '', ' 里有几个十？': ': how many tens?', ' 里有几个一？': ': how many ones?',
    ' 分钟 · 点亮 ': ' min · lit ', '练了 ': 'Practiced ', '新放进 ': 'Added: ', ' 道 · 今天复习过关 ': ' · Passed review today: ', ' 道': '', '点亮了 ': 'Lit ', '已解锁 ': 'Unlocked ', ' 块': '', '矿石 ': 'Ore ', '奖状 ': 'Awards ', '伙伴 ': 'Pals ', '钻石 ': 'Diamonds ',
    ' ？': '?', '你写的是 ': 'You wrote ', '今天要复习 ': 'To review today: ', ' 点': " o'clock", ' 更大': ' is bigger', '，全部隔 3 天还做对': ', still right 3 days later', ' · 附魔': ' · Enchanted',
  };
  const RAWP = [
    [/^ 多 (\d+)( 是 )?$/, (m, a, b) => ` plus ${a}${b ? ' is ' : ''}`], [/^ 少 (\d+)( 是 )?$/, (m, a, b) => ` minus ${a}${b ? ' is ' : ''}`],
    [/^(\d+) 点 $/, (m, a) => `${a} o'clock and `],
    [/^(\d+) 是 (\d+) 个十和 $/, (m, a, t) => `${a} is ${pl(t, 'ten')} and `],
    [/^ · 学会「(.+)」后解锁$/, (m, a) => { const t = one(a); return t === null ? null : ` · Learn "${t}" to unlock`; }],
    [/^亮了 (\d+) 格 · $/, (m, a) => `${pl(a, 'square')} lit · `],
    [/^ · 最近 (\d+) 次对了 (\d+) 次$/, (m, a, b) => ` · ${b} of the last ${a} right`],
    [/^还没测完，下次接着看 · $/, () => 'Not finished yet. Continue next time · '],
  ];

  // ---------- 翻译一段（去掉前后空格之后）；翻不了返回 null ----------
  function one(c) {
    if (!ZH.test(c)) return c;
    if (Object.prototype.hasOwnProperty.call(D, c)) return D[c];
    if (!HAN.test(c)) return c.replace(/？/g, '?').replace(/，/g, ', ').replace(/、/g, ', ').replace(/：/g, ': ').replace(/（/g, '(').replace(/）/g, ')').replace(/～/g, '–');
    for (const [re, f] of P) { const m = re.exec(c); if (m) { const r = f(...m); if (r !== null) return r; } }
    // 「A · B」「A · 」分段
    const seg = c.split(/(\s+·\s+|\s+·$|^·\s+)/);
    if (seg.length > 1) { const a = seg.map((x, i) => (i % 2 ? x : x ? one(x) : '')); return a.includes(null) ? null : a.join(''); }
    // 「A：B」示范卡标题
    const ci = c.indexOf('：');
    if (ci > 0) { const a = one(c.slice(0, ci)), b = one(c.slice(ci + 1)); if (a !== null && b !== null) return `${a}: ${b}`; }
    return null;
  }
  const misses = new Set(), CACHE = new Map();
  function trRaw(s, prev) {
    if (!ZH.test(s)) return s;
    const o = String(prev || '').trim() === '1';
    for (const [re, f] of AFTER) { const m = re.exec(s); if (m) return f(o, ...m.slice(1)); }
    if (Object.prototype.hasOwnProperty.call(RAW, s)) return RAW[s];
    for (const [re, f] of RAWP) { const m = re.exec(s); if (m) { const r = f(...m); if (r !== null) return r; } }
    const w = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), r = one(w[2]);
    return r === null ? null : r === '' ? '' : w[1] + r + w[3];
  }
  function tr(s, prev) {
    if (!ZH.test(s)) return s;
    const key = String(prev || '').trim() === '1' ? '1' + s : '0' + s;
    if (CACHE.has(key)) return CACHE.get(key);
    let r = trRaw(s, prev);
    if (r === null) { misses.add(s); r = s; }
    if (CACHE.size > 20000) CACHE.clear();
    CACHE.set(key, r);
    return r;
  }

  // 一段 HTML 字符串按「文本节点 + 属性」翻译（测试用，和 DOM 层一个口径）
  const ATTRS = ['aria-label', 'title', 'data-say'];
  function html(h) {
    let prev = '';
    return String(h).replace(/<[^>]*>|[^<]+/g, tok => {
      if (tok[0] === '<') {
        if (tok[1] !== '/') prev = '';
        return tok.replace(/\b(aria-label|title|data-say)="([^"]*)"/g, (m, a, v) => `${a}="${tr(v)}"`);
      }
      const r = tr(tok, prev); if (/\S/.test(tok)) prev = tok; return r;
    });
  }

  // ---------- DOM 层（只在英文日工作；中文日完全不碰页面） ----------
  const SKIP = '#parent,#bankv,#habit,#ovQ,#ovCrash,#testBar,[data-i18n-skip]', NOTEXT = {SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1};
  const api = {ZH, isEn, misses, text: s => tr(String(s)), html, dump: () => Object.assign({}, D), get on() { return en; }, set, flush};
  let en = false, ob = null, zhTitle = null;
  const TX = new WeakMap(), AT = new WeakMap();
  function visitText(n) {
    const rec = TX.get(n), d = n.data;
    if (rec && d === rec.en) return;
    if (!ZH.test(d)) return;
    const pe = n.parentElement, short = pe && (pe.closest('.w-mini,#smTabs') ? SHORT[d] : d === '道具' && pe.closest('.lootI') ? 'Item' : null);
    const p = n.previousSibling, r = short || tr(d, p ? p.textContent : '');
    if (r !== d) { TX.set(n, {zh: d, en: r}); n.data = r; }
  }
  function visitAttrs(el) {
    if (!el.hasAttribute) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a); if (v === null || !ZH.test(v)) continue;
      const r = tr(v); if (r === v) continue;
      const rec = AT.get(el) || {}; rec[a] = {zh: v, en: r}; AT.set(el, rec); el.setAttribute(a, r);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { const p = root.parentElement; if (p && !NOTEXT[p.tagName] && !p.closest(SKIP)) visitText(root); return; }
    if (root.nodeType !== 1 || NOTEXT[root.tagName] || root.closest(SKIP)) return;
    visitAttrs(root);
    const w = document.createTreeWalker(root, 5, {acceptNode: n => (n.nodeType === 3 ? 1 : NOTEXT[n.tagName] || n.matches(SKIP) ? 2 : 1)});
    const nodes = []; let n; while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(x => (x.nodeType === 3 ? visitText(x) : visitAttrs(x)));
  }
  function handle(recs) {
    recs.forEach(r => {
      if (r.type === 'childList') r.addedNodes.forEach(n => { if (n.isConnected) walk(n); });
      else if (r.type === 'characterData') { if (r.target.isConnected) walk(r.target); }
      else if (r.target.isConnected && !r.target.closest(SKIP)) visitAttrs(r.target);
    });
  }
  // 布局前调用：把还没轮到的改动先翻好（量尺寸要量英文）
  function flush() { if (!ob || !en) return; handle(ob.takeRecords()); ob.takeRecords(); }
  function restore() {
    const w = document.createTreeWalker(document.body, 5), nodes = [document.body]; let n; while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(x => {
      if (x.nodeType === 3) { const r = TX.get(x); if (r && x.data === r.en) x.data = r.zh; TX.delete(x); return; }
      const rec = AT.get(x); if (!rec) return;
      Object.keys(rec).forEach(a => { if (x.getAttribute(a) === rec[a].en) x.setAttribute(a, rec[a].zh); }); AT.delete(x);
    });
  }
  function set(on) {
    const de = document.documentElement;
    de.classList.remove('i18n-wait');
    on = !!on; if (on === en) return;
    en = on;
    if (zhTitle === null) zhTitle = document.title;
    de.lang = on ? 'en' : 'zh-CN'; document.title = on ? tr(zhTitle) : zhTitle;
    if (on) {
      walk(document.body);
      ob.observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS});
    } else { ob.disconnect(); restore(); }
  }
  // 尽早建好：观察者按创建先后通知，翻译要排在页面量尺寸（fitBody）前面
  if (typeof MutationObserver !== 'undefined') ob = new MutationObserver(recs => { handle(recs); ob.takeRecords(); });
  return api;
});
