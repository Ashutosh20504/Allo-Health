export default function ReservationLoading() {
  return (
    <div className="min-h-screen bg-warm-bg pt-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back button skeleton */}
        <div className="h-5 w-32 bg-gray-200 rounded shimmer mb-8" />

        {/* Card skeleton */}
        <div className="bg-white rounded-3xl shadow-card overflow-hidden border border-purple-50">
          {/* Header skeleton */}
          <div className="h-32 bg-gradient-to-r from-purple-300 to-purple-400 shimmer" />

          <div className="p-6 space-y-6">
            {/* Timer skeleton */}
            <div className="h-20 bg-purple-50 rounded-2xl shimmer" />

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-2xl shimmer" />
              ))}
            </div>

            {/* Summary skeleton */}
            <div className="h-32 bg-purple-50 rounded-2xl shimmer" />

            {/* Buttons skeleton */}
            <div className="space-y-3">
              <div className="h-14 bg-gray-200 rounded-2xl shimmer" />
              <div className="h-12 bg-gray-100 rounded-2xl shimmer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
