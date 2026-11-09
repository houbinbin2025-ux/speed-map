# 去掉三条送粮传送带（Ben 11-09：改成小路），其余不动，重新导出
import bpy, sys, os
OUT = sys.argv[sys.argv.index('--') + 1]; os.makedirs(OUT, exist_ok=True)
roots = [o for o in bpy.data.objects if o.name.startswith('传送带')]
print('传送带根节点', [o.name for o in roots])
gone = set()
for r in roots:
    stack = [r]
    while stack:
        o = stack.pop(); gone.add(o); stack.extend(o.children)
n = len(gone)
for o in gone: bpy.data.objects.remove(o, do_unlink=True)
print('删除对象', n)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'park2.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'park2.glb'), export_format='GLB', export_apply=True, export_yup=True)
print('完成')
