'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  ShoppingBag,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Shield,
  CalendarCheck,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface ReservationData {
  id: string
  productId: string
  warehouseId: string
  quantity: number
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED'
  expiresAt: string
  createdAt: string
  updatedAt: string
  product: {
    id: string
    name: string
    sku: string
    description: string
    price: string
    imageUrl: string | null
  }
  warehouse: {
    id: string
    name: string
    location: string
  }
}

function useCountdown(expiresAt: string, status: string) {
  const getSecondsLeft = useCallback(() => {
    if (status !== 'PENDING') return 0
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, Math.floor(diff / 1000))
  }, [expiresAt, status])

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft)

  useEffect(() => {
    if (status !== 'PENDING') {
      setSecondsLeft(0)
      return
    }
    setSecondsLeft(getSecondsLeft())
    const interval = setInterval(() => {
      setSecondsLeft(getSecondsLeft())
    }, 1000)
    return () => clearInterval(interval)
  }, [getSecondsLeft, status])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const isExpired = secondsLeft === 0 && status === 'PENDING'
  const isDanger = secondsLeft <= 60 && secondsLeft > 0
  const isWarning = secondsLeft <= 180 && secondsLeft > 60

  return { secondsLeft, minutes, seconds, isExpired, isDanger, isWarning }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'PENDING') {
    return (
      <span className="status-pending text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Pending
      </span>
    )
  }
  if (status === 'CONFIRMED') {
    return (
      <span className="status-confirmed text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
      </span>
    )
  }
  return (
    <span className="status-released text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
      <XCircle className="w-3.5 h-3.5" /> Released
    </span>
  )
}

