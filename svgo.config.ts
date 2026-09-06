import type { Config } from "svgo"

export default {
  multipass: false,
  floatPrecision: 3,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          convertPathData: {
            transformPrecision: 5,
          },
          convertTransform: {
            transformPrecision: 5,
          },
        },
      },
    },
    "removeXlink",
  ],
} satisfies Config
