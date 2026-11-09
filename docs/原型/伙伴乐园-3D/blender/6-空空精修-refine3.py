"""空空：保留基础模型与六个动画支点的原创玩具角色精修。

Blender -b out/kong/kong.blend --python refine3.py -- out/kong-refined
All geometry/materials authored locally; previews are removed before export.
"""
import bpy
import math
import os
import sys
import json
import struct
import bmesh
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else os.path.join(ROOT, 'out/kong-refined')
assert os.path.commonpath((ROOT, OUT)) == ROOT
os.makedirs(OUT, exist_ok=True)
# Always begin with the original asset: reruns cannot accumulate detail.
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT, 'out/kong/kong.blend'))
scene = bpy.context.scene
bpy.context.view_layer.update()
LOCKED = ['空空', '空空/头', '空空/左臂', '空空/右臂', '空空/左腿', '空空/右腿']

def transform(o):
    return {'world': [list(r) for r in o.matrix_world], 'local': [list(r) for r in o.matrix_basis],
            'inverse': [list(r) for r in o.matrix_parent_inverse],
            'parent': o.parent.name if o.parent else None}

baseline = {n: transform(bpy.data.objects[n]) for n in LOCKED}
root, head = bpy.data.objects['空空'], bpy.data.objects['空空/头']
expected_parents = {}

def linear(h):
    vals = [int(h.lstrip('#')[i:i+2], 16)/255 for i in (0, 2, 4)]
    return [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in vals]+[1]

def material(name, color, rough=.7, metal=0, emit=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = linear(color)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emit:
        p.inputs['Emission Color'].default_value = linear(emit)
        p.inputs['Emission Strength'].default_value = .8
    m.diffuse_color = linear(color)
    return m

def parent_world(o, p):
    if p:
        bpy.context.view_layer.update()
        mw = o.matrix_world.copy()
        o.parent = p
        o.matrix_parent_inverse = p.matrix_world.inverted()
        o.matrix_world = mw
        expected_parents[o.name] = p.name
    return o

def finish(o, name, mat, bevel=0, seg=3, parent=None):
    o.name = name
    if mat: o.data.materials.append(mat)
    if bevel:
        b = o.modifiers.new('玩具圆角', 'BEVEL')
        b.width, b.segments = bevel, seg
        b.limit_method = 'ANGLE'
        n = o.modifiers.new('柔和平面法线', 'WEIGHTED_NORMAL')
        n.keep_sharp = True
    for f in o.data.polygons: f.use_smooth = True
    return parent_world(o, parent)

def box(name, size, loc, mat, bevel=.02, parent=None, rot=(0,0,0), seg=3):
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

def mesh(name, verts, faces, mat, parent=None, bevel=0, seg=3):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    o = bpy.data.objects.new(name, data)
    scene.collection.objects.link(o)
    return finish(o, name, mat, bevel, seg, parent)

def tube(name, points, radius, mat, parent=None, sides=8, radii=None):
    pts = [Vector(p) for p in points]
    verts, faces = [], []
    previous_a=None
    for i,p in enumerate(pts):
        t = (pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
        if previous_a is None:
            ref = Vector((0,0,1)) if abs(t.z)<.9 else Vector((1,0,0))
            a = t.cross(ref).normalized()
        else:
            # Parallel transport avoids the visible twist from changing reference axes.
            a = (previous_a-t*previous_a.dot(t)).normalized()
        previous_a=a
        b = t.cross(a).normalized()
        r = radii[i] if radii else radius
        for k in range(sides):
            angle = k*math.tau/sides
            verts.append(tuple(p+r*(math.cos(angle)*a+math.sin(angle)*b)))
    for i in range(len(pts)-1):
        for k in range(sides):
            j=(k+1)%sides
            faces.append((i*sides+k,i*sides+j,(i+1)*sides+j,(i+1)*sides+k))
    faces += [tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+k for k in range(sides))]
    return mesh(name,verts,faces,mat,parent)

def ribbon(name, path, widths, mat, parent, thickness=.022, bevel=.006):
    """Continuous thick cloth, width in X, normal following the YZ path."""
    pts=[Vector(p) for p in path]
    verts,faces=[],[(0,2,3,1)]
    for i,(p,w) in enumerate(zip(pts,widths)):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
        normal=Vector((0,-tangent.z,tangent.y)).normalized()*thickness/2
        for side,depth in [(-1,-1),(1,-1),(-1,1),(1,1)]:
            verts.append(tuple(p+Vector((side*w/2,0,0))+depth*normal))
    for i in range(len(pts)-1):
        a=i*4; b=a+4
        faces.extend([(a,a+1,b+1,b),(a+2,b+2,b+3,a+3),(a,b,b+2,a+2),(a+1,a+3,b+3,b+1)])
    a=(len(pts)-1)*4
    faces.append((a,a+1,a+3,a+2))
    return mesh(name,verts,faces,mat,parent,bevel,3)

def outline(name, xz, y, depth, mat, parent, bevel=.02):
    n=len(xz)
    verts=[(x,y+d,z) for d in (-depth/2,depth/2) for x,z in xz]
    faces=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,mat,parent,bevel,4)

