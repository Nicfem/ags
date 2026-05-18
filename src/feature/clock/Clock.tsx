import { Gtk } from "ags/gtk4"
import giCairo from "cairo"
import Pango from "gi://Pango"
import PangoCairo from "gi://PangoCairo"

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

const lerpAngle = (current: number, target: number, alpha: number) => {
  // Находим разницу между углами
  let diff = target - current;

  // Нормализуем разницу в диапазон от -PI до PI.
  // Это заставляет анимацию всегда выбирать самый короткий путь.
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));

  // Интерполируем угол
  return current + diff * alpha;
};

const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180)

export function DrumClock() {
  let animSec = 0
  let animMin = 0
  let targetSec = 0
  let targetMin = 0
  let lastFrameTime = 0
  let time = 0

  function drawRing(
    cr: giCairo.Context,
    cx: number,
    cy: number,
    radius: number,
    totalTicks: number,
    labelStep: number,
    currentAngle: number,
    layout: any,
    fontSize: number,
    color: [number, number, number],
  ) {
    for (let i = 0; i < totalTicks; i++) {
      const angle =
        (i / totalTicks) * Math.PI * 2 - Math.PI / 2 + currentAngle
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius

      // расстояние от верхней точки (12 часов) — от 0 до π
      const norm =
        ((angle + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
      const dist = Math.abs(norm - Math.PI)
      // fade: 1.0 сверху, 0.0 по бокам и снизу
      const fade = Math.max(0, 1 - dist / (Math.PI * 0.62))

      if (i % labelStep === 0) {
        // размер цифры: от 0.35 до 1.0 в зависимости от позиции
        const scale = 0.35 + 0.65 * fade

        cr.save()
        cr.translate(x, y)
        // поворачиваем цифру по касательной к окружности
        cr.rotate(angle + Math.PI / 2)
        cr.setSourceRGBA(color[0], color[1], color[2], 0.2 + 0.8 * fade)

        layout.set_text(String(i).padStart(2, "0"), -1)
        layout.set_font_description(
          Pango.font_description_from_string(
            `Arial Black Bold ${Math.round(fontSize * scale)}`,
          ),
        )

        const [, e] = layout.get_pixel_extents()
        const ew = e?.width ?? 0
        const eh = e?.height ?? 0
        cr.moveTo(-ew / 2, -eh / 2)
        PangoCairo.show_layout(cr, layout)
        cr.restore()
      } else {
        // маленькая черта-деление
        cr.save()
        cr.translate(x, y)
        cr.rotate(angle + Math.PI / 2)
        cr.setSourceRGBA(1, 1, 1, 0.12 * fade)
        cr.setLineWidth(1)
        cr.moveTo(0, -4)
        cr.lineTo(0, 4)
        cr.stroke()
        cr.restore()
      }
    }
  }

  function drawPill(
    cr: any,
    cx: number,
    cy: number,
    layout: any,
    mins: number,
    secs: number,
  ) {
    const pw = 160
    const ph = 64
    const r = ph / 2

    // фон пилюли
    cr.save()
    cr.setSourceRGBA(0.08, 0.08, 0.08, 0.96)
    cr.arc(cx - pw / 2 + r, cy - ph / 2 + r, r, Math.PI, Math.PI * 1.5)
    cr.arc(cx + pw / 2 - r, cy - ph / 2 + r, r, Math.PI * 1.5, 0)
    cr.arc(cx + pw / 2 - r, cy + ph / 2 - r, r, 0, Math.PI / 2)
    cr.arc(cx - pw / 2 + r, cy + ph / 2 - r, r, Math.PI / 2, Math.PI)
    cr.closePath()
    cr.fill()

    // обводка пилюли
    cr.setSourceRGBA(1, 1, 1, 0.08)
    cr.setLineWidth(0.5)
    cr.arc(cx - pw / 2 + r, cy - ph / 2 + r, r, Math.PI, Math.PI * 1.5)
    cr.arc(cx + pw / 2 - r, cy - ph / 2 + r, r, Math.PI * 1.5, 0)
    cr.arc(cx + pw / 2 - r, cy + ph / 2 - r, r, 0, Math.PI / 2)
    cr.arc(cx - pw / 2 + r, cy + ph / 2 - r, r, Math.PI / 2, Math.PI)
    cr.closePath()
    cr.stroke()

    // разделитель внутри пилюли
    cr.setSourceRGBA(1, 1, 1, 0.15)
    cr.setLineWidth(0.5)
    cr.moveTo(cx, cy - ph / 2 + 12)
    cr.lineTo(cx, cy + ph / 2 - 12)
    cr.stroke()
    cr.restore()

    // минуты (левая часть пилюли)
    cr.save()
    layout.set_font_description(
      Pango.font_description_from_string("Arial Black Bold 28"),
    )
    cr.setSourceRGBA(1, 1, 1, 1)
    layout.set_text(String(mins).padStart(2, "0"), -1)
    let [, e] = layout.get_pixel_extents()
    cr.moveTo(cx - pw / 4 - (e?.width ?? 0) / 2, cy - (e?.height ?? 0) / 2)
    PangoCairo.show_layout(cr, layout)
    cr.restore()

    // секунды (правая часть пилюли)
    cr.save()
    layout.set_font_description(
      Pango.font_description_from_string("Arial Black Bold 20"),
    )
    cr.setSourceRGBA(0.65, 0.65, 0.65, 1)
    layout.set_text(String(secs).padStart(2, "0"), -1)
      ;[, e] = layout.get_pixel_extents()
    cr.moveTo(cx + pw / 4 - (e?.width ?? 0) / 2, cy - (e?.height ?? 0) / 2)
    PangoCairo.show_layout(cr, layout)
    cr.restore()
  }

  function onDraw(area: Gtk.DrawingArea, cr: giCairo.Context) {
    const w = area.get_allocated_width()
    const h = area.get_allocated_height()
    const cx = w / 2
    const cy = h / 2

    // чёрный фон
    cr.setSourceRGB(0, 0, 0)
    cr.paint()

    const now = new Date()
    const layout = PangoCairo.create_layout(cr)

    // внешнее кольцо — секунды
    drawRing(cr, cx, cy, Math.min(w, h) / 2 - 20, 60, 5, -animSec, layout, 22, [0.7, 0.7, 0.7])

    // внутреннее кольцо — минуты
    drawRing(cr, cx, cy, Math.min(w, h) / 2 - 80, 60, 5, -animMin, layout, 17, [0.5, 0.5, 0.5])

    // пилюля по центру
    drawPill(cr, cx, cy, layout, now.getMinutes(), now.getSeconds())

    // большие цифры часов слева от пилюли
    cr.save()
    layout.set_font_description(
      Pango.font_description_from_string("Arial Black Bold 88"),
    )
    cr.setSourceRGBA(1, 1, 1, 1)
    const hoursStr = String(now.getHours())
    layout.set_text(hoursStr, -1)
    const [, he] = layout.get_pixel_extents()
    const hw = he?.width ?? 0
    const hh = he?.height ?? 0
    cr.moveTo(cx - 160 - hw / 2, cy - hh / 2)
    PangoCairo.show_layout(cr, layout)
    cr.restore()
  }

  const myDrow = (area: Gtk.DrawingArea, cr: giCairo.Context) => {
    const w = area.get_allocated_width()
    const h = area.get_allocated_height()
    const cx = w / 2
    const cy = h / 2

    const tick = 60
    cr.setSourceRGB(0, 0, 0)
    cr.paint()

    const layout = PangoCairo.create_layout(cr)


    cr.save()

    cr.translate(cx, cy)

    const step = Math.PI * 2 / tick

    for (let i = 1; tick >= i; i++) {
      cr.save()

      const sec = animSec;

      cr.setSourceRGBA(1, 1, 1, 1)
      if (i == tick) {
        cr.setSourceRGBA(255, 0, 0, 1)
      }
      cr.rotate(step * i + sec)
      cr.setLineWidth(5)
      cr.moveTo(-200, 0)
      cr.lineTo(-190, 0)
      cr.stroke()
      cr.restore()

      cr.save()
      cr.setSourceRGBA(255, 0, 0, 1)
      cr.rotate(step * i + sec)

      layout.set_text(String(60 - i).padStart(2, "0"), -1)
      layout.set_font_description(
        Pango.font_description_from_string(
          `Arial Black Bold ${Math.round(18 * 0.5)}`,
        ),
      )

      const [, e] = layout.get_pixel_extents()
      const ew = e?.width ?? 0
      const eh = e?.height ?? 0

      cr.moveTo((-ew / 2) - 180, -eh / 2)
      PangoCairo.show_layout(cr, layout)
      cr.restore()
    }

    cr.save()

    cr.setSourceRGBA(255, 0, 0, 1)
    cr.setLineWidth(5)
    cr.moveTo(-210, 0)
    cr.lineTo(-200, 0)
    cr.stroke()
    cr.restore()
  }

  return (
    <Gtk.DrawingArea
      $={(ref) => {
        ref.set_draw_func((area, cr) => myDrow(area, cr))

        // add_tick_callback — синхронизирован с vsync монитора
        // вызывается столько раз в секунду сколько герц у монитора (120hz = 120fps)
        ref.add_tick_callback((widget, frameClock) => {
          const frameTime = frameClock.get_frame_time() // микросекунды

          // dt в миллисекундах между кадрами
          const dt =
            lastFrameTime === 0 ? 16 : (frameTime - lastFrameTime) / 1000
          lastFrameTime = frameTime

          const now = new Date()
          targetSec = (now.getSeconds() / 60) * Math.PI * 2
          targetMin = (now.getMinutes() / 60) * Math.PI * 2

          // frame-rate independent lerp
          // Math.pow(base, t) нормализует скорость к любому fps
          // t = dt/16 → при 60fps t≈1, при 120fps t≈0.5, при 30fps t≈2
          const t = dt / 16
          const alphaSec = 1 - Math.pow(0.82, t)
          const alphaMin = 1 - Math.pow(0.90, t)
          animSec = lerpAngle(animSec, targetSec, alphaSec)
          animMin = lerpAngle(animMin, targetMin, alphaMin)

          time = t

          widget.queue_draw()
          return true // true = продолжать каждый кадр
        })
      }}
      widthRequest={400}
      heightRequest={400}
    />
  )
}
