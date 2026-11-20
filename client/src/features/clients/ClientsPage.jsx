import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clientsApi } from '@/api'
import { Button, Card, EmptyState, ErrorState, Modal, PageHeader, Spinner, useToast } from '@/components/ui'
import ClientForm from './ClientForm'

export default function ClientsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null) // null = closed, {} = new, {...client} = edit

  const { data: clients, isLoading, error, refetch } = useQuery({ queryKey: ['clients'], queryFn: () => clientsApi.list() })
  const remove = useMutation({
    mutationFn: (id) => clientsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast(t('clients.deleted')) },
    onError: (e) => toast(e.message, 'error'),
  })
  const confirmDelete = (c) => window.confirm(t('clients.confirmDelete', { name: c.name })) && remove.mutate(c.id)

  return (
    <>
      <PageHeader title={t('clients.title')} actions={<Button icon={Plus} onClick={() => setEditing({})}>{t('clients.new')}</Button>} />
      <Card className="overflow-hidden">
        {isLoading ? <Spinner /> : error ? <ErrorState error={error} onRetry={refetch} /> : clients.length === 0 ? (
          <EmptyState icon={Users} title={t('clients.emptyTitle')} text={t('clients.emptyText')} action={<Button icon={Plus} onClick={() => setEditing({})}>{t('clients.new')}</Button>} />
        ) : (
          <ul className="divide-y divide-line">
            {clients.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-ink-mute">{[c.email, c.phone].filter(Boolean).join(' · ') || t('clients.noContact')}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(c)} aria-label={t('common.edit')} />
                  <Button variant="ghost" size="sm" icon={Trash2} onClick={() => confirmDelete(c)} aria-label={t('common.delete')} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? t('clients.edit') : t('clients.new')}>
        {editing && <ClientForm client={editing.id ? editing : null} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />}
      </Modal>
    </>
  )
}
