// oh-my-pi pre-tool hook; the rules live in scripts/agent-guardrails.
import { findDangerousGit } from "../../../scripts/agent-guardrails/dangerous-git"

type ToolCallEvent = { toolName: string; input: Record<string, unknown> }
type HookApi = {
  on: (
    event: "tool_call",
    handler: (
      event: ToolCallEvent
    ) => { block: true; reason: string } | undefined
  ) => void
}

const gitGuardrails = (pi: HookApi): void => {
  pi.on("tool_call", event => {
    if (event.toolName !== "bash") return undefined
    const { command } = event.input
    const reason =
      typeof command === "string" ? findDangerousGit(command) : undefined
    return reason
      ? { block: true, reason: `Git guardrail: ${reason}` }
      : undefined
  })
}

export default gitGuardrails
