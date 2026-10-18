import { beforeEach, expect, mock, test } from "bun:test"
import type { SettingsAccess, StorageCollection } from "emdash"

const sendMock = mock(
  async (): Promise<unknown> => ({
    emailId: "e1",
    submissionId: "s1",
  })
)
void mock.module("./jmap", () => ({ sendJmap: sendMock }))

const { deliver } = await import("./deliver")

const values: Record<string, string> = {
  baseUrl: "https://mail.example.com",
  username: "u",
  credential: "p",
  fromEmail: "a@example.com",
}
const settings = {
  get: async (key: string) => values[key] ?? null,
} as unknown as SettingsAccess
const message = { to: "to@example.com", subject: "Hi", text: "secret-token" }

const logs = () => {
  const puts: any[] = []
  const collection = {
    put: async (_id: string, data: unknown) => void puts.push(data),
    count: async () => puts.length,
  } as unknown as StorageCollection<any>
  return { puts, collection }
}

beforeEach(() => sendMock.mockClear())

test("logs a sent delivery with ids and no body", async () => {
  const { puts, collection } = logs()
  await deliver(settings, collection, message, "system")
  expect(puts).toHaveLength(1)
  expect(puts[0]).toMatchObject({
    status: "sent",
    source: "system",
    to: "to@example.com",
    subject: "Hi",
    emailId: "e1",
    submissionId: "s1",
  })
  expect(JSON.stringify(puts[0])).not.toContain("secret-token")
})

test("logs a failure and rethrows", async () => {
  sendMock.mockRejectedValueOnce(new Error("boom"))
  const { puts, collection } = logs()
  await expect(deliver(settings, collection, message, "test")).rejects.toThrow(
    "boom"
  )
  expect(puts).toHaveLength(1)
  expect(puts[0]).toMatchObject({ status: "failed", error: "boom" })
})

test("incomplete settings are logged as failed without sending", async () => {
  const { puts, collection } = logs()
  const empty = { get: async () => null } as unknown as SettingsAccess
  await expect(deliver(empty, collection, message, "test")).rejects.toThrow(
    "JMAP settings incomplete"
  )
  expect(sendMock).not.toHaveBeenCalled()
  expect(puts[0]).toMatchObject({ status: "failed" })
})
