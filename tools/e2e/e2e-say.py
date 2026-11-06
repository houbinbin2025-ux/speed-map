# 喇叭（11-07 Ben：没声音）：真实点按示范卡和题目页的喇叭，发声请求要发出去，之后 3 秒内不许被取消
# 两条路都测：App 走原生语音（webkit.messageHandlers.speak），手机网页走 speechSynthesis
# 听不到真实声音：是否出声要真机确认。这里只防「点了没发请求」和「刚发就被页面取消」
# 用法：python3 tools/e2e/e2e-say.py <项目根> <截图目录>
import pathlib
src = (pathlib.Path(__file__).with_name('e2e2.py')).read_text().split('\ndef run(')[0]
exec(src)
fails = []
def check(ok, msg):
    if not ok: fails.append(msg)
NAT = "window.__say=[]; window.webkit={messageHandlers:{speak:{postMessage:m=>__say.push(m)}}};"
WEB = """window.__say=[]; { const ss=window.speechSynthesis, sp=ss.speak.bind(ss), ca=ss.cancel.bind(ss);
  ss.speak=u=>{__say.push(JSON.stringify({text:u.text,lang:u.lang})); sp(u);}; ss.cancel=()=>{__say.push(''); ca();}; }"""
def tapCheck(pg, sel, where):
    pg.evaluate("__say.length = 0"); pg.locator(sel).first.tap(); pg.wait_for_timeout(3000)
    msgs = pg.evaluate("__say"); said = [m for m in msgs if m]
    check(len(said) == 1, f'{where}：点一次应发 1 次朗读，实际 {msgs}')
    if said:
        check(json.loads(said[0])['text'] != '', f'{where}：朗读文字是空的')
        check(msgs[-1] != '', f'{where}：刚发出就被取消 {msgs}')
    return len(said)
for mode, init in (('App', NAT), ('网页', WEB)):
    tested = {'demo': 0, 'qplay': 0}
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script(init)
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(400)
        pg.evaluate("__sm.S.oral = true; document.body.classList.remove('write')")
        pg.evaluate("""(()=>{const {K,E,S}=__sm;K.SKILLS.forEach(s=>{if(s.id==='dockA')return;s.items.forEach(i=>{const q=E.prog(S,i.id);q.lv=1;q.d=['2026-09-01'];q.seen=1;});});})()""")
        pg.locator('.w-mini button[data-z="dock"]').scroll_into_view_if_needed(); pg.click('.w-mini button[data-z="dock"]'); pg.wait_for_timeout(500); pg.click('#zGo'); pg.wait_for_timeout(3000)
        for i in range(40):
            c = cur(pg)
            if c == 'demo':
                if pg.locator('#demo .spk').count(): tested['demo'] += tapCheck(pg, '#demo .spk', mode + ' 示范卡')
                pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(300); continue
            if c != 'qplay': break
            st = qst(pg)
            if not st or st['phase'] != 'q': pg.wait_for_timeout(250); continue
            if pg.locator('#qBody .spk').count():
                tested['qplay'] += tapCheck(pg, '#qBody .spk', mode + ' 题目页'); break
            break
        check(tested['qplay'] == 1, f'{mode}：没测到题目页喇叭 {tested} 当前页 {cur(pg)}')
        shot(pg, 'say-' + mode)
        b.close()
    print(mode, tested)
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
