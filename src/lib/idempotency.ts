interface SimpleRedis {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<string>
}

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24 // 24 hours

/**
 * Get a cached idempotency response from Redis.
 * Returns the stored response object, or null if not found.
 */
export async function checkIdempotency(
  redis: SimpleRedis,
  key: string
): Promise<Record<string, unknown> | null> {
  try {
    const cached = await redis.get<Record<string, unknown>>(`idempotency:${key}`)
    return cached ?? null
  } catch (error) {
    console.error('[Idempotency] Redis read error:', error)
    return null
  }
}

/**
 * Store a response in Redis with 24h TTL.
 */
export async function storeIdempotency(
  redis: SimpleRedis,
  key: string,
  response: Record<string, unknown>
): Promise<void> {
  try {
    await redis.set(`idempotency:${key}`, response, { ex: IDEMPOTENCY_TTL_SECONDS })
  } catch (error) {
    console.error('[Idempotency] Redis write error:', error)
    // Non-fatal: don't throw — the request already succeeded
  }
}
