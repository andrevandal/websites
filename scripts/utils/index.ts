import { execa } from "execa"
import { v } from "./schemas"

const queryTargetsSchema = v.object({
  projects: v.array(
    v.object({
      id: v.string(),
      aliases: v.array(v.object({ alias: v.string() })),
    })
  ),
})

const queryTargets = async () => {
  const { stdout } = await execa("moon", [
    "query",
    "projects",
    "--alias",
    "(websites|apps)/*",
  ])

  const { projects } = v.parse(
    v.pipe(v.string(), v.parseJson(), queryTargetsSchema),
    stdout
  )

  const targets = projects
    .filter(project => project.id)
    .map(project => ({ id: project.id, alias: project.aliases[0].alias }))

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

const queryDevTargetsSchema = v.object({
  projects: v.array(
    v.object({
      id: v.string(),
      source: v.string(),
      tasks: v.record(v.string(), v.unknown()),
    })
  ),
})

const queryDevTargets = async () => {
  const { stdout } = await execa("moon", ["query", "projects"])

  const { projects } = v.parse(
    v.pipe(v.string(), v.parseJson(), queryDevTargetsSchema),
    stdout
  )

  const targets = projects
    .filter(project => project.tasks.dev != null)
    .map(project => ({ id: project.id, source: project.source }))

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

export { queryTargets, queryDevTargets }
