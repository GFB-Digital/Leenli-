// Erzeugt alle App-Icons aus dem Logo design/logo.png – ohne Zusatzbibliotheken.
// Aufruf: npm run icons
//
// Das Logo (1024 × 1024) zeigt einen Tempel auf grauem Verlauf, darüber den
// Schriftzug „ΤΟΠΟΣ“. Für die Icons wird der Schriftzug entfernt (der Verlauf
// darüber und darunter wird überblendet) und der Tempel mittig gesetzt – auf dem
// Home-Bildschirm wäre Schrift winzig, der Name steht ohnehin darunter.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Lage im Logo (Pixel, gemessen): Schriftzug-Streifen und Umriss des Tempels */
const TEXT_BAND = { top: 90, bottom: 210 }
const TEMPLE = { left: 42, right: 981, top: 260, bottom: 871 }

// ---------------------------------------------------------------------------
// Minimaler PNG-Decoder (8 Bit, RGB oder RGBA, ohne Zeilensprung) → RGB

function decodePng(buf) {
  let pos = 8
  let width = 0
  let height = 0
  let type = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const name = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (name === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      type = data[9]
      if (data[8] !== 8 || (type !== 2 && type !== 6) || data[12] !== 0) {
        throw new Error('Logo muss ein PNG mit 8 Bit RGB/RGBA ohne Zeilensprung sein')
      }
    }
    if (name === 'IDAT') idat.push(data)
    pos += 12 + len
  }
  const channels = type === 6 ? 4 : 3
  const stride = width * channels
  const raw = inflateSync(Buffer.concat(idat))
  const rgb = new Float64Array(width * height * 3)
  let prev = new Uint8Array(stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const cur = new Uint8Array(stride)
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0
      const b = prev[i]
      const c = i >= channels ? prev[i - channels] : 0
      const p = a + b - c
      const pa = Math.abs(p - a)
      const pb = Math.abs(p - b)
      const pc = Math.abs(p - c)
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      const predict = [0, a, b, (a + b) >> 1, paeth][filter]
      cur[i] = (line[i] + predict) & 255
    }
    for (let x = 0; x < width; x++) {
      for (let k = 0; k < 3; k++) rgb[(y * width + x) * 3 + k] = cur[x * channels + k]
    }
    prev = cur
  }
  return { width, height, rgb }
}

// ---------------------------------------------------------------------------
// Bildbearbeitung

/** Schriftzug entfernen: je Spalte zwischen der Zeile darüber und darunter überblenden */
function removeText(img) {
  const { width, rgb } = img
  const { top, bottom } = TEXT_BAND
  for (let x = 0; x < width; x++) {
    for (let y = top; y <= bottom; y++) {
      const t = (y - top + 1) / (bottom - top + 2)
      for (let k = 0; k < 3; k++) {
        const above = rgb[((top - 1) * width + x) * 3 + k]
        const below = rgb[((bottom + 1) * width + x) * 3 + k]
        rgb[(y * width + x) * 3 + k] = above + (below - above) * t
      }
    }
  }
}

/** Farbe an (x, y) mit bilinearer Interpolation; außerhalb gilt der nächste Randpixel */
function sample(img, x, y, out) {
  const { width, height, rgb } = img
  const cx = Math.min(width - 1, Math.max(0, x - 0.5))
  const cy = Math.min(height - 1, Math.max(0, y - 0.5))
  const x0 = Math.floor(cx)
  const y0 = Math.floor(cy)
  const x1 = Math.min(width - 1, x0 + 1)
  const y1 = Math.min(height - 1, y0 + 1)
  const fx = cx - x0
  const fy = cy - y0
  for (let k = 0; k < 3; k++) {
    const top = rgb[(y0 * width + x0) * 3 + k] * (1 - fx) + rgb[(y0 * width + x1) * 3 + k] * fx
    const bottom = rgb[(y1 * width + x0) * 3 + k] * (1 - fx) + rgb[(y1 * width + x1) * 3 + k] * fx
    out[k] = top * (1 - fy) + bottom * fy
  }
}

/**
 * Icon der Größe `size`: Tempel mittig, `fill` = Anteil der Icon-Breite, den der Tempel einnimmt.
 * Der Hintergrund-Verlauf wird am Rand fortgesetzt. `radius` (Anteil) rundet die Ecken transparent ab.
 */
function renderIcon(img, size, { fill, radius = 0 }) {
  const templeW = TEMPLE.right - TEMPLE.left
  const scale = (size * fill) / templeW // Icon-Pixel je Logo-Pixel
  const srcCx = (TEMPLE.left + TEMPLE.right) / 2
  const srcCy = (TEMPLE.top + TEMPLE.bottom) / 2
  const sub = Math.max(1, Math.ceil(1 / scale)) // Unterabtastung → sauberes Verkleinern
  const pixels = new Uint8Array(size * size * 4)
  const color = [0, 0, 0]
  const r = radius * size
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let sr = 0
      let sg = 0
      let sb = 0
      for (let j = 0; j < sub; j++) {
        for (let i = 0; i < sub; i++) {
          const u = px + (i + 0.5) / sub
          const v = py + (j + 0.5) / sub
          sample(img, srcCx + (u - size / 2) / scale, srcCy + (v - size / 2) / scale, color)
          sr += color[0]
          sg += color[1]
          sb += color[2]
        }
      }
      const n = sub * sub
      const o = (py * size + px) * 4
      pixels[o] = Math.round(sr / n)
      pixels[o + 1] = Math.round(sg / n)
      pixels[o + 2] = Math.round(sb / n)
      pixels[o + 3] = r > 0 ? Math.round(255 * roundedCover(px + 0.5, py + 0.5, size, r)) : 255
    }
  }
  return encodePng(size, size, pixels)
}

/** Deckung eines Pixels in einem Quadrat mit abgerundeten Ecken (weiche Kante) */
function roundedCover(x, y, size, r) {
  const qx = Math.abs(x - size / 2) - size / 2 + r
  const qy = Math.abs(y - size / 2) - size / 2 + r
  const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  return Math.min(1, Math.max(0, 0.5 - d))
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

const logo = decodePng(readFileSync(join(root, 'design/logo.png')))
removeText(logo)

const outputs = [
  // Abgerundet für Browser, PC und Android-Launcher ohne Maske
  ['public/icons/icon-192.png', () => renderIcon(logo, 192, { fill: 0.84, radius: 0.22 })],
  ['public/icons/icon-512.png', () => renderIcon(logo, 512, { fill: 0.84, radius: 0.22 })],
  // Maskable: vollflächig, Tempel komplett in der sicheren Zone (Kreis mit 80 % Durchmesser)
  ['public/icons/maskable-512.png', () => renderIcon(logo, 512, { fill: 0.68 })],
  // iOS rundet die Ecken selbst ab und mag keine Transparenz
  ['public/icons/apple-touch-icon.png', () => renderIcon(logo, 180, { fill: 0.84 })],
  // Browser-Tab: so groß wie möglich, sonst ist der Tempel nicht zu erkennen
  ['public/icons/favicon-32.png', () => renderIcon(logo, 32, { fill: 0.96, radius: 0.18 })],
]

for (const [file, make] of outputs) {
  const target = join(root, file)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, make())
  console.log('erstellt:', file)
}
