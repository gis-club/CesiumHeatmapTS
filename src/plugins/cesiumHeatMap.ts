import * as Cesium from 'cesium'

interface IDictionary {
  [key: number]: string;
}

interface ICoordinates {
  x: number
  y: number
  value?: number
  radius?: number
}

interface IStore {
  min: number
  max: number
  data?: Array<number>[]
  radius?: Array<number>[]
}

interface ISetData {
  min: number
  max: number
  data: Array<ICoordinates>,
}

interface ID {
  id: string
}

 interface IDefaultConfig {
  useEntitiesIfAvailable: boolean; // whether to use entities if a Viewer is supplied or always use an ImageryProvider
  minCanvasSize: number; // minimum size (in pixels) for the heatmap canvas
  maxCanvasSize: number; // maximum size (in pixels) for the heatmap canvas
  radiusFactor: number; // data point size factor used if no radius is given (the greater of height and width divided by this number yields the used radius)
  spacingFactor: number; // extra space around the borders (point radius multiplied by this number yields the spacing)
  maxOpacity: number; // the maximum opacity used if not given in the heatmap options object
  minOpacity: number; // the minimum opacity used if not given in the heatmap options object
  blur: number; // the blur used if not given in the heatmap options object
  gradient: {
    // the gradient used if not given in the heatmap options object
    '.3': 'blue';
    '.65': 'yellow';
    '.8': 'orange';
    '.95': 'red';
  };
}

export interface IDefalutOption {
  container?: HTMLDivElement; //  *required* A DOM node where the heatmap canvas should be appended (heatmap will adapt to the node's size)
  backgroundColor?: string; //* optional* A background color string in form of hexcode, color name, or rgb(a)
  gradient?: IDictionary; // *optional* An object that represents the gradient (syntax: number string [0,1] : color string), check out the example
  radius?: number; // *optional* The radius each datapoint will have (if not specified on the datapoint itself)
  opacity?: number; // [0,1] *optional*  default = .6 A global opacity for the whole heatmap. This overrides maxOpacity and minOpacity if set!
  maxOpacity?: number; // [0,1] *optional* The maximal opacity the highest value in the heatmap will have. (will be overridden if opacity set)
  minOpacity?: number; // [0,1] *optional* The minimum opacity the lowest value in the heatmap will have (will be overridden if opacity set)
  onExtremaChange(obj?:object):void; // callback Pass a callback to receive extrema change updates. Useful for DOM legends.
  blur?: number; // [0,1] *optional* default = 0.85 The blur factor that will be applied to all datapoints. The higher the blur factor is, the smoother the gradients will be
  xField?: string; // *optional* default = "x" The property name of your x coordinate in a datapoint
  yField?: string; // *optional* default = "y" The property name of your y coordinate in a datapoint
  valueField?: string; // *optional* default = "value" The property name of your y coordinate in a datapoint
}

interface IDefalutOption2 {
  defaultRadius: number
  defaultRenderer: string
  defaultGradient: IDictionary
  defaultMaxOpacity: number
  defaultMinOpacity: number
  defaultBlur: number
  defaultXField: string
  defaultYField: string
  defaultValueField: string
  plugins: object
}

interface AllOption extends IDefalutOption, IDefalutOption2 {
}

interface IBounding {
  north: number;
  east: number;
  south: number;
  west: number;
}

const option2: IDefalutOption2 = {
  defaultRadius: 40,
  defaultRenderer: 'canvas2d',
  defaultGradient: {
    0.25: 'rgb(0,0,255)',
    0.55: 'rgb(0,255,0)',
    0.85: 'yellow',
    1: 'rgb(255,0,0)'
  },
  defaultMaxOpacity: 1,
  defaultMinOpacity: 0,
  defaultBlur: 0.85,
  defaultXField: 'x',
  defaultYField: 'y',
  defaultValueField: 'value',
  plugins: {}
}

