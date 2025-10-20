export default function Loading() {
  return (
    <div className="container py-10">
      <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="w-full aspect-square bg-gray-100" />
        <div className="space-y-4">
          <div className="h-4 bg-gray-100 w-24" />
          <div className="h-8 bg-gray-100 w-3/4" />
          <div className="h-6 bg-gray-100 w-40" />
          <div className="h-24 bg-gray-100 w-full" />
          <div className="h-10 bg-gray-100 w-48" />
        </div>
      </div>
    </div>
  )
}


