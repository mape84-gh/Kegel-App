// Lightweight canvas image cards (no external deps). All sizes in CSS px,
// backed by a 2x bitmap for crisp output.

const W = 1080
const H = 1080
const BG = '#0B0B0F'
const CARD = '#1C1C1E'
const LINE = '#38383A'
const BLUE = '#0A84FF'
const TEXT = '#FFFFFF'
const MUTED = '#8E8E93'

function newCanvas(): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas')
  c.width = W * 2
  c.height = H * 2
  const ctx = c.getContext('2d')!
  ctx.scale(2, 2)
  ctx.textBaseline = 'alphabetic'
  return { c, ctx }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function header(ctx: CanvasRenderingContext2D, title: string, subtitle: string) {
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#F4F1EA'
  roundRect(ctx, W / 2 - 46, 60, 92, 92, 24)
  ctx.fill()
  ctx.fillStyle = BLUE
  ctx.font = '700 40px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('RS', W / 2, 118)

  ctx.fillStyle = TEXT
  ctx.font = '800 52px Inter, system-ui, sans-serif'
  ctx.fillText(title, W / 2, 220)

  ctx.fillStyle = MUTED
  ctx.font = '500 30px Inter, system-ui, sans-serif'
  ctx.fillText(subtitle, W / 2, 264)
}

function footer(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = MUTED
  ctx.font = '500 26px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Ratinger Skatschützen', W / 2, H - 48)
}

export interface ReviewRow {
  label: string
  name: string
  value: string
}

function drawRows(ctx: CanvasRenderingContext2D, rows: ReviewRow[], startY = 360) {
  let y = startY
  const x = 90
  const rowW = W - 180
  for (const r of rows) {
    ctx.fillStyle = CARD
    roundRect(ctx, x, y, rowW, 150, 20)
    ctx.fill()
    ctx.strokeStyle = LINE
    ctx.lineWidth = 2
    roundRect(ctx, x, y, rowW, 150, 20)
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = MUTED
    ctx.font = '600 26px Inter, system-ui, sans-serif'
    ctx.fillText(r.label.toUpperCase(), x + 36, y + 46)

    ctx.fillStyle = TEXT
    ctx.font = '700 46px Inter, system-ui, sans-serif'
    ctx.fillText(clip(ctx, r.name, rowW - 340), x + 36, y + 104)

    ctx.textAlign = 'right'
    ctx.fillStyle = BLUE
    ctx.font = '800 50px Inter, system-ui, sans-serif'
    ctx.fillText(r.value, x + rowW - 36, y + 88)

    y += 172
  }
}

/** Evening highlights: the 3 stand-out performances of one evening. */
export function drawEveningHighlights(dateLabel: string, rows: ReviewRow[]): HTMLCanvasElement {
  const { c, ctx } = newCanvas()
  header(ctx, 'Abend-Highlights', dateLabel)
  drawRows(ctx, rows, 380)
  footer(ctx)
  return c
}

/** Year review: headline stats for the calendar year. */
export function drawYearReview(year: number, rows: ReviewRow[]): HTMLCanvasElement {
  const { c, ctx } = newCanvas()
  header(ctx, `Rückblick ${year}`, 'Die Saison in Zahlen')
  drawRows(ctx, rows, 360)
  footer(ctx)
  return c
}

function clip(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}
