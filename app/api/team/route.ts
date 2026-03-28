import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    const members = await sql`
      SELECT id, name, email, role, created_at
      FROM users
      WHERE org_id = ${session.orgId}
      ORDER BY role DESC, created_at ASC
    `
    const [org] = await sql`SELECT * FROM organisations WHERE id = ${session.orgId}`
    return NextResponse.json({ members, org })
  })
}

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (session) => {
    if (session.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can remove members' }, { status: 403 })
    }

    const { userId } = await request.json()
    if (userId === session.userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
    }

    const [user] = await sql`
      SELECT id FROM users WHERE id = ${userId} AND org_id = ${session.orgId}
    `
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await sql`DELETE FROM users WHERE id = ${userId} AND org_id = ${session.orgId}`
    return NextResponse.json({ success: true })
  })
}
