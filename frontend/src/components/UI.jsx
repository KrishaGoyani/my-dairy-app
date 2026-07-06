import { t } from '../utils/labels'
import DatePickerComponent from './DatePicker'

export { default as Select } from './Select'
export { default as DatePicker } from './DatePicker'
export { default as SearchInput } from './SearchInput'
export { default as CustomerSelect } from './CustomerSelect'

export default function BilingualLabel({ en, gu, className = '' }) {
  return (
    <span className={className}>
      {en} <span className="text-slate-500">({gu})</span>
    </span>
  )
}

export function StatCard({ icon, title, value, subtitle, hint, color = 'dairy' }) {
  const colors = {
    dairy: 'from-dairy-600 to-dairy-500',
    accent: 'from-accent-500 to-accent-400',
    blue: 'from-blue-600 to-blue-500',
    amber: 'from-amber-500 to-amber-400',
  }

  return (
    <div className="card animate-fade-in p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-700 sm:text-sm">{title}</p>
          {hint && (
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{hint}</p>
          )}
          <p className="mt-1.5 text-2xl font-bold text-slate-800 sm:text-3xl">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colors[color]} text-xl text-white shadow-md`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

export function SectionHeading({ title, hint }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-dairy-200 border-t-dairy-600" />
    </div>
  )
}

export function EmptyState({ message }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="text-4xl">📋</span>
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** @deprecated Use DatePicker instead */
export function DateInput(props) {
  return <DatePickerComponent {...props} />
}

export { t }
