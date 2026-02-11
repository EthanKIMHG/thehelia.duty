import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow login page and login API
  if (pathname === '/login' || pathname === '/api/auth/login') {
    return NextResponse.next()
  }

  // Protect API routes - check for auth header
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('x-auth-session')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*']
}
