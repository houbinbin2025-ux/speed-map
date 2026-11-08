"""小伙伴乐园：基于现有 park.blend 的可重复精修，不重建场景。

Run: Blender -b out/base/park.blend --python refine.py -- out/refined
Only constant Principled materials; no external assets or dependencies.
"""
import bpy
import math
import os
import sys
import json
import struct
import random
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else os.path.join(ROOT, 'out/refined')
assert os.path.commonpath((ROOT, OUT)) == ROOT, 'Output must stay inside this project'
os.makedirs(OUT, exist_ok=True)
if not bpy.data.objects.get('小狼'):
    bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT, 'out/base/park.blend'))
scene = bpy.context.scene
bpy.context.view_layer.update()
RNG = random.Random(709)
LOCKED = ['小狼', '头', '耳朵左', '耳朵右', '尾巴', '狗粮', '水']
baseline = {n: {'world': [list(row) for row in bpy.data.objects[n].matrix_world],
                'local': [list(row) for row in bpy.data.objects[n].matrix_basis],
                'parent': bpy.data.objects[n].parent.name if bpy.data.objects[n].parent else None}
            for n in LOCKED}
required_materials = {n: bpy.data.materials[n] for n in ('玻璃', '灯芯')}
pet, head, hut, plot = (bpy.data.objects[n] for n in ('小狼', '头', '红顶木屋', '地块'))


def linear(h):
    rgb = [int(h.lstrip('#')[i:i+2], 16)/255 for i in (0, 2, 4)]
    return [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb] + [1]


def material(name, color, rough=.7, metal=0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = linear(color)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    m.diffuse_color = linear(color)
    return m


def parent_world(o, p):
    if p:
        bpy.context.view_layer.update()
        mw = o.matrix_world.copy()
        o.parent = p
        o.matrix_parent_inverse = p.matrix_world.inverted()
        o.matrix_world = mw
    return o


def finish(o, name, mat, bevel=0, segments=3, parent=None, smooth=True):
    o.name = name
    if mat:
        o.data.materials.append(mat)
    if bevel:
        b = o.modifiers.new('柔圆边', 'BEVEL')
        b.width, b.segments = bevel, segments
        b.limit_method = 'ANGLE'
    for poly in o.data.polygons:
        poly.use_smooth = smooth
    if bevel:
        n = o.modifiers.new('面加权法线', 'WEIGHTED_NORMAL')
        n.keep_sharp = True
        n.weight = 35
    return parent_world(o, parent)


def box(name, size, loc, mat, bevel=.02, parent=None, rot=(0, 0, 0), seg=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, name, mat, min(bevel, min(size)*.46), seg, parent)


def ball(name, loc, size, mat, parent=None, seg=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1, location=loc)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, name, mat, parent=parent)


def cyl(name, r, depth, loc, mat, parent=None, rot=(0, 0, 0), vertices=20, bevel=.008):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=r, depth=depth, location=loc, rotation=rot)
    return finish(bpy.context.object, name, mat, min(bevel, depth*.25), 3, parent)


def torus(name, loc, radius, tube, mat, parent=None, rot=(0, 0, 0), scale=(1, 1, 1), major=24, minor=6):
    bpy.ops.mesh.primitive_torus_add(major_segments=major, minor_segments=minor,
                                   location=loc, rotation=rot, major_radius=radius, minor_radius=tube)
    o = bpy.context.object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, name, mat, parent=parent)


def mesh(name, verts, faces, mat, bevel=0, parent=None, seg=3):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    o = bpy.data.objects.new(name, data)
    scene.collection.objects.link(o)
    return finish(o, name, mat, bevel, seg, parent)


def tube(name, points, radius, mat, parent=None, sides=6):
    # Mesh tubes export without curve-dependent rendering or procedural materials.
    points = [Vector(p) for p in points]
    verts, faces = [], []
    for i, p in enumerate(points):
        tangent = points[min(i+1, len(points)-1)] - points[max(i-1, 0)]
        tangent.normalize()
        ref = Vector((0, 0, 1)) if abs(tangent.z) < .9 else Vector((1, 0, 0))
        a = tangent.cross(ref).normalized()
        b = tangent.cross(a).normalized()
        for k in range(sides):
            theta = k*math.tau/sides
            verts.append(tuple(p+radius*(math.cos(theta)*a+math.sin(theta)*b)))
    for i in range(len(points)-1):
        for k in range(sides):
            j = (k+1) % sides
            faces.append((i*sides+k, i*sides+j, (i+1)*sides+j, (i+1)*sides+k))
    faces.extend([tuple(reversed(range(sides))), tuple((len(points)-1)*sides+k for k in range(sides))])
    return mesh(name, verts, faces, mat, parent=parent)


