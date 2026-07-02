import type { AstroComponentFactory } from "astro/runtime/server/index"
import type { ButtonProps, AllowedTags } from "./Button.props.ts"

declare const SunButton: <Tag extends AllowedTags>(
  props: ButtonProps<Tag>
) => AstroComponentFactory
export default SunButton
export type { ButtonProps, AllowedTags }
