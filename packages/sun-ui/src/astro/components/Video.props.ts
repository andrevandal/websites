type SunVideoSources = {
  mp4: string
  webm?: string
}

type SunVideoCommon = {
  /** Video source URLs. `webm`, when present, is preferred over `mp4`. */
  sources: SunVideoSources
  /** Poster image source, run through the same image-optimization pipeline as `SunPicture`. */
  poster: string
  /** Reserved render box (px) — prevents layout shift, same contract as `SunPictureProps.width`/`height`. */
  width: number
  height: number
  /** Accessible name for the video / its play control. */
  title: string
  /** Class applied to the rendered `<video>` (non-autoplay mode) or poster `<img>` (autoplay mode). */
  class?: string
  /** Class applied to the wrapping element. */
  wrapperClass?: string
}

type SunVideoProps =
  | (SunVideoCommon & { autoplay?: false })
  | (SunVideoCommon & {
      autoplay: true
      /** Alt text for the `SunPicture`-rendered poster `<img>`. Required only in autoplay mode. */
      posterAlt: string
      /** Accessible label for the fallback tap-to-play button. Defaults to `"Play"`. */
      playlabel?: string
    })

export type { SunVideoProps, SunVideoSources }
