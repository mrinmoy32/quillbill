import { SignIn, SignUp } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import BrandMark from '@/components/BrandMark'
import { brand } from '@/config/brand'

function AuthLayout({ children }) {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <BrandMark />
        <div>
          <p className="font-display text-5xl font-semibold leading-tight">{brand.tagline}</p>
          <p className="mt-4 max-w-md text-white/70">{t('auth.pitch')}</p>
        </div>
        <p className="text-sm text-white/50">{brand.name}</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="lg:hidden">
          <BrandMark />
        </div>
        {children}
      </div>
    </div>
  )
}

export const SignInPage = () => (
  <AuthLayout>
    <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
  </AuthLayout>
)

export const SignUpPage = () => (
  <AuthLayout>
    <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
  </AuthLayout>
)
