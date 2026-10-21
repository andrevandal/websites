import { execa } from "execa"
import { v } from "./schemas"

const queryTargetsSchema = v.object({
  projects: v.array(
    v.object({
      id: v.string(),
      source: v.string(),
    })
  ),
})

const queryTargets = async () => {
  const { stdout } = await execa("moon", ["query", "projects"])

  const { projects } = v.parse(
    v.pipe(v.string(), v.parseJson(), queryTargetsSchema),
    stdout
  )

  const targets = projects
    .filter(project => /^(?:websites|apps)\//.test(project.source))
    .map(project => ({ id: project.id, source: project.source }))

  return targets.reduce(
    (acc, { id, source }) => {
      const value = {
        id,
        location: source.split("/"),
      }

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
      const value = { id, location: source.split("/") }

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
