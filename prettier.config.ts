import type { Config } from "prettier"

const config: Config = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: false,
  trailingComma: "es5",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "avoid",
  endOfLine: "lf",
  embeddedLanguageFormatting: "auto",
  plugins: [
    "@prettier/plugin-oxc",
    "prettier-plugin-astro",
    "prettier-plugin-tailwindcss",
  ],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
}

export default config
