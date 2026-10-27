// 门 2 · 最大风险验证：统一每日练习引擎的节奏模拟（不是产品代码）
// 问题：每天 10 分钟、系统排课，新技能能不能稳步推进？错题会不会积压？有没有技能被饿死？
// 用法：node tools/sim-engine.js [天数=120]
'use strict';
const DAYS = +(process.argv[2] || 120);

// ---------- 技能图谱：编号、题目数、卡 / 题型、是否计时、前置技能 ----------
const SK = [];
const sk = (id, n, kind, timed, pre) => SK.push({id, n, kind, timed, pre});
// 顺序 = 说明书 §3.3 的 17 个技能顺序（"学新的"按这个顺序取）
sk('看数1·骰子', 6, 'card', 0, []);                 sk('看数2·乱点', 5, 'card', 0, []);
sk('比大小1·10内', 1, 'type', 1, []);                sk('看数3·十格框', 10, 'card', 0, ['看数1·骰子']);
sk('分合1·5以内', 10, 'card', 1, ['看数3·十格框']);    sk('看数4·两个十格框', 10, 'card', 0, ['看数3·十格框']);
sk('分合2·6到9', 26, 'card', 1, ['分合1·5以内']);      sk('数线1·0到10', 1, 'type', 0, ['比大小1·10内']);
sk('分合3·凑十', 9, 'card', 1, ['分合2·6到9']);        sk('比大小2·20内', 1, 'type', 1, ['比大小1·10内', '看数4·两个十格框']);
sk('分合4·缺数', 4, 'type', 1, ['分合3·凑十']);        sk('分合5·过十', 3, 'type', 1, ['分合3·凑十', '看数4·两个十格框']);
sk('数线2·0到20', 1, 'type', 0, ['数线1·0到10', '比大小2·20内']); sk('比大小3·两位数', 2, 'type', 1, ['比大小2·20内']);
sk('比大小4·前后数', 4, 'type', 1, ['比大小3·两位数']); sk('数线3·整十', 1, 'type', 0, ['数线2·0到20', '比大小3·两位数']);
sk('数线4·0到100', 1, 'type', 0, ['数线3·整十']);
// 秒答地图（已有）：L1 7 个世界 110 张，L2 8 个世界 90 张；空空已在 L2（L1 全深红，L2 前 4 个世界练过一半）
[20, 10, 12, 14, 16, 18, 20].forEach((n, i) => sk('秒答L1·' + i, n, 'card', 1, []));
[18, 9, 8, 13, 9, 8, 13, 12].forEach((n, i) => sk('秒答L2·' + i, n, 'card', 1, i < 4 ? [] : ['分合5·过十']));

// ---------- 题目状态 ----------
const items = [];
SK.forEach(s => { for (let k = 0; k < s.n; k++) items.push({s, lv: 0, d: [], seen: 0, win: [], last: -99, upDay: -99}); });
items.forEach(it => { if (it.s.id.startsWith('秒答L1')) { it.lv = 3; it.seen = 9; it.upDay = -30; it.d = [-40, -35, -30]; } });
items.filter(it => it.s.id.startsWith('秒答L2')).forEach((it, i) => { if (i % 2 === 0 && /L2·[0-3]/.test(it.s.id)) { it.lv = 1; it.seen = 3; it.d = [-2]; it.upDay = -2; } });

const learned = s => items.filter(i => i.s === s).every(i => i.lv >= 1);
const ready = s => s.pre.every(p => learned(SK.find(x => x.id === p)));
const due = (it, t) => (it.lv === 1 && it.d[0] < t) || (it.lv === 2 && t - it.d[1] >= 3);

