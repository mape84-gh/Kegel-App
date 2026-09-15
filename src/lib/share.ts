/** Open WhatsApp (app on mobile, web on desktop) with a prefilled message. */
export function shareViaWhatsApp(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener')
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded'

/**
 * Share a canvas as a PNG. Uses the native share sheet where available
 * (mobile – WhatsApp shows up there directly), otherwise triggers a download
 * so it can be attached manually (e.g. in WhatsApp Web on desktop).
 */
export async function shareCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  title?: string,
): Promise<ShareOutcome> {
  const blob = await canvasToBlob(canvas)
  const file = new File([blob], filename, { type: 'image/png' })

  const nav = navigator as Navigator & {
    canShare?: (d: ShareData & { files?: File[] }) => boolean
    share?: (d: ShareData & { files?: File[] }) => Promise<void>
  }
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: title ?? filename })
      return 'shared'
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled'
      // share failed for another reason -> fall through to download
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}
