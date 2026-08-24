import { execa } from "execa"
import { v } from "./schemas"

export const queryTargets = async () => {
  const { stdout } = await execa("moon", [
    "query",
    "projects",
    "--alias",
    "(websites|apps)/*",
  ]).pipe("jq", [
    "-cr",
    '.projects | select(type == "array") | map(select(.id) | { id: .id, alias: .aliases[0].alias })',
  ])

  const targets = v.parse(
    v.pipe(
      v.string(),
      v.parseJson(),
      v.array(
        v.object({
          id: v.string(),
          alias: v.string(),
        })
      )
    ),
    stdout
  )

  return targets.reduce(
    (acc, { id, alias }) => {
      const [normalizedId] = id.split(".")
      const value = {
        id,
        location: alias.slice(1).split("/"), // "@websites/clinicamauricioaraujo.com.br" -> ["websites", "clinicamauricioaraujo.com.br"]
      }

      if (normalizedId) acc[`${normalizedId}`] = value

      acc[`${id}`] = value

      return acc
    },
    {} as Record<
      string,
      {
        id: string
        location: string[]
      }
    >
  )
}

export const queryDevTargets = async () => {
  const { stdout } = await execa("moon", ["query", "projects"]).pipe("jq", [
    "-cr",
    '.projects | select(type == "array") | map(select(.tasks.dev != null) | { id: .id, source: .source })',
  ])

  const targets = v.parse(
    v.pipe(
      v.string(),
      v.parseJson(),
      v.array(
        v.object({
          id: v.string(),
          source: v.string(),
        })
      )
    ),
    stdout
  )

  return targets.reduce(
    (acc, { id, source }) => {
      const [normalizedId] = id.split(".")
      const value = { id, location: source.split("/") }

      if (normalizedId) acc[`${normalizedId}`] = value

      acc[`${id}`] = value

      return acc
    },
    {} as Record<
      string,
      {
        id: string
        location: string[]
      }
    >
  )
}
