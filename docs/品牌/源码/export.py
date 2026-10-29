import sys,os
from playwright.sync_api import sync_playwright
from PIL import Image
D=sys.argv[1]
jobs=[("mark.svg",[16,32,48,180,512,1024],None),("favicon-16.svg",[16],None),("favicon-32.svg",[32],None),("app-icon-180.svg",[180],None)]
import re
def wh(n):
    t=open(f"{D}/{n}").read(300); return int(re.search(r'width="(\d+)"',t).group(1)), int(re.search(r'height="(\d+)"',t).group(1))
locks=[(n,*wh(n)) for n in ("lockup-dark.svg","lockup-light.svg")]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page()
    def shot(svg,w,h,out):
        pg.set_viewport_size({"width":w,"height":h})
        tmp=f"{D}/png/_tmp.html"
        open(tmp,"w").write(f'<html><body style="margin:0;background:transparent"><img src="file://{D}/{svg}" style="display:block;width:{w}px;height:{h}px;image-rendering:pixelated"></body></html>')
        pg.goto("file://"+tmp)
        pg.wait_for_timeout(150); pg.screenshot(path=out,omit_background=True)
    for svg,sizes,_ in jobs:
        for s in sizes: shot(svg,s,s,f"{D}/png/{svg[:-4]}-{s}.png" if svg=="mark.svg" else f"{D}/png/{svg[:-4]}.png")
    for svg,w,h in locks: shot(svg,w*2,h*2,f"{D}/png/{svg[:-4]}@2x.png")
    # 48px 带底色的 favicon 用 mark-48 叠在洞穴底上
    shot("favicon-32.svg",48,48,f"{D}/png/favicon-48.png")
    b.close()
os.remove(f"{D}/png/_tmp.html")
ims=[Image.open(f"{D}/png/{n}").convert("RGBA") for n in ("favicon-16.png","favicon-32.png","favicon-48.png")]
ims[2].save(f"{D}/favicon.ico",sizes=[(16,16),(32,32),(48,48)],append_images=ims[:2])
print(sorted(os.listdir(f"{D}/png")))
