import { afterEach, expect, test } from "bun:test"
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const fixtureDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    fixtureDirs.splice(0).map(dir => rm(dir, { force: true, recursive: true }))
  )
})

test("forwards --debug to Moon's debug log level", async () => {
  const fixtureDir = await mkdtemp(join(tmpdir(), "dev-script-"))
  fixtureDirs.push(fixtureDir)

  const moonArgsPath = join(fixtureDir, "moon-args.txt")
  const moonPath = join(fixtureDir, "moon")
  await writeFile(
    moonPath,
    `#!/bin/sh
if [ "$1" = "query" ]; then
  printf '%s\\n' '{"projects":[{"id":"transportugal","source":"websites/transportugal","tasks":{"dev":{}}}]}'
else
  printf '%s\\n' "$*" > "$MOON_ARGS_PATH"
fi
`
  )
  await chmod(moonPath, 0o755)

  const result = Bun.spawn(
    ["bun", "scripts/dev.ts", "transportugal", "--debug"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        MOON_ARGS_PATH: moonArgsPath,
        PATH: `${fixtureDir}:${process.env.PATH ?? ""}`,
      },
    }
  )
  await result.exited

  expect(result.exitCode).toBe(0)
  expect(await readFile(moonArgsPath, "utf8")).toBe(
    "run transportugal:dev --log debug\n"
  )
})
