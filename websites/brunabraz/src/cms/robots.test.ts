import { describe, expect, test } from "bun:test"
import { robotsRules } from "./robots"

describe("robotsRules", () => {
  test.each([undefined, ""])("keeps only the CMS block for %p", adminText => {
    expect(robotsRules(adminText)).toEqual(["Disallow: /_emdash/"])
  })

  test("trims editor rules and removes Sitemap directives", () => {
    expect(
      robotsRules(
        "User-agent: GPTBot\r\n  Disallow: /\n\nSitemap: https://x/s.xml\nsitemap:/y"
      )
    ).toEqual(["Disallow: /_emdash/", "User-agent: GPTBot", "Disallow: /"])
  })
})
