'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [orgName, setOrgName] = useState('')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/auth/invite?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setOrgName(data.orgName)
          setTokenValid(true)
        } else {
          setTokenValid(false)
          setError(data.error || 'Invalid invite')
        }
      })
      .catch(() => setTokenValid(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/invite', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...form }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Failed to join')
      return
    }

    router.push('/contacts')
    router.refresh()
  }

  if (tokenValid === null) {
    return (
      <div className="auth-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)' }}>
          <span className="spinner" /> Validating invite...
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Realty Pages
          </div>
          {tokenValid ? (
            <>
              <h1>Join {orgName}</h1>
              <p style={{ color: 'var(--ink-2)', marginTop: 6, fontSize: 13 }}>
                You've been invited to join this team's contact directory
              </p>
            </>
          ) : (
            <>
              <h1>Invalid invite</h1>
              <p style={{ color: 'var(--danger)', marginTop: 6, fontSize: 13 }}>
                {error || 'This invite link is invalid or has expired.'}
              </p>
            </>
          )}
        </div>

        {tokenValid && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Your name
              </label>
              <input type="text" className="input" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name" required autoFocus />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Email
              </label>
              <input type="email" className="input" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Password
              </label>
              <input type="password" className="input" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters" required minLength={8} />
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? <span className="spinner" /> : 'Join organisation'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--ink-2)', textAlign: 'center' }}>
          <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
