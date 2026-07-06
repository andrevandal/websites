import { consola } from "consola"
import { app } from "./app"

const logger = consola.withTag("app:shell")
const port = Number(process.env.PORT ?? 3000)

const server = Bun.serve({
  port,
  fetch: app.fetch,
})

logger.log(`Images app listening on http://localhost:${server.port}`)
