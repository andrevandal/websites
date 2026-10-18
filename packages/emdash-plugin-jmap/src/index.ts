import type { PluginDescriptor } from "emdash"

import { JMAP_PLUGIN_ID, JMAP_PLUGIN_VERSION } from "./shared"

const jmapEmailPlugin = (): PluginDescriptor => ({
  id: JMAP_PLUGIN_ID,
  version: JMAP_PLUGIN_VERSION,
  format: "native",
  entrypoint: "@vandal-websites/emdash-plugin-jmap/plugin",
  adminEntry: "@vandal-websites/emdash-plugin-jmap/admin",
  capabilities: ["hooks.email-transport:register"],
  storage: { deliveryLogs: { indexes: ["status", "createdAt", "source"] } },
})

export { jmapEmailPlugin }
