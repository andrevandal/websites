import { getPluginSettings } from "emdash"

import { ANALYTICS_PLUGIN_ID, toAnalyticsSettings } from "./shared"
import type { AnalyticsSettings } from "./shared"

const loadAnalyticsSettings = async (): Promise<AnalyticsSettings> =>
  toAnalyticsSettings(await getPluginSettings(ANALYTICS_PLUGIN_ID))

export { loadAnalyticsSettings }
export type { AnalyticsSettings }
