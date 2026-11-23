import { useAuth } from '@clerk/react'
import { useEffect } from 'react'
import { setTokenGetter } from '@/api/client'

/** Gives the API client a way to ask Clerk for the current login token. Renders nothing. */
export default function ApiAuthBridge() {
  const { getToken } = useAuth()
  useEffect(() => setTokenGetter(() => getToken()), [getToken])
  return null
}
