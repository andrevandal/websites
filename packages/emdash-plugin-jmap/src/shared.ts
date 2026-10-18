import type { SettingField } from "emdash"

// Mirrors emdash's EmailMessage, which the package does not export.
type EmailMessage = {
  to: string
  cc?: string[]
  replyTo?: string
  subject: string
  text: string
  html?: string
}

type JmapSettingKey =
  | "baseUrl"
  | "authMode"
  | "username"
  | "credential"
  | "fromEmail"
  | "fromName"
  | "replyTo"

type JmapSettings = {
  baseUrl: string
  authMode: "basic" | "bearer"
  username?: string
  credential: string
  fromEmail: string
  fromName?: string
  replyTo?: string
}

// Message bodies are never stored: magic-link bodies contain login tokens.
type DeliveryLog = {
  status: "sent" | "failed"
  source: string
  to: string
  subject: string
  error?: string
  emailId?: string
  submissionId?: string
  createdAt: string
}

const JMAP_PLUGIN_ID = "jmap-email"
const JMAP_PLUGIN_VERSION = "0.0.0"
const JMAP_SETTINGS_PATH = "/settings"
const JMAP_LOG_PATH = "/log"
const LOG_CAP = 500
const LOG_PAGE = 50
const JMAP_SETTING_KEYS: JmapSettingKey[] = [
  "baseUrl",
  "authMode",
  "username",
  "credential",
  "fromEmail",
  "fromName",
  "replyTo",
]

const jmapSettingsSchema: Record<JmapSettingKey, SettingField> = {
  baseUrl: {
    type: "url",
    label: "Server URL",
    description:
      "Base URL of the JMAP server, e.g. https://mail.example.com. The session is read from /.well-known/jmap.",
  },
  authMode: {
    type: "select",
    label: "Authentication",
    options: [
      { value: "basic", label: "Username and password" },
      { value: "bearer", label: "Bearer token" },
    ],
    default: "basic",
  },
  username: {
    type: "string",
    label: "Username",
    description: "Basic auth only.",
  },
  credential: { type: "secret", label: "Password or token" },
  fromEmail: {
    type: "email",
    label: "From address",
    description: "Must match a JMAP identity on the account.",
  },
  fromName: { type: "string", label: "From name" },
  replyTo: { type: "email", label: "Reply-To" },
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")

const toJmapSettings = (raw: Record<string, unknown>): JmapSettings => {
  const authMode = text(raw.authMode) === "bearer" ? "bearer" : "basic"
  const baseUrl = text(raw.baseUrl).replace(/\/+$/, "")
  const username = text(raw.username)
  const credential = text(raw.credential)
  const fromEmail = text(raw.fromEmail)
  const missing = [
    !baseUrl && "baseUrl",
    authMode === "basic" && !username && "username",
    !credential && "credential",
    !fromEmail && "fromEmail",
  ].filter(Boolean)
  if (missing.length)
    throw new Error(`JMAP settings incomplete: missing ${missing.join(", ")}`)

  return {
    baseUrl,
    authMode,
    username: username || undefined,
    credential,
    fromEmail,
    fromName: text(raw.fromName) || undefined,
    replyTo: text(raw.replyTo) || undefined,
  }
}

const authHeader = (s: JmapSettings) =>
  s.authMode === "bearer"
    ? `Bearer ${s.credential}`
    : `Basic ${btoa(`${s.username}:${s.credential}`)}`

// Secrets are write-only in the host API: a blank credential is left out so
// the stored one is kept.
const toSettingsUpdate = (
  form: Record<JmapSettingKey, string>
): Partial<Record<JmapSettingKey, string | null>> =>
  Object.fromEntries(
    JMAP_SETTING_KEYS.filter(
      key => key !== "credential" || form[key].trim()
    ).map(key => [key, form[key].trim() || null])
  )

export {
  JMAP_PLUGIN_ID,
  JMAP_PLUGIN_VERSION,
  JMAP_SETTINGS_PATH,
  JMAP_LOG_PATH,
  JMAP_SETTING_KEYS,
  LOG_CAP,
  LOG_PAGE,
  jmapSettingsSchema,
  toJmapSettings,
  authHeader,
  toSettingsUpdate,
}
export type { DeliveryLog, EmailMessage, JmapSettingKey, JmapSettings }
