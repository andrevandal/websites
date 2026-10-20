// @ts-nocheck
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

// The AWS SDK (used by EmDash's S3 storage) swaps Node-only files for
// fetch/web-stream ones through each package's "browser" field. The Workers
// build does not read that field, so it bundles the Node variants and S3 calls
// fail at runtime. This applies the mapping to relative imports inside
// @aws-sdk/* and @smithy/* packages only.
const sdkPackage = /[/\\]node_modules[/\\]@(?:aws-sdk|smithy)[/\\]/
const packageRoots = new Map()

const findPackage = file => {
  let dir = dirname(file)
  while (!packageRoots.has(dir)) {
    const manifest = join(dir, "package.json")
    if (existsSync(manifest)) {
      const pkg = JSON.parse(readFileSync(manifest, "utf8"))
      if (pkg.name) {
        packageRoots.set(dir, { dir, browser: pkg.browser })
        break
      }
    }
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
  return packageRoots.get(dir)
}

const awsSdkBrowserField = {
  name: "aws-sdk-browser-field",
  enforce: "pre",
  resolveId(source, importer) {
    if (!importer || !source.startsWith(".") || !sdkPackage.test(importer))
      return undefined
    const pkg = findPackage(importer)
    if (!pkg || typeof pkg.browser !== "object") return undefined
    const target = `./${relative(pkg.dir, resolve(dirname(importer), source))}`
    const withoutExtension = target.replace(/\.js$/, "")
    const mapped =
      pkg.browser[target] ??
      pkg.browser[withoutExtension] ??
      pkg.browser[`${withoutExtension}.js`]
    if (typeof mapped !== "string") return undefined
    const file = join(pkg.dir, mapped)
    return existsSync(file) ? file : `${file}.js`
  },
}

export { awsSdkBrowserField }
