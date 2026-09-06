const HERO_SRC =
  "https://files.vandal.services/transportugal/images/hero-bg.png"
const HERO_SRC_MOBILE =
  "https://files.vandal.services/transportugal/images/hero-bg-mobile.png"
const ABOUT_SRC = "https://files.vandal.services/transportugal/images/about.png"
const PARTNERS_SRC =
  "https://files.vandal.services/transportugal/images/partners.png"

const services = [
  {
    icon: "carga-fracionada",
    title: "Carga fracionada",
    description:
      "Consolidamos sua carga com outras no mesmo veículo, reduzindo o custo por entrega.",
    mobileOrder: "order-1",
  },
  {
    icon: "parcerias",
    title: "Parcerias logísticas",
    description:
      "Atuamos como armazém e filial para transportadoras sem base em SP/ES.",
    mobileOrder: "order-2",
  },
  {
    icon: "cross-docking",
    title: "Cross docking",
    description:
      "Sua carga passa direto, sem parar no estoque. Menos tempo, menos risco.",
    mobileOrder: "order-3",
  },
  {
    icon: "armazenagem",
    title: "Armazenagem",
    description:
      "Guardamos sua mercadoria com controle e segurança até o momento certo do envio.",
    mobileOrder: "order-5",
  },
  {
    icon: "paletizacao",
    title: "Paletização",
    description:
      "Organizamos e protegemos sua carga antes de rodar, reduzindo avaria no trajeto.",
    mobileOrder: "order-6",
  },
  {
    icon: "logistica",
    title: "Logística dedicada",
    description:
      "Rota e operação pensadas pra necessidade específica do seu negócio.",
    mobileOrder: "order-4",
  },
]

const insurances = [
  {
    label: "RCTR-C",
    title: "Responsabilidade Civil do Transportador Rodoviário de Carga",
    description:
      "Cobre perdas e danos causados à mercadoria durante o transporte, em situações como colisão, tombamento, capotagem e incêndio.",
  },
  {
    label: "RCF-DC",
    title: "Desaparecimento de Carga",
    description:
      "Cobre o desaparecimento da mercadoria junto com o veículo, em casos de furto, roubo, extorsão e apropriação indébita.",
  },
]

const differentiators = [
  {
    icon: "transparencia",
    title: "Transparência total",
    description:
      "Informação clara e feedback rápido. Se há um atraso, você fica sabendo — com a verdade.",
  },
  {
    icon: "atendimento",
    title: "Atendimento que resolve",
    description:
      "Falar com a gente é direto. Nosso diferencial começa no atendimento ao cliente.",
  },
  {
    icon: "excelencia",
    title: "Excelência operacional",
    description:
      "Segurança e comprometimento em cada etapa, com o cuidado de quem conhece a estrada.",
  },
]

const qualityIndicators = [
  "Coletas realizadas no prazo",
  "Entregas realizadas no prazo",
  "Ocorrências e não conformidades",
  "Segurança no transporte",
  "Capacitação da equipe",
  "Satisfação de quem contratou",
]

const segments = [
  "Material médico e hospitalar",
  "Supermercados e redes de varejo",
  "Magazines e lojas de departamento",
  "Material de construção",
  "Atacadistas e distribuidores",
  "Autopeças e pneus",
  "Embalagens",
  "Confecção, calçados e armarinhos",
  "Bazar e utilidades domésticas",
]

export {
  ABOUT_SRC,
  differentiators,
  HERO_SRC,
  HERO_SRC_MOBILE,
  insurances,
  PARTNERS_SRC,
  qualityIndicators,
  segments,
  services,
}
