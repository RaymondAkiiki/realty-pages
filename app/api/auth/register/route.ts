import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import { signToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgName, name, email, password } = body

    if (!orgName || !name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check email not taken
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Create org (owner_id set after user creation)
    const [org] = await sql`
      INSERT INTO organisations (name) VALUES (${orgName}) RETURNING *
    `

    // Create owner user
    const [user] = await sql`
      INSERT INTO users (org_id, name, email, password_hash, role)
      VALUES (${org.id}, ${name}, ${email.toLowerCase()}, ${passwordHash}, 'owner')
      RETURNING *
    `

    // Set owner_id on org
    await sql`UPDATE organisations SET owner_id = ${user.id} WHERE id = ${org.id}`

    const token = await signToken({
      userId: user.id,
      orgId: org.id,
      role: 'owner',
      email: user.email,
      name: user.name,
    })

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: org.id, orgName: org.name }
    })
    setAuthCookie(response, token)
    return response
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
