import { NextRequest, NextResponse } from 'next/server'
import { sql, query } from '@/lib/db'
import { withAuth } from '@/lib/auth'

// GET /api/contacts
export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search') || ''
    const type   = searchParams.get('type')   || ''
    const status = searchParams.get('status') || ''
    const area   = searchParams.get('area')   || ''
    const city   = searchParams.get('city')   || ''
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit  = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const offset = (page - 1) * limit

    const conditions: string[] = ['c.org_id = $1']
    const params: any[] = [session.orgId]
    let idx = 2

    if (type) {
      conditions.push(`c.type = $${idx++}`)
      params.push(type)
    }
    if (status) {
      conditions.push(`c.status = $${idx++}`)
      params.push(status)
    }
    if (area) {
      conditions.push(`LOWER(c.area) LIKE LOWER($${idx++})`)
      params.push(`%${area}%`)
    }
    if (city) {
      conditions.push(`LOWER(c.city) LIKE LOWER($${idx++})`)
      params.push(`%${city}%`)
    }
    if (search) {
      const p = `%${search}%`
      conditions.push(`(
        LOWER(c.name) LIKE LOWER($${idx}) OR
        LOWER(COALESCE(c.email,'')) LIKE LOWER($${idx}) OR
        LOWER(COALESCE(c.phone,'')) LIKE LOWER($${idx}) OR
        LOWER(COALESCE(c.area,'')) LIKE LOWER($${idx}) OR
        LOWER(COALESCE(c.notes,'')) LIKE LOWER($${idx})
      )`)
      params.push(p)
      idx++
    }

    const where = conditions.join(' AND ')
    const countParams = [...params]

    params.push(limit)
    params.push(offset)

    const contacts = await query<any>(
      `SELECT c.*, u.name as created_by_name
       FROM contacts c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE ${where}
       ORDER BY c.area ASC NULLS LAST, c.name ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    )

    const countResult = await query<any>(
      `SELECT COUNT(*) as count FROM contacts c WHERE ${where}`,
      countParams
    )
    const total = parseInt(countResult[0]?.count || '0')

    const areas = await sql`
      SELECT DISTINCT area FROM contacts
      WHERE org_id = ${session.orgId} AND area IS NOT NULL AND area != ''
      ORDER BY area ASC
    `
    const cities = await sql`
      SELECT DISTINCT city FROM contacts
      WHERE org_id = ${session.orgId} AND city IS NOT NULL AND city != ''
      ORDER BY city ASC
    `

    return NextResponse.json({
      contacts,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      areas:  areas.map((r: any) => r.area),
      cities: cities.map((r: any) => r.city),
    })
  })
}

// POST /api/contacts
export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const body = await request.json()
      const { name, phone, email, type, status, source, city, area, tags, notes, last_contacted_at } = body

      if (!name?.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      }

      const rows = await sql`
        INSERT INTO contacts (
          org_id, created_by, name, phone, email, type, status,
          source, city, area, tags, notes, last_contacted_at
        ) VALUES (
          ${session.orgId}, ${session.userId},
          ${name.trim()},
          ${phone  || null},
          ${email  || null},
          ${type   || 'other'},
          ${status || 'active'},
          ${source || null},
          ${city   || null},
          ${area   || null},
          ${tags   || []},
          ${notes  || null},
          ${last_contacted_at || null}
        )
        RETURNING *
      `

      return NextResponse.json({ contact: rows[0] }, { status: 201 })
    } catch (err) {
      console.error('Create contact error:', err)
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
    }
  })
}