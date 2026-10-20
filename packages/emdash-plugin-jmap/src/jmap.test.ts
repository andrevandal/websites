import { beforeEach, describe, expect, mock, test } from "bun:test"

type Call = [string, { body?: { methodCalls: any[] }; retry: number }]

const fetchMock = mock(
  async (_url: string, _options: unknown): Promise<any> => ({})
)
void mock.module("ofetch", () => ({ $fetch: fetchMock }))

const { sendJmap } = await import("./jmap")

const settings = {
  baseUrl: "https://mail.example.com",
  authMode: "basic" as const,
  username: "u",
  credential: "p",
  fromEmail: "Me@Example.com",
}
const message = { to: "to@example.com", subject: "Hi", text: "body" }

const session = {
  apiUrl: "https://mail.example.com/jmap",
  capabilities: { "urn:ietf:params:jmap:submission": {} },
  primaryAccounts: { "urn:ietf:params:jmap:mail": "acc" },
}
const lookup = (
  roles: Record<string, string> = { drafts: "d1", sent: "s1" }
) => ({
  methodResponses: [
    ["Identity/get", { list: [{ id: "ident", email: "me@example.com" }] }, "i"],
    [
      "Mailbox/get",
      { list: Object.entries(roles).map(([role, id]) => ({ id, role })) },
      "m",
    ],
  ],
})
const sendOk = {
  methodResponses: [
    ["Email/set", { created: { draft: { id: "email1" } } }, "e"],
    ["EmailSubmission/set", { created: { send: { id: "sub1" } } }, "s"],
    // The implicit update from onSuccessUpdateEmail reuses the call id.
    ["Email/set", { updated: { email1: null } }, "s"],
  ],
}

// Queues session, lookup and send responses in call order.
const queue = (...responses: unknown[]) => {
  for (const response of responses)
    fetchMock.mockImplementationOnce(async () => response)
}
const calls = () => fetchMock.mock.calls as unknown as Call[]

beforeEach(() => fetchMock.mockReset())

describe("sendJmap", () => {
  test("sends once, moves the draft to Sent and returns ids", async () => {
    queue(session, lookup(), sendOk)
    expect(await sendJmap(settings, message)).toEqual({
      emailId: "email1",
      submissionId: "sub1",
    })
    const [, send] = calls()[2]!
    expect(send.retry).toBe(0)
    const [emailSet, submission] = send.body!.methodCalls
    expect(submission[1].onSuccessUpdateEmail["#send"]).toEqual({
      "mailboxIds/d1": null,
      "mailboxIds/s1": true,
      "keywords/$draft": null,
    })
    expect(submission[1].create.send.identityId).toBe("ident")
    expect(emailSet[1].create.draft.mailboxIds).toEqual({ d1: true })
    expect(calls()[1]![1].retry).toBe(2)
  })

  test("omits htmlBody without html", async () => {
    queue(session, lookup(), sendOk)
    await sendJmap(settings, message)
    const { draft } = calls()[2]![1].body!.methodCalls[0][1].create
    expect("htmlBody" in draft).toBe(false)
    expect(draft.replyTo).toBeUndefined()
  })

  test("message replyTo wins over the setting", async () => {
    queue(session, lookup(), sendOk)
    await sendJmap(
      { ...settings, replyTo: "setting@example.com" },
      { ...message, replyTo: "msg@example.com", html: "<p>x</p>" }
    )
    const { draft } = calls()[2]![1].body!.methodCalls[0][1].create
    expect(draft.replyTo).toEqual([{ email: "msg@example.com" }])
    expect(draft.htmlBody[0].type).toBe("text/html")
  })

  test("unknown from address throws", async () => {
    queue(session, lookup())
    expect(
      await sendJmap(
        { ...settings, fromEmail: "other@example.com" },
        message
      ).catch((error: Error) => error.message)
    ).toContain("No JMAP identity for other@example.com")
  })

  test("missing Sent mailbox throws", async () => {
    queue(session, lookup({ drafts: "d1" }))
    expect(
      await sendJmap(settings, message).catch((error: Error) => error.message)
    ).toContain("No JMAP mailbox with role sent")
  })

  test("missing submission capability throws", async () => {
    queue({ ...session, capabilities: {} })
    expect(
      await sendJmap(settings, message).catch((error: Error) => error.message)
    ).toContain("JMAP server lacks mail/submission capability")
  })

  test("submission SetError is reported", async () => {
    queue(session, lookup(), {
      methodResponses: [
        ["Email/set", { created: { draft: { id: "email1" } } }, "e"],
        [
          "EmailSubmission/set",
          { notCreated: { send: { type: "forbiddenFrom" } } },
          "s",
        ],
      ],
    })
    expect(
      await sendJmap(settings, message).catch((error: Error) => error.message)
    ).toContain("JMAP EmailSubmission/set: forbiddenFrom")
  })

  test("method error names the method it replied to", async () => {
    queue(session, lookup(), {
      methodResponses: [
        ["error", { type: "serverFail", description: "boom" }, "e"],
      ],
    })
    expect(
      await sendJmap(settings, message).catch((error: Error) => error.message)
    ).toContain("JMAP Email/set: serverFail - boom")
  })
})
