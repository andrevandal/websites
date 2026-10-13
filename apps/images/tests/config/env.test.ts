import { describe, expect, test } from "bun:test"

// Dynamic import with cache-busting query param to reload the module fresh
// for each test with different environment variables. This is a legitimate
// exception to the static import rule for testing module initialization boundaries.
const CONFIG_KEYS = [
  "HTTP_DOMAINS",
  "HTTP_MAX_AGE",
  "FS_DIR",
  "FS_MAX_AGE",
  "LOCAL_CACHE_DIR",
  "QUEUE_DB",
  "MAX_CONCURRENT",
  "S3_ENDPOINT",
  "S3_PORT",
  "S3_USE_SSL",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_BUCKET",
  "CONSOLA_LEVEL",
  "AVIF_ENABLED",
  "KV_PATH",
  "KV_MAX_BYTES",
  "BAN_STRIKE_THRESHOLD",
  "BAN_STRIKE_WINDOW_MS",
  "BAN_DURATION_MS",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX",
  "TRUST_CLOUDFLARE_IPS",
  "TRUSTED_PROXY_CIDRS",
]

const loadFreshEnvModule = async (env: Record<string, string | undefined>) => {
  const touchedKeys = new Set([...CONFIG_KEYS, ...Object.keys(env), "PORT"])
  const previous = new Map(
    [...touchedKeys].map(key => [key, process.env[key]] as const)
  )

  for (const key of touchedKeys) delete process.env[key]
  Object.assign(process.env, env)

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = await import(
    `../../src/config/env?test=${crypto.randomUUID()}`
  )

  // Don't cleanup yet - let the test call loadConfig() while env is still set
  const cleanup = () => {
    for (const key of touchedKeys) {
      const value = previous.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }

  return { ...module, cleanup }
}

describe("config/env: queue database", () => {
  test("defaults queue DB to local .data path", async () => {
    const { loadConfig, cleanup } = await loadFreshEnvModule({})
    const config = loadConfig()
    cleanup()

    expect(config.queueDb).toBe("./.data/queue.db")
  })

  test("reads QUEUE_DB override", async () => {
    const { loadConfig, cleanup } = await loadFreshEnvModule({
      QUEUE_DB: "/data/queue/queue.db",
    })
    const config = loadConfig()
    cleanup()

    expect(config.queueDb).toBe("/data/queue/queue.db")
  })
})

describe("config/env: KV store", () => {
  test("defaults kvPath and kvMaxBytes", async () => {
    const { loadConfig, cleanup } = await loadFreshEnvModule({})
    const config = loadConfig()
    cleanup()

    expect(config.kvPath).toBe("./.data/kv.db")
    expect(config.kvMaxBytes).toBe(52_428_800)
  })

  test("reads KV_PATH and KV_MAX_BYTES overrides", async () => {
    const { loadConfig, cleanup } = await loadFreshEnvModule({
      KV_PATH: "/data/kv/kv.db",
      KV_MAX_BYTES: "1000",
    })
    const config = loadConfig()
    cleanup()

    expect(config.kvPath).toBe("/data/kv/kv.db")
    expect(config.kvMaxBytes).toBe(1000)
  })
})

describe("config/env: bot defense", () => {
  test("defaults ban/rate-limit/cloudflare-trust fields", async () => {
    const { loadConfig, cleanup } = await loadFreshEnvModule({})
    const config = loadConfig()
    cleanup()

    expect(config.banStrikeThreshold).toBe(5)
    expect(config.banStrikeWindowMs).toBe(3_600_000)
    expect(config.banDurationMs).toBe(86_400_000)
    expect(config.rateLimitWindowMs).toBe(300_000)
    expect(config.rateLimitMax).toBe(300)
    expect(config.trustCloudflareIps).toBe(true)
  })

  test("reads TRUST_CLOUDFLARE_IPS override", async () => {
    const { loadConfig, cleanup } = await loadFreshEnvModule({
      TRUST_CLOUDFLARE_IPS: "false",
    })
    const config = loadConfig()
    cleanup()

    expect(config.trustCloudflareIps).toBe(false)
  })

  test("defaults TRUSTED_PROXY_CIDRS to none", async () => {
    const { loadConfig, cleanup } = await loadFreshEnvModule({})
    const config = loadConfig()
    cleanup()

    expect(config.trustedProxyCidrs).toEqual([])
  })

  test("parses a comma-separated TRUSTED_PROXY_CIDRS list", async () => {
    const { loadConfig, cleanup } = await loadFreshEnvModule({
      TRUSTED_PROXY_CIDRS: " 172.16.0.0/12 , fd00::/8 ",
    })
    const config = loadConfig()
    cleanup()

    expect(config.trustedProxyCidrs).toEqual(["172.16.0.0/12", "fd00::/8"])
  })

  test("rejects an invalid TRUSTED_PROXY_CIDRS entry at startup", async () => {
    try {
      await expect(
        loadFreshEnvModule({ TRUSTED_PROXY_CIDRS: "172.16.0.0/12,not-a-cidr" })
      ).rejects.toThrow("Invalid proxy CIDR: not-a-cidr")
    } finally {
      // the import threw before loadFreshEnvModule could hand back cleanup()
      delete process.env.TRUSTED_PROXY_CIDRS
    }
  })
})
