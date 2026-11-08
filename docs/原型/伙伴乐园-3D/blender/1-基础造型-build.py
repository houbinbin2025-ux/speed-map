# 小伙伴乐园 · 小狼 + 红顶木屋 基础造型（Claude 搭主视觉这一步）
# 用法：blender -b --python build.py -- <输出目录>
# 产出：<输出目录>/park.blend、park.glb、preview.png
# 坐标：Blender Z 向上，正面朝 -Y（导出 glTF 后正面朝 +Z）。单位：米。
import bpy, math, sys, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp/park'
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]

MATS = {}
def mat(name, hexc, rough=.62, metal=0., emit=None, trans=0.):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(hexc)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = lin(emit); b.inputs['Emission Strength'].default_value = 1.5
    MATS[name] = m; return m

def finish(o, m, bevel, seg, parent, smooth=True):
    if bevel:
        bv = o.modifiers.new('倒角', 'BEVEL'); bv.width = bevel; bv.segments = seg; bv.limit_method = 'ANGLE'; bv.harden_normals = False
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
        if bevel:
            wn = o.modifiers.new('法线', 'WEIGHTED_NORMAL'); wn.keep_sharp = True
    o.data.materials.append(m)
    if parent: o.parent = parent
    return o

def box(name, size, loc, m, bevel=.03, seg=3, parent=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, min(bevel, min(size) * .45), seg, parent)

def cyl(name, r, h, loc, m, bevel=.02, seg=3, parent=None, rot=(0, 0, 0), verts=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.active_object; o.name = name
    return finish(o, m, min(bevel, r * .45, h * .45), seg, parent)

def ball(name, r, loc, m, parent=None, scale=(1, 1, 1), sub=3):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, location=loc, subdivisions=sub)
    o = bpy.context.active_object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m, 0, 0, parent)

def under(o, parent):
    bpy.context.view_layer.update(); o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted(); return o

def empty(name, loc, parent=None):
    o = bpy.data.objects.new(name, None); o.location = loc; scene.collection.objects.link(o)
    bpy.context.view_layer.update()
    if parent: under(o, parent)          # 按世界坐标挂到父物体下（支点位置不变）
    return o


# ================= 小狼 =================
F, D, L = mat('狼毛', '#aebdcd', .7), mat('狼毛深', '#7f90a5', .7), mat('狼肚白', '#eef2f6', .75)
PINK, RED, INK = mat('耳内粉', '#f4b4c0', .7), mat('红围巾', '#d8432f', .55), mat('眼睛', '#1f2329', .25)
WHITE, CHEEK = mat('高光白', '#ffffff', .2), mat('脸红', '#ff9fb0', .6)
PX, PY = .85, -2.35                                 # 小狼站在门前右侧，脸朝 -Y（镜头方向）
pet = empty('小狼', (PX, PY, 0))
body = empty('身体', (PX, PY, .42), pet)
for i, (x, y) in enumerate([(-.17, -.2), (.17, -.2), (-.17, .22), (.17, .22)]):
    leg = empty('腿%d' % i, (PX + x, PY + y, .3), pet)
    under(box('腿毛%d' % i, (.15, .15, .24), (PX + x, PY + y, .17), F, .06, 4), leg)
    under(box('脚%d' % i, (.16, .17, .07), (PX + x, PY + y - .01, .035), L, .03, 3), leg)
