import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Save, Share2, FileText, Image } from 'lucide-react'
import Layout from '../components/Layout'
import DeliveryExportSheet from '../components/DeliveryExportSheet'
import { PageHeader, LoadingSpinner, EmptyState, DatePicker, Select } from '../components/UI'
import { useToast } from '../components/Toast'
import {
  getCustomers,
  getRates,
  getDeliverySession,
  saveDeliverySession,
} from '../api/client'
import {
  SESSIONS,
  BULK_ENTRY_COLUMNS,
  t,
  todayISO,
  emptyCustomerSessions,
  buildEntriesFromGrid,
  fillGridFromEntries,
  calcSessionTotal,
  formatCurrency,
  formatDate,
  bulkColumnLabel,
  customerDisplay,
  sortCustomers,
  CUSTOMER_SORT_OPTIONS,
  CUSTOMER_SORT_STORAGE_KEY,
  entryCellSurface,
  SESSION_DIVIDER,
} from '../utils/labels'
import { exportBillCard } from '../utils/billExport'

function initBulkGrids(customers) {
  return Object.fromEntries(customers.map((c) => [c.id, emptyCustomerSessions()]))
}

function SessionFields({ customerId, sessionId, grid, onUpdate, variant, onRowFocus }) {
  return (
    <>
      {BULK_ENTRY_COLUMNS.map((col, index) => {
        const surface = entryCellSurface(col.source, variant)
        const divider = sessionId === 'evening' && index === 0
        return (
        <td
          key={`${sessionId}-${col.source}-${col.milkType}`}
          className={`p-0.5 ${divider ? SESSION_DIVIDER : 'border-l border-slate-100'} ${surface.td}`}
        >
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="0"
            className={`w-full rounded-md border px-1 py-1 text-center text-xs font-semibold outline-none transition-all sm:py-1.5 lg:text-sm ${surface.input}`}
            value={grid?.[col.source]?.[col.milkType] ?? ''}
            onFocus={() => onRowFocus(customerId)}
            onChange={(e) =>
              onUpdate(customerId, sessionId, col.source, col.milkType, e.target.value)
            }
          />
        </td>
        )
      })}
    </>
  )
}