def delete_prefix(*prefixes):
    for o in list(bpy.data.objects):
        if any(o.name == p or o.name.startswith(p+'.') for p in prefixes):
            assert o.name not in LOCKED
            bpy.data.objects.remove(o, do_unlink=True)


def change_world_mesh(o, center, factors):
    bpy.context.view_layer.update()
    mw, inv = o.matrix_world.copy(), o.matrix_world.inverted()
    center = Vector(center)
    for v in o.data.vertices:
        p = mw @ v.co - center
        v.co = inv @ (center+Vector(tuple(p[i]*factors[i] for i in range(3))))


# Existing materials remain identifiable, including webpage-controlled glass/light.
for m in bpy.data.materials:
    if m.use_nodes:
        p = m.node_tree.nodes.get('Principled BSDF')
        if p:
            p.inputs['Roughness'].default_value = max(.45, min(.85, p.inputs['Roughness'].default_value))
            p.inputs['Metallic'].default_value = .65 if m.name == '门把' else 0
            m.diffuse_color = p.inputs['Base Color'].default_value

F = bpy.data.materials['狼毛']
L = bpy.data.materials['狼肚白']
D = bpy.data.materials['狼毛深']
INK = bpy.data.materials['眼睛']
WHITE = bpy.data.materials['高光白']
PINK = bpy.data.materials['耳内粉']
RED = bpy.data.materials['红围巾']
TRIM = bpy.data.materials['白边']
GLASS = bpy.data.materials['玻璃']
gold = bpy.data.materials['门把']
seam = material('围巾缝线', '#ef866b', .82)
scarf_dark = material('围巾褶暗', '#b6372b', .8)
pad = material('肉垫灰粉', '#c89aa7', .8)
grain = material('端面年轮', '#b58551', .8)
endgrain = material('圆木新切面', '#dfb980', .77)
bark = material('圆木外皮', '#ad7e4c', .8)
stone_mats = [material('基础石_%d'%i, c, .83) for i, c in enumerate(['#b9b5a7', '#c8c4b6', '#a7ada7', '#d0caba'])]
steel = material('铁件哑灰', '#586368', .7)
woodlight = material('木边亮色', '#c89760', .78)
leaf_mats = [material('叶团_%d'%i, c, .82) for i, c in enumerate(['#73a852', '#79ad57', '#6ca04d', '#82b65f'])]
for i,c in enumerate(['#6da24c','#77aa52','#679c47']):
    material('灌木%d'%i,c,.82)
print('STAGE 小狼精修',flush=True)

# === 1. 小狼：只改网格，不移动任何动画控制物体。 ===
center = (.85, -2.71, .84)
for o in list(head.children):
    if o.type == 'MESH':
        change_world_mesh(o, center, (1.11, 1.06, 1.07))
        for modifier in o.modifiers:
            if modifier.type == 'BEVEL':
                modifier.segments = min(7, modifier.segments+1)
                if o.name == '头壳':
                    modifier.width = .205
for s, side in ((-1, '左'), (1, '右')):
    ear = bpy.data.objects['耳朵'+side]
    delete_prefix('耳外'+side, '耳内'+side)
    # Soft triangular ears retain both original ear pivots.
    cx = .85+s*.2
    outer = [(cx-.105, -2.73, 1.09), (cx+.105, -2.73, 1.09), (cx+s*.04, -2.71, 1.405),
             (cx-.105, -2.62, 1.09), (cx+.105, -2.62, 1.09), (cx+s*.04, -2.62, 1.405)]
    faces = [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)]
    mesh('耳外'+side, outer, faces, D, .032, ear, 5)
    inner = [(cx-.052, -2.734, 1.14), (cx+.052, -2.734, 1.14), (cx+s*.028, -2.722, 1.327),
             (cx-.052, -2.720, 1.14), (cx+.052, -2.720, 1.14), (cx+s*.028, -2.708, 1.327)]
    mesh('耳内'+side, inner, faces, PINK, .009, ear)
    # Small blended cheek volumes give the silhouette wolf-like fur, not spikes.
    ball('脸颊绒团'+side, (.85+s*.326, -2.950, .765), (.082, .050, .075), F, head, 24, 14)
    ball('脸颊白毛'+side, (.85+s*.285, -3.012, .724), (.075, .030, .052), L, head, 24, 14)
    ball('眉毛'+side, (.85+s*.181, -3.027, 1.063), (.056, .018, .021), D, head)
    eye = bpy.data.objects['眼'+side]
    change_world_mesh(eye, (.85+s*.1776, -3.0227, .9256), (1.16, 1.05, 1.05))
    delete_prefix('眼光'+side)
    ball('眼神主高光'+side, (.85+s*.1776-.014, -3.046, .958), (.022, .011, .026), WHITE, head)
    ball('眼神小高光'+side, (.85+s*.1776+.019, -3.046, .907), (.008, .006, .009), WHITE, head, 12, 8)
    # Tiny freckle stitches on the muzzle.
    for j in range(2):
        ball('吻部毛点'+side, (.85+s*(.075+j*.032), -3.118, .775-j*.015), (.006, .0035, .006), D, head, 10, 6)
