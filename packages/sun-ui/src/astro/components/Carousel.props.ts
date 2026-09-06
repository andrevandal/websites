type CarouselDirection = "left-to-right" | "right-to-left"

type CarouselProps = {
  ariaLabel?: string
  className?: string
  autoScroll?: boolean
  direction?: CarouselDirection
  speed?: number
}

export type { CarouselDirection, CarouselProps }
