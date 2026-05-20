import eslintPluginAstro from "eslint-plugin-astro"
import oxlint from "eslint-plugin-oxlint"
import tsParser from "@typescript-eslint/parser"
import tseslint from "typescript-eslint"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["**/*", "!**/*.astro"]),
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.moon/cache/**"],
  },
  {
    plugins: { "@typescript-eslint": tseslint.plugin },
  },
  ...eslintPluginAstro.configs["flat/recommended"],
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  ...oxlint.buildFromOxlintConfigFile(
    resolve(dirname(fileURLToPath(import.meta.url)), ".oxlintrc.json")
  ),
])
