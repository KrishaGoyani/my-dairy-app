import { ChevronLeft, ChevronRight } from 'lucide-react'
import { LoadingSpinner, EmptyState, DatePicker, Select, SearchInput } from './UI'
import {
  formatCurrency,
  t,
  customerDisplay,
  formatPackQty,
  formatPackTotal,
  REPORT_PRODUCTS,
  sessionProductCount,
  sessionProductAmount,
  formatProductLine,
  REPORT_GROUP_OPTIONS,
  entryCellSurface,
  SESSION_DIVIDER,
  bulkColumnLabel,
} from '../utils/labels'

function Pagination({ page, totalPages, total, onPageChange }) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
      <p className="text-sm text-slate-500">
        {t('Page', 'પાનું')} {page} / {totalPages} · {total}{' '}
        {t('customers', 'ગ્રાહકો')}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="btn-secondary px-3 py-2 disabled:opacity-40"
        >
          <ChevronLeft size={18} />
          {t('Prev', 'પાછળ')}
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="btn-secondary px-3 py-2 disabled:opacity-40"
        >
          {t('Next', 'આગળ')}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

function QtyCell({ count, amount }) {
  const qty = formatPackQty(count)
  if (!qty) return <span className="text-slate-300">—</span>
  return (
    <div className="text-center">
      <div className="font-semibold text-slate-800">{qty}</div>
      {amount > 0 && (
        <div className="text-[10px] text-slate-500">{formatCurrency(amount)}</div>
      )}
    </div>
  )
}

function ProductHeaders({ rates, borderLeft = false, session }) {
  return REPORT_PRODUCTS.map((product, index) => {
    const surface = session ? entryCellSurface(product.source, session) : null
    return (
    <th
      key={product.prefix}
      className={`px-2 py-2 text-center text-xs font-semibold ${
        borderLeft && index === 0 ? SESSION_DIVIDER : ''
      } ${surface?.header || ''}`}
    >
      {product.title(rates)}
      <div className="text-[10px] font-normal opacity-80">
        {product.subtitle(rates)}
      </div>
    </th>
    )
  })
}

function SessionProductCells({ row, session, borderLeft = false }) {
  return REPORT_PRODUCTS.map((product, index) => {
    const surface = entryCellSurface(product.source, session)
    return (
    <td
      key={`${session}-${product.prefix}`}
      className={`px-2 py-2 ${borderLeft && index === 0 ? SESSION_DIVIDER : ''} ${
        surface.data || surface.td
      }`}
    >
      <QtyCell
        count={sessionProductCount(row, product.prefix, session)}
        amount={sessionProductAmount(row, product.prefix, session)}
      />
    </td>
    )
  })
}

function MonthlyProductCells({ row }) {
  return REPORT_PRODUCTS.map((product, index) => {
    const litersKey = `${product.prefix}_liters`
    const amountKey = `${product.prefix}_amount`
    const surface = entryCellSurface(product.source, 'morning')
    return (
    <td
      key={litersKey}
      className={`px-2 py-2 ${surface.data || surface.td}`}
    >
      <QtyCell count={row[litersKey]} amount={row[amountKey]} />
    </td>
    )
  })
}