const instanceOfA = (object: object): object is IDefalutOption2 => {
  return 'defaultGradient' in object
}

const create = (a: IDefalutOption) => {
  return new HeatmapClass(a)
}

class CoordinatorClass {
  cStore: any

  constructor () {
    this.cStore = {}
  }

  on (evtName: string, callback: any, scope?: any) {
    const cStore = this.cStore
    if (!cStore[evtName]) {
      cStore[evtName] = []
    }
    cStore[evtName].push(function (data: IStore) {
      return callback.call(scope, data)
    })
  }

  emit (evtName: string, data: IStore) {
    const cStore = this.cStore
    if (cStore[evtName]) {
      const len = cStore[evtName].length
      for (let i = 0; i < len; i++) {
        const callback = cStore[evtName][i]
        callback(data)
      }
    }
  }
}

class StoreClass {
  radius: number
  _min: number
  _max: number
  _data: Array<number>[]
  radiusArr: Array<number>[]
  _coordinator!: CoordinatorClass
  _xField: string
  _yField: string
  _valueField: string | undefined
  _cfgRadius: number

  constructor (options: IDefalutOption2 | IDefalutOption) {
    if (instanceOfA(options)) {
      this.radius = options.defaultRadius
      this._xField = options.defaultXField
      this._yField = options.defaultYField
      this._valueField = options.defaultValueField
      this._cfgRadius = 0
    } else {
      this.radius = options.radius ? options.radius : 0
      this._xField = options.xField ? options.xField : 'x'
      this._yField = options.yField ? options.yField : 'y'
      this._valueField = options.valueField
      this._cfgRadius = options.radius ? options.radius : 0
    }
    this._min = 0
    this._max = 1
    this._data = []
    this.radiusArr = []
  }

  _organiseData (a:ICoordinates, b:boolean) {
    const d = a.x
    const e = a.y
    const f = this.radiusArr
    const g = this._data
    const h = this._max
    const i = this._min
    const j = a.value || 0
    const k = this._cfgRadius || this.radius
    if (!g[d]) {
      g[d] = []
      f[d] = []
    }
    if (!g[d][e]) {
      g[d][e] = j
      f[d][e] = k
    } else {
      g[d][e] += j
    }
    if (g[d][e] > h) {
      if (!b) {
        this._max = g[d][e]
      } else {
        this.setDataMax(g[d][e])
      }
      return false
    } else {
      return { x: d, y: e, value: j, radius: k, min: i, max: h }
    }
  }

  _unOrganizeData () {
    const a = []
    for (const d in this._data) {
      for (const e in this._data[d]) {
        a.push({ x: d, y: e, radius: this.radiusArr[d][e], value: this._data[d][e] })
      }
    }
    return { min: this._min, max: this._max, data: a }
  }

  _onExtremaChange () {
    this._coordinator.emit('extremachange', {
      min: this._min,
      max: this._max
    })
  }

  setData (obj:ISetData) {
    const b = obj.data
    const c = b.length
    this._data = []
    this.radiusArr = []
    for (let d = 0; d < c; d++) {
      this._organiseData(b[d], false)
    }
    this._max = obj.max
    this._min = obj.min || 0
    this._onExtremaChange()
    this._coordinator.emit('renderall', this._getInternalData())
    return this
  }

  setDataMax (max:number) {
    this._max = max
    this._onExtremaChange()
    this._coordinator.emit('renderall', this._getInternalData())
    return this
  }

  setDataMin (min:number) {
    this._min = min
    this._onExtremaChange()
    this._coordinator.emit('renderall', this._getInternalData())
    return this
  }

  setCoordinator (coordinator: CoordinatorClass) {
    this._coordinator = coordinator
  }

  _getInternalData (): IStore {
    return {
      max: this._max,
      min: this._min,
      data: this._data,
      radius: this.radiusArr
    }
  }

  getData () {
    return this._unOrganizeData()
  }
}

