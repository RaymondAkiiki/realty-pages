import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)

export interface JWTPayload {
  userId: string
  orgId: string
  role: 'owner' | 'member'
  email: string
  name: string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('rp_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('rp_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set('rp_token', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  })
}

export async function withAuth(
  request: NextRequest,
  handler: (payload: JWTPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  const token = request.cookies.get('rp_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }
  return handler(payload)
}

export async function signInviteToken(orgId: string, createdBy: string): Promise<string> {
  return new SignJWT({ orgId, createdBy, type: 'invite' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('48h')
    .sign(JWT_SECRET)
}

export async function verifyInviteToken(token: string): Promise<{ orgId: string; createdBy: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.type !== 'invite') return null
    return { orgId: payload.orgId as string, createdBy: payload.createdBy as string }
  } catch {
    return null
  }
}
