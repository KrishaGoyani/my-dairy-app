export const t = (en, gu) => `${en} (${gu})`

export const BRAND_NAME = 'MyDairy'
export const BRAND_TAGLINE = t('Milk Delivery & Billing', 'દૂધ ડિલિવરી અને બિલ')

export const SESSIONS = [
  { id: 'morning', label: t('Morning', 'સવાર'), icon: '☀️' },
  { id: 'evening', label: t('Evening', 'સાંજ'), icon: '🌙' },
]

export const SOURCES = [
  {
    id: 'batli',
    label: t('Batli', 'બાટલી'),
    types: ['M'],
    cols: { M: true, G: false, B: false },
  },
  {
    id: 'cow',
    label: t('Cow', 'ગાય'),
    types: ['G'],
    cols: { M: false, G: true, B: false },
  },
  {
    id: 'potla',
    label: t('Potla', 'પોટલા'),
    types: ['M', 'G', 'B'],
    cols: { M: true, G: true, B: true },
  },
]

export const MILK_TYPES = [
  { id: 'M', label: t('Mahi', 'માહી'), short: 'M' },
  { id: 'G', label: t('Gold', 'ગોલ્ડ'), short: 'G' },
  { id: 'B', label: t('Buffalo', 'ભેંસ'), short: 'B' },
]

/** Gujarati-only labels for bulk delivery table columns */
export const BULK_COLUMN_LABELS = {
  'batli-M': 'માહી-બાટલી',
  'cow-G': 'ગાય-બાટલી',
  'potla-B': 'બફેલો-પોટલા',
  'potla-G': 'ગોલ્ડ-પોટલા',
  'potla-M': 'માહી-પોટલા',
}

export const DEFAULT_SHORT_LABELS = { ...BULK_COLUMN_LABELS }

export const POTLA_MILK_TYPES_ORDER = ['B', 'G', 'M']

/** Flat product columns for bulk delivery entry */
export const BULK_ENTRY_COLUMNS = [
  { source: 'batli', milkType: 'M' },
  { source: 'cow', milkType: 'G' },
  { source: 'potla', milkType: 'B' },
  { source: 'potla', milkType: 'G' },
  { source: 'potla', milkType: 'M' },
]

export function isPotlaColumn(source) {
  return source === 'potla'
}

export function isPotlaGroupStart(source, milkType) {
  return source === 'potla' && milkType === 'B'
}

/** Dark vertical line between ☀️ સવાર and 🌙 સાંજ columns */
export const SESSION_DIVIDER = 'border-l-[3px] border-l-dairy-700'

export function entryCellSurface(source, variant) {
  const isMorning = variant === 'morning'
  const isPotla = isPotlaColumn(source)

  if (isPotla) {
    return isMorning
      ? {
          td: 'bg-emerald-50/60',
          input: 'border-emerald-300 bg-emerald-50 focus:outline-none focus:border-dairy-600 focus:ring-1 focus:ring-dairy-400/40',
          header: 'bg-emerald-700',
          data: 'bg-emerald-50/70',
        }
      : {
          td: 'bg-teal-50/60',
          input: 'border-teal-300 bg-teal-50 focus:outline-none focus:border-dairy-600 focus:ring-1 focus:ring-dairy-400/40',
          header: 'bg-teal-800',
          data: 'bg-teal-50/70',
        }
  }

  return isMorning
    ? {
        td: 'bg-amber-50/40',
        input: 'border-amber-200 bg-amber-50/80 focus:outline-none focus:border-dairy-600 focus:ring-1 focus:ring-dairy-400/40',
        header: 'bg-dairy-600',
        data: '',
      }
    : {
        td: 'bg-indigo-50/40',
        input: 'border-indigo-200 bg-indigo-50/80 focus:outline-none focus:border-dairy-600 focus:ring-1 focus:ring-dairy-400/40',
        header: 'bg-dairy-700',
        data: '',
      }
}

export function sourceCountFromSummary(src, source, milkType) {
  if (!src) return 0
  if (source === 'batli') return src.batli?.liters || 0
  if (source === 'cow') return src.cow?.liters || 0
  if (source === 'potla') return src.potla?.[milkType]?.liters || 0
  return 0
}

export function bulkColumnLabel(source, milkType, rates) {
  const rate = rates?.find((r) => r.source === source && r.milk_type === milkType)
  const short = BULK_COLUMN_LABELS[`${source}-${milkType}`] || ''
  return { short, rate: rate?.rate ?? 0 }
}

export const DEFAULT_PACK_SIZES = {
  'batli-M': '500ml',
  'cow-G': '500ml',
  'potla-M': '6L',
  'potla-G': '6L',
  'potla-B': '6L',
}

export const REPORT_GROUP_OPTIONS = [
  { id: 'day', label: t('Day', 'દિવસ') },
  { id: 'week', label: t('Week', 'સપ્તાહ') },
  { id: 'month', label: t('Month', 'મહિનો') },
  { id: 'year', label: t('Year', 'વર્ષ') },
]

