// Shared by the oh-my-pi hooks. A tripwire, not a boundary:
// it matches common spellings of destructive git calls, including behind
// sudo/env/xargs/eval and `sh -c`. The pre-push hook is the backstop for pushes.

type Rule = { test: (args: string[]) => boolean; reason: string }

const SEGMENT_SPLIT = /&&|\|\||[;|\n()`]/
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/
const PREFIX_COMMANDS: Record<string, true> = {
  sudo: true,
  command: true,
  exec: true,
  env: true,
  nohup: true,
  time: true,
  eval: true,
  xargs: true,
  sh: true,
  bash: true,
  zsh: true,
  timeout: true,
  nice: true,
}
// `-c` for sh/bash/zsh is absent on purpose: its value is the command string,
// which must stay in the token list.
const PREFIX_OPTIONS_WITH_VALUE: Record<string, Record<string, true>> = {
  sudo: { "-u": true, "-g": true, "-C": true, "-D": true },
  env: { "-u": true, "-C": true },
  xargs: {
    "-I": true,
    "-n": true,
    "-P": true,
    "-L": true,
    "-d": true,
    "-E": true,
    "-s": true,
  },
}
// `timeout 10 git ...` takes one positional duration before the command.
const PREFIX_POSITIONAL: Record<string, true> = { timeout: true }
const GIT_OPTIONS_WITH_VALUE: Record<string, true> = {
  "-C": true,
  "-c": true,
  "--git-dir": true,
  "--work-tree": true,
  "--namespace": true,
}

const tokenize = (segment: string): string[] =>
  segment
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.replace(/^['"]|['"]$/g, ""))

const commandName = (token: string): string => token.split("/").pop() ?? token

const hasShortFlag = (args: string[], flag: string): boolean =>
  args.some(arg => /^-[a-zA-Z]+$/.test(arg) && arg.includes(flag))

const isWholeTreePath = (arg: string): boolean =>
  arg === "." || arg === "./" || arg === ":/" || arg === "*"

const rules: Record<string, Rule[]> = {
  push: [
    {
      test: args =>
        hasShortFlag(args, "f") ||
        args.some(
          arg =>
            arg.startsWith("--force") ||
            arg === "--mirror" ||
            arg.startsWith("+")
        ),
      reason:
        "git push --force rewrites remote history; push a new commit instead",
    },
    {
      test: args =>
        args.includes("--delete") ||
        hasShortFlag(args, "d") ||
        args.some(arg => arg.startsWith(":")),
      reason:
        "git push --delete removes a remote branch; ask the user to do it",
    },
  ],
  reset: [
    {
      test: args =>
        args.includes("--hard") ||
        args.includes("--merge") ||
        args.includes("--keep"),
      reason:
        "git reset --hard discards work; use git stash or git reset --soft",
    },
  ],
  clean: [
    {
      test: args => hasShortFlag(args, "f") || args.includes("--force"),
      reason: "git clean -f deletes untracked files; ask the user first",
    },
  ],
  branch: [
    {
      test: args =>
        hasShortFlag(args, "D") ||
        ((args.includes("--delete") || hasShortFlag(args, "d")) &&
          (args.includes("--force") || hasShortFlag(args, "f"))),
      reason: "git branch -D drops unmerged commits; use git branch -d",
    },
  ],
  checkout: [
    {
      test: args =>
        args.includes("--force") ||
        hasShortFlag(args, "f") ||
        args.some(isWholeTreePath),
      reason:
        "git checkout . discards working-tree changes; ask the user first",
    },
  ],
  restore: [
    {
      test: args => {
        const staged = args.includes("--staged") || hasShortFlag(args, "S")
        const touchesWorktree = !staged || args.includes("--worktree")
        return touchesWorktree && args.some(isWholeTreePath)
      },
      reason:
        "git restore . discards working-tree changes; restore named files or use --staged",
    },
  ],
  "filter-branch": [
    { test: () => true, reason: "git filter-branch rewrites history" },
  ],
  "update-ref": [
    {
      test: args => args.includes("-d") || args.includes("--stdin"),
      reason: "git update-ref -d deletes a ref directly",
    },
  ],
  stash: [
    {
      test: args => args[0] === "drop" || args[0] === "clear",
      reason: "git stash drop/clear loses stashed work",
    },
  ],
}

const gitInvocation = (
  tokens: string[]
): { sub: string; args: string[] } | undefined => {
  let i = 0
  while (i < tokens.length) {
    if (ENV_ASSIGNMENT.test(tokens[i])) {
      i++
      continue
    }
    const prefix = commandName(tokens[i])
    if (!PREFIX_COMMANDS[prefix]) break
    i++
    const optionsWithValue = PREFIX_OPTIONS_WITH_VALUE[prefix] ?? {}
    while (i < tokens.length && tokens[i].startsWith("-")) {
      const takesValue = optionsWithValue[tokens[i]] && !tokens[i].includes("=")
      i += takesValue ? 2 : 1
    }
    if (PREFIX_POSITIONAL[prefix]) i++
  }
  if (i >= tokens.length || commandName(tokens[i]) !== "git") return undefined
  i++
  while (i < tokens.length && tokens[i].startsWith("-")) {
    const [option] = tokens[i].split("=")
    i += GIT_OPTIONS_WITH_VALUE[option] && !tokens[i].includes("=") ? 2 : 1
  }
  if (i >= tokens.length) return undefined
  return { sub: tokens[i], args: tokens.slice(i + 1) }
}

const findDangerousGit = (command: string): string | undefined => {
  for (const segment of command.split(SEGMENT_SPLIT)) {
    const call = gitInvocation(tokenize(segment))
    if (!call) continue
    const hit = rules[call.sub]?.find(rule => rule.test(call.args))
    if (hit) return hit.reason
  }
  return undefined
}

export { findDangerousGit }
