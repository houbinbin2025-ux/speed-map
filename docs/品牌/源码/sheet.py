import os,sys
B=sys.argv[1]; out=sys.argv[2]
dirs=["A-像素方块岛","B-等距方块岛","C-方格字标"]
h=['<html><head><meta charset="utf-8"><style>body{margin:0;font-family:"PingFang SC";background:#888}section{display:flex;gap:0}.d{background:#1b1d22;padding:24px;flex:1}.l{background:#f4ecd8;padding:24px;flex:1}h2{margin:0;padding:8px 24px;background:#444;color:#fff;font-size:16px}img{display:block}.row{display:flex;gap:24px;align-items:flex-end;margin-top:16px}.px{image-rendering:pixelated}</style></head><body>']
for d in dirs:
    p=lambda f: f"{B}/{d}/{f}"
    ex=lambda f: os.path.exists(f"{B}/{d}/{f}")
    mark=lambda t: p("mark.svg") if ex("mark.svg") else p(f"mark-{t}.svg")
    h.append(f"<h2>{d}</h2><section>")
    for t,cls in (("dark","d"),("light","l")):
        h.append(f'<div class="{cls}"><img src="{p("lockup-"+t+".svg")}" style="height:96px">')
        h.append(f'<div class="row"><img src="{mark(t)}" style="height:96px"><div><img src="{p("wordmark-cn-"+t+".svg")}" style="height:40px"><br><img src="{p("wordmark-en-"+t+".svg")}" style="height:32px"></div></div>')
        h.append(f'<div class="row"><img src="{p("favicon-16.svg")}" width="16" height="16"><img src="{p("favicon-32.svg")}" width="32" height="32"><img src="{p("app-icon-180.svg")}" width="90" style="border-radius:20px"><img class="px" src="{p("favicon-16.svg")}" width="128" height="128"><span style="font-size:12px;color:#888">16px 放大 8 倍</span></div></div>')
    h.append("</section>")
h.append("</body></html>")
open(out,"w").write("".join(h))
