import type { SettingsAccess, StorageCollection } from "emdash"

import { sendJmap } from "./jmap"
import { writeLog } from "./log"
import { JMAP_SETTING_KEYS, toJmapSettings } from "./shared"
import type { DeliveryLog, EmailMessage } from "./shared"

// Sends through JMAP and logs the outcome; a failure is logged, then rethrown.
const deliver = async (
  settings: SettingsAccess,
  logs: StorageCollection<DeliveryLog>,
  message: EmailMessage,
  source: string
) => {
  const entry = {
    source,
    to: message.to,
    subject: message.subject,
    createdAt: new Date().toISOString(),
  }
  try {
    const values = await Promise.all(
      JMAP_SETTING_KEYS.map(key => settings.get(key))
    )
    const raw = Object.fromEntries(
      JMAP_SETTING_KEYS.map((key, index) => [key, values[index]])
    )
    const ids = await sendJmap(toJmapSettings(raw), message)
    await writeLog(logs, { ...entry, status: "sent", ...ids })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    await writeLog(logs, { ...entry, status: "failed", error: err.message })
    throw err
  }
}

export { deliver }
