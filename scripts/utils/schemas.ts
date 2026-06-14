import * as v from "valibot"

export const deployTargetsSchema = v.array(v.pipe(v.string(), v.nonEmpty()))

export { v }
