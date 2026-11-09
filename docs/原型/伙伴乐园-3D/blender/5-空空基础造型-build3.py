# 空空（玩家形象）基础造型：照方块世界 V4 的原创「空空」—— 大头、棕发 + 呆毛、绿上衣、蓝裤子、红围巾、背包、小灯
# 用法：blender -b --python build3_kong.py -- <输出目录>
# 产出 kong.blend / kong.glb / preview.png。脚底在原点，脸朝 -Y（导出后朝 +Z），身高约 1.75 米（伙伴约 1.2 米）。
# 动画支点：空空 / 空空/头 / 空空/左臂 / 空空/右臂 / 空空/左腿 / 空空/右腿（肩、髋处）
import bpy, math, sys, os
OUT = sys.argv[sys.argv.index('--') + 1]
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

SKIN, HAIR, SHIRT, SHIRT2 = mat('皮肤', '#f1c27d', .6), mat('头发', '#4a2f1b', .7), mat('上衣绿', '#5f9e3a', .7), mat('上衣绿深', '#4c8530', .7)
PANTS, SHOE, SCARF, PACK = mat('裤子蓝', '#3b5bdb', .7), mat('鞋', '#3a2c24', .6), mat('围巾红', '#c8352b', .6), mat('背包', '#b98a4e', .7)
INK, WHITE, BLUSH = mat('眼睛', '#1f2329', .25), mat('高光白', '#ffffff', .2), mat('脸红空空', '#ff9fb0', .6)
root = empty('空空', (0, 0, 0))
# 腿（支点在髋）
for s, nm in ((-1, '左'), (1, '右')):
    leg = empty('空空/' + nm + '腿', (.12 * s, 0, .72), root)
    under(box('裤腿', (.2, .22, .6), (.12 * s, 0, .42), PANTS, .07, 4), leg)
    under(box('鞋', (.22, .3, .13), (.12 * s, -.04, .065), SHOE, .05, 4), leg)
# 身体
under(box('上衣', (.5, .3, .56), (0, 0, 1.0), SHIRT, .12, 5), root)
under(box('衣摆', (.52, .32, .08), (0, 0, .74), SHIRT2, .04, 3), root)
under(box('腰带', (.5, .31, .05), (0, 0, .79), mat('腰带', '#6b4628', .6), .02, 2), root)
# 手臂（支点在肩）
for s, nm in ((-1, '左'), (1, '右')):
    arm = empty('空空/' + nm + '臂', (.33 * s, 0, 1.22), root)
    under(box('袖子', (.16, .18, .3), (.33 * s, 0, 1.1), SHIRT, .06, 4), arm)
    under(box('手臂', (.14, .16, .26), (.33 * s, 0, .86), SKIN, .06, 4), arm)
# 围巾、背包、小灯
under(box('围巾', (.56, .36, .11), (0, 0, 1.31), SCARF, .05, 4), root)
under(box('围巾尾', (.12, .04, .26), (.16, -.19, 1.16), SCARF, .03, 3, rot=(0, .12, 0)), root)
under(box('背包', (.38, .16, .44), (0, .22, 1.02), PACK, .07, 4), root)
under(box('背包盖', (.4, .18, .14), (0, .23, 1.2), mat('背包盖', '#9a6d38', .7), .05, 3), root)
under(box('小灯', (.09, .09, .12), (.2, .31, .92), mat('灯芯', '#fff1c8', .4, emit='#ffd27a'), .03, 2), root)
# 头（大头，支点在脖子）
head = empty('空空/头', (0, 0, 1.36), root)
under(box('头', (.56, .52, .5), (0, -.01, 1.62), SKIN, .16, 6), head)
under(box('头发', (.6, .56, .2), (0, .01, 1.84), HAIR, .09, 5), head)
under(box('后脑发', (.6, .14, .36), (0, .23, 1.68), HAIR, .06, 4), head)
under(box('刘海', (.5, .06, .1), (0, -.27, 1.8), HAIR, .04, 3), head)
under(box('呆毛', (.05, .05, .16), (.04, .02, 2.0), HAIR, .02, 2, rot=(0, .35, 0)), head)
for s in (-1, 1):
    under(box('眼', (.07, .03, .11), (.12 * s, -.275, 1.62), INK, .03, 4), head)
    under(ball('眼光', .018, (.12 * s + .012, -.292, 1.65), WHITE), head)
    under(ball('脸红', .045, (.2 * s, -.272, 1.53), BLUSH, scale=(1.3, .25, .8)), head)
    under(box('鬓角', (.06, .5, .2), (.29 * s, .02, 1.72), HAIR, .03, 3), head)
under(box('嘴', (.09, .02, .025), (0, -.272, 1.49), mat('嘴', '#8a3b2e', .5), .01, 2), head)

# 预览 + 导出
bpy.ops.object.camera_add(location=(1.6, -3.2, 1.9)); cam = bpy.context.active_object; scene.camera = cam; cam.data.lens = 55
from mathutils import Vector
d = Vector((0, 0, 1.0)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.light_add(type='SUN', location=(4, -3, 8)); sun = bpy.context.active_object; sun.data.energy = 3.2; sun.rotation_euler = (math.radians(50), 0, math.radians(35))
bpy.ops.mesh.primitive_plane_add(size=8); g = bpy.context.active_object; g.data.materials.append(mat('预览草', '#6aa84f', .9))
world = bpy.data.worlds.new('天'); scene.world = world; world.use_nodes = True; world.node_tree.nodes['Background'].inputs['Color'].default_value = lin('#cfe4f2')
scene.render.engine = 'BLENDER_EEVEE'; scene.render.resolution_x, scene.render.resolution_y = 900, 1000; scene.view_settings.view_transform = 'AgX'
scene.render.filepath = os.path.join(OUT, 'preview.png'); bpy.ops.render.render(write_still=True)
for o in (cam, sun, g): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'kong.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'kong.glb'), export_format='GLB', export_apply=True, export_yup=True)
print('完成', len(bpy.data.objects))
