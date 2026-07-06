import { forwardRef, useMemo } from 'react'
import {
  BRAND_NAME,
  BULK_ENTRY_COLUMNS,
  POTLA_MILK_TYPES_ORDER,
  bulkColumnLabel,
  isPotlaColumn,
  sourceCountFromSummary,
  summarizeBySource,
  formatCurrency,
  formatBatliLine,
  formatCowLine,
  formatPotlaLine,
  formatPackTotal,
  t,
} from '../utils/labels'

const TABLE_BORDER = '1px solid #92400e'
const HEADER_BG = '#fef3c7'
const HEADER_DARK = '#b45309'

const thStyle = {
  border: TABLE_BORDER,
  padding: '5px 3px',
  textAlign: 'center',
  verticalAlign: 'middle',
  fontWeight: 700,
  fontSize: '10px',
  lineHeight: '13px',
  backgroundColor: HEADER_BG,
  color: '#78350f',
}

const tdStyle = {
  border: TABLE_BORDER,
  padding: '5px 3px',
  textAlign: 'center',
  verticalAlign: 'middle',
  fontSize: '10px',
  lineHeight: '13px',
  color: '#1e293b',
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

function SessionCells({ lines, variant }) {
  const src = summarizeBySource(lines)
  const isEvening = variant === 'evening'

  return BULK_ENTRY_COLUMNS.map((col, index) => {
    const count = sourceCountFromSummary(src, col.source, col.milkType)
    const divider = isEvening && index === 0
    const bg = isPotlaColumn(col.source)
      ? isEvening
        ? '#f0fdfa'
        : '#f0fdf4'
      : isEvening
        ? '#f5f7ff'
        : '#fffdf7'

    return (
      <td
        key={`${variant}-${col.source}-${col.milkType}`}
        style={{
          ...tdStyle,
          backgroundColor: bg,
          borderLeft: divider ? '2px solid #92400e' : TABLE_BORDER,
          fontWeight: count > 0 ? 700 : 400,
          color: count > 0 ? '#1e293b' : '#94a3b8',
        }}
      >
        {count > 0 ? count : '—'}
      </td>
    )
  })
}

function ProductHeaders({ rates, isMorning }) {
  return BULK_ENTRY_COLUMNS.map((col, index) => {
    const { short, rate } = bulkColumnLabel(col.source, col.milkType, rates)
    const divider = !isMorning && index === 0
    const bg = isPotlaColumn(col.source)
      ? isMorning
        ? '#fde68a'
        : '#ccfbf1'
      : isMorning
        ? '#fef08a'
        : '#e0e7ff'

    return (
      <th
        key={`${isMorning ? 'am' : 'pm'}-${col.source}-${col.milkType}`}
        style={{
          ...thStyle,
          backgroundColor: bg,
          borderLeft: divider ? '2px solid #92400e' : TABLE_BORDER,
          fontSize: '9px',
          fontWeight: 600,
        }}
      >
        <div>{short}</div>
        <div style={{ fontWeight: 400, fontSize: '8px' }}>{rate ? `₹${rate}` : ''}</div>
      </th>
    )
  })
}

function DayRow({ dayNum, day }) {
  if (!day) {
    return (
      <tr>
        <td style={{ ...tdStyle, fontWeight: 700 }}>{dayNum}</td>
        {Array.from({ length: 10 }).map((_, i) => (
          <td key={i} style={{ ...tdStyle, color: '#94a3b8' }}>
            —
          </td>
        ))}
        <td style={{ ...tdStyle, color: '#94a3b8' }}>—</td>
        <td style={{ ...tdStyle, color: '#94a3b8' }}>—</td>
      </tr>
    )
  }

  return (
    <tr>
      <td style={{ ...tdStyle, fontWeight: 700, fontSize: '11px' }}>{dayNum}</td>
      <SessionCells lines={sessionLines(day, 'morning')} variant="morning" />
      <SessionCells lines={sessionLines(day, 'evening')} variant="evening" />
      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
        {formatCurrency(day.total_amount)}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
        {day.paid_amount > 0 ? formatCurrency(day.paid_amount) : '—'}
      </td>
    </tr>
  )
}

function MonthTable({ start, end, leftDays, rates, title }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          marginBottom: '6px',
          fontSize: '11px',
          fontWeight: 700,
          color: '#92400e',
        }}
      >
        {title}
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          border: TABLE_BORDER,
        }}
      >
        <colgroup>
          <col style={{ width: '4%' }} />
          {Array.from({ length: 10 }).map((_, i) => (
            <col key={i} style={{ width: '7.6%' }} />
          ))}
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2} style={thStyle}>
              {t('Dt', 'તા')}
            </th>
            <th colSpan={BULK_ENTRY_COLUMNS.length} style={thStyle}>
              ☀️ {t('Morning', 'સવાર')}
            </th>
            <th
              colSpan={BULK_ENTRY_COLUMNS.length}
              style={{ ...thStyle, borderLeft: '2px solid #92400e' }}
            >
              🌙 {t('Evening', 'સાંજ')}
            </th>
            <th rowSpan={2} style={thStyle}>
              {t('Total', 'કુલ')}
            </th>
            <th rowSpan={2} style={thStyle}>
              {t('Paid', 'જમા')}
            </th>
          </tr>
          <tr>
            <ProductHeaders rates={rates} isMorning />
            <ProductHeaders rates={rates} isMorning={false} />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((dayNum) => (
            <DayRow key={dayNum} dayNum={dayNum} day={leftDays[dayNum]} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const BillExportCard = forwardRef(function BillExportCard({ bill, rates = [] }, ref) {
  const { customer, month, year } = bill

  const leftDays = useMemo(() => {
    const map = {}
    for (const d of bill.days) {
      map[parseInt(d.date.slice(-2), 10)] = d
    }
    return map
  }, [bill.days])

  const breakdown =
    [
      formatBatliLine(bill.batli_liters, rates),
      formatCowLine(bill.cow_liters, rates),
      ...POTLA_MILK_TYPES_ORDER.map((type) =>
        formatPotlaLine(type, bill[`potla_${type.toLowerCase()}_liters`], rates)
      ),
    ]
      .filter(Boolean)
      .join(' · ') || '—'

  const summaryRows = [
    [t('Total Packs', 'કુલ પેક'), formatPackTotal(bill.total_liters)],
    [t('Bill Amount', 'બિલ રકમ'), formatCurrency(bill.total_amount)],
    [t('Paid at Delivery', 'તરત જમા'), formatCurrency(bill.paid_at_delivery)],
    [t('Later Payment', 'પછી જમા'), formatCurrency(bill.later_payments)],
    [t('Total Paid', 'કુલ જમા'), formatCurrency(bill.total_paid)],
    [t('Opening Balance', 'આગલી બાકી'), formatCurrency(bill.opening_balance)],
    [t('Current Balance', 'ચાલુ બાકી'), formatCurrency(bill.current_balance)],
  ]

  return (
    <div
      ref={ref}
      style={{
        width: '1100px',
        overflow: 'visible',
        border: '3px solid #92400e',
        borderRadius: '8px',
        backgroundColor: '#fffbeb',
        padding: '16px',
        fontFamily: 'system-ui, sans-serif',
        color: '#1e293b',
      }}
    >
      <div
        style={{
          marginBottom: '12px',
          border: '2px solid #92400e',
          backgroundColor: HEADER_DARK,
          padding: '10px',
          textAlign: 'center',
          color: '#ffffff',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
          {BRAND_NAME} — {t('MILK BILL', 'દૂધ બિલ')}
        </h2>
      </div>

      <div
        style={{
          marginBottom: '14px',
          paddingBottom: '10px',
          borderBottom: '1px solid #fcd34d',
          fontSize: '13px',
          lineHeight: '20px',
        }}
      >
        <div>
          <strong>{t('Customer', 'ગ્રાહક')}:</strong> {customer.name}
        </div>
        {customer.phone && (
          <div>
            <strong>{t('Phone', 'ફોન')}:</strong> {customer.phone}
          </div>
        )}
        {customer.address && (
          <div>
            <strong>{t('Address', 'સરનામું')}:</strong> {customer.address}
          </div>
        )}
        <div>
          <strong>{t('Month', 'મહિનો')}:</strong> {month} {year}
        </div>
      </div>

      <MonthTable
        start={1}
        end={16}
        leftDays={leftDays}
        rates={rates}
        title={`${t('Days', 'દિવસ')} 1 – 16`}
      />
      <MonthTable
        start={17}
        end={31}
        leftDays={leftDays}
        rates={rates}
        title={`${t('Days', 'દિવસ')} 17 – 31`}
      />

      <div
        style={{
          marginTop: '14px',
          border: '2px solid #92400e',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            backgroundColor: HEADER_DARK,
            color: '#ffffff',
            padding: '8px 10px',
            fontSize: '12px',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {t('Bill Summary', 'બિલ સારાંશ')}
        </div>
        <div
          style={{
            padding: '10px 12px',
            fontSize: '11px',
            lineHeight: '16px',
            backgroundColor: '#fffef5',
            borderBottom: `1px solid ${TABLE_BORDER}`,
          }}
        >
          <strong>{t('Pack Breakdown', 'પેક વિગત')}:</strong> {breakdown}
        </div>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
            tableLayout: 'fixed',
          }}
        >
          <tbody>
            {summaryRows.map(([label, value], index) => (
              <tr key={label}>
                <td
                  style={{
                    borderTop: index === 0 ? 'none' : TABLE_BORDER,
                    borderRight: TABLE_BORDER,
                    padding: '8px 10px',
                    fontWeight: 600,
                    width: '50%',
                    backgroundColor: '#fef9c3',
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    borderTop: index === 0 ? 'none' : TABLE_BORDER,
                    padding: '8px 10px',
                    textAlign: 'right',
                    fontWeight: index === summaryRows.length - 1 ? 700 : 500,
                    fontSize: index === summaryRows.length - 1 ? '14px' : '12px',
                    color: index === summaryRows.length - 1 ? '#92400e' : '#1e293b',
                  }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        style={{
          marginTop: '12px',
          marginBottom: 0,
          textAlign: 'center',
          fontSize: '10px',
          color: '#92400e',
        }}
      >
        {BRAND_NAME} — {t('Milk Register', 'દૂધ રજિસ્ટર')}
      </p>
    </div>
  )
})

export default BillExportCard
