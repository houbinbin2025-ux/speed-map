# 小伙伴乐园 · 大场景基础造型（Claude 搭主视觉）
# 用法：blender -b --python build2.py -- <输出目录> <小狼一家的精修 .blend>
# 布局照原帖：中间一个枢纽（广场：小卖部 + 传送门），送粮传送带放射到各家；8 块地沿弧形排在广场后面，门朝镜头。
# 坐标：Blender Z 向上，镜头在 -Y 方向。每户「地块」本地坐标里门朝 -Y。
import bpy, math, sys, os, json
from mathutils import Vector, Matrix
args = sys.argv[sys.argv.index('--') + 1:]
OUT, WOLF_BLEND = args[0], args[1]
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *          # lin / mat / box / cyl / ball / empty / under / scene

# ---------------- 布局 ----------------
PLAZA_R = 5.2                        # 广场半径
RING_R = 16.0                        # 各家地块中心到广场中心的距离
ANGLES = [-15, 14, 43, 72, 108, 137, 166, 195]     # 度；0 度 = +X，90 度 = 正后方
OCC = {72: '熊猫', 108: '小狼', 43: '美西螈'}        # 有住户的地块（其余待开放）
def plot_xf(a):
    t = math.radians(a); p = Vector((RING_R * math.cos(t), RING_R * math.sin(t), 0))
    phi = t - math.pi / 2                  # 本地 -Y（门）朝向广场
    return p, phi

def place(objs_roots, a, name):
    p, phi = plot_xf(a)
    root = empty(name, (0, 0, 0))
    for o in objs_roots: under(o, root)
    root.location = p; root.rotation_euler = (0, 0, phi)
    bpy.context.view_layer.update()
    return root

# ---------------- 通用：地砖平台（每户的地） ----------------
PAVE1, PAVE2 = mat('地砖浅', '#efe3c8', .85), mat('地砖深', '#e2d3b2', .85)
EDGE = mat('平台边', '#b9ae98', .85)
def platform(name, w=6.2, d=6.6, cy=-1.0):
    g = empty(name + '平台', (0, 0, 0))
    box('平台边', (w + .3, d + .3, .16), (0, cy, .02), EDGE, .06, 3, g)
    for i in range(int(w)):
        for j in range(int(d)):
            box('砖', (.96, .96, .08), (-w / 2 + .5 + i, cy - d / 2 + .5 + j, .12), PAVE1 if (i + j) % 2 else PAVE2, .05, 3, g)
    return g

def bowl_set(pre, food_col, x=-1.0, y=-1.75, tx=1.3, ty=-1.6):
    BOWL, TROUGH, WATER = mat('食盆', '#b27a4c', .6), mat('水槽', '#8fa2b2', .45), mat('水', '#5cc0e8', .05)
    bowl = empty(pre + '食盆', (x, y, 0))
    under(cyl('食盆体', .26, .14, (x, y, .07 + .16), BOWL, .03, 3), bowl)
    f = under(ball(pre + '狗粮', .19, (x, y, .3), mat(pre + '粮', food_col, .8), scale=(1, 1, .45)), bowl); f.name = pre + '狗粮'
    tr = empty(pre + '水槽', (tx, ty, 0))
    under(box('水槽体', (.6, .34, .16), (tx, ty, .24), TROUGH, .04, 3), tr)
    w = under(box(pre + '水', (.5, .24, .02), (tx, ty, .31), WATER, .005, 1), tr); w.name = pre + '水'
    return [bowl, tr]

