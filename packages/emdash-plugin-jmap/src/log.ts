import type { StorageCollection } from "emdash"

import { LOG_CAP, LOG_PAGE } from "./shared"
import type { DeliveryLog } from "./shared"

const writeLog = async (
  collection: StorageCollection<DeliveryLog>,
  entry: DeliveryLog
) => {
  await collection.put(crypto.randomUUID(), entry)
  const excess = (await collection.count()) - LOG_CAP
  if (excess <= 0) return
  const { items } = await collection.query({
    orderBy: { createdAt: "asc" },
    limit: Math.min(excess, 100),
  })
  await collection.deleteMany(items.map(item => item.id))
}

const listLogs = async (collection: StorageCollection<DeliveryLog>) => {
  const { items } = await collection.query({
    orderBy: { createdAt: "desc" },
    limit: LOG_PAGE,
  })
  // oxlint-disable-next-line oxc/no-map-spread -- rows are small; copy is intended
  return items.map(item => ({ id: item.id, ...item.data }))
}

export { listLogs, writeLog }
