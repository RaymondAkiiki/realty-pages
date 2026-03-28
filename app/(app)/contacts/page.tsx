'use client'
import { useState, useEffect, useCallback } from 'react'
import { Contact, ContactType, ContactStatus, CONTACT_TYPES, CONTACT_STATUSES, TYPE_COLORS, STATUS_COLORS } from '@/types'
import ContactModal from '@/components/ContactModal'
import ImportModal from '@/components/ImportModal'
import Toast from '@/components/Toast'

interface FiltersState {
  search: string
  type: string
  status: string
  area: string
  city: string
}

interface ApiResponse {
  contacts: Contact[]
  total: number
  page: number
  pages: number
  areas: string[]
  cities: string[]
}

export default function ContactsPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [filters, setFilters] = useState<FiltersState>({ search: '', type: '', status: '', area: '', city: '' })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.type) params.set('type', filters.type)
    if (filters.status) params.set('status', filters.status)
    if (filters.area) params.set('area', filters.area)
    if (filters.city) params.set('city', filters.city)
    params.set('page', String(page))
    params.set('limit', '50')

    try {
      const res = await fetch(`/api/contacts?${params}`)
      if (!res.ok) { console.error('fetch failed', res.status); setLoading(false); return }
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Contacts fetch error:', err)
    }
    setLoading(false)
    setSelectedIds(new Set())
  }, [filters, page])

  useEffect(() => {
    const t = setTimeout(fetchContacts, filters.search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchContacts])

  function setFilter(key: keyof FiltersState, val: string) {
    setFilters(f => ({ ...f, [key]: val }))
    setPage(1)
  }

  function clearFilters() {
    setFilters({ search: '', type: '', status: '', area: '', city: '' })
    setPage(1)
  }

  const hasFilters = Object.values(filters).some(Boolean)

  async function handleDelete(id: string) {
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Contact deleted')
      fetchContacts()
    } else {
      showToast('Failed to delete', 'error')
    }
    setDeleteId(null)
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map(id => fetch(`/api/contacts/${id}`, { method: 'DELETE' })))
    showToast(`${ids.length} contacts deleted`)
    fetchContacts()
  }

  function handleExport() {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.type) params.set('type', filters.type)
    if (filters.status) params.set('status', filters.status)
    if (filters.area) params.set('area', filters.area)
    window.open(`/api/contacts/export?${params}`, '_blank')
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (!data) return
    if (selectedIds.size === data.contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.contacts.map(c => c.id)))
    }
  }

  const contacts = data?.contacts || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ marginBottom: 0 }}>
            Contacts
            {data && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>{data.total}</span>}
          </h2>
        </div>

        {selectedIds.size > 0 && (
          <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
            Delete {selectedIds.size}
          </button>
        )}

        <button className="btn btn-ghost btn-sm" onClick={handleExport} title="Export filtered contacts as CSV">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 10v3h12v-3M8 2v8M5 7l3 3 3-3"/></svg>
          Export
        </button>

        <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(true)}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 10v3h12v-3M8 10V2M5 5l3-3 3 3"/></svg>
          Import
        </button>

        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2v12M2 8h12"/></svg>
          Add contact
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0, background: 'var(--surface)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="7" r="5"/><path d="M12 12l2 2"/></svg>
          <input
            className="input"
            style={{ paddingLeft: 30, fontSize: 13 }}
            placeholder="Search name, email, phone, area..."
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>

        <select className="input" style={{ width: 160, fontSize: 13 }} value={filters.area} onChange={e => setFilter('area', e.target.value)}>
          <option value="">All areas</option>
          {data?.areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select className="input" style={{ width: 140, fontSize: 13 }} value={filters.type} onChange={e => setFilter('type', e.target.value)}>
          <option value="">All types</option>
          {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <select className="input" style={{ width: 130, fontSize: 13 }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {CONTACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ whiteSpace: 'nowrap' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <span className="spinner" style={{ width: 20, height: 20 }} />
          </div>
        ) : contacts.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3">
              <circle cx="18" cy="14" r="7"/><path d="M4 34c0-7 6.3-11 14-11s14 4 14 11"/>
              <path d="M28 18h8M32 14v8"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {hasFilters ? 'No contacts match your filters' : 'No contacts yet'}
            </div>
            <div style={{ fontSize: 13 }}>
              {hasFilters
                ? <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button>
                : <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>Add your first contact</button>
              }
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <th style={{ width: 40, padding: '10px 0 10px 16px' }}>
                  <input type="checkbox" checked={selectedIds.size === contacts.length && contacts.length > 0} onChange={toggleAll} />
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Name</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Type</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Area</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Phone</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Email</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tags</th>
                <th style={{ width: 80, padding: '10px 16px 10px 12px' }} />
              </tr>
            </thead>
            <tbody>
              {contacts.map(contact => (
                <tr key={contact.id} className="table-row" style={{ cursor: 'pointer' }} onClick={() => setEditContact(contact)}>
                  <td style={{ padding: '10px 0 10px 16px' }} onClick={e => { e.stopPropagation(); toggleSelect(contact.id) }}>
                    <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={() => toggleSelect(contact.id)} onClick={e => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>{contact.name}</div>
                    {contact.notes && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contact.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`badge ${TYPE_COLORS[contact.type]}`}>{contact.type}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--ink-2)' }}>
                    {contact.area || contact.city || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>
                    {contact.phone
                      ? <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{contact.phone}</a>
                      : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>
                    {contact.email
                      ? <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{contact.email}</a>
                      : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`badge ${STATUS_COLORS[contact.status]}`}>{contact.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(contact.tags || []).slice(0, 2).map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                      {(contact.tags || []).length > 2 && (
                        <span className="tag">+{contact.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px 10px 12px' }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '4px 8px', color: 'var(--danger)', borderColor: 'transparent' }}
                      onClick={() => setDeleteId(contact.id)}
                      title="Delete contact"
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h12M6 4V2h4v2M5 4v9h6V4"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--surface)', fontSize: 13 }}>
          <span style={{ color: 'var(--ink-2)' }}>
            Page {data.page} of {data.pages} — {data.total} contacts
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}>Next →</button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 380 }}>
            <div style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 10 }}>Delete contact?</h2>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 24 }}>
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showAdd || editContact) && (
        <ContactModal
          contact={editContact}
          onClose={() => { setShowAdd(false); setEditContact(null) }}
          onSave={() => { fetchContacts(); showToast(editContact ? 'Contact updated' : 'Contact added') }}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={(count) => { fetchContacts(); showToast(`${count} contacts imported`) }}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}