ball('鼻尖柔高光', (.832, -3.166, .826), (.019, .006, .008), D, head, 12, 8)
delete_prefix('嘴')
smile=[]
for k in range(17):
    t=k/16
    smile.append((.795+.108*t,-3.14+.010*(2*t-1)**2,.703-.013*math.sin(2*math.pi*t)**2))
tube('微笑嘴线',smile,.0055,INK,head,8)
tube('鼻下线', [(.85, -3.142, .777), (.85, -3.145, .708)], .005, INK, head)
for i, (dx, dy) in enumerate([(-.17, -.2), (.17, -.2), (-.17, .22), (.17, .22)]):
    leg = bpy.data.objects['腿%d'%i]
    x, y = .85+dx, -2.35+dy-.01
    for offset in (-.027, .027):
        tube('爪趾缝', [(x+offset, y-.086, .026), (x+offset, y-.0865, .033), (x+offset, y-.086, .040)], .0025, D, leg, 6)
    # Cushions on soles are part of the model even when not visible in a standing pose.
    ball('脚心肉垫', (x, y, .006), (.037, .044, .008), pad, leg, 12, 6)
    for offset in (-.046, 0, .046):
        ball('脚趾肉垫', (x+offset, y-.051, .007), (.014, .018, .007), pad, leg, 10, 6)
scarf = bpy.data.objects['围巾']
delete_prefix('围巾尾')
ball('围巾软结', (1.106, -2.83, .613), (.078, .065, .063), RED, scarf)
ball('结心褶皱', (1.12, -2.879, .621), (.033, .016, .041), scarf_dark, scarf)
# Sculpted strips with thickness, curved profile and two different hanging ends.
def cloth(name, path, widths, mat):
    verts=[]
    for (x,y,z), w in zip(path, widths):
        verts.extend([(x-w/2,y-.015,z), (x+w/2,y-.015,z), (x-w/2,y+.015,z), (x+w/2,y+.015,z)])
    faces=[(0,2,3,1)]
    for i in range(len(path)-1):
        a=i*4; b=a+4
        faces.extend([(a,a+1,b+1,b),(a+2,b+2,b+3,a+3),(a,b,b+2,a+2),(a+1,a+3,b+3,b+1)])
    a=(len(path)-1)*4
    faces.append((a,a+1,a+3,a+2))
    return mesh(name,verts,faces,mat,.013,scarf)
cloth('围巾长垂角', [(1.108,-2.84,.588),(1.12,-2.882,.515),(1.14,-2.89,.416),(1.176,-2.868,.365)], [.10,.115,.13,.105], RED)
cloth('围巾短垂角', [(1.12,-2.808,.589),(1.187,-2.825,.55),(1.235,-2.813,.474)], [.095,.115,.09], RED)
tube('围巾布边', [(1.076,-2.86,.563),(1.078,-2.902,.51),(1.095,-2.908,.425),(1.134,-2.89,.374)], .004, seam, scarf)
for i in range(4):
    tube('围巾针脚', [(1.144+i*.014,-2.89,.382),(1.146+i*.014,-2.891,.393)], .0024, seam, scarf, 5)

