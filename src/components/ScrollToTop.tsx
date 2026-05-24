'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Ensures each route opens at the top (avoids browser scroll restoration skipping the hero). */
export default function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // Keep hero visible on fresh visits; allow intentional #products links
    if (!window.location.hash) {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return null
}
