import type { Context } from "hono"
import { consola } from "consola"
import type { BaseIssue } from "valibot"

const logger = consola.withTag("http")

export const notFoundHandler = (c: Context) => {
  logger.debug(`404 ${c.req.path}`)
  return c.json({ status: 404, error: "Not Found" }, 404)
}

export const errorHandler = (err: Error, c: Context) => {
  logger.error(`500 ${c.req.path}: ${err.message}`, err)
  return c.json({ status: 500, error: "Internal Server Error" }, 500)
}

export const validationErrorResponse = (
  c: Context,
  issues: readonly BaseIssue<unknown>[]
) =>
  c.json(
    {
      status: 400,
      error: "Validation Failed",
      issues: issues.map(issue => issue.message),
    },
    400
  )
