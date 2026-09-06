import type { Polymorphic } from "astro/types"

export type YoutubeProps = Polymorphic<{
  as: "div"
}> & {
  videoId: string
  poster?: string
  posterQuality?: "max" | "high" | "default" | "low"
  params?: string
  playlabel?: string
  title?: string
}
