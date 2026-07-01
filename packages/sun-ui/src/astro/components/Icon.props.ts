import type { HTMLAttributes } from "astro/types"

type IconProps = {
  name: string
  width?: number | string
  height?: number | string
  class?: string
  style?: string | Record<string, string>
} & Omit<HTMLAttributes<"svg">, "style">

export type { IconProps }
