"""Refine the existing park2 scene, offline, with immutable wolf and layout.

Blender -b out/big/park2.blend --python refine2.py -- out/big-refined
Only constant Principled materials and real meshes. Preview props never exported.
"""
import bpy, math, os, sys, json, struct, hashlib, random
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else os.path.join(ROOT,'out/big-refined')
assert os.path.commonpath((ROOT, OUT)) == ROOT
os.makedirs(OUT, exist_ok=True)
if '地块-熊猫' not in bpy.data.objects:
    bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'out/big/park2.blend'))
scene = bpy.context.scene
bpy.context.view_layer.update()
RNG = random.Random(817)
TAU = math.tau
FRAME = Matrix.Identity(4)
wolf = bpy.data.objects['地块-小狼']
wolf_objects = {o.name for o in [wolf]+list(wolf.children_recursive)}
wolf_mats = {m for o in [wolf]+list(wolf.children_recursive) if o.type=='MESH' for m in o.data.materials if m}
layout_path = os.path.join(ROOT,'out/big/layout.json')
layout_hash = hashlib.sha256(open(layout_path,'rb').read()).hexdigest()
LOCK = [o.name for o in bpy.data.objects if o.parent is None]
for who in ('小狼','熊猫','美西螈'):
    LOCK += [who] + [who+'/'+p for p in ('头','耳朵左','耳朵右','尾巴','狗粮','水','食盆','水槽')]

def transform(o):
    return {'world':[list(r) for r in o.matrix_world], 'local':[list(r) for r in o.matrix_basis],
            'inverse':[list(r) for r in o.matrix_parent_inverse], 'parent':o.parent.name if o.parent else None}

baseline = {n:transform(bpy.data.objects[n]) for n in LOCK}

def wolf_hash():
    """Hash actual geometry, smooth flags, hierarchy, transforms, modifiers and materials."""
    h=hashlib.sha256()
    def add(x): h.update(repr(x).encode())
    for n in sorted(wolf_objects):
        o=bpy.data.objects[n]; add((n,o.type,transform(o),o.hide_render,o.hide_viewport))
        if o.type=='MESH':
            add([(tuple(v.co)) for v in o.data.vertices])
            add([(tuple(p.vertices),p.material_index,p.use_smooth) for p in o.data.polygons])
            add([m.name if m else None for m in o.data.materials])
        for mod in o.modifiers:
            vals=[]
            for prop in mod.bl_rna.properties:
                if prop.type in {'BOOLEAN','INT','FLOAT','STRING','ENUM'} and prop.identifier!='rna_type':
                    v=getattr(mod,prop.identifier)
                    vals.append((prop.identifier,tuple(v) if getattr(prop,'is_array',False) else v))
            add((mod.type, vals))
    for m in sorted(wolf_mats,key=lambda x:x.name):
        add((m.name,tuple(m.diffuse_color)))
        if m.use_nodes:
            for n in m.node_tree.nodes:
                add((n.name,n.type))
                for s in n.inputs:
                    if hasattr(s,'default_value'):
                        v=s.default_value
                        add((s.name,tuple(v) if hasattr(v,'__len__') else v))
    return h.hexdigest()

wolf_before=wolf_hash()

def lin(h):
    a=[int(h.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a]+[1]

def mat(name, color, rough=.72, metal=0, emit=None, strength=1.0):
    m=bpy.data.materials.new('精修2/'+name); m.use_nodes=True
    p=m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=lin(color)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    if emit:
        p.inputs['Emission Color'].default_value=lin(emit)
        p.inputs['Emission Strength'].default_value=strength
    m.diffuse_color=lin(color)
    return m

# Never edit a material used by the wolf, even when another plot shares it.
copies={}
for o in list(bpy.data.objects):
    if o.name in wolf_objects or o.type!='MESH': continue
    for slot in o.material_slots:
        m=slot.material
        if not m or not m.use_nodes: continue
        p=m.node_tree.nodes.get('Principled BSDF')
        if not p: continue
        r=p.inputs['Roughness'].default_value
        if not .45<=r<=.85:
            if m in wolf_mats:
                if m.name not in copies: copies[m.name]=m.copy()
                slot.material=copies[m.name]; m=slot.material; p=m.node_tree.nodes.get('Principled BSDF')
            p.inputs['Roughness'].default_value=max(.45,min(.85,r))

def frame(root=None):
    global FRAME
    FRAME = root.matrix_world.copy() if root else Matrix.Identity(4)

def mesh(name, verts, faces, material, parent, loc=(0,0,0), rot=(0,0,0), bevel=0, seg=2, smooth=True):
    d=bpy.data.meshes.new('R2/'+name); d.from_pydata(verts,[],faces); d.update()
    o=bpy.data.objects.new('R2/'+name,d); scene.collection.objects.link(o)
    if material: d.materials.append(material)
    for p in d.polygons: p.use_smooth=smooth
    local=Matrix.Translation(Vector(loc))@Euler(rot).to_matrix().to_4x4()
    world=FRAME@local
    if parent:
        o.parent=parent; o.matrix_parent_inverse=parent.matrix_world.inverted()
    o.matrix_basis=world
    if bevel:
        b=o.modifiers.new('玩具圆角','BEVEL'); b.width=bevel; b.segments=seg
        b.limit_method='ANGLE'
        w=o.modifiers.new('平整面法线','WEIGHTED_NORMAL'); w.keep_sharp=True
    return o

def box(n, size, loc, m, p, bevel=.025, rot=(0,0,0), seg=2):
    x,y,z=[a/2 for a in size]
    v=[(-x,-y,-z),(-x,-y,z),(-x,y,-z),(-x,y,z),(x,-y,-z),(x,-y,z),(x,y,-z),(x,y,z)]
    f=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    return mesh(n,v,f,m,p,loc,rot,min(bevel,min(size)*.45),seg)

def ball(n,loc,size,m,p,seg=16,rings=10,rot=(0,0,0)):
    v=[(0,0,size[2])]
    for j in range(1,rings):
        a=math.pi*j/rings
        v.extend((size[0]*math.sin(a)*math.cos(k*TAU/seg),size[1]*math.sin(a)*math.sin(k*TAU/seg),size[2]*math.cos(a)) for k in range(seg))
    v.append((0,0,-size[2])); end=len(v)-1
    f=[(0,1+k,1+(k+1)%seg) for k in range(seg)]
    for j in range(rings-2):
        a=1+j*seg; b=a+seg
        f.extend((a+k,b+k,b+(k+1)%seg,a+(k+1)%seg) for k in range(seg))
    a=1+(rings-2)*seg
    f.extend((end,a+(k+1)%seg,a+k) for k in range(seg))
    return mesh(n,v,f,m,p,loc,rot)

def cyl(n,r,h,loc,m,p,rot=(0,0,0),verts=20,bevel=.012):
    v=[(r*math.cos(k*TAU/verts),r*math.sin(k*TAU/verts),z) for z in (-h/2,h/2) for k in range(verts)]
    f=[tuple(reversed(range(verts))),tuple(range(verts,2*verts))]
    f.extend((k,(k+1)%verts,(k+1)%verts+verts,k+verts) for k in range(verts))
    return mesh(n,v,f,m,p,loc,rot,min(bevel,h*.2),2)

def tube(n, pts, r, m, p, sides=6):
    pts=[Vector(x) for x in pts]; v=[]; f=[]
    for i,c in enumerate(pts):
        t=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
        ref=Vector((0,0,1)) if abs(t.z)<.9 else Vector((1,0,0))
        a=t.cross(ref).normalized(); b=t.cross(a).normalized()
        rr=r[i] if isinstance(r,(tuple,list)) else r
        v.extend(tuple(c+rr*(a*math.cos(k*TAU/sides)+b*math.sin(k*TAU/sides))) for k in range(sides))
    for i in range(len(pts)-1):
        f.extend((i*sides+k,i*sides+(k+1)%sides,(i+1)*sides+(k+1)%sides,(i+1)*sides+k) for k in range(sides))
    f += [tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+k for k in range(sides))]
    return mesh(n,v,f,m,p)

