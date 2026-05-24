let _redis: MockRedis | null = null

interface MockRedis {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<string>
}

function createRedisClient(): MockRedis {
  const redisUrl = process.env.REDIS_URL ?? ''
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL ?? ''
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? ''

  // Use Upstash HTTP REST API if credentials are available
  if (upstashUrl && upstashToken) {
    return createUpstashClient(upstashUrl, upstashToken)
  }

  // Parse REDIS_URL if it's a rediss:// Upstash URL
  // Format: rediss://default:<token>@<host>:<port>
  if (redisUrl.startsWith('rediss://')) {
    try {
      const url = new URL(redisUrl)
      const token = url.password
      const host = url.hostname
      const port = url.port || '6379'
      const restUrl = `https://${host}`
      return createUpstashClient(restUrl, token)
    } catch {
      console.warn('[Redis] Could not parse REDIS_URL as Upstash URL')
    }
  }

  // Graceful fallback — no Redis configured
  console.warn('[Redis] No Redis configured — idempotency will use in-memory map (dev only)')
  return createInMemoryClient()
}

function createUpstashClient(url: string, token: string): MockRedis {
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!res.ok) return null
        const data = await res.json() as { result: string | null }
        if (data.result === null) return null
        return JSON.parse(data.result) as T
      } catch {
        return null
      }
    },
    async set(key: string, value: unknown, opts?: { ex?: number }): Promise<string> {
      try {
        const body: unknown[] = ['SET', key, JSON.stringify(value)]
        if (opts?.ex) body.push('EX', opts.ex)
        const res = await fetch(`${url}/pipeline`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([body]),
          cache: 'no-store',
        })
        if (!res.ok) return 'ERR'
        return 'OK'
      } catch {
        return 'ERR'
      }
    },
  }
}

// In-memory fallback for development without Redis
const inMemoryStore = new Map<string, { value: string; expiresAt?: number }>()

function createInMemoryClient(): MockRedis {
  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = inMemoryStore.get(key)
      if (!entry) return null
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        inMemoryStore.delete(key)
        return null
      }
      return JSON.parse(entry.value) as T
    },
    async set(key: string, value: unknown, opts?: { ex?: number }): Promise<string> {
      const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined
      inMemoryStore.set(key, { value: JSON.stringify(value), expiresAt })
      return 'OK'
    },
  }
}

export const redis = _redis ?? (() => {
  _redis = createRedisClient()
  return _redis
})()
