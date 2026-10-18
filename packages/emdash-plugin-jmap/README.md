# @vandal-websites/emdash-plugin-jmap

EmDash plugin that delivers EmDash's email (magic links, invites) over JMAP
(RFC 8620 core, RFC 8621 mail and submission). It works with any compliant
server and is tested against Stalwart.

## Use

```js
// astro.config.js
import { jmapEmailPlugin } from "@vandal-websites/emdash-plugin-jmap"

emdash({ plugins: [...(isDev ? [] : [jmapEmailPlugin()])] })
```

Load it in builds only: in dev EmDash's console provider must be the sole
`email:deliver` provider so magic links print to the terminal.

Then, in the admin:

1. Plugins -> JMAP: set the server URL, authentication, credential and sender.
2. "Send test email" on the same page (it uses the saved settings).
3. Settings -> Email: select `jmap-email`.

Plugins -> JMAP log lists the last 50 deliveries (500 are kept). Message bodies
are never stored.

## Settings

| Key          | Notes                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| `baseUrl`    | Server base URL; the session is read from `/.well-known/jmap`.          |
| `authMode`   | `basic` (username and password) or `bearer`.                            |
| `username`   | Basic auth only.                                                        |
| `credential` | Password or token. A secret setting: write-only, encrypted by the host. |
| `fromEmail`  | Must match a JMAP identity on the account.                              |
| `fromName`   | Optional display name.                                                  |
| `replyTo`    | Optional; a message's own `replyTo` wins.                               |

The credential is encrypted with `EMDASH_ENCRYPTION_KEY`
(`emdash secrets generate`), which must be set where the site runs. Leaving the
credential blank on save keeps the stored one.

## Behaviour

- One `Email/set` (draft) plus `EmailSubmission/set` call; on success the draft
  moves from Drafts to Sent and loses `$draft`. The server needs `drafts` and
  `sent` mailboxes.
- The session and the Identity/Mailbox lookup are retried twice; the send is
  never retried, because JMAP has no idempotency key and a retry could deliver
  twice.
- Only `to`, `subject`, `text`, `html` and `replyTo` are supported; `cc` is
  ignored.
- The apiUrl comes from the server's session, so the server must advertise a
  reachable URL.

## Security note

The plugin calls the server with `ofetch` directly, so EmDash's
`allowedHosts` / `network:request` gate does not apply. The host is whatever an
admin (`plugins:manage`) saves in the settings.

## Development

```sh
moon run emdash-plugin-jmap:test
moon run emdash-plugin-jmap:build   # tsdown + publint
```
