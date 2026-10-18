import { $fetch } from "ofetch"

import { authHeader } from "./shared"
import type { EmailMessage, JmapSettings } from "./shared"

type SetError = { type: string; description?: string }
type MethodCall = [string, Record<string, unknown>, string]
type MethodResponse = [string, Record<string, any>, string]
type Session = {
  apiUrl: string
  capabilities: Record<string, unknown>
  primaryAccounts: Record<string, string>
}

const CORE = "urn:ietf:params:jmap:core"
const MAIL = "urn:ietf:params:jmap:mail"
const SUBMISSION = "urn:ietf:params:jmap:submission"
const USING = [CORE, MAIL, SUBMISSION]
const TIMEOUT = 15_000

const describe = (method: string, error: SetError) =>
  new Error(
    `JMAP ${method}: ${error.type}${error.description ? ` - ${error.description}` : ""}`
  )

// Returns the args of each method response by call id; throws on "error" responses.
const toResults = (methodCalls: MethodCall[], responses: MethodResponse[]) => {
  const results: Record<string, Record<string, any>> = {}
  // oxlint-disable-next-line jest/prefer-each -- not a test file
  for (const [name, args, callId] of responses) {
    if (name === "error") {
      const method = methodCalls.find(([, , id]) => id === callId)?.[0]
      throw describe(method ?? callId, args as SetError)
    }
    // onSuccessUpdateEmail adds a second response under the same call id.
    results[callId] ??= args
  }
  return results
}

const call = async (
  session: Session,
  settings: JmapSettings,
  methodCalls: MethodCall[],
  retry: number
) =>
  toResults(
    methodCalls,
    (
      await $fetch<{ methodResponses: MethodResponse[] }>(session.apiUrl, {
        method: "POST",
        headers: { Authorization: authHeader(settings) },
        body: { using: USING, methodCalls },
        retry,
        timeout: TIMEOUT,
      })
    ).methodResponses
  )

const sendJmap = async (settings: JmapSettings, message: EmailMessage) => {
  const session = await $fetch<Session>(
    `${settings.baseUrl}/.well-known/jmap`,
    {
      headers: { Authorization: authHeader(settings) },
      retry: 2,
      timeout: TIMEOUT,
    }
  )
  const accountId = session.primaryAccounts?.[MAIL]
  if (!session.capabilities?.[SUBMISSION] || !accountId)
    throw new Error("JMAP server lacks mail/submission capability")

  // Read-only, so retrying is safe.
  const lookup = await call(
    session,
    settings,
    [
      ["Identity/get", { accountId }, "i"],
      ["Mailbox/get", { accountId, properties: ["id", "role"] }, "m"],
    ],
    2
  )
  const identity = (lookup.i?.list ?? []).find(
    (candidate: { email: string }) =>
      candidate.email.toLowerCase() === settings.fromEmail.toLowerCase()
  )
  if (!identity) throw new Error(`No JMAP identity for ${settings.fromEmail}`)
  const mailboxId = (role: string) => {
    const mailbox = (lookup.m?.list ?? []).find(
      (candidate: { role: string | null }) => candidate.role === role
    )
    if (!mailbox) throw new Error(`No JMAP mailbox with role ${role}`)
    return mailbox.id as string
  }
  const drafts = mailboxId("drafts")
  const sent = mailboxId("sent")

  const replyTo = message.replyTo ?? settings.replyTo
  const textBody = [{ partId: "text", type: "text/plain" }]
  const draft = {
    mailboxIds: { [drafts]: true },
    keywords: { $draft: true, $seen: true },
    from: [{ name: settings.fromName ?? null, email: settings.fromEmail }],
    to: [{ email: message.to }],
    ...(replyTo && { replyTo: [{ email: replyTo }] }),
    subject: message.subject,
    bodyValues: {
      text: { value: message.text },
      ...(message.html && { html: { value: message.html } }),
    },
    textBody,
    // Stalwart rejects a text/plain htmlBody, so it is only set with html.
    ...(message.html && {
      htmlBody: [{ partId: "html", type: "text/html" }],
    }),
  }

  // JMAP has no idempotency key: a retry could deliver twice.
  const results = await call(
    session,
    settings,
    [
      ["Email/set", { accountId, create: { draft } }, "e"],
      [
        "EmailSubmission/set",
        {
          accountId,
          create: { send: { identityId: identity.id, emailId: "#draft" } },
          onSuccessUpdateEmail: {
            "#send": {
              [`mailboxIds/${drafts}`]: null,
              [`mailboxIds/${sent}`]: true,
              "keywords/$draft": null,
            },
          },
        },
        "s",
      ],
    ],
    0
  )
  // oxlint-disable-next-line jest/prefer-each -- not a test file
  for (const [callId, method, key] of [
    ["e", "Email/set", "draft"],
    ["s", "EmailSubmission/set", "send"],
  ] as const) {
    const error = results[callId]?.notCreated?.[key] as SetError | undefined
    if (error) throw describe(method, error)
  }
  return {
    emailId: results.e?.created.draft.id as string,
    submissionId: results.s?.created.send.id as string,
  }
}

export { sendJmap }
