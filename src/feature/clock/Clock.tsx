import { Gtk } from "ags/gtk4"
import giCairo from "cairo"
import Pango from "gi://Pango"
import PangoCairo from "gi://PangoCairo"

const TICK_COUNT = 60
const STEP = (Math.PI * 2) / TICK_COUNT

const enum Dir {
  Left = -1,
  Right = 1,
}

interface RingStyle {
  radius: number
  dir: Dir
  tickLength: number
  tickWidth: number
  activeTickLength: number
  activeTickWidth: number
  majorTickLength: number
  majorTickWidth: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  labelEvery: number
  labelGap: number
}

interface BoxStyle {
  width: number
  height: number
  cornerRadius: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  borderWidth: number
  borderColor: [number, number, number, number]
  bgColor: [number, number, number, number]
  textColor: [number, number, number, number]
  textOffsetX: number
  dividerWidth: number
  dividerHeight: number  // 0–1, доля от высоты бокса
  dividerColor: [number, number, number, number]
}

const lerpAngle = (current: number, target: number, alpha: number) => {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + diff * alpha
}

interface DrawCtx {
  cr: giCairo.Context
  layout: Pango.Layout
  now: Date
}

export function DrumClock() {
  let animSec = 0
  let animMin = 0
  let targetSec = 0
  let targetMin = 0
  let lastFrameTime = 0

  const ctx: DrawCtx = {
    cr: null as any,
    layout: null as any,
    now: new Date(),
  }

  const secRing: RingStyle = {
    radius: 700,
    dir: Dir.Left,
    tickLength: 10,
    tickWidth: 2,
    activeTickLength: 20,
    activeTickWidth: 3,
    majorTickLength: 20,
    majorTickWidth: 3,
    fontSize: 15,
    fontFamily: "Inter",
    fontWeight: "Black",
    labelEvery: 5,
    labelGap: -5,
  }

  const minRing: RingStyle = {
    radius: 450,
    dir: Dir.Left,
    tickLength: 15,
    tickWidth: 2,
    activeTickLength: 25,
    activeTickWidth: 3,
    majorTickLength: 25,
    majorTickWidth: 3,
    fontSize: 20,
    fontFamily: "Inter",
    fontWeight: "Black",
    labelEvery: 5,
    labelGap: -10,
  }

  const hourBox: BoxStyle = {
    width: 0,
    height: 120,
    cornerRadius: 60,
    fontSize: 120,
    fontFamily: "Inter",
    fontWeight: "Black",
    borderWidth: 3,
    borderColor: [1, 1, 1, 0.1],
    bgColor: [0.08, 0.08, 0.08, 0.4],
    textColor: [1, 1, 1, 0.8],
    textOffsetX: 350,
    dividerWidth: 2,
    dividerHeight: 0.6,
    dividerColor: [1, 1, 1, 0.2],
  }

  const roundedRect = (cr: giCairo.Context, x: number, y: number, w: number, h: number, r: number) => {
    cr.newSubPath()
    cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
    cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
    cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
    cr.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2)
    cr.closePath()
  }

  const makeFont = (family: string, weight: string, size: number) =>
    Pango.font_description_from_string(`${family} ${weight} ${size}`)

  const drawTick = (i: number, style: RingStyle, offset: number, active: boolean, major: boolean) => {
    const { cr } = ctx

    let length: number
    let width: number

    if (active) {
      length = style.activeTickLength
      width = style.activeTickWidth
    } else if (major) {
      length = style.majorTickLength
      width = style.majorTickWidth
    } else {
      length = style.tickLength
      width = style.tickWidth
    }

    cr.save()
    cr.setSourceRGBA(1, 1, 1, active ? 1 : major ? 0.2 : 0.2)
    cr.rotate(STEP * i + offset)
    cr.setLineWidth(width)
    cr.moveTo(style.radius * style.dir, 0)
    cr.lineTo((style.radius + length) * style.dir, 0)
    cr.stroke()
    cr.restore()
  }

  const drawLabel = (i: number, style: RingStyle, offset: number, active: boolean) => {
    const { cr, layout } = ctx
    const label = String(TICK_COUNT - i).padStart(2, "0")

    layout.set_text(label, -1)
    layout.set_font_description(makeFont(style.fontFamily, style.fontWeight, style.fontSize))

    const [, ext] = layout.get_pixel_extents()
    const ew = ext?.width ?? 0
    const eh = ext?.height ?? 0

    const textOffset = style.majorTickLength + style.labelGap + ew

    cr.save()
    cr.setSourceRGBA(1, 1, 1, active ? 1 : 0.2)
    cr.rotate(STEP * i + offset)
    cr.moveTo((style.radius + ((1 - style.dir) / 2) * ew - textOffset) * style.dir, -eh / 2)
    PangoCairo.show_layout(cr, layout)
    cr.restore()
  }

  const drawRing = (style: RingStyle, offset: number, currentTime: number) => {
    for (let i = 1; i <= TICK_COUNT; i++) {
      const active = currentTime === TICK_COUNT - i
      const major = i % style.labelEvery === 0
      drawTick(i, style, offset, active, major)

      if (major) {
        drawLabel(i, style, offset, active)
      }
    }
  }

  const drawHourBox = (style: BoxStyle) => {
    const { cr, layout, now } = ctx
    const hour = now.getHours().toString().padStart(2, "0")

    const x = -style.width / 2
    const y = -style.height / 2

    // Фон
    cr.save()
    roundedRect(cr, x, y, style.width, style.height, style.cornerRadius)
    cr.setSourceRGBA(...style.bgColor)
    cr.fill()
    cr.restore()

    // Border
    cr.save()
    roundedRect(cr, x, y, style.width, style.height, style.cornerRadius)
    cr.setSourceRGBA(...style.borderColor)
    cr.setLineWidth(style.borderWidth)
    cr.stroke()
    cr.restore()

    // Вертикальная полоска по центру
    if (style.dividerWidth > 0) {
      const lineH = style.height * style.dividerHeight
      cr.save()
      cr.setSourceRGBA(...style.dividerColor)
      cr.setLineWidth(style.dividerWidth)
      cr.moveTo(0, -lineH / 2)
      cr.lineTo(0, lineH / 2)
      cr.stroke()
      cr.restore()
    }

    // Текст
    layout.set_text(hour, -1)
    layout.set_font_description(makeFont(style.fontFamily, style.fontWeight, style.fontSize))

    const [, ext] = layout.get_pixel_extents()
    const ew = ext?.width ?? 0
    const eh = ext?.height ?? 0

    cr.save()
    cr.translate(style.textOffsetX, 0)
    cr.setSourceRGBA(...style.textColor)
    cr.moveTo(-ew / 2, -eh / 2)
    PangoCairo.show_layout(cr, layout)
    cr.restore()
  }

  const draw = (area: Gtk.DrawingArea, cr: giCairo.Context) => {
    const w = area.get_allocated_width()
    const h = area.get_allocated_height()

    cr.setSourceRGB(0, 0, 0)
    cr.paint()
    cr.translate(w, h / 2)

    ctx.cr = cr
    ctx.layout = PangoCairo.create_layout(cr)

    const innerEdge = minRing.radius - minRing.majorTickLength - minRing.labelGap - 30
    const outerEdge = secRing.radius + secRing.majorTickLength + secRing.labelGap + 30
    const space = outerEdge - innerEdge

    hourBox.width = space + 50

    const boxCenterX = (innerEdge + outerEdge) / 2

    // 1. Box (фон + border) — под кольцами
    cr.save()
    cr.translate(-boxCenterX, 0)
    drawHourBox(hourBox)
    cr.restore()

    // 2. Кольца — поверх бокса
    drawRing(secRing, animSec, ctx.now.getSeconds())
    drawRing(minRing, animMin, ctx.now.getMinutes())
  }

  return (
    <Gtk.DrawingArea
      $={(ref) => {
        ref.set_draw_func((area, cr) => draw(area, cr))

        ref.add_tick_callback((widget, frameClock) => {
          const frameTime = frameClock.get_frame_time()
          const dt = lastFrameTime === 0 ? 16 : (frameTime - lastFrameTime) / 1000
          lastFrameTime = frameTime

          ctx.now = new Date()
          targetSec = (ctx.now.getSeconds() / 60) * Math.PI * 2
          targetMin = (ctx.now.getMinutes() / 60) * Math.PI * 2

          const t = dt / 16
          animSec = lerpAngle(animSec, targetSec, 1 - Math.pow(0.82, t))
          animMin = lerpAngle(animMin, targetMin, 1 - Math.pow(0.90, t))

          widget.queue_draw()
          return true
        })
      }}
      widthRequest={400}
      heightRequest={400}
    />
  )
}
