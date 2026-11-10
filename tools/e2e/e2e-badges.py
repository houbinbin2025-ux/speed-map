# 趣味题徽章册、矿物柜的谜题水晶、奖状「解谜大师」（C 方案 7 的画面，E 11-10 画）
# 查：徽章册从伙伴图鉴进得去、11 枚、得到 / 闪光 / 没得到三种画法都画出来；点徽章说明句对；矿物柜有水晶一行；
#     集齐 11 枚发解谜大师、奖状能打开；中文、英文日，手机 667×375 / 844×390、iPad 932×651，不横向溢出、英文日没有中文
# 用法：python3 tools/e2e/e2e-badges.py <项目根> <截图目录>
import sys, json, pathlib, re
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
url = (root / 'v2' / 'index.html').as_uri() + '?gems=1#test'   # 碎片测试开关，同 e2e-gems
fails, errs = [], []
def check(ok, msg):
    if not ok: fails.append(msg)
SOME = "{'g34:g4:pyr': 5, 'g34:g7:magic': 3, 'g34:g5:tree': 4, 'g34:g5:saw': 1, 'g34:g7:riddle': 3}"
HAN = re.compile(r'[㐀-鿿]')
with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for W, H, en in [(667, 375, False), (667, 375, True), (844, 390, False), (932, 651, True)]:
        tag = f"{W}x{H}-{'en' if en else 'zh'}"
        pg = b.new_page(viewport={'width': W, 'height': H}, screen={'width': 1194, 'height': 834} if W == 932 else None); pg.on('pageerror', lambda e: errs.append(str(e)))
        seed = {'v': 2, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'placedAt': 1, 'known': {}, 'settings': {'bilingual': en}}
        pg.goto(url); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})"); pg.reload(); pg.wait_for_timeout(500)
        if en: pg.evaluate("__sm.S.testDays = I18N.isEn({}, SM.dayOf(Date.now(), 0)) ? 0 : 1; I18N.set(I18N.isEn(__sm.S.settings, __sm.today()))")
        check(pg.evaluate("!!(window.GEMUI && GEMUI.enabled())"), f'{tag}：碎片没开')
        # 4 枚得到（锯木头只答对 1 道不算；其中「数塔」这一块全部深红 → 闪光），其余没得到
        pg.evaluate(f"""() => {{ GEMUI.state().puzzle = {{n: 23, by: {SOME}}};
          __sm.K.BY['g34:g4:pyr'].items.forEach(i => {{ const p = __sm.E.prog(__sm.S, i.id); p.lv = 3; p.d = ['2026-01-01', '2026-01-02', '2026-01-06']; }}); }}""")
        pg.click('.w-mini button[data-z="home"]'); pg.wait_for_timeout(2500)
        bk = pg.evaluate("__sm.HS.BOOK"); pg.evaluate(f"__sm.HS.tap({bk['x']+10}, 55)"); pg.wait_for_timeout(1500)
        check(pg.locator('#h_bkBadge').is_visible(), f'{tag}：伙伴图鉴顶上没有「徽章册」')
        pg.click('#h_bkBadge'); pg.wait_for_timeout(400)
        cards = pg.evaluate("[...document.querySelectorAll('#h_book .bkc.badge')].map(c => [c.dataset.s, c.classList.contains('lock'), c.classList.contains('gold'), (() => { const cv = c.querySelector('canvas'), d = cv.getContext('2d').getImageData(0, 0, 16, 16).data; let n = 0; for (let i = 3; i < d.length; i += 4) n += d[i] > 0; return n; })()])")
        check(len(cards) == 11, f'{tag}：徽章应 11 枚，实际 {len(cards)}')
        check(sum(1 for c in cards if not c[1]) == 4 and sum(1 for c in cards if c[2]) == 1, f'{tag}：得到 4 枚、闪光 1 枚，实际 {[(c[0], c[1], c[2]) for c in cards]}')
        check(all(c[3] > 60 for c in cards), f'{tag}：有徽章没画出来 {[c[0] for c in cards if c[3] <= 60]}')
        check('4/11' in pg.inner_text('#h_book .tally'), f'{tag}：已得到数不对 {pg.inner_text("#h_book .tally")}')
        pg.screenshot(path=str(out / f'badges-{tag}.png'))
        for sid, want_zh, want_en in [('g34:g4:pyr', '闪光徽章', 'Shiny badge'), ('g34:g7:magic', '已得到', 'Earned'), ('g34:g5:saw', '已答对 1 道', '1 solved')]:
            pg.click(f'.bkc[data-s="{sid}"]'); pg.wait_for_timeout(200); t = pg.inner_text('#h_bkD')
            check((want_en if en else want_zh) in t, f'{tag}：点 {sid} 说明不对 {t!r}')
            fs = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#h_bkD .bdx')).fontSize) * (window.screen.width >= 1100 ? 1194 / innerWidth : 1)")
            check(fs >= 16.6, f'{tag}：徽章说明句字号 {fs:.1f} < 17')
        pg.screenshot(path=str(out / f'badges-click-{tag}.png'))
        over = pg.evaluate("[...document.querySelectorAll('#h_book .bkc, #h_book .bkh, #h_bkD')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > innerWidth + 1 || e.getBoundingClientRect().bottom > innerHeight + 1).map(e => e.id || e.className + ' ' + e.textContent.slice(0, 12))")
        check(not over, f'{tag}：徽章册溢出 {over}')
        if en: z = [x for x in pg.evaluate("[...document.querySelectorAll('#h_book *')].filter(e => !e.children.length && e.offsetParent).map(e => e.textContent)") if HAN.search(x)]; check(not z, f'{tag}：英文日徽章册有中文 {z[:4]}')
        pg.click('#h_bkBack'); pg.wait_for_timeout(300); check(pg.locator('#h_bkBadge').is_visible(), f'{tag}：返回图鉴不对')
        pg.click('#h_bkClose'); pg.wait_for_timeout(1500)
        cab = pg.evaluate("__sm.HS.CAB"); pg.evaluate(f"__sm.HS.tap({cab['x']+10}, 40)"); pg.wait_for_timeout(1800)
        ores = pg.inner_text('.ore3'); check(('Puzzle crystals' if en else '谜题水晶') in ores and '23' in ores, f'{tag}：矿物柜没有谜题水晶一行 {ores!r}')
        check(pg.evaluate("(() => { const i = document.querySelector('.ore3 img.md'); return !!(i && i.complete && i.naturalWidth); })()"), f'{tag}：矿物柜水晶图标没出来')
        pg.screenshot(path=str(out / f'ores-{tag}.png'))
        # 集齐 11 枚 → 解谜大师（同步在进家时做：退出再进）
        pg.evaluate("GEMUI.state().puzzle = {n: 33, by: Object.fromEntries(Object.keys(ART.BADGE_KIND).map(k => [k, 3]))}")
        check(not any(n == 'c:puzzle:master' for n in pg.evaluate("HOME.next(__sm.S, 99).map(n => n.r.id)")), f'{tag}：告示牌目标里不该有解谜大师')
        pg.evaluate("HOME.sync(__sm.S, __sm.today())"); check(pg.evaluate("!!__sm.S.home.got['c:puzzle:master']"), f'{tag}：集齐 11 枚没发解谜大师')
        pg.close()
    b.close()
print('错误', errs or '无'); print('不通过', fails or '无')
sys.exit(1 if fails or errs else 0)
