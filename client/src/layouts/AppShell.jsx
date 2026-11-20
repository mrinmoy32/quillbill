import { UserButton } from '@clerk/clerk-react'
import { Plus } from 'lucide-react'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import BrandMark from '@/components/BrandMark'
import { Spinner } from '@/components/ui'
import { config } from '@/config'
import { useMe } from '@/features/auth/useMe'
import { cn } from '@/lib/cn'
import { appRoutes } from '@/routes'

const navItems = appRoutes.filter((r) => r.nav)

/** Desktop: sidebar. Phone: slim top bar + bottom tab bar with a big "New invoice" button. */
export default function AppShell() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const mobileItems = navItems.filter((r) => r.nav.mobile)
  const half = Math.ceil(mobileItems.length / 2)

  const linkClass = ({ isActive }) =>
    cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-black/5')

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white p-4 md:flex">
        <div className="px-2 py-3">
          <BrandMark />
        </div>
        <NewInvoiceButton />
        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Main">
          {navItems.map(({ path, nav }) => (
            <NavLink key={path} to={path} end={path === '/'} className={linkClass}>
              <nav.icon className="h-4 w-4" aria-hidden />
              {t(nav.label)}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
          <UserButton afterSignOutUrl="/sign-in" />
          <div className="text-right text-xs text-ink-mute">
            <div>{me?.billing.plan === 'pro' ? t('billing.planPro') : t('billing.planFree')}</div>
            <div>v{config.version}{config.env !== 'prod' && ` · ${config.env}`}</div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Phone top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <BrandMark size={28} />
          <UserButton afterSignOutUrl="/sign-in" />
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 md:px-8 md:pb-12 md:pt-8">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Phone bottom tabs */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white md:hidden" aria-label="Main">
        <ul className="grid grid-cols-5 items-end px-2 pt-1">
          {mobileItems.slice(0, half).map((r) => <MobileTab key={r.path} route={r} label={t(r.nav.label)} />)}
          <li className="flex justify-center pb-2">
            <NavLink to="/invoices/new" aria-label={t('invoices.new')} className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30">
              <Plus className="h-6 w-6" />
            </NavLink>
          </li>
          {mobileItems.slice(half).map((r) => <MobileTab key={r.path} route={r} label={t(r.nav.label)} />)}
        </ul>
      </nav>
    </div>
  )
}

function NewInvoiceButton() {
  const { t } = useTranslation()
  return (
    <NavLink to="/invoices/new" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-lg bg-brand text-sm font-medium text-white hover:bg-brand-strong">
      <Plus className="h-4 w-4" aria-hidden />
      {t('invoices.new')}
    </NavLink>
  )
}

function MobileTab({ route, label }) {
  return (
    <li>
      <NavLink to={route.path} end={route.path === '/'} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-brand' : 'text-ink-mute')}>
        <route.nav.icon className="h-5 w-5" aria-hidden />
        {label}
      </NavLink>
    </li>
  )
}
