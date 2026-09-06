import { ALLOWED_LOCATIONS } from "@/data/allowed-locations"
import type { Area } from "@/data/allowed-locations"
import { normalizeCityName } from "./normalize"

export const findAreaById = (id: string): Area | undefined =>
  ALLOWED_LOCATIONS.find(area => area.id === id)

export const isCityAllowed = (
  cidade: string,
  uf: "SP" | "ES" | string
): boolean => {
  if (uf !== "SP" && uf !== "ES") return false
  const target = normalizeCityName(cidade)
  return ALLOWED_LOCATIONS.some(
    area =>
      area.estado === uf &&
      area.cidades.some(c => normalizeCityName(c) === target)
  )
}
