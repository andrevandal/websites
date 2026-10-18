import { definePlugin } from "emdash"
import type { StorageCollection } from "emdash"

import { deliver } from "./deliver"
import { listLogs } from "./log"
import {
  JMAP_LOG_PATH,
  JMAP_PLUGIN_ID,
  JMAP_PLUGIN_VERSION,
  JMAP_SETTINGS_PATH,
  jmapSettingsSchema,
} from "./shared"
import type { DeliveryLog } from "./shared"

// ofetch is called directly, so EmDash's `allowedHosts` gate does not apply;
// the server host is an admin setting.
const createPlugin = () =>
  definePlugin({
    id: JMAP_PLUGIN_ID,
    version: JMAP_PLUGIN_VERSION,
    capabilities: ["hooks.email-transport:register"],
    storage: { deliveryLogs: { indexes: ["status", "createdAt", "source"] } },
    admin: {
      entry: "@vandal-websites/emdash-plugin-jmap/admin",
      settingsSchema: jmapSettingsSchema,
      pages: [
        { path: JMAP_SETTINGS_PATH, label: "JMAP", icon: "envelope" },
        { path: JMAP_LOG_PATH, label: "JMAP log", icon: "list" },
      ],
    },
    hooks: {
      "email:deliver": {
        exclusive: true,
        handler: (event, ctx) =>
          deliver(
            ctx.settings,
            ctx.storage.deliveryLogs as StorageCollection<DeliveryLog>,
            event.message,
            event.source || ctx.plugin.id
          ),
      },
    },
    routes: {
      test: {
        handler: async ctx => {
          const { input } = ctx
          const to =
            typeof input === "object" && input !== null && "to" in input
              ? String(input.to).trim()
              : ""
          if (!to.includes("@")) throw new Error("Enter a recipient address")
          await deliver(
            ctx.settings,
            ctx.storage.deliveryLogs as StorageCollection<DeliveryLog>,
            {
              to,
              subject: "JMAP test email",
              text: "This is a test email from the EmDash JMAP plugin.",
            },
            "test"
          )
          return { ok: true }
        },
      },
      logs: {
        handler: async ctx => ({
          items: await listLogs(
            ctx.storage.deliveryLogs as StorageCollection<DeliveryLog>
          ),
        }),
      },
    },
  })

export { createPlugin }
