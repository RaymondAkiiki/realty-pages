'use client'
import { useState, useEffect } from 'react'
import { getSession } from '@/lib/auth'
import Toast from '@/components/Toast'

interface Member {
  id: string
  name: string
  email: string
  role: 'owner' | 'member'
  created_at: string
}

interface Org {
  id: string
  name: string
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [org, setOrg] = useState<Org | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  useEffect(() => {
    // Get session info from cookie by calling a simple endpoint
    fetch('/api/team').then(r => r.json()).then(data => {
      setMembers(data.members || [])
      setOrg(data.org)
      setLoading(false)
    })

    // Determine current user from members list after load
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.userId) {
        setCurrentUserId(data.userId)
        setIsOwner(data.role === 'owner')
      }
    }).catch(() => {})
  }, [])

  async function generateInvite() {
    setInviteLoading(true)
    const res = await fetch('/api/auth/invite', { method: 'POST' })
    const data = await res.json()
    setInviteLoading(false)
    if (res.ok) {
      setInviteUrl(data.inviteUrl)
    } else {
      showToast(data.error || 'Failed to generate invite', 'error')
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRemove(id: string) {
    const res = await fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== id))
      showToast('Member removed')
    } else {
      const data = await res.json()
      showToast(data.error || 'Failed to remove', 'error')
    }
    setDeleteId(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <span className="spinner" style={{ width: 20, height: 20 }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ marginBottom: 6 }}>{org?.name || 'Your organisation'}</h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 13 }}>
          Manage team members and invite new users to your directory.
        </p>
      </div>

      {/* Invite section */}
      {isOwner && (
        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <h3 style={{ marginBottom: 16 }}>Invite team member</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
            Generate a one-time invite link (valid 48 hours). Share it with your team member so they can create their account.
          </p>

          {!inviteUrl ? (
            <button className="btn btn-primary" onClick={generateInvite} disabled={inviteLoading}>
              {inviteLoading ? <span className="spinner" /> : 'Generate invite link'}
            </button>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  className="input"
                  value={inviteUrl}
                  readOnly
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}
                />
                <button className="btn btn-primary" onClick={copyInvite} style={{ whiteSpace: 'nowrap' }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={generateInvite}>
                  New link
                </button>
                <span style={{ fontSize: 12, color: 'var(--muted)', paddingTop: 6 }}>
                  Link expires in 48 hours · single use
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div>
        <h3 style={{ marginBottom: 16 }}>Team members ({members.length})</h3>

        <div className="card">
          {members.map((member, i) => (
            <div key={member.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: member.role === 'owner' ? 'rgba(212,168,67,0.15)' : 'var(--surface-2)',
                border: `1px solid ${member.role === 'owner' ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 500, color: member.role === 'owner' ? 'var(--accent)' : 'var(--ink-2)',
                flexShrink: 0, marginRight: 14,
              }}>
                {member.name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {member.name}
                  {member.role === 'owner' && (
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      owner
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {member.email}
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--muted)', marginRight: 16, flexShrink: 0 }}>
                Joined {new Date(member.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </div>

              {isOwner && member.role !== 'owner' && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'transparent', padding: '4px 8px', flexShrink: 0 }}
                  onClick={() => setDeleteId(member.id)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 380 }}>
            <div style={{ padding: 28 }}>
              <h2 style={{ marginBottom: 10 }}>Remove member?</h2>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 24 }}>
                They will lose access to the directory. Their contributed contacts will remain.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleRemove(deleteId)}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