# === 2. 木屋：交错圆木端面、实厚瓦檐、石脚、门窗及烟囱。 ===
print('STAGE 木屋精修',flush=True)
delete_prefix('角柱')
for row in range(8):
    z=.22+1.7/8*(row+.5)
    for sx in (-1,1):
        for sy in (-1,1):
            along_x = row % 2 == 0
            if along_x:
                p=(sx*1.41,sy*1.10,z); rot=(0,math.pi/2,0); face=(sx*1.584,sy*1.10,z)
            else:
                p=(sx*1.4,sy*1.11,z); rot=(math.pi/2,0,0); face=(sx*1.4,sy*1.284,z)
            cyl('交错圆木端',.106,.35,p,bark,hut,rot,24,.018)
            cyl('端面木心',.086,.008,face,endgrain,hut,rot,24,0)
            ringface=(face[0]+sx*.0058,face[1],face[2]) if along_x else (face[0],face[1]+sy*.0058,face[2])
            for radius in (.037,.065):
                torus('端面生长环',ringface,radius,.0025,grain,hut,rot,major=16,minor=4)

delete_prefix('瓦','瓦片','屋脊')
pitch=math.radians(36)
half=1.75
slope=half/math.cos(pitch)
eave=2.02
tile_mats=[material('精修瓦_%d'%i,c,.67) for i,c in enumerate(['#d9553e','#d34c36','#df6046','#cd4d38','#d65a40'])]
fascia=material('厚屋檐陶红','#aa3f2d',.76)
for s in (-1,1):
    box('连续屋顶底板',(slope+.08,3.04,.095),(s*.875,0,eave+slope*.5*math.sin(pitch)-.044),fascia,.027,hut,(0,s*pitch,0))
    box('檐口厚边',(.12,3.09,.13),(s*1.765,0,eave-.055),fascia,.034,hut)
    for y in (-1.5,1.5):
        box('斜屋檐包边',(slope+.1,.095,.13),(s*.875,y,eave+slope*.5*math.sin(pitch)-.028),tile_mats[1],.028,hut,(0,s*pitch,0))
    # Individual low-crowned tiles with half-bond staggering; gaps are actual geometry.
    for row in range(7):
        distance=.14+row*.31
        x=s*(half-distance*math.cos(pitch))
        z=eave+distance*math.sin(pitch)+.035
        offset=.195*(row%2)
        for k in range(-4,5):
            ya=max(-1.44,k*.39+offset-.188)
            yb=min(1.44,k*.39+offset+.188)
            if yb-ya<.06: continue
            y=(ya+yb)/2
            box('错缝圆瓦',(.368,yb-ya,.072),(x,y,z+RNG.uniform(-.005,.005)),tile_mats[RNG.randrange(len(tile_mats))],.027,hut,(0,s*pitch,0),2)
            # A gently raised lip on each shingle catches a narrow soft highlight.
            lipx=x+s*.125*math.cos(pitch)
            lipz=z-.125*math.sin(pitch)+.037
            box('瓦片檐唇',(.042,yb-ya-.025,.023),(lipx,y,lipz),tile_mats[2 if (k+row)%4==0 else 0],.01,hut,(0,s*pitch,0),2)
ridge_z=eave+slope*math.sin(pitch)+.05
for j in range(9):
    cyl('分节圆脊瓦',.115,.35,(0,-1.4+j*.35,ridge_z),tile_mats[j%3],hut,(math.pi/2,0,0),24,.02)

delete_prefix('烟囱','烟囱帽')
mortar=material('烟囱灰缝','#c7a68c',.85)
bricks=[material('烟囱砖色%d'%i,c,.8) for i,c in enumerate(['#b96c50','#c97a57','#ae6048'])]
zbottom=ridge_z-.51
box('烟囱灰缝芯',(.32,.32,.86),(.75,.35,zbottom+.43),mortar,.015,hut)
for row in range(6):
    z=zbottom+.071+row*.143
    if row%2==0:
        for sy in (-1,1):
            box('烟囱长砖',(.36,.172,.131),(.75,.35+sy*.092,z),bricks[row%3],.014,hut)
    else:
        for sx in (-1,1):
            box('烟囱错缝砖',(.172,.36,.131),(.75+sx*.092,.35,z),bricks[row%3],.014,hut)
capz=zbottom+.9
for sy in (-1,1):
    box('烟囱口沿',(.46,.095,.08),(.75,.35+sy*.18,capz),steel,.018,hut)
for sx in (-1,1):
    box('烟囱口沿',(.095,.27,.08),(.75+sx*.18,.35,capz),steel,.018,hut)
box('烟囱内暗腔',(.27,.27,.008),(.75,.35,capz-.028),INK,.002,hut)

# Irregular bevelled blocks replace the continuous-looking stone front.
for o in list(bpy.data.objects):
    if o.name.startswith('墙脚石'):
        bpy.data.objects.remove(o,do_unlink=True)
