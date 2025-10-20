'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <h2 className="text-2xl font-light text-black mb-4">Bir şeyler ters gitti!</h2>
        <p className="text-gray-600 mb-6">Sayfa yüklenirken bir hata oluştu.</p>
        <button
          onClick={() => reset()}
          className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  )
}
