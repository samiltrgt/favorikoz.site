import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import { devError } from '@/lib/logger'

// BULGU-1 fix: sadece admin kullanıcılar yükleyebilir; sabit klasör + mime whitelist; SVG reddedilir.
const ALLOWED_FOLDERS = ['products', 'banners'] as const
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number]

const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    // 1) Yetkilendirme: createSupabaseAdmin() (service_role) çağrısından ÖNCE oturum + rol kontrolü
    const supabaseServer = await createSupabaseServer()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { file, folder: requestedFolder } = body

    if (!file || typeof file !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // 2) folder parametresini sabit whitelist'e kilitle
    if (requestedFolder !== undefined && !ALLOWED_FOLDERS.includes(requestedFolder)) {
      return NextResponse.json(
        { success: false, error: `Geçersiz klasör. İzin verilenler: ${ALLOWED_FOLDERS.join(', ')}` },
        { status: 400 }
      )
    }
    const folder: AllowedFolder = (requestedFolder as AllowedFolder) || 'products'

    // 3) Dosya tipi whitelist (SVG dahil her şey reddedilir) + boyut sınırı
    const dataUrlMatch = file.match(/^data:([^;]+);base64,(.+)$/)
    if (!dataUrlMatch) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz dosya formatı' },
        { status: 400 }
      )
    }

    const mimeType = dataUrlMatch[1].toLowerCase()
    const base64Data = dataUrlMatch[2]
    const fileExtension = ALLOWED_MIME_EXTENSIONS[mimeType]

    if (!fileExtension) {
      return NextResponse.json(
        { success: false, error: 'Desteklenmeyen dosya tipi. Sadece PNG, JPG, JPEG, WEBP, AVIF kabul edilir.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(base64Data, 'base64')

    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Boş dosya' },
        { status: 400 }
      )
    }

    if (buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Dosya boyutu 5MB sınırını aşıyor' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    const filePath = `${folder}/${fileName}`

    // Create Supabase admin client (yalnızca admin kontrolünden geçtikten sonra)
    const supabase = createSupabaseAdmin()

    // Check if bucket exists first
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()

    if (bucketError) {
      devError('Bucket list error:', bucketError)
    } else {
      const imagesBucket = buckets?.find(b => b.id === 'images')
      if (!imagesBucket) {
        devError('"images" bucket bulunamadı')
        return NextResponse.json(
          { success: false, error: 'Storage bucket bulunamadı. Lütfen Supabase Storage\'da "images" bucket\'ını oluşturun.' },
          { status: 500 }
        )
      }
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false
      })

    if (uploadError) {
      // Do not log filePath / storage object paths in production
      devError('Supabase upload error:', uploadError.message)

      let errorMessage = 'Upload başarısız'
      if (uploadError.message?.includes('new row violates row-level security')) {
        errorMessage = 'RLS politikası hatası. Lütfen Supabase Storage politikalarını kontrol edin.'
      } else if (uploadError.message?.includes('Bucket not found')) {
        errorMessage = '"images" bucket\'ı bulunamadı. Lütfen Supabase Storage\'da bucket\'ı oluşturun.'
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    if (!uploadData) {
      devError('Upload data missing')
      return NextResponse.json(
        { success: false, error: 'Upload verisi alınamadı' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(uploadData.path)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      publicId: uploadData.path,
      path: uploadData.path,
      message: 'Görsel başarıyla Supabase Storage\'a yüklendi'
    })
  } catch (error: any) {
    devError('Upload API error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    )
  }
}
