import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import Layout from '../components/Layout'
import { PageHeader, LoadingSpinner } from '../components/UI'
import { useToast } from '../components/Toast'
import { getRates, updateRate } from '../api/client'
import { t, rateShortLabel, ratePackSize } from '../utils/labels'

const PACK_OPTIONS = ['500ml', '1L', '2L', '6L', '10L', '15L']

function isRowDirty(rate, formRow) {
  if (!formRow) return false
  const rateVal = parseFloat(formRow.rate)
  if (!rateVal || rateVal <= 0) return false
  return (
    rateVal !== rate.rate ||
    (formRow.label?.trim() || '') !== (rate.label || '') ||
    (formRow.short_label?.trim() || '') !==
      (rate.short_label || rateShortLabel(rate)) ||
    (formRow.pack_size?.trim() || '') !==
      (rate.pack_size || ratePackSize(rate))
  )
}

export default function Rates() {
  const { showToast } = useToast()
  const [rates, setRates] = useState([])
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  const load = () => {
    setLoading(true)
    getRates()
      .then((res) => {
        setRates(res.data)
        const map = {}
        for (const r of res.data) {
          map[r.id] = {
            rate: String(r.rate),
            label: r.label,
            short_label: r.short_label || rateShortLabel(r),
            pack_size: r.pack_size || ratePackSize(r),
          }
        }
        setForm(map)
      })
      .catch(() => showToast(t('Failed to load prices', 'ભાવ લોડ ન થયા'), 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const updateField = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const handleSaveOne = async (rate) => {
    const row = form[rate.id]
    const parsedRate = parseFloat(row?.rate)
    if (!parsedRate || parsedRate <= 0) {
      showToast(t('Enter valid price', 'સાચો ભાવ દાખલ કરો'), 'error')
      return
    }
    if (!row?.pack_size?.trim()) {
      showToast(t('Enter pack size', 'પેક સાઈઝ દાખલ કરો'), 'error')
      return
    }

    setSavingId(rate.id)
    try {
      const res = await updateRate(rate.id, {
        rate: parsedRate,
        label: row?.label?.trim() || rate.label,
        short_label: row?.short_label?.trim() || rateShortLabel(rate),
        pack_size: row?.pack_size?.trim() || ratePackSize(rate),
      })
      setRates((prev) =>
        prev.map((r) => (r.id === rate.id ? res.data : r))
      )
      setForm((prev) => ({
        ...prev,
        [rate.id]: {
          rate: String(res.data.rate),
          label: res.data.label,
          short_label: res.data.short_label || rateShortLabel(res.data),
          pack_size: res.data.pack_size || ratePackSize(res.data),
        },
      }))
      showToast(
        `${res.data.short_label || res.data.label} — ${t('saved', 'સેવ થયો')}`,
        'success'
      )
    } catch (err) {
      showToast(
        err.response?.data?.detail || t('Save failed', 'સેવ ન થયું'),
        'error'
      )
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Layout>
      <div className="page-container">
        <PageHeader
          title={t('Milk Prices', 'દૂધના ભાવ')}
          subtitle={t(
            'Set price and pack size for each product',
            'દરેક પ્રોડક્ટનો ભાવ અને પેક સાઈઝ સેટ કરો'
          )}
        />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="card space-y-5 p-4 sm:p-6">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-dairy-600 text-white">
                    <th className="w-10 px-3 py-3 text-center">#</th>
                    <th className="px-4 py-3 text-left">
                      {t('Product', 'પ્રોડક્ટ')}
                    </th>
                    <th className="px-4 py-3 text-left">
                      {t('Short Name', 'ટૂંકું નામ')}
                    </th>
                    <th className="px-4 py-3 text-left">
                      {t('Pack Size', 'પેક સાઈઝ')}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {t('Price', 'ભાવ')}
                    </th>
                    <th className="px-4 py-3 text-center">
                      {t('Save', 'સેવ')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r, index) => {
                    const dirty = isRowDirty(r, form[r.id])
                    const saving = savingId === r.id
                    const pack =
                      form[r.id]?.pack_size ?? r.pack_size ?? ratePackSize(r)
                    return (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-3 py-3 text-center text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className="input-field py-2"
                            value={form[r.id]?.label ?? r.label}
                            onChange={(e) =>
                              updateField(r.id, 'label', e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className="input-field w-28 py-2 font-semibold"
                            value={
                              form[r.id]?.short_label ??
                              r.short_label ??
                              rateShortLabel(r)
                            }
                            onChange={(e) =>
                              updateField(r.id, 'short_label', e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            list="pack-size-options"
                            placeholder="500ml"
                            className="input-field w-24 py-2 font-medium"
                            value={pack}
                            onChange={(e) =>
                              updateField(r.id, 'pack_size', e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              className="input-field w-28 py-2 text-right text-lg font-bold"
                              value={form[r.id]?.rate ?? r.rate}
                              onChange={(e) =>
                                updateField(r.id, 'rate', e.target.value)
                              }
                            />
                          </div>
                          {pack && (
                            <p className="mt-1 text-right text-xs text-slate-400">
                              {t('per pack', 'પ્રતિ પેક')}: {pack}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleSaveOne(r)}
                            disabled={saving || !dirty}
                            className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm disabled:opacity-40"
                          >
                            <Save size={16} />
                            {saving
                              ? t('Saving...', 'સેવ...')
                              : t('Save', 'સેવ')}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <datalist id="pack-size-options">
              {PACK_OPTIONS.map((size) => (
                <option key={size} value={size} />
              ))}
            </datalist>

            <div className="rounded-xl bg-cream-100 px-4 py-3 text-sm text-slate-600">
              <strong>{t('Note', 'નોંધ')}:</strong>{' '}
              {t(
                'Pack size examples: 500ml, 6L. Price is per one pack. Each row saves separately.',
                'પેક સાઈઝ: 500ml, 6L વગેરે. ભાવ એક પેકનો. દરેક પંક્તિ અલગ સેવ થાય.'
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