class RendererClass {
  shadowCanvas: HTMLCanvasElement
  canvas: HTMLCanvasElement
  _renderBoundaries: number[]
  _width: number
  _height: number
  shadowCtx: CanvasRenderingContext2D
  ctx: CanvasRenderingContext2D
  _palette: Uint8ClampedArray
  _templates!: HTMLCanvasElement
  _blur!: number
  _opacity!: number
  _maxOpacity!: number
  _minOpacity!: number
  _useGradientOpacity!: boolean
  _min!:number
  _max!:number

  constructor (allOption: AllOption) {
    const container = allOption.container ? allOption.container : document.createElement('div')
    this.shadowCanvas = document.createElement('canvas')
    this.canvas = document.createElement('canvas')
    this._renderBoundaries = [1e4, 1e4, 0, 0]
    const g = getComputedStyle(container) || {}
    this.canvas.className = 'heatmap-canvas'
    this._width = this.canvas.width = this.shadowCanvas.width = +g.width.replace(/px/, '')
    this._height = this.canvas.height = this.shadowCanvas.height = +g.height.replace(/px/, '')
    this.shadowCtx = this.shadowCanvas.getContext('2d')!
    this.ctx = this.canvas.getContext('2d')!
    this.canvas.style.cssText = this.shadowCanvas.style.cssText = 'position:absolute;left:0;top:0;'
    container.style.position = 'relative'
    container.appendChild(this.canvas)
    this._palette = this.setImage(allOption)
    this._setStyles(allOption)
  }

  setImage (a: AllOption): Uint8ClampedArray {
    let b: IDictionary
    if (a.gradient) {
      b = a.gradient
    } else {
      b = a.defaultGradient
    }
    const c = document.createElement('canvas')
    const d = c.getContext('2d')
    let image:Uint8ClampedArray
    if (d) {
      c.width = 256
      c.height = 1
      const e = d.createLinearGradient(0, 0, 256, 1)
      for (const f in b) {
        if (b) {
          e?.addColorStop(Number(f), b[f])
        }
      }
      d.fillStyle = e
      d.fillRect(0, 0, 256, 1)
      image = d.getImageData(0, 0, 256, 1).data
    } else {
      image = new Uint8ClampedArray()
    }

    return image
  }

