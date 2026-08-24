import { describe, it, expect, mock } from "bun:test"
import SunUIAstroIntegration from "./astro-integration.ts"

describe("SunUIAstroIntegration", () => {
  it("configures only iconset when no image service base URL is provided", () => {
    const updateConfig = mock()
    const integration = SunUIAstroIntegration()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    integration.hooks["astro:config:setup"]?.({ updateConfig } as any)

    expect(updateConfig).toHaveBeenCalled()
    const [call] = updateConfig.mock.calls[0]!
    expect(Array.isArray(call.integrations)).toBe(true)
    expect(call.integrations.length).toBe(1)
    expect(call).not.toHaveProperty("image")
  })

  it("configures image service when base URL is provided", () => {
    const updateConfig = mock()
    const integration = SunUIAstroIntegration({
      imageServiceBaseUrl: "https://images.example.com",
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    integration.hooks["astro:config:setup"]?.({ updateConfig } as any)

    expect(updateConfig).toHaveBeenCalled()
    const [call] = updateConfig.mock.calls[0]!
    expect(Array.isArray(call.integrations)).toBe(true)
    expect(call.integrations.length).toBe(1)
    expect(call.image.service.entrypoint).toBe(
      "@vandal-websites/sun-ui/astro-image-service"
    )
    expect(call.image.service.config.baseUrl).toBe("https://images.example.com")
  })

  it("does not register svelte when the svelte option is omitted", () => {
    const updateConfig = mock()
    const integration = SunUIAstroIntegration()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    integration.hooks["astro:config:setup"]?.({
      updateConfig,
    } as unknown as any)

    const [call] = updateConfig.mock.calls[0]!
    expect(call.integrations.length).toBe(1)
  })

  it("registers the svelte integration when svelte: true is passed", () => {
    const updateConfig = mock()
    const integration = SunUIAstroIntegration({ svelte: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    integration.hooks["astro:config:setup"]?.({
      updateConfig,
    } as unknown as any)

    const [call] = updateConfig.mock.calls[0]!
    expect(call.integrations.length).toBe(2)
  })
})
