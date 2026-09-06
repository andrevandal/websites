import { defineAction, ActionError } from "astro:actions"
import { z } from "astro/zod"
import { findAreaById, isCityAllowed } from "@/services/coverage"
import { formatDeliveryTime } from "@/services/delivery-time"
import { searchAllowedLocations } from "@/services/location-search"
import { ROUTE_SERVICES } from "@/data/route-services"
import { searchBrazilCities } from "@/services/brazil-cities"

export const server = {
  calculate: defineAction({
    input: z.object({
      originCidade: z.string().min(1),
      originUf: z.string().length(2),
      destinationAreaId: z.string().min(1),
      destinationCidade: z.string().optional(),
    }),
    handler: input => {
      const area = findAreaById(input.destinationAreaId)
      if (!area) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Destino não encontrado.",
        })
      }

      const available = isCityAllowed(input.originCidade, input.originUf)

      return {
        deliveryTimeLabel: formatDeliveryTime(area.deliveryTime),
        services: ROUTE_SERVICES.map(({ id, label }) => ({
          id,
          label,
          available,
        })),
      }
    },
  }),
  searchOrigin: defineAction({
    input: z.object({
      query: z.string().max(80).default(""),
    }),
    handler: ({ query }) => searchBrazilCities(query, 20),
  }),
  searchDestination: defineAction({
    input: z.object({
      query: z.string().max(80).default(""),
    }),
    handler: ({ query }) => searchAllowedLocations(query),
  }),
}
