import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { checkIdempotency, storeIdempotency } from '@/lib/idempotency'
import { createReservationSchema } from '@/schemas/reservation'


const RESERVATION_EXPIRY_MINUTES = 10

export async function POST(request: NextRequest) {
  try {
    // ── 1. Idempotency check ────────────────────────────────────────
    const idempotencyKey = request.headers.get('Idempotency-Key')

    if (idempotencyKey) {
      const cached = await checkIdempotency(redis, idempotencyKey)
      if (cached) {
        return NextResponse.json(cached, { status: 200 })
      }
    }

    // ── 2. Parse & validate body ────────────────────────────────────
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = createReservationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { productId, warehouseId, quantity } = parsed.data

    // ── 3. Transaction with SELECT FOR UPDATE (concurrency safety) ──
    let reservation
    try {
      reservation = await prisma.$transaction(async (tx) => {
        // Lock the inventory row exclusively — serializes concurrent requests
        const inventoryRows = await tx.$queryRaw<
          Array<{
            id: string
            productId: string
            warehouseId: string
            totalUnits: number
            reservedUnits: number
          }>
        >`
          SELECT id, "productId", "warehouseId", "totalUnits", "reservedUnits"
          FROM "Inventory"
          WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `

        if (inventoryRows.length === 0) {
          throw new Error('INVENTORY_NOT_FOUND')
        }

        const inventory = inventoryRows[0]
        const availableUnits = inventory.totalUnits - inventory.reservedUnits

        if (availableUnits < quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${availableUnits}`)
        }

        // Atomically increment reservedUnits
        await tx.$executeRaw`
          UPDATE "Inventory"
          SET "reservedUnits" = "reservedUnits" + ${quantity}
          WHERE id = ${inventory.id}
        `

        // Create the reservation
        const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000)

        const newReservation = await tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            status: 'PENDING',
            expiresAt,
          },
          include: {
            product: true,
            warehouse: true,
          },
        })

        return newReservation
      })
    } catch (txError) {
      const msg = txError instanceof Error ? txError.message : ''

      if (msg === 'INVENTORY_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Product not found in this warehouse' },
          { status: 404 }
        )
      }

      if (msg.startsWith('INSUFFICIENT_STOCK')) {
        const available = msg.split(':')[1] ?? '0'
        return NextResponse.json(
          {
            error: 'Not enough stock available',
            available: parseInt(available, 10),
          },
          { status: 409 }
        )
      }

      throw txError
    }

    // ── 4. Build response ────────────────────────────────────────────
    const response = {
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

    // ── 5. Store idempotency result ──────────────────────────────────
    if (idempotencyKey) {
      await storeIdempotency(redis, idempotencyKey, response)
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[POST /api/reservations]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