// ---------- 孩子：每个技能练得越多越准（正确率上限按孩子类型） ----------
function child(p0, pmax, seed) {
  let x = seed; const r = () => (x = (x * 16807) % 2147483647) / 2147483647;
  const days = new Map();
  return {r, pass(it, t) {
    const k = days.get(it.s) || 0, p = Math.min(pmax, p0 + 0.05 * k);
    const fast = Math.min(0.95, 0.5 + 0.06 * k);
    const ok = r() < p, quick = !(it.s.timed && it.lv >= 1) || r() < fast;
    return {ok, pass: ok && quick};
  }, practiced(s) { days.set(s, (days.get(s) || 0) + 1 / 4); }};
}

// ---------- 升级（卡：一次合格；题型：最近 8 次 ≥ 7；都一天最多一级，淡红到深红隔 ≥ 3 天） ----------
function record(it, res, t) {
  it.seen++; it.last = t;
  if (it.s.kind === 'type') { it.win.push(res.pass ? 1 : 0); if (it.win.length > 8) it.win.shift(); }
  if (!res.pass || it.upDay === t) return;
  if (it.s.kind === 'type' && (it.win.length < 8 || it.win.reduce((a, b) => a + b) < 7)) return;
  if (it.lv === 0) { it.lv = 1; it.d[0] = t; it.upDay = t; if (it.s.kind === 'type') it.win = []; }
  else if (it.lv === 1 && it.d[0] < t) { it.lv = 2; it.d[1] = t; it.upDay = t; if (it.s.kind === 'type') it.win = []; }
  else if (it.lv === 2 && t - it.d[1] >= 3) { it.lv = 3; it.d[2] = t; it.upDay = t; }
}

// ---------- 错题本：1/2/4/7/15 天 ----------
const IV = [1, 2, 4, 7, 15];
let mistakes = [];

// ---------- 一次 10 分钟练习：复习 3 分钟 · 新学 3 分钟 · 熟练 4 分钟（按每题用时折成题数） ----------
const SEC = {understand: 8, fluency: 5};
const BACKLOG = +(process.argv[3] || 10);
const TYPE_REP = +(process.env.TYPE_REP || 3);
const NEWRULE = process.argv[4] === 'new'; // 默认和 v2 一致：答错都进错题本
function session(t, kid, stat) {
  const asked = new Set();
  // 新技能还在学（灰）时答错不进错题本，下次新学时继续出；学会以后再错才进
  const ask = (it, isMist) => {
    const res = kid.pass(it, t); record(it, res, t); asked.add(it.s);
    if (isMist) { if (res.pass) { isMist.k++; isMist.due = isMist.k >= 5 ? null : t + IV[isMist.k]; } else { isMist.k = 0; isMist.due = t + 1; } }
    else if (!res.ok && (it.lv >= 1 || !NEWRULE || it.s.id.startsWith('秒答'))) { const m = mistakes.find(m => m.it === it && m.due !== null); if (m) { m.k = 0; m.due = t + 1; } else mistakes.push({it, k: 0, due: t + 1}); }
    return it.s.id.startsWith('秒答') ? SEC.fluency : SEC.understand;
  };
  // 总预算 10 分钟：① 到期错题（最多 5 分钟）② 新学 3 分钟（积压时跳过）③ 今天能升级的 + 熟练，填满到 10 分钟
  const BUDGET = 600; let sec = 0;
  const dm = mistakes.filter(m => m.due !== null && m.due <= t).sort((a, b) => a.due - b.due);
  stat.dueMax = Math.max(stat.dueMax, dm.length);
  for (const m of dm) { if (sec >= 300) break; sec += ask(m.it, m); }
  const left = mistakes.filter(m => m.due !== null && m.due <= t).length;
  const backlog = left > BACKLOG; if (backlog) stat.skip++;
  const front = backlog ? [] : SK.filter(s => ready(s) && !learned(s) && !s.id.startsWith('秒答L1')).slice(0, 2);
  const newEnd = sec + 180;
  for (let round = 0; round < 8 && sec < newEnd && front.length; round++)
    for (const s of front) {
      const gray = items.filter(i => i.s === s && i.lv === 0).sort((a, b) => a.seen - b.seen).slice(0, s.kind === 'type' ? s.n : 3);
      for (const it of gray) { if (sec >= newEnd) break; sec += ask(it); }
    }
  // 熟练段：题型一旦被选中出 TYPE_REP 题（实际出题时和别的题交错，不连着出）
  const rep = it => it.s.kind === 'type' ? TYPE_REP : 1;
  const up = items.filter(it => due(it, t) && it.last !== t).sort((a, b) => a.last - b.last);
  for (const it of up) for (let k = 0; k < rep(it) && sec < BUDGET; k++) sec += ask(it);
  const flu = items.filter(it => it.lv >= 1 && it.lv < 3 && it.last !== t).sort((a, b) => a.lv - b.lv || a.last - b.last);
  for (const it of flu) for (let k = 0; k < rep(it) && sec < BUDGET; k++) sec += ask(it);
  asked.forEach(s => { kid.practiced(s); stat.lastSeen.set(s, t); });
  SK.forEach(s => { if (stat.lastSeen.has(s) && items.some(i => i.s === s && i.lv < 3)) stat.gap = Math.max(stat.gap, t - stat.lastSeen.get(s)); });
  stat.mins.push(sec / 60);
  const over = mistakes.filter(m => m.due !== null && m.due <= t).length; // 到期了、今天没做到的
  stat.overMax = Math.max(stat.overMax || 0, over); if (over) stat.overDays = (stat.overDays || 0) + 1;
}

