import { afterEach, describe, expect, it } from "bun:test"
import { renderAstro } from "../../../tests/astro-loader"
import type { SunPictureProps } from "./Picture.props"

const originalBaseUrl = process.env.IMAGES_BASE_URL
const componentUrl = new URL("./Picture.astro", import.meta.url)
const fallback = {
  src: "https://assets.example/fallback.jpg",
  alt: "Fallback image",
  width: 100,
  height: 50,
  densities: [1],
} satisfies SunPictureProps

const script = `<script type="module" src="${componentUrl.pathname}?astro&type=script&index=0&lang.ts"></script>`
const normalizeIntertagWhitespace = (html: string): string =>
  html.replace(/>\s+</g, "><")

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env.IMAGES_BASE_URL
  else process.env.IMAGES_BASE_URL = originalBaseUrl
})

describe("Picture no-sources parity", () => {
  it("preserves raw no-service output", async () => {
    delete process.env.IMAGES_BASE_URL
    const html = await renderAstro(componentUrl, { props: fallback })
    expect(normalizeIntertagWhitespace(html)).toBe(
      normalizeIntertagWhitespace(`<div class="sun-picture relative isolate block overflow-hidden astro-rbm6lpf6" style="--ratio:100/50">
  <img src="https://assets.example/fallback.jpg" alt="Fallback image" width="100" height="50" class="aspect-(--ratio) astro-rbm6lpf6">
</div>



${script}`)
    )
  })

  it("preserves service density placeholder and fallback attributes", async () => {
    process.env.IMAGES_BASE_URL = "https://images.example"
    const html = await renderAstro(componentUrl, {
      props: {
        ...fallback,
        densities: [1, 2],
        placeholderMode: "circle",
        loading: "eager",
        decoding: "sync",
        fetchpriority: "high",
        class: "caller-image",
        wrapperClass: "caller-wrapper",
        "data-image": "hero",
      },
    })
    expect(normalizeIntertagWhitespace(html)).toBe(
      normalizeIntertagWhitespace(`<div class="sun-picture relative isolate block overflow-hidden caller-wrapper astro-rbm6lpf6" data-sun-picture-placeholder data-sun-picture-placeholder-mode="circle" style="--sun-picture-placeholder-url:url(&quot;https://images.example/_/https%3A%2F%2Fassets.example%2Ffallback.jpg?placeholder&quot;);--ratio:100/50">
  <img src="https://images.example/w_100,h_50/https%3A%2F%2Fassets.example%2Ffallback.jpg" srcset="https://images.example/w_100,h_50/https%3A%2F%2Fassets.example%2Ffallback.jpg 1x, https://images.example/w_200,h_100/https%3A%2F%2Fassets.example%2Ffallback.jpg 2x" alt="Fallback image" loading="eager" decoding="sync" class="aspect-(--ratio) caller-image astro-rbm6lpf6" fetchpriority="high" data-image="hero">
</div>

<noscript><style>.sun-picture[data-sun-picture-placeholder]::before{display:none!important}</style></noscript>

${script}`)
    )
  })

  it("preserves breakpoint output with explicit fallback sizes override", async () => {
    process.env.IMAGES_BASE_URL = "https://images.example"
    const html = await renderAstro(componentUrl, {
      props: {
        ...fallback,
        placeholder: false,
        breakpoints: [{ minWidth: 800, width: 200 }],
        sizes: "100vw",
      },
    })
    expect(normalizeIntertagWhitespace(html)).toBe(
      normalizeIntertagWhitespace(`<div class="sun-picture relative isolate block overflow-hidden astro-rbm6lpf6" style="--ratio:100/50">
  <img src="https://images.example/w_100,h_50/https%3A%2F%2Fassets.example%2Ffallback.jpg" srcset="https://images.example/w_100,h_50/https%3A%2F%2Fassets.example%2Ffallback.jpg 100w, https://images.example/w_200,h_100/https%3A%2F%2Fassets.example%2Ffallback.jpg 200w" sizes="(min-width: 800px) 200px, 100px" alt="Fallback image" class="aspect-(--ratio) astro-rbm6lpf6" sizes="100vw">
</div>



${script}`)
    )
  })

  it("uses a checkout-independent generated scope class", async () => {
    delete process.env.IMAGES_BASE_URL
    const html = await renderAstro(componentUrl, { props: fallback })
    expect(html).toContain(
      'class="sun-picture relative isolate block overflow-hidden astro-rbm6lpf6"'
    )
  })
})