def stone(name, center, dims, mat):
    x,y,z=center; a,b,c=[q/2 for q in dims]
    verts=[]
    for zz in (-c,c):
        for xx,yy in [(-a,-b),(a,-b),(a,b),(-a,b)]:
            verts.append((x+xx+RNG.uniform(-.013,.013),y+yy+RNG.uniform(-.009,.009),z+zz+RNG.uniform(-.012,.012)))
    return mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,.022,hut)
for sy in (-1,1):
    for k in range(9):
        stone('手作墙脚石',(-1.365+k*.34,sy*1.215,.11),(.325,.14,.19),stone_mats[k%4])
for sx in (-1,1):
    for k in range(7):
        stone('侧墙基础石',(sx*1.49,-1.025+k*.34,.11),(.14,.325,.19),stone_mats[(k+1)%4])

# Door plank seams, small forged hinges and a framed brass handle.
for x in (-.30, -.10, .10, .30):
    box('门板拼缝',(.006,.008,1.10),(x,-1.246,.82),bpy.data.materials['门板格'],.002,hut)
for z in (.42,1.23):
    box('门合页',(.125,.025,.045),(-.304,-1.267,z),steel,.011,hut)
    cyl('合页轴',.016,.075,(-.35,-1.27,z),steel,hut,vertices=12)
    for x in (-.33,-.275):
        ball('合页钉',(x,-1.282,z),(.009,.005,.009),gold,hut,12,6)
cyl('门把底座',.062,.018,(.24,-1.277,.82),gold,hut,(math.pi/2,0,0))
box('门槛踏步',(.88,.32,.075),(0,-1.39,.135),stone_mats[1],.024,hut)
# Narrow louvres fit the established facade spacing.
shutter=material('百叶木蓝灰','#8ca8ae',.76)
for s in (-1,1):
    cx=.92*s
    for dx in (-.375,.375):
        box('百叶侧框',(.10,.055,.55),(cx+dx,-1.26,1.18),woodlight,.012,hut)
        for k in range(6):
            box('窗边百叶',(.083,.05,.055),(cx+dx,-1.296,.96+k*.084),shutter,.01,hut,(.18,0,0))
    # A real ledge below the flower box, plus seams / fastening pegs.
    box('花箱沿',(.72,.19,.034),(cx,-1.315,.861),woodlight,.012,hut)
    for dx in (-.23,0,.23):
        box('花箱拼板缝',(.006,.009,.105),(cx+dx,-1.395,.781),grain,.002,hut)
    for dx in (-.28,.28):
        ball('花箱木钉',(cx+dx,-1.405,.80),(.01,.005,.01),endgrain,hut,10,6)

# Side window breaks up the broad plain side without changing the cabin silhouette.
box('侧窗玻璃',(.035,.64,.56),(1.514,.20,1.20),GLASS,.012,hut)
for z in (.89,1.51):
    box('侧窗横框',(.09,.82,.085),(1.55,.20,z),TRIM,.023,hut)
for y in (-.16,.56):
    box('侧窗竖框',(.09,.08,.62),(1.55,y,1.20),TRIM,.022,hut)
box('侧窗中竖',(.065,.035,.55),(1.565,.20,1.20),TRIM,.01,hut)
box('侧窗中横',(.065,.64,.035),(1.565,.20,1.20),TRIM,.01,hut)
box('侧窗台',(.20,.86,.075),(1.58,.20,.86),woodlight,.025,hut)

# === 3. 小物：盆沿、真实颗粒、浅水波、灯框、栅栏接头及蓬松灌木。 ===
print('STAGE 地块小物精修',flush=True)
bowl=bpy.data.objects['食盆']
torus('食盆圆唇',(-1,-1.75,.148),.225,.028,bpy.data.materials['食盆'],bowl,major=32,minor=8)
torus('食盆底足',(-1,-1.75,.028),.226,.013,grain,bowl,major=28)
food=bpy.data.objects['狗粮']
change_world_mesh(food,(-1,-1.75,.14),(1,1,.5))
for k in range(65):
    a=RNG.random()*math.tau; r=.165*math.sqrt(RNG.random())
    x=-1+math.cos(a)*r; y=-1.75+math.sin(a)*r
    z=.165+.046*math.sqrt(max(0,1-(r/.19)**2))+RNG.uniform(-.006,.006)
    ball('可动画粮粒',(x,y,z),(.027,.023,.021),bpy.data.materials['狗粮'] if k%3 else grain,food,10,6)
