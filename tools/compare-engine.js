// 证明「只记录」：同种子跑两个版本的引擎，比较存档（去掉记录字段和真实时钟戳）。
// 用法：git archive <对照提交> v2 | tar -x -C <目录>，然后 node tools/compare-engine.js <目录>
const path = require('path'), root = path.resolve(process.argv[2]), cur = path.join(__dirname, '..');
const load = r => ({C: require(path.join(r, 'v2/core.js')), K: require(path.join(r, 'v2/skills.js')), E: require(path.join(r, 'v2/engine.js'))});
const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
function run(r, seed, correct) {
  const {C, K, E} = load(r), rand = rng(seed), S = C.blank(), real = Math.random; let n = 0;
  S.placedAt = 1; S.demoSeen = Object.fromEntries(K.SKILLS.concat(K.HARD).map(s => [s.id, true])); Math.random = rng(seed + 1);
  for (let d = 0; d < 120; d++) { if (d % 7 >= 5) continue; const day = C.addDays('2026-11-02', d), s = E.session(S, day, {rnd: rng(seed + d)}); let c = 0;
    for (let x = s.next(); x && c < 80; x = s.next()) { if (x.kind !== 'q') continue; c++; n++; const v = rand(), dunno = v > .97, ok = !dunno && v < correct; s.answer({ok, fast: ok && rand() < .7, secs: 5, readSecs: 4, peeked: rand() < .02, dunno}); } }
  Math.random = real; return {S, n};
}
const strip = S => { const o = JSON.parse(JSON.stringify(S)); delete o.slips; delete o.savedAt; for (const k in o.stats || {}) delete o.stats[k].h; for (const k in o.cards || {}) delete o.cards[k].last; return o; };
const walk = (a, b, p, out) => { if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) { if (a !== b) out.push(`${p}: ${JSON.stringify(a)} / ${JSON.stringify(b)}`); return; } for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], `${p}/${k}`, out); };
let bad = 0;
for (const [seed, c] of [[11, .95], [22, .8], [33, .6], [44, .9]]) {
  const a = run(root, seed, c), b = run(cur, seed, c), out = []; walk(strip(a.S), strip(b.S), '', out);
  console.log(`种子 ${seed} 正确率 ${c} 作答 ${a.n}/${b.n} 差异字段 ${out.length}`, out.slice(0, 5).join(' ; ')); if (out.length) bad++;
}
process.exit(bad ? 1 : 0);
