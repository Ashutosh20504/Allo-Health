import Link from 'next/link'
import { Package, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center pt-16">
      <div className="text-center px-4">
        <div className="w-20 h-20 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-purple">
          <Package className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-heading font-bold text-3xl text-dark-1 mb-2">Page Not Found</h1>
        <p className="text-muted-text mb-8">
          The reservation or page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
      </div>
    </div>
  )
}
