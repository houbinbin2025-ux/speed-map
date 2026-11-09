# 家长区真点回归（F 模块 11-08，捣蛋鬼台账第 15 条 + F 现状梳理「家长区按钮没人真点过」）
# 两种尺寸（iPhone 844×390、iPad 1194×834）各走一遍：
#   版面：标题在最上、第一格是「练习设置」、开发参数收在最后且默认折叠
#   每个按钮：滚到眼前后按 elementFromPoint 查「点得到」，再用鼠标在那个坐标真点
#   流程：口答 / 双语 / 闪现 / 数线 → 刷新还在；导出 → 清空（两步）→ 导入合并 → 整份替换；导出 / 导入笔迹；读不了的存档导出
# 用法：python3 tools/e2e/e2e-parent.py <项目根> <截图目录>
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
base = (root / 'v2' / 'index.html').as_uri()
PK, IK = 'speedmap.v2.test', 'speedmap.ink.test'
known = {k: True for k in ['look1', 'look2', 'look3', 'look4', 'bond1', 'cmp1']}
prog = {'v': 2, 'savedAt': 0, 'cards': {}, 'boss': {}, 'log': {}, 'level': 0, 'mistakes': {}, 'lastBackup': 0, 'placedAt': 1, 'known': known, 'settings': {'bilingual': False}, 'home': {'ore': 77}}
ink = {'done': True, 'samples': [], 'speed': 800, 't': {'1': [[[0, 0, 10, 10]]], '2': [[[0, 0, 10, 10]], [[1, 1, 9, 9]]]}}
fails, errs = [], []
def check(ok, msg):
    print(('ok  ' if ok else 'FAIL'), msg)
    if not ok: fails.append(msg)
def hold(pg, sel, ms):
    bb = pg.locator(sel).bounding_box(); pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.mouse.down(); pg.wait_for_timeout(ms); pg.mouse.up(); pg.wait_for_timeout(300)
def fresh(pg, url, extra=None):
    pg.goto(url); pg.evaluate(f"""localStorage.clear(); localStorage.setItem('{PK}', {json.dumps(json.dumps(prog))}); localStorage.setItem('{IK}', {json.dumps(json.dumps(ink))});
      {extra or ''}""")
    pg.reload(); pg.wait_for_timeout(900)
def parent(pg):
    hold(pg, '#gear', 2200); check(pg.is_visible('#parent'), '长按齿轮进家长区')
HIT = """sel => { const el = document.querySelector(sel); if (!el) return {miss: true};
  el.scrollIntoView({block: 'center'}); const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y);
  return {ok: !!t && (t === el || el.contains(t)), x, y, w: r.width, h: r.height, top: t ? (t.id || t.tagName + '.' + t.className) : null}; }"""
def tap(pg, sel, label):
    """滚到眼前 → 中心点 elementFromPoint 必须是它自己 → 鼠标在那里真点"""
    h = pg.evaluate(HIT, sel)
    if h.get('miss'): check(False, f'{label}：页面上没有 {sel}'); return False
    check(h['ok'], f"{label}：点得到（{h['w']:.0f}×{h['h']:.0f}，最上层是 {h['top']}）")
    if h['ok']: pg.mouse.click(h['x'], h['y']); pg.wait_for_timeout(250)
    return h['ok']
S = lambda pg, js: pg.evaluate(f"(() => {{ const S = __sm.S; return {js}; }})()")
stored = lambda pg: pg.evaluate(f"JSON.parse(localStorage.getItem('{PK}'))")

