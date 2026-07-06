import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { t } from '../utils/labels'
import { FloatingPortal, useFloatingMenu } from './useFloatingMenu'

const ITEM_HEIGHT = 40
const MAX_VISIBLE = 10

export default function Select({
  options = [],
  value,
  onChange,
  placeholder = t('Select', 'પસંદ કરો'),
  searchable = false,
  searchPlaceholder = t('Search...', 'શોધો...'),
  disabled = false,
  className = '',
  emptyMessage = t('No options found', 'કોઈ વિકલ્પ નથી'),
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const { triggerRef, menuRef, menuStyle } = useFloatingMenu(open)

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => {
      const hay = `${o.label} ${o.searchText || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [options, query])

  useEffect(() => {
    const onDocClick = (e) => {
      if (
        rootRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return
      }
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuRef])

  const pick = (opt) => {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  const listMaxHeight = Math.min(filtered.length, MAX_VISIBLE) * ITEM_HEIGHT

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`input-field flex w-full items-center justify-between gap-2 text-left ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${open ? 'border-dairy-500 ring-2 ring-dairy-500/20' : ''}`}
      >
        <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <FloatingPortal menuStyle={menuStyle} menuRef={menuRef}>
          <div className="dropdown-panel animate-dropdown-in overflow-hidden shadow-2xl">
            {searchable && (
              <div className="border-b border-slate-100 p-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none transition focus:border-dairy-500 focus:ring-2 focus:ring-dairy-500/20"
                  />
                </div>
              </div>
            )}

            <ul
              className="overflow-y-auto overscroll-contain py-1"
              style={{ maxHeight: `${listMaxHeight}px` }}
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-center text-sm text-slate-400">{emptyMessage}</li>
              ) : (
                filtered.map((opt) => {
                  const active = opt.value === value
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => pick(opt)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition ${
                          active
                            ? 'bg-dairy-50 font-medium text-dairy-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {active && <Check size={16} className="shrink-0 text-dairy-600" />}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </FloatingPortal>
      )}
    </div>
  )
}
