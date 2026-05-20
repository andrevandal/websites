const assertFulfilled = <T>(
  item: PromiseSettledResult<T>
): item is PromiseFulfilledResult<T> => item.status === "fulfilled"

export * from "./image"
export * from "./cn"
export { assertFulfilled }