# Paw emblem on the bowl's front.
ball('食盆爪印',(-1,-2.006,.08),(.029,.005,.024),TRIM,bowl,12,6)
for dx,dz in [(-.033,.029),(0,.04),(.033,.029)]:
    ball('食盆爪印趾',(-1+dx,-2.004,.08+dz),(.011,.006,.014),TRIM,bowl,10,6)
trough=bpy.data.objects['水槽']
for s in (-1,1):
    box('水槽长圆沿',(.60,.042,.045),(1.3,-1.6+s*.151,.166),bpy.data.materials['水槽'],.018,trough)
    box('水槽短圆沿',(.045,.27,.045),(1.3+s*.277,-1.6,.166),bpy.data.materials['水槽'],.018,trough)
water=bpy.data.objects['水']
water_glint=material('水波浅蓝','#c1eaf2',.46)
for x,y,r in [(1.22,-1.61,.055),(1.40,-1.55,.035)]:
    torus('水面涟漪',(x,y,.162),r,.003,water_glint,water,scale=(1,.72,1),major=24,minor=5)
tube('水面柔亮线',[(1.12,-1.68,.162),(1.17,-1.685,.162),(1.20,-1.68,.162)],.004,water_glint,water)

lamp=bpy.data.objects['灯笼柱']
for dx in (-.101,.101):
    for dy in (-.101,.101):
        box('灯笼框条',(.022,.022,.24),(-.8+dx,-2.9+dy,1.28),steel,.007,lamp)
box('灯笼底座',(.255,.255,.045),(-.8,-2.9,1.147),steel,.014,lamp)
box('灯帽二层',(.21,.21,.065),(-.8,-2.9,1.47),steel,.02,lamp)
ball('灯帽顶珠',(-.8,-2.9,1.526),(.03,.03,.033),gold,lamp,12,8)
cyl('灯杆石座',.11,.11,(-.8,-2.9,.055),stone_mats[2],lamp,vertices=16,bevel=.02)
for x in [-2.6+k*.65 for k in range(9)]:
    if abs(x)<.7: continue
    box('栅栏桩帽',(.14,.14,.055),(x,-3.35,.57),woodlight,.023,plot)
    for z in (.22,.42):
        cyl('栅栏接合木销',.014,.009,(x,-3.389,z),endgrain,plot,(math.pi/2,0,0),12,.002)
    tube('木桩自然纹',[(x+.022,-3.408,.11),(x+.014,-3.408,.23),(x+.027,-3.408,.34),(x+.024,-3.408,.48)],.0023,grain,plot,5)

# Keep the established bushes and enrich their contour with coherent leaf cushions.
for x,y,r in [(-1.75,-1.15,.32),(1.75,-1.2,.30),(-1.9,.9,.3),(1.95,.8,.34)]:
    for k in range(6):
        a=k*math.tau/6
        rad=r*RNG.uniform(.46,.58)
        ball('蓬松叶团',(x+math.cos(a)*r*.60,y+math.sin(a)*r*.55,r*(.95+RNG.uniform(-.12,.35))),
             (rad,rad*.9,rad*.95),leaf_mats[k%3],plot,20,12)

# Three modest decorative groups; entrance, pet and bowls remain unobstructed.
mushroom=material('蘑菇奶红','#da7357',.77)
cream=material('蘑菇奶白','#f2dfb6',.8)
for x,y,h,r in [(-1.97,-1.83,.17,.095),(-1.82,-1.91,.115,.072),(2.09,-.97,.14,.081)]:
    cyl('蘑菇柄',r*.25,h*.65,(x,y,h*.325),cream,plot,vertices=12)
    ball('蘑菇圆帽',(x,y,h*.78),(r,r,r*.52),mushroom,plot,16,8)
    for k in range(3):
        a=k*2.1
        ball('菌盖奶点',(x+math.cos(a)*r*.42,y+math.sin(a)*r*.42,h*.78+r*.44),(.014,.012,.004),cream,plot,10,6)
# A tiny low seed crate beside the rear-left hedge.
for k in range(3):
    for sy in (-1,1):
        box('园艺木箱横板',(.40,.035,.074),(-2.02,-.32+sy*.17,.065+k*.078),woodlight,.01,plot)
    for sx in (-1,1):
        box('园艺木箱端板',(.035,.30,.074),(-2.02+sx*.185,-.32,.065+k*.078),grain,.01,plot)
for sx in (-1,1):
    for sy in (-1,1):
        box('木箱圆角柱',(.045,.045,.27),(-2.02+sx*.19,-.32+sy*.17,.135),endgrain,.012,plot)
for k in range(3):
    ball('木箱种子袋',(-2.13+k*.11,-.32,.18),(.065,.09,.11),cream,plot,12,8)