function SummaryBar({ summary, rates }) {
  if (!summary) return null
  const items = [
    {
      label: t('Total Packs', 'કુલ પેક'),
      value: formatPackTotal(summary.total_liters),
    },
    ...REPORT_PRODUCTS.map((product) => ({
      label: bulkColumnLabel(product.source, product.milkType, rates).short,
      value:
        formatProductLine(
          product.source,
          product.milkType,
          summary[`${product.prefix}_liters`],
          rates
        )?.replace(
          `${bulkColumnLabel(product.source, product.milkType, rates).short} `,
          ''
        ) || '—',
    })),
    {
      label: t('Total Amount', 'કુલ રકમ'),
      value: formatCurrency(summary.total_amount),
    },
    {
      label: t('Total Paid', 'કુલ જમા'),
      value: formatCurrency(summary.total_paid),
    },
    {
      label: t('Total Due', 'કુલ બાકી'),
      value: formatCurrency(summary.total_due),
    },
  ]

  return (
    <div className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
        >
          <p className="text-xs text-slate-500">{item.label}</p>
          <p className="text-base font-bold text-slate-800">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function hasDeliveryRecords(data) {
  if (!data?.summary) return false
  return (data.summary.total_liters || 0) > 0
}

export function ReportFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  groupBy,
  onGroupByChange,
  periodLabel,
  search,
  onSearchChange,
  pageSize,
  onPageSizeChange,
  onSearchSubmit,
}) {
  return (
    <div className="relative z-40 mb-5 overflow-visible">
      <div className="card space-y-4 overflow-visible p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative">
          <label className="label-text mb-1.5 block">
            {t('From Date', 'તારીખથી')}
          </label>
          <DatePicker
            value={dateFrom}
            max={dateTo}
            onChange={onDateFromChange}
            placeholder={t('Pick from date', 'શરૂઆત તારીખ પસંદ કરો')}
          />
        </div>

        <div className="relative">
          <label className="label-text mb-1.5 block">
            {t('To Date', 'તારીખ સુધી')}
          </label>
          <DatePicker
            value={dateTo}
            min={dateFrom}
            onChange={onDateToChange}
            placeholder={t('Pick to date', 'અંત તારીખ પસંદ કરો')}
            align="end"
          />
        </div>

        <div className="relative">
          <label className="label-text mb-1.5 block">
            {t('Group By', 'ગ્રૂપ પ્રમાણે')}
          </label>
          <Select
            options={REPORT_GROUP_OPTIONS.map((opt) => ({
              value: opt.id,
              label: opt.label,
            }))}
            value={groupBy}
            onChange={onGroupByChange}
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-2">
          <label className="label-text mb-1.5 block">
            {t('Search Customer', 'ગ્રાહક શોધો')}
          </label>
          <form onSubmit={onSearchSubmit} className="flex gap-2">
            <SearchInput
              className="flex-1"
              placeholder={t('Name or phone', 'નામ અથવા ફોન')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onSubmit={onSearchSubmit}
            />
            <button type="submit" className="btn-primary shrink-0">
              {t('Search', 'શોધ')}
            </button>
          </form>
        </div>

        <div>
          <label className="label-text mb-1.5 block">
            {t('Rows per page', 'પાને લાઇન')}
          </label>
          <Select
            options={[10, 20, 50].map((n) => ({ value: n, label: String(n) }))}
            value={pageSize}
            onChange={onPageSizeChange}
          />
        </div>
      </div>

      {periodLabel && (
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">
            {t('Period', 'સમયગાળો')}:
          </span>{' '}
          {periodLabel}
        </p>
      )}
      </div>
    </div>
  )
}

export function DailyReportTable({ data, loading, page, onPageChange, rates = [] }) {
  if (loading) return <LoadingSpinner />
  if (!data?.items?.length) {
    return (
      <EmptyState
        message={t('No customers found', 'કોઈ ગ્રાહક મળ્યો નહીં')}
      />
    )
  }
  if (!hasDeliveryRecords(data)) {
    return (
      <EmptyState
        message={t('No deliveries in this period', 'આ સમયગાળામાં ડિલિવરી નથી')}
      />
    )
  }

  return (
    <div className="card overflow-hidden p-0">
      <SummaryBar summary={data.summary} rates={rates} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-dairy-600 text-white">
              <th
                className="w-12 border-b border-dairy-500 px-2 py-3 text-center text-xs font-semibold"
                rowSpan={2}
              >
                {t('No.', 'નં.')}
              </th>
              <th className="px-3 py-3 font-semibold" rowSpan={2}>
                {t('Customer', 'ગ્રાહક')}
              </th>
              <th
                className="border-b border-dairy-500 px-2 py-2 text-center text-xs font-semibold"
                colSpan={5}
              >
                ☀️ સવાર
              </th>
              <th
                className={`border-b px-2 py-2 text-center text-xs font-semibold ${SESSION_DIVIDER}`}
                colSpan={5}
              >
                🌙 સાંજ
              </th>
              <th
                className="border-b border-l border-dairy-500 px-2 py-2 text-right text-xs font-semibold"
                rowSpan={2}
              >
                {t('Total', 'કુલ')}
              </th>
              <th className="border-b border-dairy-500 px-2 py-2 text-right text-xs font-semibold" rowSpan={2}>
                {t('Paid', 'જમા')}
              </th>
              <th className="border-b border-dairy-500 px-2 py-2 text-right text-xs font-semibold" rowSpan={2}>
                {t('Due', 'બાકી')}
              </th>
            </tr>
            <tr className="bg-dairy-600 text-white">
              <ProductHeaders rates={rates} session="morning" />
              <ProductHeaders rates={rates} session="evening" borderLeft />
            </tr>
          </thead>
          <tbody>
            {data.items.map((row, index) => (
              <tr
                key={row.customer_id}
                className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                  row.total_liters === 0 ? 'opacity-60' : ''
                }`}
              >
                <td className="px-2 py-3 text-center font-semibold text-slate-500">
                  {(page - 1) * (data.page_size || 10) + index + 1}
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-800">
                    {customerDisplay(row)}
                  </div>
                  {row.phone && (
                    <div className="text-xs text-slate-400">{row.phone}</div>
                  )}
                </td>
                <SessionProductCells row={row} session="morning" />
                <SessionProductCells row={row} session="evening" borderLeft />
                <td className="border-l border-slate-100 px-2 py-3 text-right">
                  <div className="font-medium">{formatPackTotal(row.total_liters)}</div>
                  <div className="font-semibold text-dairy-700">
                    {formatCurrency(row.total_amount)}
                  </div>
                </td>
                <td className="px-2 py-3 text-right text-green-600">
                  {row.paid_amount > 0 ? formatCurrency(row.paid_amount) : '—'}
                </td>
                <td className="px-2 py-3 text-right">
                  <span
                    className={
                      row.due_amount > 0
                        ? 'font-semibold text-red-600'
                        : 'text-green-600'
                    }
                  >
                    {row.due_amount > 0 ? formatCurrency(row.due_amount) : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4">
        <Pagination
          page={page}
          totalPages={data.total_pages}
          total={data.total}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  )
}

export function PeriodReportTable({ data, loading, page, onPageChange, rates = [] }) {
  if (loading) return <LoadingSpinner />
  if (!data?.items?.length) {
    return (
      <EmptyState
        message={t('No customers found', 'કોઈ ગ્રાહક મળ્યો નહીં')}
      />
    )
  }
  if (!hasDeliveryRecords(data)) {
    return (
      <EmptyState
        message={t('No deliveries in this period', 'આ સમયગાળામાં ડિલિવરી નથી')}
      />
    )
  }

  return (
    <div className="card overflow-hidden p-0">
      <SummaryBar summary={data.summary} rates={rates} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-dairy-600 text-white">
              <th
                className="w-12 border-b border-dairy-500 px-2 py-3 text-center text-xs font-semibold"
                rowSpan={2}
              >
                {t('No.', 'નં.')}
              </th>
              <th className="px-3 py-3 font-semibold" rowSpan={2}>
                {t('Customer', 'ગ્રાહક')}
              </th>
              <th className="px-2 py-3 text-center font-semibold" rowSpan={2}>
                {t('Days', 'દિવસ')}
              </th>
              <th
                className="border-b border-dairy-500 px-2 py-2 text-center text-xs font-semibold"
                colSpan={5}
              >
                {t('Monthly Total', 'માસિક કુલ')}
              </th>
              <th
                className="border-b border-l border-dairy-500 px-2 py-2 text-right text-xs font-semibold"
                rowSpan={2}
              >
                {t('Bill', 'બિલ')}
              </th>
              <th className="border-b border-dairy-500 px-2 py-2 text-right text-xs font-semibold" rowSpan={2}>
                {t('At Delivery', 'તરત જમા')}
              </th>
              <th className="border-b border-dairy-500 px-2 py-2 text-right text-xs font-semibold" rowSpan={2}>
                {t('Later Paid', 'પછી જમા')}
              </th>
              <th className="border-b border-dairy-500 px-2 py-2 text-right text-xs font-semibold" rowSpan={2}>
                {t('Due', 'બાકી')}
              </th>
            </tr>
            <tr className="bg-dairy-600 text-white">
              <ProductHeaders rates={rates} session="morning" />
            </tr>
          </thead>
          <tbody>
            {data.items.map((row, index) => (
              <tr
                key={row.customer_id}
                className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                  row.total_liters === 0 ? 'opacity-60' : ''
                }`}
              >
                <td className="px-2 py-3 text-center font-semibold text-slate-500">
                  {(page - 1) * (data.page_size || 10) + index + 1}
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-800">
                    {customerDisplay(row)}
                  </div>
                  {row.phone && (
                    <div className="text-xs text-slate-400">{row.phone}</div>
                  )}
                </td>
                <td className="px-2 py-3 text-center">{row.delivery_days}</td>
                <MonthlyProductCells row={row} />
                <td className="border-l border-slate-100 px-2 py-3 text-right">
                  <div className="font-medium">{formatPackTotal(row.total_liters)}</div>
                  <div className="font-semibold text-dairy-700">
                    {formatCurrency(row.total_amount)}
                  </div>
                </td>
                <td className="px-2 py-3 text-right text-green-600">
                  {row.paid_at_delivery > 0
                    ? formatCurrency(row.paid_at_delivery)
                    : '—'}
                </td>
                <td className="px-2 py-3 text-right text-green-600">
                  {row.later_payments > 0
                    ? formatCurrency(row.later_payments)
                    : '—'}
                </td>
                <td className="px-2 py-3 text-right">
                  <span
                    className={
                      row.due_amount > 0
                        ? 'font-semibold text-red-600'
                        : 'text-green-600'
                    }
                  >
                    {row.due_amount > 0 ? formatCurrency(row.due_amount) : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4">
        <Pagination
          page={page}
          totalPages={data.total_pages}
          total={data.total}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  )
}

export function ReportTable({ data, loading, page, onPageChange, rates = [] }) {
  return (
    <div className="relative z-0">
      {data?.group_by === 'day' ? (
        <DailyReportTable
          data={data}
          loading={loading}
          page={page}
          onPageChange={onPageChange}
          rates={rates}
        />
      ) : (
        <PeriodReportTable
          data={data}
          loading={loading}
          page={page}
          onPageChange={onPageChange}
          rates={rates}
        />
      )}
    </div>
  )
}

/** @deprecated use ReportTable */
export function MonthlyReportTable(props) {
  return <PeriodReportTable {...props} />
}
