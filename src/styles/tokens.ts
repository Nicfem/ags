// Design tokens for Cairo-based drawing (cannot use CSS/SCSS)

export type RGBA = [number, number, number, number]
export type RGB = [number, number, number]

// ─── Clock Colors ─────────────────────────────────────────────────────────────
export const clockColors = {
  canvas: [0, 0, 0] as RGB,

  tickActive: [1, 1, 1, 1.00] as RGBA,
  tickMajor: [1, 1, 1, 0.20] as RGBA,
  tickNormal: [1, 1, 1, 0.15] as RGBA,

  labelActive: [1, 1, 1, 1.00] as RGBA,
  labelMuted: [1, 1, 1, 0.20] as RGBA,

  boxBg: [0.06, 0.06, 0.06, 0.40] as RGBA,
  boxBorder: [1, 1, 1, 0.08] as RGBA,
  boxText: [1, 1, 1, 0.85] as RGBA,
  boxDivider: [1, 1, 1, 0.18] as RGBA,
}

// ─── Clock Layout ─────────────────────────────────────────────────────────────
export const clockLayout = {
  fontFamily: "Inter",
  fontWeight: "Black",

  sec: {
    radius: 700,
    dir: -1 as -1 | 1,
    tickLength: 10,
    tickWidth: 2,
    activeTickLength: 20,
    activeTickWidth: 3,
    majorTickLength: 20,
    majorTickWidth: 3,
    fontSize: 15,
    labelEvery: 5,
    labelGap: -5,
  },

  min: {
    radius: 450,
    dir: -1 as -1 | 1,
    tickLength: 15,
    tickWidth: 2,
    activeTickLength: 25,
    activeTickWidth: 3,
    majorTickLength: 25,
    majorTickWidth: 3,
    fontSize: 20,
    labelEvery: 5,
    labelGap: -10,
  },

  hourBox: {
    height: 120,
    cornerRadius: 60,
    fontSize: 120,
    borderWidth: 3,
    textOffsetX: 350,
    dividerWidth: 2,
    dividerHeight: 0.6,
  },
}
