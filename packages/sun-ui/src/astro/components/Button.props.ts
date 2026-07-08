import type { Polymorphic } from "astro/types"

type AllowedTags = "button" | "a"

type ButtonProps<Tag extends AllowedTags = AllowedTags> = Polymorphic<{
  as: Tag
}> & {
  block?: boolean
  centered?: boolean
  className?: string
}

export type { ButtonProps, AllowedTags }