def ring(n,c,r,th,m,p,rot=(0,0,0),scale=(1,1,1),steps=24):
    R=Euler(rot).to_matrix(); c=Vector(c)
    verts=[]; faces=[]; minor=8
    for k in range(steps):
        a=k*TAU/steps
        center=Vector((r*scale[0]*math.cos(a),r*scale[1]*math.sin(a),0))
        radial=Vector((math.cos(a)/scale[0],math.sin(a)/scale[1],0)).normalized()
        for j in range(minor):
            b=j*TAU/minor
            verts.append(tuple(c+R@(center+th*(math.cos(b)*radial+Vector((0,0,math.sin(b)))))))
    for k in range(steps):
        for j in range(minor):
            faces.append((k*minor+j,((k+1)%steps)*minor+j,((k+1)%steps)*minor+(j+1)%minor,k*minor+(j+1)%minor))
    return mesh(n,verts,faces,m,p)

def clear_meshes(root, prefixes=None):
    for o in list(root.children_recursive):
        if o.type=='MESH' and o.name not in LOCK and (prefixes is None or any(o.name.split('.')[0]==x for x in prefixes)):
            assert o.name not in wolf_objects
            bpy.data.objects.remove(o,do_unlink=True)

def leaf(n,a,b,width,m,p):
    a,b=Vector(a),Vector(b); d=b-a
    side=d.cross(Vector((0,0,1))).normalized()*width
    if side.length<.001: side=Vector((width,0,0))
    mid=a+d*.48; ridge=mid+Vector((0,0,width*.3))
    return mesh(n,[tuple(x) for x in (a,mid+side,b,mid-side,ridge)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(3,2,1,0)],m,p)

IVORY=mat('暖瓷白','#f8f0da',.65)
INK=mat('柔黑','#292e36',.55)
HILITE=mat('眼神白','#fffdf3',.45)
PINK=mat('粉杏','#ef9cac',.72)
WOOD=mat('蜂蜜木','#b87c45',.78)
WOODLIGHT=mat('切面木','#e4b77b',.76)
WOODDARK=mat('木缝','#795236',.8)
GOLD=mat('黄铜小件','#c49a4f',.48,.55)
STONE=[mat('石色'+str(i),c,.83) for i,c in enumerate(('#c5bca9','#ded1b9','#b5b6a5','#eee1c7'))]
GREEN=[mat('草叶'+str(i),c,.78) for i,c in enumerate(('#598550','#77a45d','#a5bd70','#426e56'))]
TEAL=[mat('青瓦'+str(i),c,.68) for i,c in enumerate(('#3f796a','#4c8876','#619884','#326255'))]
RUST=mat('朱红漆','#b75240',.68)
WATER=mat('池水蓝','#429fac',.45)
RIPPLE=mat('水纹','#b4ded7',.45)
AX=mat('糖粉皮肤','#f0adbd',.65)
AXLIGHT=mat('浅粉肚','#fbe0dd',.72)
AXD=mat('鳃珊瑚','#ce6187',.65)
AXTIP=mat('鳃亮边','#f48dab',.62)

