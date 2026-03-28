import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { withAuth, signInviteToken, verifyInviteToken, signToken, setAuthCookie } from '@/lib/auth'

// POST /api/auth/invite — create invite link (owner only)
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    if (session.role !== 'owner') {
      return NextResponse.json({ error: 'Only org owners can invite members' }, { status: 403 })
    }

    const token = await signInviteToken(session.orgId, session.userId)

    // Store in DB
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
    await sql`
      INSERT INTO invite_tokens (org_id, token, expires_at, created_by)
      VALUES (${session.orgId}, ${token}, ${expiresAt.toISOString()}, ${session.userId})
    `

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.json({ inviteUrl: `${appUrl}/invite/${token}` })
  })
}

// GET /api/auth/invite?token=xxx — validate invite token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const payload = await verifyInviteToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 })

  const [invite] = await sql`
    SELECT i.*, o.name as org_name 
    FROM invite_tokens i 
    JOIN organisations o ON o.id = i.org_id
    WHERE i.token = ${token} AND i.used = false AND i.expires_at > NOW()
  `

  if (!invite) return NextResponse.json({ error: 'Invite has expired or already been used' }, { status: 400 })

  return NextResponse.json({ valid: true, orgName: invite.org_name })
}

// PUT /api/auth/invite — accept invite, create account
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, name, email, password } = body

    if (!token || !name || !email || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const payload = await verifyInviteToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 })

    const invites = await sql`
      SELECT * FROM invite_tokens 
      WHERE token = ${token} AND used = false AND expires_at > NOW()
    `
    if (invites.length === 0) {
      return NextResponse.json({ error: 'Invite has expired or already been used' }, { status: 400 })
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const [user] = await sql`
      INSERT INTO users (org_id, name, email, password_hash, role)
      VALUES (${payload.orgId}, ${name}, ${email.toLowerCase()}, ${passwordHash}, 'member')
      RETURNING *
    `

    await sql`UPDATE invite_tokens SET used = true WHERE token = ${token}`

    const [org] = await sql`SELECT * FROM organisations WHERE id = ${payload.orgId}`

    const authToken = await signToken({
      userId: user.id,
      orgId: user.org_id,
      role: 'member',
      email: user.email,
      name: user.name,
    })

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: org.id, orgName: org.name }
    })
    setAuthCookie(response, authToken)
    return response
  } catch (err) {
    console.error('Invite accept error:', err)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
