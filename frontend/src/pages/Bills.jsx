import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Share2,
  Download,
  IndianRupee,
  FileText,
  MessageCircle,
  Printer,
  Image,
} from 'lucide-react'
import Layout from '../components/Layout'
import BillCard from '../components/BillCard'
import { PageHeader, LoadingSpinner, DatePicker, Select, CustomerSelect } from '../components/UI'
import { useToast } from '../components/Toast'
import {
  getCustomers,
  getBill,
  createPayment,
  getGroupedDeliveries,
  getRates,
} from '../api/client'
import {
  MONTHS,
  t,
  formatCurrency,
  formatDate,
  summarizeBySource,
  formatBatliLine,
  formatCowLine,
  formatPotlaLine,
  formatPackTotal,
  todayISO,
} from '../utils/labels'
import { exportBillCard } from '../utils/billExport'

function SessionSourceDetail({ session, rates }) {
  const src = summarizeBySource(session.lines)
  const parts = []
  const batli = formatBatliLine(src.batli.liters, rates)
  const cow = formatCowLine(src.cow.liters, rates)
  const potB = formatPotlaLine('B', src.potla.B.liters, rates)
  const potG = formatPotlaLine('G', src.potla.G.liters, rates)
  const potM = formatPotlaLine('M', src.potla.M.liters, rates)
  if (batli) parts.push(batli)
  if (cow) parts.push(cow)
  if (potB) parts.push(potB)
  if (potG) parts.push(potG)
  if (potM) parts.push(potM)

  return (
    <div
      className={`rounded-lg px-2.5 py-2 text-xs ${
        session.paid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      }`}
    >
      <div className="font-semibold">
        {session.session === 'morning' ? t('Morning', 'સવાર') : t('Evening', 'સાંજ')}
        {' · '}
        {formatPackTotal(session.total_liters)} — {formatCurrency(session.total_amount)}
      </div>
      <div className="mt-1 text-[11px] opacity-90">
        {parts.length ? parts.join(' · ') : '—'}
      </div>
      <div className="mt-0.5 font-medium">
        {session.paid
          ? `${t('Paid', 'જમા')} ${formatCurrency(session.paid_amount)}`
          : t('Not Paid', 'બાકી')}
      </div>
    </div>
  )
}

