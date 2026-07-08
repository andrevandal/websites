const API_BASE = "https://api.cloudflare.com/client/v4"

type CfListResponse<T> = {
  success: boolean
  errors: { code: number; message: string }[]
  result: T[]
  result_info?: { page: number; total_pages: number }
}

type CfItemResponse<T> = {
  success: boolean
  errors: { code: number; message: string }[]
  result: T | null
}

type KvNamespace = {
  id: string
  title: string
}

const requireEnv = (name: string) => {
  const value = process.env[name]

  if (!value) throw new Error(`Missing required environment variable: ${name}`)

  return value
}

const cfFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const apiToken = requireEnv("CLOUDFLARE_API_TOKEN")

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  const body = (await res.json()) as { success: boolean; errors: unknown[] }

  if (!res.ok || !body.success) {
    throw new Error(
      `Cloudflare API request failed (${res.status} ${path}): ${JSON.stringify(body.errors)}`
    )
  }

  return body as T
}

export const listKvNamespaces = async (): Promise<KvNamespace[]> => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  const namespaces: KvNamespace[] = []
  let page = 1

  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- each page depends on the previous page's total_pages
    const res = await cfFetch<CfListResponse<KvNamespace>>(
      `/accounts/${accountId}/storage/kv/namespaces?page=${page}&per_page=100`
    )

    namespaces.push(...res.result)

    if (!res.result_info || res.result_info.page >= res.result_info.total_pages)
      break

    page += 1
  }

  return namespaces
}

export const findKvNamespaceByTitle = async (
  title: string
): Promise<KvNamespace | undefined> => {
  const namespaces = await listKvNamespaces()

  return namespaces.find(ns => ns.title === title)
}

export const createKvNamespace = async (
  title: string
): Promise<KvNamespace> => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")

  const res = await cfFetch<CfItemResponse<KvNamespace>>(
    `/accounts/${accountId}/storage/kv/namespaces`,
    {
      method: "POST",
      body: JSON.stringify({ title }),
    }
  )

  if (!res.result) throw new Error(`Failed to create KV namespace "${title}"`)

  return res.result
}

export const findOrCreateKvNamespace = async (
  title: string
): Promise<{ namespace: KvNamespace; created: boolean }> => {
  const existing = await findKvNamespaceByTitle(title)

  if (existing) return { namespace: existing, created: false }

  return { namespace: await createKvNamespace(title), created: true }
}

export const deleteKvNamespaceByTitle = async (
  title: string
): Promise<boolean> => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  const existing = await findKvNamespaceByTitle(title)

  if (!existing) return false

  await cfFetch<CfItemResponse<null>>(
    `/accounts/${accountId}/storage/kv/namespaces/${existing.id}`,
    { method: "DELETE" }
  )

  return true
}
