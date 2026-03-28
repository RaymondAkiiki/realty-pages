import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withAuth } from '@/lib/auth'

const VALID_TYPES = ['broker', 'agent', 'landlord', 'tenant', 'contractor', 'developer', 'buyer', 'other']
const VALID_STATUSES = ['lead', 'active', 'inactive']

function normalizeType(val: string): string {
  if (!val) return 'other'
  const v = val.toLowerCase().trim()
  return VALID_TYPES.includes(v) ? v : 'other'
}

function normalizeStatus(val: string): string {
  if (!val) return 'active'
  const v = val.toLowerCase().trim()
  return VALID_STATUSES.includes(v) ? v : 'active'
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { rows } = await request.json()

      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'No data provided' }, { status: 400 })
      }

      if (rows.length > 2000) {
        return NextResponse.json({ error: 'Maximum 2000 rows per import' }, { status: 400 })
      }

      let imported = 0
      let skipped = 0
      const errors: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const name = (row.name || row.Name || row.NAME || '').trim()

        if (!name) {
          skipped++
          continue
        }

        try {
          await sql`
            INSERT INTO contacts (
              org_id, created_by, name, phone, email, type, status,
              source, city, area, tags, notes
            ) VALUES (
              ${session.orgId},
              ${session.userId},
              ${name},
              ${row.phone || row.Phone || row.PHONE || null},
              ${row.email || row.Email || row.EMAIL || null},
              ${normalizeType(row.type || row.Type || row.TYPE || '')},
              ${normalizeStatus(row.status || row.Status || row.STATUS || '')},
              ${row.source || row.Source || null},
              ${row.city || row.City || row.CITY || null},
              ${row.area || row.Area || row.AREA || null},
              ${row.tags ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []},
              ${row.notes || row.Notes || null}
            )
            ON CONFLICT DO NOTHING
          `
          imported++
        } catch {
          skipped++
          if (errors.length < 5) errors.push(`Row ${i + 2}: ${name}`)
        }
      }

      return NextResponse.json({ imported, skipped, errors })
    } catch (err) {
      console.error('Bulk import error:', err)
      return NextResponse.json({ error: 'Import failed' }, { status: 500 })
    }
  })
}
