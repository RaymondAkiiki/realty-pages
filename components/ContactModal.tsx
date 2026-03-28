'use client'
import { useState, useEffect } from 'react'
import { Contact, CONTACT_TYPES, CONTACT_STATUSES, ContactType, ContactStatus } from '@/types'

interface Props {
  contact?: Contact | null
  onClose: () => void
  onSave: (contact: Contact) => void
}

const EMPTY_FORM = {
  name: '', phone: '', email: '', type: 'other' as ContactType,
  status: 'active' as ContactStatus, source: '', city: '', area: '',
  tags: '', notes: '', last_contacted_at: ''
}

export default function ContactModal({ contact, onClose, onSave }: Props) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name || '',
        phone: contact.phone || '',
        email: contact.email || '',
        type: contact.type || 'other',
        status: contact.status || 'active',
        source: contact.source || '',
        city: contact.city || '',
        area: contact.area || '',
        tags: (contact.tags || []).join(', '),
        notes: contact.notes || '',
        last_contacted_at: contact.last_contacted_at ? contact.last_contacted_at.split('T')[0] : '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [contact])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setLoading(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      type: form.type,
      status: form.status,
      source: form.source || null,
      city: form.city || null,
      area: form.area || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      notes: form.notes || null,
      last_contacted_at: form.last_contacted_at || null,
    }

    const url = contact ? `/api/contacts/${contact.id}` : '/api/contacts'
    const method = contact ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Failed to save')
      return
    }

    onSave(data.contact)
    onClose()
  }

  const label = (text: string) => (
    <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-2)', marginBottom: 5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
      {text}
    </label>
  )

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>{contact ? 'Edit contact' : 'New contact'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Name + Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                {label('Name *')}
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" required autoFocus />
              </div>
              <div>
                {label('Type')}
                <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                  {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Phone + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                {label('Phone')}
                <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+256 700 000000" />
              </div>
              <div>
                {label('Email')}
                <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@email.com" />
              </div>
            </div>

            {/* Area + City */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                {label('Area / Neighbourhood')}
                <input className="input" value={form.area} onChange={e => set('area', e.target.value)} placeholder="e.g. Kololo, Bugolobi" />
              </div>
              <div>
                {label('City')}
                <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Kampala" />
              </div>
            </div>

            {/* Status + Source */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                {label('Status')}
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {CONTACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                {label('Source')}
                <input className="input" value={form.source} onChange={e => set('source', e.target.value)} placeholder="e.g. Referral, Portal" />
              </div>
            </div>

            {/* Tags */}
            <div>
              {label('Tags (comma separated)')}
              <input className="input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. VIP, Urgent, High value" />
            </div>

            {/* Last contacted */}
            <div>
              {label('Last contacted')}
              <input className="input" type="date" value={form.last_contacted_at} onChange={e => set('last_contacted_at', e.target.value)} />
            </div>

            {/* Notes */}
            <div>
              {label('Notes')}
              <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any relevant notes..." rows={3} />
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)' }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (contact ? 'Save changes' : 'Add contact')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
