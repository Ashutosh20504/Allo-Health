import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ReservationClient from '@/components/ReservationClient'
import type { Metadata } from 'next'

interface Props {
  params: { id: string }
}

async function getReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  })

  if (!reservation) return null

  return {
    id: reservation.id,
    productId: reservation.productId,
    warehouseId: reservation.warehouseId,
    quantity: reservation.quantity,
    status: reservation.status as 'PENDING' | 'CONFIRMED' | 'RELEASED',
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    product: {
      id: reservation.product.id,
      name: reservation.product.name,
      sku: reservation.product.sku,
      description: reservation.product.description,
      price: reservation.product.price.toString(),
      imageUrl: reservation.product.imageUrl,
    },
    warehouse: {
      id: reservation.warehouse.id,
      name: reservation.warehouse.name,
      location: reservation.warehouse.location,
    },
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const reservation = await getReservation(params.id)

  if (!reservation) {
    return { title: 'Reservation Not Found — Allo Inventory' }
  }

  return {
    title: `Reserve ${reservation.product.name} — Allo Inventory`,
    description: `Reservation for ${reservation.quantity}× ${reservation.product.name} from ${reservation.warehouse.name}. Status: ${reservation.status}.`,
  }
}

export default async function ReservationPage({ params }: Props) {
  const reservation = await getReservation(params.id)

  if (!reservation) {
    notFound()
  }

  return <ReservationClient initialData={reservation} />
}
