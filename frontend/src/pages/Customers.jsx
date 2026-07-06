import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Phone, MapPin, ChevronRight, Pencil, Trash2, LayoutGrid, List } from 'lucide-react'
import Layout from '../components/Layout'
import { PageHeader, LoadingSpinner, EmptyState, SearchInput, Select } from '../components/UI'
import { useToast } from '../components/Toast'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../api/client'
import { formatCurrency, t, customerDisplay, sortCustomers, CUSTOMER_SORT_OPTIONS, CUSTOMER_SORT_STORAGE_KEY } from '../utils/labels'

const emptyForm = {
  name: '',
  phone: '',
  address: '',
  opening_balance: '0',
}

const VIEW_STORAGE_KEY = 'customers-view'

function CustomerActions({ customer, onEdit, onDelete, compact = false }) {
  const btnClass = compact ? 'btn-secondary px-2.5 py-1.5' : 'btn-secondary px-3 py-2'
  const linkClass = compact
    ? 'btn-secondary px-2.5 py-1.5 text-xs'
    : 'btn-secondary flex-1 py-2 text-xs'
  const billClass = compact
    ? 'btn-primary px-2.5 py-1.5 text-xs'
    : 'btn-primary flex-1 py-2 text-xs'

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onEdit(customer)}
          className={btnClass}
          title={t('Edit', 'એડિટ')}
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(customer)}
          className={`${btnClass} text-red-600 hover:bg-red-50`}
          title={t('Delete', 'ડિલીટ')}
        >
          <Trash2 size={15} />
        </button>
        <Link to={`/delivery?customer=${customer.id}`} className={linkClass}>
          {t('Delivery', 'ડિલિવરી')}
        </Link>
        <Link to={`/bills?customer=${customer.id}`} className={billClass}>
          {t('Bill', 'બિલ')} <ChevronRight size={14} />
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(customer)}
          className={btnClass}
          title={t('Edit', 'એડિટ')}
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(customer)}
          className={`${btnClass} text-red-600 hover:bg-red-50`}
          title={t('Delete', 'ડિલીટ')}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Link to={`/delivery?customer=${customer.id}`} className={linkClass}>
          {t('Delivery', 'ડિલિવરી')}
        </Link>
        <Link to={`/bills?customer=${customer.id}`} className={billClass}>
          {t('Bill', 'બિલ')} <ChevronRight size={14} />
        </Link>
      </div>
    </>
  )
}

