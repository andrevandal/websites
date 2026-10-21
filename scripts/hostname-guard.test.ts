import { isUtf8 } from "node:buffer"
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test, expect } from "bun:test"

const serviceDomain = ["vandal", "services"].join(".")

const privateHostnames = (text: string): string[] => {
  const tokens = text.matchAll(
    /(?:[a-z][a-z\d+.-]*:)?\/\/[^\s"'`<>]+|(?<![a-z\d_.@/-])(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}\.?(?![a-z\d_.-])/gi
  )
  const hosts: string[] = []
  for (const [token] of tokens) {
    let host = token
    if (token.includes("//")) {
      const url = (token.startsWith("//") ? `https:${token}` : token).replace(
        /[),.;\]}]+$/,
        ""
      )
      if (!URL.canParse(url)) continue
      host = new URL(url).hostname
    }
    host = host.toLowerCase().replace(/\.$/, "")
    if (
      (host !== `files.${serviceDomain}` &&
        (host === serviceDomain || host.endsWith(`.${serviceDomain}`))) ||
      /^images\.[a-z\d-]+\.dev$/.test(host)
    )
      hosts.push(host)
  }
  return hosts
}

describe("hostname guard", () => {
  const privateHost = ["internal", serviceDomain].join(".")
  const nestedHost = ["nested", privateHost].join(".")

  test.each([
    [privateHost, privateHost],
    [`https://${privateHost}/asset.png`, privateHost],
    [`https://${nestedHost.toUpperCase()}.:443/path`, nestedHost],
    [`(${privateHost.toUpperCase()}.)`, privateHost],
    [`(https://${privateHost})`, privateHost],
    [`//${privateHost}/path`, privateHost],
    [serviceDomain, serviceDomain],
    [
      ["images", "retired-example", "dev"].join("."),
      "images.retired-example.dev",
    ],
  ])("rejects private hostname in %s", (text, expected) => {
    expect(privateHostnames(text)).toEqual([expected])
  })

  test.each([
    "https://files.vandal.services/bellypao/logo.png",
    `https://files.vandal.services/${privateHost}?next=https://${nestedHost}`,
    `https://files.vandal.services/?host=${privateHost}`,
    "FILES.VANDAL.SERVICES.",
    `https://files.${serviceDomain}.example.invalid/path`,
    `prefix${serviceDomain}`,
    "https://bellypao.com.br",
    "https://pedrohenri.design",
  ])("allows public or unrelated hostname in %s", text => {
    expect(privateHostnames(text)).toEqual([])
  })

  test("tracked text contains no private service hostnames", () => {
    const root = resolve(import.meta.dir, "..")
    const paths = execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean)
    const violations: string[] = []
    for (const path of paths) {
      if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path)) continue
      if (!existsSync(resolve(root, path))) continue
      const bytes = readFileSync(resolve(root, path))
      if (bytes.includes(0) || !isUtf8(bytes)) continue
      for (const host of privateHostnames(bytes.toString("utf8")))
        violations.push(`${path}: ${host}`)
    }
    expect(violations).toEqual([])
  })
})
