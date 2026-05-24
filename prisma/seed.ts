import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data (order matters for FK constraints)
  await prisma.reservation.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.product.deleteMany()
  await prisma.warehouse.deleteMany()
  await prisma.idempotencyKey.deleteMany()

  // ── Warehouses ─────────────────────────────────────────────────
  const mumbai = await prisma.warehouse.create({
    data: {
      name: 'Mumbai Hub',
      location: 'Mumbai, Maharashtra',
    },
  })

  const delhi = await prisma.warehouse.create({
    data: {
      name: 'Delhi Hub',
      location: 'Delhi, NCR',
    },
  })

  console.log('✅ Warehouses created:', mumbai.name, delhi.name)

  // ── Products ────────────────────────────────────────────────────
  const headphones = await prisma.product.create({
    data: {
      name: 'Wireless Headphones Pro',
      sku: 'WH-PRO-2024',
      description:
        'Premium noise-cancelling wireless headphones with 40-hour battery life, spatial audio, and crystal-clear microphone. Perfect for work and play.',
      price: 4999,
      imageUrl: '/images/headphones.png',
    },
  })

  const keyboard = await prisma.product.create({
    data: {
      name: 'Mechanical Keyboard X1',
      sku: 'MK-X1-2024',
      description:
        'Compact TKL mechanical keyboard with RGB backlighting, hot-swappable switches, and aircraft-grade aluminium body. Designed for precision.',
      price: 8999,
      imageUrl: '/images/keyboard.png',
    },
  })

  const hub = await prisma.product.create({
    data: {
      name: 'USB-C Hub Pro 7-in-1',
      sku: 'UC-HUB-7N1',
      description:
        '7-in-1 USB-C hub with 4K HDMI, 100W PD charging, USB 3.0 ports, SD card reader, and Ethernet. Your ultimate workspace companion.',
      price: 2499,
      imageUrl: '/images/hub.png',
    },
  })

  console.log('✅ Products created:', headphones.name, keyboard.name, hub.name)

  // ── Inventory ───────────────────────────────────────────────────
  // Deliberately low stock on some combos to demo 409 behavior
  await prisma.inventory.createMany({
    data: [
      // Headphones: Mumbai (moderate), Delhi (very low — easy to trigger 409!)
      { productId: headphones.id, warehouseId: mumbai.id, totalUnits: 5, reservedUnits: 0 },
      { productId: headphones.id, warehouseId: delhi.id, totalUnits: 2, reservedUnits: 0 },

      // Keyboard: Mumbai (comfortable), Delhi (critically low — 1 unit!)
      { productId: keyboard.id, warehouseId: mumbai.id, totalUnits: 10, reservedUnits: 0 },
      { productId: keyboard.id, warehouseId: delhi.id, totalUnits: 1, reservedUnits: 0 },

      // USB-C Hub: Both warehouses well-stocked
      { productId: hub.id, warehouseId: mumbai.id, totalUnits: 8, reservedUnits: 0 },
      { productId: hub.id, warehouseId: delhi.id, totalUnits: 15, reservedUnits: 0 },
    ],
  })

  console.log('✅ Inventory rows created (6 total)')
  console.log('')
  console.log('📦 Stock summary:')
  console.log('  Wireless Headphones - Mumbai: 5 units | Delhi: 2 units (LOW)')
  console.log('  Mechanical Keyboard - Mumbai: 10 units | Delhi: 1 unit  (CRITICAL)')
  console.log('  USB-C Hub           - Mumbai: 8 units  | Delhi: 15 units')
  console.log('')
  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
