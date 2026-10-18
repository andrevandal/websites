import { describe, expect, test } from "bun:test"

import { authHeader, toJmapSettings, toSettingsUpdate } from "./shared"

const base = {
  baseUrl: " https://mail.example.com/ ",
  username: "u",
  credential: "p",
  fromEmail: "a@example.com",
}

describe("toJmapSettings", () => {
  test("trims, strips the trailing slash and defaults to basic", () => {
    expect(toJmapSettings(base)).toMatchObject({
      baseUrl: "https://mail.example.com",
      authMode: "basic",
    })
  })

  test("lists every missing key", () => {
    expect(() => toJmapSettings({ authMode: "basic" })).toThrow(
      "JMAP settings incomplete: missing baseUrl, username, credential, fromEmail"
    )
  })

  test("bearer does not need a username", () => {
    expect(
      toJmapSettings({ ...base, authMode: "bearer", username: "" }).authMode
    ).toBe("bearer")
  })
})

describe("authHeader", () => {
  test("encodes basic and bearer", () => {
    expect(authHeader(toJmapSettings(base))).toBe("Basic dTpw")
    expect(
      authHeader(
        toJmapSettings({ ...base, authMode: "bearer", credential: "t" })
      )
    ).toBe("Bearer t")
  })
})

describe("toSettingsUpdate", () => {
  const form = {
    baseUrl: "https://x",
    authMode: "basic",
    username: "u",
    credential: "",
    fromEmail: "a@x",
    fromName: "",
    replyTo: "",
  }

  test("nulls blanks but leaves a blank credential out", () => {
    const update = toSettingsUpdate(form)
    expect(update.fromName).toBeNull()
    expect("credential" in update).toBe(false)
  })

  test("sends a new credential", () => {
    expect(toSettingsUpdate({ ...form, credential: "s" }).credential).toBe("s")
  })
})