under(box('躯干', (.48, .66, .36), (PX, PY + .02, .44), F, .14, 5), body)
under(box('肚皮', (.34, .5, .06), (PX, PY + .02, .27), L, .03, 3), body)
head = empty('头', (PX, PY - .3, .66), pet)
under(box('头壳', (.7, .58, .54), (PX, PY - .36, .84), F, .16, 6), head)
under(box('嘴筒', (.32, .16, .2), (PX, PY - .68, .74), L, .07, 4), head)
under(box('鼻子', (.11, .06, .07), (PX, PY - .77, .81), INK, .025, 3), head)
under(box('嘴', (.08, .02, .02), (PX, PY - .765, .68), INK, .008, 2), head)
for s in (-1, 1):
    under(box('眼%s' % ('左' if s < 0 else '右'), (.075, .035, .13), (PX + .16 * s, PY - .655, .92), INK, .03, 4), head)
    under(ball('眼光%s' % ('左' if s < 0 else '右'), .018, (PX + .16 * s + .015, PY - .675, .96), WHITE), head)
    under(ball('脸红%s' % ('左' if s < 0 else '右'), .05, (PX + .26 * s, PY - .652, .79), CHEEK, scale=(1.3, .25, .8)), head)
    ear = empty('耳朵%s' % ('左' if s < 0 else '右'), (PX + .2 * s, PY - .32, 1.09), head)
    under(box('耳外%s' % ('左' if s < 0 else '右'), (.17, .09, .25), (PX + .2 * s, PY - .32, 1.2), D, .06, 4), ear)
    under(box('耳内%s' % ('左' if s < 0 else '右'), (.09, .02, .15), (PX + .2 * s, PY - .37, 1.18), PINK, .02, 3), ear)
scarf = empty('围巾', (PX, PY - .2, .62), pet)
under(box('围巾圈', (.56, .5, .11), (PX, PY - .22, .6), RED, .05, 4), scarf)
under(box('围巾尾', (.12, .04, .2), (PX + .18, PY - .47, .5), RED, .03, 3, rot=(0, .15, 0)), scarf)
tail = empty('尾巴', (PX, PY + .34, .52), pet)
under(box('尾巴毛', (.14, .34, .14), (PX, PY + .5, .6), D, .06, 4, rot=(.5, 0, 0)), tail)
under(box('尾巴尖', (.15, .12, .15), (PX, PY + .66, .7), L, .06, 4, rot=(.5, 0, 0)), tail)

# ================= 红顶木屋 =================
LOG1, LOG2 = mat('原木浅', '#d1a26a', .72), mat('原木深', '#bf8f58', .72)
POST, TRIM = mat('立柱', '#7c4f28', .7), mat('白边', '#f5f0e6', .55)
STONE, STONE2 = mat('墙脚石', '#bdb6aa', .85), mat('墙脚石深', '#a49d91', .85)
TILE1, TILE2, RIDGE = mat('瓦红', '#d84b33', .5), mat('瓦红深', '#c23d2a', .5), mat('屋脊', '#a8321f', .55)
DOOR, GOLD = mat('门板', '#6b4126', .65), mat('门把', '#e7b54a', .3, .7)
GLASS = mat('玻璃', '#cfe7f4', .05)
BRICK = mat('烟囱砖', '#b1573d', .8)
hut = empty('红顶木屋', (0, 0, 0))
W, Dp, H = 2.8, 2.2, 1.7                            # 墙宽、进深、墙高
box('墙脚', (W + .25, Dp + .25, .22), (0, 0, .11), STONE, .05, 3, hut)
for i, x in enumerate([-1.3, -.85, -.4, .05, .5, .95, 1.3]):
    box('墙脚石%d' % i, (.42, .06, .16), (x, -Dp / 2 - .14, .11), STONE2 if i % 2 else STONE, .03, 2, hut)
n = 8; lh = H / n
for i in range(n):
    z = .22 + lh * (i + .5); m = LOG1 if i % 2 else LOG2
    box('前墙%d' % i, (W, .2, lh * .96), (0, -Dp / 2, z), m, .05, 3, hut)
    box('后墙%d' % i, (W, .2, lh * .96), (0, Dp / 2, z), m, .05, 3, hut)
    box('左墙%d' % i, (.2, Dp, lh * .96), (-W / 2, 0, z), m, .05, 3, hut)
    box('右墙%d' % i, (.2, Dp, lh * .96), (W / 2, 0, z), m, .05, 3, hut)
for sx in (-1, 1):
    for sy in (-1, 1):
        box('角柱', (.26, .26, H + .1), (sx * W / 2, sy * Dp / 2, .22 + H / 2), POST, .05, 3, hut)
