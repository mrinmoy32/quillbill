// ADD A PAGE = add one object to `appRoutes` (and a translation key if it appears in the menu).
//   path : URL
//   element : the page component (lazy-loaded so each page is its own small download)
//   nav : optional. Present -> shows in the menu.  { label: i18n key, icon, mobile: show in phone tab bar }
import { CreditCard, FileText, LayoutDashboard, Settings, Users } from 'lucide-react'
import { lazy } from 'react'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const InvoicesPage = lazy(() => import('@/features/invoices/InvoicesPage'))
const InvoiceEditorPage = lazy(() => import('@/features/invoices/InvoiceEditorPage'))
const InvoiceDetailPage = lazy(() => import('@/features/invoices/InvoiceDetailPage'))
const ClientsPage = lazy(() => import('@/features/clients/ClientsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const BillingPage = lazy(() => import('@/features/billing/BillingPage'))

export const appRoutes = [
  { path: '/', element: <DashboardPage />, nav: { label: 'nav.dashboard', icon: LayoutDashboard, mobile: true } },
  { path: '/invoices', element: <InvoicesPage />, nav: { label: 'nav.invoices', icon: FileText, mobile: true } },
  { path: '/invoices/new', element: <InvoiceEditorPage /> },
  { path: '/invoices/:id', element: <InvoiceDetailPage /> },
  { path: '/invoices/:id/edit', element: <InvoiceEditorPage /> },
  { path: '/clients', element: <ClientsPage />, nav: { label: 'nav.clients', icon: Users, mobile: true } },
  { path: '/settings', element: <SettingsPage />, nav: { label: 'nav.settings', icon: Settings, mobile: true } },
  { path: '/billing', element: <BillingPage />, nav: { label: 'nav.billing', icon: CreditCard } },
]
