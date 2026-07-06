import { NavLink } from 'react-router-dom'
import {
  Home,
  Truck,
  Users,
  FileText,
  BarChart3,
  IndianRupee,
} from 'lucide-react'
import { t, BRAND_NAME, BRAND_TAGLINE } from '../utils/labels'

const links = [
  { to: '/', icon: Home, label: t('Home', 'હોમ') },
  { to: '/delivery', icon: Truck, label: t('Delivery', 'ડિલિવરી') },
  { to: '/customers', icon: Users, label: t('Customers', 'ગ્રાહકો') },
  { to: '/bills', icon: FileText, label: t('Bills', 'બિલ') },
  { to: '/reports', icon: BarChart3, label: t('Reports', 'રિપોર્ટ') },
  { to: '/rates', icon: IndianRupee, label: t('Prices', 'ભાવ') },
]

export default function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dairy-600 text-lg text-white shadow-md">
              🥛
            </div>
            <div>
              <h1 className="text-base font-bold text-dairy-700 sm:text-lg">
                {BRAND_NAME}
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                {BRAND_TAGLINE}
              </p>
            </div>
          </div>
        </div>

        <nav className="hidden border-t border-slate-100 md:block">
          <div className="mx-auto flex max-w-6xl gap-1 px-4 py-2 sm:px-6 lg:px-8">
            {links.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-dairy-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden no-print">
        <div className="mx-auto flex max-w-lg justify-around px-1 py-2">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium transition ${
                  isActive ? 'text-dairy-600' : 'text-slate-500'
                }`
              }
            >
              <Icon size={22} strokeWidth={2} />
              <span className="truncate">{label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
