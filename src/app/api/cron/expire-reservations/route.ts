import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // ── 1. Authenticate cron request ───────────────────────────────────────
  const authHeader = request.headers.get('Authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Find all expired PENDING reservations ───────────────────────────
  const now = new Date()

  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
  })

  if (expiredReservations.length === 0) {
    return NextResponse.json({
      message: 'No expired reservations found',
      expired: 0,
      timestamp: now.toISOString(),
    })
  }

  // ── 3. Release each expired reservation ────────────────────────────────
  let released = 0
  const errors: string[] = []

  for (const reservation of expiredReservations) {
    try {
      await prisma.$transaction(async (tx) => {
        // Decrement reservedUnits (use GREATEST to avoid going negative)
        await tx.$executeRaw`
          UPDATE "Inventory"
          SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0)
          WHERE "productId" = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `

        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'RELEASED' },
        })
      })

      released++
    } catch (error) {
      console.error(`[CRON] Failed to release reservation ${reservation.id}:`, error)
      errors.push(reservation.id)
    }
  }

  console.log(`[CRON] Expired ${released} reservation(s) at ${now.toISOString()}`)

  return NextResponse.json({
    message: `Released ${released} expired reservation(s)`,
    expired: released,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now.toISOString(),
  })
}
