export type ContactType = 'broker' | 'agent' | 'landlord' | 'tenant' | 'contractor' | 'developer' | 'buyer' | 'other'
export type ContactStatus = 'lead' | 'active' | 'inactive'

export interface Contact {
  id: string
  org_id: string
  created_by: string | null
  name: string
  phone: string | null
  email: string | null
  type: ContactType
  status: ContactStatus
  source: string | null
  city: string | null
  area: string | null
  tags: string[]
  notes: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  org_id: string
  name: string
  email: string
  role: 'owner' | 'member'
  created_at: string
}

export interface Organisation {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface ContactFilters {
  search?: string
  type?: ContactType | ''
  status?: ContactStatus | ''
  area?: string
  city?: string
  page?: number
  limit?: number
}

export const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'broker', label: 'Broker' },
  { value: 'agent', label: 'Agent' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'developer', label: 'Developer' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'other', label: 'Other' },
]

export const CONTACT_STATUSES: { value: ContactStatus; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export const TYPE_COLORS: Record<ContactType, string> = {
  broker: 'bg-violet-100 text-violet-800',
  agent: 'bg-blue-100 text-blue-800',
  landlord: 'bg-amber-100 text-amber-800',
  tenant: 'bg-green-100 text-green-800',
  contractor: 'bg-orange-100 text-orange-800',
  developer: 'bg-purple-100 text-purple-800',
  buyer: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-700',
}

export const STATUS_COLORS: Record<ContactStatus, string> = {
  lead: 'bg-yellow-100 text-yellow-800',
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-gray-100 text-gray-500',
}
