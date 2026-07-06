import { forwardRef } from 'react'
import {
  BRAND_NAME,
  SESSIONS,
  BULK_ENTRY_COLUMNS,
  bulkColumnLabel,
  isPotlaColumn,
  customerDisplay,
  formatCurrency,
  formatDate,
  t,
} from '../utils/labels'

const TABLE_BORDER = '1.5px solid #475569'
const HEADER_BORDER = '1.5px solid #1b4332'
const CELL_PAD = '4px 3px'

function exportBoxStyle(source, variant) {
  const isMorning = variant === 'morning'
  if (source === 'potla') {
    return isMorning
      ? { backgroundColor: '#ecfdf5', border: '1.5px solid #34d399', color: '#065f46' }
      : { backgroundColor: '#f0fdfa', border: '1.5px solid #2dd4bf', color: '#134e4a' }
  }
  return isMorning
    ? { backgroundColor: '#fffbeb', border: '1.5px solid #fbbf24', color: '#78350f' }
    : { backgroundColor: '#eef2ff', border: '1.5px solid #818cf8', color: '#312e81' }
}

function ExportQtyBox({ value, source, variant }) {
  const box = exportBoxStyle(source, variant)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        borderRadius: '6px',
        padding: '4px 2px',
        fontWeight: 700,
        fontSize: '11px',
        lineHeight: '14px',
        minHeight: '22px',
        textAlign: 'center',
        ...box,
      }}
    >
      <span style={{ display: 'block', width: '100%', textAlign: 'center' }}>
        {value > 0 ? value : '—'}
      </span>
    </div>
  )
}

function ExportSessionCells({ grid, variant }) {
  return BULK_ENTRY_COLUMNS.map((col, index) => {
    const raw = grid?.[col.source]?.[col.milkType]
    const n = parseFloat(raw || 0)
    const divider = variant === 'evening' && index === 0
    const cellBg = isPotlaColumn(col.source)
      ? variant === 'morning'
        ? '#f0fdf4'
        : '#f0fdfa'
      : variant === 'morning'
        ? '#fffdf7'
        : '#f5f7ff'
    return (
      <td
        key={`${variant}-${col.source}-${col.milkType}`}
        style={{
          border: TABLE_BORDER,
          borderLeft: divider ? '3px solid #081c15' : TABLE_BORDER,
          padding: CELL_PAD,
          textAlign: 'center',
          verticalAlign: 'middle',
          backgroundColor: cellBg,
        }}
      >
        <ExportQtyBox value={n} source={col.source} variant={variant} />
      </td>
    )
  })
}

