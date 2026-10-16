// An HTTP_DOMAINS entry is an exact hostname, or `*.suffix` to allow every
// subdomain of `suffix` at any depth (not `suffix` itself). The suffix needs
// at least two labels so `*.com` or `*.dev` can never be configured.
const WILDCARD_ENTRY = /^\*\.[a-z0-9-]+(?:\.[a-z0-9-]+)+$/

const isValidDomainEntry = (entry: string): boolean =>
  !entry.includes("*") || WILDCARD_ENTRY.test(entry)

const isAllowedDomain = (hostname: string, domains: string[]): boolean =>
  domains.some(domain =>
    domain.startsWith("*.")
      ? hostname.endsWith(domain.slice(1))
      : hostname === domain
  )

export { isAllowedDomain, isValidDomainEntry }
