import type { SettingField } from "emdash"

type AnalyticsSettingKey = "gtagId" | "conversionId" | "conversionLabel"

// Keys match sun-ui's GtagConfig, so the result spreads straight into `gtag`.
type AnalyticsSettings = Partial<Record<AnalyticsSettingKey, string>>

const ANALYTICS_PLUGIN_ID = "analytics"
const ANALYTICS_SETTINGS_PATH = "/settings"
const ANALYTICS_SETTING_KEYS: AnalyticsSettingKey[] = [
  "gtagId",
  "conversionId",
  "conversionLabel",
]

const analyticsSettingsSchema: Record<AnalyticsSettingKey, SettingField> = {
  gtagId: {
    type: "string",
    label: "Google tag ID",
    description: "G-... or AW-.... Leave blank to turn tracking off.",
  },
  conversionId: {
    type: "string",
    label: "Google Ads conversion ID",
    description:
      "AW-.... With the label, reports leads from buttons marked track-conversion.",
  },
  conversionLabel: {
    type: "string",
    label: "Google Ads conversion label",
  },
}

const toAnalyticsSettings = (
  raw: Record<string, unknown>
): AnalyticsSettings => {
  const settings: AnalyticsSettings = {}
  for (const key of ANALYTICS_SETTING_KEYS) {
    const value = raw[key]
    if (typeof value === "string" && value.trim()) settings[key] = value.trim()
  }
  return settings
}

const toSettingsUpdate = (
  form: Record<AnalyticsSettingKey, string>
): Record<AnalyticsSettingKey, string | null> => ({
  gtagId: form.gtagId.trim() || null,
  conversionId: form.conversionId.trim() || null,
  conversionLabel: form.conversionLabel.trim() || null,
})

export {
  ANALYTICS_PLUGIN_ID,
  ANALYTICS_SETTINGS_PATH,
  ANALYTICS_SETTING_KEYS,
  analyticsSettingsSchema,
  toAnalyticsSettings,
  toSettingsUpdate,
}
export type { AnalyticsSettingKey, AnalyticsSettings }
