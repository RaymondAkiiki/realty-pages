export function normalizePhoneKey(phone: string | null | undefined): string {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 7) return ''
  return digits.length > 9 ? digits.slice(-9) : digits
}

export function splitAreas(area: string | null | undefined): string[] {
  const raw = String(area || '').trim()
  if (!raw) return []

  const hasStrongSeparator = /[,;\/|&+]|\band\b/i.test(raw)
  const parts = hasStrongSeparator
    ? raw.split(/[,;\/|&+]|\band\b/i)
    : raw.split(/\s+/)

  const seen = new Set<string>()
  return parts
    .map(part => part.trim())
    .filter(Boolean)
    .map(toDisplayArea)
    .filter(areaName => {
      const key = areaName.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function mergeAreaLists(...lists: Array<string[] | null | undefined>): string[] {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const list of lists) {
    for (const area of list || []) {
      const clean = toDisplayArea(area)
      const key = clean.toLowerCase()
      if (!clean || seen.has(key)) continue
      seen.add(key)
      merged.push(clean)
    }
  }

  return merged
}

export function toDisplayArea(area: string): string {
  return area
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word)
    .join(' ')
}

export function buildAreaDisplay(area: string | null | undefined, areas: string[]): string | null {
  const raw = String(area || '').trim()
  if (raw) return raw
  return areas.length > 0 ? areas.join(', ') : null
}