describe("Picture art direction", () => {
  const portrait = {
    media: "(max-width: 600px)",
    src: "https://assets.example/portrait.jpg",
    width: 100,
    height: 200,
    breakpoints: [{ minWidth: 400, width: 200 }],
  }
  const landscape = {
    media: "(min-width: 601px)",
    src: "https://assets.example/landscape.jpg",
    width: 300,
    height: 100,
  }

  it("renders empty sources exactly like omitted sources", async () => {
    process.env.IMAGES_BASE_URL = "https://images.example"
    expect(
      await renderAstro(componentUrl, { props: { ...fallback, sources: [] } })
    ).toBe(await renderAstro(componentUrl, { props: fallback }))
  })

  it("renders ordered service sources before one fallback img with no nested wrapper", async () => {
    process.env.IMAGES_BASE_URL = "https://images.example"
    const html = await renderAstro(componentUrl, {
      props: {
        ...fallback,
        sources: [portrait, landscape],
        breakpoints: [{ minWidth: 800, width: 400 }],
        sizes: "100vw",
        placeholder: false,
      },
    })
    expect(html).toStartWith(
      '<picture class="sun-picture relative isolate block overflow-hidden'
    )
    const sources = [...html.matchAll(/<source\b[^>]*>/g)].map(
      match => match[0]
    )
    expect(sources).toEqual([
      '<source media="(max-width: 600px)" srcset="https://images.example/w_100,h_200/https%3A%2F%2Fassets.example%2Fportrait.jpg 100w, https://images.example/w_200,h_400/https%3A%2F%2Fassets.example%2Fportrait.jpg 200w" sizes="(min-width: 400px) 200px, 100px" width="100" height="200" class="astro-rbm6lpf6">',
      '<source media="(min-width: 601px)" srcset="https://images.example/w_300,h_100/https%3A%2F%2Fassets.example%2Flandscape.jpg 1x" width="300" height="100" class="astro-rbm6lpf6">',
    ])
    expect(html.match(/<img\b/g)).toHaveLength(1)
    expect(html).not.toContain("<div")
    expect(html.indexOf(sources[1]!)).toBeLessThan(html.indexOf("<img"))
    expect(html).toContain("</picture>")
    const [img] = html.match(/<img\b[^>]*>/)!
    expect(img).toContain('width="100" height="50"')
    expect(img).toContain('sizes="100vw"')
    expect(img).not.toMatch(/\b(?:sources|media|breakpoints|densities)=/)
    expect([...img.matchAll(/\bsizes=/g)]).toHaveLength(1)
  })

  it("shares global quality format fit and string densities across source and fallback", async () => {
    process.env.IMAGES_BASE_URL = "https://images.example"
    const html = await renderAstro(componentUrl, {
      props: {
        ...fallback,
        sources: [landscape],
        densities: ["1.5x"],
        quality: "high",
        format: "avif",
        fit: "cover",
        placeholder: false,
      },
    })
    expect(html).toContain(
      '<source media="(min-width: 601px)" srcset="https://images.example/w_450,h_150,f_avif,q_80,mode_crop/https%3A%2F%2Fassets.example%2Flandscape.jpg 1.5x"'
    )
    expect(html).toContain(
      'srcset="https://images.example/w_150,h_75,f_avif,q_80,mode_crop/https%3A%2F%2Fassets.example%2Ffallback.jpg 1.5x"'
    )
  })

  it("renders raw sources and fallback intrinsic dimensions without a service", async () => {
    delete process.env.IMAGES_BASE_URL
    const html = await renderAstro(componentUrl, {
      props: {
        ...fallback,
        sources: [portrait, landscape],
        class: "caller-image",
      },
    })
    expect(html).toStartWith("<picture")
    expect(html).toContain(
      '<source media="(max-width: 600px)" srcset="https://assets.example/portrait.jpg" sizes="(min-width: 400px) 200px, 100px" width="100" height="200"'
    )
    expect(html).toContain(
      '<source media="(min-width: 601px)" srcset="https://assets.example/landscape.jpg" width="300" height="100"'
    )
    expect(html).toContain(
      '<img src="https://assets.example/fallback.jpg" alt="Fallback image" width="100" height="50" class="caller-image astro-rbm6lpf6">'
    )
    expect(html).not.toContain("aspect-(--ratio)")
    expect(html).not.toContain("<noscript>")
    expect(html).not.toContain("data-sun-picture-placeholder")
  })

  it("uses five default fallback density candidates", async () => {
    process.env.IMAGES_BASE_URL = "https://images.example"
    const html = await renderAstro(componentUrl, {
      props: { ...fallback, densities: undefined, placeholder: false },
    })
    expect(html).toContain(
      'srcset="https://images.example/w_100,h_50/https%3A%2F%2Fassets.example%2Ffallback.jpg 1x, https://images.example/w_150,h_75/https%3A%2F%2Fassets.example%2Ffallback.jpg 1.5x, https://images.example/w_200,h_100/https%3A%2F%2Fassets.example%2Ffallback.jpg 2x, https://images.example/w_250,h_125/https%3A%2F%2Fassets.example%2Ffallback.jpg 2.5x, https://images.example/w_300,h_150/https%3A%2F%2Fassets.example%2Ffallback.jpg 3x"'
    )
  })

  it("preserves explicit empty fallback density override", async () => {
    process.env.IMAGES_BASE_URL = "https://images.example"
    const html = await renderAstro(componentUrl, {
      props: { ...fallback, densities: [], placeholder: false },
    })
    expect(html).toMatch(/<img\b[^>]* srcset(?:=""|(?=\s))/)
    expect(html).not.toContain(" 1x")
  })

  it("keeps source-backed fallback classes dimensions eager and high attributes", async () => {
    process.env.IMAGES_BASE_URL = "https://images.example"
    const html = await renderAstro(componentUrl, {
      props: {
        ...fallback,
        sources: [landscape],
        class: "caller-image object-cover",
        wrapperClass: "caller-wrapper",
        loading: "eager",
        decoding: "async",
        fetchpriority: "high",
        "data-image": "hero",
        placeholderMode: "circle",
      },
    })
    const [img] = html.match(/<img\b[^>]*>/)!
    expect(img).not.toContain("aspect-(--ratio)")
    expect(img).toContain('width="100" height="50"')
    expect(img).toContain('class="caller-image object-cover astro-rbm6lpf6"')
    expect(img).toContain('loading="eager" decoding="async"')
    expect(img).toContain('fetchpriority="high" data-image="hero"')
    expect(html).toContain("caller-wrapper")
    expect(html).toContain('data-sun-picture-placeholder-mode="circle"')
    expect(html).toContain("<noscript>")
  })

  it("keeps explicit fallback attribute overrides on img and away from sources", async () => {
    process.env.IMAGES_BASE_URL = "https://images.example"
    const html = await renderAstro(componentUrl, {
      props: {
        ...fallback,
        sources: [portrait],
        sizes: "100vw",
        srcset: "https://assets.example/custom.jpg 1x",
        fetchpriority: "low",
        "data-custom": "kept",
        placeholder: false,
      },
    })
    const [img] = html.match(/<img\b[^>]*>/)!
    expect(img).toContain(
      'sizes="100vw" srcset="https://assets.example/custom.jpg 1x" fetchpriority="low" data-custom="kept"'
    )
    const source = html.match(/<source\b[^>]*>/)?.[0]
    expect(source).toBeDefined()
    expect(source).toContain('sizes="(min-width: 400px) 200px, 100px"')
    expect(source).not.toContain("custom.jpg")
    expect(source).not.toContain("fetchpriority")
    expect(img).not.toContain("sources=")
  })
})
