import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { signToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const [user] = await sql`
      SELECT u.*, o.name as org_name 
      FROM users u 
      JOIN organisations o ON o.id = u.org_id
      WHERE u.email = ${email.toLowerCase()}
    `

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = await signToken({
      userId: user.id,
      orgId: user.org_id,
      role: user.role,
      email: user.email,
      name: user.name,
    })

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.org_id, orgName: user.org_name }
    })
    setAuthCookie(response, token)
    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
