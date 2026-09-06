import type { DeliveryTime } from "@/data/allowed-locations"

export const formatDeliveryTime = (p: DeliveryTime): string => {
  const unitLabel = p.unit === "horas" ? "horas" : "dias úteis"
  return `${p.min} a ${p.max} ${unitLabel}`
}
