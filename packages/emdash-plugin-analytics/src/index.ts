import type { PluginDescriptor } from "emdash"

import { ANALYTICS_PLUGIN_ID } from "./shared"

const analyticsPlugin = (): PluginDescriptor => ({
  id: ANALYTICS_PLUGIN_ID,
  version: "0.0.0",
  format: "native",
  entrypoint: "@vandal-websites/emdash-plugin-analytics/plugin",
  adminEntry: "@vandal-websites/emdash-plugin-analytics/admin",
})

export { analyticsPlugin }
