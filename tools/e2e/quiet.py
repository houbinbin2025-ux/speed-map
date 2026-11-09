# 回归浏览器静音（11-09 D）：各会话跑回归时无头浏览器会从扬声器外放朗读和音效。
# --mute-audio 只管浏览器自己的声音通道（<audio>、WebAudio）；macOS 上的系统朗读 speechSynthesis
# 不走这条通道（11-09 实测：加了照样占用扬声器）。所以朗读换成假的：不调系统语音，
# 照常触发 start / end 事件、speaking 按字数持续一会儿，cancel 立刻结束——页面看到的行为和真朗读一样，只是没声。
# 用法：b = __import__('quiet').launch(p)，参数同 p.chromium.launch
QUIET_JS = """(() => { const ss = window.speechSynthesis; if (!ss || ss.__quiet) return;
  let live = [];
  const fire = (u, t) => { try { const e = new Event(t); u.dispatchEvent(e); } catch (err) {} };
  const finish = (u, t) => { if (!live.includes(u)) return; live = live.filter(x => x !== u); clearTimeout(u.__qt); fire(u, t); };
  ss.speak = u => { live.push(u); setTimeout(() => live.includes(u) && fire(u, 'start'), 0);
    u.__qt = setTimeout(() => finish(u, 'end'), Math.min(6000, 300 + 150 * String(u.text || '').length)); };
  ss.cancel = () => live.slice().forEach(u => finish(u, 'end'));
  ss.pause = ss.resume = () => {};
  Object.defineProperty(ss, 'speaking', {get: () => live.length > 0, configurable: true});
  Object.defineProperty(ss, 'pending', {get: () => live.length > 1, configurable: true});
  ss.__quiet = true; })();"""

def launch(p, **kw):
    kw['args'] = list(kw.get('args') or []) + ['--mute-audio']
    b = p.chromium.launch(**kw)
    new_context, new_page = b.new_context, b.new_page
    def ctx(*a, **k):
        c = new_context(*a, **k); c.add_init_script(QUIET_JS); return c
    def page(*a, **k):
        pg = new_page(*a, **k); pg.add_init_script(QUIET_JS); return pg
    b.new_context, b.new_page = ctx, page
    return b
