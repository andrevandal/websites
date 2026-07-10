import type { APIRoute } from "astro"
import { getPreferredLang } from "@lib/i18n"

const GET: APIRoute = ({ redirect, request }) =>
  redirect(`/${getPreferredLang(request.headers.get("accept-language"))}`, 302)

export { GET }
