declare global {
  // eslint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    youtubeAutoplayInitialized?: boolean
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          events: {
            onReady: (event: { target: { playVideo: () => void } }) => void
          }
        }
      ) => void
    }
  }
}

if (window.youtubeAutoplayInitialized) {
  throw new Error("Already initialized")
}
window.youtubeAutoplayInitialized = true

if (!window.YT) {
  const tag = document.createElement("script")
  tag.src = "https://www.youtube.com/iframe_api"
  document.head.appendChild(tag)
}

const initPlayer = (liteYoutube: HTMLElement) => {
  if (liteYoutube.dataset.processed) {
    return
  }

  const iframe = liteYoutube.shadowRoot?.querySelector(
    "iframe"
  ) as HTMLIFrameElement
  if (!iframe || !window.YT?.Player) {
    setTimeout(() => initPlayer(liteYoutube), 100)
    return
  }

  liteYoutube.dataset.processed = "true"

  try {
    const player = new window.YT.Player(iframe, {
      events: {
        onReady: event => event.target.playVideo(),
      },
    })
    void player
  } catch {
    delete liteYoutube.dataset.processed
    setTimeout(() => initPlayer(liteYoutube), 100)
  }
}

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        return
      }

      const wrapper = entry.target as HTMLElement
      const { videoId } = wrapper.dataset
      if (!videoId) {
        return
      }

      const liteYoutube = wrapper.querySelector("lite-youtube") as HTMLElement
      if (!liteYoutube) {
        return
      }

      liteYoutube.id = videoId
      liteYoutube.querySelector<HTMLElement>(".lyt-playbtn")?.click()
      initPlayer(liteYoutube)
      observer.unobserve(wrapper)
    })
  },
  { rootMargin: "100px", threshold: 0.1 }
)

const init = () => {
  document
    .querySelectorAll('[data-autoplay="true"]')
    .forEach(wrapper => observer.observe(wrapper))
}

document.addEventListener("astro:page-load", init)

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}

export {}
