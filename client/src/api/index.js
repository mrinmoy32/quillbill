// All backend calls, grouped by feature. Pages never call fetch directly.
import { api, downloadFile } from './client'

export const meApi = { get: () => api('/me') }

export const businessApi = {
  get: () => api('/business'),
  update: (data) => api('/business', { method: 'PUT', body: data }),
}

export const clientsApi = {
  list: (q) => api(`/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  create: (data) => api('/clients', { method: 'POST', body: data }),
  update: (id, data) => api(`/clients/${id}`, { method: 'PUT', body: data }),
  remove: (id) => api(`/clients/${id}`, { method: 'DELETE' }),
}

export const invoicesApi = {
  list: ({ status, q, limit = 50, offset = 0 } = {}) => {
    const p = new URLSearchParams({ limit, offset })
    if (status) p.set('status', status)
    if (q) p.set('q', q)
    return api(`/invoices?${p}`)
  },
  summary: () => api('/invoices/summary'),
  get: (id) => api(`/invoices/${id}`),
  create: (data) => api('/invoices', { method: 'POST', body: data }),
  update: (id, data) => api(`/invoices/${id}`, { method: 'PUT', body: data }),
  remove: (id) => api(`/invoices/${id}`, { method: 'DELETE' }),
  duplicate: (id) => api(`/invoices/${id}/duplicate`, { method: 'POST' }),
  setStatus: (id, status) => api(`/invoices/${id}/status`, { method: 'POST', body: { status } }),
  send: (id, data) => api(`/invoices/${id}/send`, { method: 'POST', body: data }),
  downloadPdf: (id, number) => downloadFile(`/invoices/${id}/pdf`, `${number}.pdf`),
}

export const billingApi = {
  status: () => api('/billing'),
  checkout: () => api('/billing/checkout', { method: 'POST' }),
}

export const publicApi = {
  invoice: (token) => api(`/public/invoices/${token}`, { auth: false }),
  downloadPdf: (token, number) => downloadFile(`/public/invoices/${token}/pdf`, `${number}.pdf`, { auth: false }),
}
