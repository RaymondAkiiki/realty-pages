import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    return NextResponse.json({
      userId: session.userId,
      orgId: session.orgId,
      role: session.role,
      email: session.email,
      name: session.name,
    })
  })
}
