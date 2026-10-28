# 门 6 走查第 3 轮：速度预算实测、存不了进度提示条、正式版上线后旧预览页停写（12f）、比大小答错图解
import sys, json, pathlib, time
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
page = (root / 'v2' / 'index.html').as_uri()
seed = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'oral': True,
        'known': {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}}
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 932, 'height': 430}, device_scale_factor=1)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(page + '#test'); pg.evaluate(f"localStorage.clear(); localStorage.setItem('speedmap.v2.test', {json.dumps(json.dumps(seed))})")
    # 打开到可点击
    t0 = time.time(); pg.reload(); pg.wait_for_selector('#btnStart:visible'); load_ms = (time.time() - t0) * 1000
    nav = pg.evaluate("(() => { const n = performance.getEntriesByType('navigation')[0]; return Math.round(n.domInteractive); })()")
    # 页面切换：点技能组 → 地图出现；点回到岛上 → 首页出现（页面里计时）
    sw = pg.evaluate("""async () => { const out = []; for (const [a, b] of [['.tile[data-g=\"bond\"]', 'skillmap'], ['#smBack', 'island'], ['#btnMist', 'mist'], ['#mistBack', 'island']]) {
        const t = performance.now(); document.querySelector(a).click(); await new Promise(r => requestAnimationFrame(() => r())); if (document.getElementById(b).hidden) out.push('没切过去 ' + b); out.push(Math.round(performance.now() - t)); } return out; }""")
    # 判题：比大小点选，从点下到反馈出来
    pg.click('.tile[data-g="cmp"]'); pg.click('#smGo'); pg.wait_for_timeout(300)
    if pg.evaluate("!document.getElementById('demo').hidden"):
        pg.wait_for_timeout(3200); pg.click('#ack'); pg.wait_for_timeout(200)
    j = pg.evaluate("""async () => { const Q = window.__sm.Q; const v = Q.v; if (v.input !== 'pick') return 'not pick ' + v.input;
        const lo = Math.min(...v.pick), t = performance.now(); document.querySelector('.pickcard[data-n=\"' + lo + '\"]').click();
        await new Promise(r => requestAnimationFrame(() => r())); return Math.round(performance.now() - t); }""")
    pg.wait_for_timeout(300); pg.screenshot(path=str(out / 'g1-cmp-wrong.png'))
    # 存不了进度：让写入报错 → 再答一题 → 提示条
    pg.wait_for_timeout(3200)
    pg.evaluate("() => { const ls = window.localStorage; Object.defineProperty(window, 'localStorage', {configurable: true, get: () => ({getItem: k => ls.getItem(k), setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: k => ls.removeItem(k)})}); return 1; }")
    # 长按结束 → 结算时保存 → 写入报错 → 回岛上看提示条
    btn = '#qQuit' if pg.evaluate("!document.getElementById('qplay').hidden") else '#dQuit'
    bb = pg.locator(btn).bounding_box(); pg.mouse.move(bb['x'] + 20, bb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up(); pg.wait_for_timeout(300)
    if pg.evaluate("!document.getElementById('qsum').hidden"): pg.click('#qsHome')
    pg.wait_for_timeout(400); pg.screenshot(path=str(out / 'g2-nosave.png'))
    nosave = pg.evaluate("!document.getElementById('bnWarn').hidden && document.getElementById('bnWarn').textContent")
    b.close()
    # 12f：预览页（地址在 /v2/ 下、不带 #test），正式键已经存在 → 停写、提示新版
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 932, 'height': 430})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(page); pg.evaluate("localStorage.clear(); localStorage.setItem('speedmap.v2', JSON.stringify({v: 2, cards: {}, boss: {}, log: {}, level: 0, mistakes: {}}))"); pg.reload(); pg.wait_for_timeout(300)
    pg.screenshot(path=str(out / 'g3-newversion.png'))
    nv = pg.evaluate("!document.getElementById('ovNew').hidden"); pre = pg.evaluate("localStorage.getItem('speedmap.v2.preview')")
    b.close()
size = sum((root / 'v2' / f).stat().st_size for f in ['index.html', 'core.js', 'ink.js', 'skills.js', 'engine.js', 'render.js', 'mark.svg'])
print(json.dumps({'打开到可点击_毫秒': round(load_ms), 'domInteractive_毫秒': nav, '页面切换_毫秒': sw, '点选判题到反馈_毫秒': j, '存不了进度提示条': nosave, '新版提示': nv, '预览键被写入': pre is not None, '页面总大小_KB': round(size / 1024, 1), '错误': errs[:5]}, ensure_ascii=False, indent=1))
