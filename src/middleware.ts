import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function getAdminSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return { response, isAdmin: false }
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { response, isAdmin: false }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin'

  return { response, isAdmin }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/')) {
    // Prefetch/RSC requests are not page views and must not replace the document ID.
    const isDocument = !request.headers.has('rsc') && !request.headers.has('next-router-prefetch') && request.headers.get('purpose') !== 'prefetch'
    if (!isDocument || request.cookies.get('fk_consent')?.value !== 'granted') return NextResponse.next()
    const eventId = `evt_${crypto.randomUUID()}`
    const sourceUrl = `${request.nextUrl.origin}${pathname}`
    const headers = new Headers(request.headers)
    headers.set('x-event-id', eventId)
    headers.set('x-event-source-url', sourceUrl)
    const response = NextResponse.next({ request: { headers } })
    const options = { path: '/', sameSite: 'lax' as const, secure: request.nextUrl.protocol === 'https:' }
    response.cookies.set('fk_page_event_id', eventId, { ...options, maxAge: 120 })
    response.headers.set('x-event-id', eventId)
    response.headers.set('x-event-source-url', sourceUrl)
    const fbclid = request.nextUrl.searchParams.get('fbclid')
    if (fbclid && fbclid.length <= 500 && !/[\u0000-\u001f]/.test(fbclid)) {
      response.cookies.set('_fbc', `fb.1.${Date.now()}.${fbclid}`, { ...options, maxAge: 7776000 })
    }
    return response
  }

  if (pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  const { response, isAdmin } = await getAdminSession(request)

  if (pathname.startsWith('/admin/login')) {
    if (isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    return response
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)'],
}
