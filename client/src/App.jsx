import { RedirectToSignIn, Show } from '@clerk/react'
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Spinner } from '@/components/ui'
import { SignInPage, SignUpPage } from '@/features/auth/AuthPages'
import AppShell from '@/layouts/AppShell'
import { appRoutes } from '@/routes'

const PublicInvoicePage = lazy(() => import('@/features/public/PublicInvoicePage'))
const NotFoundPage = lazy(() => import('@/features/public/NotFoundPage'))

/** Pages behind login are wrapped; public pages (sign-in, share links) are not. */
function RequireLogin({ children }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/i/:token" element={<PublicInvoicePage />} />
        <Route element={<RequireLogin><AppShell /></RequireLogin>}>
          {appRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