export default function Delivery() {
  const { showToast } = useToast()
  const exportRef = useRef(null)
  const [customers, setCustomers] = useState([])
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [date, setDate] = useState(todayISO())
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem(CUSTOMER_SORT_STORAGE_KEY) || 'entry'
  )
  const [bulkGrids, setBulkGrids] = useState({})
  const [loadedKeys, setLoadedKeys] = useState(() => new Set())
  const [activeRowId, setActiveRowId] = useState(null)

  useEffect(() => {
    localStorage.setItem(CUSTOMER_SORT_STORAGE_KEY, sortBy)
  }, [sortBy])

  const sortedCustomers = useMemo(
    () => sortCustomers(customers, sortBy),
    [customers, sortBy]
  )

  useEffect(() => {
    Promise.all([getCustomers(), getRates()])
      .then(([cRes, rRes]) => {
        setCustomers(cRes.data)
        setRates(rRes.data)
        setBulkGrids(initBulkGrids(cRes.data))
      })
      .catch(() => showToast(t('Failed to load data', 'ડેટા લોડ ન થયો'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!customers.length) return
    setLoadingEntries(true)
    Promise.all(
      customers.flatMap((customer) =>
        SESSIONS.map((session) =>
          getDeliverySession(customer.id, date, session.id)
            .then((res) => ({
              customerId: customer.id,
              session: session.id,
              grid: fillGridFromEntries(res.data.entries),
            }))
            .catch(() => ({
              customerId: customer.id,
              session: session.id,
              grid: null,
            }))
        )
      )
    )
      .then((results) => {
        const next = initBulkGrids(customers)
        const loaded = new Set()
        for (const row of results) {
          if (row.grid !== null) {
            loaded.add(`${row.customerId}-${row.session}`)
            next[row.customerId][row.session] = row.grid
          }
        }
        setLoadedKeys(loaded)
        setBulkGrids(next)
      })
      .finally(() => setLoadingEntries(false))
  }, [customers, date])

  const sessionTotalFor = (customerId, sessionId) => {
    const grid = bulkGrids[customerId]?.[sessionId]
    if (!grid) return 0
    return calcSessionTotal(buildEntriesFromGrid(grid), rates)
  }

  const customerDayTotal = (customerId) =>
    sessionTotalFor(customerId, 'morning') + sessionTotalFor(customerId, 'evening')

  const morningGrandTotal = useMemo(
    () => customers.reduce((sum, c) => sum + sessionTotalFor(c.id, 'morning'), 0),
    [customers, bulkGrids, rates]
  )

  const eveningGrandTotal = useMemo(
    () => customers.reduce((sum, c) => sum + sessionTotalFor(c.id, 'evening'), 0),
    [customers, bulkGrids, rates]
  )

  const grandTotal = useMemo(
    () => morningGrandTotal + eveningGrandTotal,
    [morningGrandTotal, eveningGrandTotal]
  )

  const updateCell = (customerId, sessionId, source, milkType, value) => {
    setBulkGrids((prev) => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        [sessionId]: {
          ...prev[customerId][sessionId],
          [source]: {
            ...prev[customerId][sessionId][source],
            [milkType]: value,
          },
        },
      },
    }))
  }

  const handleRowFocus = (customerId) => {
    setActiveRowId(customerId)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const saves = customers.flatMap((customer) =>
        SESSIONS.flatMap((session) => {
          const grid = bulkGrids[customer.id]?.[session.id]
          const entries = buildEntriesFromGrid(grid || emptyCustomerSessions()[session.id])
          const key = `${customer.id}-${session.id}`
          if (entries.length === 0 && !loadedKeys.has(key)) {
            return []
          }
          return [
            saveDeliverySession({
              customer_id: customer.id,
              date,
              session: session.id,
              entries,
              paid: false,
              paid_amount: null,
            }),
          ]
        })
      )
      await Promise.all(saves)
      showToast(
        `${t('Saved', 'સેવ થયું')}! ${formatCurrency(grandTotal)}`,
        'success'
      )
    } catch (err) {
      showToast(err.response?.data?.detail || t('Save failed', 'સેવ ન થયું'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const exportFilenameBase = () => `delivery-${date}`

  const exportMessage = () =>
    `${t('Daily Entry', 'દૈનિક નોંધ')} — ${formatDate(date)} — ${t('Total', 'કુલ')}: ${formatCurrency(grandTotal)} (☀ ${formatCurrency(morningGrandTotal)}, 🌙 ${formatCurrency(eveningGrandTotal)})`

  const runExport = async (action) => {
    if (!exportRef.current || exporting) return
    setExporting(true)
    try {
      const exporter = await exportBillCard({
        element: exportRef.current,
        filenameBase: exportFilenameBase(),
        customerPhone: '',
        billMessage: exportMessage(),
      })

      switch (action) {
        case 'image':
          await exporter.downloadImage()
          showToast(t('Image downloaded', 'ફોટો ડાઉનલોડ થયો'), 'success')
          break
        case 'pdf':
          await exporter.downloadPdf()
          showToast(t('PDF downloaded', 'PDF ડાઉનલોડ થયું'), 'success')
          break
        case 'share': {
          const result = await exporter.shareImage()
          showToast(
            result === 'shared'
              ? t('Sheet shared', 'શીટ શેર થઈ')
              : t('Image downloaded', 'ફોટો ડાઉનલોડ થયો'),
            'success'
          )
          break
        }
        default:
          break
      }
    } catch (err) {
      showToast(err.message || t('Export failed', 'એક્સપોર્ટ ન થયું'), 'error')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="page-container">
          <LoadingSpinner />
        </div>
      </Layout>
    )
  }

  if (!customers.length) {
    return (
      <Layout>
        <div className="page-container">
          <EmptyState message={t('No customers yet', 'પહેલા ગ્રાહક ઉમેરો')} />
          <Link to="/customers" className="btn-primary mx-auto mt-4 flex w-fit">
            {t('Add Customer', 'નવો ગ્રાહક')}
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-container-wide">
        <PageHeader
          title={t('Daily Entry', 'દૈનિક નોંધ')}
          subtitle={t('Bulk delivery for all customers', 'બધા ગ્રાહકો માટે ડિલિવરી નોંધ')}
        />

        <div className="card w-full space-y-4 p-3 sm:space-y-5 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-[200px]">
              <label className="label-text mb-1.5 block">{t('Date', 'તારીખ')}</label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder={t('Pick delivery date', 'ડિલિવરી તારીખ પસંદ કરો')}
              />
            </div>
            <div className="min-w-[180px]">
              <label className="label-text mb-1.5 block">
                {t('Sort By', 'ક્રમ પ્રમાણે')}
              </label>
              <Select
                options={CUSTOMER_SORT_OPTIONS.map((opt) => ({
                  value: opt.id,
                  label: opt.label,
                }))}
                value={sortBy}
                onChange={setSortBy}
              />
            </div>
            <div className="rounded-xl bg-cream-100 px-4 py-3 text-right leading-tight">
              <div>
                <span className="text-sm text-slate-500">{t('Total', 'કુલ')}:</span>
                <span className="ml-2 text-xl font-bold text-dairy-700">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="mt-1 text-xs">
                <span className="font-semibold text-amber-700">
                  ☀ {formatCurrency(morningGrandTotal)}
                </span>
                <span className="mx-1.5 text-slate-300">|</span>
                <span className="font-semibold text-indigo-700">
                  🌙 {formatCurrency(eveningGrandTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={exporting || loadingEntries}
              onClick={() => runExport('image')}
              className="btn-secondary"
            >
              <Image size={18} />
              {t('Download Image', 'ફોટો ડાઉનલોડ')}
            </button>
            <button
              type="button"
              disabled={exporting || loadingEntries}
              onClick={() => runExport('pdf')}
              className="btn-secondary"
            >
              <FileText size={18} />
              {t('Download PDF', 'PDF ડાઉનલોડ')}
            </button>
            <button
              type="button"
              disabled={exporting || loadingEntries}
              onClick={() => runExport('share')}
              className="btn-primary"
            >
              <Share2 size={18} />
              {t('Share', 'શેર કરો')}
            </button>
          </div>

          <div className="relative w-full max-h-[calc(100dvh-14rem)] overflow-auto rounded-xl border border-slate-200">
            {loadingEntries && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60">
                <LoadingSpinner />
              </div>
            )}
            <table className="w-full min-w-full table-fixed border-separate border-spacing-0 text-[11px] lg:text-xs">
              <colgroup>
                <col style={{ width: '3%' }} />
                <col style={{ width: '14%' }} />
                {Array.from({ length: BULK_ENTRY_COLUMNS.length * SESSIONS.length }).map((_, i) => (
                  <col key={i} style={{ width: '7.3%' }} />
                ))}
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr className="bg-dairy-600 text-white">
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 bg-dairy-600 px-0.5 py-2 text-center text-[11px] font-semibold"
                  >
                    નં.
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 bg-dairy-600 px-1 py-2 text-left text-[11px] font-semibold"
                  >
                    ગ્રાહક
                  </th>
                  <th
                    colSpan={BULK_ENTRY_COLUMNS.length}
                    className="sticky top-0 z-20 border-l border-dairy-500 bg-dairy-600 px-1 py-1.5 text-center text-[11px] font-semibold"
                  >
                    ☀️ સવાર
                  </th>
                  <th
                    colSpan={BULK_ENTRY_COLUMNS.length}
                    className={`sticky top-0 z-20 bg-dairy-600 px-1 py-1.5 text-center text-[11px] font-semibold ${SESSION_DIVIDER}`}
                  >
                    🌙 સાંજ
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 border-l border-dairy-500 bg-dairy-600 px-1 py-2 text-right text-[11px] font-semibold"
                  >
                    કુલ
                  </th>
                </tr>
                <tr className="bg-dairy-600 text-[9px] leading-tight text-white">
                  {SESSIONS.map((session) =>
                    BULK_ENTRY_COLUMNS.map((col, index) => {
                      const { short, rate } = bulkColumnLabel(col.source, col.milkType, rates)
                      const surface = entryCellSurface(col.source, session.id)
                      const divider = session.id === 'evening' && index === 0
                      return (
                        <th
                          key={`${session.id}-${col.source}-${col.milkType}`}
                          className={`sticky top-[29px] z-20 px-0.5 py-1 text-center font-medium text-white ${
                            divider ? SESSION_DIVIDER : 'border-l border-dairy-500'
                          } ${surface.header}`}
                        >
                          <div className="line-clamp-2" title={short}>
                            {short}
                          </div>
                          <div className="font-normal opacity-80">{rate ? `₹${rate}` : ''}</div>
                        </th>
                      )
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedCustomers.map((customer, index) => {
                  const dayTotal = customerDayTotal(customer.id)
                  const morningTotal = sessionTotalFor(customer.id, 'morning')
                  const eveningTotal = sessionTotalFor(customer.id, 'evening')
                  const morningGrid = bulkGrids[customer.id]?.morning
                  const eveningGrid = bulkGrids[customer.id]?.evening
                  const rowActive = activeRowId === customer.id
                  return (
                    <tr
                      key={customer.id}
                      className={`border-t border-b border-slate-200 bg-white ${
                        rowActive ? 'delivery-active-row' : ''
                      }`}
                    >
                      <td className="px-0.5 py-1.5 text-center align-middle text-[10px] font-semibold text-slate-500">
                        {index + 1}
                      </td>
                      <td
                        className={`truncate px-1.5 py-1.5 align-middle lg:px-2 ${
                          rowActive ? 'font-bold text-dairy-800' : 'font-medium text-slate-800'
                        }`}
                      >
                        {customerDisplay(customer)}
                      </td>
                      <SessionFields
                        customerId={customer.id}
                        sessionId="morning"
                        grid={morningGrid}
                        onUpdate={updateCell}
                        variant="morning"
                        onRowFocus={handleRowFocus}
                      />
                      <SessionFields
                        customerId={customer.id}
                        sessionId="evening"
                        grid={eveningGrid}
                        onUpdate={updateCell}
                        variant="evening"
                        onRowFocus={handleRowFocus}
                      />
                      <td className="border-l border-slate-100 px-1 py-1.5 text-right align-middle leading-tight lg:px-2">
                        {dayTotal > 0 ? (
                          <span className="text-[10px] font-bold text-dairy-700 lg:text-xs">
                            {formatCurrency(dayTotal)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                        {(morningTotal > 0 || eveningTotal > 0) && (
                          <div className="mt-0.5 text-[8px] leading-tight text-slate-500">
                            {morningTotal > 0 && (
                              <span className="text-amber-700">☀{formatCurrency(morningTotal)}</span>
                            )}
                            {morningTotal > 0 && eveningTotal > 0 && ' '}
                            {eveningTotal > 0 && (
                              <span className="text-indigo-700">🌙{formatCurrency(eveningTotal)}</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingEntries}
            className="btn-primary w-full py-4 text-base sm:w-auto"
          >
            <Save size={20} />
            {saving
              ? t('Saving...', 'સેવ થાય છે...')
              : t('Save All Entries', 'બધી નોંધ સેવ કરો')}
          </button>
        </div>

        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: -1,
            opacity: 0,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <DeliveryExportSheet
            ref={exportRef}
            date={date}
            grandTotal={grandTotal}
            morningGrandTotal={morningGrandTotal}
            eveningGrandTotal={eveningGrandTotal}
            customers={sortedCustomers}
            bulkGrids={bulkGrids}
            rates={rates}
            customerDayTotal={customerDayTotal}
            sessionTotalFor={sessionTotalFor}
          />
        </div>
      </div>
    </Layout>
  )
}
