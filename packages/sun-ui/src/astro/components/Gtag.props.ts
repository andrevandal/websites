type GtagConfig = {
  gtagId?: string
  conversionId?: string
  conversionLabel?: string
  partytown?: boolean
}

type GtagProps =
  | ({ placement: "head" } & GtagConfig)
  | {
      placement: "body"
      gtagId?: string
    }

export type { GtagProps, GtagConfig }