export default function Bills() {
  const [searchParams] = useSearchParams()
  const cardRef = useRef(null)
  const { showToast } = useToast()

  const now = new Date()
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState(searchParams.get('customer') || '')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [bill, setBill] = useState(null)
  const [grouped, setGrouped] = useState([])
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayISO())
  const [payNote, setPayNote] = useState('')
  const [paying, setPaying] = useState(false)

  const selectedCustomer = customers.find((c) => c.id === customerId)

  const loadBill = async () => {
    if (!customerId) return
    setLoading(true)
    try {
      const [billRes, groupedRes] = await Promise.all([
        getBill(customerId, year, month),
        getGroupedDeliveries(customerId, year, month),
      ])
      setBill(billRes.data)
      setGrouped(groupedRes.data)
    } catch (err) {
      showToast(err.response?.data?.detail || t('Failed to load bill', 'બિલ લોડ ન થયું'), 'error')
      setBill(null)
      setGrouped([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getCustomers()
      .then((res) => {
        setCustomers(res.data)
        const fromUrl = searchParams.get('customer')
        if (fromUrl && res.data.some((c) => c.id === fromUrl)) {
          setCustomerId(fromUrl)
        } else if (res.data.length && !customerId) {
          setCustomerId(res.data[0].id)
        }
      })
      .catch(() => showToast(t('Failed to load customers', 'ગ્રાહક લોડ ન થયા'), 'error'))
    getRates()
      .then((res) => setRates(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadBill()
  }, [customerId, year, month])

  const billFilenameBase = () => {
    const name = (selectedCustomer?.name || 'customer').replace(/\s+/g, '-')
    return `milk-bill-${name}-${year}-${String(month).padStart(2, '0')}`
  }

  const billMessage = () => {
    const monthLabel = MONTHS.find((m) => m.value === month)?.label.split(' ')[0] || month
    return `${t('Milk Bill', 'દૂધ બિલ')} — ${selectedCustomer?.name || ''} — ${monthLabel} ${year}. ${t('Total', 'કુલ')}: ${formatCurrency(bill?.total_amount || 0)}`
  }

  const runExport = async (action) => {
    if (!cardRef.current || !bill || exporting) return
    setExporting(true)
    try {
      const exporter = await exportBillCard({
        element: cardRef.current,
        filenameBase: billFilenameBase(),
        customerPhone: selectedCustomer?.phone,
        billMessage: billMessage(),
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
              ? t('Bill shared', 'બિલ શેર થયું')
              : t('Image downloaded', 'ફોટો ડાઉનલોડ થયો'),
            'success'
          )
          break
        }
        case 'whatsapp': {
          const result = await exporter.shareWhatsApp()
          showToast(
            result === 'shared'
              ? t('Bill shared on WhatsApp', 'WhatsApp પર શેર થયું')
              : t('WhatsApp opened', 'WhatsApp ખુલ્યું'),
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

  const handlePrint = () => {
    window.print()
  }

  const handlePayment = async (e) => {
    e.preventDefault()
    if (!customerId || !payAmount) return
    setPaying(true)
    try {
      await createPayment({
        customer_id: customerId,
        date: payDate,
        amount: parseFloat(payAmount),
        payment_type: 'monthly',
        for_month: `${year}-${String(month).padStart(2, '0')}`,
        note: payNote || t('Monthly payment', 'માસિક જમા'),
      })
      setPayAmount('')
      setPayNote('')
      await loadBill()
      showToast(t('Payment recorded', 'જમા નોંધાઈ'), 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || t('Payment failed', 'જમા ન થઈ'), 'error')
    } finally {
      setPaying(false)
    }
  }

  return (
    <Layout>
      <div className="page-container">
        <PageHeader
          title={t('Monthly Bill', 'માસિક બિલ')}
          subtitle={t('Generate, download & share bill', 'બિલ બનાવો, ડાઉનલોડ અને મોકલો')}
        />

        <div className="card mb-5 grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
          <div>
            <label className="label-text mb-1.5 block">{t('Customer', 'ગ્રાહક')}</label>
            <CustomerSelect
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
            />
          </div>
          <div>
            <label className="label-text mb-1.5 block">{t('Month', 'મહિનો')}</label>
            <Select
              options={MONTHS.map((m) => ({ value: m.value, label: m.label }))}
              value={month}
              onChange={(v) => setMonth(Number(v))}
            />
          </div>
          <div>
            <label className="label-text mb-1.5 block">{t('Year', 'વર્ષ')}</label>
            <input
              type="number"
              className="input-field"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : bill ? (
          <>
            <div className="no-print mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={exporting}
                onClick={() => runExport('image')}
                className="btn-secondary"
              >
                <Image size={18} />
                {t('Download Image', 'ફોટો ડાઉનલોડ')}
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => runExport('pdf')}
                className="btn-secondary"
              >
                <FileText size={18} />
                {t('Download PDF', 'PDF ડાઉનલોડ')}
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => runExport('share')}
                className="btn-primary"
              >
                <Share2 size={18} />
                {t('Share', 'શેર કરો')}
              </button>
              <button
                type="button"
                disabled={exporting || !selectedCustomer?.phone}
                onClick={() => runExport('whatsapp')}
                className="btn-primary bg-green-600 hover:bg-green-500"
                title={
                  !selectedCustomer?.phone
                    ? t('Add customer phone for WhatsApp', 'WhatsApp માટે ફોન ઉમેરો')
                    : ''
                }
              >
                <MessageCircle size={18} />
                {t('WhatsApp', 'WhatsApp')}
              </button>
              <button type="button" onClick={handlePrint} className="btn-secondary">
                <Printer size={18} />
                {t('Print', 'પ્રિન્ટ')}
              </button>
            </div>

            <BillCard bill={bill} cardRef={cardRef} rates={rates} />

            <div className="no-print mt-6 card p-4 sm:p-5">
              <h3 className="mb-4 font-bold text-slate-800">
                {t('Daily Records (Grouped)', 'દૈનિક નોંધ — ગ્રૂપ')}
              </h3>
              {grouped.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {t('No deliveries this month', 'આ મહિને ડિલિવરી નથી')}
                </p>
              ) : (
                <div className="space-y-3">
                  {grouped.map((day) => (
                    <div
                      key={day.date}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">
                          {formatDate(day.date)}
                        </span>
                        <span className="font-bold text-dairy-700">
                          {formatCurrency(day.total_amount)} · {formatPackTotal(day.total_liters)}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {day.sessions.map((s) => (
                          <SessionSourceDetail key={s.session} session={s} rates={rates} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={handlePayment}
              className="no-print mt-6 card space-y-4 p-4 sm:p-5"
            >
              <h3 className="flex items-center gap-2 font-bold text-slate-800">
                <IndianRupee size={20} />
                {t('Add Later Payment', 'પછી જમા નોંધ')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label-text mb-1.5 block">{t('Amount', 'રકમ')}</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="input-field"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-text mb-1.5 block">{t('Date', 'તારીખ')}</label>
                  <DatePicker value={payDate} onChange={setPayDate} />
                </div>
                <div>
                  <label className="label-text mb-1.5 block">{t('Note', 'નોંધ')}</label>
                  <input
                    className="input-field"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" disabled={paying} className="btn-primary">
                {paying ? t('Saving...', 'સેવ થાય છે...') : t('Record Payment', 'જમા નોંધો')}
              </button>
            </form>
          </>
        ) : (
          !loading && (
            <p className="text-center text-slate-500">
              {t('Select a customer to view bill', 'બિલ જોવા ગ્રાહક પસંદ કરો')}
            </p>
          )
        )}
      </div>
    </Layout>
  )
}
