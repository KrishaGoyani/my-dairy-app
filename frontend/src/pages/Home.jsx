import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Moon, ArrowRight, RefreshCw } from 'lucide-react'
import Layout from '../components/Layout'
import { StatCard, PageHeader, LoadingSpinner, DatePicker, Select, SectionHeading } from '../components/UI'
import { useToast } from '../components/Toast'
import { getDashboard, getRates } from '../api/client'
import {
  formatCurrency,
  t,
  defaultMonthRange,
  formatPackTotal,
  formatPackQty,
  REPORT_GROUP_OPTIONS,
  REPORT_PRODUCTS,
} from '../utils/labels'

export default function Home() {
  const { showToast } = useToast()
  const defaultRange = defaultMonthRange()
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom)
  const [dateTo, setDateTo] = useState(defaultRange.dateTo)
  const [groupBy, setGroupBy] = useState('day')
  const [stats, setStats] = useState(null)
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRates()
      .then((res) => setRates(res.data))
      .catch(() => {})
  }, [])

  const loadStats = useCallback(() => {
    setLoading(true)
    getDashboard({ date_from: dateFrom, date_to: dateTo, group_by: groupBy })
      .then((res) => setStats(res.data))
      .catch(() => showToast(t('Failed to load dashboard', 'ડેશબોર્ડ લોડ ન થયું'), 'error'))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo, groupBy, showToast])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const periodLabel = stats?.period_label || `${dateFrom} – ${dateTo}`
  const multiDay = dateFrom !== dateTo

  const productFieldMap = {
    batli: 'batli_liters',
    cow: 'cow_liters',
    potla_m: 'potla_m_liters',
    potla_g: 'potla_g_liters',
    potla_b: 'potla_b_liters',
  }

  return (
    <Layout>
      <div className="page-container">
        <PageHeader
          title={t('Dashboard', 'ડેશબોર્ડ')}
          subtitle={t(
            'See how much milk was delivered and money collected',
            'કેટલું દૂધ ગયું અને કેટલી રકમ મળી — એક નજરમાં'
          )}
          action={
            <button type="button" onClick={loadStats} className="btn-secondary px-3">
              <RefreshCw size={18} />
            </button>
          }
        />

        <div className="relative z-40 mb-5 overflow-visible">
          <div className="card overflow-visible p-4">
            <p className="mb-3 text-xs text-slate-500">
              {t(
                'Pick dates to see summary for that period',
                'તારીખ પસંદ કરો — તે સમયગાળાનો હિસાબ નીચે દેખાશે'
              )}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <label className="label-text mb-1.5 block">
                  {t('Start date', 'શરૂઆત તારીખ')}
                </label>
                <DatePicker
                  value={dateFrom}
                  max={dateTo}
                  onChange={setDateFrom}
                  placeholder={t('Pick from date', 'શરૂઆત તારીખ પસંદ કરો')}
                />
              </div>
              <div className="relative">
                <label className="label-text mb-1.5 block">
                  {t('End date', 'અંત તારીખ')}
                </label>
                <DatePicker
                  value={dateTo}
                  min={dateFrom}
                  onChange={setDateTo}
                  placeholder={t('Pick to date', 'અંત તારીખ પસંદ કરો')}
                  align="end"
                />
              </div>
              <div className="relative">
                <label className="label-text mb-1.5 block">
                  {t('View by', 'જુઓ આ પ્રમાણે')}
                </label>
                <Select
                  options={REPORT_GROUP_OPTIONS.map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                  value={groupBy}
                  onChange={setGroupBy}
                />
              </div>
              <div className="flex items-end">
                <div className="rounded-xl bg-cream-100 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-slate-500">
                    {t('Showing data for', 'આ સમયગાળો')}
                  </p>
                  <p className="text-sm font-bold text-dairy-800">{periodLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-0">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              {stats && (
                <div className="card mb-5 border-dairy-200 bg-gradient-to-r from-cream-50 to-white p-4 text-center sm:text-left">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-dairy-800">{periodLabel}</span>
                    {' — '}
                    {t('In this period', 'આ સમયમાં')}{' '}
                    <span className="font-bold text-slate-800">
                      {formatPackTotal(stats.total_liters || 0)}
                    </span>{' '}
                    {t('packs sold', 'પેક વેચાયા')},{' '}
                    <span className="font-bold text-slate-800">
                      {formatCurrency(stats.total_amount)}
                    </span>{' '}
                    {t('total bill', 'કુલ બિલ')},{' '}
                    <span className="font-bold text-amber-700">
                      {formatCurrency(stats.total_due)}
                    </span>{' '}
                    {t('still due', 'હજુ બાકી')}
                  </p>
                </div>
              )}

              <SectionHeading
                title={t('Money summary', 'રકમનો હિસાબ')}
                hint={t(
                  'Total sales, what was collected, and what is still pending',
                  'કુલ વેચાણ, જમા થયેલ અને બાકી રકમ'
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon="💰"
                  title={t('Total bill', 'કુલ બિલ રકમ')}
                  hint={t('All customers combined', 'બધા ગ્રાહકોનું કુલ')}
                  value={formatCurrency(stats?.total_amount)}
                  subtitle={periodLabel}
                  color="accent"
                />
                <StatCard
                  icon="✅"
                  title={t('Collected', 'જમા થયેલ')}
                  hint={t('Money received from customers', 'ગ્રાહકોએ આપેલી રકમ')}
                  value={formatCurrency(stats?.total_paid)}
                  subtitle={periodLabel}
                  color="blue"
                />
                <StatCard
                  icon="📋"
                  title={t('Still due', 'હજુ બાકી')}
                  hint={t('Pending to collect', 'ઉઘરાણું બાકી છે')}
                  value={formatCurrency(stats?.total_due)}
                  subtitle={periodLabel}
                  color="amber"
                />
                <StatCard
                  icon="🥛"
                  title={t('Total packs sold', 'કુલ વેચાયેલા પેક')}
                  hint={t('Batli + potla count', 'બાટલી + પોટલા ગણતરી')}
                  value={formatPackTotal(stats?.total_liters || 0)}
                  subtitle={periodLabel}
                  color="dairy"
                />
              </div>

              <div className="mt-6">
                <SectionHeading
                  title={t('Delivery summary', 'ડિલિવરી સારાંશ')}
                  hint={t(
                    'How many customers and entries in this period',
                    'કેટલા ગ્રાહક અને કેટલી નોંધ'
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon="👥"
                    title={t('Customers served', 'ડિલિવરી થયેલ ગ્રાહક')}
                    hint={t('Unique customers with delivery', 'જેમને દૂધ ગયું')}
                    value={stats?.customer_count || 0}
                    subtitle={t('customers', 'ગ્રાહક')}
                    color="dairy"
                  />
                  <StatCard
                    icon="📦"
                    title={t('Delivery entries', 'કુલ નોંધ')}
                    hint={t('Each morning/evening row saved', 'સવાર-સાંજની દરેક એન્ટ્રી')}
                    value={stats?.delivery_count || 0}
                    subtitle={t('entries', 'નોંધ')}
                    color="amber"
                  />
                  {(groupBy !== 'day' || multiDay) && (
                    <StatCard
                      icon="📅"
                      title={t('Days with delivery', 'ડિલિવરીના દિવસ')}
                      hint={t('Days when milk was recorded', 'જે દિવસે નોંધ થઈ')}
                      value={stats?.delivery_days || 0}
                      subtitle={periodLabel}
                      color="accent"
                    />
                  )}
                </div>
              </div>

              {groupBy === 'day' && (
                <div className="mt-6">
                  <SectionHeading
                    title={t('Morning & evening', 'સવાર અને સાંજ')}
                    hint={t(
                      'Packs delivered and bill amount per session',
                      'સવાર-સાંજ કેટલા પેક અને કેટલી રકમ'
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard
                      icon="☀️"
                      title={t('Morning delivery', 'સવારની ડિલિવરી')}
                      hint={t('Packs in morning session', 'સવારે ગયેલા પેક')}
                      value={formatPackTotal(stats?.morning_liters || 0)}
                      subtitle={`${t('Bill', 'બિલ')}: ${formatCurrency(stats?.morning_amount || 0)}`}
                      color="accent"
                    />
                    <StatCard
                      icon="🌙"
                      title={t('Evening delivery', 'સાંજની ડિલિવરી')}
                      hint={t('Packs in evening session', 'સાંજે ગયેલા પેક')}
                      value={formatPackTotal(stats?.evening_liters || 0)}
                      subtitle={`${t('Bill', 'બિલ')}: ${formatCurrency(stats?.evening_amount || 0)}`}
                      color="blue"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 card p-4">
                <SectionHeading
                  title={t('By product', 'દૂધ પ્રકાર પ્રમાણે')}
                  hint={t(
                    'How many packs of each product were sold',
                    'દરેક પ્રોડક્ટના કેટલા પેક વેચાયા'
                  )}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {REPORT_PRODUCTS.map((product) => {
                    const count = stats?.[productFieldMap[product.prefix]] || 0
                    const qty = formatPackQty(count)
                    return (
                      <div
                        key={product.prefix}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-center"
                      >
                        <p className="text-xs font-semibold leading-snug text-slate-700">
                          {product.title(rates)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {product.subtitle(rates)
                            ? `${t('Rate', 'ભાવ')} ${product.subtitle(rates)}`
                            : ''}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-800">{qty || '—'}</p>
                        <p className="text-[11px] font-medium text-slate-400">
                          {t('packs', 'પેક')}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6">
                <SectionHeading
                  title={t('Quick actions', 'ઝડપી કામ')}
                  hint={t('Go directly to daily entry', 'સીધું દૈનિક નોંધ પર જાઓ')}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Link
                    to="/delivery?session=morning"
                    className="card group flex items-center gap-4 p-5 transition hover:shadow-xl"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                      <Sun className="text-amber-600" size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800">
                        {t('Morning entry', 'સવારની નોંધ')}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {t('Record today morning delivery', 'આજની સવારની ડિલિવરી નોંધો')}
                      </p>
                    </div>
                    <ArrowRight className="text-slate-400" size={20} />
                  </Link>

                  <Link
                    to="/delivery?session=evening"
                    className="card group flex items-center gap-4 p-5 transition hover:shadow-xl"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
                      <Moon className="text-indigo-600" size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800">
                        {t('Evening entry', 'સાંજની નોંધ')}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {t('Record today evening delivery', 'આજની સાંજની ડિલિવરી નોંધો')}
                      </p>
                    </div>
                    <ArrowRight className="text-slate-400" size={20} />
                  </Link>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-4 text-center">
                <Link
                  to={`/reports?date_from=${dateFrom}&date_to=${dateTo}&group_by=${groupBy}`}
                  className="text-sm font-medium text-dairy-600 hover:underline"
                >
                  {t('View detailed report', 'વિગતવાર રિપોર્ટ જુઓ')} →
                </Link>
                <Link to="/rates" className="text-sm font-medium text-dairy-600 hover:underline">
                  {t('Set product prices', 'પ્રોડક્ટ ભાવ સેટ કરો')} →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
