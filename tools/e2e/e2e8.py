# 挑战题（说明书-挑战题）：默认不出；家长区真实勾选后今日练习出现；每个板块题面、答错图解截图；取消后不再出；进度刷新还在
# 用法：python3 tools/e2e/e2e8.py <项目根> <截图目录>
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    if not ok: fails.append(msg)
isH = "(()=>{const Q=__sm.Q;return !!(Q&&Q.x&&Q.x.inst&&__sm.K.BY[__sm.K.ITEM[Q.x.inst.id].skill].hard)})()"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(400)
    pg.evaluate("__sm.S.oral = true")  # 省掉校准，题面照常
    # 家长区：真实勾选
    bb = pg.locator('#gear').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(2200); pg.mouse.up(); pg.wait_for_timeout(300)
    check(pg.locator('#hardBoxes input').count() == 6, '家长区没有 6 个勾选框'); check(pg.locator('#hardBoxes input:checked').count() == 0, '默认不该勾选')
    pg.locator('#hardBoxes input[data-b="cmp"]').scroll_into_view_if_needed(); shot(pg, 'a-parent')
    pg.locator('#oralBox').scroll_into_view_if_needed(); bx = pg.locator('#oralBox').bounding_box(); check(bx and bx['y'] + bx['height'] <= 390 and bx['y'] >= 0, f'口答模式够不到 {bx}'); shot(pg, 'a2-oral')
    pg.locator('#hardBoxes input[data-b="cmp"]').scroll_into_view_if_needed()
    pg.locator('#hardBoxes input[data-b="cmp"]').check(); check(pg.evaluate("__sm.S.settings.hard.cmp") is True, '勾选没存')
    pg.evaluate("document.getElementById('parBack').click()"); pg.wait_for_timeout(400)
    pg.reload(); pg.wait_for_timeout(400); check(pg.evaluate("__sm.S.settings.hard.cmp") is True, '刷新后勾选丢了')
    # 每个挑战技能：题面 + 答错图解
    for s in pg.evaluate("__sm.K.HARD.map(s=>({id:s.id,input:s.input,item:s.items[0].id}))"):
        pg.evaluate(f"""() => {{ const inst = __sm.K.make('{s['item']}', Math.random); const v = __sm.R.question(inst), e = __sm.R.explain(inst); document.body.insertAdjacentHTML('beforeend', `<div id="tmpH" style="position:fixed;inset:0;z-index:99;background:#1b1d22;color:#ecebe4;display:flex;gap:16px;align-items:center;padding:10px"><div style="flex:1">${{v.html}}${{v.pick ? (v.pickText || v.pick).join(' / ') : ''}}</div><div style="flex:1">${{e}}</div></div>`); }}""")
        o = pg.evaluate("(()=>{const t=document.getElementById('tmpH');return t.scrollHeight>t.clientHeight+2||t.scrollWidth>t.clientWidth+2})()")
        check(not o, s['id'] + ' 溢出'); shot(pg, 'h-' + s['id']); pg.evaluate("document.getElementById('tmpH').remove()")
    # 今日练习出现挑战题（真实进入）
    pg.click('#btnStart'); pg.wait_for_timeout(2600); seen = False
    for i in range(60):
        c = cur(pg)
        if c == 'demo': shot(pg, 'b-demo'); pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(200); continue
        if c != 'qplay': break
        if pg.evaluate(isH): seen = True; shot(pg, 'c-q'); break
        pg.evaluate("__sm.Q.phase='a'; __sm.Q.sess.answer({ok:true,fast:true,secs:6}); __sm.Q.phase='q'"); pg.wait_for_timeout(50); break
    check(seen, '勾选后第一批新题没有挑战题')
    if seen:
        pg.locator('.pickcard').first.wait_for(); ans = pg.evaluate('__sm.Q.x.inst.ans'); pg.locator(f'.pickcard:not([data-n="{ans}"])').first.click(); pg.wait_for_timeout(500); shot(pg, 'd-after'); t = pg.inner_text('#qBody'); check(' + ' in t.split(chr(10))[0], '答错没显示算式：' + t[:30])
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
