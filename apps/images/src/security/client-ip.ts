// Cloudflare's published edge IP ranges — https://www.cloudflare.com/ips-v4
// and https://www.cloudflare.com/ips-v6, fetched 2026-07-03. Used to decide
// whether the CF-Connecting-IP header can be trusted for a given request:
// only when the raw TCP peer is actually one of Cloudflare's own edges,
// since that header is otherwise trivially spoofable by a direct request.
const CLOUDFLARE_IPV4_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
]

const CLOUDFLARE_IPV6_RANGES = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
]

const parseIpv4 = (ip: string): number | null => {
  const parts = ip.split(".")
  if (parts.length !== 4) return null

  let value = 0
  for (const part of parts) {
    const num = Number(part)
    if (!Number.isInteger(num) || num < 0 || num > 255) return null
    value = (value << 8) | num
  }

  return value >>> 0
}

const matchesIpv4Cidr = (ip: string, cidr: string): boolean => {
  const [network, prefixStr] = cidr.split("/")
  const prefix = parseInt(prefixStr ?? "", 10)
  const ipVal = parseIpv4(ip)
  const netVal = network ? parseIpv4(network) : null
  if (ipVal === null || netVal === null) return false

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ipVal & mask) === (netVal & mask)
}

const parseIpv6 = (ip: string): bigint | null => {
  const sides = ip.split("::")
  if (sides.length > 2) return null

  const head = sides[0] ? sides[0].split(":") : []
  const tail = sides.length === 2 && sides[1] ? sides[1].split(":") : []
  const missing = 8 - head.length - tail.length
  if (missing < 0) return null

  const groups = [...head, ...Array(missing).fill("0"), ...tail]
  if (groups.length !== 8) return null

  let value = 0n
  for (const group of groups) {
    const num = parseInt(group || "0", 16)
    if (isNaN(num) || num < 0 || num > 0xffff) return null
    value = (value << 16n) | BigInt(num)
  }

  return value
}

const matchesIpv6Cidr = (ip: string, cidr: string): boolean => {
  const [network, prefixStr] = cidr.split("/")
  const prefix = BigInt(parseInt(prefixStr ?? "", 10))
  const ipVal = parseIpv6(ip)
  const netVal = network ? parseIpv6(network) : null
  if (ipVal === null || netVal === null) return false

  const shift = 128n - prefix
  return ipVal >> shift === netVal >> shift
}

const isCloudflareIp = (ip: string): boolean =>
  ip.includes(":")
    ? CLOUDFLARE_IPV6_RANGES.some(cidr => matchesIpv6Cidr(ip, cidr))
    : CLOUDFLARE_IPV4_RANGES.some(cidr => matchesIpv4Cidr(ip, cidr))

const UNKNOWN_CLIENT_IP = "unknown"

const isIpv4 = (value: string): boolean => parseIpv4(value) !== null

const isIpv6 = (value: string): boolean =>
  value.includes(":") && parseIpv6(value) !== null

const isIp = (value: string): boolean => isIpv4(value) || isIpv6(value)

// "::ffff:172.18.0.3" is how Bun reports an IPv4 peer on a dual-stack socket.
const unmapIpv4 = (ip: string): string =>
  ip.toLowerCase().startsWith("::ffff:") && ip.includes(".") ? ip.slice(7) : ip

const isValidCidr = (cidr: string): boolean => {
  const [network, prefixStr, ...rest] = cidr.split("/")
  if (!network || prefixStr === undefined || rest.length > 0) return false
  if (!/^\d+$/.test(prefixStr)) return false

  const prefix = parseInt(prefixStr, 10)
  if (isIpv4(network)) return prefix <= 32
  if (isIpv6(network)) return prefix <= 128
  return false
}

const isInCidrs = (ip: string, cidrs: string[]): boolean =>
  cidrs.some(cidr => {
    const network = cidr.split("/")[0] ?? ""
    if (ip.includes(":") !== network.includes(":")) return false
    return ip.includes(":")
      ? matchesIpv6Cidr(ip, cidr)
      : matchesIpv4Cidr(ip, cidr)
  })

// The last X-Forwarded-For entry is the address the closest proxy saw, so a
// client cannot influence it by sending its own header.
const lastForwardedHop = (forwardedFor: string | undefined): string | null => {
  const hop = forwardedFor?.split(",").pop()?.trim()
  if (!hop) return null

  const ip = unmapIpv4(hop)
  return isIp(ip) ? ip : null
}

type ClientIpOptions = {
  /** CIDRs of reverse proxies (e.g. Traefik) whose X-Forwarded-For is trusted. */
  trustedProxyCidrs?: string[]
  forwardedFor?: string
}

const getClientIp = (
  remoteAddress: string | undefined,
  cfConnectingIp: string | undefined,
  trustCloudflareIps: boolean,
  options: ClientIpOptions = {}
): string => {
  if (!remoteAddress) return cfConnectingIp ?? UNKNOWN_CLIENT_IP

  const { trustedProxyCidrs = [], forwardedFor } = options
  const peer = unmapIpv4(remoteAddress)

  // Behind a reverse proxy the raw peer is the proxy for every visitor, so one
  // scanner's strikes would ban the proxy and lock everyone out. Resolve the
  // visitor from the hop the proxy saw instead; CF-Connecting-IP still needs
  // that hop to be a Cloudflare edge, so it cannot be forged on a direct hit.
  if (trustedProxyCidrs.length > 0 && isInCidrs(peer, trustedProxyCidrs)) {
    const hop = lastForwardedHop(forwardedFor)
    if (!hop) return peer
    if (trustCloudflareIps && cfConnectingIp && isCloudflareIp(hop))
      return cfConnectingIp
    return hop
  }

  if (trustCloudflareIps && cfConnectingIp && isCloudflareIp(remoteAddress))
    return cfConnectingIp

  return remoteAddress
}

export { getClientIp, isCloudflareIp, isValidCidr, UNKNOWN_CLIENT_IP }
