type Specialty = {
  slug: string
  title: string
  shortTitle: string
  description: string
  intro: string[]
  bullets: string[]
  metaDescription: string
}

export const specialties: Specialty[] = [
  {
    slug: "implante-dentario",
    title: "Implante dentário",
    shortTitle: "Implante dentário",
    description:
      "Solução previsível para reposição dentária com suporte estável, planejamento digital e segurança cirúrgica.",
    metaDescription:
      "Implante dentário na Barra da Tijuca com planejamento digital, cirurgia segura e equipe especializada.",
    intro: [
      "O implante dentário é uma estrutura de titânio que substitui a raiz do dente perdido e serve de base para a prótese dentária.",
      "O tratamento recupera mastigação, dicção e estética, e exige avaliação cuidadosa da gengiva, do osso e do planejamento protético final.",
    ],
    bullets: [
      "Planejamento com tomografia e fluxo digital.",
      "Equipe com forte atuação em implantodontia baseada em evidência.",
      "Suporte para reabilitações unitárias, múltiplas e casos mais complexos.",
    ],
  },
  {
    slug: "periodontia",
    title: "Periodontia",
    shortTitle: "Periodontia",
    description:
      "Diagnóstico e tratamento de gengiva, osso e tecidos de suporte com foco preventivo e regenerativo.",
    metaDescription:
      "Tratamento periodontal com foco em prevenção, gengivite, periodontite e cirurgias gengivais no Rio de Janeiro.",
    intro: [
      "A periodontia trata gengiva e os tecidos que sustentam os dentes, incluindo prevenção, controle de inflamação e cirurgias para correção estética ou funcional.",
      "Como muitas doenças periodontais começam sem dor, o diagnóstico precoce e o acompanhamento profissional são essenciais para preservar dentes e tecidos.",
    ],
    bullets: [
      "Tratamento de gengivite e periodontite.",
      "Rejuvenescimento gengival e cirurgia plástica periodontal.",
      "Técnicas menos invasivas, incluindo tunelização e enxertos.",
    ],
  },
  {
    slug: "protese-dentaria",
    title: "Prótese dentária",
    shortTitle: "Prótese dentária",
    description:
      "Reabilitação oral para devolver mastigação, estética e dicção com planejamento individualizado.",
    metaDescription:
      "Prótese dentária na Barra da Tijuca com planejamento individualizado, foco funcional e estética previsível.",
    intro: [
      "Prótese dentária é o conjunto de recursos utilizados para reconstruir ou repor dentes perdidos, devolvendo qualidade de vida, função mastigatória e segurança ao sorrir.",
      "Na Clínica Maurício Araújo, o planejamento leva em conta estética, dicção, conforto e integração com tratamentos de implantes, periodontia e odontologia digital.",
    ],
    bullets: [
      "Coroas unitárias e reabilitações parciais ou extensas.",
      "Planejamento com foco em mastigação, fonética e naturalidade do sorriso.",
      "Integração com implantes e restaurações indiretas em cerâmica.",
    ],
  },
  {
    slug: "lentes-de-contato",
    title: "Lentes de contato",
    shortTitle: "Lentes de contato dental",
    description:
      "Correção estética com lâminas cerâmicas finas, planejamento digital e mockup para previsibilidade.",
    metaDescription:
      "Lentes de contato dental com planejamento estético e execução cuidadosa na Barra da Tijuca.",
    intro: [
      "Lentes de contato dentais são lâminas finas de porcelana capazes de modificar forma e cor dos dentes com abordagem minimamente invasiva em casos bem indicados.",
      "A clínica trabalha com avaliação individual, registros fotográficos, planejamento digital e mockup para que o paciente participe da decisão estética.",
    ],
    bullets: [
      "Planejamento digital com simulação do resultado.",
      "Definição de cor, forma e textura compatíveis com o sorriso.",
      "Execução conservadora e cimentação com materiais atuais.",
    ],
  },
  {
    slug: "extracao-do-siso",
    title: "Extração do siso",
    shortTitle: "Extração do siso",
    description:
      "Cirurgia oral com técnica atraumática, preservação óssea e avaliação criteriosa da real necessidade.",
    metaDescription:
      "Extração do siso com avaliação criteriosa, técnica atraumática e foco em conforto pós-operatório.",
    intro: [
      "A extração do siso é indicada quando não há espaço adequado para erupção, quando há dor, inflamação, dificuldade de higiene ou risco para dentes vizinhos.",
      "Na clínica, as extrações são planejadas de forma individual, com técnicas atuais que priorizam menos trauma cirúrgico e melhor preservação dos tecidos.",
    ],
    bullets: [
      "Indicação baseada em avaliação clínica e radiográfica.",
      "Técnicas atraumáticas e preservação de rebordo ósseo.",
      "Suporte para sedação ambulatorial em casos selecionados.",
    ],
  },
  {
    slug: "tratamento-de-canal",
    title: "Tratamento de canal",
    shortTitle: "Tratamento de canal",
    description:
      "Endodontia para preservar dentes comprometidos, aliviar dor e restaurar a função com segurança.",
    metaDescription:
      "Tratamento de canal e endodontia na Barra da Tijuca com foco em preservação dentária e previsibilidade.",
    intro: [
      "O tratamento de canal remove o conteúdo interno comprometido dos canais radiculares e permite manter o dente em boca quando há inflamação, infecção ou lesões pulpares.",
      "O objetivo é preservar a estrutura dentária, eliminar sintomas e devolver qualidade de vida com uma abordagem técnica segura.",
    ],
    bullets: [
      "Diagnóstico com exames clínicos e radiográficos.",
      "Tratamento de dor, infecção e necessidade de retratamento.",
      "Preservação da estrutura dentária sempre que possível.",
    ],
  },
  {
    slug: "ortodontia",
    title: "Ortodontia",
    shortTitle: "Ortodontia",
    description:
      "Correção da posição dos dentes e da arcada com planejamento funcional, estético e preventivo.",
    metaDescription:
      "Ortodontia na Barra da Tijuca para alinhamento dentário, função mastigatória e estética do sorriso.",
    intro: [
      "A ortodontia corrige posição dos dentes e bases ósseas quando estão desalinhados, melhorando estética, higiene, mastigação e conforto funcional.",
      "O planejamento ortodôntico da clínica considera diagnóstico completo, histórico do paciente e as necessidades reais de cada caso.",
    ],
    bullets: [
      "Correção de apinhamento, mordidas cruzadas e sobremordidas.",
      "Diagnóstico com documentação e análise completa da arcada.",
      "Tratamentos alinhados com estética e saúde bucal de longo prazo.",
    ],
  },
  {
    slug: "clareamento-dental",
    title: "Clareamento dental",
    shortTitle: "Clareamento dental",
    description:
      "Renovação estética do sorriso com clareamento personalizado, supervisão profissional e foco no conforto.",
    metaDescription:
      "Clareamento dental personalizado na Barra da Tijuca, com supervisão profissional e foco no bem-estar.",
    intro: [
      "O clareamento dental é indicado para remover pigmentações e devolver o tom natural e brilhante ao sorriso com segurança.",
      "Nosso protocolo prioriza o diagnóstico prévio para garantir saúde gengival e controle de sensibilidade.",
    ],
    bullets: [
      "Protocolos de clareamento personalizado (consultório ou casa).",
      "Avaliação de saúde gengival e contraindicações.",
      "Acompanhamento profissional para controle de sensibilidade.",
    ],
  },
  {
    slug: "sedacao-consciente",
    title: "Sedação consciente",
    shortTitle: "Sedação consciente",
    description:
      "Atendimento odontológico relaxante com suporte de óxido nitroso, eliminando ansiedade e garantindo conforto.",
    metaDescription:
      "Sedação consciente na Barra da Tijuca com óxido nitroso para um atendimento relaxante e sem medo.",
    intro: [
      "A sedação consciente com óxido nitroso proporciona relaxamento profundo durante procedimentos odontológicos.",
      "Ideal para pacientes com ansiedade, é um método seguro, reversível e que permite manter a consciência e resposta.",
    ],
    bullets: [
      "Uso seguro de óxido nitroso (sedação inalatória).",
      "Monitoramento constante da equipe durante todo o atendimento.",
      "Ideal para procedimentos complexos ou pacientes ansiosos.",
    ],
  },
]
