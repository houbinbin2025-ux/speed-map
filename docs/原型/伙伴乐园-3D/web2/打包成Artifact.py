# 把本地网页打成 Artifact 能跑的版本：脚本内联、three.js 走 jsDelivr（锁版本）、模型 GLB → 内嵌 glTF 文本
import sys, os, json, struct, base64
src, out = sys.argv[1], sys.argv[2]; glb_name = sys.argv[3]
os.makedirs(out, exist_ok=True)
html = open(os.path.join(src, 'index.html')).read(); js = open(os.path.join(src, 'main.js')).read()
assert '</script' not in js
for cut in ['<!doctype html>\n', '<html lang="zh-CN">\n', '<head>\n', '<meta charset="utf-8">\n', '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n', '</head>\n', '</body>\n', '</html>\n']:
    html = html.replace(cut, '')
html = html.replace('<body class="intro">', '<script>document.body.classList.add("intro")</script>').replace('<body>', '')
html = html.replace('"three":"./vendor/three.module.js","three/addons/":"./vendor/jsm/"', '"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"')
js = js.replace("'./%s'" % glb_name, "'./%s'" % glb_name.replace('.glb', '.json'))
html = html.replace('<script type="module" src="./main.js"></script>', '<script type="module">\n' + js + '\n</script>')
assert html.lstrip().startswith('<title>'), html[:60]
open(os.path.join(out, 'index.html'), 'w').write(html)
b = open(os.path.join(src, glb_name), 'rb').read(); o = 12; J = B = None
while o < len(b):
    ln, ty = struct.unpack('<II', b[o:o + 8]); d = b[o + 8:o + 8 + ln]; o += 8 + ln
    if ty == 0x4E4F534A: J = json.loads(d)
    elif ty == 0x004E4942: B = d
J['buffers'][0]['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(B).decode()
open(os.path.join(out, glb_name.replace('.glb', '.json')), 'w').write(json.dumps(J, ensure_ascii=False, separators=(',', ':')))
for extra in sys.argv[4:]: open(os.path.join(out, extra), 'w').write(open(os.path.join(src, extra)).read())
print('ok', os.listdir(out))
