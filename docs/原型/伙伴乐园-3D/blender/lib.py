# 小伙伴乐园 · 小狼 + 红顶木屋 基础造型（Claude 搭主视觉这一步）
# 用法：blender -b --python build.py -- <输出目录>
# 产出：<输出目录>/park.blend、park.glb、preview.png
# 坐标：Blender Z 向上，正面朝 -Y（导出 glTF 后正面朝 +Z）。单位：米。
import bpy, math, sys, os
from mathutils import Vector

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


