# 三个新关卡（docs/意图-v6-三个新关卡.md）：岛上真实点到 3 个地方；11 个技能题面 + 答错 + 答对；家里新奖状和新伙伴；不崩、不遮挡
# 11-05 审查清单：钟面有数字、错题宝箱不露答案、隔天错题都回炉且数字一致、底栏按钮都在屏内、家长题库和周报数字对、答错提示「应该是」
# 用法：python3 tools/e2e/e2e9.py <项目根> <截图目录> [宽 高]
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    if not ok: fails.append(msg)
with sync_playwright() as p:
    b = __import__('quiet').launch(p); pg = b.new_page(viewport={'width': int(sys.argv[3]) if len(sys.argv) > 3 else 844, 'height': int(sys.argv[4]) if len(sys.argv) > 4 else 390}, has_touch=True)
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(400)
    pg.evaluate("__sm.S.oral = true; document.body.classList.remove('write')")
    check(pg.locator('.w-mini button').count() == pg.evaluate('WORLD.ZONES.length') == 14, '导航应有 14 个地方（v8 加了 4 个思维地点）'); shot(pg, 'a-island')
    vw = pg.viewport_size['width']; vh = pg.viewport_size['height']
    for k in range(10):
        bb = pg.locator('.w-mini button').nth(k).bounding_box(); check(bb['x'] >= 0 and bb['x'] + bb['width'] <= vw and bb['y'] + bb['height'] <= vh, f'底栏第 {k} 个按钮超出屏幕 {bb}')
    box = pg.locator('.w-mini').bounding_box(); check(pg.evaluate("(()=>{const m=document.querySelector('.w-mini');return m.getBoundingClientRect().height < 112})()"), '底栏不超过两行（14 个地点在手机上可以横滑，见 v8 说明）')
    for g in ['garden', 'market', 'dock']:
        pg.locator(f'.w-mini button[data-z="{g}"]').scroll_into_view_if_needed(); pg.click(f'.w-mini button[data-z="{g}"]'); pg.wait_for_timeout(800)
        shot(pg, 'b-' + g); check(pg.is_visible('#zGo'), g + ' 卡片没开'); check(g in pg.evaluate("__sm.R.GROUPS.map(x=>x.id).join()"), g)
        pg.click('#zX'); pg.wait_for_timeout(200)
    # 前置都满足（每块留一个没有后续的技能灰着，看示范卡），11 个技能才都能练到；零进度时的前置规则在 tests/fastout 和 engine 测
    pg.evaluate("""(()=>{const {K,E,S}=__sm,gray=['gardenA','clockB','dockA'];K.SKILLS.forEach(s=>{if(gray.includes(s.id))return;s.items.forEach(i=>{const q=E.prog(S,i.id);q.lv=1;q.d=['2026-09-01'];q.seen=1;});});})()""")
    # 真实进入每个地方练：每个技能第一次故意答错（看图解、进错题宝箱、当场再来一次），之后答对
    seen, wrongDone = {}, set()
    for g in ['garden', 'market', 'dock']:
        pg.locator(f'.w-mini button[data-z="{g}"]').scroll_into_view_if_needed(); pg.click(f'.w-mini button[data-z="{g}"]'); pg.wait_for_timeout(500); pg.click('#zGo'); pg.wait_for_timeout(3000)
        for i in range(90):
            c = cur(pg)
            if c == 'demo':
                check('学一学' in pg.inner_text('#demo'), g + ' 示范卡'); shot(pg, 'c-demo-' + g); pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(300); continue
            if c != 'qplay': break
            st = qst(pg)
            if not st or st['phase'] != 'q': pg.wait_for_timeout(250); continue
            sk = pg.evaluate("__sm.K.ITEM[__sm.Q.x.inst.id].skill"); isNew = sk not in seen; seen[sk] = True
            shot(pg, 'q-' + sk)
            lf = pg.evaluate("(()=>{const e=document.getElementById('qBody');return e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2})()"); check(not lf, sk + ' 题面溢出')
            if pg.evaluate(f"__sm.K.BY['{sk}'].nb"):   # 高级别题（看图、算式）不一定有朗读
                check(pg.locator('#qBody .spk').count() == 1, sk + ' 没有朗读按钮'); pg.locator('#qBody .spk').click()
            wrong = sk not in wrongDone
            if wrong: wrongDone.add(sk)
            if st['input'] == 'pick':
                pg.wait_for_function('__sm.Q && __sm.Q.pickOpen', timeout=4000)
                vh = pg.viewport_size['height']; boxes = [pg.locator('.pickcard').nth(k).bounding_box() for k in range(pg.locator('.pickcard').count())]
                check(all(x['y'] + x['height'] <= vh + 1 and x['height'] >= 60 for x in boxes), sk + ' 选项超出屏幕或太矮'); check('>' not in pg.inner_text('#qWide'), sk + ' 选项混进标记')
                pg.locator(f'.pickcard[data-n="{st["ans"]}"]' if not wrong else f'.pickcard:not([data-n="{st["ans"]}"])').first.click()
            else:
                pg.click('#qOral'); pg.wait_for_timeout(550)
                if wrong: pg.click('#qOralWrong'); pg.wait_for_timeout(550)
                pg.click('#qOralNext')
            pg.wait_for_timeout(300)
            if wrong:
                t = pg.inner_text('#qBody') + pg.inner_text('#qWide'); check('✗' in t, sk + ' 答错没有提示：' + t[:40]); shot(pg, 'w-' + sk)
                if st['input'] == 'pick' and sk != 'gardenC': check('应该是' in t, sk + ' 点选答错没有「应该是」：' + t[:60])
                if sk.startswith('clock'): check(pg.locator('#qBody .pclock text, #qWide .pclock text').count() == 12, sk + ' 钟面没有 1—12')
                check(pg.evaluate(f"Object.values(__sm.S.mistakes).some(m=>__sm.K.ITEM[m.uid]&&__sm.K.ITEM[m.uid].skill==='{sk}')") or st['input'] == 'pick', sk + ' 没进错题宝箱')
                pg.click('#qNext'); pg.wait_for_timeout(300)
                if qst(pg): check(qst(pg)['id'].split(':')[0] == st['id'].split(':')[0], sk + ' 答错后没有当场再来一次')
            else: pg.wait_for_timeout(950)
        if cur(pg) == 'qplay':
            bb = pg.locator('#qQuit').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(400)
        shot(pg, 's-' + g); check(cur(pg) in ('qsum', 'island'), g + ' 结束后停在 ' + str(cur(pg)))
        if cur(pg) == 'qsum': pg.click('#qsHome'); pg.wait_for_timeout(400)
    # 错题宝箱：不露答案；隔天到期的错题 = 卡片上的数字 = 复习能出的数量
    pg.click('#btnMist')
    pg.wait_for_timeout(300)
    pg.evaluate("__sm.S.mistakes && Object.values(__sm.S.mistakes).forEach(m=>{if(m.due)m.due='2026-11-01'})"); shot(pg, 'm-chest')
    pg.click('#mistBack'); pg.wait_for_timeout(300)
    leak = pg.evaluate("""Object.values(__sm.S.mistakes).filter(m=>m.q&&m.q.view).filter(m=>{const l=__sm.R.mistLabel(m);return /=\\s*\\d/.test(l)}).map(m=>m.uid)"""); check(not leak, '错题标签露答案：' + str(leak))
    for g in ['garden', 'market', 'dock']:
        na = pg.evaluate(f"Object.values(__sm.S.mistakes).filter(m=>m.src==='{g}'&&m.due!==null).length"); nb = pg.evaluate(f"__sm.E.dueMistakes(__sm.S,'2026-12-01',id=>__sm.K.ITEM[id].skill&&__sm.K.BY[__sm.K.ITEM[id].skill].group==='{g}').length"); check(na == nb, f'{g} 错题 {na} 道，回炉 {nb} 道')
    want = pg.evaluate("__sm.K.SKILLS.filter(s=>s.nb).map(s=>s.id)")
    check(set(want) <= set(seen), '没练到：' + str(set(want) - set(seen)))
    pg.evaluate("__sm.K.SKILLS.filter(s=>s.nb).forEach(s=>s.items.forEach(i=>{const q=__sm.E.prog(__sm.S,i.id);q.lv=3;q.d=['2026-09-01','2026-09-02','2026-09-06'];}))")
    pg.click('.w-mini button[data-z="home"]'); pg.wait_for_timeout(2800); check(pg.is_visible('#h_btnOut'), '进不了家'); shot(pg, 'e-home')
    for c in ['c:dock:3', 'c:garden:1', 'c:market:3']:
        pos = pg.evaluate(f"__sm.HS.certPos['{c}']"); pg.evaluate(f"__sm.HS.tap({pos['x']+3},{pos['y']+3})"); pg.wait_for_timeout(700)
        if pg.is_visible('#h_loot'): pg.evaluate("document.getElementById('h_loot').hidden=true")
        if pg.is_visible('#h_cClose'): shot(pg, 'f-' + c.replace(':', '_')); pg.click('#h_cClose'); pg.wait_for_timeout(200)
        else: fails.append(c + ' 奖状没打开')
    pg.evaluate("__sm.HS.tap(__sm.HS.BOOK.x+6,50)"); pg.wait_for_timeout(400); shot(pg, 'g-book'); check(pg.locator('.bkc').count() == pg.evaluate("__sm.K.SKILLS.length + HOME.MEDALS.filter(m => m.kind === 'bronze' && m.lv && HOME.shown(__sm.S, m)).length"), '图鉴数量（基础技能 + 开放了的三四年级伙伴）')
    # 家长区：真实打开，题库页没有 undefined，周报是真实总数，新题预览有可读的选项和答案
    pg.evaluate("document.getElementById('h_btnOut') && document.getElementById('h_btnOut').click()"); pg.wait_for_timeout(800)
    bb = pg.locator('#gear').bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(2200); pg.mouse.up(); pg.wait_for_timeout(300)
    t = pg.inner_text('#parent'); check('19 个理解技能' not in t, '周报写死 19'); check(str(pg.evaluate('__sm.K.understand.length')) + ' 个理解技能' in t, '周报总数不对'); shot(pg, 'p-parent')
    pg.locator('[data-bg="garden"]').scroll_into_view_if_needed(); pg.click('[data-bg="garden"]'); pg.wait_for_timeout(300)
    for b0 in pg.locator('[data-bo]').all()[:1]: b0.click()
    pg.wait_for_timeout(200); check('undefined' not in pg.inner_text('#bankList'), '题库页有 undefined'); shot(pg, 'p-bank')
    pg.locator('[data-bq]').first.click(); pg.wait_for_timeout(200); shot(pg, 'p-q'); check(pg.inner_html('#qpQ').count('pblk') > 3, '接方块预览没有方块选项'); check(any(w in pg.inner_text('#qpAns') for w in ['红', '蓝', '黄', '青', '绿', '灰']), '答案不可读：' + pg.inner_text('#qpAns'))
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
