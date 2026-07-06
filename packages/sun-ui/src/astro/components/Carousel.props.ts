type CarouselDirection = "left-to-right" | "right-to-left"

type CarouselProps = {
  className?: string
  autoScroll?: boolean
  direction?: CarouselDirection
  speed?: number
}

export type { CarouselDirection, CarouselProps }
