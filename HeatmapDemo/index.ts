import * as Cesium from 'cesium'
import { CesiumHeatmapClass, type IDefalutOption } from '../src/plugins/cesiumHeatMap'
import GUI from 'lil-gui'

export const init = async (element: HTMLDivElement) => {
  const viewer = new Cesium.Viewer(element, {
    baseLayer: Cesium.ImageryLayer.fromProviderAsync(
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
      )
    ),
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    vrButton: false,
    scene3DOnly: true,
    infoBox: false
  })

  const bounds = {
    west: 118.8135860288529,
    east: 118.9463913339937,
    south: 34.982213487281605,
    north: 35.04282012911281
  }

  // 连续「面」效果三要素（heatmap.js 模型）：
  // 1) blur 接近 1：径向渐变几乎占满半径，实心核极小，边缘柔和融合
  // 2) radius 足够大：相对画布宽度，使相邻点大量重叠、alpha 叠加成连续场
  // 3) 渐变色阶足够密：避免色带断层
  const heatmapOptions: IDefalutOption = {
    maxOpacity: 0.75,
    minOpacity: 0.05,
    blur: 0.92,
    gradient: {
      0: 'rgb(8,29,88)',
      0.15: 'rgb(37,52,148)',
      0.3: 'rgb(34,94,168)',
      0.45: 'rgb(29,145,192)',
      0.55: 'rgb(65,182,196)',
      0.65: 'rgb(127,205,187)',
      0.75: 'rgb(199,233,180)',
      0.85: 'rgb(253,231,37)',
      0.95: 'rgb(252,78,42)',
      1: 'rgb(128,0,38)'
    },
    onExtremaChange: () => {},
    radius: 165
  }

  function generateData(count: number) {
    const data = []
    for (let i = 0; i < count; i++) {
      data.push({
        x: bounds.west + Math.random() * (bounds.east - bounds.west),
        y: bounds.south + Math.random() * (bounds.north - bounds.south),
        value: Math.random() * 3
      })
    }
    return data
  }

  let currentInstance: ReturnType<typeof CesiumHeatmapClass.create> | null = null

  function renderHeatmap(
    mode: 'standard' | 'raster',
    data: Array<{ x: number; y: number; value: number }>
  ) {
    if (currentInstance) {
      currentInstance.show(false)
      viewer.entities.removeAll()
    }

    const hm = CesiumHeatmapClass.create(viewer, bounds, { ...heatmapOptions })
    currentInstance = hm

    const t0 = performance.now()
    if (mode === 'raster') {
      hm.rasterSetWGS84Data(0, 3, data, { id: 'heatmap-raster' })
    } else {
      hm.setWGS84Data(0, 3, data, { id: 'heatmap-standard' })
    }
    return performance.now() - t0
  }

  const initData = generateData(1000)
  const initTime = renderHeatmap('standard', initData)

  const params = {
    method: 'standard' as 'standard' | 'raster',
    dataPoints: 1000,
    standardTime: `${Math.round(initTime * 100) / 100} ms`,
    rasterTime: '-',
    speedup: '-',
    render: () => {
      const data = generateData(params.dataPoints)
      const ms = renderHeatmap(params.method, data)
      const display = `${Math.round(ms * 100) / 100} ms`
      if (params.method === 'standard') {
        params.standardTime = display
        standardCtrl.updateDisplay()
      } else {
        params.rasterTime = display
        rasterCtrl.updateDisplay()
      }
    },
    benchmark: () => {
      const data = generateData(params.dataPoints)

      if (currentInstance) {
        currentInstance.show(false)
        viewer.entities.removeAll()
      }
      const hm1 = CesiumHeatmapClass.create(viewer, bounds, { ...heatmapOptions })
      const t0 = performance.now()
      hm1.setWGS84Data(0, 3, data, { id: 'bench-std' })
      const stdMs = performance.now() - t0
      hm1.show(false)
      viewer.entities.removeAll()

      const hm2 = CesiumHeatmapClass.create(viewer, bounds, { ...heatmapOptions })
      currentInstance = hm2
      const t1 = performance.now()
      hm2.rasterSetWGS84Data(0, 3, data, { id: 'bench-raster' })
      const rasterMs = performance.now() - t1

      params.standardTime = `${Math.round(stdMs * 100) / 100} ms`
      params.rasterTime = `${Math.round(rasterMs * 100) / 100} ms`
      params.speedup = rasterMs > 0
        ? `${Math.round((stdMs / rasterMs) * 100) / 100}x`
        : '-'

      standardCtrl.updateDisplay()
      rasterCtrl.updateDisplay()
      speedupCtrl.updateDisplay()
    }
  }

  const gui = new GUI({ title: 'Heatmap 控制面板' })
  gui.add(params, 'method', {
    '标准渲染（Canvas API）': 'standard',
    '加速渲染（位图法）': 'raster'
  }).name('渲染方式')
  gui.add(params, 'dataPoints', {
    '500 点': 500,
    '1000 点': 1000,
    '2000 点': 2000,
    '5000 点': 5000
  }).name('数据点数')
  gui.add(params, 'render').name('▶ 渲染')
  gui.add(params, 'benchmark').name('⚡ 性能对比')
  const standardCtrl = gui.add(params, 'standardTime').name('标准耗时').disable()
  const rasterCtrl = gui.add(params, 'rasterTime').name('位图耗时').disable()
  const speedupCtrl = gui.add(params, 'speedup').name('加速比').disable()

  return viewer
}
