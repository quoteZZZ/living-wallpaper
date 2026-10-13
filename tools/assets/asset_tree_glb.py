# 程序化生成低模树 GLB（spike 用，正式素材换 Quaternius）
# 用法: python tools/assets/asset_tree_glb.py
# 产出: app/assets/models/tree.glb（节点名 trunk / canopy*，Babylon 按名取材）
import os, math
import trimesh
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'app', 'assets', 'models')
os.makedirs(OUT, exist_ok=True)

scene = trimesh.Scene()

# 树干：圆锥台（底粗顶细）
trunk = trimesh.creation.cylinder(radius=0.09, height=1.15, sections=10)
# cylinder 沿 Z 轴，转正为沿 Y
trunk.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2, [1, 0, 0]))
trunk.apply_translation([0, 1.15/2, 0])
trunk.visual.vertex_colors = np.tile([92, 64, 51, 255], (len(trunk.vertices), 1))
trunk.apply_transform(trimesh.transformations.scale_matrix(1.25, [0, 0, 0], [1, 0, 0]))  # x/z 放大底部
scene.add_geometry(trunk, node_name='trunk', geom_name='trunk')

# 树冠：三个球叠加（低模 icosphere subdivisions=1，flat-shading 下呈宝石感）
rng = np.random.default_rng(7)
green = [63, 143, 79, 255]
canopy_id = 0
for (ox, oy, oz, r) in [(0, 1.55, 0, .52), (-0.28, 1.32, 0.1, .34), (0.30, 1.38, -0.08, .37)]:
    c = trimesh.creation.icosphere(subdivisions=1, radius=r)
    c.apply_translation([ox, oy, oz])
    jitter = np.clip(rng.uniform(-14, 14, 3), -14, 14).astype(np.int16) + np.array(green[:3], dtype=np.int16)
    col = np.clip(jitter, 0, 255).astype(np.uint8)
    c.visual.vertex_colors = np.tile(np.array(list(col) + [255], dtype=np.uint8), (len(c.vertices), 1))
    canopy_id += 1
    scene.add_geometry(c, node_name=f'canopy{canopy_id}', geom_name=f'canopy{canopy_id}')

out = os.path.join(OUT, 'tree.glb')
scene.export(out)
print('saved', out, os.path.getsize(out), 'bytes')