  setRect (a:number, b:number) {
    const c = document.createElement('canvas')
    const d = c.getContext('2d')
    const e = a
    const f = a
    c.width = c.height = a * 2
    if (d) {
      if (b === 1) {
        d.beginPath()
        d.arc(e, f, a, 0, 2 * Math.PI, false)
        d.fillStyle = 'rgba(0,0,0,1)'
        d.fill()
      } else {
        const g = d.createRadialGradient(e, f, a * b, e, f, a)
        g.addColorStop(0, 'rgba(0,0,0,1)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        d.fillStyle = g
        d.fillRect(0, 0, 2 * a, 2 * a)
      }
    }

    return c
  }

  c (a:IStore) {
    const b = []
    const c = a.min
    const d = a.max
    const e = a.radius
    const data = a.data
    const f = Object.keys(data as object)
    let g = f.length
    if (data && e) {
      while (g--) {
        const h = f[g]
        const i = Object.keys(data[Number(h)])
        let j = i.length
        while (j--) {
          const k = i[j]
          const l = data[Number(h)][Number(k)]
          const m = e[Number(h)][Number(k)]
          b.push({ x: Number(h), y: Number(k), value: l, radius: m })
        }
      }
    }

    return { min: c, max: d, data: b }
  }

  renderPartial (a:ISetData) {
    this._drawAlpha(a)
    this._colorize()
  }

  renderAll (a:IStore) {
    this._clear()
    this._drawAlpha(this.c(a))
    this._colorize()
  }

  setDimensions (a:number, b:number) {
    this._width = a
    this._height = b
    this.canvas.width = this.shadowCanvas.width = a
    this.canvas.height = this.shadowCanvas.height = b
  }

  _clear () {
    this.shadowCtx?.clearRect(0, 0, this._width, this._height)
    this.ctx?.clearRect(0, 0, this._width, this._height)
  }

  _setStyles (allOption: AllOption) {
    this._blur = allOption.blur === 0 ? 0 : allOption.blur || allOption.defaultBlur
    if (allOption.backgroundColor) {
      this.canvas.style.backgroundColor = allOption.backgroundColor
    }
    this._opacity = (allOption.opacity || 0) * 255
    this._maxOpacity = (allOption.maxOpacity || allOption.defaultMaxOpacity) * 255
    this._minOpacity = (allOption.minOpacity || allOption.defaultMinOpacity) * 255
    this._useGradientOpacity = !('useGradientOpacity' in allOption)
  }

  _drawAlpha (a:ISetData) {
    const c = (this._min = a.min)
    const d = (this._max = a.max)
    const data = a.data || []
    let e = data.length
    const f = 1 - this._blur
    while (e--) {
      const g = data[e]
      const h = g.x
      const i = g.y
      const j = g.radius!
      const k = Math.min(g.value!, d)
      const l = h - j
      const m = i - j
      const n = this.shadowCtx
      let o
      if (!this._templates) {
        this._templates = o = this.setRect(j, f)
      } else {
        o = this._templates
      }
      n.globalAlpha = (k - c) / (d - c)
      n.drawImage(o, l, m)
      if (l < this._renderBoundaries[0]) {
        this._renderBoundaries[0] = l
      }
      if (m < this._renderBoundaries[1]) {
        this._renderBoundaries[1] = m
      }
      if (l + 2 * j > this._renderBoundaries[2]) {
        this._renderBoundaries[2] = l + 2 * j
      }
      if (m + 2 * j > this._renderBoundaries[3]) {
        this._renderBoundaries[3] = m + 2 * j
      }
    }
  }

  _colorize () {
    let a = this._renderBoundaries[0]
    let b = this._renderBoundaries[1]
    let c = this._renderBoundaries[2] - a
    let d = this._renderBoundaries[3] - b
    const e = this._width
    const f = this._height
    const g = this._opacity
    const h = this._maxOpacity
    const i = this._minOpacity
    const j = this._useGradientOpacity
    if (a < 0) {
      a = 0
    }
    if (b < 0) {
      b = 0
    }
    if (a + c > e) {
      c = e - a
    }
    if (b + d > f) {
      d = f - b
    }
    const k = this.shadowCtx.getImageData(a, b, c, d)
    const l = k.data
    const m = l.length
    const n = this._palette
    for (let o = 3; o < m; o += 4) {
      const p = l[o]
      const q = p * 4
      if (!q) {
        continue
      }
      let r
      if (g > 0) {
        r = g
      } else {
        if (p < h) {
          if (p < i) {
            r = i
          } else {
            r = p
          }
        } else {
          r = h
        }
      }
      l[o - 3] = n[q]
      l[o - 2] = n[q + 1]
      l[o - 1] = n[q + 2]
      l[o] = j ? n[q + 3] : r
    }
    this.ctx.putImageData(k, a, b)
    this._renderBoundaries = [1e3, 1e3, 0, 0]
  }

  getDataURL () {
    return this.canvas.toDataURL()
  }
}

class HeatmapClass {
  _coordinator!: CoordinatorClass
  _config: AllOption
  _renderer: RendererClass
  _store: StoreClass

  constructor (option: IDefalutOption) {
    this._config = { ...option2, ...option }
    this._coordinator = new CoordinatorClass()

    this._renderer = new RendererClass(this._config)
    this._store = new StoreClass(this._config)

    this._coordinator.on('renderpartial', this._renderer.renderPartial, this._renderer)
    this._coordinator.on('renderall', this._renderer.renderAll, this._renderer)
    this._store.setCoordinator(this._coordinator)
  }

