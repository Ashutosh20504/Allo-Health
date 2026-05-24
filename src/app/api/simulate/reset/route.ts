import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function POST() {
  try {
    // 1. Reset all reservedUnits to 0 in database
    await prisma.inventory.updateMany({
      data: { reservedUnits: 0 },
    })

    // 2. Delete all existing reservations
    await prisma.reservation.deleteMany()

    // 3. Clear idempotency keys from database
    await prisma.idempotencyKey.deleteMany()

    // 4. Also flush all keys in Redis if Redis client is configured
    // Since our custom redis client doesn't expose flushall directly, we can skip or ignore.
    
    return NextResponse.json({ message: 'Simulation database stock reset successfully!' })
  } catch (error) {
    console.error('[POST /api/simulate/reset]', error)
    return NextResponse.json(
      { error: 'Failed to reset simulation database' },
      { status: 500 }
    )
  }
}
