import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/register', '/invite']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow API auth routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // For API routes, let the route handler deal with auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // For app routes, check session
  const token = request.cookies.get('rp_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await verifyToken(token)
  if (!session) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('rp_token')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