export default function ReservationClient({
  initialData,
}: {
  initialData: ReservationData
}) {
  const router = useRouter()
  const [reservation, setReservation] = useState<ReservationData>(initialData)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [expiredBanner, setExpiredBanner] = useState(false)

  const { secondsLeft, minutes, seconds, isExpired, isDanger, isWarning } = useCountdown(
    reservation.expiresAt,
    reservation.status
  )

  // Show expired banner when timer hits zero
  useEffect(() => {
    if (isExpired && reservation.status === 'PENDING') {
      setExpiredBanner(true)
    }
  }, [isExpired, reservation.status])

  const handleConfirm = async () => {
    if (isExpired) {
      setExpiredBanner(true)
      return
    }
    setConfirmLoading(true)

    try {
      const idempotencyKey = `confirm-${reservation.id}-${Date.now()}`

      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
      })

      const data = await res.json()

      if (res.status === 410) {
        setExpiredBanner(true)
        toast.error('Reservation expired', {
          description: data.error ?? 'The reservation window has passed',
        })
        return
      }

      if (!res.ok) {
        toast.error('Confirmation failed', { description: data.error })
        return
      }

      setReservation((prev) => ({ ...prev, status: 'CONFIRMED', updatedAt: data.updatedAt }))
      toast.success('Purchase confirmed! 🎉', {
        description: 'Your order is confirmed and will be dispatched soon',
      })
    } catch {
      toast.error('Network error', { description: 'Please try again' })
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleCancel = async () => {
    setCancelLoading(true)

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error('Cancellation failed', { description: data.error })
        return
      }

      setReservation((prev) => ({ ...prev, status: 'RELEASED', updatedAt: data.updatedAt }))
      toast.success('Reservation cancelled', {
        description: 'Stock has been released back to the warehouse',
      })
    } catch {
      toast.error('Network error', { description: 'Please try again' })
    } finally {
      setCancelLoading(false)
    }
  }

  const totalPrice = parseFloat(reservation.product.price) * reservation.quantity
  const isActive = reservation.status === 'PENDING' && !isExpired

  return (
    <div className="min-h-screen bg-warm-bg pt-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm font-medium text-muted-text hover:text-luxe-purple transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Products
        </button>

        {/* Expired Banner */}
        {(expiredBanner || (isExpired && reservation.status === 'PENDING')) && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-700">Reservation Expired</div>
              <div className="text-sm text-red-600 mt-0.5">
                The 10-minute reservation window has passed. Stock has been released back to the warehouse.
              </div>
              <button
                onClick={() => router.push('/')}
                className="text-sm font-semibold text-red-700 underline mt-2 hover:no-underline"
              >
                Browse products again →
              </button>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-card overflow-hidden border border-purple-50">
          {/* Header gradient */}
          <div className="gradient-bg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-purple-200 text-xs font-semibold uppercase tracking-wider mb-1">
                  Reservation #{reservation.id.slice(-8).toUpperCase()}
                </p>
                <h1 className="text-white font-heading font-bold text-2xl leading-tight">
                  {reservation.product.name}
                </h1>
              </div>
              <StatusBadge status={reservation.status} />
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Countdown Timer — only when PENDING */}
            {reservation.status === 'PENDING' && (
              <div
                className={`rounded-2xl p-4 border-2 transition-all duration-300 ${
                  isExpired
                    ? 'bg-red-50 border-red-200'
                    : isDanger
                    ? 'bg-red-50 border-red-200'
                    : isWarning
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-purple-50 border-purple-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock
                      className={`w-5 h-5 ${
                        isExpired || isDanger
                          ? 'text-red-500'
                          : isWarning
                          ? 'text-amber-500'
                          : 'text-luxe-purple'
                      }`}
                    />
                    <span
                      className={`text-sm font-semibold ${
                        isExpired || isDanger
                          ? 'text-red-700'
                          : isWarning
                          ? 'text-amber-700'
                          : 'text-luxe-purple'
                      }`}
                    >
                      {isExpired ? 'Reservation Expired' : 'Time Remaining'}
                    </span>
                  </div>

                  {!isExpired && (
                    <div
                      className={`font-heading font-bold text-2xl tabular-nums ${
                        isDanger
                          ? 'text-red-600 timer-danger'
                          : isWarning
                          ? 'text-amber-600 timer-warning'
                          : 'text-luxe-purple'
                      }`}
                    >
                      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                  )}
                </div>

                {!isExpired && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-1000 ${
                          isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-luxe-purple'
                        }`}
                        style={{ width: `${(secondsLeft / 600) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-text mt-1.5">
                      Expires {formatDistanceToNow(new Date(reservation.expiresAt), { addSuffix: true })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Reservation Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-warm-card rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-text uppercase tracking-wide mb-2">
                  <Package className="w-3.5 h-3.5" />
                  Product
                </div>
                <div className="font-semibold text-dark-1 text-sm">{reservation.product.name}</div>
                <div className="text-xs text-muted-text font-mono mt-0.5">{reservation.product.sku}</div>
              </div>

              <div className="bg-warm-card rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-text uppercase tracking-wide mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  Warehouse
                </div>
                <div className="font-semibold text-dark-1 text-sm">{reservation.warehouse.name}</div>
                <div className="text-xs text-muted-text mt-0.5">{reservation.warehouse.location}</div>
              </div>

              <div className="bg-warm-card rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-text uppercase tracking-wide mb-2">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Quantity
                </div>
                <div className="font-heading font-bold text-2xl text-dark-1">{reservation.quantity}</div>
                <div className="text-xs text-muted-text mt-0.5">unit{reservation.quantity !== 1 ? 's' : ''}</div>
              </div>

              <div className="bg-warm-card rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-text uppercase tracking-wide mb-2">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Reserved At
                </div>
                <div className="font-semibold text-dark-1 text-sm">
                  {format(new Date(reservation.createdAt), 'dd MMM yyyy')}
                </div>
                <div className="text-xs text-muted-text mt-0.5">
                  {format(new Date(reservation.createdAt), 'HH:mm:ss')}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100">
              <div className="text-sm font-semibold text-muted-text mb-3">Order Summary</div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-text">
                  {reservation.product.name} × {reservation.quantity}
                </span>
                <span className="text-sm font-semibold text-dark-1">
                  ₹{totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-purple-200">
                <span className="text-sm text-muted-text">Delivery</span>
                <span className="text-sm font-semibold text-green-600">FREE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-dark-1">Total</span>
                <span className="font-heading font-bold text-2xl gradient-text">
                  ₹{totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {reservation.status === 'PENDING' && (
              <div className="space-y-3">
                {/* Secure badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-text">
                  <Shield className="w-3.5 h-3.5 text-luxe-purple" />
                  Secured by Allo Inventory — 256-bit encrypted
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={confirmLoading || cancelLoading || isExpired}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
                  id="confirm-purchase-btn"
                >
                  {confirmLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Confirming Purchase...
                    </>
                  ) : isExpired ? (
                    <>
                      <XCircle className="w-5 h-5" />
                      Reservation Expired
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Confirm Purchase
                    </>
                  )}
                </button>

                <button
                  onClick={handleCancel}
                  disabled={cancelLoading || confirmLoading}
                  className="btn-danger w-full flex items-center justify-center gap-2 py-3"
                  id="cancel-reservation-btn"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Cancel Reservation
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Confirmed State */}
            {reservation.status === 'CONFIRMED' && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="font-heading font-bold text-xl text-dark-1 mb-2">
                  Purchase Confirmed! 🎉
                </h2>
                <p className="text-muted-text text-sm mb-6">
                  Your order has been confirmed and will be dispatched from{' '}
                  <strong>{reservation.warehouse.name}</strong> within 24 hours.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="btn-primary"
                >
                  Continue Shopping
                </button>
              </div>
            )}

            {/* Released State */}
            {reservation.status === 'RELEASED' && !expiredBanner && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="font-heading font-bold text-xl text-dark-1 mb-2">
                  Reservation Cancelled
                </h2>
                <p className="text-muted-text text-sm mb-6">
                  Stock has been released back to the {reservation.warehouse.name} warehouse.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="btn-primary"
                >
                  Browse Products
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
