import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
import { afterEach, describe, expect, test } from "bun:test"
import { optimizeSvgFiles } from "./optimizeSvg"

const repositoryRoot = resolve(import.meta.dir, "..")
const temporaryDirectories: string[] = []

const createTemporaryDirectory = async () => {
  const directory = await mkdtemp(join(repositoryRoot, ".optimize-svg-"))
  temporaryDirectories.push(directory)
  return directory
}

const runOptimizeSvg = async (args: readonly string[]) => {
  const child = Bun.spawn(["bun", "run", "optimize:svg", "--", ...args], {
    cwd: repositoryRoot,
    stderr: "pipe",
    stdout: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])

  return { exitCode, stderr, stdout }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(directory => rm(directory, { recursive: true, force: true }))
  )
})

describe("optimizeSvgFiles", () => {
  test("rewrites literal SVG inputs in lexical order and reports only first-pass changes", async () => {
    const directory = await createTemporaryDirectory()
    const firstPath = join(directory, "first.svg")
    const secondPath = join(directory, "second.svg")
    const source = `<!-- remove me --><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="0" y="0" width="24" height="24" fill="#000000" /></svg>`

    await writeFile(firstPath, source)
    await writeFile(secondPath, source)

    const changedPaths = await optimizeSvgFiles([secondPath, firstPath])
    const [firstOutput, secondOutput] = await Promise.all([
      readFile(firstPath, "utf8"),
      readFile(secondPath, "utf8"),
    ])

    expect(changedPaths).toEqual([firstPath, secondPath].sort())
    expect(firstOutput).not.toContain("remove me")
    expect(firstOutput).toContain("<path")
    expect(secondOutput).not.toContain("remove me")
    expect(secondOutput).toContain("<path")
    expect(await optimizeSvgFiles([firstPath, secondPath])).toEqual([])
  })

  test("preserves viewBox, xmlns, title, and script elements while inlining styles", async () => {
    const directory = await createTemporaryDirectory()
    const svgPath = join(directory, "preserve.svg")

    await writeFile(
      svgPath,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20"><title>Preserved title</title><style>.shape { fill: #123456; }</style><script>window.svgFixture = true;</script><path class="shape" d="M 0 0 L 10 20" /></svg>`
    )

    await optimizeSvgFiles([svgPath])

    const output = await readFile(svgPath, "utf8")
    expect(output).toContain('viewBox="0 0 10 20"')
    expect(output).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(output).toContain("<title>Preserved title</title>")
    expect(output).toContain('style="fill:#123456"')
    expect(output).toContain("<script>")
  })

  test("uses three decimal places for path data and five for transforms", async () => {
    const directory = await createTemporaryDirectory()
    const svgPath = join(directory, "precision.svg")

    await writeFile(
      svgPath,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><path id="shape" d="M0.123456 0.654321 L20.987654 30.123456" /></defs><use href="#shape" transform="matrix(1.1234567 0 0 1.2345678 2.3456789 3.4567891)" /></svg>`
    )

    await optimizeSvgFiles([svgPath])

    const output = await readFile(svgPath, "utf8")
    const pathData = output.match(/\sd="(?<data>[^"]+)"/)?.[1]
    const transform = output.match(/\stransform="(?<transform>[^"]+)"/)?.[1]

    if (!pathData || !transform)
      throw new Error("Expected optimized path data and transform attributes")

    expect(pathData).not.toMatch(/\.\d{4,}/)
    expect(transform).toContain("matrix(1.12346 0 0 1.23457 2.346 3.457)")
    expect(transform).not.toMatch(/\.\d{6,}/)
  })

  test("runs through the public CLI and rejects missing arguments", async () => {
    const directory = await createTemporaryDirectory()
    const svgPath = join(directory, "cli.svg")
    const relativeSvgPath = relative(repositoryRoot, svgPath)

    await writeFile(
      svgPath,
      `<!-- remove me --><svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" /></svg>`
    )

    const result = await runOptimizeSvg([relativeSvgPath])
    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe(relativeSvgPath)
    expect(await readFile(svgPath, "utf8")).not.toContain("remove me")

    const missingInput = await runOptimizeSvg([])
    expect(missingInput.exitCode).not.toBe(0)
    expect(missingInput.stderr).toMatch(/no svg input paths/i)
  })

  test("rejects an unmatched input", async () => {
    const directory = await createTemporaryDirectory()

    await expect(
      optimizeSvgFiles([join(directory, "missing-*.svg")])
    ).rejects.toThrow(/no files matched/i)
  })

  test("rejects malformed SVG markup", async () => {
    const directory = await createTemporaryDirectory()
    const svgPath = join(directory, "malformed.svg")

    await writeFile(svgPath, `<svg><path></svg>`)

    await expect(optimizeSvgFiles([svgPath])).rejects.toThrow()
  })

  test("ignores inputs that are not SVG files", async () => {
    const directory = await createTemporaryDirectory()
    const textPath = join(directory, "notes.txt")

    await writeFile(textPath, "not an SVG")

    await expect(optimizeSvgFiles([textPath])).resolves.toEqual([])
  })
})
