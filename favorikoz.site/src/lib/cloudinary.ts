import { v2 as cloudinary } from 'cloudinary'

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true
})

export default cloudinary

/**
 * Upload an image to Cloudinary
 * @param file - Base64 string or file path
 * @param folder - Cloudinary folder name (default: 'products')
 * @returns Upload result with secure_url
 */
export async function uploadImage(file: string, folder: string = 'products') {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: `favorikoz/${folder}`,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    })
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    }
  } catch (error: any) {
    console.error('Cloudinary upload error:', error)
    return {
      success: false,
      error: error.message || 'Upload failed'
    }
  }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteImage(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return {
      success: result.result === 'ok',
      result
    }
  } catch (error: any) {
    console.error('Cloudinary delete error:', error)
    return {
      success: false,
      error: error.message || 'Delete failed'
    }
  }
}

