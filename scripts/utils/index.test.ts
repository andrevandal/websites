import { afterEach, expect, test } from "bun:test"
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const fixtures: string[] = []

afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map(path => rm(path, { recursive: true }))
  )
})

test("deploy targets use project source paths, not the shared package scope", async () => {
  const directory = await mkdtemp(join(tmpdir(), "website-targets-"))
  fixtures.push(directory)
  const moon = join(directory, "moon")
  await writeFile(moon, "#!/bin/sh\nprintf '%s\\n' \"$MOON_PROJECTS\"\n")
  await chmod(moon, 0o755)
  const projects = [
    {
      id: "pedrohenridesign",
      source: "websites/pedrohenridesign",
      aliases: [{ alias: "@vandal-websites/pedrohenridesign" }],
    },
    {
      id: "clinicamauricioaraujo",
      source: "websites/clinicamauricioaraujo",
      aliases: [{ alias: "@vandal-websites/clinicamauricioaraujo" }],
    },
    {
      id: "images",
      source: "apps/images",
      aliases: [{ alias: "@vandal-websites/images-app" }],
    },
    {
      id: "sun-ui",
      source: "packages/sun-ui",
      aliases: [{ alias: "@vandal-websites/sun-ui" }],
    },
  ]
  const result = Bun.spawn(
    [
      process.execPath,
      "--eval",
      `import { queryTargets } from ${JSON.stringify(join(import.meta.dir, "index.ts"))}; console.log(JSON.stringify(await queryTargets()))`,
    ],
    {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH ?? ""}`,
        MOON_PROJECTS: JSON.stringify({ projects }),
      },
      stdout: "pipe",
      stderr: "pipe",
    }
  )
  const targets = JSON.parse(await new Response(result.stdout).text())
  expect(await result.exited).toBe(0)
  expect(targets).toEqual({
    pedrohenridesign: {
      id: "pedrohenridesign",
      location: ["websites", "pedrohenridesign"],
    },
    clinicamauricioaraujo: {
      id: "clinicamauricioaraujo",
      location: ["websites", "clinicamauricioaraujo"],
    },
    images: { id: "images", location: ["apps", "images"] },
  })
})
