import { defineLiveCollection } from "astro:content"
import { emdashLoader } from "emdash/runtime"

const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
}

export { collections }
