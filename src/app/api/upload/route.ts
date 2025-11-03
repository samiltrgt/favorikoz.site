import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { file, folder } = body

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Create Supabase admin client
    const supabase = createSupabaseAdmin()

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.split(';')[0].split('/')[1] || 'jpg'
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    const filePath = `${folder || 'products'}/${fileName}`

    // Convert base64 to buffer
    const base64Data = file.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Check if bucket exists first
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      console.error('❌ Bucket list error:', bucketError)
    } else {
      const imagesBucket = buckets?.find(b => b.id === 'images')
      if (!imagesBucket) {
        console.error('❌ "images" bucket bulunamadı! Lütfen Supabase Storage\'da "images" bucket\'ını oluşturun.')
        return NextResponse.json(
          { success: false, error: 'Storage bucket bulunamadı. Lütfen Supabase Storage\'da "images" bucket\'ını oluşturun.' },
          { status: 500 }
        )
      }
      console.log('✅ Bucket bulundu:', imagesBucket)
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, buffer, {
        contentType: `image/${fileExtension}`,
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Supabase upload error:', {
        message: uploadError.message,
        error: uploadError
      })
      
      // Daha detaylı hata mesajı
      let errorMessage = uploadError.message || 'Upload başarısız'
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
      console.error('❌ Upload data yok!')
      return NextResponse.json(
        { success: false, error: 'Upload verisi alınamadı' },
        { status: 500 }
      )
    }

    console.log('✅ Upload başarılı:', uploadData.path)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(uploadData.path)

    console.log('✅ Supabase Storage\'a yüklendi:', {
      path: uploadData.path,
      filePath,
      url: urlData.publicUrl,
      folder: folder || 'products',
      fullUrl: urlData.publicUrl
    })

    // Verify the file exists
    const { data: fileList, error: listError } = await supabase.storage
      .from('images')
      .list(folder || 'products', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (listError) {
      console.warn('⚠️ File list error (non-critical):', listError)
    } else {
      const uploadedFile = fileList?.find(f => f.name === uploadData.path.split('/').pop())
      console.log('✅ Yüklenen dosya doğrulandı:', uploadedFile ? 'Bulundu ✓' : 'Bulunamadı ✗')
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      publicId: uploadData.path,
      path: uploadData.path,
      message: 'Görsel başarıyla Supabase Storage\'a yüklendi'
    })
  } catch (error: any) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}

