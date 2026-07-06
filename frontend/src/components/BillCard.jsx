import { useMemo } from 'react'
import {
  BRAND_NAME,
  SESSIONS,
  BULK_ENTRY_COLUMNS,
  bulkColumnLabel,
  entryCellSurface,
  SESSION_DIVIDER,
  sourceCountFromSummary,
  formatCurrency,
  t,
  summarizeBySource,
  formatPackQty,
  formatPackTotal,
  formatBatliLine,
  formatCowLine,
  formatPotlaLine,
  POTLA_MILK_TYPES_ORDER,
} from '../utils/labels'

function PackCell({ count }) {
  const qty = formatPackQty(count)
  if (!qty) return <span className="text-slate-400">—</span>
  return <span>{qty}</span>
}

function ProductHeaderCells({ rates, isMorning }) {
  const variant = isMorning ? 'morning' : 'evening'
  return BULK_ENTRY_COLUMNS.map((col, index) => {
    const { short, rate } = bulkColumnLabel(col.source, col.milkType, rates)
    const surface = entryCellSurface(col.source, variant)
    const divider = !isMorning && index === 0
    return (
      <th
        key={`${isMorning ? 'am' : 'pm'}-${col.source}-${col.milkType}`}
        className={`px-0.5 py-1 text-center text-[9px] font-medium text-white ${
          divider ? SESSION_DIVIDER : ''
        } ${surface.header}`}
      >
        <div className="line-clamp-2 leading-tight">{short}</div>
        <div className="font-normal opacity-80">{rate ? `₹${rate}` : ''}</div>
      </th>
    )
  })
}

function SessionProductCells({ lines, variant }) {
  const src = summarizeBySource(lines)
  return (
    <>
      {BULK_ENTRY_COLUMNS.map((col, index) => {
        const surface = entryCellSurface(col.source, variant)
        const divider = variant === 'evening' && index === 0
        return (
          <td
            key={`${variant}-${col.source}-${col.milkType}`}
            className={`px-0.5 py-1.5 text-center ${divider ? SESSION_DIVIDER : ''} ${
              surface.data || surface.td
            }`}
          >
            <PackCell count={sourceCountFromSummary(src, col.source, col.milkType)} />
          </td>
        )
      })}
    </>
  )
}

function sessionLines(day, sessionId) {
  if (!day) return []
  const session = day.sessions?.find((s) => s.session === sessionId)
  if (session) return session.lines || []
  if (sessionId === 'morning' && day.lines && (!day.sessions || day.sessions.length === 0)) {
    return day.lines
  }
  return []
}