def run(pg, tag, url):
    # ---- 版面 ----
    fresh(pg, url); parent(pg)
    lay = pg.evaluate("""() => { const p = document.getElementById('parent'), g = p.querySelector('.pgrid'), top = p.querySelector('.top');
      const first = g.firstElementChild, last = g.lastElementChild;
      return {topY: top.getBoundingClientRect().top, gridY: g.getBoundingClientRect().top, firstTitle: first.querySelector('.ptitle').textContent,
        h1: top.querySelector('h1').textContent, lastId: last.id, devOpen: document.getElementById('pDev').open, devVisible: !document.getElementById('pDev').hidden,
        gemInDev: document.getElementById('pDev').contains(document.getElementById('gemStats'))}; }""")
    check(lay['h1'] == '家长区' and lay['topY'] < lay['gridY'] and lay['topY'] < 60, f'{tag} 标题「家长区」在最上面（y={lay["topY"]:.0f}）')
    check(lay['firstTitle'] == '练习设置', f'{tag} 第一格是练习设置（实际：{lay["firstTitle"]}）')
    check(lay['lastId'] == 'pDev' and not lay['devOpen'] and lay['gemInDev'], f'{tag} 开发参数在最后一格、默认折叠、挑战数据在里面')
    order = pg.evaluate("() => [...document.querySelectorAll('#parent .pgrid > .panel .ptitle, #parent .pgrid > details > summary')].map(e => e.textContent.trim())")
    print('     顺序：', ' / '.join(order))
    pg.screenshot(path=str(out / f'{tag}-1-首屏.png'))
    # 开发参数能展开
    tap(pg, '#pDevBtn', f'{tag} 展开开发参数'); check(pg.evaluate("document.getElementById('pDev').open"), f'{tag} 开发参数展开了')
    pg.screenshot(path=str(out / f'{tag}-2-开发参数.png'))
    tap(pg, '#pDevBtn', f'{tag} 收起开发参数')
    # ---- 设置项：真点 + 刷新还在 ----
    tap(pg, '#oralBox', f'{tag} 口答开关'); check(S(pg, 'S.oral') is True, f'{tag} 口答打开')
    tap(pg, '#biBox', f'{tag} 双语开关'); check(S(pg, 'S.settings.bilingual') is True, f'{tag} 双语打开')
    tap(pg, '#segFlash [data-flash="2500"]', f'{tag} 闪现 2.5 秒'); check(S(pg, 'S.settings.flashMs') == 2500, f'{tag} 闪现存成 2500')
    tap(pg, '#segTol [data-tol="1"]', f'{tag} 数线宽松'); check(S(pg, '!!S.settings.lineTol') is True, f'{tag} 数线宽松存上')
    pg.reload(); pg.wait_for_timeout(900); parent(pg)
    check(pg.is_checked('#oralBox') and pg.is_checked('#biBox'), f'{tag} 刷新后口答、双语还是开的')
    check('on' in pg.get_attribute('#segFlash [data-flash="2500"]', 'class') and 'on' in pg.get_attribute('#segTol [data-tol="1"]', 'class'), f'{tag} 刷新后闪现、数线选中项还在')
    # 关回去，口答关掉后练习回到手写
    tap(pg, '#oralBox', f'{tag} 口答关'); tap(pg, '#biBox', f'{tag} 双语关'); tap(pg, '#segTol [data-tol="0"]', f'{tag} 数线标准')
    check(S(pg, 'S.oral') is False and S(pg, 'S.settings.bilingual') is False and S(pg, '!S.settings.lineTol') is True, f'{tag} 三个开关都关回去了')
    # ---- 其他按钮只查点得到（点了会离开家长区的，点完回来）----
    tap(pg, '#btnHabit', f'{tag} 查看能力观察'); check(pg.is_visible('#habit'), f'{tag} 进了能力观察'); pg.click('#habBack'); pg.wait_for_timeout(200)
    tap(pg, '#bankGo button', f'{tag} 题库第一组'); check(pg.is_visible('#bankv'), f'{tag} 进了题库'); pg.click('#bankBack'); pg.wait_for_timeout(200)
    for sel, name in [('#btnReplace', '重新摸底'), ('#btnRecal', '重新校准笔迹'), ('#lvBoxes button', '难度第一个按钮')]:
        h = pg.evaluate(HIT, sel); check(h.get('ok'), f'{tag} {name}：点得到（{h.get("top")}）')
    # ---- 加 3 道错题，作为「进度」的标志 ----
    pg.click('#parBack'); pg.wait_for_timeout(300); pg.evaluate("document.querySelector('#testBar [data-t=mist]').click()"); pg.wait_for_timeout(200)
    nm = S(pg, 'Object.keys(S.mistakes).length'); check(nm >= 1, f'{tag} 造出 {nm} 道错题')
    # 错题记录新字段（docs/方案-错题数据字段.md）：给第一道错题记上，导出 → 清空 → 导入合并后要还在
    pg.evaluate("() => { const S = __sm.S, m = Object.values(S.mistakes)[0]; m.wrongs = 2; m.hist = [{d: '2026-11-01', k: 'w', w: '7', s: 4.2}, {d: '2026-11-02', k: 'd', w: null}]; S.mistStat = {sk: {w: 1, d: 1, s: 0, p: 0, last: '2026-11-02'}}; }")
    parent(pg)
    # ---- 导出 ----
    tap(pg, '#btnExport', f'{tag} 导出进度'); check(pg.is_visible('#ioPanel'), f'{tag} 导出面板出来了')
    h = pg.evaluate(HIT, '#ioText'); check(h['ok'], f'{tag} 导出文字框点得到')
    text = pg.input_value('#ioText'); o = json.loads(text)
    check(len(o.get('mistakes', {})) == nm and o.get('known', {}).get('look1') and o.get('home', {}).get('ore') == 77, f'{tag} 导出文字里有错题、已学、家')
    pg.screenshot(path=str(out / f'{tag}-3-导出.png'))
    tap(pg, '#ioClose', f'{tag} 关闭导出面板'); check(not pg.is_visible('#ioPanel'), f'{tag} 面板关掉了')
    # ---- 清空（两步）----
    tap(pg, '#btnReset', f'{tag} 清空进度（第一步）'); check(pg.is_visible('#btnResetYes') and pg.inner_text('#btnReset') == '取消', f'{tag} 出现确认按钮，第一步不清')
    check(len(stored(pg)['mistakes']) == nm, f'{tag} 只点第一步时进度还在')
    tap(pg, '#btnReset', f'{tag} 取消'); check(not pg.is_visible('#btnResetYes'), f'{tag} 取消后确认按钮收起')
    tap(pg, '#btnReset', f'{tag} 再点清空'); tap(pg, '#btnResetYes', f'{tag} 确认清空')
    st = stored(pg); check(not st['mistakes'] and not st.get('known'), f'{tag} 清空后错题、已学都没了'); check(st['settings'].get('flashMs') == 2500, f'{tag} 清空后设置保留')
    check('已清空' in pg.inner_text('#resetMsg'), f'{tag} 提示已清空')
    # ---- 导入合并 ----
    tap(pg, '#btnImport', f'{tag} 导入进度'); pg.fill('#ioText', text); tap(pg, '#ioApply', f'{tag} 确认导入')
    check(pg.inner_text('#ioMsg') == '已导入', f'{tag} 导入提示「已导入」（实际：{pg.inner_text("#ioMsg")}）')
    st = stored(pg); check(len(st['mistakes']) == nm and st['known'].get('look1') and st['home'].get('ore') == 77, f'{tag} 导入合并后错题、已学、家都回来了')
    mw = [m for m in st['mistakes'].values() if m.get('wrongs') == 2]
    check(len(mw) == 1 and len(mw[0].get('hist', [])) == 2 and st.get('mistStat', {}).get('sk', {}).get('d') == 1, f'{tag} 导入合并后错题记录（错几次、经过、技能累计）还在')
    tap(pg, '#ioClose', f'{tag} 关闭导入面板')
    # 坏文字被拒，进度不动
    tap(pg, '#btnImport', f'{tag} 再点导入'); pg.fill('#ioText', '{不是备份'); tap(pg, '#ioApply', f'{tag} 确认导入坏文字')
    check('不是有效的备份' in pg.inner_text('#ioMsg') and len(stored(pg)['mistakes']) == nm, f'{tag} 坏文字被拒、进度不动'); tap(pg, '#ioClose', f'{tag} 关闭')
    # ---- 整份替换：收在「更多」里 ----
    alt = dict(o); alt['mistakes'] = {}; alt['home'] = {'ore': 5}
    tap(pg, '#bkMoreBtn', f'{tag} 展开「更多」'); tap(pg, '#btnImportAll', f'{tag} 整份替换')
    check(pg.inner_text('#ioApply') == '确认替换（会覆盖）', f'{tag} 替换按钮写明会覆盖')
    pg.fill('#ioText', json.dumps(alt)); tap(pg, '#ioApply', f'{tag} 确认替换')
    st = stored(pg); check(not st['mistakes'] and st['home'].get('ore') == 5, f'{tag} 整份替换后以备份为准（错题 0、矿石 5）')
    tap(pg, '#ioClose', f'{tag} 关闭替换面板')
    # ---- 笔迹导出 / 导入 ----
    tap(pg, '#btnInkOut', f'{tag} 导出笔迹'); it = json.loads(pg.input_value('#ioText')); check(it.get('speed') == 800 and '2' in it.get('t', {}), f'{tag} 导出的笔迹有模板和速度'); tap(pg, '#ioClose', f'{tag} 关闭')
    it['speed'] = 1234
    tap(pg, '#btnInkIn', f'{tag} 导入笔迹'); pg.fill('#ioText', json.dumps(it)); tap(pg, '#ioApply', f'{tag} 确认导入笔迹')
    check(pg.inner_text('#ioMsg') == '已导入' and json.loads(pg.evaluate(f"localStorage.getItem('{IK}')")).get('speed') == 1234, f'{tag} 笔迹导入后存上了')
    tap(pg, '#ioClose', f'{tag} 关闭')
    check('1.2 秒' in pg.inner_text('#inkInfo') and 'Infinity' not in pg.inner_text('#inkInfo'), f'{tag} 手写面板显示新速度：{pg.inner_text("#inkInfo")!r}')

