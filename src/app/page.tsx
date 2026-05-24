import { prisma } from '@/lib/prisma'
import ProductListing from '@/components/ProductListing'
import Simulator from '@/components/Simulator'
import { ProductWithInventory } from '@/schemas/reservation'
import { Package, Zap, Shield, TrendingDown } from 'lucide-react'

async function getProducts(): Promise<ProductWithInventory[]> {
  const products = await prisma.product.findMany({
    include: {
      inventories: {
        include: {
          warehouse: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    price: product.price.toString(),
    imageUrl: product.imageUrl,
    inventories: product.inventories.map((inv) => ({
      id: inv.id,
      warehouseId: inv.warehouseId,
      totalUnits: inv.totalUnits,
      reservedUnits: inv.reservedUnits,
      availableUnits: inv.totalUnits - inv.reservedUnits,
      warehouse: {
        id: inv.warehouse.id,
        name: inv.warehouse.name,
        location: inv.warehouse.location,
      },
    })),
  }))
}

const features = [
  {
    icon: Zap,
    title: 'Instant Reserve',
    description: 'Lock stock across Mumbai & Delhi warehouses in milliseconds',
    color: 'bg-amber-50 text-hope-yellow',
  },
  {
    icon: Shield,
    title: 'Race-Condition Safe',
    description: 'PostgreSQL row-level locking ensures fair stock allocation',
    color: 'bg-purple-50 text-luxe-purple',
  },
  {
    icon: TrendingDown,
    title: 'Live Stock Levels',
    description: 'Real-time available units per warehouse, always accurate',
    color: 'bg-green-50 text-green-600',
  },
]

export default async function HomePage() {
  const products = await getProducts()

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-luxe-purple/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-hope-yellow/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 bg-luxe-purple/10 text-luxe-purple text-sm font-semibold px-4 py-2 rounded-full mb-6 animate-fade-in">
              <div className="w-2 h-2 bg-luxe-purple rounded-full animate-pulse" />
              Multi-Warehouse Inventory Platform
            </div>

            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-dark-1 leading-tight mb-6 animate-fade-in">
              Reserve Products,{' '}
              <span className="gradient-text">Instantly & Fairly</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-text leading-relaxed mb-10 animate-fade-in">
              Browse real-time stock across Mumbai and Delhi warehouses.
              Our PostgreSQL-backed reservation system ensures{' '}
              <strong className="text-dark-1">exactly one winner</strong>{' '}
              when multiple buyers race for the last unit.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-card border border-purple-50"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${f.color}`}>
                    <f.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-dark-1">{f.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-dark-1 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-center">
            {[
              { value: `${products.length}`, label: 'Products' },
              { value: '2', label: 'Warehouses' },
              { value: '10min', label: 'Reservation Window' },
              { value: '< 1ms', label: 'Lock Acquisition' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-heading font-bold text-xl text-white">{stat.value}</div>
                <div className="text-xs text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulation Sandbox Section */}
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <Simulator products={products} />
        </section>
      )}

      {/* Products Section */}
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 scroll-mt-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-luxe-purple mb-2">
              <Package className="w-4 h-4" />
              All Products
            </div>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-dark-1">
              Choose what you need
            </h2>
            <p className="text-muted-text mt-1">
              Click Reserve to hold stock for 10 minutes while you checkout
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-text bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Live stock levels
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20 text-muted-text">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-lg">No products available</p>
            <p className="text-sm mt-1">Run the seed script to populate the database</p>
            <code className="block mt-3 text-xs bg-gray-100 rounded-lg px-4 py-2 text-gray-600 font-mono">
              npm run db:seed
            </code>
          </div>
        ) : (
          <ProductListing products={products} />
        )}
      </section>
    </div>
  )
}
