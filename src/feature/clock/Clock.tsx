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

// --- Настройки внешнего вида ---
interface RingStyle {
  radius: number
  dir: Dir
  tickLength: number
  tickWidth: number
  activeTickLength: number
  activeTickWidth: number
  fontSize: number
  labelEvery: number // показывать число каждые N делений
  labelGap: number
}

// --- Добавь в RingStyle или отдельно ---
interface BoxStyle {
  width: number
  height: number
  cornerRadius: number
  fontSize: number
  bgColor: [number, number, number, number]    // RGBA
  textColor: [number, number, number, number]
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
    radius: 350,
    dir: Dir.Left,
    tickLength: 14,
    tickWidth: 2,
    activeTickLength: 20,
    activeTickWidth: 5,
    fontSize: 9,
    labelEvery: 5,
    labelGap: 10
  }

  const minRing: RingStyle = {
    radius: 400,
    dir: Dir.Left,
    tickLength: 12,
    tickWidth: 2,
    activeTickLength: 18,
    activeTickWidth: 4,
    fontSize: 10,
    labelEvery: 5,
    labelGap: 10
  }


  const hourBox: BoxStyle = {
    width: 120,
    height: 60,
    cornerRadius: 24,
    fontSize: 24,
    bgColor: [0.1, 0.1, 0.1, 0.3],
    textColor: [1, 1, 1, 1],
  }

  const roundedRect = (cr: giCairo.Context, x: number, y: number, w: number, h: number, r: number) => {
    cr.newSubPath()
    cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
    cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
    cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
    cr.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2)
    cr.closePath()
  }

  const drawTick = (i: number, style: RingStyle, offset: number, active: boolean) => {
    const { cr } = ctx
    const length = active ? style.activeTickLength : style.tickLength
    const width = active ? style.activeTickWidth : style.tickWidth

    cr.save()
    cr.setSourceRGBA(1, 1, 1, active ? 1 : 0.5)
    cr.rotate(STEP * i + offset)
    cr.setLineWidth(width)
    cr.moveTo(style.radius * style.dir, 0)
    cr.lineTo((style.radius + length) * style.dir, 0)
    cr.stroke()
    cr.restore()
  }

  const drawHourBox = (style: BoxStyle) => {
    const { cr, layout, now } = ctx
    const hour = now.getHours().toString().padStart(2, "0")

    const x = -style.width / 2
    const y = -style.height / 2

    cr.save()
    roundedRect(cr, x, y, style.width, style.height, style.cornerRadius)
    cr.setSourceRGBA(...style.bgColor)
    cr.fill()
    cr.restore()

    layout.set_text(hour, -1)
    layout.set_font_description(
      Pango.font_description_from_string(`Arial Black Bold ${style.fontSize}`),
    )

    const [, ext] = layout.get_pixel_extents()
    const ew = ext?.width ?? 0
    const eh = ext?.height ?? 0

    cr.save()
    cr.setSourceRGBA(...style.textColor)
    cr.moveTo(-ew / 2, -eh / 2)
    PangoCairo.show_layout(cr, layout)
    cr.restore()
  }

  const drawLabel = (i: number, style: RingStyle, offset: number) => {
    const { cr, layout } = ctx
    const label = String(TICK_COUNT - i).padStart(2, "0")

    layout.set_text(label, -1)
    layout.set_font_description(
      Pango.font_description_from_string(`Arial Black Bold ${style.fontSize}`),
    )

    const [, ext] = layout.get_pixel_extents()
    const ew = ext?.width ?? 0
    const eh = ext?.height ?? 0

    cr.save()
    cr.setSourceRGBA(1, 1, 1, 1)
    cr.rotate(STEP * i + offset)
    cr.moveTo((style.radius + ((1 - style.dir) / 2) * ew - (style.tickLength + style.labelGap)) * style.dir, -eh / 2)
    PangoCairo.show_layout(cr, layout)
    cr.restore()
  }

  const drawRing = (style: RingStyle, offset: number, currentTime: number) => {
    for (let i = 1; i <= TICK_COUNT; i++) {
      const active = currentTime === TICK_COUNT - i
      drawTick(i, style, offset, active)

      if (i % style.labelEvery === 0) {
        drawLabel(i, style, offset)
      }
    }
  }

  const draw = (area: Gtk.DrawingArea, cr: giCairo.Context) => {
    const w = area.get_allocated_width()
    const h = area.get_allocated_height()

    cr.setSourceRGB(0, 0, 0)
    cr.paint()
    cr.translate(w / 2, h / 2)

    ctx.cr = cr
    ctx.layout = PangoCairo.create_layout(cr)

    drawRing(secRing, animSec, ctx.now.getSeconds())
    drawRing(minRing, animMin, ctx.now.getMinutes())

    cr.translate(-400, 0)
    drawHourBox(hourBox)
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