def run_broken(pg, tag, url):
    # 主存档坏了：家长区提示 + 导出读不了的存档 + 删掉
    fresh(pg, url, f"localStorage.setItem('{PK}', '{{坏的'); ")
    parent(pg)
    check(pg.is_visible('#parNote') and '读不了' in pg.inner_text('#parNote'), f'{tag} 家长区提示存档读不了')
    tap(pg, '#btnBrokenOut', f'{tag} 导出读不了的存档'); check(pg.input_value('#ioText') == '{坏的', f'{tag} 导出的是原文')
    check(not pg.is_visible('#btnBrokenDel'), f'{tag} 还没复制时不出「删掉它」')
    tap(pg, '#ioCopy', f'{tag} 复制读不了的存档'); check(pg.is_visible('#btnBrokenDel'), f'{tag} 复制后出「删掉它」')
    tap(pg, '#btnBrokenDel', f'{tag} 删掉读不了的存档'); pg.wait_for_timeout(900)
    check(pg.evaluate(f"localStorage.getItem('{PK}.broken')") is None, f'{tag} 读不了的存档删掉了')
    check(pg.evaluate(f"(() => {{ try {{ return !!JSON.parse(localStorage.getItem('{PK}')).v; }} catch (e) {{ return false; }} }})()"), f'{tag} 主存档写回了能读的进度')
    parent(pg); check(not pg.is_visible('#parNote'), f'{tag} 刷新后家长区不再提示读不了')

