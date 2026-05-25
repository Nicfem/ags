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

export interface GpuMetrics {
  percent: number
  usedMb: number
  totalMb: number
}

export interface PerfMetrics {
  cpu: CpuMetrics
  mem: MemMetrics
  gpu: GpuMetrics
}

function readProc(path: string): string {
  try {
    const [ok, bytes] = GLib.file_get_contents(path)
    return ok ? new TextDecoder().decode(bytes) : ""
  } catch {
    return ""
  }
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

const GPU_ZERO: GpuMetrics = { percent: 0, usedMb: 0, totalMb: 0 }

// Try AMD sysfs: iterate card0..card3 to find one with gpu_busy_percent
function parseAmdGpu(): GpuMetrics | null {
  for (let i = 0; i < 4; i++) {
    const base = `/sys/class/drm/card${i}/device`
    const busyStr = readProc(`${base}/gpu_busy_percent`)
    if (!busyStr) continue
    const usedStr = readProc(`${base}/mem_info_vram_used`)
    const totalStr = readProc(`${base}/mem_info_vram_total`)
    const totalBytes = parseInt(totalStr.trim())
    if (!totalBytes) continue
    return {
      percent: parseInt(busyStr.trim()),
      usedMb: Math.round(parseInt(usedStr.trim()) / (1024 * 1024)),
      totalMb: Math.round(totalBytes / (1024 * 1024)),
    }
  }
  return null
}

// Try NVIDIA via nvidia-smi
function parseNvidiaGpu(): GpuMetrics | null {
  try {
    const [ok, stdout] = GLib.spawn_command_line_sync(
      "nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits"
    )
    if (!ok || !stdout) return null
    const parts = new TextDecoder().decode(stdout).trim().split(",").map(s => parseInt(s.trim()))
    if (parts.length < 3 || parts.some(isNaN)) return null
    return { percent: parts[0], usedMb: parts[1], totalMb: parts[2] }
  } catch {
    return null
  }
}

function parseGpu(): GpuMetrics {
  return parseAmdGpu() ?? parseNvidiaGpu() ?? GPU_ZERO
}

const initial: PerfMetrics = {
  cpu: { percent: 0 },
  mem: { usedMb: 0, totalMb: 0, percent: 0 },
  gpu: GPU_ZERO,
}

export const perfMetrics = createPoll<PerfMetrics>(initial, 2000, () => ({
  cpu: { percent: parseCpu(readProc("/proc/stat")) },
  mem: parseMem(readProc("/proc/meminfo")),
  gpu: parseGpu(),
}))