function BalanceBadge({ balance }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
        balance > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
      }`}
    >
      {formatCurrency(balance)}
    </span>
  )
}

export default function Customers() {
  const { showToast } = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem(VIEW_STORAGE_KEY) || 'grid'
  )
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem(CUSTOMER_SORT_STORAGE_KEY) || 'entry'
  )
  const formRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    localStorage.setItem(CUSTOMER_SORT_STORAGE_KEY, sortBy)
  }, [sortBy])

  useEffect(() => {
    if (showForm && editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showForm, editingId])

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const base = q
      ? customers.filter((c) => {
          const hay = `${c.name || ''} ${c.phone || ''} ${c.address || ''}`.toLowerCase()
          return hay.includes(q)
        })
      : customers
    return sortCustomers(base, sortBy)
  }, [customers, searchQuery, sortBy])

  const load = () => {
    setLoading(true)
    getCustomers()
      .then((res) => setCustomers(res.data))
      .catch(() => showToast(t('Failed to load customers', 'ગ્રાહક લોડ ન થયા'), 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({
      name: c.name,
      phone: c.phone || '',
      address: c.address || '',
      opening_balance: String(c.opening_balance ?? 0),
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        opening_balance: parseFloat(form.opening_balance) || 0,
      }
      if (editingId) {
        await updateCustomer(editingId, payload)
        showToast(t('Customer updated', 'ગ્રાહક અપડેટ થયો'), 'success')
      } else {
        await createCustomer(payload)
        showToast(t('Customer added', 'ગ્રાહક ઉમેરાયો'), 'success')
      }
      setForm(emptyForm)
      setEditingId(null)
      setShowForm(false)
      load()
    } catch (err) {
      showToast(err.response?.data?.detail || t('Save failed', 'સેવ ન થયું'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c) => {
    if (
      !window.confirm(
        `${t('Delete customer', 'ગ્રાહક ડિલીટ')}: ${c.name}?`
      )
    ) {
      return
    }
    try {
      await deleteCustomer(c.id)
      showToast(t('Customer removed', 'ગ્રાહક દૂર થયો'), 'success')
      load()
    } catch (err) {
      showToast(err.response?.data?.detail || t('Delete failed', 'ડિલીટ ન થયું'), 'error')
    }
  }

  return (
    <Layout>
      <div className="page-container">
        <PageHeader
          title={t('Customers', 'ગ્રાહકો')}
          subtitle={t('Manage customer list', 'ગ્રાહક યાદી')}
          action={
            <button type="button" onClick={openAdd} className="btn-primary">
              <Plus size={18} />
              {t('Add Customer', 'નવો ગ્રાહક')}
            </button>
          }
        />

        <div className="card mb-5 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <label className="label-text mb-1.5 block">
                {t('Search Customer', 'ગ્રાહક શોધો')}
              </label>
              <SearchInput
                placeholder={t('Search by name or phone', 'નામ અથવા ફોન શોધો')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
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
              <div className="flex shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  viewMode === 'grid'
                    ? 'bg-dairy-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
                title={t('Grid view', 'ગ્રિડ દૃશ્ય')}
              >
                <LayoutGrid size={16} />
                <span className="hidden sm:inline">{t('Grid', 'ગ્રિડ')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-dairy-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
                title={t('List view', 'યાદી દૃશ્ય')}
              >
                <List size={16} />
                <span className="hidden sm:inline">{t('List', 'યાદી')}</span>
              </button>
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="card mb-5 scroll-mt-24 space-y-4 p-4 sm:p-6"
          >
            <h3 className="font-bold text-slate-800">
              {editingId
                ? t('Edit Customer', 'ગ્રાહક એડિટ')
                : t('New Customer', 'નવો ગ્રાહક')}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-text mb-1.5 block">{t('Name', 'નામ')} *</label>
                <input
                  required
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label-text mb-1.5 block">{t('Phone', 'ફોન')}</label>
                <input
                  className="input-field"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="label-text mb-1.5 block">
                  {t('Opening Balance', 'આગલી બાકી')}
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={form.opening_balance}
                  onChange={(e) =>
                    setForm({ ...form, opening_balance: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-text mb-1.5 block">{t('Address', 'સરનામું')}</label>
                <input
                  className="input-field"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? t('Saving...', 'સેવ થાય છે...') : t('Save', 'સેવ કરો')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                className="btn-secondary"
              >
                {t('Cancel', 'રદ')}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState message={t('No customers found', 'કોઈ ગ્રાહક મળ્યો નહીં')} />
        ) : viewMode === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((c, index) => (
              <div key={c.id} className="card animate-fade-in p-4 transition hover:shadow-xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-800">
                      <span className="mr-1.5 text-sm font-semibold text-dairy-600">
                        {index + 1}.
                      </span>
                      {customerDisplay(c)}
                    </h3>
                    {c.phone && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <Phone size={14} /> {c.phone}
                      </p>
                    )}
                    {c.address && (
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin size={14} /> {c.address}
                      </p>
                    )}
                  </div>
                  <BalanceBadge balance={c.balance} />
                </div>
                <CustomerActions
                  customer={c}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="bg-dairy-600 text-white">
                    <th className="w-12 px-3 py-3 text-center font-semibold">
                      {t('No.', 'નં.')}
                    </th>
                    <th className="px-4 py-3 font-semibold">{t('Name', 'નામ')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Phone', 'ફોન')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Address', 'સરનામું')}</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      {t('Balance', 'બાકી')}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      {t('Actions', 'ક્રિયા')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c, index) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-3 py-3 text-center font-semibold text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {customerDisplay(c)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.phone || '—'}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">
                        {c.address || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BalanceBadge balance={c.balance} />
                      </td>
                      <td className="px-4 py-3">
                        <CustomerActions
                          customer={c}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          compact
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
