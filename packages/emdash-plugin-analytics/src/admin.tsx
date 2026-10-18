import { Button, Input, Loader } from "@cloudflare/kumo"
import type { PluginAdminExports } from "emdash"
import { apiFetch, parseApiResponse } from "emdash/plugin-utils"
import { useEffect, useState } from "react"
import type { SubmitEvent } from "react"

import {
  ANALYTICS_PLUGIN_ID,
  ANALYTICS_SETTINGS_PATH,
  ANALYTICS_SETTING_KEYS,
  analyticsSettingsSchema,
  toSettingsUpdate,
} from "./shared"
import type { AnalyticsSettingKey } from "./shared"

type Form = Record<AnalyticsSettingKey, string>
type SettingsResponse = { values: Record<string, unknown> }

const SETTINGS_URL = `/_emdash/api/admin/plugins/${ANALYTICS_PLUGIN_ID}/settings`

const toForm = (values: Record<string, unknown>): Form => {
  const text = (key: AnalyticsSettingKey) => {
    const value = values[key]
    return typeof value === "string" ? value : ""
  }
  return {
    gtagId: text("gtagId"),
    conversionId: text("conversionId"),
    conversionLabel: text("conversionLabel"),
  }
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const AnalyticsSettingsPage = () => {
  const [form, setForm] = useState<Form | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    null
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await apiFetch(SETTINGS_URL)
        const { values } = await parseApiResponse<SettingsResponse>(
          response,
          "Could not load Analytics settings"
        )
        if (active) setForm(toForm(values))
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
      const { values } = await parseApiResponse<SettingsResponse>(
        response,
        "Could not save Analytics settings"
      )
      setForm(toForm(values))
      setStatus({ ok: true, message: "Saved" })
    } catch (error) {
      setStatus({ ok: false, message: errorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <form
        className="space-y-4 rounded-lg border bg-kumo-base p-6"
        onSubmit={event => void save(event)}
      >
        {ANALYTICS_SETTING_KEYS.map(key => (
          <Input
            key={key}
            label={analyticsSettingsSchema[key].label}
            description={analyticsSettingsSchema[key].description}
            value={form[key]}
            onChange={event => setForm({ ...form, [key]: event.target.value })}
          />
        ))}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </form>
      <p
        role="status"
        className={status?.ok === false ? "text-kumo-danger" : undefined}
      >
        {status?.message}
      </p>
    </section>
  )
}

const pages: PluginAdminExports["pages"] = {
  [ANALYTICS_SETTINGS_PATH]: AnalyticsSettingsPage,
}

export { pages }
