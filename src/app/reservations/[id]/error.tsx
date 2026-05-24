'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

export default function ReservationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center pt-16">
      <div className="text-center px-4 max-w-md">
        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="font-heading font-bold text-2xl text-dark-1 mb-2">
          Reservation Error
        </h1>
        <p className="text-muted-text mb-8">
          {error.message ?? 'Failed to load reservation. It may have expired or been cancelled.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>
        </div>
      </div>
    </div>
  )
}
