import { describe, expect, test } from "bun:test"
import { isBlockedPath } from "@/security/blocklist"

describe("isBlockedPath", () => {
  test.each([
    "/.git/config",
    "/.git/HEAD",
    "/.env",
    "/.aws/credentials",
    "/.ssh/id_rsa",
    "/.docker/config.json",
    "/wp-admin/setup.php",
    "/wp-includes/id3/license.txt/blog/wp-includes/wlwmanifest.xml",
    "/wp-login.php",
    "/xmlrpc.php",
    "/actuator/env",
    "/phpmyadmin/index.php",
    "/key.json",
    "/config.json",
    "/credentials.json",
    "/firebase.json",
    "/id_rsa",
    "/id_rsa.pub",
    "/eval-stdin.php",
  ])("blocks known exploit-probe path %s", path => {
    expect(isBlockedPath(path)).toBe(true)
  })

  test.each([
    "/f_webp,w_100/https://example.com/photo.jpg",
    "/healthy",
    "/favicon.ico",
    "/robots.txt",
    "/.well-known/appspecific/com.chrome.devtools.json",
  ])("allows legitimate path %s", path => {
    expect(isBlockedPath(path)).toBe(false)
  })
})
