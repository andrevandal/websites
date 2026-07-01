type Image = {
  src: string
  alt: string
}

type Tag = {
  label: string
  slug: string
}

export type Post = {
  image: Image
  tags: Tag[]
  title: string
  slug: string
}

export type Testimonial = {
  image: Image
  author: string
  content: string
}
