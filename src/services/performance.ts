import { createPoll } from "ags/time"
import GLib from "gi://GLib"

export interface CpuMetrics {
  percent: number
}

export interface MemMetrics {
  usedMb: number
  totalMb: number
  percent: number
}

export interface PerfMetrics {
  cpu: CpuMetrics
  mem: MemMetrics
}

function readProc(path: string): string {
  const [ok, bytes] = GLib.file_get_contents(path)
  return ok ? new TextDecoder().decode(bytes) : ""
}

let prevIdle = 0
let prevTotal = 0

function parseCpu(stat: string): number {
  const parts = stat.split("\n")[0].trim().split(/\s+/).slice(1).map(Number)
  const idle = parts[3] + (parts[4] ?? 0)
  const total = parts.reduce((a, b) => a + b, 0)
  const dIdle = idle - prevIdle
  const dTotal = total - prevTotal
  prevIdle = idle
  prevTotal = total
  return dTotal === 0 ? 0 : Math.round((1 - dIdle / dTotal) * 100)
}

function parseMem(meminfo: string): MemMetrics {
  const get = (key: string) => {
    const line = meminfo.split("\n").find(l => l.startsWith(key))
    return line ? parseInt(line.split(/\s+/)[1]) : 0
  }
  const total = get("MemTotal:")
  const avail = get("MemAvailable:")
  const used = total - avail
  return {
    totalMb: Math.round(total / 1024),
    usedMb: Math.round(used / 1024),
    percent: total ? Math.round((used / total) * 100) : 0,
  }
}

const initial: PerfMetrics = {
  cpu: { percent: 0 },
  mem: { usedMb: 0, totalMb: 0, percent: 0 },
}

// Polls /proc/stat and /proc/meminfo every 2 seconds.
export const perfMetrics = createPoll<PerfMetrics>(initial, 2000, () => ({
  cpu: { percent: parseCpu(readProc("/proc/stat")) },
  mem: parseMem(readProc("/proc/meminfo")),
}))
