import { createPoll } from "ags/time"
import GLib from "gi://GLib"

export type NetworkStatus = "online" | "offline" | "unknown"

// Checks /proc/net/route for a default gateway (0.0.0.0 destination).
// Fast, no subprocess, no DNS — works offline when router is reachable.
function detectStatus(): NetworkStatus {
  const [ok, bytes] = GLib.file_get_contents("/proc/net/route")
  if (!ok) return "unknown"

  const content = new TextDecoder().decode(bytes)
  const hasGateway = content.split("\n").some(line => {
    const cols = line.trim().split(/\s+/)
    // Destination=00000000, Gateway≠00000000 → has default route
    return cols[1] === "00000000" && cols[2] !== "00000000"
  })

  return hasGateway ? "online" : "offline"
}

// Checks every 10 seconds. Use networkStatus() to read current value.
export const networkStatus = createPoll<NetworkStatus>("unknown", 10_000, detectStatus)
