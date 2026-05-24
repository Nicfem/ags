import { Astal } from "ags/gtk4"
import { DrumClock } from "./Clock"

const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor

export default function ClockBackground() {
  return (
    <window
      name="clock-bg"
      title="clock"
      namespace="my-clock"
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.BACKGROUND}
      keymode={Astal.Keymode.NONE}
      visible={true}
    >
      <DrumClock />
    </window>
  )
}