# 门
fy = -Dp / 2 - .11
box('门', (.72, .06, 1.2), (0, fy, .22 + .6), DOOR, .02, 2, hut)
for zz in (.48, 1.05):
    for xx in (-.17, .17):
        box('门板格', (.26, .03, .42), (xx, fy - .035, zz), mat('门板格', '#5a3520', .65), .015, 2, hut)
box('门框上', (.94, .1, .1), (0, fy - .02, 1.47), TRIM, .03, 3, hut)
for xx in (-.42, .42): box('门框边', (.1, .1, 1.26), (xx, fy - .02, .85), TRIM, .03, 3, hut)
ball('门把', .045, (.24, fy - .08, .82), GOLD, hut)
# 窗
for s in (-1, 1):
    cx = .92 * s; cz = 1.18
    box('窗玻璃', (.56, .03, .5), (cx, fy + .02, cz), GLASS, .005, 1, hut)
    for dz in (-.28, .28): box('窗框横', (.7, .09, .08), (cx, fy - .02, cz + dz), TRIM, .03, 3, hut)
    for dx in (-.32, .32): box('窗框竖', (.08, .09, .56), (cx + dx, fy - .02, cz), TRIM, .03, 3, hut)
    box('窗格横', (.56, .05, .035), (cx, fy - .01, cz), TRIM, .012, 2, hut)
    box('窗格竖', (.035, .05, .5), (cx, fy - .01, cz), TRIM, .012, 2, hut)
    box('花箱', (.66, .16, .14), (cx, fy - .1, cz - .4), mat('花箱', '#a8703c', .7), .03, 3, hut)
    for k, c in enumerate(['#ff8fb0', '#ffd65a', '#ffffff', '#b48cf0', '#ff8fb0']):
        ball('花', .045, (cx - .24 + k * .12, fy - .1, cz - .3), mat('花' + c, c, .6), hut)
        ball('叶', .04, (cx - .18 + k * .12, fy - .12, cz - .32), mat('叶', '#5a9e48', .7), hut)
# 山墙：三角形，用逐层缩短的原木搭
for i in range(5):
    w = W - i * .55; z = .22 + H + lh * (i + .5)
    for y in (-Dp / 2, Dp / 2): box('山墙', (max(.3, w), .2, lh * .96), (0, y, z), LOG1 if i % 2 else LOG2, .05, 3, hut)
# 屋顶：两坡，一排排圆角瓦片
pitch = math.radians(36); half = W / 2 + .35; slope = half / math.cos(pitch)
rows = 7
for s in (-1, 1):
    for r in range(rows):
        t = (r + .5) / rows; d = slope * t
        x = s * (half - d * math.cos(pitch)); z = .22 + H + .1 + d * math.sin(pitch)
        box('瓦', (.5 + .02, Dp + .7, .1), (x, 0, z), TILE1 if r % 2 else TILE2, .04, 4, hut, rot=(0, s * pitch, 0))
        # 每排瓦切成一片片，看得见瓦缝
        for k in range(-3, 4):
            box('瓦片', (.46, .36, .05), (x, k * .4, z + .055), TILE2 if (r + k) % 2 else TILE1, .025, 3, hut, rot=(0, s * pitch, 0))
ridgeZ = .22 + H + .1 + slope * math.sin(pitch) + .02
box('屋脊', (.22, Dp + .75, .16), (0, 0, ridgeZ), RIDGE, .06, 4, hut)
box('烟囱', (.36, .36, .9), (.75, .35, ridgeZ - .05), BRICK, .04, 3, hut)
box('烟囱帽', (.46, .46, .1), (.75, .35, ridgeZ + .44), mat('烟囱帽', '#6d6f76', .6), .03, 3, hut)

# ================= 地块：石板路、食盆、水槽、灯笼、栅栏、灌木 =================
plot = empty('地块', (0, 0, 0))
PATH = mat('石板', '#e8dcc2', .85)
for i in range(6):
    for j, xx in enumerate((-.3, .3)):
        box('石板', (.54, .54, .08), (xx + (.03 if (i + j) % 2 else -.02), -1.55 - i * .6, .04), PATH, .04, 3, plot)