# A small flower patch beside the right hedge, deliberately outside the path.
flower_colors=[material('小花淡黄','#f3cb65',.7),material('小花奶粉','#e8a3ad',.7),material('小花奶白','#f3efdb',.7)]
for i in range(7):
    x=1.87+RNG.uniform(-.22,.22); y=-1.89+RNG.uniform(-.16,.16); h=RNG.uniform(.1,.22)
    tube('小花茎',[(x,y,.02),(x-.012,y,h)],.008,leaf_mats[2],plot)
    ball('小花叶',(x+.027,y,.07),(.045,.018,.014),leaf_mats[0],plot,10,6)
    for k in range(5):
        a=k*math.tau/5
        ball('花瓣',(x+math.cos(a)*.033,y+math.sin(a)*.033,h),(.024,.024,.012),flower_colors[i%3],plot,10,6)
    ball('花心',(x,y,h+.008),(.017,.017,.013),flower_colors[0],plot,10,6)

# Add tiny companion petals to the existing window-box blossoms.
for o in list(bpy.data.objects):
    if o.name == '花' or o.name.startswith('花.'):
        points=[o.matrix_world@v.co for v in o.data.vertices]
        c=sum(points,Vector())/len(points)
        for k in range(5):
            a=k*math.tau/5
            ball('窗台花瓣',(c.x+math.cos(a)*.034,c.y-.018,c.z+math.sin(a)*.034),(.022,.018,.022),o.data.materials[0],hut,10,6)

# === Technical validation, preview-only stage and exported artifact audit. ===
def check_locked():
    bpy.context.view_layer.update()
    for name, saved in baseline.items():
        o=bpy.data.objects[name]
        for label,matrix in [('world',o.matrix_world),('local',o.matrix_basis)]:
            assert max(abs(matrix[r][c]-saved[label][r][c]) for r in range(4) for c in range(4))<1e-6,(name,label)
        assert (o.parent.name if o.parent else None)==saved['parent'],name
    for name,m in required_materials.items():
        assert bpy.data.materials.get(name)==m,name


def scene_triangles():
    deps=bpy.context.evaluated_depsgraph_get()
    total=0
    for o in bpy.data.objects:
        if o.type=='MESH':
            ev=o.evaluated_get(deps)
            data=ev.to_mesh()
            data.calc_loop_triangles()
            total+=len(data.loop_triangles)
            ev.to_mesh_clear()
    return total


check_locked()
# Budget geometry where a subpixel bevel does not benefit from extra segments.
# The pet and its animation subtree keep their sculpted silhouette precision.
def descendant_of(o,root):
    while o:
        if o==root: return True
        o=o.parent
    return False
for o in bpy.data.objects:
    if descendant_of(o,pet): continue
    for m in o.modifiers:
        if m.type=='BEVEL':
            if o.name.startswith('瓦片檐唇'):
                m.segments=1
            elif o.name.startswith('交错圆木端'):
                m.segments=2
            elif m.width<=.012:
                m.segments=min(m.segments,2)
            elif o.name.startswith(('窗边百叶','花箱拼板缝','园艺木箱')):
                m.segments=min(m.segments,2)
preflight_tris=scene_triangles()
print('REFINED_EVALUATED_TRIANGLES',preflight_tris,flush=True)
assert preflight_tris<=150000,preflight_tris
# Purge any inherited preview objects; all new preview objects are tracked explicitly.
for o in list(bpy.data.objects):
    if o.type in ('CAMERA','LIGHT') or o.name.startswith('预览地面'):
        bpy.data.objects.remove(o,do_unlink=True)
preview=[]
groundmat=material('临时预览草地','#80a96d',.85)
preview.append(box('预览地面',(200,200,.08),(0,0,-.067),groundmat,.01))
bpy.ops.object.camera_add(location=(6.7,-9.8,6.2))
cam=bpy.context.object
cam.name='预览相机'
preview.append(cam)
cam.data.type='ORTHO'
scene.camera=cam

def point_camera(location,target,scale):
    cam.location=location
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=scale