  setData (obj:ISetData) {
    this._store.setData(obj)
    return this
  }

  setDataMax (max: number) {
    this._store.setDataMax(max)
    return this
  }

  setDataMin (min:number) {
    this._store.setDataMin(min)
    return this
  }

  repaint () {
    this._coordinator.emit('renderall', this._store._getInternalData())
    return this
  }

  getData () {
    return this._store.getData()
  }

  getDataURL () {
    return this._renderer.getDataURL()
  }
}

/*  Initiate a CesiumHeatmap instance
 *
 *  c:  CesiumViewer instance
 *  bb: a WGS84 bounding box like {north, east, south, west}
 *  o:  a heatmap.js options object (see http://www.patrick-wied.at/static/heatmapjs/docs.html#h337-create)
 */
class CHInstanceClass {
  _cesium!: Cesium.Viewer;
  _options!: IDefalutOption;
  _id!: string;
  _mbounds: IBounding;
  width!: number;
  height!: number;
  _factor!: number;
  _spacing: number;
  _xoffset: number;
  _yoffset: number;
  bounds: IBounding;
  _rectangle: Cesium.Rectangle;
  _container: HTMLDivElement;
  _heatmap!: HeatmapClass
  _layer!:Cesium.Entity

  constructor (viewer: Cesium.Viewer, bb: IBounding, o: IDefalutOption) {
    this._cesium = viewer
    this._options = o
    this._id = CesiumHeatmapClass._getID(0)
    this._mbounds = CesiumHeatmapClass.wgs84ToMercatorBB(bb)
    this._setWidthAndHeight(this._mbounds)

    this._options.radius = Math.round(
      this._options.radius
        ? this._options.radius
        : this.width > this.height
          ? this.width / defaults.radiusFactor
          : this.height / defaults.radiusFactor
    )

    this._spacing =
      this._options.radius * defaults.spacingFactor
    this._xoffset = this._mbounds.west
    this._yoffset = this._mbounds.south

    this.width = Math.round(this.width + this._spacing * 2)
    this.height = Math.round(this.height + this._spacing * 2)

    this._mbounds.west -= this._spacing * this._factor
    this._mbounds.east += this._spacing * this._factor
    this._mbounds.south -= this._spacing * this._factor
    this._mbounds.north += this._spacing * this._factor

    this.bounds = CesiumHeatmapClass.mercatorToWgs84BB(this._mbounds)

    this._rectangle = Cesium.Rectangle.fromDegrees(
      this.bounds.west,
      this.bounds.south,
      this.bounds.east,
      this.bounds.north
    )
    this._container = CesiumHeatmapClass._getContainer(
      this.width,
      this.height,
      this._id
    )
    this._options.container = this._container
    this._heatmap = create(this._options)
    this._container.children[0].setAttribute('id', this._id + '-hm')
  }

  /*  Update/(re)draw the heatmap
   */
  updateLayer (obj: ID) {
    // only works with a Viewer instance since the cesiumWidget
    // instance doesn't contain an entities property

    // Work around issue with material rendering in Cesium
    // provided by https://github.com/criis
    const material = new Cesium.ImageMaterialProperty({
      image: this._heatmap._renderer.canvas,
      transparent: true,
      color: Cesium.Color.WHITE.withAlpha(0.7)
    })

    this._layer = this._cesium.entities.add({
      // fixme 加一个属性入参
      show: true,
      rectangle: {
        coordinates: this._rectangle,
        material: material
      }
    })
    this._cesium.camera.flyTo({
      destination: this._rectangle
    })
    // this._layer.id = obj.id
  }

  /*  Set whether or not the heatmap is shown on the map
   *
   *  s: true means the heatmap is shown, false means the heatmap is hidden
   */
  show (flag:boolean) {
    if (this._layer) {
      this._layer.show = flag
    }
  }

