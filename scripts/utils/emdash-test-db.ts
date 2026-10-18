import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

// bunx must resolve the installed emdash (1.2.0), not a registry download,
// so it always runs from the repository root.
const repoRoot = resolve(import.meta.dir, "../..")

type EmDashTestDb = {
  directory: string
  databasePath: string
  uploadsDir: string
  seedPath: string
  cleanup: () => Promise<void>
}

const minimalSeed = {
  version: "1",
  meta: { name: "issue-197" },
  defaultLocale: "pt-BR",
  settings: { title: "Issue 197" },
  collections: [
    {
      slug: "posts",
      label: "Posts",
      labelSingular: "Post",
      fields: [{ slug: "title", label: "Title", type: "string" }],
    },
  ],
  content: {
    posts: [
      {
        id: "p1",
        slug: "hello",
        status: "published",
        data: { title: "Hello" },
      },
    ],
  },
}

const runEmDash = async (args: string[]): Promise<string> => {
  const child = Bun.spawn(["bunx", "emdash", ...args], {
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (code !== 0)
    throw new Error(`emdash ${args[0]} exited ${code}: ${stderr || stdout}`)

  return stdout
}

const seedEmDashDb = async (
  { seedPath, databasePath, uploadsDir }: Omit<EmDashTestDb, "cleanup">,
  seed: object
): Promise<void> => {
  await writeFile(seedPath, JSON.stringify(seed))
  await runEmDash([
    "seed",
    seedPath,
    "--database",
    databasePath,
    "--uploads-dir",
    uploadsDir,
  ])
}

// Isolated database created by the installed EmDash CLI, so real migrations,
// indexes and constraints apply. Seed more into it with `seedEmDashDb`.
const createEmDashTestDb = async (
  seed: object = minimalSeed
): Promise<EmDashTestDb> => {
  const directory = await mkdtemp(join(tmpdir(), "emdash-test-"))
  const db = {
    directory,
    databasePath: join(directory, "emdash.db"),
    uploadsDir: join(directory, "uploads"),
    seedPath: join(directory, "seed.json"),
  }
  await seedEmDashDb(db, seed)
  return {
    ...db,
    cleanup: () => rm(directory, { recursive: true, force: true }),
  }
}

export { createEmDashTestDb, minimalSeed, repoRoot, runEmDash, seedEmDashDb }
export type { EmDashTestDb }
