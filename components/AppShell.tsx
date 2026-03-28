'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { JWTPayload } from '@/lib/auth'

interface Props {
  session: JWTPayload
  children: React.ReactNode
}

export default function AppShell({ session, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div className="sidebar">
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Realty Pages
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.orgId.slice(0, 8)}...
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          <Link
            href="/contacts"
            className={`nav-item ${pathname === '/contacts' || pathname.startsWith('/contacts/') ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="6" cy="5" r="2.5"/>
              <path d="M1 13c0-2.8 2.2-4 5-4s5 1.2 5 4"/>
              <path d="M11 7h4M13 5v4"/>
            </svg>
            Contacts
          </Link>

          {session.role === 'owner' && (
            <Link
              href="/team"
              className={`nav-item ${pathname === '/team' ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="5" cy="5" r="2"/>
                <circle cx="11" cy="5" r="2"/>
                <path d="M1 13c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5"/>
                <path d="M10 10c1 0 2.5 0.6 2.5 2.5"/>
              </svg>
              Team
            </Link>
          )}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.email}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)',
              color: session.role === 'owner' ? 'var(--accent)' : 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              {session.role}
            </span>
            <button onClick={handleLogout} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--muted)', padding: 0,
              textDecoration: 'underline', textUnderlineOffset: 2
            }}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