BOWL, FOOD, TROUGH, WATER = mat('食盆', '#b27a4c', .6), mat('狗粮', '#d9b27c', .8), mat('水槽', '#8fa2b2', .45), mat('水', '#5cc0e8', .05)
bowl = empty('食盆', (-1.0, -1.75, 0), plot)
under(cyl('食盆体', .26, .14, (-1.0, -1.75, .07), BOWL, .03, 3), bowl)
under(cyl('食盆内', .2, .02, (-1.0, -1.75, .135), mat('食盆内', '#7a4e2c', .7)), bowl)
food = under(ball('狗粮堆', .19, (-1.0, -1.75, .14), FOOD, scale=(1, 1, .45)), bowl); food.name = '狗粮'
trough = empty('水槽', (1.3, -1.6, 0), plot)
under(box('水槽体', (.6, .34, .16), (1.3, -1.6, .08), TROUGH, .04, 3), trough)
w = under(box('水面', (.5, .24, .02), (1.3, -1.6, .15), WATER, .005, 1), trough); w.name = '水'
lamp = empty('灯笼柱', (-.8, -2.9, 0), plot)
under(box('灯柱', (.09, .09, 1.15), (-.8, -2.9, .58), mat('灯柱', '#4c3f35', .5), .02, 2), lamp)
under(box('灯罩顶', (.28, .28, .06), (-.8, -2.9, 1.42), mat('灯罩', '#3b322b', .5), .02, 2), lamp)
under(box('灯芯', (.2, .2, .22), (-.8, -2.9, 1.28), mat('灯芯', '#fff1c8', .4, emit='#ffd27a'), .03, 2), lamp)
FENCE = mat('栅栏', '#b98552', .7)
for x in [-2.6 + k * .65 for k in range(9)]:
    if abs(x) < .7: continue
    box('栅栏桩', (.11, .11, .55), (x, -3.35, .28), FENCE, .03, 3, plot)
for s in (-1, 1):
    box('栅栏横', (2.05, .06, .07), (s * 1.6, -3.35, .42), FENCE, .02, 2, plot)
    box('栅栏横', (2.05, .06, .07), (s * 1.6, -3.35, .22), FENCE, .02, 2, plot)
BUSH = [mat('灌木%d' % i, c, .85) for i, c in enumerate(['#5f9e45', '#6fb04f', '#4f8a3a'])]
for (x, y, r) in [(-1.75, -1.15, .32), (-1.55, -1.3, .24), (1.75, -1.2, .3), (1.95, -1.0, .22), (-1.9, .9, .3), (1.95, .8, .34)]:
    for k in range(3):
        ball('灌木', r * (1 - k * .2), (x + (k - 1) * r * .45, y + (k % 2) * .08, r * (.75 + k * .1)), BUSH[k], plot, sub=3)

# ================= 预览渲染（看形，不是成品）=================
bpy.ops.object.camera_add(location=(5.6, -7.4, 4.6)); cam = bpy.context.active_object; scene.camera = cam
cam.data.lens = 50
d = Vector((.2, -.6, .9)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.light_add(type='SUN', location=(4, -3, 8)); sun = bpy.context.active_object; sun.data.energy = 3.2; sun.rotation_euler = (math.radians(50), 0, math.radians(35)); sun.data.angle = math.radians(8)
bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, 0)); g = bpy.context.active_object; g.name = '预览地面'; g.data.materials.append(mat('预览草', '#6aa84f', .9))
world = bpy.data.worlds.new('天'); scene.world = world; world.use_nodes = True; world.node_tree.nodes['Background'].inputs['Color'].default_value = lin('#cfe4f2'); world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try: scene.render.engine = eng; break
    except Exception: pass
scene.render.resolution_x, scene.render.resolution_y = 1280, 900
scene.view_settings.view_transform = 'AgX' if 'AgX' in [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items] else 'Filmic'
scene.render.filepath = os.path.join(OUT, 'preview.png')
bpy.ops.render.render(write_still=True)

# 导出：去掉预览用的相机、灯、地面
for o in (cam, sun, g): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'park.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'park.glb'), export_format='GLB', export_apply=True, export_yup=True)
print('完成', OUT, len(bpy.data.objects), '个物体')
