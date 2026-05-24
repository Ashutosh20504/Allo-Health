export default function Loading() {
  return (
    <div className="pt-16 min-h-screen bg-warm-bg">
      {/* Hero skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="h-8 w-64 bg-gray-200 rounded-full mx-auto mb-6 shimmer" />
          <div className="h-16 w-full bg-gray-200 rounded-2xl mx-auto mb-4 shimmer" />
          <div className="h-8 w-3/4 bg-gray-200 rounded-xl mx-auto mb-10 shimmer" />
          <div className="flex justify-center gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-36 bg-gray-200 rounded-2xl shimmer" />
            ))}
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="bg-dark-1 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 w-20 bg-gray-700 rounded-xl shimmer" />
            ))}
          </div>
        </div>
      </div>

      {/* Product cards skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="h-8 w-48 bg-gray-200 rounded-xl mb-8 shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-card">
              <div className="h-52 bg-gray-100 shimmer" />
              <div className="p-5 space-y-3">
                <div className="h-6 w-3/4 bg-gray-200 rounded-lg shimmer" />
                <div className="h-4 w-full bg-gray-100 rounded shimmer" />
                <div className="h-4 w-2/3 bg-gray-100 rounded shimmer" />
                <div className="h-8 w-24 bg-gray-200 rounded-xl shimmer" />
                <div className="space-y-2 mt-4">
                  {[1, 2].map((j) => (
                    <div key={j} className="h-14 bg-gray-100 rounded-xl shimmer" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
