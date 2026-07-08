type Lang = "en" | "pt"

type Dict = {
  stamp_est: string
  head_static: string
  head_rotating: string[]
  lead: string
  cta_primary: string
  mode1_t: string
  mode1_d: string
  mode2_t: string
  mode2_d: string
  mode3_t: string
  mode3_d: string
  foot_since: string
  foot_name: string
  foot_cnpj: string
  foot_addr: string
  foot_email: string
  foot_copy: string
  wa_general: string
  wa_consulting: string
  wa_training: string
  wa_impl: string
}

const dictionaries: Record<Lang, Dict> = {
  en: {
    stamp_est: "Est. 2015",
    head_static: "Think deep.",
    head_rotating: ["Unlock more.", "Go further."],
    lead: "Every company has more in it. We find what's holding yours back — even the part you can't see — and help you get past it.",
    cta_primary: "Start a conversation",
    mode1_t: "Consulting",
    mode1_d:
      "We guide your team through the hard calls — and name the risks before they bite.",
    mode2_t: "Training",
    mode2_d:
      "We level up your team on its own real code — until it stops needing us.",
    mode3_t: "Implementation",
    mode3_d:
      "We build the solution ourselves — and leave the structure with your team.",
    foot_since: "Unlocking companies' potential since 2015.",
    foot_name: "Vandal Labs Ltda.",
    foot_cnpj: "CNPJ 23.018.045/0001-99",
    foot_addr:
      "R. Bom Jesus, 212, Sala 1904 — Juvevê, Curitiba/PR · CEP 80.035-010",
    foot_email: "contato@vandallabs.com.br",
    foot_copy: "© 2026 Vandal Labs — Think deep. Unlock more.",
    wa_general: "Hi Vandal Labs! I would like to chat about working together.",
    wa_consulting: "Hi Vandal Labs! I would like to talk about consulting.",
    wa_training: "Hi Vandal Labs! I would like to talk about training.",
    wa_impl: "Hi Vandal Labs! I would like to talk about implementation.",
  },
  pt: {
    stamp_est: "Desde 2015",
    head_static: "Pense fundo.",
    head_rotating: ["Destrave mais.", "Vá mais longe."],
    lead: "Toda empresa tem mais potencial do que usa. Encontramos o que está te travando — mesmo a parte que você não enxerga — e ajudamos a superar.",
    cta_primary: "Iniciar uma conversa",
    mode1_t: "Consultoria",
    mode1_d:
      "Guiamos seu time nas decisões difíceis — e apontamos os riscos antes que eles doam.",
    mode2_t: "Treinamento",
    mode2_d:
      "Evoluímos seu time no código real dele — até parar de precisar de nós.",
    mode3_t: "Implementação",
    mode3_d:
      "Construímos a solução nós mesmos — e deixamos a estrutura com seu time.",
    foot_since: "Destravando o potencial de empresas desde 2015.",
    foot_name: "Vandal Labs Ltda.",
    foot_cnpj: "CNPJ 23.018.045/0001-99",
    foot_addr:
      "R. Bom Jesus, 212, Sala 1904 — Juvevê, Curitiba/PR · CEP 80.035-010",
    foot_email: "contato@vandallabs.com.br",
    foot_copy: "© 2026 Vandal Labs — Pense fundo. Destrave mais.",
    wa_general: "Olá, Vandal Labs! Gostaria de conversar sobre uma parceria.",
    wa_consulting: "Olá, Vandal Labs! Gostaria de falar sobre consultoria.",
    wa_training: "Olá, Vandal Labs! Gostaria de falar sobre treinamento.",
    wa_impl: "Olá, Vandal Labs! Gostaria de falar sobre implementação.",
  },
}

export type { Lang, Dict }
export { dictionaries }
