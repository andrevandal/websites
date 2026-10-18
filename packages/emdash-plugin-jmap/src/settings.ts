import { getPluginSettings } from "emdash"

import { JMAP_PLUGIN_ID, toJmapSettings } from "./shared"
import type { JmapSettings } from "./shared"

const loadJmapSettings = async (): Promise<JmapSettings> =>
  toJmapSettings(await getPluginSettings(JMAP_PLUGIN_ID))

export { loadJmapSettings }
export type { JmapSettings }
