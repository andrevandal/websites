import eslintPluginAstro from "eslint-plugin-astro"
import oxlint from "eslint-plugin-oxlint"
import tsParser from "@typescript-eslint/parser"
import tseslint from "typescript-eslint"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import globals from "globals"
import svelte from "eslint-plugin-svelte"

import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores([
    "**/*.ts",
    "**/*.js",
    "**/*.tsx",
    "**/*.jsx",
    "!**/*.astro",
    "!**/*.svelte",
    "!**/*.svelte.ts",
    "**/dist/**",
    "**/node_modules/**",
    "**/.moon/cache/**",
  ]),
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
  svelte.configs.recommended,
  {
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        extraFileExtensions: [".svelte"],
        parser: tsParser,
      },
    },
  },
  ...oxlint.buildFromOxlintConfigFile(
    resolve(dirname(fileURLToPath(import.meta.url)), ".oxlintrc.json")
  ),
])
