import type { Snippet } from "svelte"

type SunComboboxProps<T> = {
  items: T[]
  toValue: (item: T) => string
  toLabel: (item: T) => string
  groupKey?: (item: T) => string | undefined
  value?: string
  open?: boolean
  inputValue?: string
  loading?: boolean
  placeholder?: string
  clearable?: boolean
  onclear?: () => void
  oninputvaluechange?: (value: string) => void
  onvaluechange?: (value: string | undefined) => void
  item?: Snippet<[T]>
  empty?: Snippet<[]>
  triggerIcon?: Snippet<[]>
  clearIcon?: Snippet<[]>
  leading?: Snippet<[]>
  caption?: Snippet<[]>
}

export type { SunComboboxProps }