  /*  Convert a WGS84 location to the corresponding heatmap location
   *
   *  p: a WGS84 location like {x:lon, y:lat}
   */
  wgs84PointToHeatmapPoint (p:ICoordinates) {
    return this.mercatorPointToHeatmapPoint(CesiumHeatmapClass.wgs84ToMercator(p))
  }

  /*  Convert a mercator location to the corresponding heatmap location
   *
   *  p: a WGS84 location like {x: lon, y:lat}
   */
  mercatorPointToHeatmapPoint (p:ICoordinates) {
    const pn: ICoordinates = {
      x: 0,
      y: 0
    }

    pn.x = Math.round((p.x - this._xoffset) / this._factor + this._spacing)
    pn.y = Math.round((p.y - this._yoffset) / this._factor + this._spacing)
    pn.y = this.height - pn.y

    return pn
  }

  _setWidthAndHeight (mbb:IBounding) {
    this.width =
      mbb.east > 0 && mbb.west < 0
        ? mbb.east + Math.abs(mbb.west)
        : Math.abs(mbb.east - mbb.west)
    this.height =
      mbb.north > 0 && mbb.south < 0
        ? mbb.north + Math.abs(mbb.south)
        : Math.abs(mbb.north - mbb.south)
    this._factor = 1

    if (
      this.width > this.height &&
      this.width > defaults.maxCanvasSize
    ) {
      this._factor = this.width / defaults.maxCanvasSize

      if (
        this.height / this._factor <
        defaults.minCanvasSize
      ) {
        this._factor = this.height / defaults.minCanvasSize
      }
    } else if (
      this.height > this.width &&
      this.height > defaults.maxCanvasSize
    ) {
      this._factor = this.height / defaults.maxCanvasSize

      if (
        this.width / this._factor <
        defaults.minCanvasSize
      ) {
        this._factor = this.width / defaults.minCanvasSize
      }
    } else if (
      this.width < this.height &&
      this.width < defaults.minCanvasSize
    ) {
      this._factor = this.width / defaults.minCanvasSize

      if (
        this.height / this._factor >
        defaults.maxCanvasSize
      ) {
        this._factor = this.height / defaults.maxCanvasSize
      }
    } else if (
      this.height < this.width &&
      this.height < defaults.minCanvasSize
    ) {
      this._factor = this.height / defaults.minCanvasSize

      if (
        this.width / this._factor >
        defaults.maxCanvasSize
      ) {
        this._factor = this.width / defaults.maxCanvasSize
      }
    }

    this.width = this.width / this._factor
    this.height = this.height / this._factor
  }

  /*  Set an array of heatmap locations
   *
   *  min:  the minimum allowed value for the data values
   *  max:  the maximum allowed value for the data values
   *  data: an array of data points in heatmap coordinates and values like {x, y, value}
   */
  setData (min: number, max: number, data: Array<ICoordinates>, obj: ID) {
    if (data && data.length > 0) {
      this._heatmap.setData({
        min: min,
        max: max,
        data: data
      })

      this.updateLayer(obj)
      return true
    }

    return false
  }

  /*  Set an array of WGS84 locations
   *
   *  min:  the minimum allowed value for the data values
   *  max:  the maximum allowed value for the data values
   *  data: an array of data points in WGS84 coordinates and values like { x:lon, y:lat, value }
   */
  setWGS84Data (min: number, max: number, data: Array<ICoordinates>, obj: ID) {
    if (data && data.length > 0) {
      const convdata = []

      for (let i = 0; i < data.length; i++) {
        const gp = data[i]

        const hp = this.wgs84PointToHeatmapPoint(gp)
        if (gp.value || gp.value === 0) {
          hp.value = gp.value
        }

        convdata.push(hp)
      }

      return this.setData(min, max, convdata, obj)
    }

    return false
  }
}

const defaults:IDefaultConfig = {
  useEntitiesIfAvailable: true,
  minCanvasSize: 700,
  maxCanvasSize: 2000,
  radiusFactor: 60,
  spacingFactor: 1.5,
  maxOpacity: 0.8,
  minOpacity: 0.1,
  blur: 0.85,
  gradient: {
    '.3': 'blue',
    '.65': 'yellow',
    '.8': 'orange',
    '.95': 'red'
  }
}

export class CesiumHeatmapClass {
  static WMP: Cesium.WebMercatorProjection;

