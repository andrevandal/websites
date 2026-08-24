const RESUME_DELAY_MS = 500

const wrapLoopPosition = (pos: number, loopWidth: number): number =>
  loopWidth > 0 ? ((pos % loopWidth) + loopWidth) % loopWidth : pos

const getKeyboardScrollDelta = (
  key: "ArrowLeft" | "ArrowRight",
  slideWidth: number,
  gap: number
): number => (key === "ArrowRight" ? 1 : -1) * (slideWidth + gap)

const shouldDisableSnap = (
  containerWidth: number,
  contentWidth: number
): boolean => containerWidth >= contentWidth

export {
  RESUME_DELAY_MS,
  wrapLoopPosition,
  getKeyboardScrollDelta,
  shouldDisableSnap,
}