# ---------------- 伙伴：一副通用骨架，各自换比例和配件 ----------------
def pet(pre, P, at=(0.85, -2.35)):
    PX, PY = at; Z = .16                                  # 站在平台上
    root = empty(pre, (PX, PY, Z))
    for i, (x, y) in enumerate([(-.17, -.2), (.17, -.2), (-.17, .22), (.17, .22)]):
        leg = empty(pre + '/腿%d' % i, (PX + x, PY + y, Z + .3), root)
        under(box('腿', (.16, .16, .22 * P.get('leg', 1)), (PX + x, PY + y, Z + .14), P['leg_m'], .06, 4), leg)
    under(box('躯干', (.5 * P.get('bw', 1), .66 * P.get('bl', 1), .36), (PX, PY + .02, Z + .42 * P.get('leg', 1) + .02), P['body_m'], .15, 5), root)
    head = empty(pre + '/头', (PX, PY - .3, Z + .66), root)
    hw = P.get('hw', 1)
    under(box('头壳', (.72 * hw, .58, .54), (PX, PY - .36, Z + .84), P['head_m'], .18, 6), head)
    for s in (-1, 1):
        if 'patch_m' in P: under(box('眼圈', (.16, .02, .18), (PX + .16 * s, PY - .655, Z + .9), P['patch_m'], .07, 4, rot=(0, .25 * s, 0)), head)
        under(box('眼', (.07, .035, .12), (PX + .16 * s, PY - .67, Z + .92), mat('眼睛', '#1f2329', .25), .03, 4), head)
        under(ball('眼光', .02, (PX + .16 * s + .012, PY - .69, Z + .96), mat('高光白', '#ffffff', .2)), head)
        under(ball('脸红', .05, (PX + .27 * s, PY - .655, Z + .78), mat('脸红' + pre, P.get('blush', '#ff9fb0'), .6), scale=(1.3, .25, .8)), head)
        ear = empty(pre + '/耳朵' + ('左' if s < 0 else '右'), (PX + .22 * s * hw, PY - .32, Z + 1.09), head)
        P['ear'](ear, PX + .22 * s * hw, PY - .32, Z + 1.09, s)
    under(box('嘴筒', (.3, .14, .17), (PX, PY - .66, Z + .74), P.get('snout_m', P['head_m']), .07, 4), head)
    under(box('鼻子', (.1, .05, .06), (PX, PY - .74, Z + .8), mat('眼睛', '#1f2329', .25), .025, 3), head)
    tail = empty(pre + '/尾巴', (PX, PY + .34, Z + .5), root)
    P['tail'](tail, PX, PY, Z)
    if 'extra' in P: P['extra'](root, head, PX, PY, Z)
    return root

# ================= 1. 小狼一家（精修版原样搬进来） =================
with bpy.data.libraries.load(WOLF_BLEND, link=False) as (src, dst):
    dst.objects = list(src.objects)
for o in dst.objects:
    if o is not None: scene.collection.objects.link(o)
for n in ['小狼', '头', '耳朵左', '耳朵右', '尾巴', '狗粮', '水', '食盆', '水槽']:
    o = bpy.data.objects.get(n)
    if o: o.name = ('小狼/' + n) if n != '小狼' else '小狼'
bpy.context.view_layer.update()
wolf_roots = [bpy.data.objects[n] for n in ('地块', '小狼', '红顶木屋')]
# 小狼原来站在 z=0，平台高 0.16：整体抬一点
for o in wolf_roots: o.location.z += .16
wolf_plat = platform('小狼')
place(wolf_roots + [wolf_plat], 108, '地块-小狼')

# ================= 2. 熊猫 + 竹林小亭 =================
W_, K_ = mat('熊猫白', '#f6f5f0', .7), mat('熊猫黑', '#2e3036', .7)
def panda_ear(ear, x, y, z, s): under(ball('熊猫耳', .1, (x, y, z + .06), K_, scale=(1, .7, 1)), ear)
def panda_tail(tail, x, y, z): under(ball('熊猫尾', .07, (x, y + .37, z + .52), W_), tail)
def panda_extra(root, head, x, y, z):
    under(cyl('背上的竹子', .035, .9, (x - .2, y + .15, z + .9), mat('竹', '#7cb55a', .55), .01, 2, rot=(0, .35, 0)), root)
    for k in range(3): under(box('竹叶', (.18, .03, .06), (x - .33 + k * .05, y + .15, z + 1.25 + k * .08), mat('竹叶', '#a4d580', .6), .02, 2, rot=(0, .6 - k * .4, 0)), root)
    under(box('黑肩带', (.52, .3, .38), (x, y - .05, z + .46), K_, .14, 5), root)
panda = pet('熊猫', {'leg_m': K_, 'body_m': W_, 'head_m': W_, 'patch_m': K_, 'snout_m': W_, 'hw': 1.05, 'bw': 1.1, 'ear': panda_ear, 'tail': panda_tail, 'extra': panda_extra, 'blush': '#ffb3c3'})
RED, GTILE, GTILE2, STONE = mat('亭柱红', '#c9473c', .55), mat('亭瓦绿', '#3f7a62', .55), mat('亭瓦绿深', '#336650', .55), mat('石台', '#c9c2b4', .85)
pav = empty('竹林小亭', (0, 0, 0))
box('亭台', (3.4, 2.8, .3), (0, .2, .31), STONE, .06, 3, pav)
for sx in (-1, 1):
    for sy in (-1, 1): cyl('亭柱', .11, 1.9, (sx * 1.35, .2 + sy * 1.05, 1.41), RED, .02, 2, pav)
