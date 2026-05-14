import app from "ags/gtk4/app"
import style from "./style.scss"
import Bar from "./src/Bar"
import Applauncher from './src/Applauncher'
import { monitorFile } from "ags/file"
import { execAsync } from "ags/process"


monitorFile("./style.scss", async () => {
  await execAsync("sass ./style.scss ./result.css")
  app.apply_css("./result.css")
})

app.start({
  css: style,
  main() {
    app.get_monitors().map(Bar)
    // Applauncher()
  },
})
