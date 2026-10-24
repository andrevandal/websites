import type { S3StorageConfig, StorageDescriptor } from "emdash"

// Config-time (Node) entry; kept apart from the Worker adapter in s3-fetch.ts.
const s3Fetch = (config: Partial<S3StorageConfig> = {}): StorageDescriptor => ({
  entrypoint: "@vandal-websites/sun-ui-emdash/storage/s3-fetch",
  config,
})

export { s3Fetch }