for i, (w, d, z) in enumerate([(4.2, 3.6, 2.4), (3.1, 2.6, 2.95), (1.9, 1.6, 3.4)]):
    box('亭顶', (w, d, .22), (0, .2, z), GTILE if i % 2 else GTILE2, .08, 4, pav)
    for sx in (-1, 1):
        for sy in (-1, 1): box('翘角', (.3, .3, .14), (sx * (w / 2 - .05), .2 + sy * (d / 2 - .05), z + .14), GTILE, .06, 3, pav)
    box('檐红', (w - .2, d - .2, .12), (0, .2, z - .17), RED, .04, 3, pav)
ball('亭顶珠', .18, (0, .2, 3.72), mat('亭顶珠', '#f2c14e', .3, .5), pav)
box('匾', (1.0, .06, .3), (0, -.96, 2.05), mat('匾', '#7a3b2a', .6), .03, 3, pav)
box('坐垫', (.9, .7, .12), (0, .6, .52), mat('坐垫', '#e7b54a', .7), .05, 3, pav)
BAMBOO, BLEAF = mat('竹', '#7cb55a', .55), mat('竹叶', '#a4d580', .6)
for (bx, by, n) in [(-2.4, .9, 5), (2.5, .6, 4), (-2.6, -.6, 3), (2.3, 1.9, 4)]:
    for k in range(n):
        h = 2.4 + (k * 7 % 5) * .3; x, y = bx + (k % 3 - 1) * .22, by + (k // 3) * .22
        for seg in range(int(h / .5)): cyl('竹节', .06, .48, (x, y, .4 + seg * .5), BAMBOO, .01, 2, pav)
        for j in range(2): box('竹叶', (.42, .05, .1), (x + (.2 if j else -.2), y, .3 + h - j * .3), BLEAF, .02, 2, pav, rot=(0, .5 if j else -.5, 0))
box('石灯座', (.3, .3, .5), (-1.6, -1.9, .41), STONE, .04, 3, pav); box('石灯', (.42, .42, .3), (-1.6, -1.9, .81), mat('石灯', '#d8d1c3', .8), .05, 3, pav)
box('石灯芯', (.2, .2, .16), (-1.6, -2.11, .81), mat('灯芯', '#fff1c8', .4, emit='#ffd27a'), .03, 2, pav)
p2 = platform('熊猫')
place([panda, pav, p2] + bowl_set('熊猫/', '#a7d46f'), 72, '地块-熊猫')

# ================= 3. 美西螈 + 荷叶池塘 =================
AX, AXD, GILL = mat('美西螈粉', '#f7b6c9', .6), mat('美西螈深', '#ea8fae', .6), mat('鳃', '#d9548f', .6)
def axo_ear(ear, x, y, z, s):
    for k in range(3): under(box('鳃', (.2, .05, .06), (x + s * (.08 + k * .02), y, z - .18 + k * .09), GILL, .025, 3, rot=(0, -s * (.5 - k * .35), 0)), ear)
def axo_tail(tail, x, y, z): under(box('美西螈尾', (.1, .5, .26), (x, y + .55, z + .45), AXD, .05, 4, rot=(-.2, 0, 0)), tail)
axo = pet('美西螈', {'leg_m': AXD, 'body_m': AX, 'head_m': AX, 'snout_m': mat('美西螈肚', '#fde3ea', .6), 'hw': 1.2, 'bw': 1.0, 'leg': .7, 'ear': axo_ear, 'tail': axo_tail, 'blush': '#f56f97'})
SAND, SAND2, POND, LILY = mat('陶屋', '#e9d6b2', .8), mat('陶屋深', '#d9c090', .8), mat('池水', '#4eb4d2', .08), mat('荷叶', '#62b35a', .6)
hut3 = empty('荷叶池塘', (0, 0, 0))
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.5, location=(-.6, .6, .2), segments=32, ring_count=16); d = bpy.context.active_object; d.name = '圆顶屋'; d.scale = (1, 1, .85)
bpy.ops.object.transform_apply(scale=True); finish(d, SAND, 0, 0, hut3)
box('圆顶门', (.6, .2, .95), (-.6, -.85, .62), mat('门板', '#6b4126', .65), .04, 3, hut3)
for k in range(8):
    a = k / 8 * math.tau; box('砖带', (.32, .12, .14), (-.6 + math.cos(a) * 1.5, .6 + math.sin(a) * 1.5, .26), SAND2, .04, 2, hut3, rot=(0, 0, a))