print('STAGE 1 / partners',flush=True)
for who in ('熊猫','美西螈'):
    plot=bpy.data.objects['地块-'+who]; frame(plot)
    pet=bpy.data.objects[who]; head=bpy.data.objects[who+'/头']; tail=bpy.data.objects[who+'/尾巴']
    clear_meshes(pet)
    x,y,z=.85,-2.35,.16
    panda=who=='熊猫'; skin=IVORY if panda else AX
    # Keep every original rig/pivot. Rounded masses are new children only.
    ball(who+'躯干',(x,y+.06,z+.45 if panda else z+.39),(.29,.41,.27 if panda else .23),skin,pet,24,14)
    if panda:
        ball('熊猫黑肩',(x,y-.11,z+.47),(.302,.25,.245),INK,pet,24,14)
        ball('熊猫胸口',(x,y-.369,z+.45),(.105,.019,.085),IVORY,pet,20,12)
    else:
        ball('螈软肚',(x,y-.19,z+.28),(.23,.22,.115),AXLIGHT,pet,20,12)
        # A curled, visibly long tapering tail with a soft dorsal fin.
        path=[]
        for i in range(13):
            t=i/12
            path.append((x+.48*t*t,y+.30+.94*t,z+.38-.09*math.sin(math.pi*t)+.12*t*t))
        tube('螈长尾',path,[.15*(1-i/12)**.75+.006 for i in range(13)],AX,tail,16)
        # Closed lenticular fin, smoothly tapered in thickness and height.
        verts=[]; faces=[]
        for i,p in enumerate(path):
            t=i/12; h=.035+.15*math.sin(math.pi*t); w=.008+.019*math.sin(math.pi*t)
            for k in range(8):
                a=k*TAU/8
                verts.append((p[0]+w*math.cos(a),p[1],p[2]+h*math.sin(a)))
        for i in range(12):
            for k in range(8): faces.append((i*8+k,i*8+(k+1)%8,(i+1)*8+(k+1)%8,(i+1)*8+k))
        faces += [tuple(reversed(range(8))),tuple(96+k for k in range(8))]
        mesh('螈尾鳍',verts,faces,AXTIP,tail)
    if panda: ball('熊猫短圆尾',(x,y+.43,z+.48),(.11,.12,.10),IVORY,tail,20,12)
    # A mildly flattened front gives eyes a clean mounting plane.
    box(who+'柔圆头',(.82 if panda else .91,.63,.59 if panda else .52),(x,y-.36,z+.84),skin,head,.255,seg=7)
    for s in (-1,1):
        ear=bpy.data.objects[who+'/耳朵'+('左' if s<0 else '右')]
        if panda:
            ball('熊猫黑圆耳',(x+s*.29,y-.31,z+1.16),(.145,.10,.15),INK,ear,24,14)
            ball('熊猫耳窝',(x+s*.29,y-.399,z+1.16),(.084,.019,.086),WOODDARK,ear)
        else:
            # Exactly three main stalks per side; feather filaments follow each stalk.
            for j in range(3):
                start=Vector((x+s*.365,y-.32,z+.83))
                end=Vector((x+s*(.71 if j==1 else .64),y-.29,z+.64+j*.24))
                mid=start.lerp(end,.55)+Vector((0,.015,.025))
                tube('螈羽鳃主枝',[start,mid,end],[.044,.036,.012],AXD,ear,8)
                d=(end-start).normalized(); normal=Vector((-d.z,0,d.x))
                for k in range(1,5):
                    c=start.lerp(end,.22+k*.14)
                    for t in (-1,1):
                        tip=c+normal*t*(.070-k*.005)+d*.032
                        tube('螈羽鳃细丝',[c,c.lerp(tip,.6)+Vector((0,-.008,.012)),tip],[.018,.013,.003],AXTIP,ear,6)
        ex=x+s*.185; ey=y-.682
        if panda:
            ball('熊猫标志黑眼圈',(ex,ey+.006,z+.88),(.124,.028,.147),INK,head,24,14,rot=(0,s*.27,0))
            ball('熊猫眼白',(ex,ey-.021,z+.90),(.058,.023,.071),IVORY,head,20,12)
        ball(who+'眼睛',(ex,ey-.042,z+.90),(.045 if panda else .055,.022,.061 if panda else .07),INK,head,20,12)
        ball('双高光主',(ex-.013,ey-.062,z+.923),(.018,.009,.022),HILITE,head,16,8)
        ball('双高光副',(ex+.019,ey-.062,z+.88),(.007,.005,.008),HILITE,head,12,6)
        ball('眉毛',(ex,ey+.014,z+1.064 if panda else z+1.027),(.061,.019,.021),INK if panda else AXD,head,16,8,rot=(0,s*.14,0))
        ball('脸颊圆团',(x+s*.335,y-.59,z+.727),(.103,.066,.091),skin,head,20,12)
        ball('脸颊柔粉',(x+s*.30,y-.655,z+.749),(.068,.018,.037),PINK if panda else AXTIP,head,16,8)
        if panda: ball('脸颊白绒',(x+s*.30,y-.625,z+.687),(.065,.039,.045),IVORY,head)
        else:
            for k in range(3): ball('螈雀斑',(x+s*(.259+.025*k),y-.677,z+.784+(k%2)*.012),(.006,.003,.006),AXD,head,8,6)
    if panda:
        ball('熊猫吻部',(x,y-.666,z+.735),(.167,.072,.098),IVORY,head,24,12)
        ball('熊猫小鼻',(x,y-.733,z+.786),(.057,.031,.036),INK,head,20,10)
        tube('熊猫鼻下线',[(x,y-.742,z+.765),(x,y-.741,z+.712)],.006,INK,head)
    else:
        for s in (-1,1): ball('螈鼻孔',(x+s*.047,y-.689,z+.782),(.009,.004,.007),AXD,head,10,6)
    tube(who+'微笑',[(x-.085+i*.17/12,y-.738 if panda else y-.688,z+.708-.024*math.sin(math.pi*i/12)) for i in range(13)],.006,INK if panda else AXD,head,8)
    for i,(dx,dy) in enumerate([(-.17,-.2),(.17,-.2),(-.17,.22),(.17,.22)]):
        leg=bpy.data.objects[who+'/腿%d'%i]; px=x+dx; py=y+dy
        legcol=INK if panda else AX
        ball(who+'短圆腿',(px,py,z+.18),(.106,.112,.17 if panda else .12),legcol,leg,20,12)
        ball(who+'软脚掌',(px,py-.045,z+.061),(.116,.143,.067),legcol,leg,20,12)
        for t in (-1,0,1):
            ball('脚趾肉垫',(px+t*.05,py-.12,z+.031),(.021,.027,.013),PINK,leg,12,8)
        ball('脚心肉垫',(px,py-.028,z+.004),(.053,.061,.008),PINK,leg,12,8)
        for t in (-1,1):
            tube('脚趾缝',[(px+t*.033,py-.17,z+.049),(px+t*.033,py-.165,z+.074),(px+t*.033,py-.145,z+.086)],.004,WOODDARK if panda else AXD,leg)
    if panda:
        # Small bamboo snack, away from the face; remains attached to the body.
        tube('熊猫背竹',[(x-.24,y+.05,z+.58),(x-.40,y+.17,z+1.02)],.036,GREEN[1],pet,10)
        for k in range(3):
            c=(x-.26-k*.05,y+.07+k*.035,z+.64+k*.14)
            ring('背竹节',c,.038,.006,GREEN[2],pet,rot=(0,-.35,0),steps=12)
            leaf('背竹叶',c,(c[0]-.20,c[1]-.05,c[2]+.11),.045,GREEN[1],pet)

    # Bowls keep their original animation nodes and origins.
    bowl=bpy.data.objects[who+'/食盆']; food=bpy.data.objects[who+'/狗粮']
    trough=bpy.data.objects[who+'/水槽']; water=bpy.data.objects[who+'/水']
    clear_meshes(bowl); clear_meshes(trough)
    # Protected food/water meshes and origins stay intact; additions inherit their animation.
    cyl('陶盆外壁',.29,.15,(-1,-1.75,.255),WOOD,bowl,verts=28,bevel=.026)
    cyl('陶盆内底',.235,.018,(-1,-1.75,.333),WOODDARK,bowl,verts=28,bevel=.004)
    ring('陶盆卷口',(-1,-1.75,.337),.262,.027,WOODLIGHT,bowl,steps=32)
    for k in range(17):
        a=k*2.399; r=.18*math.sqrt(k/17)
        ball('可动画粮粒',(-1+r*math.cos(a),-1.75+r*math.sin(a),.349+(1-r/.19)*.034),(.027,.024,.022),GREEN[2] if panda else WOODLIGHT,food,10,6)
    for sx,sy,w,d in [(1.3,-1.79,.66,.055),(1.3,-1.41,.66,.055),(.995,-1.60,.055,.36),(1.605,-1.60,.055,.36)]:
        box('水槽卷边',(w,d,.17),(sx,sy,.264),TEAL[1],trough,.026,seg=3)
    box('水槽底',(.64,.38,.055),(1.3,-1.6,.199),TEAL[1],trough,.02)
    for c,r in [((1.2,-1.61,.326),.055),((1.44,-1.57,.326),.035)]: ring('动画水纹',c,r,.003,RIPPLE,water,scale=(1,.65,1),steps=16)

print('STAGE 2 / pavilion',flush=True)
plot=bpy.data.objects['地块-熊猫']; frame(plot); pav=bpy.data.objects['竹林小亭']
clear_meshes(pav)
box('亭台基',(3.5,2.9,.24),(0,.2,.30),STONE[0],pav,.08,seg=3)
box('亭台压边',(3.64,3.02,.10),(0,.2,.47),STONE[1],pav,.035)
for row in range(3):
    for col in range(4): box('亭面石砖',(.81,.88,.032),(-1.24+col*.83,-.70+row*.9,.531),STONE[(row+col)%4],pav,.012)
