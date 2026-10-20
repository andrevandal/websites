import { describe, expect, it } from "bun:test"
import { renderAstro } from "../../../tests/astro-loader"

const componentUrl = new URL("./Button.astro", import.meta.url)

describe("SunButton", () => {
  it.each(["https://example.com", "http://example.com", "HTTPS://example.com"])(
    "opens HTTP(S) link %s externally",
    async href => {
      const html = await renderAstro(componentUrl, {
        props: { as: "a", href },
        slots: { default: "Visit" },
      })
      expect(html).toContain('target="_blank"')
      expect(html).toContain('rel="noopener noreferrer"')
    }
  )

  it.each([
    "/about",
    "#contact",
    "mailto:hello@example.com",
    "tel:+5511999999999",
    "http-not-a-url",
  ])("does not mark %s external", async href => {
    const html = await renderAstro(componentUrl, {
      props: { as: "a", href },
      slots: { default: "Contact" },
    })
    expect(html).not.toContain("target=")
    expect(html).not.toContain("rel=")
  })

  it("preserves classes, structural variants and icon slots", async () => {
    const html = await renderAstro(componentUrl, {
      props: {
        as: "a",
        href: "/about",
        block: true,
        centered: true,
        className: "site-button",
      },
      slots: { prefix: "Before", default: "Label", suffix: "After" },
    })
    expect(html).toContain("btn btn-block btn-center site-button")
    expect(html).toMatch(/Before\s*<span[^>]*>Label<\/span>\s*After/)
  })

  it("keeps a button without link attributes", async () => {
    const html = await renderAstro(componentUrl, {
      props: { type: "submit" },
      slots: { default: "Send" },
    })
    expect(html).toContain("<button")
    expect(html).toContain('type="submit"')
    expect(html).not.toContain("href=")
    expect(html).not.toContain("target=")
  })
})
