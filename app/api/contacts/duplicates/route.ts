import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAuth } from '@/lib/auth'
import { mergeAreaLists, normalizePhoneKey, splitAreas } from '@/lib/contact-normalize'

const FIELD_PRIORITY = {
  status: ['active', 'lead', 'inactive'],
  type: ['broker', 'agent', 'landlord', 'developer', 'contractor', 'buyer', 'tenant', 'other'],
}

function bestText(values: Array<string | null | undefined>): string | null {
  const clean = values.map(v => String(v || '').trim()).filter(Boolean)
  if (clean.length === 0) return null
  return clean.sort((a, b) => b.length - a.length)[0]
}

function bestByPriority(values: Array<string | null | undefined>, priority: string[]): string {
  const clean = values.map(v => String(v || '').trim()).filter(Boolean)
  return priority.find(v => clean.includes(v)) || clean[0] || priority[priority.length - 1]
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const clean = String(value || '').trim()
    const key = clean.toLowerCase()
    if (!clean || seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

function mergeContacts(contacts: any[]) {
  const primary = [...contacts].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))[0]
  const names = uniqueStrings(contacts.map(c => c.name))
  const areas = mergeAreaLists(...contacts.map(c => [
    ...(Array.isArray(c.areas) ? c.areas : []),
    ...splitAreas(c.area),
  ]))
  const tags = uniqueStrings(contacts.flatMap(c => Array.isArray(c.tags) ? c.tags : []))
  const notes = uniqueStrings(contacts.map(c => c.notes))
  const alternateNames = names.filter(name => name.toLowerCase() !== String(primary.name).toLowerCase())
  const mergedNotes = [
    bestText(notes),
    alternateNames.length > 0 ? `Also listed as: ${alternateNames.join(', ')}` : '',
    `Merged ${contacts.length} duplicate contacts by matching phone number.`,
  ].filter(Boolean).join('\n\n')

  return {
    primary,
    duplicateIds: contacts.filter(c => c.id !== primary.id).map(c => c.id),
    values: {
      name: bestText(names) || primary.name,
      phone: bestText(contacts.map(c => c.phone)),
      email: bestText(contacts.map(c => c.email)),
      type: bestByPriority(contacts.map(c => c.type), FIELD_PRIORITY.type),
      status: bestByPriority(contacts.map(c => c.status), FIELD_PRIORITY.status),
      source: uniqueStrings(contacts.map(c => c.source)).join(', ') || null,
      city: bestText(contacts.map(c => c.city)),
      area: areas.length > 0 ? areas.join(', ') : bestText(contacts.map(c => c.area)),
      areas,
      tags,
      notes: mergedNotes || null,
      last_contacted_at: bestText(contacts.map(c => c.last_contacted_at)),
    },
  }
}

async function getDuplicateGroups(orgId: string) {
  const contacts = await query<any>(
    `SELECT *
     FROM contacts
     WHERE org_id = $1 AND phone IS NOT NULL AND phone != ''
     ORDER BY created_at ASC`,
    [orgId]
  )

  const groups = new Map<string, any[]>()
  for (const contact of contacts) {
    const key = normalizePhoneKey(contact.phone)
    if (!key) continue
    groups.set(key, [...(groups.get(key) || []), contact])
  }

  return Array.from(groups.entries())
    .filter(([, grouped]) => grouped.length > 1)
    .map(([phoneKey, grouped]) => {
      const preview = mergeContacts(grouped)
      return {
        phoneKey,
        count: grouped.length,
        contacts: grouped,
        preview: preview.values,
      }
    })
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    const groups = await getDuplicateGroups(session.orgId)
    return NextResponse.json({ groups })
  })
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { phoneKey } = await request.json()
      if (!phoneKey) {
        return NextResponse.json({ error: 'Phone group is required' }, { status: 400 })
      }

      const groups = await getDuplicateGroups(session.orgId)
      const group = groups.find(g => g.phoneKey === phoneKey)
      if (!group) {
        return NextResponse.json({ error: 'Duplicate group not found' }, { status: 404 })
      }

      const merged = mergeContacts(group.contacts)
      await query(
        `UPDATE contacts
         SET name = $1, phone = $2, email = $3, type = $4, status = $5,
             source = $6, city = $7, area = $8, areas = $9, tags = $10,
             notes = $11, last_contacted_at = $12
         WHERE id = $13 AND org_id = $14`,
        [
          merged.values.name,
          merged.values.phone,
          merged.values.email,
          merged.values.type,
          merged.values.status,
          merged.values.source,
          merged.values.city,
          merged.values.area,
          merged.values.areas,
          merged.values.tags,
          merged.values.notes,
          merged.values.last_contacted_at,
          merged.primary.id,
          session.orgId,
        ]
      )

      await query(
        `DELETE FROM contacts WHERE org_id = $1 AND id = ANY($2::uuid[])`,
        [session.orgId, merged.duplicateIds]
      )

      return NextResponse.json({
        merged: true,
        contactId: merged.primary.id,
        removed: merged.duplicateIds.length,
      })
    } catch (err) {
      console.error('Merge duplicates error:', err)
      return NextResponse.json({ error: 'Failed to merge duplicates' }, { status: 500 })
    }
  })
}
