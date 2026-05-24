'use client'

import Link from 'next/link'
import { Package2, Warehouse, ShoppingBag } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center shadow-purple group-hover:scale-105 transition-transform">
              <Package2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-heading font-bold text-xl text-dark-1">Allo</span>
              <span className="font-heading font-bold text-xl gradient-text"> Inventory</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-medium text-dark-1 hover:text-luxe-purple transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Products
            </Link>
            <Link
              href="/api/warehouses"
              target="_blank"
              className="flex items-center gap-1.5 text-sm font-medium text-dark-1 hover:text-luxe-purple transition-colors"
            >
              <Warehouse className="w-4 h-4" />
              Warehouses
            </Link>
            <Link
              href="/"
              className="btn-primary text-sm py-2 px-5"
            >
              Reserve Now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-purple-50 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-5 h-0.5 bg-dark-1 mb-1 transition-all" />
            <div className="w-5 h-0.5 bg-dark-1 mb-1 transition-all" />
            <div className="w-5 h-0.5 bg-dark-1 transition-all" />
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-purple-100 animate-fade-in">
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-dark-1 hover:bg-purple-50 hover:text-luxe-purple transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <ShoppingBag className="w-4 h-4" />
                Products
              </Link>
              <Link
                href="/"
                className="btn-primary text-sm text-center"
                onClick={() => setMenuOpen(false)}
              >
                Reserve Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
