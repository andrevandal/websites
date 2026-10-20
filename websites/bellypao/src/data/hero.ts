const heroDensities = [1, 1.5, 2, 2.5, 3]

const heroDesktop = {
  path: "images/primeira-dobra.png",
  width: 640,
  height: 276,
  breakpoints: [
    { minWidth: 1024, width: 960 },
    { minWidth: 1280, width: 1216 },
  ],
  media: "(min-width: 640px)",
}

const heroMobile = {
  path: "images/primeira-dobra_mobile.png",
  width: 375,
  height: 278,
  breakpoints: [{ minWidth: 640, width: 640 }],
  media: "(max-width: 639px)",
  sizes: "100vw",
}

export { heroDesktop, heroMobile, heroDensities }
