import { describe, expect, it } from "bun:test"
import { renderAstro } from "../../../tests/astro-loader"

const componentUrl = new URL("./Figure.astro", import.meta.url)

describe("SunFigure", () => {
  it("renders the caption below by default", async () => {
    const html = await renderAstro(componentUrl, {
      props: { caption: "A caption", captionClass: "cap" },
      slots: { default: "<img>" },
    })
    expect(html).toMatch(/<figure class="sun-figure[^"]*"/)
    expect(html).not.toContain("sun-figure--overlay")
    expect(html).toMatch(
      /<img>\s*<figcaption class="cap[^"]*">A caption<\/figcaption>/
    )
  })

  it("marks overlay captions and alignment", async () => {
    const html = await renderAstro(componentUrl, {
      props: { caption: "x", captionPlacement: "overlay", align: "left" },
    })
    expect(html).toContain("sun-figure--overlay")
    expect(html).toContain("sun-figure--left")
  })

  it("omits the caption and style when not given", async () => {
    const html = await renderAstro(componentUrl, {
      slots: { default: "<img>" },
    })
    expect(html).not.toContain("figcaption")
    expect(html).not.toContain("style=")
  })

  it("caps width through --cap and keeps a custom style", async () => {
    const html = await renderAstro(componentUrl, {
      props: { maxWidth: 400, style: "color: red" },
    })
    expect(html).toContain('style="--cap: 400px; color: red"')
  })
})
