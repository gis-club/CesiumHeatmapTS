# CesiumHeatmapTS

Cesium 热力图 TypeScript 版本，基于 [CesiumHeatmap](https://github.com/manuelnas/CesiumHeatmap) 和 [heatmap.js](https://github.com/pa7/heatmap.js) 重写。

新增 **位图加速渲染** 模式（参考 [KrigingTS](https://github.com/gis-club/KrigingTS) 中的 `rasterGrid` 位图 PIP 思路），
在大量数据点场景下性能显著优于标准 Canvas API 渲染。

## 安装与运行

```bash
npm install
npm run dev
```

## 项目结构

```
├── cesiumHeatMap.ts           # 核心库（标准渲染 + 位图加速渲染）
├── HeatmapDemo/
│   ├── index.ts               # Demo 入口逻辑 + lil-gui 控制面板
│   └── HeatmapDemo.vue        # Demo 组件
├── src/
│   ├── main.ts                # Vue 入口
│   ├── App.vue                # 根组件
│   └── vite-env.d.ts          # Vite 类型声明
├── index.html                 # HTML 入口
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## API

### 标准渲染（Canvas API）

```typescript
import { CesiumHeatmapClass, IDefalutOption } from './cesiumHeatMap'

const heatMap = CesiumHeatmapClass.create(viewer, bounds, options)
heatMap.setWGS84Data(min, max, data, { id: 'myHeatmap' })
```

### 位图加速渲染（Raster）

```typescript
const heatMap = CesiumHeatmapClass.create(viewer, bounds, options)
heatMap.rasterSetWGS84Data(min, max, data, { id: 'myHeatmap' })
```

### 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `viewer` | `Cesium.Viewer` | Cesium Viewer 实例 |
| `bounds` | `{ north, east, south, west }` | WGS84 边界框 |
| `options` | `IDefalutOption` | 热力图配置（渐变色、透明度、模糊度、半径等） |
| `min` | `number` | 数据最小值 |
| `max` | `number` | 数据最大值 |
| `data` | `Array<{ x, y, value }>` | 数据点数组（x=经度, y=纬度） |

### 数据格式

```typescript
const data = [
  { x: 118.85, y: 35.01, value: 1.5 },
  { x: 118.90, y: 35.02, value: 2.3 },
  // ...
]
```

## 标准渲染 vs 位图加速渲染

| 对比项 | `setWGS84Data`（标准） | `rasterSetWGS84Data`（位图加速） |
|--------|------------------------|----------------------------------|
| 绘制方式 | 每个数据点调用 Canvas `drawImage` + `globalAlpha` | 预计算位图核 Float32Array，直接数组索引累加 |
| 合成方式 | Canvas `source-over` 合成（浏览器内部实现） | TypedArray 上手动 Porter-Duff over 合成 |
| 调色方式 | `getImageData` 读回 → 遍历像素 → `putImageData` | 直接从 float buffer 映射调色板 → 一次 `putImageData` |
| Canvas API 调用 | N 次 `drawImage` + 1 次 `getImageData` + 1 次 `putImageData` | 0 次 `drawImage` + 0 次 `getImageData` + 1 次 `putImageData` |
| 核函数 | 每个半径创建一个离屏 Canvas | 每个半径创建一个 Float32Array（缓存复用） |
| 内存模式 | Canvas 对象 + 像素 readback | 连续 TypedArray，CPU 缓存友好 |

### 性能优势来源

1. **消除 Canvas API 开销**：标准方式每个数据点需 `drawImage` + `globalAlpha` 状态切换；位图法全程零 Canvas 绘图 API 调用
2. **消除像素读回**：标准方式需 `getImageData` 从 GPU 读回像素；位图法直接在 CPU 端 TypedArray 累加
3. **缓存友好**：Float32Array 连续内存布局，CPU 缓存命中率远高于 Canvas 内部像素操作
4. **核函数复用**：同半径的位图核只计算一次，缓存后 O(1) 查找

## Demo 控制面板

运行 `npm run dev` 后，右上角 lil-gui 面板提供：

- **渲染方式**：切换标准渲染 / 位图加速渲染
- **数据点数**：100 / 500 / 1000 / 5000
- **渲染**：执行单次渲染并显示耗时
- **性能对比**：使用相同数据集依次执行标准和位图渲染，显示两者耗时及加速比

## 构建与部署

```bash
npm run build
npm run preview
```

GitHub Pages 自动部署：推送到 `master`/`main` 分支即触发 Actions 构建部署。
