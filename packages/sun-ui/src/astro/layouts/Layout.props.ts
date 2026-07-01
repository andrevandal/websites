import type { HTMLAttributes } from "astro/types"

type GtagConfig = {
  googleAnalyticsId?: string
  conversionId?: string
  conversionLabel?: string
}

type LayoutProps = {
  title: string
  description?: string
  image?: string
  url: URL
  schema?: Record<string, unknown>
  links?: HTMLAttributes<"link">[]
  themeColor?: string
  sitemap?: string
  gtag?: GtagConfig
} & HTMLAttributes<"html">

export type { LayoutProps, GtagConfig }
