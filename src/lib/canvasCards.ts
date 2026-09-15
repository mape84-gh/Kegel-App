// Lightweight canvas image cards (no external deps). All sizes in CSS px,
// backed by a 2x bitmap for crisp output.

const W = 1080
const BG = '#0B0B0F'
const CARD = '#1C1C1E'
const LINE = '#38383A'
const BLUE = '#0A84FF'
const TEXT = '#FFFFFF'
const MUTED = '#8E8E93'

function newCanvas(height: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas')
  c.width = W * 2
  c.height = height * 2
  const ctx = c.getContext('2d')!
  ctx.scale(2, 2)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, height)
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

function footer(ctx: CanvasRenderingContext2D, height: number) {
  ctx.fillStyle = MUTED
  ctx.font = '500 26px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Ratinger Skatschützen', W / 2, height - 40)
}

export interface ReviewRow {
  label: string
  name: string
  value: string
}

function drawRows(ctx: CanvasRenderingContext2D, rows: ReviewRow[], startY: number): number {
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
  return y
}

/** Evening highlights: the 3 stand-out performances of one evening. */
export function drawEveningHighlights(dateLabel: string, rows: ReviewRow[]): HTMLCanvasElement {
  const height = 1080
  const { c, ctx } = newCanvas(height)
  header(ctx, 'Abend-Highlights', dateLabel)
  drawRows(ctx, rows, 380)
  footer(ctx, height)
  return c
}

/** Year review: headline stats for the calendar year. */
export function drawYearReview(year: number, rows: ReviewRow[]): HTMLCanvasElement {
  const height = 1080
  const { c, ctx } = newCanvas(height)
  header(ctx, `Rückblick ${year}`, 'Die Saison in Zahlen')
  drawRows(ctx, rows, 360)
  footer(ctx, height)
  return c
}

export interface PersonTotal {
  name: string
  total: number
  absent?: boolean
}

/** Full evening report: stat strip, the 3 highlights, and every participant's total. */
export function drawEveningReport(
  dateLabel: string,
  stats: { teilnehmer: number; einnahmen: number },
  highlights: ReviewRow[],
  people: PersonTotal[],
): HTMLCanvasElement {
  const rowH = 64
  const height = 300 + 130 + highlights.length * 172 + 70 + people.length * rowH + 90
  const { c, ctx } = newCanvas(height)
  header(ctx, 'Kegelabend', dateLabel)

  // stat strip
  const statY = 300
  ctx.textAlign = 'center'
  ctx.fillStyle = BLUE
  ctx.font = '800 46px Inter, system-ui, sans-serif'
  ctx.fillText(String(stats.teilnehmer), W * 0.28, statY + 44)
  ctx.fillText(`${stats.einnahmen.toFixed(2).replace('.', ',')} €`, W * 0.72, statY + 44)
  ctx.fillStyle = MUTED
  ctx.font = '500 24px Inter, system-ui, sans-serif'
  ctx.fillText('Teilnehmer', W * 0.28, statY + 78)
  ctx.fillText('Einnahmen', W * 0.72, statY + 78)
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W / 2, statY)
  ctx.lineTo(W / 2, statY + 96)
  ctx.stroke()

  let y = drawRows(ctx, highlights, 300 + 130)

  y += 20
  ctx.textAlign = 'left'
  ctx.fillStyle = MUTED
  ctx.font = '600 26px Inter, system-ui, sans-serif'
  ctx.fillText('ALLE TEILNEHMER', 90, y)
  y += 34

  const x = 90
  const rowW = W - 180
  for (const p of people) {
    ctx.strokeStyle = LINE
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y + rowH - 1)
    ctx.lineTo(x + rowW, y + rowH - 1)
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = p.absent ? MUTED : TEXT
    ctx.font = '600 32px Inter, system-ui, sans-serif'
    ctx.fillText(clip(ctx, p.name + (p.absent ? ' (abw.)' : ''), rowW - 240), x, y + 42)

    ctx.textAlign = 'right'
    ctx.fillStyle = p.absent ? MUTED : BLUE
    ctx.font = '700 34px Inter, system-ui, sans-serif'
    ctx.fillText(`${p.total.toFixed(2).replace('.', ',')} €`, x + rowW, y + 42)

    y += rowH
  }

  footer(ctx, height)
  return c
}

function clip(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}
