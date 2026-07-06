import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatInputDate, t, toISODateLocal } from '../utils/labels'
import { FloatingPortal, useFloatingMenu } from './useFloatingMenu'

const CALENDAR_WIDTH = 280

function isoToDate(iso) {
  if (!iso) return null
  const d = parseISO(iso)
  return isValid(d) ? d : null
}

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = t('Pick a date', 'તારીખ પસંદ કરો'),
  disabled = false,
  className = '',
  align = 'start',
}) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => isoToDate(value) || new Date())
  const [error, setError] = useState('')
  const rootRef = useRef(null)
  const { triggerRef, menuRef, menuStyle } = useFloatingMenu(open, {
    width: CALENDAR_WIDTH,
    align,
  })

  const minDate = isoToDate(min)
  const maxDate = isoToDate(max)
  const selected = isoToDate(value)

  useEffect(() => {
    if (selected) setViewMonth(selected)
  }, [value])

  useEffect(() => {
    const onDocClick = (e) => {
      if (
        rootRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return
      }
      setOpen(false)
      setError('')
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuRef])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [viewMonth])

  const isDisabled = (day) => {
    if (minDate && isBefore(day, minDate)) return true
    if (maxDate && isAfter(day, maxDate)) return true
    return false
  }

  const pickDay = (day) => {
    if (isDisabled(day)) {
      setError(t('Date is out of allowed range', 'તારીખ માન્ય શ્રેણી બહાર છે'))
      return
    }
    onChange(toISODateLocal(day))
    setError('')
    setOpen(false)
  }

  const display = value ? formatInputDate(value) : ''

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`input-field flex w-full items-center gap-2 text-left ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${open ? 'border-dairy-500 ring-2 ring-dairy-500/20' : ''} ${error ? 'border-red-400 ring-red-400/20' : ''}`}
      >
        <Calendar size={18} className="shrink-0 text-slate-400" />
        <span className={`flex-1 truncate ${display ? 'text-slate-800' : 'text-slate-400'}`}>
          {display || placeholder}
        </span>
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {open && (
        <FloatingPortal menuStyle={menuStyle} menuRef={menuRef}>
          <div className="dropdown-panel animate-dropdown-in p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-dairy-300 hover:bg-dairy-50 hover:text-dairy-700"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {format(viewMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-dairy-300 hover:bg-dairy-50 hover:text-dairy-700"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-slate-400">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, viewMonth)
                const selectedDay = selected && isSameDay(day, selected)
                const disabledDay = isDisabled(day)
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => pickDay(day)}
                    className={`flex h-9 w-full items-center justify-center rounded-lg text-sm transition ${
                      selectedDay
                        ? 'bg-dairy-600 font-semibold text-white shadow-sm'
                        : disabledDay
                          ? 'cursor-not-allowed text-slate-300'
                          : inMonth
                            ? 'text-slate-700 hover:bg-dairy-50 hover:text-dairy-700'
                            : 'text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  )
}

export { formatInputDate }
