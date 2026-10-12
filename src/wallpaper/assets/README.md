# 壁纸素材目录

将以下两个文件放入本目录，`index.html` 会自动切换到"图片 + 深度图"视差模式：

- `scene.png` —— 4K 场景底图（构图要求：强前/中/远分层，避免人脸，见 docs/DESIGN.md §5.2）
- `depth.png` —— 对应深度图（近=白 / 远=黑；推荐本地跑 Depth-Anything V2 生成）

T1 起的完整风格包结构（每包 4 季底图 + 共享深度图 + pack.json）见 docs/DESIGN.md §5.1。
