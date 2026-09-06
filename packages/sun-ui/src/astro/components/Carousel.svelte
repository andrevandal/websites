<script lang="ts">
  import { onMount } from "svelte"
  import type { Snippet } from "svelte"
  import type { CarouselProps } from "./Carousel.props.ts"
  import { cn } from "../../index"
  import {
    RESUME_DELAY_MS,
    wrapLoopPosition,
    getKeyboardScrollDelta,
    shouldDisableSnap,
    getRequiredCloneCycles,
  } from "./Carousel.svelte.utils.ts"

  type Props = CarouselProps & { children?: Snippet }

  let {
    ariaLabel = "Carousel",
    className = "",
    autoScroll = true,
    direction = "right-to-left",
    speed = 40,
    children,
  }: Props = $props()

  const trackClass = $derived(
    cn(
      "flex cursor-grab snap-x snap-mandatory scrollbar-none flex-row flex-nowrap gap-x-6 overflow-x-auto select-none active:cursor-grabbing",
      className
    )
  )

  // Assigned via `bind:this` in the markup below; invisible to static
  // assignment analysis, not actually unassigned at runtime.
  // oxlint-disable-next-line no-unassigned-vars
  let containerEl: HTMLDivElement | undefined
  // oxlint-disable-next-line no-unassigned-vars -- see containerEl above.
  let trackEl: HTMLDivElement | undefined

  // Closure-scoped state: the RAF hot path and drag bookkeeping never go
  // through Svelte's reactivity ($state) — nothing here drives template
  // re-rendering, so none of it needs to be reactive, matching the Alpine
  // port's own "escape to refs for per-frame DOM writes" rationale.
  let isDown = false
  let startX = 0
  let dragScrollLeft = 0
  let snapEnabled = true

  let pos = 0
  let lastTime: number | undefined
  let rafId: number | undefined
  let resumeTimer: ReturnType<typeof setTimeout> | undefined
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const pauseReasons = new Set<string>()

  let firstOriginal: HTMLElement | undefined
  let firstClone: HTMLElement | undefined

  let startAutoScroll = () => {}
  let stopAutoScroll = () => {}

  const getGap = () =>
    Number(
      getComputedStyle(trackEl as HTMLElement)
        .getPropertyValue("column-gap")
        .replace("px", "")
    )

  const getContentWidth = () => {
    const track = trackEl as HTMLElement
    const trackChildren = [...track.children] as HTMLElement[]
    return (
      trackChildren.reduce((acc, el) => acc + el.clientWidth, 0) +
      getGap() * (trackChildren.length - 1)
    )
  }

  const pause = (reason: string) => {
    pauseReasons.add(reason)
    clearTimeout(resumeTimer)
    stopAutoScroll()
  }

  const scheduleResume = (reason: string) => {
    pauseReasons.delete(reason)
    if (pauseReasons.size > 0) return
    clearTimeout(resumeTimer)
    resumeTimer = setTimeout(() => {
      if (pauseReasons.size === 0) startAutoScroll()
    }, RESUME_DELAY_MS)
  }

  const onTrackMouseDown = (event: MouseEvent) => {
    if (!snapEnabled) return
    const track = trackEl as HTMLElement
    isDown = true
    startX = event.pageX - track.offsetLeft
    dragScrollLeft = track.scrollLeft
    track.style.scrollSnapType = "none"
  }

  const stopDrag = () => {
    if (!isDown) return
    isDown = false
    if (snapEnabled)
      (trackEl as HTMLElement).style.scrollSnapType = "x mandatory"
    scheduleResume("pointer")
  }

  const onTrackMouseMove = (event: MouseEvent) => {
    if (!isDown) return
    event.preventDefault()
    const track = trackEl as HTMLElement
    const x = event.pageX - track.offsetLeft
    track.scrollLeft = dragScrollLeft - (x - startX) * 1.5
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (!snapEnabled) return
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const track = trackEl as HTMLElement
    const slide = track.firstElementChild as HTMLElement | null
    if (!slide) return
    const delta = getKeyboardScrollDelta(
      event.key as "ArrowLeft" | "ArrowRight",
      slide.offsetWidth,
      getGap()
    )
    track.scrollBy({ left: delta, behavior: "smooth" })
  }

  const onFocusIn = () => {
    if ((trackEl as HTMLElement).matches(":focus-visible")) pause("focus")
  }

  onMount(() => {
    const container = containerEl as HTMLElement
    const track = trackEl as HTMLElement

    // Astro wraps an island's slotted children in a single
    // `<astro-slot style="display:contents">` marker element — the
    // wrapper itself reports zero size and isn't a real slide, but
    // `track.children` would otherwise see it as the only child instead
    // of the real slides. Unwrap it so `track.children` are the real
    // slide elements again, matching the assumption this logic was
    // ported from (vanilla script's `<slot />` never introduced a
    // wrapper). `display: contents` already makes the slides lay out as
    // direct flex children visually, so moving them up changes nothing
    // about rendering, only what `track.children` returns.
    const [onlyChild] = track.children
    if (track.children.length === 1 && onlyChild?.tagName === "ASTRO-SLOT") {
      while (onlyChild.firstChild) track.appendChild(onlyChild.firstChild)
      onlyChild.remove()
    }

    const updateSnapState = () => {
      if (shouldDisableSnap(container.clientWidth, getContentWidth())) {
        snapEnabled = false
        track.style.scrollSnapType = "none"
        track.classList.add("mx-auto", "w-fit")
      } else {
        snapEnabled = true
        track.style.scrollSnapType = ""
        track.classList.remove("mx-auto", "w-fit")
      }
    }

    let resizeObserver: ResizeObserver | undefined

    if (!autoScroll) {
      resizeObserver = new ResizeObserver(updateSnapState)
      resizeObserver.observe(container)
      updateSnapState()
    }

    if (autoScroll && track.children.length > 0) {
      const originalSlides = [...track.children] as HTMLElement[]
      const appendCloneCycle = () => {
        originalSlides.forEach(slide => {
          // Infinite loop needs a perfectly uniform, periodic layout: strip
          // the edge-only breathing margins (first/last child) so the
          // cloned set lines up exactly with the original set.
          slide.style.marginLeft = "0px"
          slide.style.marginRight = "0px"
          const clone = slide.cloneNode(true) as HTMLElement
          clone.setAttribute("aria-hidden", "true")
          clone.setAttribute("inert", "")
          track.append(clone)
        })
      }

      appendCloneCycle()
      firstOriginal = originalSlides[0]
      firstClone = track.children[originalSlides.length] as HTMLElement
      const getLoopWidth = () =>
        (firstClone as HTMLElement).offsetLeft -
        (firstOriginal as HTMLElement).offsetLeft

      const ensureLoopIsReachable = () => {
        const cloneCycles = getRequiredCloneCycles(
          track.clientWidth,
          track.scrollWidth,
          getLoopWidth()
        )
        for (let index = 0; index < cloneCycles; index++) appendCloneCycle()
      }

      ensureLoopIsReachable()
      resizeObserver = new ResizeObserver(ensureLoopIsReachable)
      resizeObserver.observe(container)

      const directionSign = direction === "left-to-right" ? -1 : 1
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches

      pos = track.scrollLeft
      const step = (time: number) => {
        if (lastTime === undefined) lastTime = time
        const dt = (time - lastTime) / 1000
        lastTime = time
        pos = wrapLoopPosition(pos + directionSign * speed * dt, getLoopWidth())
        track.scrollLeft = pos
        rafId = requestAnimationFrame(step)
      }

      startAutoScroll = () => {
        if (rafId !== undefined || reduceMotion) return
        track.style.scrollSnapType = "none"
        pos = track.scrollLeft
        lastTime = undefined
        rafId = requestAnimationFrame(step)
      }

      stopAutoScroll = () => {
        if (rafId === undefined) return
        cancelAnimationFrame(rafId)
        rafId = undefined
        track.style.scrollSnapType = "x mandatory"
      }

      startAutoScroll()
    }

    // Svelte has no directive-modifier shorthand for window-scoped
    // listeners (unlike Alpine's `x-on:pointerup.window`) — wired
    // explicitly here, matching the vanilla script's own
    // `window.addEventListener` calls, and removed on unmount for
    // hygiene (does not change observable behavior: these carousels are
    // never conditionally unmounted today).
    const onWindowPointerUp = () => scheduleResume("pointer")
    const onWindowPointerCancel = () => scheduleResume("pointer")
    window.addEventListener("pointerup", onWindowPointerUp)
    window.addEventListener("pointercancel", onWindowPointerCancel)

    return () => {
      window.removeEventListener("pointerup", onWindowPointerUp)
      window.removeEventListener("pointercancel", onWindowPointerCancel)
      resizeObserver?.disconnect()
      stopAutoScroll()
      clearTimeout(resumeTimer)
    }
  })
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={containerEl}
  class="w-full overflow-hidden"
  onmouseenter={() => pause("hover")}
  onmouseleave={() => scheduleResume("hover")}
>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    bind:this={trackEl}
    aria-label={ariaLabel}
    role="region"
    tabindex="0"
    class={trackClass}
    onmousedown={onTrackMouseDown}
    onmousemove={onTrackMouseMove}
    onmouseup={stopDrag}
    onmouseleave={stopDrag}
    onkeydown={onKeydown}
    onfocusin={onFocusIn}
    onfocusout={() => scheduleResume("focus")}
    onpointerdown={() => pause("pointer")}
  >
    {@render children?.()}
  </div>
</div>
