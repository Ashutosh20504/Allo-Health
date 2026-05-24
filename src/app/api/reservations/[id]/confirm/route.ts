import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { checkIdempotency, storeIdempotency } from '@/lib/idempotency'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ── 1. Idempotency check ────────────────────────────────────────
    const idempotencyKey = request.headers.get('Idempotency-Key')

    if (idempotencyKey) {
      const cached = await checkIdempotency(redis, idempotencyKey)
      if (cached) {
        return NextResponse.json(cached, { status: 200 })
      }
    }

    // ── 2. Fetch reservation ────────────────────────────────────────
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      include: { product: true, warehouse: true },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // ── 3. Check if expired or already released ─────────────────────
    const now = new Date()

    if (reservation.status === 'RELEASED') {
      return NextResponse.json(
        { error: 'Reservation has been released and can no longer be confirmed' },
        { status: 410 }
      )
    }

    if (reservation.status === 'CONFIRMED') {
      // Already confirmed — idempotent success
      const response = buildResponse(reservation)
      if (idempotencyKey) await storeIdempotency(redis, idempotencyKey, response)
      return NextResponse.json(response)
    }

    if (reservation.expiresAt < now) {
      return NextResponse.json(
        { error: 'Reservation has expired and can no longer be confirmed' },
        { status: 410 }
      )
    }

    // ── 4. Confirm the reservation ──────────────────────────────────
    const updated = await prisma.reservation.update({
      where: { id: params.id },
      data: { status: 'CONFIRMED' },
      include: { product: true, warehouse: true },
    })

    // ── 5. Store idempotency & return ───────────────────────────────
    const response = buildResponse(updated)
    if (idempotencyKey) await storeIdempotency(redis, idempotencyKey, response)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[POST /api/reservations/:id/confirm]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildResponse(reservation: {
  id: string
  productId: string
  warehouseId: string
  quantity: number
  status: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  product: { id: string; name: string; sku: string; price: { toString(): string } }
  warehouse: { id: string; name: string; location: string }
}) {
  return {
    id: reservation.id,
    productId: reservation.productId,
    warehouseId: reservation.warehouseId,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    product: {
      id: reservation.product.id,
      name: reservation.product.name,
      sku: reservation.product.sku,
      price: reservation.product.price.toString(),
    },
    warehouse: {
      id: reservation.warehouse.id,
      name: reservation.warehouse.name,
      location: reservation.warehouse.location,
    },
  }
}