function run(name, p0, pmax) {
  items.forEach(it => { if (!it.s.id.startsWith('秒答L1')) { it.lv = 0; it.d = []; it.seen = 0; it.win = []; it.last = -99; it.upDay = -99; } });
  items.filter(it => it.s.id.startsWith('秒答L2')).forEach((it, i) => { if (i % 2 === 0 && /L2·[0-3]/.test(it.s.id)) { it.lv = 1; it.seen = 3; it.d = [-2]; it.upDay = -2; } });
  mistakes = [];
  const kid = child(p0, pmax, 12345), stat = {dueMax: 0, mins: [], lastSeen: new Map(), gap: 0, skip: 0}, first = {}, allYellow = {}, allRed = {};
  for (let t = 0; t < DAYS; t++) {
    session(t, kid, stat);
    SK.forEach(s => {
      const its = items.filter(i => i.s === s);
      if (first[s.id] === undefined && its.some(i => i.seen)) first[s.id] = t + 1;
      if (allYellow[s.id] === undefined && its.every(i => i.lv >= 1)) allYellow[s.id] = t + 1;
      if (allRed[s.id] === undefined && its.every(i => i.lv >= 3)) allRed[s.id] = t + 1;
    });
  }
  const open = mistakes.filter(m => m.due !== null).length;
  console.log(`\n## ${name}（起始正确率 ${p0}，上限 ${pmax}）· ${DAYS} 天`);
  console.log('技能 | 第一次练 | 全部学会(淡黄) | 全部牢固(深红)');
  SK.filter(s => !s.id.startsWith('秒答L1')).forEach(s => console.log(`${s.id} | ${first[s.id] ?? '-'} | ${allYellow[s.id] ?? '-'} | ${allRed[s.id] ?? '-'}`));
  console.log(`每天用时（分钟）最多 ${Math.max(...stat.mins).toFixed(1)}，平均 ${(stat.mins.reduce((a, b) => a + b) / stat.mins.length).toFixed(1)}；单日到期错题最多 ${stat.dueMax} 道；第 ${DAYS} 天未掌握错题 ${open} 道；没练满的技能最长 ${stat.gap} 天没出现；因积压停学新内容 ${stat.skip} 天；练完后仍有到期错题没做到的天数 ${stat.overDays || 0}（最多剩 ${stat.overMax || 0} 道）`);
}
run('强', 0.85, 0.98);
run('一般', 0.7, 0.92);
run('弱', 0.55, 0.85);
