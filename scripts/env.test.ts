import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, test } from "bun:test"

import {
  envVarNameForTarget,
  filterEnvVars,
  formatGithubEnvBlock,
  resolveTargetEnvVars,
} from "./env"

describe("filterEnvVars", () => {
  test("keeps keys present in both raw JSON and allowedKeys", () => {
    const rawJson = JSON.stringify({
        SITE_URL: "https://example.com",
        API_URL: "https://api.example.invalid",
      }),
      allowedKeys = ["SITE_URL", "API_URL"],
      result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({
      SITE_URL: "https://example.com",
      API_URL: "https://api.example.invalid",
    })
  })

  test("silently drops keys present in raw JSON but not in allowedKeys", () => {
    const rawJson = JSON.stringify({
        SITE_URL: "https://example.com",
        IMAGES_BASE_URL: "https://images.example.com",
        SECRET_API_KEY: "secret123",
      }),
      allowedKeys = ["SITE_URL"],
      result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({
      SITE_URL: "https://example.com",
    })
    expect(result).not.toHaveProperty("IMAGES_BASE_URL")
    expect(result).not.toHaveProperty("SECRET_API_KEY")
  })

  test("does not include keys from allowedKeys if not present in raw JSON", () => {
    const rawJson = JSON.stringify({
        SITE_URL: "https://example.com",
      }),
      allowedKeys = ["SITE_URL", "API_URL", "API_KEY"],
      result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({
      SITE_URL: "https://example.com",
    })
    expect(result).not.toHaveProperty("API_URL")
    expect(result).not.toHaveProperty("API_KEY")
  })

  test("returns empty object when allowedKeys is empty", () => {
    const rawJson = JSON.stringify({
        SITE_URL: "https://example.com",
        API_URL: "https://api.example.invalid",
      }),
      allowedKeys: string[] = [],
      result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({})
  })

  test("returns empty object when raw JSON is empty", () => {
    const rawJson = JSON.stringify({}),
      allowedKeys = ["SITE_URL", "API_URL"],
      result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({})
  })

  test("strips trailing backslashes from raw JSON string before parsing", () => {
    const rawJson = JSON.stringify({
        SITE_URL: "https://example.com",
      }).replace(/"/g, '\\"'),
      allowedKeys = ["SITE_URL"],
      result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toHaveProperty("SITE_URL")
  })

  test("removes leading BOM character from raw JSON string", () => {
    const jsonString = JSON.stringify({
        SITE_URL: "https://example.com",
      }),
      rawJson = `\uFEFF${jsonString}`,
      allowedKeys = ["SITE_URL"],
      result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({
      SITE_URL: "https://example.com",
    })
  })

  test("throws on non-string values in raw JSON", () => {
    const rawJson = JSON.stringify({
        SITE_URL: "https://example.com",
        PORT: 3000,
      }),
      allowedKeys = ["SITE_URL", "PORT"]

    expect(() => filterEnvVars(rawJson, allowedKeys)).toThrow()
  })

  test("throws on nested object values in raw JSON", () => {
    const rawJson = JSON.stringify({
        SITE_URL: "https://example.com",
        CONFIG: { timeout: 5000 },
      }),
      allowedKeys = ["SITE_URL", "CONFIG"]

    expect(() => filterEnvVars(rawJson, allowedKeys)).toThrow()
  })

  test("throws on null or undefined values in raw JSON", () => {
    const rawJson = JSON.stringify({
        SITE_URL: "https://example.com",
        NULLABLE_VAR: null,
      }),
      allowedKeys = ["SITE_URL", "NULLABLE_VAR"]

    expect(() => filterEnvVars(rawJson, allowedKeys)).toThrow()
  })

  test("throws on invalid JSON input", () => {
    const rawJson = "{ invalid json }",
      allowedKeys = ["SITE_URL"]

    expect(() => filterEnvVars(rawJson, allowedKeys)).toThrow()
  })
})

describe("envVarNameForTarget", () => {
  test("resolves brunabraz", () => {
    expect(envVarNameForTarget("brunabraz")).toBe("ENV_VARS_BRUNABRAZ")
  })

  test("resolves vandallabs", () => {
    expect(envVarNameForTarget("vandallabs")).toBe("ENV_VARS_VANDALLABS")
  })

  test("resolves clinicamauricioaraujo.com.br", () => {
    expect(envVarNameForTarget("clinicamauricioaraujo.com.br")).toBe(
      "ENV_VARS_CLINICAMAURICIOARAUJO"
    )
  })
})

describe("resolveTargetEnvVars", () => {
  let tmpDir: string | undefined

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
    tmpDir = undefined
    delete process.env["ENV_VARS_FIXTURE"]
  })

  test("returns the filtered subset when both the .env.example and the raw env var are present", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "env-fixture-"))
    writeFileSync(join(tmpDir, ".env.example"), "SITE_URL=\nIMAGES_BASE_URL=\n")
    process.env["ENV_VARS_FIXTURE"] = JSON.stringify({
      SITE_URL: "https://example.test",
      IMAGES_BASE_URL: "https://images.example.test",
      SECRET: "nope",
    })

    const result = resolveTargetEnvVars([tmpDir], "ENV_VARS_FIXTURE")

    expect(result).toEqual({
      SITE_URL: "https://example.test",
      IMAGES_BASE_URL: "https://images.example.test",
    })
  })

  test("returns {} when the env var is unset", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "env-fixture-"))
    writeFileSync(join(tmpDir, ".env.example"), "SITE_URL=\n")

    const result = resolveTargetEnvVars([tmpDir], "ENV_VARS_FIXTURE")

    expect(result).toEqual({})
  })
})

describe("formatGithubEnvBlock", () => {
  test("round-trips a multi-key map through the documented heredoc shape", () => {
    const vars = {
        SITE_URL: "https://example.com",
        IMAGES_BASE_URL: "https://images.example.com",
      },
      block = formatGithubEnvBlock(vars),
      decoded: Record<string, string> = {},
      regex = /^([^\n<]+)<<([^\n]+)\n([\s\S]*?)\n\2$/gm

    for (const match of block.matchAll(regex)) {
      const [, key, , value] = match
      if (key && value !== undefined) decoded[key] = value
    }

    expect(decoded).toEqual(vars)
  })

  test("round-trips a value containing a literal newline", () => {
    const vars = {
        MULTILINE: "line one\nline two",
      },
      block = formatGithubEnvBlock(vars),
      regex = /^([^\n<]+)<<([^\n]+)\n([\s\S]*?)\n\2$/gm,
      match = regex.exec(block)

    expect(match?.[1]).toBe("MULTILINE")
    expect(match?.[3]).toBe("line one\nline two")
  })
})