def delete(*prefixes):
    for o in list(bpy.data.objects):
        if any(o.name==n or o.name.startswith(n+'.') for n in prefixes):
            assert o.name not in LOCKED
            bpy.data.objects.remove(o,do_unlink=True)

def reshape(name, size, center):
    """Reshape original un-applied cube mesh, preserving its object and parent."""
    o=bpy.data.objects[name]
    bpy.context.view_layer.update()
    inv=o.matrix_world.inverted()
    coords=[o.matrix_world@v.co for v in o.data.vertices]
    mn=Vector(tuple(min(v[i] for v in coords) for i in range(3)))
    mx=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
    mid=(mn+mx)/2
    for v,p in zip(o.data.vertices,coords):
        v.co=inv@(Vector(center)+Vector(tuple((p[i]-mid[i])*size[i]/(mx[i]-mn[i]) for i in range(3))))
    return o

# Constant PBR only, including existing materials.
for m in bpy.data.materials:
    if m.use_nodes:
        p=m.node_tree.nodes.get('Principled BSDF')
        if p: p.inputs['Roughness'].default_value=max(.45,min(.85,p.inputs['Roughness'].default_value))
skin=material('皮肤','#efc99a',.64)
hair=material('头发','#553629',.67)
hair_light=material('发块暖棕','#644232',.69)
hair_mid=material('发块中棕','#5c3b2c',.7)
green=material('上衣绿','#6d9c50',.8)
green_dark=material('上衣绿深','#4d7540',.8)
green_trim=material('罗纹浅绿','#86ad64',.8)
blue=material('裤子蓝','#466caf',.78)
blue_trim=material('裤脚蓝','#7394c6',.8)
blue_seam=material('裤线蓝','#557caf',.81)
shoe=material('鞋','#574036',.68)
sole=material('鞋底','#312d2b',.76)
cream=material('奶油棉线','#e7d6af',.8)
red=material('围巾红','#c34d42',.8)
red_light=material('围巾罗纹','#d56757',.82)
red_dark=material('围巾褶色','#a83f37',.82)
pack=material('背包','#ae7a47',.77)
pack_lid=material('背包盖','#8b5e38',.73)
pack_edge=material('背包包边','#c29560',.8)
strapmat=material('肩带皮革','#875735',.75)
gold=material('黄铜小件','#b6a06a',.49,.65)
metal=material('灯架金属','#596b62',.56,.55)
glass=material('玻璃','#b4d4c9',.45)
wick=material('灯芯','#ffe6a2',.5,emit='#ffd082')
ink=material('眼睛','#242e30',.45)
iris=material('眼底暖棕','#58605b',.55)
white=material('高光白','#fff6de',.45)
blush=material('脸红空空','#e9a3a0',.8)
mouth=material('嘴','#8b5144',.75)

# 1. Retain the original head/body meshes, broaden the toy head without moving pivots.
reshape('头',(.70,.60,.61),(0,-.012,1.595))
o=reshape('头发',(.72,.62,.17),(0,.01,1.830))
for mod in o.modifiers:
    if mod.type=='BEVEL': mod.width=.078; mod.segments=5