const DeliveryExportSheet = forwardRef(function DeliveryExportSheet(
  {
    date,
    grandTotal,
    morningGrandTotal,
    eveningGrandTotal,
    customers,
    bulkGrids,
    rates,
    customerDayTotal,
    sessionTotalFor,
  },
  ref
) {
  const thStyle = {
    border: HEADER_BORDER,
    padding: CELL_PAD,
    textAlign: 'center',
    verticalAlign: 'middle',
    fontWeight: 700,
    fontSize: '11px',
    lineHeight: '14px',
  }

  return (
    <div
      ref={ref}
      style={{
        width: '1100px',
        overflow: 'visible',
        borderRadius: '8px',
        border: '2px solid #1b4332',
        backgroundColor: '#ffffff',
        padding: '16px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          marginBottom: '12px',
          borderBottom: '2px solid #1b4332',
          backgroundColor: '#1b4332',
          padding: '10px 8px',
          textAlign: 'center',
          color: '#ffffff',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
          {BRAND_NAME} — {t('Daily Entry', 'દૈનિક નોંધ')}
        </h2>
      </div>

      <div
        style={{
          marginBottom: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '13px',
          color: '#334155',
        }}
      >
        <span>
          <strong>{t('Date', 'તારીખ')}:</strong> {formatDate(date)}
        </span>
        <span style={{ textAlign: 'right' }}>
          <strong>{t('Total', 'કુલ')}:</strong>{' '}
          <span style={{ fontWeight: 700, color: '#1b4332', fontSize: '14px' }}>
            {formatCurrency(grandTotal)}
          </span>
          <div style={{ marginTop: '2px', fontSize: '11px' }}>
            <span style={{ color: '#b45309', fontWeight: 600 }}>
              ☀ {formatCurrency(morningGrandTotal ?? 0)}
            </span>
            <span style={{ color: '#94a3b8', margin: '0 6px' }}>|</span>
            <span style={{ color: '#4338ca', fontWeight: 600 }}>
              🌙 {formatCurrency(eveningGrandTotal ?? 0)}
            </span>
          </div>
        </span>
        <span style={{ color: '#64748b' }}>
          {customers.length} {t('customers', 'ગ્રાહકો')}
        </span>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: TABLE_BORDER,
          fontSize: '11px',
          tableLayout: 'fixed',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#1b4332', color: '#ffffff' }}>
            <th rowSpan={2} style={{ ...thStyle, width: '3%' }}>
              નં.
            </th>
            <th rowSpan={2} style={{ ...thStyle, width: '13%', textAlign: 'left' }}>
              ગ્રાહક
            </th>
            <th colSpan={BULK_ENTRY_COLUMNS.length} style={thStyle}>
              ☀️ સવાર
            </th>
            <th
              colSpan={BULK_ENTRY_COLUMNS.length}
              style={{ ...thStyle, borderLeft: '3px solid #f0fdf4' }}
            >
              🌙 સાંજ
            </th>
            <th rowSpan={2} style={{ ...thStyle, width: '9%', textAlign: 'right' }}>
              કુલ
            </th>
          </tr>
          <tr style={{ backgroundColor: '#1b4332', color: '#ffffff', fontSize: '9px' }}>
            {SESSIONS.map((session) =>
              BULK_ENTRY_COLUMNS.map((col, index) => {
                const { short, rate } = bulkColumnLabel(col.source, col.milkType, rates)
                const divider = session.id === 'evening' && index === 0
                const headerBg = isPotlaColumn(col.source)
                  ? session.id === 'morning'
                    ? '#047857'
                    : '#115e59'
                  : session.id === 'morning'
                    ? '#2d6a4f'
                    : '#1b4332'
                return (
                  <th
                    key={`${session.id}-${col.source}-${col.milkType}`}
                    style={{
                      ...thStyle,
                      backgroundColor: headerBg,
                      border: HEADER_BORDER,
                      borderLeft: divider ? '3px solid #f0fdf4' : HEADER_BORDER,
                      fontWeight: 600,
                      fontSize: '9px',
                    }}
                  >
                    <div style={{ lineHeight: '12px' }}>{short}</div>
                    <div style={{ fontWeight: 400, opacity: 0.9 }}>{rate ? `₹${rate}` : ''}</div>
                  </th>
                )
              })
            )}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer, index) => {
            const dayTotal = customerDayTotal(customer.id)
            const morningTotal = sessionTotalFor?.(customer.id, 'morning') ?? 0
            const eveningTotal = sessionTotalFor?.(customer.id, 'evening') ?? 0
            const morningGrid = bulkGrids[customer.id]?.morning
            const eveningGrid = bulkGrids[customer.id]?.evening
            return (
              <tr key={customer.id} style={{ backgroundColor: '#ffffff' }}>
                <td
                  style={{
                    border: TABLE_BORDER,
                    padding: CELL_PAD,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontWeight: 700,
                    color: '#64748b',
                    fontSize: '10px',
                  }}
                >
                  {index + 1}
                </td>
                <td
                  style={{
                    border: TABLE_BORDER,
                    padding: CELL_PAD,
                    textAlign: 'left',
                    verticalAlign: 'middle',
                    fontWeight: 600,
                    color: '#1e293b',
                    fontSize: '11px',
                  }}
                >
                  {customerDisplay(customer)}
                </td>
                <ExportSessionCells grid={morningGrid} variant="morning" />
                <ExportSessionCells grid={eveningGrid} variant="evening" />
                <td
                  style={{
                    border: TABLE_BORDER,
                    padding: CELL_PAD,
                    textAlign: 'right',
                    verticalAlign: 'middle',
                    lineHeight: '14px',
                  }}
                >
                  {dayTotal > 0 ? (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#1b4332' }}>
                      {formatCurrency(dayTotal)}
                    </span>
                  ) : (
                    <span style={{ color: '#cbd5e1' }}>—</span>
                  )}
                  {(morningTotal > 0 || eveningTotal > 0) && (
                    <div style={{ marginTop: '3px', fontSize: '9px', lineHeight: '13px' }}>
                      {morningTotal > 0 && (
                        <span style={{ color: '#b45309', fontWeight: 600 }}>
                          ☀{formatCurrency(morningTotal)}
                        </span>
                      )}
                      {morningTotal > 0 && eveningTotal > 0 && ' '}
                      {eveningTotal > 0 && (
                        <span style={{ color: '#4338ca', fontWeight: 600 }}>
                          🌙{formatCurrency(eveningTotal)}
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p
        style={{
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '10px',
          color: '#64748b',
        }}
      >
        {BRAND_NAME} — {t('Milk Delivery Register', 'દૂધ ડિલિવરી રજિસ્ટર')}
      </p>
    </div>
  )
})

export default DeliveryExportSheet
