import { NextRequest, NextResponse } from 'next/server'
import { sql, query } from '@/lib/db'
import { withAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (session) => {
    const rows = await sql`
      SELECT c.*, u.name as created_by_name
      FROM contacts c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = ${params.id} AND c.org_id = ${session.orgId}
    `
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ contact: rows[0] })
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (session) => {
    try {
      const existing = await sql`
        SELECT id FROM contacts WHERE id = ${params.id} AND org_id = ${session.orgId}
      `
      if (existing.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const body = await request.json()
      const { name, phone, email, type, status, source, city, area, tags, notes, last_contacted_at } = body

      const sets: string[] = []
      const vals: any[]    = []
      let i = 1

      const maybe = (field: string, val: any, transform?: (v: any) => any) => {
        if (val !== undefined) {
          sets.push(`${field} = $${i++}`)
          vals.push(transform ? transform(val) : val)
        }
      }

      maybe('name',              name,              v => v?.trim() || null)
      maybe('phone',             phone,             v => v || null)
      maybe('email',             email,             v => v || null)
      maybe('type',              type)
      maybe('status',            status)
      maybe('source',            source,            v => v || null)
      maybe('city',              city,              v => v || null)
      maybe('area',              area,              v => v || null)
      maybe('tags',              tags,              v => v || [])
      maybe('notes',             notes,             v => v || null)
      maybe('last_contacted_at', last_contacted_at, v => v || null)

      if (sets.length === 0) {
        const rows = await sql`SELECT * FROM contacts WHERE id = ${params.id}`
        return NextResponse.json({ contact: rows[0] })
      }

      vals.push(params.id)
      vals.push(session.orgId)

      const rows = await query<any>(
        `UPDATE contacts SET ${sets.join(', ')}
         WHERE id = $${i++} AND org_id = $${i}
         RETURNING *`,
        vals
      )

      return NextResponse.json({ contact: rows[0] })
    } catch (err) {
      console.error('Update contact error:', err)
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (session) => {
    const existing = await sql`
      SELECT id FROM contacts WHERE id = ${params.id} AND org_id = ${session.orgId}
    `
    if (existing.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await sql`DELETE FROM contacts WHERE id = ${params.id} AND org_id = ${session.orgId}`
    return NextResponse.json({ success: true })
  })
}