reshape('后脑发',(.68,.15,.34),(0,.235,1.695))
delete('刘海','鬓角','呆毛','眼','眼光','脸红','嘴')
# Three broad curved crown locks cover the old cap with gently staggered ridges.
# Each is a closed mesh; all crown vertices stay at or below the original 1.94m.
for i,(cx,width,lift) in enumerate([(-.229,.235,.069),(-.010,.268,.080),(.217,.253,.070)]):
    verts=[]; faces=[]; rows=17; cols=13
    for j in range(rows):
        t=j/(rows-1); y=.285-.565*t
        for k in range(cols):
            u=k/(cols-1)
            x=cx+(u-.5)*width+.010*math.sin(math.pi*t)*(i-1)
            z=1.823+lift*math.sin(math.pi*u)**.55+.037*math.sin(math.pi*t)
            z-=.055*(2*t-1)**4
            verts.append((x,y,z))
    for j in range(rows-1):
        for k in range(cols-1):
            a=j*cols+k
            faces.append((a,a+1,a+1+cols,a+cols))
    boundary=list(range(cols))+[j*cols+cols-1 for j in range(1,rows)]+list(range((rows-1)*cols+cols-2,(rows-1)*cols-1,-1))+[j*cols for j in range(rows-2,0,-1)]
    bottom=len(verts)
    verts.extend([(verts[index][0],verts[index][1],1.76) for index in boundary])
    for k,index in enumerate(boundary):
        nxt=(k+1)%len(boundary)
        faces.append((index,boundary[nxt],bottom+nxt,bottom+k))
    faces.append(tuple(reversed(range(bottom,len(verts)))))
    mesh('精修/头顶弧面发块%d'%i,verts,faces,[hair_mid,hair_light,hair][i],head)
