export * from "./image"
export * from "./cn"

export const assertFulfilled = <T>(
  item: PromiseSettledResult<T>
): item is PromiseFulfilledResult<T> => item.status === "fulfilled"
