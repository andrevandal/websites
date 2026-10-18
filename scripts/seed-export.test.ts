import { Database } from "bun:sqlite"
import { afterEach, expect, test } from "bun:test"
import { createEmDashTestDb, runEmDash } from "./utils/emdash-test-db"
import type { EmDashTestDb } from "./utils/emdash-test-db"

const databases: EmDashTestDb[] = []
afterEach(async () => {
  await Promise.all(databases.splice(0).map(db => db.cleanup()))
})

test("exporting an edited database, then importing, preserves the edit", async () => {
  const source = await createEmDashTestDb()
  databases.push(source)
  const db = new Database(source.databasePath)
  try {
    db.query("UPDATE ec_posts SET title = ? WHERE slug = ?").run(
      "issue197-edited",
      "hello"
    )
  } finally {
    db.close()
  }

  // No seed between the edit and export: export the edited database itself.
  const exported = JSON.parse(
    await runEmDash([
      "export-seed",
      "--database",
      source.databasePath,
      "--with-content=all",
    ])
  )
  const imported = await createEmDashTestDb(exported)
  databases.push(imported)
  const second = new Database(imported.databasePath, { readonly: true })
  try {
    expect(
      second
        .query("SELECT title, status FROM ec_posts WHERE slug = ?")
        .get("hello")
    ).toEqual({ title: "issue197-edited", status: "published" })
  } finally {
    second.close()
  }
}, 30_000)
