export type TeamMember = {
  name: string
  role: string
  image: string
  summary: string
  credentials: string[]
}

export const teamMembers: TeamMember[] = [
  {
    name: "Dr. Maurício Araújo",
    role: "Periodontia e Implantodontia",
    image: "/images/mauricio.png",
    summary:
      "Referência brasileira no cenário mundial em periodontia e implantodontia, com atuação clínica, acadêmica e científica reconhecida internacionalmente.",
    credentials: [
      "Especialista e Mestre em Periodontia pela USP",
      "PhD em Odontologia pela University of Gothenburg, Suécia",
      "Professor e coordenador de residência em Periodontia na UEM",
      "Autor do estudo brasileiro em odontologia mais citado da história",
    ],
  },
  {
    name: "Dra. Daniela Botelho",
    role: "Prótese Dentária",
    image: "/images/daniela.jpg",
    summary:
      "Atuação dedicada à prótese dentária, reabilitação oral e planejamento protético com experiência sólida em clínica privada.",
    credentials: [
      "Graduação pela Universidade Estadual de Maringá",
      "Especialista em Prótese Dentária pela USP Bauru",
      "Credenciamento cirúrgico e protético ITI",
      "Mais de 17 anos de atuação em clínica privada",
    ],
  },
  {
    name: "Dra. Simone Barbisan",
    role: "Periodontia",
    image: "/images/simone.png",
    summary:
      "Periodontista com formação acadêmica robusta, foco em regeneração tecidual e experiência em ensino, pesquisa e cirurgia periodontal.",
    credentials: [
      "Graduação em Odontologia pela USP Bauru",
      "Especialização em Periodontia pela USP Bauru",
      "Mestrado e doutorado em Periodontia pela UERJ",
      "Membro da Osteology Foundation, Suíça",
    ],
  },
  {
    name: "Dra. Paula Cristina Alcântara",
    role: "Ortodontia",
    image: "/images/paula.png",
    summary:
      "Ortodontista com formação em odontopediatria e ortodontia, experiência internacional e foco em alinhadores e tratamentos contemporâneos.",
    credentials: [
      "Especialista e Mestre em Odontopediatria pela UFRJ",
      "Especialista em Ortodontia pela UVA",
      "Residência em Ortodontia pela Universidade de Michigan",
      "Invisalign Doctor",
    ],
  },
  {
    name: "Dra. Andréia Rocha",
    role: "Endodontia",
    image: "/images/andreia.png",
    summary:
      "Endodontista com longa atuação clínica, voltada para tratamentos de canal e preservação dentária com técnica previsível.",
    credentials: [
      "Graduada pela Faculdade de Odontologia da UERJ",
      "Especialista em Endodontia pela PUC-Rio",
      "Atualizações clínicas no Brasil e no exterior",
      "Mais de 30 anos de atuação em clínica privada",
    ],
  },
]

export const doctorProfile = {
  intro: [
    "Doutor Maurício Araújo é a maior referência brasileira no cenário mundial em periodontia e implantodontia. Sua relevância é reflexo de um trabalho revolucionário sobre a cicatrização dos tecidos bucais, que mudou profundamente a maneira como os dentistas lidam com cirurgias de implantes e de enxerto de tecidos.",
    "Araújo é reconhecido no cenário odontológico internacional pela capacidade de transmitir conhecimento sólido e baseado em evidências científicas, e pelos pacientes por uma odontologia eficiente, previsível e humanizada.",
  ],
  highlights: [
    "Um dos dentistas mais citados do mundo.",
    "Autor do estudo brasileiro em odontologia mais citado da história.",
    "Coautor do livro de odontologia mais vendido do mundo.",
    "Mais de 30 anos de experiência clínica somados a uma trajetória acadêmica internacional.",
  ],
  trajectory: [
    "Especialista e Mestre em Periodontia pela Universidade de São Paulo.",
    "PhD em Odontologia pela University of Gothenburg, na Suécia.",
    "Professor de Periodontia e coordenador do Programa de Residência em Periodontia da Universidade Estadual de Maringá.",
    "Ex-senior researcher do Department of Periodontology da University of Gothenburg.",
    "Atuação em conselhos editoriais e grupos de pesquisa com relevância internacional.",
  ],
  clinic: [
    "Na clínica privada no Rio de Janeiro, o Dr. Maurício atua em conjunto com uma equipe especializada para oferecer tratamentos baseados sempre no que há de mais recente, seguro e eficaz.",
    "Localizada em um dos centros empresariais mais nobres da Barra da Tijuca, a clínica reúne estrutura, biossegurança e tecnologia para um atendimento completo.",
  ],
}
