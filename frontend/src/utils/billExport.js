import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'

const COLOR_PROPS = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
  'fill',
  'stroke',
]

function toKebab(prop) {
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

const COPY_PROPS = [
  ...COLOR_PROPS,
  'textAlign',
  'verticalAlign',
  'fontWeight',
  'fontSize',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'borderRadius',
  'borderCollapse',
  'display',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'whiteSpace',
  'overflow',
  'boxShadow',
]

function applyComputedStyles(original, clone) {
  if (!(original instanceof Element) || !(clone instanceof Element)) return

  const computed = window.getComputedStyle(original)
  for (const prop of COPY_PROPS) {
    const value = computed[prop]
    if (value) clone.style.setProperty(toKebab(prop), value)
  }

  const backgroundImage = computed.backgroundImage
  if (backgroundImage && backgroundImage !== 'none') {
    clone.style.backgroundImage = backgroundImage
  }

  const oKids = original.children
  const cKids = clone.children
  for (let i = 0; i < oKids.length; i += 1) {
    if (cKids[i]) applyComputedStyles(oKids[i], cKids[i])
  }
}

export async function captureElement(element, backgroundColor = '#ffffff') {
  if (!element) throw new Error('Nothing to capture')

  const parent = element.parentElement
  const parentPrev = parent
    ? {
        overflow: parent.style.overflow,
        maxHeight: parent.style.maxHeight,
        height: parent.style.height,
      }
    : null

  const elementPrev = {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    opacity: element.style.opacity,
    visibility: element.style.visibility,
    zIndex: element.style.zIndex,
    overflow: element.style.overflow,
    maxHeight: element.style.maxHeight,
  }

  if (parent) {
    parent.style.overflow = 'visible'
    parent.style.maxHeight = 'none'
    parent.style.height = 'auto'
  }

  element.style.position = 'fixed'
  element.style.left = '0'
  element.style.top = '0'
  element.style.opacity = '1'
  element.style.visibility = 'visible'
  element.style.zIndex = '-1'
  element.style.overflow = 'visible'
  element.style.maxHeight = 'none'

  const width = Math.ceil(element.scrollWidth)
  const height = Math.ceil(element.scrollHeight)

  try {
    return await html2canvas(element, {
      scale: 2,
      backgroundColor,
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      onclone: (_clonedDoc, clonedElement) => {
        clonedElement.style.overflow = 'visible'
        clonedElement.style.maxHeight = 'none'
        clonedElement.style.height = 'auto'
        clonedElement.style.width = `${width}px`
        applyComputedStyles(element, clonedElement)
      },
    })
  } finally {
    Object.assign(element.style, elementPrev)
    if (parent && parentPrev) {
      Object.assign(parent.style, parentPrev)
    }
  }
}

export function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to create image'))
    }, type)
  })
}

export function downloadCanvasAsPng(canvas, filename) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export function downloadCanvasAsPdf(canvas, filename) {
  const imgData = canvas.toDataURL('image/png')
  const isWide = canvas.width > canvas.height * 1.1
  const pdf = new jsPDF({
    orientation: isWide ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 5
  const printableWidth = pageWidth - margin * 2
  const printableHeight = pageHeight - margin * 2

  const imgWidth = printableWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  if (imgHeight <= printableHeight) {
    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight)
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
    return
  }

  let heightLeft = imgHeight
  let position = margin

  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
  heightLeft -= printableHeight

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft)
    pdf.addPage('a4', isWide ? 'landscape' : 'portrait')
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
    heightLeft -= printableHeight
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

export async function shareFile(blob, filename, title, text) {
  const file = new File([blob], filename, { type: blob.type })
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title, text })
    return 'shared'
  }
  return 'unsupported'
}

export function openWhatsApp(phone, message) {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) {
    throw new Error('Customer phone number is required for WhatsApp')
  }
  const normalized = digits.length === 10 ? `91${digits}` : digits
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function exportBillCard({
  element,
  filenameBase,
  customerPhone,
  billMessage,
}) {
  const canvas = await captureElement(element)
  const pngFilename = `${filenameBase}.png`
  const blob = await canvasToBlob(canvas)

  return {
    canvas,
    blob,
    pngFilename,
    async downloadImage() {
      downloadCanvasAsPng(canvas, pngFilename)
    },
    async downloadPdf() {
      downloadCanvasAsPdf(canvas, `${filenameBase}.pdf`)
    },
    async shareImage() {
      const result = await shareFile(
        blob,
        pngFilename,
        billMessage,
        billMessage
      )
      if (result === 'unsupported') {
        downloadCanvasAsPng(canvas, pngFilename)
      }
      return result
    },
    async shareWhatsApp() {
      const shareResult = await shareFile(
        blob,
        pngFilename,
        billMessage,
        billMessage
      )
      if (shareResult === 'shared') return 'shared'

      openWhatsApp(customerPhone, billMessage)
      return 'whatsapp'
    },
  }
}

export function exportTableCsv(rows, columns, filename) {
  const header = columns.map((c) => c.label).join(',')
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = c.value(row)
          const str = String(val ?? '').replace(/"/g, '""')
          return `"${str}"`
        })
        .join(',')
    )
    .join('\n')
  const csv = `${header}\n${body}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
