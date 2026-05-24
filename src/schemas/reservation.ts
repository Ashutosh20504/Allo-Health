import { z } from 'zod'

// ── Create Reservation ──────────────────────────────────────────────────────

export const createReservationSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
})

export type CreateReservationInput = z.infer<typeof createReservationSchema>

// ── Reservation Status ──────────────────────────────────────────────────────

export const reservationStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'RELEASED'])

export type ReservationStatus = z.infer<typeof reservationStatusSchema>

// ── Reservation Response ────────────────────────────────────────────────────

export const reservationResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number(),
  status: reservationStatusSchema,
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  product: z
    .object({
      id: z.string(),
      name: z.string(),
      sku: z.string(),
      price: z.string(),
    })
    .optional(),
  warehouse: z
    .object({
      id: z.string(),
      name: z.string(),
      location: z.string(),
    })
    .optional(),
})

export type ReservationResponse = z.infer<typeof reservationResponseSchema>

// ── Product with Inventory Response ─────────────────────────────────────────

export const productWithInventorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  description: z.string(),
  price: z.string(),
  imageUrl: z.string().nullable(),
  inventories: z.array(
    z.object({
      id: z.string(),
      warehouseId: z.string(),
      totalUnits: z.number(),
      reservedUnits: z.number(),
      availableUnits: z.number(),
      warehouse: z.object({
        id: z.string(),
        name: z.string(),
        location: z.string(),
      }),
    })
  ),
})

export type ProductWithInventory = z.infer<typeof productWithInventorySchema>
