'use client'
import { useState, useEffect } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  // Close sidebar on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const navLinks = [
    {
      href: '/contacts',
      label: 'Contacts',
      active: pathname === '/contacts' || pathname.startsWith('/contacts/'),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="6" cy="5" r="2.5"/>
          <path d="M1 13c0-2.8 2.2-4 5-4s5 1.2 5 4"/>
          <path d="M11 7h4M13 5v4"/>
        </svg>
      ),
    },
    ...(session.role === 'owner' ? [{
      href: '/team',
      label: 'Team',
      active: pathname === '/team',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="5" cy="5" r="2"/>
          <circle cx="11" cy="5" r="2"/>
          <path d="M1 13c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5"/>
          <path d="M10 10c1 0 2.5 0.6 2.5 2.5"/>
        </svg>
      ),
    }] : []),
  ]

  return (
    <div className="app-shell">

      {/* ── Mobile overlay ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>

        {/* Logo row */}
        <div style={{
          padding: collapsed ? '20px 0 16px' : '20px 16px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 8,
        }}>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Realty Pages
              </div>
              <div className="sidebar-org" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.name}
              </div>
            </div>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {collapsed
                ? <path d="M4 2l4 4-4 4"/>
                : <path d="M8 2L4 6l4 4"/>
              }
            </svg>
          </button>

          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', color: 'var(--muted)',
              cursor: 'pointer', padding: 4, marginLeft: 'auto',
            }}
            className="mobile-close-btn"
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l10 10M14 4L4 14"/>
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-item ${link.active ? 'active' : ''}`}
              title={collapsed ? link.label : undefined}
            >
              {link.icon}
              <span className="sidebar-label">{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div style={{
          padding: collapsed ? '12px 0' : '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'column',
          alignItems: collapsed ? 'center' : 'stretch',
          gap: 8,
        }}>
          {!collapsed && (
            <>
              <div className="sidebar-user-detail">
                <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.email}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)',
                  color: session.role === 'owner' ? 'var(--accent)' : 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {session.role}
                </span>
                <button onClick={handleLogout} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: 'var(--muted)', padding: 0,
                  textDecoration: 'underline', textUnderlineOffset: 2,
                }}>
                  Sign out
                </button>
              </div>
            </>
          )}

          {collapsed && (
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', padding: 6, display: 'flex',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Main ── */}
      <div className="main-content">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
          >
            <span />
            <span />
            <span />
          </button>
          <div style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--accent)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Realty Pages
          </div>
          {/* Placeholder to balance hamburger */}
          <div style={{ width: 32 }} />
        </div>

        {children}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-close-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .collapse-btn { display: none !important; }
        }
      `}</style>
    </div>
  )
}