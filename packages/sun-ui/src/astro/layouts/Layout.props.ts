import type { HTMLAttributes } from "astro/types"
import type { GtagConfig } from "../components/Gtag.props"

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
  /**
   * Render canonical, description, Open Graph and Twitter tags. Set `false`
   * when something else (e.g. EmDash's `EmDashHead`) renders them.
   */
  seoTags?: boolean
} & HTMLAttributes<"html">

export type { LayoutProps, GtagConfig }