# Large interlocking, bevelled locks: broad roots, tapered tips, unequal lengths.
locks=[
    ([(-.32,1.86),(-.16,1.91),(-.08,1.85),(-.11,1.77),(-.23,1.70),(-.29,1.72)],-.281,.085,hair_mid),
    ([(-.18,1.90),(.035,1.923),(.09,1.865),(.025,1.76),(-.075,1.69),(-.105,1.735)],-.310,.09,hair_light),
    ([(.035,1.917),(.22,1.89),(.29,1.82),(.245,1.735),(.18,1.69),(.145,1.78)],-.300,.085,hair_mid),
    ([(.22,1.87),(.324,1.82),(.345,1.69),(.29,1.64),(.26,1.73)],-.235,.085,hair),
]
for i,(polygon,y,depth,m) in enumerate(locks): outline('精修/刘海发束%d'%i,polygon,y,depth,m,head,.026)
for s,side in [(-1,'左'),(1,'右')]:
    # Narrow sideburn hugs the skin; no outward shelf.
    yz=[(-.165,1.795),(.045,1.785),(.033,1.660),(-.060,1.540),(-.116,1.560),(-.151,1.660)]
    verts=[(s*x,y,z) for x in (.338,.369) for y,z in yz]
    n=len(yz)
    faces=[tuple(reversed(range(n))),tuple(n+j for j in range(n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
    mesh('精修/贴脸鬓角'+side,verts,faces,hair,head,.013,4)
    ball('精修/耳朵'+side,(s*.347,-.005,1.505),(.047,.049,.068),skin,head)
    ball('精修/耳内'+side,(s*.371,-.038,1.507),(.016,.012,.034),blush,head,12,8)
    for j in range(2):
        offset=.035 if s==1 else 0
        outline('精修/后发分束'+side+str(j),[(s*x,z+offset) for x,z in [(.025+j*.12,1.81),(.18+j*.1,1.80),(.24+j*.075,1.61),(.17+j*.085,1.48+j*.045),(.10+j*.09,1.51+j*.045)]],.298,.066,hair_mid if j==0 else hair,head,.027)
    x=s*.145
    box('精修/眼'+side,(.084,.034,.121),(x,-.317,1.579),ink,.035,head,seg=5)
    ball('精修/眼底'+side,(x+.008,-.335,1.548),(.024,.005,.019),iris,head,16,8)
    ball('精修/眼主高光'+side,(x-.014,-.339,1.609),(.018,.009,.022),white,head,16,10)
    ball('精修/眼次高光'+side,(x+.017,-.340,1.559),(.007,.005,.008),white,head,12,8)
    pts=[(x-.035+.07*t/8,-.318,1.693+.009*math.sin(math.pi*t/8)) for t in range(9)]
    tube('精修/眉毛'+side,pts,.009,hair,head,8)
    ball('精修/柔红脸颊'+side,(s*.239,-.302,1.491),(.051,.009,.029),blush,head,20,12)
    for j in range(2):
        ball('精修/脸颊小点'+side+str(j),(s*(.226+j*.018),-.312,1.493),(.0035,.002,.0035),red_light,head,8,6)
ball('精修/小鼻子',(0,-.321,1.529),(.021,.016,.018),skin,head,16,10)
tube('精修/小微笑',[(-.038+.076*t/14,-.317,1.463-.012*math.sin(math.pi*t/14)) for t in range(15)],.006,mouth,head,8)
# One tapered, bent cowlick, not multiple spikes.
curl=[]; radii=[]
for i in range(23):
    t=i/22
    curl.append((.045+.103*math.sin(t*math.pi*.89),.035+.018*t,1.910+.201*t-.032*t*t))
    radii.append(.021*(1-t)+.0025*t)
tube('精修/弯弯呆毛',curl,.02,hair_mid,head,10,radii)

# 2. Clothing edge layers and mitten hands.
delete('腰带','围巾尾','手臂','小灯')
reshape('衣摆',(.52,.33,.075),(0,0,.747))
box('精修/衣摆包边',(.523,.333,.026),(0,0,.720),green_trim,.012,root)
box('精修/领口',(.26,.24,.065),(0,-.013,1.285),green_dark,.028,root)
box('精修/领口包边',(.275,.25,.022),(0,-.013,1.310),green_trim,.010,root)
for i in range(13):
    x=-.218+i*.036
    tube('精修/下摆罗纹',[(x,-.164,.731),(x,-.164,.765)],.0026,green_trim,root,5)
for s,side in [(-1,'左'),(1,'右')]:
    arm=bpy.data.objects['空空/'+side+'臂']
    leg=bpy.data.objects['空空/'+side+'腿']
    x=s*.33
    box('精修/袖口'+side,(.167,.191,.062),(x,0,.975),green_dark,.024,arm,seg=4)
    box('精修/袖口包边'+side,(.17,.194,.024),(x,-.001,.950),green_trim,.010,arm)
    box('精修/手腕'+side,(.113,.125,.060),(x,-.002,.915),skin,.024,arm,seg=4)
    box('精修/连指小手'+side,(.145,.157,.157),(x,-.012,.838),skin,.060,arm,seg=5)
    ball('精修/拇指'+side,(x-s*.061,-.058,.862),(.036,.043,.048),skin,arm,16,10)
    tube('精修/手指弯线'+side,[(x-.033,-.091,.817),(x,-.094,.811),(x+.033,-.091,.817)],.0025,mouth,arm,6)
    # Keep the original shoe sole at exactly z=0.
    shoe_name='鞋' if s==-1 else '鞋.001'
    reshape(shoe_name,(.22,.35,.115),(s*.12,-.065,.085))
    box('精修/鞋底'+side,(.229,.365,.037),(s*.12,-.069,.0185),sole,.015,leg,seg=4)
    box('精修/鞋沿'+side,(.226,.360,.020),(s*.12,-.070,.047),pack_edge,.009,leg)
    box('精修/鞋舌'+side,(.094,.110,.020),(s*.12,-.151,.143),shoe,.009,leg)
    for j in range(3):
        box('精修/鞋带块'+side+str(j),(.090,.016,.016),(s*.12,-.182+j*.024,.157),cream,.007,leg)
    box('精修/裤脚卷边'+side,(.21,.234,.059),(s*.12,0,.170),blue_trim,.025,leg,seg=4)
    tube('精修/卷边缝线'+side,[(s*.12-.073,-.118,.176),(s*.12+.073,-.118,.176)],.0025,cream,leg,6)
    tube('精修/裤缝'+side,[(s*.12+s*.071,-.102,.235),(s*.12+s*.076,-.102,.45),(s*.12+s*.07,-.1,.65)],.003,blue_seam,leg,6)
    # Short fold at the ankle, no realistic anatomy.
    tube('精修/裤脚小褶'+side,[(s*.12-.04,-.110,.225),(s*.12+.015,-.113,.218),(s*.12+.045,-.109,.225)],.004,blue_trim,leg,6)

# A softly gathered scarf collar, knot, two separately readable ends.
reshape('围巾',(.57,.39,.109),(0,-.008,1.302))
box('精修/围巾下层',(.546,.395,.035),(0,-.014,1.272),red_dark,.015,root)
for i in range(17):
    x=-.226+i*.028
    tube('精修/围巾领罗纹',[(x,-.207,1.286),(x+.003,-.207,1.322)],.0028,red_light,root,5)
ball('精修/围巾软结',(.145,-.227,1.277),(.070,.048,.058),red,root,20,12)
tube('精修/结心褶',[(.135,-.274,1.309),(.127,-.279,1.279),(.139,-.271,1.247)],.005,red_dark,root,7)
path1=[(.139,-.224,1.25),(.146,-.228,1.19),(.143,-.225,1.10),(.156,-.221,1.024),(.174,-.227,.995)]
path2=[(.18,-.218,1.255),(.219,-.217,1.204),(.243,-.207,1.148),(.258,-.202,1.12)]
ribbon('精修/围巾长垂角',path1,[.094,.098,.104,.102,.09],red,root,.032,.010)
ribbon('精修/围巾短垂角',path2,[.075,.085,.087,.073],red,root,.028,.009)
for path in (path1,path2):
    for a,b in zip(path[:-1],path[1:]):
        for t in (.28,.7):
            x,y,z=[a[k]*(1-t)+b[k]*t for k in range(3)]
            tube('精修/围巾分段针织',[(x-.028,y-.018,z),(x+.028,y-.018,z+.003)],.0026,red_light,root,5)
    x,y,z=path[-1]
    for j in range(4):
        tube('精修/围巾短流苏',[(x-.03+j*.02,y,z+.007),(x-.027+j*.02,y-.003,z-.016)],.004,red_light,root,6)

# 3. Backpack: padded rim, shaped flap, straps, brass clasp and compact side lamp.
reshape('背包',(.40,.19,.44),(0,.238,1.019))
reshape('背包盖',(.421,.212,.145),(0,.246,1.203))
box('精修/背包后袋',(.282,.058,.165),(0,.353,.924),pack_lid,.026,root,seg=4)
box('精修/后袋翻边',(.295,.065,.035),(0,.358,1.010),pack_edge,.015,root)
for s in (-1,1):
    tube('精修/背包立边',[(s*.17,.314,.854),(s*.187,.321,.91),(s*.187,.321,1.10),(s*.17,.327,1.18)],.006,pack_edge,root,8)
    for j in range(6):
        z=.88+j*.045
        tube('精修/背包针脚',[(s*.173,.334,z),(s*.173,.334,z+.012)],.0023,cream,root,5)
    path=[(s*.16,.245,1.20),(s*.185,.16,1.275),(s*.19,.05,1.298),(s*.195,-.07,1.277),
          (s*.196,-.153,1.220),(s*.199,-.174,1.12),(s*.204,-.175,.99),
          (s*.241,-.10,.88),(s*.242,.07,.867),(s*.19,.24,.885)]
    ribbon('精修/连续肩带'+str(s),path,[.049]*len(path),strapmat,root,.020,.006)
    tube('精修/肩带压边'+str(s),[(x-s*.016,y-.013,z) for x,y,z in path[3:7]],.0025,pack_edge,root,6)
    box('精修/肩带调节扣'+str(s),(.059,.028,.053),(s*.202,-.188,1.046),gold,.006,root)
    box('精修/肩带扣穿带'+str(s),(.034,.014,.040),(s*.202,-.207,1.046),strapmat,.005,root)
box('精修/翻盖扣带',(.071,.025,.22),(0,.366,1.134),strapmat,.012,root,seg=4)
box('精修/背包搭扣',(.095,.025,.068),(0,.387,1.102),gold,.010,root,seg=4)
box('精修/搭扣内皮',(.060,.012,.038),(0,.405,1.102),pack_lid,.007,root)
box('精修/搭扣舌',(.012,.014,.044),(0,.414,1.108),gold,.004,root)
for j in range(3):
    ball('精修/皮带孔',(0,.381,1.175+j*.020),(.004,.003,.004),shoe,root,8,6)
handle=[(-.067,.25,1.269),(-.058,.26,1.324),(-.033,.26,1.346),(.033,.26,1.346),(.058,.26,1.324),(.067,.25,1.269)]
tube('精修/背包提手',handle,.012,strapmat,root,8)
# Simple leaf badge: original park identity, deliberately only one graphic accent.
ball('精修/背包布章',(0,.387,.931),(.049,.007,.041),green_dark,root,20,12)
ball('精修/布章小叶',(-.009,.396,.937),(.012,.004,.024),green_trim,root,12,8)
tube('精修/布章叶梗',[(-.01,.400,.923),(.014,.400,.952)],.0025,cream,root,6)

lx,ly,lz=.296,.285,.955
tube('精修/小灯挂带',[(.19,.26,1.147),(.253,.27,1.14),(.296,.285,1.084)],.012,strapmat,root,8)
tube('精修/小灯提环',[(lx-.027,ly,lz+.086),(lx-.026,ly,lz+.121),(lx,ly,lz+.139),(lx+.026,ly,lz+.121),(lx+.027,ly,lz+.086)],.006,gold,root,8)
box('精修/灯底座',(.132,.123,.029),(lx,ly,lz-.078),metal,.013,root)
box('精修/灯顶帽',(.137,.127,.034),(lx,ly,lz+.078),metal,.014,root)
box('精修/灯顶黄铜沿',(.120,.113,.012),(lx,ly,lz+.057),gold,.005,root)
for sx in (-1,1):
    for sy in (-1,1):
        box('精修/灯罩金属框',(.012,.012,.139),(lx+sx*.050,ly+sy*.046,lz),metal,.005,root)
# Stylized glass at side edges only: no alpha/transmission channels or hidden bulb.
for sx in (-1,1):
    box('精修/玻璃侧片',(.010,.075,.119),(lx+sx*.044,ly,lz),glass,.004,root)
box('精修/玻璃后片',(.081,.008,.119),(lx,ly-.042,lz),glass,.003,root)
box('精修/暖灯芯',(.051,.053,.092),(lx,ly+.006,lz),wick,.021,root,seg=4)
box('精修/玻璃高光条',(.009,.009,.092),(lx-.027,ly+.048,lz+.005),glass,.004,root)

# All authored components are closed solids. Correct winding also after mirrored
# side geometry so shading and single-sided glTF rendering agree.
for o in root.children_recursive:
    if o.type!='MESH': continue
    bm=bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(o.data)
    bm.free()

def check_model():
    bpy.context.view_layer.update()
    for name,t in baseline.items():
        assert transform(bpy.data.objects[name])==t,('protected transform',name)
    for name,parent in expected_parents.items():
        assert bpy.data.objects[name].parent.name==parent,(name,parent)
    deps=bpy.context.evaluated_depsgraph_get()
    tris=0; bounds=[]; no_curl=[]
    for o in root.children_recursive:
        if o.type!='MESH': continue
        ev=o.evaluated_get(deps); data=ev.to_mesh(); data.calc_loop_triangles()
        tris+=len(data.loop_triangles)
        points=[ev.matrix_world@v.co for v in data.vertices]
        bounds.extend(points)
        if o.name!='精修/弯弯呆毛': no_curl.extend(points)
        ev.to_mesh_clear()
    minimum=min(p.z for p in bounds); maximum=max(p.z for p in no_curl)
    assert abs(minimum)<1e-6,minimum
    assert 1.935<=maximum<=1.95,maximum
    assert tris<=40000,tris
    return tris,minimum,maximum,max(p.z for p in bounds)

tris,zmin,zmax,curltop=check_model()
print('PREFLIGHT_TRIANGLES',tris,'HEIGHT_NO_COWLICK',zmax,flush=True)

# 4. Eevee + AgX self-review. Every preview object is deleted before saving.
preview=[]
preview_mat=material('临时预览地面','#c6cfbf',.85)
preview.append(box('预览地面',(200,200,.06),(0,0,-.032),preview_mat,.01))
bpy.ops.object.camera_add()
cam=bpy.context.object; cam.name='预览相机'; cam.data.type='ORTHO'
cam.data.ortho_scale=2.53; scene.camera=cam; preview.append(cam)
for name,loc,energy,size,color in [
    ('预览主光',(-3,-4,6),430,4.0,(1,.88,.75)),
    ('预览补光',(3,-2,3),160,3.5,(.78,.87,1)),
    ('预览轮廓光',(1,4,5),480,3.0,(1,.93,.80))]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object; o.name=name; o.data.energy=energy; o.data.shape='DISK'; o.data.size=size; o.data.color=color
    o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler(); preview.append(o)
world=bpy.data.worlds.new('柔和预览天空'); world.use_nodes=True; scene.world=world
world.node_tree.nodes['Background'].inputs['Color'].default_value=linear('#d7e1ee')
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.38
scene.render.engine='BLENDER_EEVEE'
scene.eevee.taa_render_samples=96
if hasattr(scene.eevee,'use_gtao'): scene.eevee.use_gtao=True
scene.view_settings.view_transform='AgX'
try: scene.view_settings.look='AgX - Medium High Contrast'
except TypeError: pass
scene.view_settings.exposure=.15
scene.render.resolution_x=1100; scene.render.resolution_y=1200
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
for name,loc in [('preview-front.png',(-3.1,-6,3.05)),('preview-back.png',(3.5,5.8,3.0))]:
    cam.location=loc
    cam.rotation_euler=(Vector((0,0,1.04))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(OUT,name)
    bpy.ops.render.render(write_still=True)
scene.camera=None
for o in preview: bpy.data.objects.remove(o,do_unlink=True)
for collection in (bpy.data.meshes,bpy.data.cameras,bpy.data.lights,bpy.data.materials):
    for data in list(collection):
        if data.users==0: collection.remove(data)
check_model()
assert all(o.type not in ('LIGHT','CAMERA') and not o.name.startswith('预览') for o in bpy.data.objects)
for o in bpy.data.objects:
    if o.type=='MESH':
        assert o.parent is not None,o.name
        for m in o.data.materials:
            assert {n.type for n in m.node_tree.nodes}<={'BSDF_PRINCIPLED','OUTPUT_MATERIAL'},m.name
            p=m.node_tree.nodes['Principled BSDF']
            assert .449<=p.inputs['Roughness'].default_value<=.851,m.name
            assert p.inputs['Transmission Weight'].default_value==0
            assert p.inputs['Alpha'].default_value==1
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'kong.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'kong.glb'),export_format='GLB',
                          export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
with open(os.path.join(OUT,'kong.glb'),'rb') as f:
    magic,version,length=struct.unpack('<4sII',f.read(12)); assert magic==b'glTF' and version==2
    size,kind=struct.unpack('<II',f.read(8)); assert kind==0x4e4f534a
    doc=json.loads(f.read(size))
export_tris=0
for n in doc['nodes']:
    if 'mesh' not in n: continue
    for p in doc['meshes'][n['mesh']]['primitives']:
        assert p.get('mode',4)==4
        export_tris+=doc['accessors'][p.get('indices',p['attributes']['POSITION'])]['count']//3
assert export_tris<=40000,export_tris
assert export_tris==tris,(export_tris,tris)
assert set(LOCKED)<={n.get('name') for n in doc['nodes']}
assert {'灯芯','玻璃'}<={m['name'] for m in doc['materials']}
assert not doc.get('textures') and not doc.get('images') and not doc.get('cameras')
assert 'KHR_lights_punctual' not in doc.get('extensionsUsed',[])
report={'glb_triangles':export_tris,'limit':40000,'protected_transforms':baseline,
        'protected_transforms_unchanged':True,'expected_parents':expected_parents,
        'foot_z':zmin,'height_without_cowlick':zmax,'height_with_cowlick':curltop,
        'no_preview_objects':True,'no_textures':True,'export_apply':True,'export_yup':True,
        'preview_engine':'Eevee','view_transform':'AgX','roughness_range':[.45,.85],
        'previews':['preview-front.png','preview-back.png']}
with open(os.path.join(OUT,'validation.json'),'w') as f: json.dump(report,f,ensure_ascii=False,indent=2)
print('EXPORTED_GLB_TRIANGLES',export_tris,flush=True)
print('VALIDATED: six pivots unchanged; parenting; foot z=0; original 1.94m height; Y up; constant PBR; no preview props.',flush=True)