ball('圆窗', .16, (.55, -.15, 1.0), mat('玻璃', '#cfe7f4', .05), hut3, scale=(1, .4, 1))
bpy.ops.mesh.primitive_cylinder_add(radius=1.35, depth=.12, location=(1.4, .9, .2), vertices=40); pd = bpy.context.active_object; pd.name = '池塘水'; finish(pd, POND, .02, 2, hut3)
cyl('池塘边', 1.48, .1, (1.4, .9, .16), mat('池塘边', '#a99d8a', .85), .03, 2, hut3)
for (x, y, r) in [(1.0, .5, .3), (1.8, 1.3, .25), (1.7, .4, .22), (1.1, 1.4, .2)]:
    cyl('荷叶', r, .03, (x, y, .28), LILY, .01, 2, hut3)
ball('荷花', .1, (1.8, 1.3, .36), mat('荷花', '#ff9dc2', .5), hut3)
for k in range(6): cyl('芦苇', .025, .9 + k % 3 * .2, (2.5 + (k % 2) * .15, 1.6 - k * .22, .65), mat('芦苇', '#5b9a4e', .7), .005, 1, hut3)
p3 = platform('美西螈')
place([axo, hut3, p3] + bowl_set('美西螈/', '#f2a06b'), 43, '地块-美西螈')

# ================= 4. 待开放的地 =================
for a in ANGLES:
    if a in OCC: continue
    g = empty('空地%d' % a, (0, 0, 0))
    for (sx, sy, w, d) in [(0, -4.3, 6.2, .14), (0, 2.3, 6.2, .14), (-3.1, -1, .14, 6.6), (3.1, -1, .14, 6.6)]:
        box('空地边', (w, d, .14), (sx, sy, .07), mat('栅栏', '#b98552', .7), .04, 2, g)
    sign = empty('待开放牌', (0, 0, 0))
    box('牌柱', (.1, .1, .9), (0, -2.6, .6), mat('栅栏', '#b98552', .7), .03, 2, sign)
    box('牌面', (.9, .08, .5), (0, -2.6, 1.05), mat('牌面', '#f2e3c2', .7), .04, 3, sign)
    box('锁', (.16, .05, .18), (0, -2.66, 1.05), mat('锁', '#c9a14a', .35, .6), .03, 3, sign)
    place([g, sign], a, '地块-空%d' % a)

# ================= 5. 中心广场：小卖部 + 传送门 =================
hub = empty('广场', (0, 0, 0))
for i, (r, c) in enumerate([(PLAZA_R, '#e6dcc6'), (PLAZA_R - .6, '#d8cbb0'), (PLAZA_R - 1.4, '#ece3cf'), (1.6, '#d8cbb0')]):
    cyl('广场圈', r, .12 + i * .01, (0, 0, .06 + i * .005), mat('广场' + c, c, .85), .04, 2, hub, verts=72)
