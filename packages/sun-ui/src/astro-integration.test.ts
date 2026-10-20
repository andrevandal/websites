import { describe, it, expect, mock } from "bun:test"
import type { HookParameters } from "astro"
import SunUIAstroIntegration from "./astro-integration.ts"

type VirtualConfigPlugin = {
  name: string
  resolveId: (id: string) => string | undefined
  load: (id: string) => string | undefined
}

type ConfigUpdate = {
  integrations?: unknown[]
  image?: {
    service: { entrypoint: string; config: { baseUrl: string } }
  }
  vite?: { plugins?: VirtualConfigPlugin[] }
}

type IntegrationProps = Parameters<typeof SunUIAstroIntegration>[0]

const setup = (props?: IntegrationProps): ConfigUpdate => {
    const updateConfig = mock(),
      integration = SunUIAstroIntegration(props),
      // Only `updateConfig` is exercised by this hook; the rest of the hook
      // parameters are irrelevant here and impossible to construct meaningfully.
      hookParams = {
        updateConfig,
      } as unknown as HookParameters<"astro:config:setup">
    integration.hooks["astro:config:setup"]?.(hookParams)

    expect(updateConfig).toHaveBeenCalled()
    return updateConfig.mock.calls[0]![0] as ConfigUpdate
  },
  configPlugin = (props?: IntegrationProps): VirtualConfigPlugin => {
    const plugin = setup(props).vite?.plugins?.[0]
    if (!plugin) throw new Error("virtual config plugin was not registered")
    return plugin
  }

describe("SunUIAstroIntegration", () => {
  it("does not configure image service at build time", () => {
    const call = setup()

    expect(Array.isArray(call.integrations)).toBe(true)
    expect(call.integrations?.length).toBe(1)
    expect(call).not.toHaveProperty("image")
  })

  it("image service is not configured even when base URL is provided", () => {
    const call = setup({ imageServiceBaseUrl: "https://images.example.com" })

    expect(Array.isArray(call.integrations)).toBe(true)
    expect(call.integrations?.length).toBe(1)
    expect(call).not.toHaveProperty("image")
  })

  it("always registers the virtual config plugin", () => {
    const plugin = configPlugin()

    expect(plugin.name).toBe("sun-ui:config")
    expect(plugin.resolveId("virtual:sun-ui/config")).toBe(
      "\0virtual:sun-ui/config"
    )
    expect(plugin.resolveId("some-other-module")).toBeUndefined()
  })

  it("virtual config always exports undefined for imageServiceBaseUrl", () => {
    const plugin = configPlugin()

    expect(plugin.load("\0virtual:sun-ui/config")).toBe(
      "export const imageServiceBaseUrl = undefined\n"
    )
    expect(plugin.load("/repo/packages/sun-ui/src/config.ts")).toBe(
      "export const imageServiceBaseUrl = undefined\n"
    )
  })

  it("ignores unrelated module ids when loading", () => {
    const plugin = configPlugin()

    expect(plugin.load("some-other-module")).toBeUndefined()
    expect(plugin.load("/repo/packages/other/src/config.ts")).toBeUndefined()
  })

  it("does not register svelte when the svelte option is omitted", () => {
    const updateConfig = mock(),
      integration = SunUIAstroIntegration()

    integration.hooks["astro:config:setup"]?.({
      updateConfig,
    } as unknown as any)

    const [call] = updateConfig.mock.calls[0]!
    expect(call.integrations.length).toBe(1)
  })

  it("registers the svelte integration when svelte: true is passed", () => {
    const updateConfig = mock(),
      integration = SunUIAstroIntegration({ svelte: true })

    integration.hooks["astro:config:setup"]?.({
      updateConfig,
    } as unknown as any)

    const [call] = updateConfig.mock.calls[0]!
    expect(call.integrations.length).toBe(2)
  })
})
