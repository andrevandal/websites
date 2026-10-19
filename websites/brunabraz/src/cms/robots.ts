const robotsRules = (adminText: string | undefined): string[] => [
  "Disallow: /_emdash/",
  ...(adminText ?? "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !/^sitemap\s*:/i.test(line)),
]

export { robotsRules }
