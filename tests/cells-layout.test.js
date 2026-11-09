// 2b-2 分步作答的排版（不缩字，11-09）：题面在等号后切两段、讲解句按「：」「，」切段，每段不断行。
// 这里查切段不丢字、英文逐段翻译拼起来和整句译法一致（不出现思维地点的 "Smaller than"）、段间有换行点。
const test = require('node:test'), assert = require('node:assert');
const HB = require('../v2/hardbank.js'), I = require('../v2/i18n.js'), K = require('../v2/skills.js'), R = require('../v2/render.js');
const IDS = ['speed:g10:divrem2', 'speed:g15:mixed'], cut = w => w.split(/(?<=[：，])(?!比)/);

test('讲解句切段：拼回去等于原句；每段英文都翻译了，拼起来等于整句英文', () => {
  IDS.forEach(id => HB.pools[id].forEach(x => { const w = x.q.why, ps = cut(w);
    assert.equal(ps.join(''), w);
    const en = ps.map(p => I.text(p)); en.forEach((t, i) => assert.ok(t && !/[一-鿿]/.test(t), `「${ps[i]}」没翻译：${t}`));
    assert.equal(en.join('').trim(), String(I.text(w)).trim(), w); assert.ok(!/Smaller/.test(en.join('')), w); }));
});

test('开关打开时：讲解里每段不断行、段间有 <wbr>；题面等号留在前一段', {skip: !K.MULTI_CELL}, () => {
  IDS.forEach(id => HB.pools[id].forEach(x => { const h = R.explain({id, q: x.q, ans: x.ans}).split('<div class="why">')[1];   // 查 render.js 的真实输出，不用上面抄的切法
    const ps = [...h.matchAll(/<span style="white-space:nowrap">([^<]*)<\/span>/g)].map(m => m[1]);
    assert.equal(ps.join(''), x.q.why, h); assert.ok(ps.length >= 2 && ps.every(p => !p.startsWith('比')), h);
    assert.equal((h.match(/<\/span><wbr><span/g) || []).length, ps.length - 1, h); }));
  const q = R.question({id: IDS[0], q: HB.pools[IDS[0]][0].q, ans: HB.pools[IDS[0]][0].ans}), t = HB.pools[IDS[0]][0].q.text;
  assert.ok(q.html.includes(`>${t.slice(0, t.indexOf(' = ') + 2)}</span>`), '题面上一段应是「61 ÷ 7 =」（等号留在上一行）');
});
