// scripts/migrate.js
// Run with: node scripts/migrate.js
require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

async function migrate() {
  console.log('Running migrations...')

  await sql`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  `

  await sql`
    CREATE TABLE IF NOT EXISTS organisations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      owner_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `

  await sql`
    ALTER TABLE organisations 
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
  `

  await sql`
    CREATE TABLE IF NOT EXISTS invite_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      email TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `

  await sql`
    DO $$ BEGIN
      CREATE TYPE contact_type AS ENUM (
        'broker', 'agent', 'landlord', 'tenant', 
        'contractor', 'developer', 'buyer', 'other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `

  await sql`
    DO $$ BEGIN
      CREATE TYPE contact_status AS ENUM ('lead', 'active', 'inactive');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `

  await sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      created_by UUID REFERENCES users(id),
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      type contact_type NOT NULL DEFAULT 'other',
      status contact_status NOT NULL DEFAULT 'active',
      source TEXT,
      city TEXT,
      area TEXT,
      tags TEXT[] DEFAULT '{}',
      notes TEXT,
      last_contacted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_contacts_org_area ON contacts(org_id, area);
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_contacts_org_type ON contacts(org_id, type);
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_contacts_org_name ON contacts(org_id, name);
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_contacts_org_status ON contacts(org_id, status);
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts 
    USING GIN(to_tsvector('english', name || ' ' || COALESCE(email,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(area,'') || ' ' || COALESCE(city,'')));
  `

  // Updated_at trigger
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
  `
  await sql`
    DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
  `
  await sql`
    CREATE TRIGGER contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  `

  console.log('✓ Migrations complete')
  process.exit(0)
}

migrate().catch(err => { console.error(err); process.exit(1) })
