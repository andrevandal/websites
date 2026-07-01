export const useHeader = (selector: string | Element) => {
  const nav =
    typeof selector === "string"
      ? document.querySelector<HTMLElement>(selector)
      : (selector as HTMLElement)

  if (!nav) return

  const toggle =
    nav.querySelector<HTMLInputElement>("[data-header-toggle]") ??
    nav.querySelector<HTMLInputElement>('input[type="checkbox"]')

  const menu =
    nav.querySelector<HTMLElement>("[data-header-menu]") ??
    nav.querySelector<HTMLElement>("ul")

  const closeMenu = () => {
    if (toggle) toggle.checked = false
  }

  window.addEventListener("scroll", () => {
    nav.classList.toggle("actived", window.scrollY > 0)
  })

  if (!toggle || !menu) return

  menu?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMenu)
  })

  document.addEventListener(
    "click",
    event => {
      const target = event.target as HTMLElement
      if (!nav.contains(target) && toggle?.checked) closeMenu()
    },
    false
  )
}
