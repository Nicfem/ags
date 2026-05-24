import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createPoll } from "ags/time"
import { createState } from "gnim"
import GLib from "gi://GLib"
import { Tray } from "../../widgets/tray/Tray"
import { perfMetrics } from "../../services/performance"

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
  const [hovered, setHovered] = createState(false)

  const time = createPoll("", 1000, () =>
    GLib.DateTime.new_now_local().format("%H:%M")!
  )

  const motion = new Gtk.EventControllerMotion()
  motion.connect("enter", () => setHovered(true))
  motion.connect("leave", () => setHovered(false))

  return (
    <window
      visible
      name="bar"
      class="Bar"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
      heightRequest={35}
    >
      <centerbox
        cssName="centerbox"
        heightRequest={35}
        $={(self) => self.add_controller(motion)}
      >
        <box $type="start" halign={Gtk.Align.START} />

        <box cssName="module" spacing={0} $type="center" halign={Gtk.Align.CENTER}>
          <overlay valign={Gtk.Align.START}>
            <button cssName="btn-left" onClicked={() => console.log("left")} />
            <box $type="overlay" cssName="box-left" />
          </overlay>

          <box cssName="time-lable">
            <label
              halign={Gtk.Align.CENTER}
              valign={Gtk.Align.CENTER}
              hexpand
              label={perfMetrics(m => `CPU ${m.cpu.percent}%`)}
            />
          </box>

          <overlay valign={Gtk.Align.START}>
            <button cssName="btn-right" onClicked={() => console.log("right")} />
            <box $type="overlay" cssName="box-right" />
          </overlay>
        </box>

        <box $type="end" halign={Gtk.Align.END}>
          <Tray />
        </box>
      </centerbox>
    </window>
  )
}
