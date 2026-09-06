const RESUME_DELAY_MS = 500,
  wrapLoopPosition = (pos: number, loopWidth: number): number =>
    loopWidth > 0 ? ((pos % loopWidth) + loopWidth) % loopWidth : pos,
  getKeyboardScrollDelta = (
    key: "ArrowLeft" | "ArrowRight",
    slideWidth: number,
    gap: number
  ): number => (key === "ArrowRight" ? 1 : -1) * (slideWidth + gap),
  shouldDisableSnap = (containerWidth: number, contentWidth: number): boolean =>
    containerWidth >= contentWidth

const getRequiredCloneCycles = (
  viewportWidth: number,
  scrollWidth: number,
  loopWidth: number
): number =>
  loopWidth > 0
    ? Math.max(
        0,
        Math.ceil((viewportWidth + loopWidth - scrollWidth) / loopWidth)
      )
    : 0

export {
  RESUME_DELAY_MS,
  wrapLoopPosition,
  getKeyboardScrollDelta,
  shouldDisableSnap,
  getRequiredCloneCycles,
}
