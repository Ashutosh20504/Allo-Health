'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Play,
  RotateCcw,
  Terminal,
  Users,
  Warehouse as WarehouseIcon,
  HelpCircle,
  TrendingUp,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { ProductWithInventory } from '@/schemas/reservation'

interface LogEntry {
  id: string
  timestamp: string
  type: 'info' | 'success' | 'error' | 'warn' | 'system'
  message: string
}

interface SimulatorProps {
  products: ProductWithInventory[]
  onRefreshData?: () => void
}

export default function Simulator({ products, onRefreshData }: SimulatorProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')
  const [concurrentUsers, setConcurrentUsers] = useState<number>(5)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [summary, setSummary] = useState<{
    succeeded: number
    failed: number
    total: number
  } | null>(null)

  const consoleContainerRef = useRef<HTMLDivElement>(null)

  // Get active product and warehouse details
  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const selectedInventory = selectedProduct?.inventories.find(
    (inv) => inv.warehouseId === selectedWarehouseId
  )

  // Initialize selections
  useEffect(() => {
    if (products.length > 0) {
      const firstProduct = products[0]
      setSelectedProductId(firstProduct.id)
      if (firstProduct.inventories.length > 0) {
        setSelectedWarehouseId(firstProduct.inventories[0].warehouseId)
      }
    }
  }, [products])

  // Update warehouse selection when product changes
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId)
    const product = products.find((p) => p.id === productId)
    if (product && product.inventories.length > 0) {
      setSelectedWarehouseId(product.inventories[0].warehouseId)
    }
  };

  // Scroll only inside the console panel — never the whole page
  useEffect(() => {
    if (logs.length === 0) return
    const container = consoleContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [logs])

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date()
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now
      .getSeconds()
      .toString()
      .padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`

    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        timestamp,
        type,
        message,
      },
    ])
  }

  const clearLogs = () => {
    setLogs([])
    setSummary(null)
  }

  const handleResetStock = async () => {
    const confirmReset = window.confirm(
      'Are you sure you want to release all stock and delete all reservations?'
    )
    if (!confirmReset) return

    const toastId = toast.loading('Resetting inventory simulation stock...')
    try {
      const res = await fetch('/api/simulate/reset', { method: 'POST' })
      if (!res.ok) throw new Error('Reset failed')

      toast.success('Inventory stock reset successfully!', { id: toastId })
      clearLogs()
      addLog('🔧 System environment reset executed.', 'system')
      addLog('✅ All reserved units returned to 0.', 'success')
      addLog('✅ All existing reservations purged.', 'success')
      addLog('🔄 Database synced successfully.', 'success')

      if (onRefreshData) onRefreshData()
    } catch {
      toast.error('Failed to reset simulation database.', { id: toastId })
    }
  }

  const runSimulation = async () => {
    if (!selectedProduct || !selectedInventory) {
      toast.error('Please select a valid product and warehouse')
      return
    }

    setIsRunning(true)
    clearLogs()
    setSummary(null)

    const pName = selectedProduct.name
    const wName = selectedInventory.warehouse.name
    const initialAvailable = selectedInventory.availableUnits

    addLog(`🚀 Firing Race Simulation: ${concurrentUsers} parallel checkouts`, 'system')
    addLog(`📦 Product: ${pName} | SKU: ${selectedProduct.sku}`, 'info')
    addLog(`🏢 Warehouse: ${wName} (${selectedInventory.warehouse.location})`, 'info')
    addLog(`📊 Current Available Units: ${initialAvailable}`, 'warn')
    addLog(`👥 Simulating concurrent HTTP POST requests in parallel...`, 'info')

    // Prepare requests
    const requests = Array.from({ length: concurrentUsers }).map((_, index) => {
      const userId = index + 1
      const idempotencyKey = `sim-user-${userId}-${Date.now()}`
      
      return {
        userId,
        idempotencyKey,
        run: async () => {
          addLog(`[User ${userId}] 🌐 Request dispatched (IDEMPOTENCY_KEY: ...${idempotencyKey.slice(-6)})`, 'info')
          
          try {
            const res = await fetch('/api/reservations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
              },
              body: JSON.stringify({
                productId: selectedProductId,
                warehouseId: selectedWarehouseId,
                quantity: 1, // checkout 1 item
              }),
            })

            const data = await res.json()

            if (res.status === 201) {
              addLog(
                `[User ${userId}] 🟢 201 Created — Reservation SECURED (Res ID: ...${data.id.slice(-6)})`,
                'success'
              )
              return { success: true, userId }
            } else if (res.status === 409) {
              addLog(
                `[User ${userId}] 🔴 409 Conflict — Blocked! Stock depleted. Available units: ${data.available ?? 0}`,
                'error'
              )
              return { success: false, userId }
            } else {
              addLog(
                `[User ${userId}] 🟡 ${res.status} Error — Request failed: ${data.error ?? 'Unknown'}`,
                'warn'
              )
              return { success: false, userId }
            }
          } catch {
            addLog(`[User ${userId}] ❌ Network Failure — Connection interrupted`, 'error')
            return { success: false, userId }
          }
        },
      }
    })

    // Short artificial delay before firing for cleaner visualization
    await new Promise((resolve) => setTimeout(resolve, 800))
    addLog(`⚡ Parallel dispatch executing...`, 'system')

    // Execute concurrently using Promise.all
    try {
      const results = await Promise.all(requests.map((req) => req.run()))

      const succeededCount = results.filter((r) => r.success).length
      const failedCount = results.length - succeededCount

      setSummary({
        succeeded: succeededCount,
        failed: failedCount,
        total: results.length,
      })

      addLog(`--------------------------------------------`, 'info')
      addLog(`🏁 Simulation Complete!`, 'system')
      addLog(`🏆 Successful Reservations: ${succeededCount}`, 'success')
      addLog(`🛡️ Safely Handled Conflicts: ${failedCount}`, failedCount > 0 ? 'warn' : 'info')
      
      if (succeededCount > initialAvailable) {
        addLog(`🚨 ERROR: OVER-ALLOCATION DETECTED! Race condition failed.`, 'error')
      } else {
        addLog(`✅ SUCCESS: Zero over-allocation. Postgres transaction locked rows correctly!`, 'success')
      }

      if (onRefreshData) onRefreshData()
    } catch (e) {
      addLog(`❌ Simulation execution crashed unexpectedly.`, 'error')
      console.error(e)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-purple-50 shadow-card overflow-hidden my-8">
      {/* Header */}
      <div className="gradient-bg px-6 py-5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg leading-tight">
              Race Condition Simulator
            </h3>
            <p className="text-purple-100 text-xs">
              Test database row-level locking with parallel checkouts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetStock}
            className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-white/10"
            title="Reset stock and reservations in the database"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Stock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-purple-50">
        {/* Controls (2/5 size) */}
        <div className="lg:col-span-2 p-6 space-y-5 bg-warm-card/30">
          <h4 className="text-xs font-bold text-muted-text uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-luxe-purple" />
            Simulation Parameters
          </h4>

          {/* Product Select */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-dark-1">Target Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={isRunning}
              className="w-full bg-white border border-purple-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-luxe-purple/20 focus:border-luxe-purple transition-all disabled:opacity-50"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{parseFloat(p.price).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Select */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-dark-1">Warehouse Hub</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              disabled={isRunning}
              className="w-full bg-white border border-purple-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-luxe-purple/20 focus:border-luxe-purple transition-all disabled:opacity-50"
            >
              {selectedProduct?.inventories.map((inv) => (
                <option key={inv.id} value={inv.warehouseId}>
                  {inv.warehouse.name} ({inv.availableUnits} left)
                </option>
              ))}
            </select>
          </div>

          {/* Concurrent Users Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-dark-1">Concurrent Shoppers</label>
              <span className="bg-luxe-purple/10 text-luxe-purple text-xs font-bold px-2 py-0.5 rounded-md">
                {concurrentUsers} Users
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="2"
                max="10"
                value={concurrentUsers}
                onChange={(e) => setConcurrentUsers(parseInt(e.target.value))}
                disabled={isRunning}
                className="flex-1 accent-luxe-purple cursor-pointer disabled:opacity-50"
              />
              <span className="text-xs text-muted-text font-mono font-medium">10 Max</span>
            </div>
            <p className="text-[10px] text-muted-text">
              Simulates parallel connections sending requests at the exact same millisecond.
            </p>
          </div>

          {/* Target Stock Stats */}
          {selectedInventory && (
            <div className="bg-white rounded-2xl border border-purple-50 p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-text">Total Stock:</span>
                <span className="font-semibold text-dark-1">{selectedInventory.totalUnits} units</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-text">Reserved Stock:</span>
                <span className="font-semibold text-amber-600">{selectedInventory.reservedUnits} units</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-purple-50">
                <span className="font-semibold text-dark-1">Available to Buy:</span>
                <span
                  className={`font-bold ${
                    selectedInventory.availableUnits === 0
                      ? 'text-red-500'
                      : selectedInventory.availableUnits <= 2
                      ? 'text-amber-500'
                      : 'text-green-600'
                  }`}
                >
                  {selectedInventory.availableUnits} units
                </span>
              </div>
            </div>
          )}

          {/* Trigger Button */}
          <button
            onClick={runSimulation}
            disabled={isRunning || !selectedInventory || selectedInventory.availableUnits === 0}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:bg-purple-200 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Racing Users...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Fire Race Condition
              </>
            )}
          </button>

          {selectedInventory && selectedInventory.availableUnits === 0 && (
            <p className="text-[11px] text-red-500 text-center font-medium">
              ⚠️ Available stock is 0. Reset stock to simulate the race.
            </p>
          )}
        </div>

        {/* Terminal/Logs console (3/5 size) */}
        <div className="lg:col-span-3 p-6 flex flex-col h-[400px] lg:h-auto bg-dark-1 text-gray-200 select-none font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800 text-gray-400">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-gray-400" />
              CONSOLE LOGS
            </span>
            <button
              onClick={clearLogs}
              disabled={isRunning || logs.length === 0}
              className="hover:text-white transition-colors disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          {/* Logs Output */}
          <div
            ref={consoleContainerRef}
            className="flex-1 overflow-y-auto py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent"
          >
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-1.5 font-sans">
                <Terminal className="w-8 h-8 opacity-20" />
                <p className="text-xs">No simulation logs. Click &quot;Fire Race Condition&quot; above.</p>
              </div>
            ) : (
              logs.map((log) => {
                let colorClass = 'text-gray-400'
                if (log.type === 'success') colorClass = 'text-green-400'
                if (log.type === 'error') colorClass = 'text-red-400'
                if (log.type === 'warn') colorClass = 'text-amber-400'
                if (log.type === 'system') colorClass = 'text-purple-400 font-bold'

                return (
                  <div key={log.id} className="leading-relaxed flex items-start gap-1">
                    <span className="text-gray-600 flex-shrink-0">[{log.timestamp}]</span>
                    <span className={colorClass}>{log.message}</span>
                  </div>
                )
              })
            )}
          </div>

          {/* Summary Box */}
          {summary && (
            <div className="mt-4 p-3 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-around font-sans">
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Total Requests</div>
                <div className="text-lg font-bold text-white">{summary.total}</div>
              </div>
              <div className="w-px h-8 bg-gray-800" />
              <div className="text-center">
                <div className="text-[10px] text-green-400 uppercase font-semibold flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Secured (201)
                </div>
                <div className="text-lg font-bold text-green-400">{summary.succeeded}</div>
              </div>
              <div className="w-px h-8 bg-gray-800" />
              <div className="text-center">
                <div className="text-[10px] text-red-400 uppercase font-semibold flex items-center justify-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  Blocked (409)
                </div>
                <div className="text-lg font-bold text-red-400">{summary.failed}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulator Explainer */}
      <div className="bg-purple-50/50 px-6 py-4 border-t border-purple-50 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-luxe-purple flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="text-xs text-muted-text leading-relaxed">
          <strong className="text-dark-1">How it works under the hood:</strong> When you run the simulation, multiple requests are fired in parallel. The server initiates a Postgres transaction and executes a <code className="bg-purple-100/80 text-luxe-purple px-1.5 py-0.5 rounded font-mono font-semibold">SELECT ... FOR UPDATE</code> query on the inventory row. This forces Postgres to exclusively lock the row. The first request obtains the lock, increments the reservations, commits, and releases the lock. Subsequent requests are blocked in queue and fail safely with a <code className="bg-red-100 text-red-700 px-1 py-0.5 rounded font-mono font-semibold">409 Conflict</code> when they resume and see available stock is 0.
        </div>
      </div>
    </div>
  )
}
