import { consola } from "consola"
import { config } from "../config/env"
import { SqliteKV } from "./sqlite-kv"

const logger = consola.withTag("kv")

const kv = new SqliteKV({ path: config.kvPath, maxBytes: config.kvMaxBytes })
logger.debug(`kv store ready: ${config.kvPath} (maxBytes=${config.kvMaxBytes})`)

export { kv }