function DayRow({ dayNum, day }) {
  if (!day) {
    return (
      <tr className="border-b border-amber-50 text-slate-400">
        <td className="px-1 py-2 text-center font-medium">{dayNum}</td>
        {Array.from({ length: 10 }).map((_, i) => (
          <td key={i} className="px-0.5 py-2 text-center">
            —
          </td>
        ))}
        <td className="px-1 py-2 text-center">—</td>
        <td className="px-1 py-2 text-center">—</td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-amber-100 text-[10px] sm:text-xs">
      <td className="border-r border-amber-200 px-1 py-2 text-center align-middle text-sm font-bold">
        {dayNum}
      </td>
      <SessionProductCells lines={sessionLines(day, 'morning')} variant="morning" />
      <SessionProductCells lines={sessionLines(day, 'evening')} variant="evening" />
      <td className="border-l border-amber-100 px-1 py-1.5 text-right font-medium">
        {formatCurrency(day.total_amount)}
      </td>
      <td className="px-1 py-1.5 text-right text-green-700">
        {day.paid_amount > 0 ? formatCurrency(day.paid_amount) : '—'}
      </td>
    </tr>
  )
}

export default function BillCard({ bill, cardRef, rates = [] }) {
  const { customer, month, year, days } = bill

  const leftDays = useMemo(() => {
    const map = {}
    for (const d of days) {
      map[parseInt(d.date.slice(-2), 10)] = d
    }
    return map
  }, [days])

  const renderHalf = (start, end) => (
    <table className="w-full border-collapse text-xs sm:text-sm">
      <thead>
        <tr className="border-b-2 border-amber-800 bg-amber-100/80">
          <th rowSpan={2} className="px-1 py-2 text-center">
            {t('Dt', 'તા')}
          </th>
          <th
            colSpan={BULK_ENTRY_COLUMNS.length}
            className="border-l border-amber-700 px-1 py-1.5 text-center text-[11px] font-semibold"
          >
            ☀️ સવાર
          </th>
          <th
            colSpan={BULK_ENTRY_COLUMNS.length}
            className={`border-l border-amber-700 px-1 py-1.5 text-center text-[11px] font-semibold ${SESSION_DIVIDER}`}
          >
            🌙 સાંજ
          </th>
          <th rowSpan={2} className="border-l border-amber-700 px-1 py-2 text-center">
            {t('Total', 'કુલ')}
          </th>
          <th rowSpan={2} className="border-l border-amber-700 px-1 py-2 text-center">
            {t('Paid', 'જમા')}
          </th>
        </tr>
        <tr className="border-b border-amber-800 text-amber-950">
          <ProductHeaderCells rates={rates} isMorning />
          <ProductHeaderCells rates={rates} isMorning={false} />
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((dayNum) => (
          <DayRow key={dayNum} dayNum={dayNum} day={leftDays[dayNum]} />
        ))}
      </tbody>
    </table>
  )

  const billSummary = bill

  return (
    <div
      ref={cardRef}
      className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border-4 border-amber-700 bg-gradient-to-b from-amber-50 to-yellow-100 p-3 shadow-xl sm:p-5"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      <div className="mb-3 border-2 border-amber-800 bg-amber-200 py-2 text-center">
        <h2 className="text-lg font-bold tracking-wide text-amber-950 sm:text-xl">
          {BRAND_NAME} — {t('MILK BILL', 'દૂધ બિલ')}
        </h2>
      </div>

      <div className="mb-4 space-y-2 border-b border-amber-300 pb-3 text-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <strong>{t('Customer', 'ગ્રાહક')}:</strong> {customer.name}
          </span>
          {customer.phone && (
            <span>
              <strong>{t('Phone', 'ફોન')}:</strong> {customer.phone}
            </span>
          )}
        </div>
        <div>
          <strong>{t('Month', 'મહિનો')}:</strong> {month} {year}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="overflow-x-auto">{renderHalf(1, 16)}</div>
        <div className="overflow-x-auto">{renderHalf(17, 31)}</div>
      </div>

      <div className="mt-4 grid gap-2 border-t-2 border-amber-800 pt-3 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <p>
            <strong>{t('Total Packs', 'કુલ પેક')}:</strong>{' '}
            {formatPackTotal(billSummary.total_liters)}
          </p>
          <p className="text-xs text-amber-900">
            {[
              formatBatliLine(billSummary.batli_liters, rates),
              formatCowLine(billSummary.cow_liters, rates),
              ...POTLA_MILK_TYPES_ORDER.map((type) =>
                formatPotlaLine(
                  type,
                  billSummary[`potla_${type.toLowerCase()}_liters`],
                  rates
                )
              ),
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
          <p>
            <strong>{t('Bill Amount', 'બિલ રકમ')}:</strong>{' '}
            {formatCurrency(billSummary.total_amount)}
          </p>
          <p>
            <strong>{t('Opening Balance', 'આગલી બાકી')}:</strong>{' '}
            {formatCurrency(billSummary.opening_balance)}
          </p>
        </div>
        <div className="space-y-1">
          <p>
            <strong>{t('Paid at Delivery', 'તરત જમા')}:</strong>{' '}
            {formatCurrency(billSummary.paid_at_delivery)}
          </p>
          <p>
            <strong>{t('Later Payment', 'પછી જમા')}:</strong>{' '}
            {formatCurrency(billSummary.later_payments)}
          </p>
          <p className="text-base font-bold text-amber-950">
            <strong>{t('Current Balance', 'ચાલુ બાકી')}:</strong>{' '}
            {formatCurrency(billSummary.current_balance)}
          </p>
        </div>
      </div>

      <div className="mt-4 border border-amber-400 bg-amber-50/50 p-3 text-center text-xs text-amber-900">
        {BRAND_NAME} — {t('Milk Register', 'દૂધ રજિસ્ટર')}
      </div>
    </div>
  )
}
