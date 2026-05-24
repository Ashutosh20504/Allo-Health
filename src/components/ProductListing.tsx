'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Package,
  MapPin,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Clock,
  Minus,
  Plus,
  X,
  Zap,
  Shield,
  Truck,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { ProductWithInventory } from '@/schemas/reservation'

interface ReserveModalState {
  open: boolean
  product: ProductWithInventory | null
  inventory: ProductWithInventory['inventories'][0] | null
  quantity: number
}

interface ProductListingProps {
  products: ProductWithInventory[]
}

function StockBadge({ available }: { available: number }) {
  if (available === 0) {
    return (
      <span className="badge-out text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
        <X className="w-3 h-3" /> Out of Stock
      </span>
    )
  }
  if (available <= 2) {
    return (
      <span className="badge-critical text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
        <AlertCircle className="w-3 h-3" /> {available} left!
      </span>
    )
  }
  if (available <= 5) {
    return (
      <span className="badge-low text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
        <Clock className="w-3 h-3" /> Low Stock: {available}
      </span>
    )
  }
  return (
    <span className="badge-available text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" /> {available} available
    </span>
  )
}

export default function ProductListing({ products }: ProductListingProps) {
  const router = useRouter()
  const [modal, setModal] = useState<ReserveModalState>({
    open: false,
    product: null,
    inventory: null,
    quantity: 1,
  })
  const [loading, setLoading] = useState(false)

  const openModal = (
    product: ProductWithInventory,
    inventory: ProductWithInventory['inventories'][0]
  ) => {
    setModal({ open: true, product, inventory, quantity: 1 })
  }

  const closeModal = () => {
    setModal({ open: false, product: null, inventory: null, quantity: 1 })
  }

  const handleReserve = async () => {
    if (!modal.product || !modal.inventory) return
    setLoading(true)

    try {
      const idempotencyKey = `${modal.product.id}-${modal.inventory.warehouseId}-${Date.now()}`

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          productId: modal.product.id,
          warehouseId: modal.inventory.warehouseId,
          quantity: modal.quantity,
        }),
      })

      const data = await res.json()

      if (res.status === 409) {
        toast.error(
          `Not enough stock in ${modal.inventory.warehouse.name}`,
          {
            description: `Only ${data.available ?? 0} unit(s) available`,
            duration: 5000,
          }
        )
        return
      }

      if (!res.ok) {
        toast.error('Failed to create reservation', {
          description: data.error ?? 'Please try again',
        })
        return
      }

      toast.success('Reservation created!', {
        description: `${modal.quantity}× ${modal.product.name} reserved for 10 minutes`,
      })

      closeModal()
      router.push(`/reservations/${data.id}`)
    } catch {
      toast.error('Network error', { description: 'Please check your connection and try again' })
    } finally {
      setLoading(false)
    }
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL') // 'ALL' | 'Mumbai Hub' | 'Delhi Hub'
  const [sortBy, setSortBy] = useState('DEFAULT') // 'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_DESC'

  // Filter products
  const filteredProducts = products
    .filter((product) => {
      // 1. Search term match (name, sku, or description)
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())

      // 2. Warehouse match
      const matchesWarehouse =
        selectedWarehouse === 'ALL' ||
        product.inventories.some((inv) => inv.warehouse.name === selectedWarehouse)

      return matchesSearch && matchesWarehouse
    })
    .map((product) => {
      // If a specific warehouse is selected, filter inventories shown to only that warehouse
      if (selectedWarehouse === 'ALL') return product
      return {
        ...product,
        inventories: product.inventories.filter(
          (inv) => inv.warehouse.name === selectedWarehouse
        ),
      }
    })
    .sort((a, b) => {
      // 3. Sorting
      if (sortBy === 'PRICE_ASC') return parseFloat(a.price) - parseFloat(b.price)
      if (sortBy === 'PRICE_DESC') return parseFloat(b.price) - parseFloat(a.price)
      if (sortBy === 'STOCK_DESC') {
        const aStock = a.inventories.reduce((acc, inv) => acc + inv.availableUnits, 0)
        const bStock = b.inventories.reduce((acc, inv) => acc + inv.availableUnits, 0)
        return bStock - aStock
      }
      return 0 // default
    })

  const maxQty = Math.min(10, modal.inventory?.availableUnits ?? 1)

  return (
    <>
      {/* Search and Filters panel */}
      <div className="bg-white rounded-3xl border border-purple-50 p-6 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between shadow-card animate-fade-in">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
          <input
            type="text"
            placeholder="Search products, SKUs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-warm-card border border-purple-100 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-luxe-purple/20 focus:border-luxe-purple transition-all"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
          {/* Warehouse Selector tabs */}
          <div className="flex bg-warm-card p-1 rounded-2xl border border-purple-50 overflow-x-auto shrink-0">
            {[
              { id: 'ALL', label: 'All Hubs' },
              { id: 'Mumbai Hub', label: 'Mumbai' },
              { id: 'Delhi Hub', label: 'Delhi' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedWarehouse(tab.id)}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap ${
                  selectedWarehouse === tab.id
                    ? 'bg-luxe-purple text-white shadow-purple'
                    : 'text-muted-text hover:text-dark-1'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-44 bg-warm-card border border-purple-50 rounded-2xl px-4 py-3 text-xs font-semibold text-dark-1 focus:outline-none focus:ring-2 focus:ring-luxe-purple/20 focus:border-luxe-purple transition-all appearance-none cursor-pointer"
            >
              <option value="DEFAULT">Sort: Featured</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="STOCK_DESC">Stock: Most Stock</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <SlidersHorizontal className="w-3 h-3 text-luxe-purple" />
            </div>
          </div>
        </div>
      </div>

      {/* Showing results count */}
      <div className="flex justify-between items-center text-xs text-muted-text mb-4 px-1">
        <span>
          Showing <strong>{filteredProducts.length}</strong> of {products.length} products
        </span>
        {selectedWarehouse !== 'ALL' && (
          <span className="flex items-center gap-1 bg-luxe-purple/10 text-luxe-purple px-2 py-0.5 rounded font-medium">
            Filtering by: {selectedWarehouse}
          </span>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-purple-50 text-center py-16 text-muted-text shadow-card">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-luxe-purple" />
          <p className="font-semibold text-lg">No products found</p>
          <p className="text-sm mt-1">Try resetting your filters or changing your search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, index) => (
          <div
            key={product.id}
            className="bg-white rounded-3xl shadow-card hover-lift overflow-hidden border border-purple-50 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Product Image */}
            <div className="relative h-52 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 gradient-bg rounded-2xl opacity-10 rotate-12" />
                <Package className="w-20 h-20 text-luxe-purple opacity-20 absolute" />
              </div>
              {/* SKU badge */}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-mono font-semibold text-luxe-purple px-2.5 py-1 rounded-lg border border-purple-100">
                {product.sku}
              </div>
            </div>

            {/* Product Details */}
            <div className="p-5">
              <h3 className="font-heading font-bold text-lg text-dark-1 mb-1 line-clamp-1">
                {product.name}
              </h3>
              <p className="text-muted-text text-sm mb-4 line-clamp-2 leading-relaxed">
                {product.description}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="font-heading font-bold text-2xl text-dark-1">
                  ₹{parseFloat(product.price).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Warehouse Inventory */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-text uppercase tracking-wide mb-2">
                  <Truck className="w-3.5 h-3.5" />
                  Available at Warehouses
                </div>

                {product.inventories.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-warm-card border border-purple-50 gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-6 h-6 bg-luxe-purple/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-luxe-purple" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-dark-1 truncate">
                          {inv.warehouse.name}
                        </div>
                        <div className="text-xs text-muted-text truncate">
                          {inv.warehouse.location}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StockBadge available={inv.availableUnits} />
                      <button
                        onClick={() => openModal(product, inv)}
                        disabled={inv.availableUnits === 0}
                        className="bg-luxe-purple text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-luxe-purple-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        Reserve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Reserve Modal */}
      {modal.open && modal.product && modal.inventory && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slide-up">
            {/* Header */}
            <div className="gradient-bg p-6 rounded-t-3xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-purple-200 text-xs font-semibold uppercase tracking-wider mb-1">
                    Reserve Item
                  </p>
                  <h2 className="text-white font-heading font-bold text-xl leading-tight">
                    {modal.product.name}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-purple-200" />
                    <span className="text-purple-100 text-sm">
                      {modal.inventory.warehouse.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Info row */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm text-muted-text">Price per unit</div>
                  <div className="font-heading font-bold text-2xl text-dark-1">
                    ₹{parseFloat(modal.product.price).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-text">Available</div>
                  <StockBadge available={modal.inventory.availableUnits} />
                </div>
              </div>

              {/* Quantity selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-dark-1 mb-3">
                  Select Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setModal((m) => ({ ...m, quantity: Math.max(1, m.quantity - 1) }))}
                    disabled={modal.quantity <= 1}
                    className="w-10 h-10 bg-purple-50 hover:bg-purple-100 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4 text-luxe-purple" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="font-heading font-bold text-3xl text-dark-1">
                      {modal.quantity}
                    </span>
                  </div>
                  <button
                    onClick={() => setModal((m) => ({ ...m, quantity: Math.min(maxQty, m.quantity + 1) }))}
                    disabled={modal.quantity >= maxQty}
                    className="w-10 h-10 bg-purple-50 hover:bg-purple-100 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 text-luxe-purple" />
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="bg-warm-card rounded-2xl p-4 mb-6 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-text">Total</span>
                <span className="font-heading font-bold text-xl text-dark-1">
                  ₹{(parseFloat(modal.product.price) * modal.quantity).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Timer notice */}
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5 mb-5">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Reservation holds stock for <strong>10 minutes</strong> — complete checkout before it expires.</span>
              </div>

              {/* Features */}
              <div className="flex items-center gap-4 text-xs text-muted-text mb-6">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-luxe-purple" />
                  Secure Reserve
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-hope-yellow" />
                  Instant Confirmation
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-green-500" />
                  Same-day Dispatch
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReserve}
                  disabled={loading || modal.inventory.availableUnits === 0}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Reserving...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Confirm Reserve
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