  static create (viewer: Cesium.Viewer, bb: IBounding, options: IDefalutOption) {
    CesiumHeatmapClass.WMP = new Cesium.WebMercatorProjection()
    const instance = new CHInstanceClass(viewer, bb, options)
    return instance
  }

  /*  Create a CesiumHeatmap instance
   *
   *  cesium:  the CesiumWidget or Viewer instance
   *  bb:      the WGS84 bounding box like {north, east, south, west}
   *  options: a heatmap.js options object (see http://www.patrick-wied.at/static/heatmapjs/docs.html#h337-create)
   */
  static _getID (len: number) {
    let text = ''
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < (len || 8); i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }

    return text
  }

  /*  Convert radians into degrees
   *
   *  r: the radians to be converted to degrees
   */
  static rad2deg (r: number): number {
    const d = r / (Math.PI / 180.0)
    return d
  }

  /*  Convert a mercator bounding box into a WGS84 bounding box
   *
   *  bb: the mercator bounding box like {north, east, south, west}
   */
  static mercatorToWgs84BB (bb: IBounding): IBounding {
    const sw = this.WMP.unproject(new Cesium.Cartesian3(bb.west, bb.south))
    const ne = this.WMP.unproject(new Cesium.Cartesian3(bb.east, bb.north))
    return {
      north: this.rad2deg(ne.latitude),
      east: this.rad2deg(ne.longitude),
      south: this.rad2deg(sw.latitude),
      west: this.rad2deg(sw.longitude)
    }
  }

  /*  Convert a WGS84 bounding box into a mercator bounding box
   *
   *  bb: the WGS84 bounding box like {north, east, south, west}
   */
  static wgs84ToMercatorBB (bb: IBounding): IBounding {
    const sw = this.WMP.project(
      Cesium.Cartographic.fromDegrees(bb.west, bb.south)
    )
    const ne = this.WMP.project(
      Cesium.Cartographic.fromDegrees(bb.east, bb.north)
    )
    return {
      north: ne.y,
      east: ne.x,
      south: sw.y,
      west: sw.x
    }
  }

  static _getContainer (
    width: number,
    height: number,
    id: string
  ): HTMLDivElement {
    const c = document.createElement('div')
    if (id) {
      c.setAttribute('id', id)
    }
    c.setAttribute(
      'style',
      'width: ' +
      width +
      'px; height: ' +
      height +
      'px; margin: 0px; display: none;'
    )
    document.body.appendChild(c)
    return c
  }

  /*  Convert a WGS84 location into a mercator location
       *
       *  p: the WGS84 location like {x: lon, y: lat}
       */
  static wgs84ToMercator (p:ICoordinates) {
    const mp = this.WMP.project(Cesium.Cartographic.fromDegrees(p.x, p.y))
    return {
      x: mp.x,
      y: mp.y
    }
  }

  /*  Convert a mercator location into a WGS84 location
         *
         *  p: the mercator lcation like {x, y}
         */
  static mercatorToWgs84 (p:ICoordinates) {
    const wp = this.WMP.unproject(new Cesium.Cartesian3(p.x, p.y))
    return {
      x: wp.longitude,
      y: wp.latitude
    }
  }

  /*  Convert degrees into radians
         *
         *  d: the degrees to be converted to radians
         */
  deg2rad (d:number) {
    const r = d * (Math.PI / 180.0)
    return r
  }
}
