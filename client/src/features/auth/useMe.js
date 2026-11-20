import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { meApi } from '@/api'

/** The signed-in user's business + plan. Loaded once, cached, used everywhere (currency, locale...). */
export function useMe() {
  const { isSignedIn } = useAuth()
  return useQuery({ queryKey: ['me'], queryFn: meApi.get, enabled: !!isSignedIn, staleTime: 60_000 })
}
