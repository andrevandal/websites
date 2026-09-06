import { readFile, stat, writeFile } from "node:fs/promises"
import { isAbsolute, relative, resolve } from "node:path"
import { optimize } from "svgo"
import svgoConfig from "../svgo.config"

const repositoryRoot = resolve(import.meta.dir, "..")

const displayPath = (filePath: string) => {
  const relativePath = relative(repositoryRoot, filePath)

  if (
    relativePath === "" ||
    relativePath.startsWith("..") ||
    isAbsolute(relativePath)
  )
    return filePath

  return relativePath
}

const expandInput = async (input: string) => {
  const matches = new Set<string>()
  const literalPath = isAbsolute(input) ? input : resolve(repositoryRoot, input)

  try {
    const metadata = await stat(literalPath)

    if (metadata.isFile()) {
      matches.add(resolve(literalPath))
      return matches
    }
  } catch {
    // Fall through to glob expansion for non-literal inputs.
  }

  const glob = new Bun.Glob(input)

  const scanOptions = isAbsolute(input)
    ? { absolute: true, onlyFiles: true }
    : { cwd: repositoryRoot, absolute: true, onlyFiles: true }

  for await (const match of glob.scan(scanOptions)) matches.add(resolve(match))

  if (matches.size === 0) throw new Error(`No files matched input: ${input}`)

  return matches
}

export const optimizeSvgFiles = async (inputs: readonly string[]) => {
  if (inputs.length === 0) throw new Error("No SVG input paths were provided")

  const matchedPaths = new Set<string>()
  for (const input of inputs) {
    for (const filePath of await expandInput(input))
      if (filePath.toLowerCase().endsWith(".svg")) matchedPaths.add(filePath)
  }

  const changes: { filePath: string; data: string }[] = []

  for (const filePath of [...matchedPaths].sort()) {
    const source = await readFile(filePath, "utf8")
    let optimizedData: string

    try {
      optimizedData = optimize(source, {
        ...svgoConfig,
        path: filePath,
      }).data
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to optimize ${filePath}: ${message}`, {
        cause: error,
      })
    }

    if (optimizedData !== source)
      changes.push({ filePath, data: optimizedData })
  }

  for (const change of changes) await writeFile(change.filePath, change.data)

  return changes.map(({ filePath }) => filePath)
}

const main = async () => {
  const changedPaths = await optimizeSvgFiles(Bun.argv.slice(2))

  for (const filePath of changedPaths) console.log(displayPath(filePath))
}

if (import.meta.main) {
  await main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
