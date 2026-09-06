const groupItems = <T>(
    items: T[],
    groupKey: ((item: T) => string | undefined) | undefined
  ): Map<string | undefined, T[]> | null => {
    if (!groupKey) return null
    const byGroup = new Map<string | undefined, T[]>()
    for (const it of items) {
      const key = groupKey(it),
        bucket = byGroup.get(key) ?? []
      bucket.push(it)
      byGroup.set(key, bucket)
    }
    return byGroup
  },
  shouldShowClear = (
    clearable: boolean,
    inputValue: string,
    value: string
  ): boolean => clearable && (inputValue !== "" || value !== "")

const shouldClearSelection = (
  inputValue: string,
  selectedLabel: string
): boolean => inputValue !== selectedLabel

export { groupItems, shouldShowClear, shouldClearSelection }
