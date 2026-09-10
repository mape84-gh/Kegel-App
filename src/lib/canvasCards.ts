// Lightweight canvas image cards (no external deps). All sizes in CSS px,
// backed by a 2x bitmap for crisp output.

const W = 1080
const H = 1080
const BG = '#0B0B0F'
const CARD = '#1C1C1E'
const LINE = '#38383A'
const BLUE = '#0A84FF'
const GOLD = '#E8B93B'
const SILVER = '#C7C2B8'
const BRONZE = '#C08A5B'
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

export interface PodiumPerson {
  name: string
  value: number
}

/** Evening podium: places 1-2-3 with names + points for that evening. */
export function drawEveningPodium(
  dateLabel: string,
  top3: PodiumPerson[],
  criterion = 'nach Meisterschaftspunkten des Abends',
  valueSuffix = ' Pkt',
): HTMLCanvasElement {
  const { c, ctx } = newCanvas()
  header(ctx, 'Abend-Podium', `${dateLabel}  ·  ${criterion}`)

  const order = [top3[1], top3[0], top3[2]] // silver, gold, bronze
  const colors = [SILVER, GOLD, BRONZE]
  const heights = [300, 400, 230]
  const slotW = 260
  const gap = 40
  const totalW = slotW * 3 + gap * 2
  const startX = (W - totalW) / 2
  const baseY = 900

  order.forEach((p, i) => {
    const x = startX + i * (slotW + gap)
    const barH = heights[i]

    ctx.fillStyle = CARD
    roundRect(ctx, x, baseY - barH, slotW, barH, 20)
    ctx.fill()
    ctx.strokeStyle = colors[i]
    ctx.lineWidth = 3
    roundRect(ctx, x, baseY - barH, slotW, barH, 20)
    ctx.stroke()

    ctx.fillStyle = colors[i]
    ctx.font = '800 64px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String([2, 1, 3][i]), x + slotW / 2, baseY - barH + 84)

    if (p) {
      ctx.fillStyle = TEXT
      ctx.font = '700 34px Inter, system-ui, sans-serif'
      ctx.fillText(clip(ctx, p.name, slotW - 24), x + slotW / 2, baseY - barH + 150)
      ctx.fillStyle = BLUE
      ctx.font = '700 40px Inter, system-ui, sans-serif'
      ctx.fillText(`${p.value}${valueSuffix}`, x + slotW / 2, baseY - 40)
    } else {
      ctx.fillStyle = MUTED
      ctx.font = '500 28px Inter, system-ui, sans-serif'
      ctx.fillText('—', x + slotW / 2, baseY - barH + 150)
    }
  })

  footer(ctx)
  return c
}

export interface ReviewRow {
  label: string
  name: string
  value: string
}

/** Year review: headline stats for the calendar year. */
export function drawYearReview(year: number, rows: ReviewRow[]): HTMLCanvasElement {
  const { c, ctx } = newCanvas()
  header(ctx, `Rückblick ${year}`, 'Die Saison in Zahlen')

  let y = 360
  const x = 90
  const rowW = W - 180
  for (const r of rows) {
    ctx.fillStyle = CARD
    roundRect(ctx, x, y, rowW, 118, 20)
    ctx.fill()
    ctx.strokeStyle = LINE
    ctx.lineWidth = 2
    roundRect(ctx, x, y, rowW, 118, 20)
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = MUTED
    ctx.font = '600 24px Inter, system-ui, sans-serif'
    ctx.fillText(r.label.toUpperCase(), x + 32, y + 42)

    ctx.fillStyle = TEXT
    ctx.font = '700 40px Inter, system-ui, sans-serif'
    ctx.fillText(clip(ctx, r.name, rowW - 320), x + 32, y + 88)

    ctx.textAlign = 'right'
    ctx.fillStyle = BLUE
    ctx.font = '800 44px Inter, system-ui, sans-serif'
    ctx.fillText(r.value, x + rowW - 32, y + 76)

    y += 138
  }

  footer(ctx)
  return c
}

function clip(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}
