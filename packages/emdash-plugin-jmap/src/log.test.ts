import { expect, test } from "bun:test"
import type { StorageCollection } from "emdash"

import { listLogs, writeLog } from "./log"
import type { DeliveryLog } from "./shared"

// Implements only what log.ts uses.
const memoryCollection = () => {
  const rows = new Map<string, DeliveryLog>()
  const collection = {
    put: async (id: string, data: DeliveryLog) => void rows.set(id, data),
    count: async () => rows.size,
    deleteMany: async (ids: string[]) =>
      ids.filter(id => rows.delete(id)).length,
    query: async ({ orderBy, limit = 50 }: any) => {
      const dir = orderBy.createdAt === "asc" ? 1 : -1
      const items = [...rows]
        .map(([id, data]) => ({ id, data }))
        .sort((a, b) => dir * a.data.createdAt.localeCompare(b.data.createdAt))
      return { items: items.slice(0, limit), hasMore: false }
    },
  }
  return {
    rows,
    collection: collection as unknown as StorageCollection<DeliveryLog>,
  }
}

const entry = (n: number): DeliveryLog => ({
  status: "sent",
  source: "test",
  to: "a@example.com",
  subject: `s${n}`,
  createdAt: new Date(n * 1000).toISOString(),
})

test("writeLog caps at 500 and drops the oldest", async () => {
  const { rows, collection } = memoryCollection()
  // Sequential on purpose: each write trims against the previous count.
  // eslint-disable-next-line no-await-in-loop
  for (let n = 0; n < 502; n++) await writeLog(collection, entry(n))
  const subjects = [...rows.values()].map(row => row.subject)
  expect(rows.size).toBe(500)
  expect(subjects).not.toContain("s0")
  expect(subjects).not.toContain("s1")
  expect(subjects).toContain("s2")
})

test("listLogs returns newest first, capped at a page", async () => {
  const { collection } = memoryCollection()
  // Sequential on purpose: each write trims against the previous count.
  // eslint-disable-next-line no-await-in-loop
  for (let n = 0; n < 60; n++) await writeLog(collection, entry(n))
  const logs = await listLogs(collection)
  expect(logs).toHaveLength(50)
  expect(logs[0]!.subject).toBe("s59")
  expect(typeof logs[0]!.id).toBe("string")
})