for i in range(2): box('亭前踏步',(1.52,.35,.12+i*.04),(0,-1.45+i*.24,.22+i*.08),STONE[1],pav,.04,seg=3)
for sx in (-1,1):
    for sy in (-1,1):
        x,y=sx*1.35,.2+sy*1.05
        box('方柱础',(.41,.41,.14),(x,y,.60),STONE[2],pav,.05,seg=3)
        cyl('柱础莲座',.19,.15,(x,y,.715),STONE[1],pav,verts=20,bevel=.025)
        cyl('朱漆圆柱',.105,1.5,(x,y,1.5),RUST,pav,verts=24,bevel=.024)
        for z in (.84,2.16): ring('柱木箍',(x,y,z),.11,.017,WOODLIGHT,pav,steps=20)
        box('柱头斗拱',(.34,.34,.16),(x,y,2.24),WOODDARK,pav,.035)
        box('斗拱托木',(.5,.21,.11),(x,y,2.34),RUST,pav,.025)
for y in (-.85,1.25): box('亭横梁',(3.0,.18,.19),(0,y,2.27),RUST,pav,.04)
for x in (-1.35,1.35): box('亭纵梁',(.18,2.5,.19),(x,.2,2.27),RUST,pav,.04)
# Staggered individually rounded tiles over three curved hip-roof tiers.
for tier,(w,d,z) in enumerate([(4.25,3.6,2.43),(3.1,2.58,2.98),(1.95,1.6,3.45)]):
    box('实厚檐底',(w,d,.14),(0,.2,z),TEAL[3],pav,.065,seg=3)
    box('檐朱红腰',(w-.12,d-.12,.10),(0,.2,z-.13),RUST,pav,.025)
    if tier<2: box('重檐承接芯',(w-1.20,d-1.20,.38),(0,.2,z+.30),TEAL[3],pav,.05,seg=3)
    for side in range(4):
        # Each side is built in its own radial planar orientation.
        along=w if side<2 else d
        depth=d/2 if side<2 else w/2
        s=-1 if side%2==0 else 1
        for row in range(3):
            t0=max(.018,row*.24-.025); t1=min(t0+.33,min(w,d)/2-.018)
            span=along-2*(t0+t1)/2
            count=max(3,int(span/.29))
            cuts=sorted(set([0.0,1.0]+[(k+(.5 if row%2 else 0))/count for k in range(count+1) if 0<(k+(.5 if row%2 else 0))/count<1]))
            for col,(u0,u1) in enumerate(zip(cuts,cuts[1:])):
                u0+=.009/span; u1-=.009/span
                q=[]
                # Clip every tile to its hip face; adjacent roof faces never overlap.
                for u,t in [(u0,t0),(u1,t0),(u1,t1),(u0,t1)]:
                    coord=(u-.5)*(along-2*t)
                    if side<2: q.append((coord,.2+s*(depth-t),z+.10+.50*t+row*.04))
                    else: q.append((s*(depth-t),.2+coord,z+.10+.50*t+row*.04))
                if (Vector(q[1])-Vector(q[0])).cross(Vector(q[2])-Vector(q[1])).z<0: q.reverse()
                v=[(p[0],p[1],p[2]-.055) for p in q]+q
                mesh('错缝琉璃瓦',v,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],TEAL[(col+row+tier)%3],pav,bevel=.018,seg=2)
        # Quiet rounded eave cord, turned up at the corners.
        half=along/2
        if side<2: pts=[(-half,.2+s*depth,z+.22),(-half+.3,.2+s*depth,z+.11),(half-.3,.2+s*depth,z+.11),(half,.2+s*depth,z+.22)]
        else: pts=[(s*depth,.2-half,z+.22),(s*depth,.2-half+.3,z+.11),(s*depth,.2+half-.3,z+.11),(s*depth,.2+half,z+.22)]
        tube('翘檐圆唇',pts,.046,TEAL[1],pav,8)
cyl('亭宝顶座',.22,.10,(0,.2,3.98),TEAL[3],pav)
ball('亭宝顶',(0,.2,4.14),(.13,.13,.17),GOLD,pav,20,12)
box('竹亭牌框',(1.08,.11,.35),(0,-.93,2.05),WOODLIGHT,pav,.045,seg=3)
box('竹亭牌心',(.94,.035,.24),(0,-1.003,2.05),TEAL[3],pav,.025)
for x in (-.25,0,.25):
    tube('匾上竹纹',[(x,-1.027,1.96),(x,-1.027,2.14)],.015,IVORY,pav)
    leaf('匾上竹叶',(x,-1.04,2.07),(x+.09,-1.04,2.12),.025,IVORY,pav)
for x in (-1.04,1.04):
    box('亭长凳',(.34,1.45,.14),(x,.38,.87),WOODLIGHT,pav,.045,seg=3)
    for y in (-.12,.88): box('凳腿',(.19,.15,.30),(x,y,.67),WOODDARK,pav,.03)
