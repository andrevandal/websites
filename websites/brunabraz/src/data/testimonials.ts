import type { Testimonial } from "@/types"

export const testimonials: Testimonial[] = [
  {
    image: {
      src: "https://files.vandal.services/brunabraz/images/testimonials/headshots/juh-nogueira.jpg",
      alt: "Juh Nogueira",
    },
    author: "Juh Nogueira",
    role: "Bióloga",
    content:
      "Minha experiência com a professora foi a chave que precisava virar pra engatar em dominar o inglês. Durante as aulas ela criava um ambiente tão familiar e principalmente relatable com temas de diversos assuntos que tinha interesse e era isso que me fazia absorver tanto o conteúdo.",
  },
  {
    image: {
      src: "https://files.vandal.services/brunabraz/images/testimonials/headshots/elisete-rodrigues.png",
      alt: "Elisete Rodrigues",
    },
    author: "Elisete Rodrigues",
    role: "Professora de microbiologia",
    content:
      "Tentei desenvolver a conversação com outros professores particulares e em cursos regulares, mas sempre percebia que não evoluía. Quando comecei com a Bruna, esse se tornou meu principal objetivo. Ela sempre busca trazer temas de nosso interesse e assuntos variados, permite que a gente aproveite o tempo para aprender coisas novas, que fogem do dia a dia.",
  },
  {
    image: {
      src: "https://files.vandal.services/brunabraz/images/testimonials/headshots/alessandro-correa.png",
      alt: "Alessandro Correa",
    },
    author: "Alessandro Correa",
    role: "Professor e Imunologista",
    content:
      "No tempo que fui seu aluno, vi que ela é uma professora muito esforçada. As aulas se adequaram às minhas expectativas e necessidades. Acho que ela tem um feeling excelente para que tipo de aula dar e também um ótimo domínio de tecnologias. Eu me desenvolvi muito com ela.",
  },
  {
    image: {
      src: "https://files.vandal.services/brunabraz/images/testimonials/headshots/vitor-boyanoski.jpeg",
      alt: "Vitor Boyanoski",
    },
    author: "Vitor Boyanoski",
    role: "Cheff",
    content:
      "Ter aulas com a professora Bruna foi essencial para mim. As aulas sempre foram direcionadas e ela me preparou para entrevistas e processos seletivos internacionais. Se hoje eu moro fora do Brasil consigo falar em inglês, sem dúvida é graças ao suporte e às aulas dela.",
  },
  {
    image: {
      src: "https://files.vandal.services/brunabraz/images/testimonials/headshots/sandra-grahl.png",
      alt: "Sandra Grahl",
    },
    author: "Sandra Grahl",
    role: "Dona de casa",
    content:
      "Minha experiência foi muito boa. As aulas de inglês on-line são leves, nunca monótonas. São muito bem organizadas, dinâmicas e muito didáticas. Parecem mais um bate-papo do que propriamente uma aula de inglês. Bruna traz sempre um material do seu interesse e mantém seu interesse do início ao fim.",
  },
  {
    image: {
      src: "https://files.vandal.services/brunabraz/images/testimonials/headshots/lucas-ribeiro.png",
      alt: "Lucas Ribeiro",
    },
    author: "Lucas Ribeiro",
    role: "Programador",
    content:
      "Ter aulas com a professora Bruna é incrível, eu sou uma daquelas pessoas introvertidas, ainda mais com pessoas que não conheço, mas lembro que logo nas primeiras aulas já estava confortável o suficiente para conversar em um outro idioma que na minha cabeça eu estava falando tudo errado. Ela é uma profissional incrível!",
  },
  {
    image: {
      src: "https://files.vandal.services/brunabraz/images/testimonials/headshots/andre-vandal.jpg",
      alt: "André Van Dal",
    },
    author: "André Van Dal",
    role: "Programador",
    content:
      "Passei anos em escolas de inglês, mas travava na hora de falar. Com a recomendação da minha irmã, comecei as aulas com a Bruna e, em pouco tempo, destravei.\nAs aulas são super personalizadas para me fazer falar o tempo todo. A Bruna me deu a confiança para usar o inglês como expressão de quem eu sou, falando com clareza e com o meu próprio sotaque. Recomendo demais!",
  },
  {
    image: {
      src: "https://files.vandal.services/brunabraz/images/testimonials/headshots/isabel-limoli.png",
      alt: "Isabel Limoli",
    },
    author: "Isabel Limoli",
    role: "Bibliotecária aposentada",
    content:
      "A Bruna fez toda a diferença no meu aprendizado.\nEla preparava as aulas com muito carinho e cuidado, levando sempre em consideração o meu perfil, de maneira que a gente pudesse discutir, ler e aprender assuntos de nosso interesse.\nHoje apesar de estar com 60+, me sinto confortável para fazer minhas viagens internacionais solo. Para mim foi uma grande conquista!",
  },
].toSorted(() => Math.random() - 0.5)
