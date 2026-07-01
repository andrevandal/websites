import type { ButtonProps, AllowedTags } from "./Button.props.ts"

declare const SunButton: <Tag extends AllowedTags>(
  props: ButtonProps<Tag>
) => unknown
export default SunButton
export type { ButtonProps, AllowedTags }
