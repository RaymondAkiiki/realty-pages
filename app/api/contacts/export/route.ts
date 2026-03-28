import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    const { searchParams } = request.nextUrl
    const type   = searchParams.get('type')   || ''
    const status = searchParams.get('status') || ''
    const area   = searchParams.get('area')   || ''
    const search = searchParams.get('search') || ''

    const conditions: string[] = ['org_id = $1']
    const params: any[] = [session.orgId]
    let idx = 2

    if (type) {
      conditions.push(`type = $${idx++}`)
      params.push(type)
    }
    if (status) {
      conditions.push(`status = $${idx++}`)
      params.push(status)
    }
    if (area) {
      conditions.push(`LOWER(area) LIKE LOWER($${idx++})`)
      params.push(`%${area}%`)
    }
    if (search) {
      conditions.push(`(LOWER(name) LIKE LOWER($${idx}) OR LOWER(COALESCE(email,'')) LIKE LOWER($${idx}))`)
      params.push(`%${search}%`)
      idx++
    }

    const contacts = await query<any>(
      `SELECT name, phone, email, type, status, area, city, source, tags, notes, last_contacted_at, created_at
       FROM contacts
       WHERE ${conditions.join(' AND ')}
       ORDER BY area ASC NULLS LAST, name ASC`,
      params
    )

    const headers = ['name','phone','email','type','status','area','city','source','tags','notes','last_contacted_at','created_at']

    const escape = (val: any): string => {
      if (val === null || val === undefined) return ''
      const str = Array.isArray(val) ? val.join('; ') : String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csv = [
      headers.join(','),
      ...contacts.map((c: any) => headers.map(h => escape(c[h])).join(','))
    ].join('\n')

    const filename = `realty-pages-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })
  })
}