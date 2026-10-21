import { describe, expect, test } from "bun:test"
import { buildImageSrcSet } from "@vandal-websites/sun-ui/astro-image-service"
import { heroDesktop, heroMobile, heroDensities } from "#/data/hero"

describe("Belly Pão shared static integrations", () => {
  test("hero srcsets retain responsive widths and image aspect ratios", () => {
    for (const [image, expected] of [
      [
        heroDesktop,
        [
          640, 960, 1216, 1280, 1440, 1600, 1824, 1920, 2400, 2432, 2880, 3040,
          3648,
        ],
      ],
      [heroMobile, [375, 563, 640, 750, 938, 960, 1125, 1280, 1600, 1920]],
    ] as const) {
      const widths = new Set<number>()
      for (const width of [
        image.width,
        ...image.breakpoints.map(bp => bp.width),
      ]) {
        for (const entry of buildImageSrcSet({
          src: image.path,
          width,
          densities: heroDensities,
        }))
          widths.add(entry.transform.width as number)
      }
      const entries = buildImageSrcSet({
        src: image.path,
        width: image.width,
        height: image.height,
        quality: 90,
        format: "auto",
        widths: [...widths],
      })
      expect(entries.map(entry => entry.transform.width)).toEqual([...expected])
      for (const entry of entries) {
        expect(entry.transform.height).toBe(
          Math.round(
            ((entry.transform.width as number) * image.height) / image.width
          )
        )
      }
    }
  })
})
