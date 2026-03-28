'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ orgName: '', name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Registration failed')
      return
    }

    router.push('/contacts')
    router.refresh()
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Realty Pages
          </div>
          <h1>Create organisation</h1>
          <p style={{ color: 'var(--ink-2)', marginTop: 6, fontSize: 13 }}>
            Set up your team's contact directory
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Organisation name
            </label>
            <input
              type="text"
              className="input"
              value={form.orgName}
              onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))}
              placeholder="e.g. Kampala Realty Group"
              required
              autoFocus
            />
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Your name
            </label>
            <input
              type="text"
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Email
            </label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Password
            </label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min. 8 characters"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {loading ? <span className="spinner" /> : 'Create organisation'}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--ink-2)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
