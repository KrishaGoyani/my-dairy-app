import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import Layout from '../components/Layout'
import { PageHeader } from '../components/UI'
import { useToast } from '../components/Toast'
import { ReportFilters, ReportTable } from '../components/ReportTable'
import { getReport, getRates } from '../api/client'
import {
  t,
  defaultMonthRange,
  formatPackQty,
  sessionProductCount,
  REPORT_PRODUCTS,
} from '../utils/labels'
import { exportTableCsv } from '../utils/billExport'

function readDateRange(searchParams) {
  const defaults = defaultMonthRange()
  return {
    dateFrom: searchParams.get('date_from') || defaults.dateFrom,
    dateTo: searchParams.get('date_to') || defaults.dateTo,
  }
}

export default function Reports() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const initialRange = useMemo(() => readDateRange(searchParams), [searchParams])
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom)
  const [dateTo, setDateTo] = useState(initialRange.dateTo)
  const [groupBy, setGroupBy] = useState(searchParams.get('group_by') || 'day')
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [data, setData] = useState(null)
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRates()
      .then((res) => setRates(res.data))
      .catch(() => {})
  }, [])

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getReport({
        date_from: dateFrom,
        date_to: dateTo,
        group_by: groupBy,
        search: searchQuery,
        page,
        page_size: pageSize,
      })
      setData(res.data)
    } catch (err) {
      showToast(err.response?.data?.detail || t('Report failed', 'રિપોર્ટ ન થઈ'), 'error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, groupBy, searchQuery, page, pageSize, showToast])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  useEffect(() => {
    setPage(1)
  }, [dateFrom, dateTo, groupBy, searchQuery, pageSize])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearchQuery(search.trim())
  }

  const downloadCsv = async () => {
    try {
      const res = await getReport({
        date_from: dateFrom,
        date_to: dateTo,
        group_by: groupBy,
        search: searchQuery,
        page: 1,
        page_size: 500,
      })

      const rows = res.data.items || []
      if (!rows.length) {
        showToast(t('No data to export', 'ડેટા નથી'), 'error')
        return
      }

      const gb = res.data.group_by
      let columns = [
        { label: 'Customer', value: (r) => r.name },
        { label: 'Phone', value: (r) => r.phone },
      ]

      if (gb === 'day') {
        for (const session of ['morning', 'evening']) {
          for (const product of REPORT_PRODUCTS) {
            columns.push({
              label: `${session} ${product.title(rates)} ${product.subtitle(rates)}`.trim(),
              value: (r) =>
                formatPackQty(sessionProductCount(r, product.prefix, session)) || '',
            })
          }
        }
        columns.push(
          { label: 'Total packs', value: (r) => r.total_liters },
          { label: 'Amount', value: (r) => r.total_amount },
          { label: 'Paid', value: (r) => r.paid_amount },
          { label: 'Due', value: (r) => r.due_amount }
        )
      } else {
        columns.push({ label: 'Days', value: (r) => r.delivery_days })
        const fieldMap = {
          batli: 'batli_liters',
          cow: 'cow_liters',
          potla_m: 'potla_m_liters',
          potla_g: 'potla_g_liters',
          potla_b: 'potla_b_liters',
        }
        for (const product of REPORT_PRODUCTS) {
          columns.push({
            label: `${product.title(rates)} ${product.subtitle(rates)}`.trim(),
            value: (r) => formatPackQty(r[fieldMap[product.prefix]]) || '',
          })
        }
        columns.push(
          { label: 'Bill', value: (r) => r.total_amount },
          { label: 'At Delivery', value: (r) => r.paid_at_delivery },
          { label: 'Later Paid', value: (r) => r.later_payments },
          { label: 'Due', value: (r) => r.due_amount }
        )
      }

      exportTableCsv(
        rows,
        columns,
        `report-${gb}-${dateFrom}-to-${dateTo}.csv`
      )
      showToast(t('CSV downloaded', 'CSV ડાઉનલોડ થયું'), 'success')
    } catch {
      showToast(t('Export failed', 'એક્સપોર્ટ ન થયું'), 'error')
    }
  }

  return (
    <Layout>
      <div className="page-container">
        <PageHeader
          title={t('Reports', 'રિપોર્ટ')}
          subtitle={t(
            'Filter by date range and group by day, week, month or year',
            'તારીખ શ્રેણી અને દિવસ/સપ્તાહ/મહિનો/વર્ષ પ્રમાણે જુઓ'
          )}
          action={
            <button type="button" onClick={downloadCsv} className="btn-secondary">
              <Download size={18} />
              {t('Download CSV', 'CSV ડાઉનલોડ')}
            </button>
          }
        />

        <ReportFilters
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          periodLabel={data?.period_label}
          search={search}
          onSearchChange={setSearch}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onSearchSubmit={handleSearchSubmit}
        />

        <ReportTable
          data={data}
          loading={loading}
          page={page}
          onPageChange={setPage}
          rates={rates}
        />
      </div>
    </Layout>
  )
}
