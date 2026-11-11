// Erzeugt alle App-Icons (PNG + SVG) ohne Zusatzbibliotheken.
// Aufruf: npm run icons
//
// Motiv: der Speed-Reader im Kleinen – zwei Führungslinien mit Markierung,
// dazwischen ein „L“ als roter Fokusbuchstabe auf Papierton.
// Alle Maße beziehen sich auf eine 512×512-Fläche.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const COLORS = {
  paper: '#f7f3ea',
  indigo: '#4b3fd1',
  focus: '#e03131',
}

// Rechteck: x/y = linke obere Ecke, w/h = Größe, r = Eckenradius
const rect = (x, y, w, h, r) => ({ x, y, w, h, r })

// Vordergrund – Ebenen werden in dieser Reihenfolge gezeichnet.
// Eine Ebene kann aus mehreren Rechtecken bestehen (werden vereinigt).
const FOREGROUND = [
  {
    color: COLORS.indigo,
    rects: [
      rect(120, 146, 272, 10, 5), // obere Führungslinie
      rect(223, 146, 10, 32, 5), // Markierung oben
      rect(120, 356, 272, 10, 5), // untere Führungslinie
      rect(223, 334, 10, 32, 5), // Markierung unten
    ],
  },
  {
    color: COLORS.focus,
    rects: [
      rect(208, 194, 40, 124, 6), // Stamm des L (mittig unter den Markierungen)
      rect(208, 282, 98, 36, 6), // Fuß des L
    ],
  },
]

// ---------------------------------------------------------------------------
// Rasterisierung über Abstandsfunktionen (weiche Kanten ohne Treppeneffekt)

function sdRoundRect(px, py, { x, y, w, h, r }) {
  const cx = x + w / 2
  const cy = y + h / 2
  const qx = Math.abs(px - cx) - w / 2 + r
  const qy = Math.abs(py - cy) - h / 2 + r
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  const inside = Math.min(Math.max(qx, qy), 0)
  return outside + inside - r
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function render(size, { rounded }) {
  const scale = size / 512
  const layers = [
    {
      color: COLORS.paper,
      rects: [rounded ? rect(0, 0, 512, 512, 112) : rect(-8, -8, 528, 528, 0)],
    },
    ...FOREGROUND,
  ].map((layer) => ({ ...layer, rgb: hexToRgb(layer.color) }))

  const pixels = new Uint8Array(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = (px + 0.5) / scale
      const v = (py + 0.5) / scale
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (const layer of layers) {
        let d = Infinity
        for (const shape of layer.rects) d = Math.min(d, sdRoundRect(u, v, shape))
        const cover = Math.min(1, Math.max(0, 0.5 - d * scale))
        if (cover === 0) continue
        const outA = cover + a * (1 - cover)
        r = (layer.rgb[0] * cover + r * a * (1 - cover)) / outA
        g = (layer.rgb[1] * cover + g * a * (1 - cover)) / outA
        b = (layer.rgb[2] * cover + b * a * (1 - cover)) / outA
        a = outA
      }
      const i = (py * size + px) * 4
      pixels[i] = Math.round(r)
      pixels[i + 1] = Math.round(g)
      pixels[i + 2] = Math.round(b)
      pixels[i + 3] = Math.round(a * 255)
    }
  }
  return encodePng(size, size, pixels)
}

// ---------------------------------------------------------------------------
// Minimaler PNG-Encoder (RGBA, 8 Bit)

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // Bittiefe
  header[9] = 6 // Farbtyp RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // Filter: keiner
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// SVG-Variante (für das Browser-Tab)

function renderSvg() {
  const shapes = [
    { color: COLORS.paper, rects: [rect(0, 0, 512, 512, 112)] },
    ...FOREGROUND,
  ]
    .flatMap((layer) =>
      layer.rects.map(
        (s) =>
          `  <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.r}" fill="${layer.color}"/>`,
      ),
    )
    .join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n${shapes}\n</svg>\n`
}

// ---------------------------------------------------------------------------

const outputs = [
  ['public/icons/icon-192.png', () => render(192, { rounded: true })],
  ['public/icons/icon-512.png', () => render(512, { rounded: true })],
  // Maskable: vollflächig, Motiv liegt komplett in der sicheren Zone (Kreis mit 80 %)
  ['public/icons/maskable-512.png', () => render(512, { rounded: false })],
  // iOS rundet die Ecken selbst ab und mag keine Transparenz
  ['public/icons/apple-touch-icon.png', () => render(180, { rounded: false })],
  ['public/icons/favicon-32.png', () => render(32, { rounded: true })],
  ['public/favicon.svg', renderSvg],
]

for (const [file, make] of outputs) {
  const target = join(root, file)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, make())
  console.log('erstellt:', file)
}
