import type { Context } from "hono"
import { html } from "hono/html"

type SiteData = {
  title: string
  description: string
  children?: ReturnType<typeof html>
}

const Layout = (props: SiteData) => html`
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>${props.title}</title>
      <meta name="description" content="${props.description}" />
    </head>
    <body>
      ${props.children}
    </body>
  </html>
`

const homeHandler = async (c: Context) =>
  c.html(
    Layout({
      title: "websites Images",
      description: "Optimizing images on-the-fly, RIAPI-compliant",
      children: html`<h1>Hello world!</h1>`,
    })
  )

export { homeHandler }