box('茶席软垫',(.64,.62,.11),(0,.50,.615),mat('竹席金','#d3ad59',.83),pav,.05,seg=3)
for k in range(5): tube('竹席编边',[(-.28+k*.14,.21,.675),(-.28+k*.14,.79,.675)],.004,WOODLIGHT,pav)
# Joint rings and tapered lanceolate leaves, not rectangular leaf cards.
for bx,by,n in [(-2.35,.9,4),(2.45,.6,3),(-2.60,-.45,2),(2.25,1.85,3)]:
    for k in range(n):
        x=bx+(k%2-.5)*.25; y=by+(k//2)*.27; h=2.3+(k*7%5)*.24
        lean=(k%3-1)*.12
        tube('完整竹秆',[(x,y,.2),(x+lean*.4,y,.2+h*.5),(x+lean,y,.2+h)],.055,GREEN[1],pav,10)
        for j in range(1,int(h/.42)+1):
            z=.2+j*.42; xx=x+lean*(z-.2)/h
            ring('竹节凸环',(xx,y,z),.057,.012,GREEN[2],pav,steps=12)
        for j in range(3):
            z=h-.45+j*.22; xx=x+lean*z/h; side=(-1)**(j+k)
            end=(xx+side*.38,y-.12,z+.12)
            tube('竹细枝',[(xx,y,z),end],.014,GREEN[3],pav)
            for q in range(3):
                a=(xx+side*(.10+q*.10),y-.04-q*.025,z+.04+q*.03)
                leaf('竹尖叶',a,(a[0]+side*(.20+q*.02),a[1]+(-1)**q*.13,a[2]-.08+q*.07),.045,GREEN[(j+q)%3],pav)
for x,y in [(-1.65,-1.95),(1.98,-1.25)]:
    box('石灯基',(.4,.4,.12),(x,y,.23),STONE[2],pav,.04)
    box('石灯柱',(.20,.20,.34),(x,y,.45),STONE[0],pav,.035)
    box('石灯火',(.22,.22,.19),(x,y,.72),bpy.data.materials['灯芯'],pav,.04)
    for dx in (-.15,.15): box('石灯角柱',(.06,.30,.3),(x+dx,y,.73),STONE[1],pav,.02)
    box('石灯圆帽',(.46,.43,.14),(x,y,.94),TEAL[1],pav,.06,seg=3)

print('STAGE 3 / pond and dome',flush=True)
plot=bpy.data.objects['地块-美西螈']; frame(plot); hut=bpy.data.objects['荷叶池塘']
clear_meshes(hut)
SAND=mat('贝壳陶','#e2cdb2',.81)
SANDS=[mat('圆顶砖'+str(i),c,.80) for i,c in enumerate(('#ead9bd','#dfc8a9','#e5d0b2','#d8bfa1'))]
MORTAR=mat('陶砖缝','#ad9d86',.84)
ball('圆顶灰缝胎',(-.6,.6,.20),(1.50,1.50,1.275),MORTAR,hut,40,20)
# Rounded wedge bricks on the upper hemisphere: horizontal courses, staggered joints.
for row in range(7):
    lo=.03+row*(math.pi/2-.06)/7; hi=lo+(math.pi/2-.06)/7-.012
    mid=(lo+hi)/2; count=max(7,int(28*math.cos(mid)))
    for k in range(count):
        a=k*TAU/count+(row%2)*math.pi/count+.008; b=a+TAU/count-.016
        v=[]
        for rr in (1.498,1.535):
            for th in (lo,(lo+hi)/2,hi):
                for az in (a,(a+b)/2,b): v.append((-.6+rr*math.cos(th)*math.cos(az),.6+rr*math.cos(th)*math.sin(az),.20+rr*.85*math.sin(th)))
        f=[]
        for j in range(2):
            for q in range(2):
                t=j*3+q; f.extend([(t,t+1,t+4,t+3),(t+9,t+12,t+13,t+10)])
        for ids in [(0,1,2),(6,7,8),(0,3,6),(2,5,8)]:
            for q in range(2): f.append((ids[q],ids[q+1],ids[q+1]+9,ids[q]+9))
        mesh('圆顶错缝陶砖',v,f,SANDS[(k+row)%4],hut,bevel=.008,seg=2)
ball('圆顶收口',(-.6,.6,1.485),(.17,.17,.055),SAND,hut,20,10)
# Door sits on front tangent; a wooden arched insert and individual voussoirs.
box('圆顶门暗口',(.75,.13,.78),(-.6,-.91,.59),WOODDARK,hut,.085,seg=4)
ball('门拱暗口',(-.6,-.94,.98),(.375,.070,.30),WOODDARK,hut,24,14)
for k in range(5):
    x=-.6+(k-2)*.125; top=.99+.20*math.sqrt(max(0,1-((k-2)/2.5)**2))
    box('圆顶门木板',(.117,.065,top-.24),(x,-1.018,(top+.24)/2),WOOD if k%2 else WOODLIGHT,hut,.025,seg=3)
for side in (-1,1):
    for k in range(4): box('门框侧砖',(.16,.24,.19),(-.6+side*.45,-.95,.30+k*.195),SANDS[k%4],hut,.035,seg=3)
for k in range(9):
    a=k*math.pi/8
    box('门拱砖',(.18,.24,.19),(-.6+math.cos(a)*.44,-.95,1.0+math.sin(a)*.30),SANDS[k%4],hut,.028,rot=(0,-a+math.pi/2,0),seg=3)
for z in (.42,.84): box('门横撑',(.57,.045,.055),(-.6,-1.07,z),WOODDARK,hut,.012)
ball('圆顶门把',(-.40,-1.112,.67),(.035,.027,.035),GOLD,hut)
box('圆顶屋门阶',(1.1,.40,.12),(-.6,-1.13,.22),STONE[1],hut,.05,seg=3)
# Round porthole normal on the front-right quarter of the dome.
wc=Vector((.48,-.38,1.00)); normal=Vector((.65,-.76,.10)).normalized()
R=Vector((0,0,1)).rotation_difference(normal).to_euler()
cyl('圆窗蓝玻璃',.235,.045,wc,bpy.data.materials['玻璃'],hut,rot=R,verts=32,bevel=.006)
ring('圆窗奶白框',wc+normal*.03,.252,.044,IVORY,hut,rot=R,steps=32)
rotm=R.to_matrix()
for v in (Vector((.18,0,0)),Vector((0,.18,0))):
    tube('圆窗十字',[wc+normal*.065-rotm@v,wc+normal*.065+rotm@v],.018,WOODLIGHT,hut)
# Layered irregular pond stones; water stays a single calm constant-color surface.
cyl('池塘陶底',1.48,.12,(1.4,.9,.21),STONE[2],hut,verts=48,bevel=.035)
cyl('池塘水面',1.32,.035,(1.4,.9,.293),WATER,hut,verts=64,bevel=.005)
for k in range(23):
    a=k*TAU/23; r=1.40
    ball('池边圆卵石',(1.4+r*math.cos(a),.9+r*math.sin(a),.31+RNG.uniform(-.01,.012)),(.18,.12,.105),STONE[k%4],hut,12,8,rot=(0,0,a+math.pi/2))

def lily(x,y,r,phase):
    n=24; v=[(x,y,.321)]
    # A V notch, lifted rim and rippling height provide a real folded lily pad.
    for k in range(n+1):
        a=.22+k*(TAU-.44)/n+phase
        v.append((x+r*math.cos(a),y+r*math.sin(a),.333+.022*math.sin(a*3+phase)+.01*math.cos(a*5)))
    f=[(0,k+1,k+2) for k in range(n)]
    o=mesh('起伏缺口荷叶',v,f,GREEN[1],hut)
    s=o.modifiers.new('荷叶厚度','SOLIDIFY'); s.thickness=.014
    for k in range(6):
        a=.4+k*(TAU-.8)/5+phase
        tube('荷叶叶脉',[(x,y,.336),(x+math.cos(a)*r*.4,y+math.sin(a)*r*.4,.344),(x+math.cos(a)*r*.83,y+math.sin(a)*r*.83,.350+.017*math.sin(a*3+phase))],.0045,GREEN[2],hut,5)

for x,y,r,ph in [(1.0,.40,.30,.4),(1.82,1.35,.28,1.8),(1.85,.53,.24,2.1),(1.02,1.36,.24,.1)]: lily(x,y,r,ph)
for j in range(2):
    n=7 if j==0 else 5
    for k in range(n):
        a=k*TAU/n+j*.4
        ball('荷花花瓣',(1.82+.075*math.cos(a),1.35+.075*math.sin(a),.39+j*.04),(.047,.10,.028),PINK if j==0 else AXLIGHT,hut,12,8,rot=(.24,0,a-math.pi/2))
ball('荷花芯',(1.82,1.35,.459),(.045,.045,.028),GOLD,hut,12,8)
for c,r in [((1.3,.90,.317),.17),((2.14,.96,.317),.11),((.75,.82,.317),.075)]:
    for rad in (r,r+.055):
        tube('池水涟漪',[(c[0]+rad*math.cos(a),c[1]+rad*.65*math.sin(a),c[2]) for a in [k*TAU/24 for k in range(3,22)]],.0035,RIPPLE,hut,5)
for k in range(7):
    x=2.49+(k%2)*.14; y=1.58-k*.17; h=.75+(k%3)*.17
    tube('水岸芦苇',[(x,y,.30),(x-.06,y,h+.25)],.018,GREEN[3],hut)
    ball('芦苇穗',(x-.06,y,h+.28),(.044,.044,.13),WOODDARK,hut,12,8)
    leaf('芦苇弯叶',(x,y,.43),(x+.18,y-.08,.96),.035,GREEN[1],hut)

# Compact, contained garden edges add layers without changing the plot extents.
for who in ('熊猫','美西螈'):
    plot=bpy.data.objects['地块-'+who]; frame(plot)
    for x,y in [(-2.30,-2.8),(-2.50,1.9),(2.55,-2.85)]:
        for k in range(4):
            ball('庭院灌木',(x+(k%2)*.17,y+(k//2)*.18,.28),(.21,.21,.19),GREEN[k%3],plot,12,8)
        for k in range(3):
            a=k*2.1; fx=x+.12+math.cos(a)*.15; fy=y+.10+math.sin(a)*.15
            for j in range(5):
                t=j*TAU/5
                ball('庭院小花瓣',(fx+.035*math.cos(t),fy+.035*math.sin(t),.45),(.027,.026,.015),IVORY if who=='熊猫' else PINK,plot,8,6)
            ball('庭院花心',(fx,fy,.462),(.02,.02,.014),WOODLIGHT,plot,8,6)

print('STAGE 4 / hub and belts',flush=True)
frame(); hub=bpy.data.objects['广场']
clear_meshes(hub, ['柜台','台面','棚柱','遮阳棚','粮袋','水桶','小卖部牌','门柱','门楣','传送门光'])
CREAM=mat('帆布奶油','#f3e5c9',.84)
RED=mat('帆布珊瑚','#cf6750',.81)
BLUE=mat('搪瓷蓝','#71b2c2',.55)
STEEL=mat('五金青灰','#667976',.56,.25)
PORTAL=bpy.data.materials['传送门光']
pp=PORTAL.node_tree.nodes['Principled BSDF']; pp.inputs['Roughness'].default_value=.45
pp.inputs['Emission Strength'].default_value=.65
# Plaza's original circles stay put; real radial paving added above their top.
for band,r,w,n in [(0,4.97,.39,72),(1,4.45,.55,64)]:
    for k in range(n):
        a=k*TAU/n+(band%2)*math.pi/n
        box('广场放射砖',(w,TAU*r/n*.94,.055),(r*math.cos(a),r*math.sin(a),.151),STONE[(k+band)%4],hub,.016,rot=(0,0,a))
box('小卖部圆柜',(2.2,.9,.88),(0,-1.2,.57),WOOD,hub,.09,seg=4)
for k in range(9): box('柜台木条',(.224,.045,.70),(-.92+k*.23,-1.665,.57),WOODLIGHT if k%3==0 else WOOD,hub,.015)
for z in (.23,.92): box('柜台镶边',(2.22,.075,.085),(0,-1.694,z),WOODDARK,hub,.025)
box('柜台厚面',(2.45,1.04,.12),(0,-1.2,1.08),WOODDARK,hub,.05,seg=3)
for x in (-1.07,1.07):
    box('棚圆木柱',(.11,.11,1.48),(x,-1.49,1.84),WOODDARK,hub,.04,seg=3)
    cyl('棚柱脚',.11,.16,(x,-1.49,1.2),GOLD,hub,verts=16)
    tube('棚斜撑',[(x,-1.49,2.20),(x*.75,-1.49,2.50)],.035,WOODLIGHT,hub)
for y in (-1.96,-.59): tube('棚横骨',[(-1.22,y,2.42 if y< -1 else 2.73),(1.22,y,2.42 if y< -1 else 2.73)],.035,WOODDARK,hub,8)
# Curved cloth strips with thickness and scalloped front valance.
for k in range(8):
    x=-1.2+k*.3; verts=[]
    for j in range(9):
        t=j/8; y=-.56-1.42*t; z=2.73-.31*t+.085*math.sin(math.pi*t)
        verts.extend([(x,y,z),(x+.30,y,z)])
    o=mesh('弧面遮阳棚',verts,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(8)],CREAM if k%2==0 else RED,hub)
    s=o.modifiers.new('帆布厚度','SOLIDIFY'); s.thickness=.035
    vv=[(x,-1.982,2.43),(x+.3,-1.982,2.43)]
    vv += [(x+.30-j*.30/10,-1.982,2.31-.065*math.sin(j*math.pi/10)) for j in range(11)]
    o=mesh('棚边圆波浪',vv,[tuple(range(len(vv)))],CREAM if k%2==0 else RED,hub)
    s=o.modifiers.new('垂帘厚度','SOLIDIFY'); s.thickness=.025
    tube('帆布包缝',[(x+.014,-.58-1.38*j/8,2.738-.31*j/8+.085*math.sin(math.pi*j/8)) for j in range(9)],.0045,WOODLIGHT,hub,5)
# Three tied sacks, stitching and grain kernels.
for k in range(3):
    x=-.77+k*.38
    ball('粮袋鼓肚',(x,-1.16,1.33),(.21,.175,.24),CREAM,hub,20,12)
    cyl('粮袋束口',.10,.09,(x,-1.16,1.55),CREAM,hub,verts=16,bevel=.015)
    ring('粮袋扎绳',(x,-1.16,1.53),.10,.012,WOODDARK,hub,steps=20)
    tube('粮袋绳尾',[(x+.06,-1.24,1.53),(x+.13,-1.28,1.45),(x+.10,-1.3,1.40)],.009,WOODDARK,hub)
    box('粮袋布标',(.14,.018,.12),(x,-1.335,1.32),WOODLIGHT,hub,.022)
    for t in (-1,0,1): ball('粮袋种子图',(x+t*.032,-1.35,1.32+(.02 if t==0 else 0)),(.017,.008,.028),WOODDARK,hub,10,6)
    for j in range(6): tube('粮袋针脚',[(x-.13,-1.29,1.18+j*.045),(x-.11,-1.302,1.19+j*.045)],.003,WOODDARK,hub,5)
for k in range(2):
    x=.48+k*.43
    cyl('蓝搪瓷桶',.173,.36,(x,-1.13,1.31),BLUE,hub,verts=24,bevel=.025)
    cyl('桶内水',.143,.012,(x,-1.13,1.498),WATER,hub,verts=24,bevel=.002)
    ring('桶卷边',(x,-1.13,1.50),.164,.017,IVORY,hub)
    ring('桶底边',(x,-1.13,1.15),.16,.012,IVORY,hub)
    tube('桶提手',[(x+.18*math.cos(a),-1.13,1.39+.30*math.sin(a)) for a in [j*math.pi/16 for j in range(17)]],.012,STEEL,hub,8)
box('小卖部吊牌框',(1.35,.11,.35),(0,-1.58,2.12),WOODLIGHT,hub,.055,seg=3)
box('小卖部吊牌心',(1.20,.035,.23),(0,-1.651,2.12),TEAL[3],hub,.03)
for x in (-.50,.50): tube('招牌吊绳',[(x,-1.58,2.30),(x,-1.58,2.46)],.012,WOODDARK,hub)
# Original vector lettering avoids fonts/external files: a recognizable bowl + leaf icon.
tube('招牌食盆',[(-.16,-1.677,2.15),(-.11,-1.677,2.04),(.11,-1.677,2.04),(.16,-1.677,2.15)],.014,IVORY,hub,8)
tube('招牌碗口',[(-.17,-1.677,2.15),(.17,-1.677,2.15)],.012,IVORY,hub)
for s in (-1,1):
    for j in range(2): leaf('招牌叶纹',(s*.34,-1.676,2.08+j*.06),(s*.47,-1.676,2.13+j*.06),.025,IVORY,hub)
# Portal: individually beveled stone courses, inset luminous panel, inner molding.
for s in (-1,1):
    box('门柱础',(.65,.68,.24),(s*1.0,2.4,.23),STONE[2],hub,.075,seg=3)
    for k in range(6):
        box('传送门石块',(.43,.48,.36),(s*1.0,2.4,.54+k*.37),STONE[(k+(s==1))%4],hub,.05,seg=3)
    box('门柱顶托',(.62,.62,.19),(s*1.0,2.4,2.64),STONE[1],hub,.05,seg=3)
    box('传送门内线',(.055,.055,2.28),(s*.773,2.34,1.40),GOLD,hub,.02)
box('传送门檐石',(2.73,.66,.30),(0,2.4,2.88),STONE[0],hub,.10,seg=4)
box('门楣上沿',(2.85,.71,.11),(0,2.4,3.055),STONE[1],hub,.045,seg=3)
box('传送门发光面',(1.54,.06,2.29),(0,2.4,1.4),PORTAL,hub,.04,seg=3)
PORTALLINE=mat('门内星光','#d7cfed',.5,emit='#d7cfed',strength=.8)
for x,z in [(-.38,.61),(.43,1.11),(-.34,1.94),(.26,2.29)]:
    tube('门内星纵',[(x,2.361,z-.06),(x,2.361,z+.06)],.007,PORTALLINE,hub)
    tube('门内星横',[(x-.04,2.361,z),(x+.04,2.361,z)],.007,PORTALLINE,hub)
ring('门楣徽章',(0,2.035,2.89),.13,.025,GOLD,hub,rot=(math.pi/2,0,0))
box('门前踏石',(2.4,.78,.10),(0,1.99,.18),STONE[1],hub,.045,seg=3)

BELT=mat('带面炭灰','#455356',.74)
RAIL=mat('护栏奶油','#e1cfad',.62)
for who in ('小狼','熊猫','美西螈'):
    belt=bpy.data.objects['传送带-'+who]
    # Rebuild children only; preserve the root and exact endpoints from layout.
    clear_meshes(belt)
    data=json.load(open(layout_path))['belts'][who]
    start=Vector((data[0][0],-data[0][2],.55)); end=Vector((data[1][0],-data[1][2],.55))
    u=(end-start).normalized(); side=Vector((-u.y,u.x,0)); L=(end-start).length; a=math.atan2(u.y,u.x)
    mid=(start+end)/2
    box('带底框',(L,.64,.14),mid-Vector((0,0,.06)),STEEL,belt,.04,rot=(0,0,a))
    count=int(L/.19)
    for k in range(count):
        c=start+u*((k+.5)*L/count)
        box('分节带板',(L/count*.93,.49,.055),c+Vector((0,0,.035)),BELT,belt,.012,rot=(0,0,a))
    for s in (-1,1):
        offset=side*.31*s
        tube('连续扶栏',[start+offset+Vector((0,0,.20)),end+offset+Vector((0,0,.20))],.032,RAIL,belt,8)
        box('带侧包边',(L,.065,.11),mid+offset+Vector((0,0,.04)),WOODLIGHT,belt,.022,rot=(0,0,a))
        for k in range(int(L/.9)+1):
            c=start+u*(k*L/int(L/.9))+offset
            cyl('栏杆支销',.021,.18,c+Vector((0,0,.12)),STEEL,belt,verts=10,bevel=.004)
    for k in range(int(L/1.3)+1):
        c=start+u*k*L/int(L/1.3)
        for s in (-1,1):
            p=c+side*.22*s
            box('传送带双脚',(.09,.09,.43),(p.x,p.y,.26),STEEL,belt,.02)
            box('传送带脚垫',(.22,.18,.06),(p.x,p.y,.065),STONE[2],belt,.022)
        tube('带脚横撑',[c-side*.23-Vector((0,0,.20)),c+side*.23-Vector((0,0,.20))],.03,STEEL,belt)
    # End drums around the transverse axis, with visible small hubs.
    r=Vector((0,0,1)).rotation_difference(side).to_euler()
    for c in (start,end):
        cyl('传送带端滚筒',.10,.52,c,BELT,belt,rot=r,verts=20,bevel=.015)
        for s in (-1,1): cyl('滚筒轴帽',.054,.022,c+side*.35*s,GOLD,belt,rot=r,verts=16,bevel=.007)

print('STAGE 5 / future plot signs',flush=True)
for plot in [o for o in bpy.data.objects if o.name.startswith('地块-空') and o.parent is None]:
    frame(plot)
    sign=next(o for o in plot.children if o.name.startswith('待开放牌'))
    clear_meshes(sign)
    box('待开放木柱',(.14,.15,.9),(0,-2.6,.59),WOOD,sign,.035,seg=3)
    box('待开放柱脚',(.28,.30,.11),(0,-2.6,.16),STONE[2],sign,.04)
    box('待开放牌框',(1.12,.15,.66),(0,-2.6,1.11),WOOD,sign,.085,seg=4)
    box('待开放牌心',(.96,.035,.49),(0,-2.695,1.11),CREAM,sign,.06,seg=3)
    for x in (-.43,.43): ball('牌铜钉',(x,-2.72,1.11),(.025,.012,.025),GOLD,sign,12,8)
    box('待开放锁身',(.23,.07,.19),(0,-2.752,1.02),GOLD,sign,.035,seg=3)
    tube('锁圆环',[(.083*math.cos(t),-2.745,1.12+.09*math.sin(t)) for t in [k*math.pi/12 for k in range(13)]],.018,GOLD,sign,8)
    ball('锁孔',(0,-2.793,1.04),(.018,.005,.023),WOODDARK,sign,12,8)
    box('锁孔下',(.014,.008,.035),(0,-2.794,1.016),WOODDARK,sign,.004)
    for x in (-.31,.31):
        leaf('未来嫩芽',(x,-2.725,1.15),(x-.075,-2.725,1.25),.028,GREEN[1],sign)
        leaf('未来嫩芽',(x,-2.725,1.15),(x+.075,-2.725,1.23),.028,GREEN[2],sign)

frame()
bpy.context.view_layer.update()
# Small repeated edges receive one bevel segment; hero silhouettes keep 3–7.
# This only touches newly authored static geometry, never either pet or the wolf.
pet_parts={o.name for who in ('熊猫','美西螈') for o in bpy.data.objects[who].children_recursive}
for o in bpy.data.objects:
    if not o.name.startswith('R2/'): continue
    if o.name in pet_parts: continue
    for modifier in o.modifiers:
        if modifier.type=='BEVEL' and (modifier.width<=.018 or o.name.startswith('R2/错缝琉璃瓦')):
            modifier.segments=1

def check_locked():
    bpy.context.view_layer.update()
    for n,t in baseline.items():
        now=transform(bpy.data.objects[n])
        assert now['parent']==t['parent'],n
        for key in ('world','local','inverse'):
            assert max(abs(now[key][r][c]-t[key][r][c]) for r in range(4) for c in range(4))<1e-6,(n,key)
    assert wolf_hash()==wolf_before,'Wolf subtree was modified'
    assert {o.name for o in [wolf]+list(wolf.children_recursive)}==wolf_objects
    assert hashlib.sha256(open(layout_path,'rb').read()).hexdigest()==layout_hash

def count_triangles():
    deps=bpy.context.evaluated_depsgraph_get(); total=0
    for o in bpy.data.objects:
        if o.type=='MESH':
            ev=o.evaluated_get(deps); m=ev.to_mesh(); m.calc_loop_triangles()
            total+=len(m.loop_triangles); ev.to_mesh_clear()
    return total

check_locked()
tris=count_triangles()
print('EVALUATED_TRIANGLES',tris,flush=True)
assert tris<=380000, tris

# Preview-only environment. Same wide camera as build2.py, no geometry cheats.
preview=[]
groundmat=mat('预览草','#83a768',.85)
preview.append(cyl('预览地面',24,.2,(0,5,-.1),groundmat,None,verts=96,bevel=0))
bpy.ops.object.camera_add(); cam=bpy.context.object; cam.name='预览相机'; scene.camera=cam; preview.append(cam)
bpy.ops.object.light_add(type='SUN',location=(-5,-8,15)); sun=bpy.context.object; sun.name='预览太阳'; preview.append(sun)
sun.rotation_euler=(math.radians(28),math.radians(-24),math.radians(-25)); sun.data.energy=2.4; sun.data.angle=math.radians(16); sun.data.color=(1,.93,.83)
bpy.ops.object.light_add(type='AREA',location=(-8,-10,19)); area=bpy.context.object; area.name='预览柔光'; preview.append(area)
area.data.energy=1600; area.data.shape='DISK'; area.data.size=15
area.rotation_euler=(Vector((0,5,0))-area.location).to_track_quat('-Z','Y').to_euler()
world=bpy.data.worlds.new('预览天空R2'); world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=lin('#c9dce8')
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.40; scene.world=world
scene.render.engine='BLENDER_EEVEE'; scene.eevee.taa_render_samples=64
if hasattr(scene.eevee,'use_gtao'): scene.eevee.use_gtao=True
scene.view_settings.view_transform='AgX'
try: scene.view_settings.look='AgX - Medium High Contrast'
except TypeError: pass
scene.view_settings.exposure=0
scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False

def camera(loc,target,kind='PERSP',scale=5.7):
    cam.location=loc; cam.rotation_euler=(Vector(target)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    cam.data.type=kind; cam.data.lens=40; cam.data.ortho_scale=scale
    cam.data.dof.use_dof=False

def render(name,w,h):
    scene.render.resolution_x=w; scene.render.resolution_y=h
    scene.render.filepath=os.path.join(OUT,name)
    print('RENDER',name,flush=True); bpy.ops.render.render(write_still=True)

camera((0,-40,30),(0,5,0)); render('preview-wide.png',1600,1000)
for who,name in [('熊猫','preview-panda.png'),('美西螈','preview-axo.png')]:
    root=bpy.data.objects['地块-'+who]; M=root.matrix_world
    if who=='熊猫': camera(M@Vector((5.4,-9.1,6.1)),M@Vector((0,-.65,1.34)),'ORTHO',7.55)
    else: camera(M@Vector((4.8,-8.6,5.2)),M@Vector((.10,-.55,.65)),'ORTHO',6.8)
    render(name,1600,1450)
if '--qa-hub' in sys.argv:
    camera((4.5,-7.2,5.4),(0,.55,1.25),'ORTHO',6.8)
    render('qa-hub.png',1400,1400)
scene.camera=None
for o in preview: bpy.data.objects.remove(o,do_unlink=True)
for seq in (bpy.data.cameras,bpy.data.lights,bpy.data.meshes):
    for d in list(seq):
        if d.users==0: seq.remove(d)
if groundmat.users==0: bpy.data.materials.remove(groundmat)
check_locked()
assert not any(o.type in ('CAMERA','LIGHT') or '预览' in o.name for o in bpy.data.objects)
for o in bpy.data.objects:
    if o.type=='MESH':
        for m in o.data.materials:
            assert m.use_nodes and {n.type for n in m.node_tree.nodes}<={'BSDF_PRINCIPLED','OUTPUT_MATERIAL'},m.name
            p=m.node_tree.nodes.get('Principled BSDF')
            assert .449<=p.inputs['Roughness'].default_value<=.851,(m.name,p.inputs['Roughness'].default_value)
scene.render.filepath=''
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'park2.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'park2.glb'),export_format='GLB',export_apply=True,
                          export_yup=True,export_cameras=False,export_lights=False,export_extras=False)
with open(os.path.join(OUT,'park2.glb'),'rb') as f:
    magic,version,length=struct.unpack('<4sII',f.read(12)); assert magic==b'glTF' and version==2
    size,kind=struct.unpack('<II',f.read(8)); document=json.loads(f.read(size))
export_tris=0
for n in document['nodes']:
    if 'mesh' in n:
        for p in document['meshes'][n['mesh']]['primitives']:
            assert p.get('mode',4)==4
            export_tris+=document['accessors'][p.get('indices',p['attributes']['POSITION'])]['count']//3
assert export_tris<=380000,export_tris
names={n['name'] for n in document['nodes'] if 'name' in n}
assert set(LOCK)<=names
assert not document.get('images') and not document.get('textures') and not document.get('cameras')
assert 'KHR_lights_punctual' not in document.get('extensionsUsed',[])
assert {'玻璃','灯芯','传送门光'}<={m['name'] for m in document['materials']}
report={'glb_triangles':export_tris,'limit':380000,'evaluated_triangles':tris,'objects':len(bpy.data.objects),
        'wolf_objects':len(wolf_objects),'wolf_hash_before':wolf_before,'wolf_hash_after':wolf_hash(),
        'wolf_unchanged':True,'layout_sha256':layout_hash,'protected_transforms':baseline,
        'protected_transforms_unchanged':True,'no_preview_objects':True,'no_textures':True,
        'export_apply':True,'export_yup':True,'roughness_range':[.45,.85],
        'previews':['preview-wide.png','preview-panda.png','preview-axo.png']}
with open(os.path.join(OUT,'validation.json'),'w') as f: json.dump(report,f,ensure_ascii=False,indent=2)
print('EXPORTED_GLB_TRIANGLES',export_tris,flush=True)
print('PASS wolf exact fingerprint; protected pivots; layout; materials; preview cleanup; GLB budget',flush=True)
