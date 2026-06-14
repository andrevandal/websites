import yargs from "yargs"
import { queryTargets } from "./utils"
import { hideBin } from "yargs/helpers"
import consola from "consola"
import { execa } from "execa"

const availableTargets = await queryTargets()

const parseArgs = (argv: string[]) =>
  yargs(hideBin(argv))
    .scriptName("dev")
    .version("1.0.0")
    .command("$0 <target>", "Run the tool for a target", builder =>
      builder.positional("target", {
        describe: "The command target name",
        type: "string",
        choices: Object.keys(availableTargets),
        required: true,
      })
    )
    .option("debug", {
      type: "boolean",
      default: false,
      describe: "Enable verbose debug logging",
    })
    .usage("Usage: $0 <target> [options]")
    .example("$0 <target>", "Start dev server")
    .help()
    .demandCommand(1, "You must provide a <target> argument.")
    .parse()

try {
  if (!import.meta.main) {
    throw new Error(
      "This script is not meant to be imported. Please run it directly with `node deploy.js`."
    )
  }

  const args = await parseArgs(process.argv)
  const { target, isDebug } = args

  if (isDebug) {
    consola.level = 5
  }

  const project = availableTargets[`${target}`]

  if (!project) {
    throw new Error(`Target not found.`)
  }

  await execa("moon", ["run", `${project.id}:dev`], {
    stdio: "inherit",
  })
} catch (err) {
  consola.error((err as Error).message)
  process.exit(1)
}
