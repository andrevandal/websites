import SunPTHeading from "./SunPTHeading.astro"
import SunPTImage from "./SunPTImage.astro"

// Portable Text renderers shared by every EmDash site. Sites spread this into
// the `components` prop of `emdash/ui` PortableText and add their own blocks.
// TODO (single-site or unused, not promoted yet): h4, h5, strong
// (pedrohenri); lists, blockquote, code, table, embed (no site).
const portableTextComponents = {
  block: { h2: SunPTHeading, h3: SunPTHeading },
  type: { image: SunPTImage },
}

export { portableTextComponents, SunPTHeading, SunPTImage }
