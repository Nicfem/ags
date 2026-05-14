import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createPoll } from "ags/time"
import { createBinding, createState, For } from "gnim"
import GLib from "gi://GLib"
import { Tray } from "./feature/tray"


export default function Bar(gdkmonitor: Gdk.Monitor) {
  // const time = createPoll("", 1000, "date")
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
  const [hovered, setHovered] = createState(false)

  const time = createPoll("", 1000, () => {
    return GLib.DateTime.new_now_local().format("%H:%M")!
  })

  const motion = new Gtk.EventControllerMotion()

  motion.connect("enter", () => {
    setHovered(true)
    console.log(hovered)
  })

  motion.connect("leave", () => {
    setHovered(false)
    console.log(hovered)
  })

  return (
    <window
      visible
      name="bar"
      class="Bar"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
      onNotifyCursor={() => console.log('wor')}
      heightRequest={35}
    >
      <centerbox
        cssName="centerbox"
        heightRequest={35}
        $={(self) => {
          self.add_controller(motion)
        }}
      >
        <box $type="start" halign={Gtk.Align.START}>
        </box>

        <box cssName="module" spacing={0} $type="center" halign={Gtk.Align.CENTER}>
          <overlay valign={Gtk.Align.START}>
            <button cssName="btn-left" onClicked={() => console.log("Left action")}>
            </button>
            <box $type="overlay" cssName="box-left"></box>
          </overlay>

          <box
            cssName="time-lable"
          >
            <label
              halign={Gtk.Align.CENTER}
              valign={Gtk.Align.CENTER}
              hexpand
              label={time}
            />
          </box>

          <overlay valign={Gtk.Align.START}>
            <button cssName="btn-right" onClicked={() => console.log("Left action")}>
            </button>
            <box $type="overlay" cssName="box-right"></box>
          </overlay>
        </box>

        <box $type="end" halign={Gtk.Align.END}>
          <Tray />
        </box>
      </centerbox>
    </window>
  )
}
