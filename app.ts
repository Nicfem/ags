import app from "ags/gtk4/app"
import style from "./style.scss"
import Bar from "./src/Bar"
import { Applauncher } from './src/feature/applauncher'
import { monitorFile } from "ags/file"
import { execAsync } from "ags/process"
import NotificationPopups from "./src/feature/notification/NotificationPopups"
import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import ClockBackground from "./src/feature/clock/ClockBackground"

execAsync("sass --watch --no-source-map ./style.scss ./.cache/result.css")

monitorFile("./.cache/result.css", () => {
  app.apply_css("./.cache/result.css")
})

let applauncher: Gtk.Window

app.start({
  css: style,
  requestHandler(request, res) {
    console.log(request)
    const [, argv] = GLib.shell_parse_argv(request.join())
    if (!argv) return res("argv parse error")

    switch (argv[0]) {
      case "toggle":
        applauncher.visible = !applauncher.visible
        return res("ok")
      default:
        return res("unknown command")
    }
  },
  main() {
    app.get_monitors().map(Bar)
    ClockBackground()
    NotificationPopups()
    applauncher = Applauncher() as Gtk.Window
    app.add_window(applauncher)

  },
})