const REPORT_PRODUCT_PREFIX = {
  'batli-M': 'batli',
  'cow-G': 'cow',
  'potla-M': 'potla_m',
  'potla-G': 'potla_g',
  'potla-B': 'potla_b',
}

/** Columns used in reports / bills — prefix matches API field names */
export const REPORT_PRODUCTS = BULK_ENTRY_COLUMNS.map((col) => ({
  prefix: REPORT_PRODUCT_PREFIX[`${col.source}-${col.milkType}`],
  source: col.source,
  milkType: col.milkType,
  title: (rates) => bulkColumnLabel(col.source, col.milkType, rates).short,
  subtitle: (rates) => {
    const { rate } = bulkColumnLabel(col.source, col.milkType, rates)
    return rate ? `₹${rate}` : ''
  },
}))

export function sessionProductCount(row, prefix, session) {
  if (!row) return 0
  return row[`${prefix}_${session}_liters`] || 0
}

export function sessionProductAmount(row, prefix, session) {
  if (!row) return 0
  return row[`${prefix}_${session}_amount`] || 0
}

export function rateShortLabel(rate) {
  if (rate?.short_label) return rate.short_label
  if (!rate) return ''
  return BULK_COLUMN_LABELS[`${rate.source}-${rate.milk_type}`] || ''
}

export function ratePackSize(rate) {
  if (rate?.pack_size) return rate.pack_size
  if (!rate) return ''
  return DEFAULT_PACK_SIZES[`${rate.source}-${rate.milk_type}`] || ''
}

export function formatRateWithPack(rate) {
  if (!rate) return '-'
  const pack = ratePackSize(rate)
  return pack ? `₹${rate.rate} / ${pack}` : `₹${rate.rate}`
}

export function packSizeFor(source, milkType, rates) {
  const rate = rates?.find(
    (r) => r.source === source && r.milk_type === milkType
  )
  return ratePackSize(rate) || DEFAULT_PACK_SIZES[`${source}-${milkType}`] || ''
}

/** Quantity stored as `liters` in DB = number of packs sold */
export function formatPackQty(count) {
  const n = Number(count)
  if (!n || n <= 0) return null
  return String(n)
}

export function formatPackCount(count, source, milkType, rates, { withPack = false } = {}) {
  const n = Number(count)
  if (!n || n <= 0) return null
  if (!withPack) return String(n)
  const pack = packSizeFor(source, milkType, rates)
  return pack ? `${n} × ${pack}` : String(n)
}

export function formatPackTotal(count) {
  const qty = formatPackQty(count)
  if (!qty) return '—'
  return qty
}

export function potlaColumnLabel(milkType, rates) {
  const { short, rate } = bulkColumnLabel('potla', milkType, rates)
  const pack = packSizeFor('potla', milkType, rates)
  return {
    short,
    pack,
    rate,
    rateLabel: rate ? `₹${rate}` : '',
    full: pack ? `${short} (${pack})` : short,
  }
}

export function formatProductLine(source, milkType, count, rates) {
  const qty = formatPackQty(count)
  if (!qty) return null
  const { short } = bulkColumnLabel(source, milkType, rates)
  return `${short} ${qty}`
}

export function formatBatliLine(count, rates) {
  return formatProductLine('batli', 'M', count, rates)
}

export function formatCowLine(count, rates) {
  return formatProductLine('cow', 'G', count, rates)
}

export function formatPotlaLine(milkType, count, rates) {
  return formatProductLine('potla', milkType, count, rates)
}

export function formatSourceBreakdown(summary, rates) {
  const parts = []
  const batli = formatBatliLine(summary.batli_liters, rates)
  const cow = formatCowLine(summary.cow_liters, rates)
  const potB = formatPotlaLine('B', summary.potla_b_liters, rates)
  const potG = formatPotlaLine('G', summary.potla_g_liters, rates)
  const potM = formatPotlaLine('M', summary.potla_m_liters, rates)
  if (batli) parts.push(batli)
  if (cow) parts.push(cow)
  if (potB) parts.push(potB)
  if (potG) parts.push(potG)
  if (potM) parts.push(potM)
  return parts.join(' · ') || '-'
}

export function formatPotlaSummary(summary, rates) {
  const parts = []
  for (const type of POTLA_MILK_TYPES_ORDER) {
    const count = summary[`potla_${type.toLowerCase()}_liters`]
    const line = formatPotlaLine(type, count, rates)
    if (line) parts.push(line)
  }
  return parts.join(' · ') || '—'
}

