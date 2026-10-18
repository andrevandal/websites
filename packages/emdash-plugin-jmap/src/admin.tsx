import { Button, Input, Loader } from "@cloudflare/kumo"
import type { PluginAdminExports } from "emdash"
import { apiFetch, parseApiResponse } from "emdash/plugin-utils"
import { useEffect, useState } from "react"
import type { SubmitEvent } from "react"

import {
  JMAP_LOG_PATH,
  JMAP_PLUGIN_ID,
  JMAP_SETTINGS_PATH,
  JMAP_SETTING_KEYS,
  jmapSettingsSchema,
  toSettingsUpdate,
} from "./shared"
import type { DeliveryLog, JmapSettingKey } from "./shared"

type Form = Record<JmapSettingKey, string>
type SettingsResponse = {
  values: Record<string, unknown>
  secretsSet: Record<string, boolean>
}
type Status = { ok: boolean; message: string }

const SETTINGS_URL = `/_emdash/api/admin/plugins/${JMAP_PLUGIN_ID}/settings`
const ROUTE_URL = `/_emdash/api/plugins/${JMAP_PLUGIN_ID}`

const toForm = (values: Record<string, unknown>): Form =>
  Object.fromEntries(
    JMAP_SETTING_KEYS.map(key => {
      const value = values[key]
      return [key, typeof value === "string" ? value : ""]
    })
  ) as Form

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const StatusLine = ({ status }: { status: Status | null }) => (
  <p
    role={status?.ok === false ? "alert" : "status"}
    className={status?.ok === false ? "text-kumo-danger" : undefined}
  >
    {status?.message}
  </p>
)

const TestSend = () => {
  const [to, setTo] = useState("")
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

  const send = async () => {
    setSending(true)
    setStatus(null)
    try {
      const response = await apiFetch(`${ROUTE_URL}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      })
      await parseApiResponse(response, "Could not send test email")
      setStatus({ ok: true, message: "Test email sent" })
    } catch (error) {
      setStatus({ ok: false, message: errorMessage(error) })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-kumo-base p-6">
      <h2 className="text-lg font-semibold">Send test email</h2>
      <p>Save the settings first; the test uses the saved values.</p>
      <Input
        label="Recipient"
        type="email"
        value={to}
        onChange={event => setTo(event.target.value)}
      />
      <Button type="button" disabled={sending} onClick={() => void send()}>
        {sending ? "Sending..." : "Send test email"}
      </Button>
      <StatusLine status={status} />
    </div>
  )
}

const SettingsPage = () => {
  const [form, setForm] = useState<Form | null>(null)
  const [credentialSet, setCredentialSet] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

  const apply = (data: SettingsResponse) => {
    setForm(toForm(data.values))
    setCredentialSet(Boolean(data.secretsSet?.credential))
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await apiFetch(SETTINGS_URL)
        const data = await parseApiResponse<SettingsResponse>(
          response,
          "Could not load JMAP settings"
        )
        if (active) apply(data)
      } catch (error) {
        if (active) setLoadError(errorMessage(error))
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  if (loadError) {
    return (
      <p role="alert" className="text-kumo-danger">
        {loadError}
      </p>
    )
  }
  if (!form) return <Loader />

  const save = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      const response = await apiFetch(SETTINGS_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: toSettingsUpdate(form) }),
      })
      apply(
        await parseApiResponse<SettingsResponse>(
          response,
          "Could not save JMAP settings"
        )
      )
      setStatus({ ok: true, message: "Saved" })
    } catch (error) {
      setStatus({ ok: false, message: errorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">JMAP email</h1>
      <form
        className="space-y-4 rounded-lg border bg-kumo-base p-6"
        onSubmit={event => void save(event)}
      >
        {JMAP_SETTING_KEYS.filter(
          key => key !== "username" || form.authMode !== "bearer"
        ).map(key =>
          key === "authMode" ? (
            <label key={key} className="block space-y-1">
              <span>{jmapSettingsSchema.authMode.label}</span>
              <select
                className="block w-full rounded-md border bg-kumo-base p-2"
                value={form.authMode}
                onChange={event =>
                  setForm({ ...form, authMode: event.target.value })
                }
              >
                <option value="basic">Username and password</option>
                <option value="bearer">Bearer token</option>
              </select>
            </label>
          ) : (
            <Input
              key={key}
              label={jmapSettingsSchema[key].label}
              description={
                key === "credential" && credentialSet
                  ? "A value is saved. Leave blank to keep it."
                  : jmapSettingsSchema[key].description
              }
              type={key === "credential" ? "password" : "text"}
              value={form[key]}
              onChange={event =>
                setForm({ ...form, [key]: event.target.value })
              }
            />
          )
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </form>
      <StatusLine status={status} />
      <TestSend />
    </section>
  )
}

type LogRow = DeliveryLog & { id: string }

const LogPage = () => {
  const [rows, setRows] = useState<LogRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await apiFetch(`${ROUTE_URL}/logs`)
        const { items } = await parseApiResponse<{ items: LogRow[] }>(
          response,
          "Could not load the JMAP log"
        )
        if (active) setRows(items)
      } catch (error) {
        if (active) setLoadError(errorMessage(error))
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  if (loadError) {
    return (
      <p role="alert" className="text-kumo-danger">
        {loadError}
      </p>
    )
  }
  if (!rows) return <Loader />

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">JMAP log</h1>
      {rows.length === 0 ? (
        <p>No deliveries yet</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>Status</th>
              <th>Source</th>
              <th>To</th>
              <th>Subject</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>{row.status}</td>
                <td>{row.source}</td>
                <td>{row.to}</td>
                <td>{row.subject}</td>
                <td>{row.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

const pages: PluginAdminExports["pages"] = {
  [JMAP_SETTINGS_PATH]: SettingsPage,
  [JMAP_LOG_PATH]: LogPage,
}

export { pages }
