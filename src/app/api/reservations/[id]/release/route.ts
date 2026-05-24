import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      include: { product: true, warehouse: true },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Idempotent — if already released, just return success
    if (reservation.status === 'RELEASED') {
      return NextResponse.json({
        id: reservation.id,
        status: 'RELEASED',
        message: 'Reservation was already released',
      })
    }

    // Release in a transaction: set status + decrement reservedUnits atomically
    const updated = await prisma.$transaction(async (tx) => {
      // Only decrement if status was PENDING (CONFIRMED stays confirmed — stock was "sold")
      if (reservation.status === 'PENDING') {
        await tx.$executeRaw`
          UPDATE "Inventory"
          SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0)
          WHERE "productId" = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `
      }

      return tx.reservation.update({
        where: { id: params.id },
        data: { status: 'RELEASED' },
        include: { product: true, warehouse: true },
      })
    })

    return NextResponse.json({
      id: updated.id,
      productId: updated.productId,
      warehouseId: updated.warehouseId,
      quantity: updated.quantity,
      status: updated.status,
      expiresAt: updated.expiresAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      product: {
        id: updated.product.id,
        name: updated.product.name,
        sku: updated.product.sku,
        price: updated.product.price.toString(),
      },
      warehouse: {
        id: updated.warehouse.id,
        name: updated.warehouse.name,
        location: updated.warehouse.location,
      },
    })
  } catch (error) {
    console.error('[POST /api/reservations/:id/release]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
