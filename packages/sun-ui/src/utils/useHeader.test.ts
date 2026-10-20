import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { Window } from "happy-dom"
import { useHeader } from "./useHeader"

let window: Window
let cleanup: (() => void) | undefined

const markup = `<header id="header"><input type="checkbox" data-header-toggle><label>Menu</label><nav data-header-menu><a href="#section"><span>Section</span></a></nav></header><main id="outside"></main>`
const toggle = () => window.document.querySelector<HTMLInputElement>("input")!
const click = (selector: string) =>
  window.document.querySelector<HTMLElement>(selector)!.click()

beforeEach(() => {
  window = new Window()
  Object.defineProperty(window, "scrollY", { value: 0, writable: true })
  Object.assign(globalThis, { window, document: window.document })
  window.document.body.innerHTML = markup
})

afterEach(() => {
  cleanup?.()
  cleanup = undefined
  window.happyDOM.abort()
  Reflect.deleteProperty(globalThis, "window")
  Reflect.deleteProperty(globalThis, "document")
})

describe("useHeader", () => {
  it("preserves native checkbox toggling", () => {
    cleanup = useHeader("#header")
    click("input")
    expect(toggle().checked).toBe(true)
    click("input")
    expect(toggle().checked).toBe(false)
  })

  it("closes with Escape but not other keys", () => {
    cleanup = useHeader("#header")
    toggle().checked = true
    window.document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Enter" })
    )
    expect(toggle().checked).toBe(true)
    window.document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape" })
    )
    expect(toggle().checked).toBe(false)
  })

  it("closes outside but not inside the header", () => {
    cleanup = useHeader("#header")
    toggle().checked = true
    click("label")
    expect(toggle().checked).toBe(true)
    click("#outside")
    expect(toggle().checked).toBe(false)
  })

  it("closes when nested link content is clicked", () => {
    cleanup = useHeader("#header")
    toggle().checked = true
    click("a span")
    expect(toggle().checked).toBe(false)
  })

  it("sets the initial and updated scroll class", () => {
    window.scrollY = 12
    cleanup = useHeader("#header")
    const header = window.document.querySelector("#header")!
    expect(header.classList.contains("actived")).toBe(true)
    window.scrollY = 0
    window.dispatchEvent(new window.Event("scroll"))
    expect(header.classList.contains("actived")).toBe(false)
  })

  it("cleans up scroll, keyboard, menu and outside listeners", () => {
    cleanup = useHeader("#header")
    cleanup()
    toggle().checked = true
    click("a span")
    click("#outside")
    window.document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape" })
    )
    window.scrollY = 12
    window.dispatchEvent(new window.Event("scroll"))
    expect(toggle().checked).toBe(true)
    expect(
      window.document.querySelector("#header")!.classList.contains("actived")
    ).toBe(false)
  })

  it("reinitializes after swaps and detaches the replaced header", () => {
    cleanup = useHeader("#header")
    const oldToggle = toggle()
    oldToggle.checked = true
    window.document.body.innerHTML = markup
    window.document.dispatchEvent(new window.Event("astro:after-swap"))
    toggle().checked = true
    click("#outside")
    expect(toggle().checked).toBe(false)
    expect(oldToggle.checked).toBe(true)
  })

  it("cleanup also removes swap reinitialization", () => {
    cleanup = useHeader("#header")
    cleanup()
    window.document.body.innerHTML = markup
    window.document.dispatchEvent(new window.Event("astro:after-swap"))
    toggle().checked = true
    click("#outside")
    expect(toggle().checked).toBe(true)
  })

  it("initializes a header appearing on a later page swap", () => {
    window.document.body.innerHTML = ""
    cleanup = useHeader("#header")
    window.document.body.innerHTML = markup
    window.document.dispatchEvent(new window.Event("astro:after-swap"))
    toggle().checked = true
    click("#outside")
    expect(toggle().checked).toBe(false)
  })

  it("supports the original checkbox and list selectors", () => {
    window.document.body.innerHTML = `<header id="header"><input type="checkbox"><ul><li><a href="#section">Section</a></li></ul></header>`
    cleanup = useHeader("#header")
    toggle().checked = true
    click("a")
    expect(toggle().checked).toBe(false)
  })

  it("keeps scroll behavior for a header without a menu", () => {
    window.document.body.innerHTML = `<header id="header"></header>`
    cleanup = useHeader("#header")
    window.scrollY = 12
    window.dispatchEvent(new window.Event("scroll"))
    expect(
      window.document.querySelector("#header")!.classList.contains("actived")
    ).toBe(true)
  })
})