def run_broken_nocopy(pg, tag, url):
    # 复制失败（剪贴板不让写）：提示手动复制，「删掉它」也出来，家长不会卡住
    fresh(pg, url, f"localStorage.setItem('{PK}', '{{坏的'); ")
    pg.evaluate("() => { navigator.clipboard.writeText = () => Promise.reject(new Error('no')); }")
    parent(pg); tap(pg, '#btnBrokenOut', f'{tag} 导出读不了的存档（复制失败）')
    check(not pg.is_visible('#btnBrokenDel'), f'{tag} 复制前不出「删掉它」')
    tap(pg, '#ioCopy', f'{tag} 点复制（会失败）')
    check('手动复制' in pg.inner_text('#ioMsg') and pg.is_visible('#btnBrokenDel'), f'{tag} 复制失败：提示手动复制，「删掉它」出来')

def run_nogems(pg, tag, url):
    # 碎片关着（测试模式默认）：挑战数据整块隐藏，开发参数格只在测试模式留着；正式版碎片关着时整格隐藏（index.html renderParent `!h && !TEST`），网页走查进不了正式版碎片关的状态，这里锁住前半句
    fresh(pg, url); parent(pg)
    g = pg.evaluate("() => ({stats: getComputedStyle(document.getElementById('gemStats')).display, dev: getComputedStyle(document.getElementById('pDev')).display})")
    check(g['stats'] == 'none' and g['dev'] != 'none', f'{tag} 碎片关时挑战数据隐藏、测试模式下开发参数格还在 {g}')

def run_gems(pg, tag, url):
    # 碎片开着时，挑战数据进开发参数面板，不再挤在标题上面
    fresh(pg, url); parent(pg)
    g = pg.evaluate("() => { const s = document.getElementById('gemStats'); return {hidden: s.hidden, text: s.textContent, inDev: document.getElementById('pDev').contains(s), top: document.querySelector('#parent .top').getBoundingClientRect().top}; }")
    check(not g['hidden'] and '挑战数据' in g['text'] and g['inDev'], f'{tag} 挑战数据在开发参数里')
    check(g['top'] < 60, f'{tag} 碎片开着时标题仍在最上面（y={g["top"]:.0f}）')

with sync_playwright() as p:
    b = __import__('quiet').launch(p)
    for tag, vw in [('iphone', {'width': 844, 'height': 390}), ('ipad', {'width': 1194, 'height': 834})]:
        ctx = b.new_context(viewport=vw, has_touch=True, permissions=['clipboard-read', 'clipboard-write']); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        run(pg, tag, base + '#test'); run_broken(pg, tag, base + '#test'); run_broken_nocopy(pg, tag, base + '#test'); run_nogems(pg, tag, base + '#test'); run_gems(pg, tag, base + '?gems=1#test')
        ctx.close()
    b.close()
check(not errs, f'页面无报错 {errs[:3]}')
print(f'\n{len(fails)} 项失败' if fails else '\n全部通过')
sys.exit(1 if fails else 0)
