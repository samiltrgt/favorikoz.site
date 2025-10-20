import { NextResponse } from 'next/server'

export async function GET() {
  // This route is checked by middleware already, but used for client-side guard
  return NextResponse.json({ ok: true })
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}


