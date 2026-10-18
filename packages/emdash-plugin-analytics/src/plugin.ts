import { definePlugin } from "emdash"

import {
  ANALYTICS_PLUGIN_ID,
  ANALYTICS_SETTINGS_PATH,
  analyticsSettingsSchema,
} from "./shared"

// No hooks or routes: the admin page uses the host settings API.
const createPlugin = () =>
  definePlugin({
    id: ANALYTICS_PLUGIN_ID,
    version: "0.0.0",
    admin: {
      entry: "@vandal-websites/emdash-plugin-analytics/admin",
      settingsSchema: analyticsSettingsSchema,
      pages: [
        {
          path: ANALYTICS_SETTINGS_PATH,
          label: "Analytics",
          icon: "chart-bar",
        },
      ],
    },
  })

export { createPlugin }
