import AstalTray from "gi://AstalTray?version=0.1"
import { createBinding, createComputed, createState, For } from "ags"
import { Gtk } from "ags/gtk4"
import clsx from "clsx"

const tray = AstalTray.get_default()

export const Tray = () => {
  const [items, setItems] = createState<AstalTray.TrayItem[]>([])

  // Слушаем изменения именно в массиве items
  tray.connect("notify::items", () => {
    // В AstalTray статус обычно завязан на перечисление, 
    // но если статус 1 означает 'Active', оставляем фильтр
    setItems(tray.items.filter((item) => item.status === 1))
  })

  const init = (btn: Gtk.MenuButton, item: AstalTray.TrayItem) => {
    btn.menuModel = item.menuModel
    btn.insert_action_group("dbusmenu", item.actionGroup)

    item.connect("notify::action-group", () => {
      btn.insert_action_group("dbusmenu", item.actionGroup)
    })
  }

  return (
    <box class="tr-l">
      <For each={items}>
        {(item, index) => (
          <menubutton
            $={(self) => init(self, item)}
            valign={Gtk.Align.START}
            class={createComputed(() =>
              clsx("tr-c-item", {
                "tr-c-item--last": index() === items().length - 1,
              })
            )}
          >
            <image hexpand gicon={createBinding(item, "gicon")} />
          </menubutton>
        )}
      </For>
    </box>
  )
}
