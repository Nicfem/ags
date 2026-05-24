import { Gtk } from "ags/gtk4"
import giCairo from "cairo"
import Pango from "gi://Pango"
import PangoCairo from "gi://PangoCairo"

import {
  clockColors,
  clockLayout,
  type RGBA,
} from "../../styles/tokens"
import GLib from "gi://GLib?version=2.0"

const FPS = 60
const FRAME_TIME = 1000 / FPS

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
  borderColor: RGBA
  bgColor: RGBA
  textColor: RGBA
  textOffsetX: number
  dividerWidth: number
  dividerHeight: number
  dividerColor: RGBA
}

interface DrawCtx {
  cr: giCairo.Context
  layout: Pango.Layout
  now: Date
}

const lerpAngle = (
  current: number,
  target: number,
  alpha: number,
) => {
  const diff = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  )

  return current + diff * alpha
}

const fontCache = new Map<string, Pango.FontDescription>()

const makeFont = (
  family: string,
  weight: string,
  size: number,
) => {
  const key = `${family}-${weight}-${size}`

  let font = fontCache.get(key)

  if (!font) {
    font = Pango.font_description_from_string(
      `${family} ${weight} ${size}`,
    )

    fontCache.set(key, font)
  }

  return font
}

export function DrumClock() {
  let animSec = 0
  let animMin = 0

  let targetSec = 0
  let targetMin = 0

  let lastFrameTime = Date.now()

  const ctx: DrawCtx = {
    cr: null as any,
    layout: null as any,
    now: new Date(),
  }

  const { fontFamily, fontWeight } = clockLayout

  const secRing: RingStyle = {
    ...clockLayout.sec,
    dir: Dir.Left,
    fontFamily,
    fontWeight,
  }

  const minRing: RingStyle = {
    ...clockLayout.min,
    dir: Dir.Left,
    fontFamily,
    fontWeight,
  }

  const hourBox: BoxStyle = {
    width: 0,
    ...clockLayout.hourBox,
    fontFamily,
    fontWeight,
    borderColor: clockColors.boxBorder,
    bgColor: clockColors.boxBg,
    textColor: clockColors.boxText,
    dividerColor: clockColors.boxDivider,
  }

  const roundedRect = (
    cr: giCairo.Context,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) => {
    cr.newSubPath()

    cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
    cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
    cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
    cr.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2)

    cr.closePath()
  }

  const drawTick = (
    i: number,
    style: RingStyle,
    offset: number,
    active: boolean,
    major: boolean,
  ) => {
    const { cr } = ctx

    const color = active
      ? clockColors.tickActive
      : clockColors.tickMajor

    const length = major
      ? style.majorTickLength
      : style.tickLength

    const width = active
      ? style.activeTickWidth
      : major
        ? style.majorTickWidth
        : style.tickWidth

    cr.save()

    cr.setSourceRGBA(...color)
    cr.rotate(STEP * i + offset)
    cr.setLineWidth(width)

    cr.moveTo(style.radius * style.dir, 0)

    cr.lineTo(
      (style.radius + length) * style.dir,
      0,
    )

    cr.stroke()

    cr.restore()
  }

  const drawLabel = (
    i: number,
    style: RingStyle,
    offset: number,
    active: boolean,
  ) => {
    const { cr, layout } = ctx

    const label = String(TICK_COUNT - i).padStart(2, "0")

    const color = active
      ? clockColors.labelActive
      : clockColors.labelMuted

    layout.set_text(label, -1)

    layout.set_font_description(
      makeFont(
        style.fontFamily,
        style.fontWeight,
        style.fontSize,
      ),
    )

    const [, ext] = layout.get_pixel_extents()

    const ew = ext?.width ?? 0
    const eh = ext?.height ?? 0

    const textOffset =
      style.majorTickLength +
      style.labelGap +
      ew

    cr.save()

    cr.setSourceRGBA(...color)

    cr.rotate(STEP * i + offset)

    cr.moveTo(
      (
        style.radius +
        ((1 - style.dir) / 2) * ew -
        textOffset
      ) * style.dir,
      -eh / 2,
    )

    PangoCairo.show_layout(cr, layout)

    cr.restore()
  }

  const drawRing = (
    style: RingStyle,
    offset: number,
    currentTime: number,
  ) => {
    for (let i = 1; i <= TICK_COUNT; i++) {
      const active =
        currentTime === TICK_COUNT - i

      const major =
        i % style.labelEvery === 0

      drawTick(
        i,
        style,
        offset,
        active,
        major,
      )

      if (major) {
        drawLabel(
          i,
          style,
          offset,
          active,
        )
      }
    }
  }

  const drawHourBox = (
    style: BoxStyle,
  ) => {
    const { cr, layout, now } = ctx

    const hour = now
      .getHours()
      .toString()
      .padStart(2, "0")

    const x = -style.width / 2
    const y = -style.height / 2

    cr.save()

    roundedRect(
      cr,
      x,
      y,
      style.width,
      style.height,
      style.cornerRadius,
    )

    cr.setSourceRGBA(...style.bgColor)

    cr.fill()

    cr.restore()

    cr.save()

    roundedRect(
      cr,
      x,
      y,
      style.width,
      style.height,
      style.cornerRadius,
    )

    cr.setSourceRGBA(...style.borderColor)

    cr.setLineWidth(style.borderWidth)

    cr.stroke()

    cr.restore()

    if (style.dividerWidth > 0) {
      const lineH =
        style.height *
        style.dividerHeight

      cr.save()

      cr.setSourceRGBA(...style.dividerColor)

      cr.setLineWidth(style.dividerWidth)

      cr.moveTo(0, -lineH / 2)
      cr.lineTo(0, lineH / 2)

      cr.stroke()

      cr.restore()
    }

    layout.set_text(hour, -1)

    layout.set_font_description(
      makeFont(
        style.fontFamily,
        style.fontWeight,
        style.fontSize,
      ),
    )

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

  const draw = (
    area: Gtk.DrawingArea,
    cr: giCairo.Context,
  ) => {
    const w = area.get_allocated_width()
    const h = area.get_allocated_height()

    cr.setSourceRGB(...clockColors.canvas)
    cr.paint()

    cr.translate(w, h / 2)

    ctx.cr = cr

    const innerEdge =
      minRing.radius -
      minRing.majorTickLength -
      minRing.labelGap -
      30

    const outerEdge =
      secRing.radius +
      secRing.majorTickLength +
      secRing.labelGap +
      30

    hourBox.width =
      (outerEdge - innerEdge) + 50

    cr.save()

    cr.translate(
      -((innerEdge + outerEdge) / 2),
      0,
    )

    drawHourBox(hourBox)

    cr.restore()

    drawRing(
      secRing,
      animSec,
      ctx.now.getSeconds(),
    )

    drawRing(
      minRing,
      animMin,
      ctx.now.getMinutes(),
    )
  }

  return (
    <Gtk.DrawingArea
      $={(ref) => {
        ref.set_draw_func((area, cr) => {
          if (!ctx.layout) {
            ctx.layout =
              PangoCairo.create_layout(cr)
          }

          draw(area, cr)
        })

        GLib.timeout_add(
          GLib.PRIORITY_DEFAULT,
          FRAME_TIME,
          () => {
            const now = Date.now()

            const dt = now - lastFrameTime

            lastFrameTime = now

            ctx.now = new Date()

            targetSec =
              (ctx.now.getSeconds() / 60) *
              Math.PI *
              2

            targetMin =
              (ctx.now.getMinutes() / 60) *
              Math.PI *
              2

            const t = dt / 16

            animSec = lerpAngle(
              animSec,
              targetSec,
              1 - Math.pow(0.82, t),
            )

            animMin = lerpAngle(
              animMin,
              targetMin,
              1 - Math.pow(0.90, t),
            )

            ref.queue_draw()

            return GLib.SOURCE_CONTINUE
          },
        )
      }}
      widthRequest={400}
      heightRequest={400}
    />
  )
}