export const MONTHS = [
  { value: 1, label: t('January', 'જાન્યુઆરી') },
  { value: 2, label: t('February', 'ફેબ્રુઆરી') },
  { value: 3, label: t('March', 'માર્ચ') },
  { value: 4, label: t('April', 'એપ્રિલ') },
  { value: 5, label: t('May', 'મે') },
  { value: 6, label: t('June', 'જૂન') },
  { value: 7, label: t('July', 'જુલાઈ') },
  { value: 8, label: t('August', 'ઑગસ્ટ') },
  { value: 9, label: t('September', 'સપ્ટેમ્બર') },
  { value: 10, label: t('October', 'ઑક્ટોબર') },
  { value: 11, label: t('November', 'નવેમ્બર') },
  { value: 12, label: t('December', 'ડિસેમ્બર') },
]

export function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function toISODateLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatInputDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function parseInputDate(text) {
  const trimmed = (text || '').trim()
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null
  }
  return toISODateLocal(d)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return formatInputDate(dateStr.slice(0, 10))
}

export function todayISO() {
  return toISODateLocal(new Date())
}

export function defaultMonthRange(ref = new Date()) {
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 0)
  return {
    dateFrom: toISODateLocal(from),
    dateTo: toISODateLocal(to),
  }
}

export function customerDisplay(c) {
  if (!c) return ''
  return c.name || ''
}

export const CUSTOMER_SORT_STORAGE_KEY = 'customers-sort'

export const CUSTOMER_SORT_OPTIONS = [
  { id: 'entry', label: t('Entry Order', 'નોંધ ક્રમ') },
  { id: 'name', label: t('Name A-Z', 'નામ A-Z') },
  { id: 'name_desc', label: t('Name Z-A', 'નામ Z-A') },
]

function customerEntryTime(customer) {
  if (customer?.created_at) return new Date(customer.created_at).getTime()
  const hex = customer?.id?.slice(0, 8)
  if (hex && /^[a-f0-9]{8}$/i.test(hex)) return parseInt(hex, 16) * 1000
  return 0
}

export function sortCustomers(customers, sortBy = 'entry') {
  const list = [...(customers || [])]
  if (sortBy === 'name') {
    return list.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'gu', { sensitivity: 'base' })
    )
  }
  if (sortBy === 'name_desc') {
    return list.sort((a, b) =>
      (b.name || '').localeCompare(a.name || '', 'gu', { sensitivity: 'base' })
    )
  }
  return list.sort((a, b) => {
    const diff = customerEntryTime(a) - customerEntryTime(b)
    if (diff !== 0) return diff
    return (a.id || '').localeCompare(b.id || '')
  })
}

export function emptyGrid() {
  return {
    batli: { M: '', G: '', B: '' },
    cow: { M: '', G: '', B: '' },
    potla: { M: '', G: '', B: '' },
  }
}

export function emptyCustomerSessions() {
  return {
    morning: emptyGrid(),
    evening: emptyGrid(),
  }
}

export function buildEntriesFromGrid(grid) {
  const entries = []
  for (const source of SOURCES) {
    for (const type of source.types) {
      const val = parseFloat(grid[source.id]?.[type] || 0)
      if (val > 0) {
        entries.push({ source: source.id, milk_type: type, liters: val })
      }
    }
  }
  return entries
}

export function fillGridFromEntries(entries) {
  const grid = emptyGrid()
  for (const e of entries || []) {
    if (grid[e.source]) {
      grid[e.source][e.milk_type] = String(e.liters)
    }
  }
  return grid
}

export function calcSessionTotal(entries, rates) {
  let total = 0
  for (const e of entries) {
    const rate = rates.find(
      (r) => r.source === e.source && r.milk_type === e.milk_type
    )
    if (rate) total += e.liters * rate.rate
  }
  return Math.round(total * 100) / 100
}

/** Sum delivery lines by source — same structure as delivery entry grid */
export function summarizeBySource(lines) {
  const empty = () => ({ liters: 0, amount: 0 })
  const result = {
    batli: empty(),
    cow: empty(),
    potla: { M: empty(), G: empty(), B: empty() },
  }
  for (const line of lines || []) {
    if (line.source === 'batli') {
      result.batli.liters += line.liters
      result.batli.amount += line.amount
    } else if (line.source === 'cow') {
      result.cow.liters += line.liters
      result.cow.amount += line.amount
    } else if (line.source === 'potla' && result.potla[line.milk_type]) {
      result.potla[line.milk_type].liters += line.liters
      result.potla[line.milk_type].amount += line.amount
    }
  }
  return result
}

export function sourceBreakdownFromRow(row) {
  return {
    batli: { liters: row.batli_liters, amount: row.batli_amount },
    cow: { liters: row.cow_liters, amount: row.cow_amount },
    potla: {
      M: { liters: row.potla_m_liters, amount: row.potla_m_amount },
      G: { liters: row.potla_g_liters, amount: row.potla_g_amount },
      B: { liters: row.potla_b_liters, amount: row.potla_b_amount },
    },
  }
}