bpy.ops.object.light_add(type='SUN', location=(-3,-4,7))
sun=bpy.context.object
sun.name='预览柔太阳'
sun.rotation_euler=(math.radians(23),math.radians(-28),math.radians(-25))
sun.data.energy=2.1
sun.data.angle=math.radians(18)
sun.data.color=(1,.91,.79)
preview.append(sun)
bpy.ops.object.light_add(type='AREA',location=(-3,-4,6))
soft=bpy.context.object
soft.name='预览天空柔光'
soft.data.energy=350
soft.data.shape='DISK'
soft.data.size=5
soft.rotation_euler=(Vector((0,-1,1))-soft.location).to_track_quat('-Z','Y').to_euler()
preview.append(soft)
world=bpy.data.worlds.new('精修预览天空')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=linear('#c8ddec')
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.48
scene.world=world
scene.render.engine='BLENDER_EEVEE'
scene.eevee.taa_render_samples=96
if hasattr(scene.eevee,'use_gtao'):
    scene.eevee.use_gtao=True
scene.view_settings.view_transform='AgX'
try: scene.view_settings.look='AgX - Medium High Contrast'
except TypeError: pass
scene.view_settings.exposure=.15
scene.render.image_settings.file_format='PNG'
scene.render.resolution_percentage=100
scene.render.film_transparent=False
scene.render.resolution_x,scene.render.resolution_y=1600,1400
point_camera((6.7,-9.8,6.2),(0,-.8,1.22),7.5)
scene.render.filepath=os.path.join(OUT,'preview-front.png')
bpy.ops.render.render(write_still=True)
scene.render.resolution_x,scene.render.resolution_y=1500,1350
point_camera((2.8,-5.8,3.8),(.85,-2.52,.78),2.05)
scene.render.filepath=os.path.join(OUT,'preview-close.png')
bpy.ops.render.render(write_still=True)
scene.camera=None
for o in preview:
    bpy.data.objects.remove(o,do_unlink=True)
# No preview camera/light datablocks or preview ground material in the deliverable.
for data in list(bpy.data.cameras):
    if data.users==0: bpy.data.cameras.remove(data)
for data in list(bpy.data.lights):
    if data.users==0: bpy.data.lights.remove(data)
for data in list(bpy.data.meshes):
    if data.users==0: bpy.data.meshes.remove(data)
if groundmat.users==0: bpy.data.materials.remove(groundmat)
check_locked()
assert not any(o.type in ('LIGHT','CAMERA') or o.name.startswith('预览') for o in bpy.data.objects)
for o in bpy.data.objects:
    if o.type=='MESH':
        for m in o.data.materials:
            assert m.use_nodes
            assert {n.type for n in m.node_tree.nodes} <= {'BSDF_PRINCIPLED','OUTPUT_MATERIAL'},m.name
            p=m.node_tree.nodes.get('Principled BSDF')
            assert .449 <= p.inputs['Roughness'].default_value <= .851,m.name
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'park.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'park.glb'),export_format='GLB',
                          export_apply=True,export_yup=True,export_cameras=False,export_lights=False,
                          export_extras=False)
with open(os.path.join(OUT,'park.glb'),'rb') as f:
    magic,version,length=struct.unpack('<4sII',f.read(12))
    assert magic==b'glTF' and version==2
    json_length,json_type=struct.unpack('<II',f.read(8))
    document=json.loads(f.read(json_length))
def mesh_tris(index):
    total=0
    for primitive in document['meshes'][index]['primitives']:
        assert primitive.get('mode',4)==4
        accessor=primitive.get('indices',primitive['attributes']['POSITION'])
        total+=document['accessors'][accessor]['count']//3
    return total
triangles=sum(mesh_tris(n['mesh']) for n in document['nodes'] if 'mesh' in n)
assert triangles<=150000,triangles
nodes={n['name']:n for n in document['nodes'] if 'name' in n}
assert all(n in nodes for n in LOCKED)
assert not document.get('cameras')
assert not any('KHR_lights_punctual' in n.get('extensions',{}) for n in document['nodes'])
assert not document.get('textures') and not document.get('images')
assert {'玻璃','灯芯'} <= {m['name'] for m in document['materials']}
report={'glb_triangles':triangles,'triangle_limit':150000,'objects':len(bpy.data.objects),
        'protected_transforms':baseline,'protected_transforms_unchanged':True,
        'no_preview_objects':True,'no_textures':True,'export_apply':True,'export_yup':True,
        'roughness_range':[.45,.85], 'seed':709,
        'previews':['preview-front.png','preview-close.png']}
with open(os.path.join(OUT,'validation.json'),'w') as f:
    json.dump(report,f,ensure_ascii=False,indent=2)
print('EXPORTED_GLB_TRIANGLES',triangles,flush=True)
print('VALIDATED: protected names + local/world matrices + parents; material names; no preview props; constant PBR; Y up.',flush=True)
print('完成',OUT,flush=True)
