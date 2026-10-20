const useHeader = (selector: string): (() => void) => {
  let detach: (() => void) | undefined

  const initialize = () => {
    detach?.()
    detach = undefined
    const nav = document.querySelector<HTMLElement>(selector)
    if (!nav) return

    const toggle =
      nav.querySelector<HTMLInputElement>("[data-header-toggle]") ??
      nav.querySelector<HTMLInputElement>('input[type="checkbox"]')
    const menu =
      nav.querySelector<HTMLElement>("[data-header-menu]") ??
      nav.querySelector<HTMLElement>("ul")

    const onScroll = () => {
      nav.classList.toggle("actived", window.scrollY > 0)
    }
    const closeMenu = () => {
      if (toggle) toggle.checked = false
    }
    const onClick = (event: MouseEvent) => {
      if (!nav.contains(event.target as Node)) closeMenu()
    }
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu()
    }

    onScroll()
    window.addEventListener("scroll", onScroll)
    if (toggle && menu) {
      menu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMenu)
      })
      document.addEventListener("click", onClick)
      document.addEventListener("keydown", onKeydown)
    }

    detach = () => {
      window.removeEventListener("scroll", onScroll)
      menu?.querySelectorAll("a").forEach(link => {
        link.removeEventListener("click", closeMenu)
      })
      document.removeEventListener("click", onClick)
      document.removeEventListener("keydown", onKeydown)
    }
  }

  initialize()
  document.addEventListener("astro:after-swap", initialize)

  return () => {
    detach?.()
    document.removeEventListener("astro:after-swap", initialize)
  }
}

export { useHeader }
