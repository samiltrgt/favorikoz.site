export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Üst bar */}
      <div className="h-9 bg-gray-200" />
      {/* Header */}
      <div className="container py-4 flex items-center gap-4">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="flex-1 max-w-md h-10 bg-gray-200 rounded-full" />
        <div className="flex gap-3">
          <div className="h-9 w-9 bg-gray-200 rounded-full" />
          <div className="h-9 w-9 bg-gray-200 rounded-full" />
          <div className="h-9 w-9 bg-gray-200 rounded-full" />
        </div>
      </div>
      <div className="border-b border-gray-200">
        <div className="container h-12 flex items-center gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-20 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
      {/* Hero alanı */}
      <div className="relative w-full aspect-[2/1] max-h-[420px] bg-gray-200">
        <div className="absolute inset-0 flex items-center justify-center gap-8 p-8">
          <div className="hidden lg:block space-y-4 max-w-md">
            <div className="h-10 w-3/4 bg-gray-300 rounded" />
            <div className="h-6 w-1/2 bg-gray-300 rounded" />
            <div className="h-4 w-full bg-gray-300 rounded" />
            <div className="flex gap-3 pt-4">
              <div className="h-12 w-32 bg-gray-300 rounded-full" />
              <div className="h-12 w-28 bg-gray-300 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="aspect-square bg-gray-300 rounded-xl" />
            <div className="aspect-square bg-gray-300 rounded-xl mt-4" />
          </div>
        </div>
      </div>
      {/* Özellikler şeridi */}
      <div className="py-8 bg-white border-t border-gray-100">
        <div className="container max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 bg-gray-200 rounded-full" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* İçerik blokları */}
      <div className="container py-12 space-y-8">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square bg-gray-200 rounded-xl" />
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
