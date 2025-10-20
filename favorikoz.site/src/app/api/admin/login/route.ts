import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any))
  const { username, password } = body || {}

  // Replace with real auth later
  if (username === 'admin' && password === 'admin123') {
    const res = NextResponse.json({ ok: true })
    // Set httpOnly cookie for 7 days
    res.cookies.set('adminAuthV2', '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  }
  return NextResponse.json({ ok: false, message: 'Geçersiz bilgiler' }, { status: 401 })
}


