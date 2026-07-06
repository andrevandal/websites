import { Hono } from "hono"
import { serveStatic } from "hono/bun"
import { consola } from "consola"
import { errorHandler, notFoundHandler } from "./handlers/errors"
import { getHealthStatus } from "./handlers/health"
import { homeHandler } from "./handlers/home"
import { imageHandler } from "./handlers/image"
import {
  banGateMiddleware,
  blocklistMiddleware,
  rateLimitMiddleware,
} from "./security/middleware"

const logger = consola.withTag("app")
const app = new Hono()

const staticFilesRootFolder = new URL("../public", import.meta.url).pathname
logger.info(`Static files root: ${staticFilesRootFolder}`)

app.get(
  "/favicon.ico",
  serveStatic({
    root: staticFilesRootFolder,
    path: "favicon.ico",
  })
)

const routes = app
  .get("/", homeHandler)
  .get("/healthy", c => c.json(getHealthStatus()))
  .get("/robots.txt", c => c.text("User-agent: *\nDisallow: /\n"))
  .get(
    "/*",
    banGateMiddleware,
    rateLimitMiddleware,
    blocklistMiddleware,
    imageHandler
  )

app.notFound(notFoundHandler)
app.onError(errorHandler)

export { app }
export type AppType = typeof routes