SHOP = mat('小卖部木', '#c99a62', .7)
box('柜台', (2.2, .9, .9), (0, -1.2, .55), SHOP, .06, 3, hub)
box('台面', (2.4, 1.0, .1), (0, -1.2, 1.05), mat('台面', '#8a5a2c', .6), .04, 3, hub)
for x in (-1.05, 1.05): box('棚柱', (.1, .1, 1.5), (x, -1.55, 1.8), mat('立柱', '#7c4f28', .7), .03, 2, hub)
for k in range(8): box('遮阳棚', (.3, 1.3, .08), (-1.05 + .3 * k, -1.3, 2.55 - (abs(k - 3.5) * 0) ), mat('棚红' if k % 2 else '棚白', '#e0533d' if k % 2 else '#f7f1e3', .6), .03, 2, hub, rot=(-.28, 0, 0))
for k in range(3): ball('粮袋', .22, (-.7 + k * .35, -1.2, 1.3), mat('粮袋', '#e8c58c', .85), hub, scale=(1, .8, 1.1))
for k in range(2): cyl('水桶', .18, .4, (.55 + k * .4, -1.2, 1.3), mat('水桶', '#6fb6de', .4), .03, 2, hub)
box('小卖部牌', (1.2, .08, .32), (0, -1.75, 2.15), mat('牌面', '#f2e3c2', .7), .04, 3, hub)
PORTAL = mat('门石', '#b6aea0', .8)
for x in (-1.0, 1.0): box('门柱', (.4, .4, 2.6), (x, 2.4, 1.36), PORTAL, .08, 3, hub)
box('门楣', (2.6, .5, .45), (0, 2.4, 2.85), PORTAL, .1, 3, hub)
box('传送门光', (1.6, .06, 2.2), (0, 2.4, 1.25), mat('传送门光', '#9b7bff', .2, emit='#8f6cff'), .02, 2, hub)
for x in (-3.6, 3.6):
    box('路灯柱', (.1, .1, 1.8), (x, -3.3, 1.0), mat('灯柱', '#4c3f35', .5), .02, 2, hub)
    box('路灯', (.3, .3, .3), (x, -3.3, 2.0), mat('灯芯', '#fff1c8', .4, emit='#ffd27a'), .04, 2, hub)

# ================= 6. 送粮传送带：广场边 → 各家门前 =================
BELT, RAIL, POST = mat('传送带', '#3d4048', .6), mat('传送带边', '#d9d4c6', .5), mat('传送带柱', '#9ea3ab', .5)
layout = {'plots': [], 'belts': {}, 'shop': [0, -1.2, 1.2], 'plaza_r': PLAZA_R}
def to_gl(v): return [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]   # Blender → glTF（Y 向上）
for a in ANGLES:
    p, phi = plot_xf(a)
    who = OCC.get(a)
    layout['plots'].append({'angle': a, 'center': to_gl(p), 'rot': round(phi, 4), 'who': who})
    if not who: continue
    t = math.radians(a); u = Vector((math.cos(t), math.sin(t), 0))
    start = u * (PLAZA_R - .2); end = u * (RING_R - 4.4)
    L = (end - start).length; mid = (start + end) / 2
    belt = empty('传送带-' + who, (0, 0, 0))
    rot = (0, 0, math.atan2(u.y, u.x))
    box('带面', (L, .5, .08), (mid.x, mid.y, .55), BELT, .03, 2, belt, rot=rot)
    for s in (-1, 1):
        off = Vector((-u.y, u.x, 0)) * .3 * s
        box('带边', (L, .07, .14), (mid.x + off.x, mid.y + off.y, .62), RAIL, .03, 2, belt, rot=rot)
    for k in range(int(L / 1.2) + 1):
        q = start + u * min(L, k * 1.2)
        box('带柱', (.1, .1, .5), (q.x, q.y, .27), POST, .02, 2, belt)
    layout['belts'][who] = [to_gl(start + Vector((0, 0, .66))), to_gl(end + Vector((0, 0, .66)))]
json.dump(layout, open(os.path.join(OUT, 'layout.json'), 'w'), ensure_ascii=False, indent=1)

# ================= 预览渲染 + 导出 =================
bpy.ops.object.camera_add(location=(0, -40, 30)); cam = bpy.context.active_object; scene.camera = cam; cam.data.lens = 40
d = Vector((0, 5, 0)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.light_add(type='SUN', location=(4, -3, 8)); sun = bpy.context.active_object; sun.data.energy = 3.2; sun.rotation_euler = (math.radians(50), 0, math.radians(35)); sun.data.angle = math.radians(8)
bpy.ops.mesh.primitive_cylinder_add(radius=24, depth=.2, location=(0, 5, -.1), vertices=96); g = bpy.context.active_object; g.name = '预览地面'; g.data.materials.append(mat('预览草', '#6aa84f', .9))
world = bpy.data.worlds.new('天'); scene.world = world; world.use_nodes = True; world.node_tree.nodes['Background'].inputs['Color'].default_value = lin('#cfe4f2')
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
scene.view_settings.view_transform = 'AgX'
scene.render.filepath = os.path.join(OUT, 'preview.png'); bpy.ops.render.render(write_still=True)
for o in (cam, sun, g): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'park2.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'park2.glb'), export_format='GLB', export_apply=True, export_yup=True)
print('完成', len(bpy.data.objects), '个物体')
