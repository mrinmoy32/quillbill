// The ONE place that talks to the backend. Adds the login token, turns errors into ApiError.
import { config } from '@/config'

let tokenGetter = async () => null
/** Called once by <ApiAuthBridge/> so this file can ask Clerk for the current token. */
export const setTokenGetter = (fn) => {
  tokenGetter = fn
}

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code // stable machine-readable code, e.g. "plan_limit_reached"
    this.details = details
  }
}

async function send(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = await tokenGetter()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let res
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError(0, 'network_error', 'Can\u2019t reach the server. Check your connection and try again.')
  }
  if (!res.ok) {
    let err = {}
    try {
      err = (await res.json()).error || {}
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, err.code || 'error', err.message || 'Something went wrong. Please try again.', err.details)
  }
  return res
}

export async function api(path, options) {
  const res = await send(path, options)
  return res.status === 204 ? null : res.json()
}

/** Download a file (e.g. PDF) that needs the login token. */
export async function downloadFile(path, filename, options = {}) {
  const res = await send(path, options)
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
