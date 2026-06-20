export interface Candidate {
  id: string;
  name: string;
  party: string;
  votes: number; // Percentage out of 100 in Votos Totais
}

export interface Evaluation {
  id: string;
  entity: string;
  role: string;
  positive: number; // Ótimo/Bom%
  regular: number;  // Regular%
  negative: number; // Ruim/Péssimo%
  dontKnow: number; // Não Sabe/Não Respondeu%
}

export interface PollData {
  metadata: {
    municipality: string;
    sampleSize: number;
    marginOfError: number;
    confidenceLevel: number;
    fieldPeriod: string;
    registryNumber: string; // TRE registry info
  };
  evaluations: Evaluation[];
  presidentScenario: {
    candidates: Candidate[];
    brancosNulos: number;
    indecisos: number;
    spontaneousTop: { name: string; party: string; votes: number }[];
  };
  governorScenario: {
    candidates: Candidate[];
    brancosNulos: number;
    indecisos: number;
    spontaneousTop: { name: string; party: string; votes: number }[];
  };
  senateScenario: {
    candidates: Candidate[];
    brancosNulos: number;
    indecisos: number;
  };
  stateDeputyScenario: {
    candidates: Candidate[];
    brancosNulos: number;
    indecisos: number;
  };
  federalDeputyScenario: {
    candidates: Candidate[];
    brancosNulos: number;
    indecisos: number;
  };
  presidentRunoff?: RunoffScenario;
  governorRunoff?: RunoffScenario;
  mayorScenario?: {
    candidates: Candidate[];
    brancosNulos: number;
    indecisos: number;
  };
}

export interface RunoffScenario {
  candidates: Candidate[];
  brancosNulos: number;
  indecisos: number;
  showRunoff: boolean;
}

// Initial Mock data based on realistic regional scenario for Petrópolis-RJ
export interface CandidateConfig {
  id: string;
  name: string;
  party: string;
}

export interface QuestionConfig {
  stepIndex: number;
  key: string;
  title: string;
  subtitle: string;
  category: "president" | "presidentRunoff" | "governor" | "governorRunoff" | "senate" | "stateDeputy" | "federalDeputy" | "mayor";
  active: boolean;
}

export function getActiveCandidates(category: string): CandidateConfig[] {
  try {
    const saved = localStorage.getItem("linkon_custom_candidates_" + category);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }

  // Default fallbacks
  if (category === "president") {
    return [
      { id: "pres-lula", name: "Lula", party: "PT" },
      { id: "pres-flavio", name: "Flávio Bolsonaro", party: "PL" },
      { id: "pres-caiado", name: "Ronaldo Caiado", party: "PSD" },
      { id: "pres-zema", name: "Romeu Zema", party: "NOVO" },
      { id: "pres-renan", name: "Renan Santos", party: "Missão" },
      { id: "pres-daciolo", name: "Cabo Daciolo", party: "Mobiliza" },
      { id: "pres-samara", name: "Samara Martins", party: "UP" }
    ];
  }
  if (category === "presidentRunoff") {
    return [
      { id: "pres-lula", name: "Lula", party: "PT" },
      { id: "pres-flavio", name: "Flávio Bolsonaro", party: "PL" }
    ];
  }
  if (category === "governor") {
    return [
      { id: "gov-paes", name: "Eduardo Paes", party: "PSD" },
      { id: "gov-ruas", name: "Douglas Ruas", party: "PL" },
      { id: "gov-luizinho", name: "Dr. Luizinho", party: "PP" },
      { id: "gov-reis", name: "Washington Reis", party: "MDB" },
      { id: "gov-marinho", name: "André Marinho", party: "NOVO" },
      { id: "gov-siri", name: "William Siri", party: "PSOL" },
      { id: "gov-amorim", name: "Rodrigo Amorim", party: "União" }
    ];
  }
  if (category === "governorRunoff") {
    return [
      { id: "gov-paes", name: "Eduardo Paes", party: "PSD" },
      { id: "gov-ruas", name: "Douglas Ruas", party: "PL" }
    ];
  }
  if (category === "senate") {
    return [
      { id: "sen-crivella", name: "Marcelo Crivella", party: "Republicanos" },
      { id: "sen-benedita", name: "Benedita da Silva", party: "PT" },
      { id: "sen-monica", name: "Mônica Benício", party: "PSOL" },
      { id: "sen-otoni", name: "Otoni de Paula", party: "MDB" },
      { id: "sen-pedro", name: "Pedro Paulo", party: "PSD" }
    ];
  }
  if (category === "stateDeputy") {
    return [
      { id: "est-yuri", name: "Yuri Moura", party: "PSOL" },
      { id: "est-fred", name: "Fred Procópio", party: "MDB" },
      { id: "est-octavio", name: "Octávio Sampaio", party: "PL" },
      { id: "est-junior", name: "Junior Paixão", party: "PSDB" },
      { id: "est-paulo", name: "Paulo Mustrangi", party: "PT" },
      { id: "est-gilda", name: "Gilda Beatriz", party: "PP" },
      { id: "est-eduardo", name: "Eduardo do blog", party: "PSD" },
      { id: "est-rodrigo", name: "Rodrigo Amorim", party: "União" },
      { id: "est-renata", name: "Renata Souza", party: "PSOL" },
      { id: "est-sergio", name: "Sergio Fernandes", party: "PSD" },
      { id: "est-leonardo", name: "Leonardo França", party: "PT" },
      { id: "est-dani", name: "Dani Balbi", party: "PCdoB" }
    ];
  }
  if (category === "federalDeputy") {
    return [
      { id: "fed-hugo", name: "Hugo Leal", party: "PSD" },
      { id: "fed-bernardo", name: "Bernardo Rossi", party: "União Brasil" },
      { id: "fed-rubens", name: "Rubens Bomtempo", party: "PT" },
      { id: "fed-leandro", name: "Leandro Azevedo", party: "Republicanos" },
      { id: "fed-julia", name: "Júlia Casamasso", party: "PSOL" },
      { id: "fed-pazuello", name: "General Pazuello", party: "PL" },
      { id: "fed-taliria", name: "Talíria Petrone", party: "PSOL" },
      { id: "fed-taina", name: "Tainá de Paula", party: "PT" },
      { id: "fed-jandira", name: "Jandira Feghali", party: "PCdoB" },
      { id: "fed-lindbergh", name: "Lindbergh Farias", party: "PT" },
      { id: "fed-reimont", name: "Reimont", party: "PT" },
      { id: "fed-helio", name: "Helio Lopes", party: "PL" },
      { id: "fed-daniela", name: "Daniela do Waguinho", party: "União Brasil" },
      { id: "fed-luizinho", name: "Dr. Luizinho", party: "PP" }
    ];
  }
  if (category === "mayor") {
    return [
      { id: "may-hingo", name: "Hingo Hammes", party: "PP" },
      { id: "may-yuri", name: "Yuri Moura", party: "PSOL" },
      { id: "may-paulo", name: "Paulo Mustrangi", party: "PT" },
      { id: "may-rubens", name: "Rubens Bomtempo", party: "PT" },
      { id: "may-eduardo", name: "Eduardo do Blog", party: "Republicanos" }
    ];
  }

  return [];
}

export function saveActiveCandidates(category: string, list: CandidateConfig[]) {
  try {
    localStorage.setItem("linkon_custom_candidates_" + category, JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

export function getActiveQuestions(): QuestionConfig[] {
  try {
    const saved = localStorage.getItem("linkon_custom_questions");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }

  return [
    { stepIndex: 3, key: "votePresident", title: "Cenário Presidencial Estimulado (1º Turno)", subtitle: "Se as eleições presidenciais fossem hoje, em qual destes candidatos você votaria?", category: "president", active: true },
    { stepIndex: 4, key: "votePresidentRunoff", title: "Cenário Presidencial de Segundo Turno (Simulação)", subtitle: "Em um eventual segundo turno para Presidente entre Lula e Flávio Bolsonaro, em qual destes você votaria?", category: "presidentRunoff", active: true },
    { stepIndex: 5, key: "voteGovernor", title: "Cenário Estadual (Governador - RJ)", subtitle: "Se as eleições para Governador do Estado fossem hoje, qual destas opções você escolheria?", category: "governor", active: true },
    { stepIndex: 6, key: "voteGovernorRunoff", title: "Cenário Estadual de Segundo Turno (Governador • Simulação)", subtitle: "Em um eventual segundo turno para Governador entre Eduardo Paes e Douglas Ruas, qual candidato você escolheria?", category: "governorRunoff", active: true },
    { stepIndex: 7, key: "voteSenate", title: "Senador da República (Escolha até 2 opções)", subtitle: "Se as eleições fossem hoje, em quais dois senadores você votaria?", category: "senate", active: true },
    { stepIndex: 8, key: "voteStateDeputy", title: "Cenário Proporcional - Deputado Estadual", subtitle: "Para representar a Região Serrana na ALERJ, qual desses pré-candidatos você escolheria hoje?", category: "stateDeputy", active: true },
    { stepIndex: 9, key: "voteFederalDeputy", title: "Cenário Federal - Deputado Federal", subtitle: "Para ser o representative de Petrópolis em Brasília, em qual candidato você depositaria seu voto?", category: "federalDeputy", active: true },
    { stepIndex: 10, key: "voteMayorPetropolis", title: "Eleição Municipal - Prefeito de Petrópolis", subtitle: "Se as eleições para Prefeito de Petrópolis fossem hoje, qual destas opções você escolheria?", category: "mayor", active: true }
  ];
}

export function saveActiveQuestions(questions: QuestionConfig[]) {
  try {
    localStorage.setItem("linkon_custom_questions", JSON.stringify(questions));
  } catch (e) {
    console.error(e);
  }
}

export const initialPollData: PollData = {
  get metadata() {
    return {
      municipality: "Petrópolis-RJ",
      sampleSize: 0,
      marginOfError: 0.0,
      confidenceLevel: 95,
      fieldPeriod: "Coleta amadora em tempo real",
      registryNumber: "Sondagem eleitoral permitida pela resolução nº 23.600 do TSE."
    };
  },
  get evaluations() {
    return [
      { id: "eval-lula", entity: "Lula", role: "Presidente da República", positive: 0, regular: 0, negative: 0, dontKnow: 0 },
      { id: "eval-couto", entity: "Ricardo Couto", role: "Governador do Estado (RJ)", positive: 0, regular: 0, negative: 0, dontKnow: 0 },
      { id: "eval-hingo", entity: "Hingo Hammes", role: "Prefeito de Petrópolis", positive: 0, regular: 0, negative: 0, dontKnow: 0 }
    ];
  },
  get presidentScenario() {
    return {
      candidates: getActiveCandidates("president").map(c => ({ ...c, votes: 0 })),
      brancosNulos: 0,
      indecisos: 0,
      spontaneousTop: []
    };
  },
  get governorScenario() {
    return {
      candidates: getActiveCandidates("governor").map(c => ({ ...c, votes: 0 })),
      brancosNulos: 0,
      indecisos: 0,
      spontaneousTop: []
    };
  },
  get senateScenario() {
    return {
      candidates: getActiveCandidates("senate").map(c => ({ ...c, votes: 0 })),
      brancosNulos: 0,
      indecisos: 0
    };
  },
  get stateDeputyScenario() {
    return {
      candidates: getActiveCandidates("stateDeputy").map(c => ({ ...c, votes: 0 })),
      brancosNulos: 0,
      indecisos: 0
    };
  },
  get federalDeputyScenario() {
    return {
      candidates: getActiveCandidates("federalDeputy").map(c => ({ ...c, votes: 0 })),
      brancosNulos: 0,
      indecisos: 0
    };
  },
  get presidentRunoff() {
    return {
      candidates: getActiveCandidates("presidentRunoff").map(c => ({ ...c, votes: 0 })),
      brancosNulos: 0,
      indecisos: 0,
      showRunoff: true
    };
  },
  get governorRunoff() {
    return {
      candidates: getActiveCandidates("governorRunoff").map(c => ({ ...c, votes: 0 })),
      brancosNulos: 0,
      indecisos: 0,
      showRunoff: true
    };
  },
  get mayorScenario() {
    return {
      candidates: getActiveCandidates("mayor").map(c => ({ ...c, votes: 0 })),
      brancosNulos: 0,
      indecisos: 0
    };
  }
};

// Recalculates candidate percentage on valid votes (votos válidos) basis
export function calculateValidVotes(candidates: Candidate[], brancosNulos: number, indecisos: number): Candidate[] {
  const totalRawBase = candidates.reduce((sum, c) => sum + c.votes, 0);
  const validSum = totalRawBase; // Excluding brancosNulos & indecisos
  if (validSum === 0) return candidates.map(c => ({ ...c, votes: 0 }));
  
  return candidates.map(c => ({
    ...c,
    votes: parseFloat(((c.votes / validSum) * 100).toFixed(1))
  })).sort((a, b) => b.votes - a.votes);
}

// Function to generate professional report beautifully formatted for direct copy-pasting to WhatsApp
export function generateMarkdownReport(data: PollData): string {
  // 1. Evaluations
  const evaluationLines = data.evaluations.map(e => {
    return `• *${e.entity}* (${e.role}): *${e.positive.toFixed(1)}%* Ótimo/Bom | *${e.regular.toFixed(1)}%* Regular | *${e.negative.toFixed(1)}%* Ruim | *${e.dontKnow.toFixed(1)}%* Indeciso`;
  }).join("\n");

  // 3. President 1st Turn
  const presValid = calculateValidVotes(
    data.presidentScenario.candidates,
    data.presidentScenario.brancosNulos,
    data.presidentScenario.indecisos
  );
  const presLines = [...data.presidentScenario.candidates]
    .sort((a, b) => b.votes - a.votes)
    .map(c => {
      const v = presValid.find(cv => cv.id === c.id);
      const validPerc = v ? `${v.votes.toFixed(1)}%` : "0.0%";
      return `• *${c.name}* (${c.party}): *${c.votes.toFixed(1)}%* totais (${validPerc} válidos)`;
    }).join("\n");

  // 4. President 2nd Turn (Runoff)
  let presRunoffLines = "";
  if (data.presidentRunoff && data.presidentRunoff.showRunoff) {
    const parentValid = calculateValidVotes(
      data.presidentRunoff.candidates,
      data.presidentRunoff.brancosNulos,
      data.presidentRunoff.indecisos
    );
    const runoffCandLines = [...data.presidentRunoff.candidates]
      .sort((a, b) => b.votes - a.votes)
      .map(c => {
        const v = parentValid.find(cv => cv.id === c.id);
        const validPerc = v ? `${v.votes.toFixed(1)}%` : "0.0%";
        return `• *${c.name}* (${c.party}): *${c.votes.toFixed(1)}%* totais (${validPerc} válidos)`;
      }).join("\n");
    presRunoffLines = `\n\n*⚡ SIMULAÇÃO DE SEGUNDO TURNO PARA PRESIDENTE:*\n${runoffCandLines}\n• *Brancos / Nulos / Nenhum:* *${data.presidentRunoff.brancosNulos.toFixed(1)}%*\n• *Não Sabem / Indecisos:* *${data.presidentRunoff.indecisos.toFixed(1)}%*`;
  }

  // 5. Governor 1st Turn
  const govValid = calculateValidVotes(
    data.governorScenario.candidates,
    data.governorScenario.brancosNulos,
    data.governorScenario.indecisos
  );
  const govLines = [...data.governorScenario.candidates]
    .sort((a, b) => b.votes - a.votes)
    .map(c => {
      const v = govValid.find(cv => cv.id === c.id);
      const validPerc = v ? `${v.votes.toFixed(1)}%` : "0.0%";
      return `• *${c.name}* (${c.party}): *${c.votes.toFixed(1)}%* totais (${validPerc} válidos)`;
    }).join("\n");

  // 6. Governor 2nd Turn (Runoff)
  let govRunoffLines = "";
  if (data.governorRunoff && data.governorRunoff.showRunoff) {
    const parentValid = calculateValidVotes(
      data.governorRunoff.candidates,
      data.governorRunoff.brancosNulos,
      data.governorRunoff.indecisos
    );
    const runoffCandLines = [...data.governorRunoff.candidates]
      .sort((a, b) => b.votes - a.votes)
      .map(c => {
        const v = parentValid.find(cv => cv.id === c.id);
        const validPerc = v ? `${v.votes.toFixed(1)}%` : "0.0%";
        return `• *${c.name}* (${c.party}): *${c.votes.toFixed(1)}%* totais (${validPerc} válidos)`;
      }).join("\n");
    govRunoffLines = `\n\n*⚡ SIMULAÇÃO DE SEGUNDO TURNO PARA GOVERNADOR:*\n${runoffCandLines}\n• *Brancos / Nulos / Nenhum:* *${data.governorRunoff.brancosNulos.toFixed(1)}%*\n• *Não Sabem / Indecisos:* *${data.governorRunoff.indecisos.toFixed(1)}%*`;
  }

  // 7. Senate 1st Turn
  const senateValid = calculateValidVotes(
    data.senateScenario.candidates,
    data.senateScenario.brancosNulos,
    data.senateScenario.indecisos
  );
  const senateLines = [...data.senateScenario.candidates]
    .sort((a, b) => b.votes - a.votes)
    .map(c => {
      const v = senateValid.find(cv => cv.id === c.id);
      const validPerc = v ? `${v.votes.toFixed(1)}%` : "0.0%";
      return `• *${c.name}* (${c.party}): *${c.votes.toFixed(1)}%* totais (${validPerc} válidos)`;
    }).join("\n");

  // 8. State Deputy
  const stateValid = calculateValidVotes(
    data.stateDeputyScenario.candidates,
    data.stateDeputyScenario.brancosNulos,
    data.stateDeputyScenario.indecisos
  );
  const stateLines = [...data.stateDeputyScenario.candidates]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 8)
    .map(c => {
      const v = stateValid.find(cv => cv.id === c.id);
      const validPerc = v ? `${v.votes.toFixed(1)}%` : "0.0%";
      return `• *${c.name}* (${c.party}): *${c.votes.toFixed(1)}%* totais (${validPerc} válidos)`;
    }).join("\n");

  // 9. Federal Deputy
  const fedValid = calculateValidVotes(
    data.federalDeputyScenario.candidates,
    data.federalDeputyScenario.brancosNulos,
    data.federalDeputyScenario.indecisos
  );
  const fedLines = [...data.federalDeputyScenario.candidates]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 8)
    .map(c => {
      const v = fedValid.find(cv => cv.id === c.id);
      const validPerc = v ? `${v.votes.toFixed(1)}%` : "0.0%";
      return `• *${c.name}* (${c.party}): *${c.votes.toFixed(1)}%* totais (${validPerc} válidos)`;
    }).join("\n");

  // 10. Mayor of Petrópolis
  let mayorLines = "";
  if (data.mayorScenario) {
    const mayorValid = calculateValidVotes(
      data.mayorScenario.candidates,
      data.mayorScenario.brancosNulos,
      data.mayorScenario.indecisos
    );
    mayorLines = [...data.mayorScenario.candidates]
      .sort((a, b) => b.votes - a.votes)
      .map(c => {
        const v = mayorValid.find(cv => cv.id === c.id);
        const validPerc = v ? `${v.votes.toFixed(1)}%` : "0.0%";
        return `• *${c.name}* (${c.party}): *${c.votes.toFixed(1)}%* totais (${validPerc} válidos)`;
      }).join("\n");
  }

  return `*📊 BOLETIM DE DIVULGAÇÃO - INSTITUTO LINKON - SONDAGEM ELEITORAL*
*Petrópolis, RJ — Censo de Opinião Pública*

*📅 PERÍODO DE RECOLHIMENTO DA ENTREVISTA:* de ${getCurrentCycleDates().start} a ${getCurrentCycleDates().end}
*🚀 PRÓXIMA AMOSTRAGEM INICIA EM:* ${getNextCycleStartDate()}

*👉 Site Oficial:* grupolinkon.online

--------------------------------------------

*🏙️ PREFEITO DE PETRÓPOLIS:*
${mayorLines}
• *Brancos / Nulos / Nenhum:* *${data.mayorScenario?.brancosNulos.toFixed(1)}%*
• *Não Sabem / Indecisos:* *${data.mayorScenario?.indecisos.toFixed(1)}%*

--------------------------------------------

*📈 AVALIAÇÃO DE MANDATOS E GESTÕES:*
${evaluationLines}

--------------------------------------------

*👑 PRESIDENTE DA REPÚBLICA (1º TURNO):*
${presLines}
• *Brancos / Nulos / Nenhum:* *${data.presidentScenario.brancosNulos.toFixed(1)}%*
• *Não Sabem / Indecisos:* *${data.presidentScenario.indecisos.toFixed(1)}%*${presRunoffLines}

--------------------------------------------

*🏰 GOVERNADOR DO ESTADO (1º TURNO):*
${govLines}
• *Brancos / Nulos / Nenhum:* *${data.governorScenario.brancosNulos.toFixed(1)}%*
• *Não Sabem / Indecisos:* *${data.governorScenario.indecisos.toFixed(1)}%*${govRunoffLines}

--------------------------------------------

*🏛️ SENADOR DA REPÚBLICA:*
${senateLines}
• *Brancos / Nulos / Nenhum:* *${data.senateScenario.brancosNulos.toFixed(1)}%*
• *Não Sabem / Indecisos:* *${data.senateScenario.indecisos.toFixed(1)}%*

--------------------------------------------

*⛰️ DEPUTADO ESTADUAL (Mais Votados):*
${stateLines}
• *Brancos / Nulos / Nenhum:* *${data.stateDeputyScenario.brancosNulos.toFixed(1)}%*
• *Não Sabem / Indecisos:* *${data.stateDeputyScenario.indecisos.toFixed(1)}%*

--------------------------------------------

*✈️ DEPUTADO FEDERAL (Mais Votados):*
${fedLines}
• *Brancos / Nulos / Nenhum:* *${data.federalDeputyScenario.brancosNulos.toFixed(1)}%*
• *Não Sabem / Indecisos:* *${data.federalDeputyScenario.indecisos.toFixed(1)}%*

--------------------------------------------

*📝 FICHA TÉCNICA:*
• *Realização:* Instituto Linkon - Sondagem Eleitoral
• *Amostra:* ${data.metadata.sampleSize} questionários compilados
• *Margem de Erro:* ±${data.metadata.marginOfError}% | *Confiança:* ${data.metadata.confidenceLevel}%
• *Período de Campo:* ${data.metadata.fieldPeriod}
• *Observação:* Levantamento de opinião pública voluntária amadora.

*🔗 Divulgação Oficial:* https://grupolinkon.online
`;
}

export interface SurveyResponse {
  id: string;
  timestamp: string;
  gender: string;      // "Masculino" | "Feminino" | "Outro"
  age: string;         // "16-24" | "25-34" | "35-44" | "45-59" | "60+"
  neighborhood: string; // District/Neighborhood name
  evalLula: string;     // "positive" | "regular" | "negative" | "dontKnow"
  evalGovernor: string; // "positive" | "regular" | "negative" | "dontKnow"
  evalMayor: string;    // "positive" | "regular" | "negative" | "dontKnow"
  votePresident: string; // Candidate ID or "brancosNulos" or "indecisos"
  votePresidentRunoff?: string; // Lula or Flávio Bolsonaro, or "brancosNulos"/"indecisos"
  voteGovernor: string;  // Candidate ID or "brancosNulos" or "indecisos"
  voteGovernorRunoff?: string;  // Eduardo Paes or Douglas Ruas, or "brancosNulos"/"indecisos"
  voteSenate: string[];  // Up to 2 selected candidate IDs (comma or array based)
  voteStateDeputy: string;  // Candidate ID or "brancosNulos" or "indecisos"
  voteFederalDeputy: string; // Candidate ID or "brancosNulos" or "indecisos"
  voteMayorPetropolis?: string; // Hingo Hammes, Yuri Moura, etc. or "brancosNulos"/"indecisos"
  education: string;     // "Fundamental Completo ou Incompleto" | "Ensino Médio Completo ou Incompleto" | "Ensino Superior Completo ou Mais"
  income: string;        // "Até 2 Salários Mínimos" | "De 2 a 5 Salários Mínimos" | "Mais de 5 Salários Mínimos"
  color: string;         // "Amarela" | "Branca" | "Indígena" | "Parda" | "Preta" | "Quilombola"
  religion: string;      // "Católica" | "Evangélica/Protestante" | "Espírita / Umbanda / Candomblé" | "Outra / Sem Religião"
  suggestedCandidate?: string; // Open-text suggestion for next cycle candidate
}

export const NEIGHBORHOODS_BY_DISTRICT: Record<string, string[]> = {
  "1º Distrito: Petrópolis": [
    "Centro Histórico", "Valparaíso", "Quitandinha", "Bingen", "Alto da Serra", 
    "Morin", "Castelânea", "Siméria", "Retiro", "Mosela", "São Sebastião",
    "24 de Maio", "Vila Felipe", "Vila Real", "Meio da Serra", "Sargento Boening", 
    "Chácara Flora", "Duas Pontes", "Ponte Fones", "Moinho Preto", "Duarte da Silveira", 
    "Fazenda Inglesa", "Rocio", "Bataillard", "João Xavier", "Atílio Marotti", "Quarteirão Brasileiro"
  ],
  "2º Distrito: Cascatinha": [
    "Cascatinha", "Itamarati", "Corrêas", "Nogueira", "Quissamã", "Carangola",
    "Bairro da Glória", "Samambaia", "Roseiral", "Bonfim", "Alcobacinha", 
    "Bela Vista", "Castelo São Manoel", "Jardim Salvador"
  ],
  "3º Distrito: Itaipava": [
    "Itaipava", "Vale do Cuiabá", "Araras",
    "Madame Machado", "Catubira", "Manga Larga", "Sumidouro", "Benfica", 
    "Santa Mônica", "Castelo do Barão", "Jardim Americano"
  ],
  "4º Distrito: Pedro do Rio": [
    "Pedro do Rio", "Secretário", "Vila Rica",
    "Retiro das Pedras", "Fagundes", "Barra Mansa", "Alto Pegado", "Taquaril"
  ],
  "5º Distrito: Posse": [
    "Posse", "Brejal",
    "Caminhos do Brejal", "Rio Bonito", "Tremedeira", "Granjas Raposo", 
    "Nossa Senhora de Fátima", "Jacuba", "Ingá", "Noêmia Alves Rattes", 
    "Xingu", "Salão Azul", "Contrões", "Córrego Grande", "Córrego Sujo", 
    "Granja Cláudia", "Nilton Vieira", "Morro da Formiga", "Santo Antônio", "Boa Vista"
  ]
};

export const PETROPOLIS_NEIGHBORHOODS = Object.values(NEIGHBORHOODS_BY_DISTRICT)
  .flat()
  .sort((a, b) => a.localeCompare(b, "pt-BR"))
  .concat("Outros");

export function getDistrictForNeighborhood(neighborhood: string): string {
  for (const [district, list] of Object.entries(NEIGHBORHOODS_BY_DISTRICT)) {
    if (list.includes(neighborhood)) {
      return district;
    }
  }
  return "Outros / Não Especificado";
}

export function generateBaselineResponses(): SurveyResponse[] {
  return [];
}

export function aggregateSurveyResponses(responses: SurveyResponse[]): PollData {
  const total = responses.length;

  if (total === 0) {
    return initialPollData;
  }

  // Calculate evaluations
  const evaluations = [
    { id: "eval-lula", entity: "Lula", role: "Presidente da República" },
    { id: "eval-couto", entity: "Ricardo Couto", role: "Governador do Estado (RJ)" },
    { id: "eval-hingo", entity: "Hingo Hammes", role: "Prefeito de Petrópolis" }
  ].map(item => {
    let positive = 0;
    let regular = 0;
    let negative = 0;
    let dontKnow = 0;

    responses.forEach(r => {
      const val = item.id === "eval-lula" ? r.evalLula : item.id === "eval-couto" ? r.evalGovernor : r.evalMayor;
      if (val === "positive") positive++;
      else if (val === "regular") regular++;
      else if (val === "negative") negative++;
      else dontKnow++;
    });

    return {
      id: item.id,
      entity: item.entity,
      role: item.role,
      positive: parseFloat(((positive / total) * 100).toFixed(1)),
      regular: parseFloat(((regular / total) * 100).toFixed(1)),
      negative: parseFloat(((negative / total) * 100).toFixed(1)),
      dontKnow: parseFloat(((dontKnow / total) * 100).toFixed(1))
    };
  });

  // President Scenario
  const basePresCandidates = getActiveCandidates("president");

  let presBrancos = 0;
  let presIndecisos = 0;
  const presCounts: Record<string, number> = {};
  basePresCandidates.forEach(c => { presCounts[c.id] = 0; });

  responses.forEach(r => {
    if (r.votePresident === "brancosNulos") presBrancos++;
    else if (r.votePresident === "indecisos") presIndecisos++;
    else if (presCounts[r.votePresident] !== undefined) {
      presCounts[r.votePresident]++;
    } else {
      presIndecisos++;
    }
  });

  const presidentScenario = {
    candidates: basePresCandidates.map(c => ({
      ...c,
      votes: parseFloat(((presCounts[c.id] / total) * 100).toFixed(1))
    })),
    brancosNulos: parseFloat(((presBrancos / total) * 100).toFixed(1)),
    indecisos: parseFloat(((presIndecisos / total) * 100).toFixed(1)),
    spontaneousTop: []
  };

  // Governor Scenario
  const baseGovCandidates = getActiveCandidates("governor");

  let govBrancos = 0;
  let govIndecisos = 0;
  const govCounts: Record<string, number> = {};
  baseGovCandidates.forEach(c => { govCounts[c.id] = 0; });

  responses.forEach(r => {
    if (r.voteGovernor === "brancosNulos") govBrancos++;
    else if (r.voteGovernor === "indecisos") govIndecisos++;
    else if (govCounts[r.voteGovernor] !== undefined) {
      govCounts[r.voteGovernor]++;
    } else {
      govIndecisos++;
    }
  });

  const governorScenario = {
    candidates: baseGovCandidates.map(c => ({
      ...c,
      votes: parseFloat(((govCounts[c.id] / total) * 100).toFixed(1))
    })),
    brancosNulos: parseFloat(((govBrancos / total) * 100).toFixed(1)),
    indecisos: parseFloat(((govIndecisos / total) * 100).toFixed(1)),
    spontaneousTop: []
  };

  // Senate Scenario
  const baseSenCandidates = getActiveCandidates("senate");

  let senBrancos = 0;
  let senIndecisos = 0;
  const senCounts: Record<string, number> = {};
  baseSenCandidates.forEach(c => { senCounts[c.id] = 0; });

  responses.forEach(r => {
    let votes: string[] = [];
    if (Array.isArray(r.voteSenate)) {
      votes = r.voteSenate;
    } else if (typeof r.voteSenate === "string") {
      votes = r.voteSenate ? [r.voteSenate] : [];
    }

    if (votes.includes("brancosNulos") || votes.length === 0) {
      senBrancos++;
    } else if (votes.includes("indecisos")) {
      senIndecisos++;
    } else {
      votes.forEach(vid => {
        if (senCounts[vid] !== undefined) {
          senCounts[vid]++;
        }
      });
    }
  });

  const senateScenario = {
    candidates: baseSenCandidates.map(c => ({
      ...c,
      votes: parseFloat(((senCounts[c.id] / total) * 100).toFixed(1))
    })),
    brancosNulos: parseFloat(((senBrancos / total) * 100).toFixed(1)),
    indecisos: parseFloat(((senIndecisos / total) * 100).toFixed(1))
  };

  // State Deputy Scenario
  const baseStateCandidates = getActiveCandidates("stateDeputy");

  let stateBrancos = 0;
  let stateIndecisos = 0;
  const stateCounts: Record<string, number> = {};
  baseStateCandidates.forEach(c => { stateCounts[c.id] = 0; });

  responses.forEach(r => {
    if (r.voteStateDeputy === "brancosNulos") stateBrancos++;
    else if (r.voteStateDeputy === "indecisos") stateIndecisos++;
    else if (stateCounts[r.voteStateDeputy] !== undefined) {
      stateCounts[r.voteStateDeputy]++;
    } else {
      stateIndecisos++;
    }
  });

  const stateDeputyScenario = {
    candidates: baseStateCandidates.map(c => ({
      ...c,
      votes: parseFloat(((stateCounts[c.id] / total) * 100).toFixed(1))
    })),
    brancosNulos: parseFloat(((stateBrancos / total) * 100).toFixed(1)),
    indecisos: parseFloat(((stateIndecisos / total) * 100).toFixed(1))
  };

  // Federal Deputy Scenario
  const baseFederalCandidates = getActiveCandidates("federalDeputy");

  let fedBrancos = 0;
  let fedIndecisos = 0;
  const fedCounts: Record<string, number> = {};
  baseFederalCandidates.forEach(c => { fedCounts[c.id] = 0; });

  responses.forEach(r => {
    if (r.voteFederalDeputy === "brancosNulos") fedBrancos++;
    else if (r.voteFederalDeputy === "indecisos") fedIndecisos++;
    else if (fedCounts[r.voteFederalDeputy] !== undefined) {
      fedCounts[r.voteFederalDeputy]++;
    } else {
      fedIndecisos++;
    }
  });

  const federalDeputyScenario = {
    candidates: baseFederalCandidates.map(c => ({
      ...c,
      votes: parseFloat(((fedCounts[c.id] / total) * 100).toFixed(1))
    })),
    brancosNulos: parseFloat(((fedBrancos / total) * 100).toFixed(1)),
    indecisos: parseFloat(((fedIndecisos / total) * 100).toFixed(1))
  };

  // Runoff (Segundo Turno) Scenarios
  const basePresRunoffCandidates = getActiveCandidates("presidentRunoff");
  let presRunoffBrancos = 0;
  let presRunoffIndecisos = 0;
  const presRunoffCounts: Record<string, number> = {};
  basePresRunoffCandidates.forEach(c => { presRunoffCounts[c.id] = 0; });

  responses.forEach(r => {
    const val = r.votePresidentRunoff || "";
    if (val === "brancosNulos") {
      presRunoffBrancos++;
    } else if (val === "indecisos") {
      presRunoffIndecisos++;
    } else if (presRunoffCounts[val] !== undefined) {
      presRunoffCounts[val]++;
    } else {
      presRunoffIndecisos++;
    }
  });

  const presidentRunoff = {
    candidates: basePresRunoffCandidates.map(c => ({
      ...c,
      votes: total > 0 ? parseFloat(((presRunoffCounts[c.id] / total) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.votes - a.votes),
    brancosNulos: total > 0 ? parseFloat(((presRunoffBrancos / total) * 100).toFixed(1)) : 0,
    indecisos: total > 0 ? parseFloat(((presRunoffIndecisos / total) * 100).toFixed(1)) : 0,
    showRunoff: true
  };

  const baseGovRunoffCandidates = getActiveCandidates("governorRunoff");
  let govRunoffBrancos = 0;
  let govRunoffIndecisos = 0;
  const govRunoffCounts: Record<string, number> = {};
  baseGovRunoffCandidates.forEach(c => { govRunoffCounts[c.id] = 0; });

  responses.forEach(r => {
    const val = r.voteGovernorRunoff || "";
    if (val === "brancosNulos") {
      govRunoffBrancos++;
    } else if (val === "indecisos") {
      govRunoffIndecisos++;
    } else if (govRunoffCounts[val] !== undefined) {
      govRunoffCounts[val]++;
    } else {
      govRunoffIndecisos++;
    }
  });

  const governorRunoff = {
    candidates: baseGovRunoffCandidates.map(c => ({
      ...c,
      votes: total > 0 ? parseFloat(((govRunoffCounts[c.id] / total) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.votes - a.votes),
    brancosNulos: total > 0 ? parseFloat(((govRunoffBrancos / total) * 100).toFixed(1)) : 0,
    indecisos: total > 0 ? parseFloat(((govRunoffIndecisos / total) * 100).toFixed(1)) : 0,
    showRunoff: true
  };

  // Mayor of Petrópolis Scenario
  const baseMayorCandidates = getActiveCandidates("mayor");

  let mayBrancos = 0;
  let mayIndecisos = 0;
  const mayCounts: Record<string, number> = {};
  baseMayorCandidates.forEach(c => { mayCounts[c.id] = 0; });

  responses.forEach(r => {
    const val = r.voteMayorPetropolis || "";
    if (val === "brancosNulos") {
      mayBrancos++;
    } else if (val === "indecisos") {
      mayIndecisos++;
    } else if (mayCounts[val] !== undefined) {
      mayCounts[val]++;
    } else {
      mayIndecisos++;
    }
  });

  const mayorScenario = {
    candidates: baseMayorCandidates.map(c => ({
      ...c,
      votes: total > 0 ? parseFloat(((mayCounts[c.id] / total) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.votes - a.votes),
    brancosNulos: total > 0 ? parseFloat(((mayBrancos / total) * 100).toFixed(1)) : 0,
    indecisos: total > 0 ? parseFloat(((mayIndecisos / total) * 100).toFixed(1)) : 0
  };

  return {
    metadata: {
      municipality: "Petrópolis-RJ",
      sampleSize: total,
      marginOfError: total > 0 ? parseFloat((1.96 * Math.sqrt(0.25 / total) * 100).toFixed(1)) : 0.0,
      confidenceLevel: 95,
      fieldPeriod: `de ${getCurrentCycleDates().start} a ${getCurrentCycleDates().end}`,
      registryNumber: "Sondagem eleitoral permitida pela resolução nº 23.600 do TSE."
    },
    evaluations,
    presidentScenario,
    governorScenario,
    senateScenario,
    stateDeputyScenario,
    federalDeputyScenario,
    presidentRunoff,
    governorRunoff,
    mayorScenario
  };
}

export interface CycleDates {
  start: string;
  end: string;
  key: string;
}

export function getCurrentCycleDates(): CycleDates {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1; // 1-indexed
  const year = now.getFullYear();

  const pad = (n: number) => n.toString().padStart(2, "0");

  let startDay = 1;
  let endDay = 15;
  let cycleIndex = 1;

  if (day > 15) {
    startDay = 16;
    // Last day of current month
    const lastDayObj = new Date(year, now.getMonth() + 1, 0);
    endDay = lastDayObj.getDate();
    cycleIndex = 2;
  }

  const start = `${pad(startDay)}/${pad(month)}/${year}`;
  const end = `${pad(endDay)}/${pad(month)}/${year}`;
  const key = `${year}-${pad(month)}-${cycleIndex}`;

  return { start, end, key };
}

export function getNextCycleStartDate(): string {
  const now = new Date();
  const day = now.getDate();
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (day <= 15) {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return `16/${pad(month)}/${year}`;
  } else {
    let nextMonth = now.getMonth() + 2;
    let nextYear = now.getFullYear();
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    return `01/${pad(nextMonth)}/${nextYear}`;
  }
}

export interface CandidateDemographicProfile {
  candidateId: string;
  name: string;
  party: string;
  totalVotes: number;
  totalSample: number;
  pctOfVoters: number;
  gender: {
    feminino: number;
    masculino: number;
    outro: number;
  };
  age: {
    "16-24": number;
    "25-34": number;
    "35-44": number;
    "45-59": number;
    "60+": number;
  };
  neighborhoods: { neighborhood: string; percentage: number; count: number }[];
  education: Record<string, number>;
  income: Record<string, number>;
  color: Record<string, number>;
  religion: Record<string, number>;
  evaluations: {
    lula: { positive: number; regular: number; negative: number; dontKnow: number };
    governor: { positive: number; regular: number; negative: number; dontKnow: number };
    mayor: { positive: number; regular: number; negative: number; dontKnow: number };
  };
}

export function calculateCandidateProfile(
  responses: SurveyResponse[],
  candidateId: string,
  category: "president" | "governor" | "senate" | "stateDeputy" | "federalDeputy",
  candidateName: string,
  candidateParty: string
): CandidateDemographicProfile {
  const totalSample = responses.length;

  // Filter respondents who chose this candidate
  const candidateVoters = responses.filter(r => {
    if (category === "president") return r.votePresident === candidateId;
    if (category === "governor") return r.voteGovernor === candidateId;
    if (category === "senate") {
      if (Array.isArray(r.voteSenate)) return r.voteSenate.includes(candidateId);
      return r.voteSenate === candidateId;
    }
    if (category === "stateDeputy") return r.voteStateDeputy === candidateId;
    if (category === "federalDeputy") return r.voteFederalDeputy === candidateId;
    return false;
  });

  const totalVotes = candidateVoters.length;
  const pctOfVoters = totalSample > 0 ? parseFloat(((totalVotes / totalSample) * 100).toFixed(1)) : 0;

  if (totalVotes === 0 || totalSample === 0) {
    return {
      candidateId,
      name: candidateName,
      party: candidateParty,
      totalVotes: 0,
      totalSample,
      pctOfVoters: 0,
      gender: { feminino: 0, masculino: 0, outro: 0 },
      age: { "16-24": 0, "25-34": 0, "35-44": 0, "45-59": 0, "60+": 0 },
      neighborhoods: [],
      education: {},
      income: {},
      color: {},
      religion: {},
      evaluations: {
        lula: { positive: 0, regular: 0, negative: 0, dontKnow: 0 },
        governor: { positive: 0, regular: 0, negative: 0, dontKnow: 0 },
        mayor: { positive: 0, regular: 0, negative: 0, dontKnow: 0 }
      }
    };
  }

  // Calculate Genders
  let fem = 0, masc = 0, out = 0;
  candidateVoters.forEach(r => {
    if (r.gender === "Feminino") fem++;
    else if (r.gender === "Masculino") masc++;
    else out++;
  });

  // Calculate Ages
  let age1 = 0, age2 = 0, age3 = 0, age4 = 0, age5 = 0;
  candidateVoters.forEach(r => {
    if (r.age === "16-24") age1++;
    else if (r.age === "25-34") age2++;
    else if (r.age === "35-44") age3++;
    else if (r.age === "45-59") age4++;
    else if (r.age === "60+") age5++;
  });

  // Calculate Neighborhoods
  const neighCounts: Record<string, number> = {};
  candidateVoters.forEach(r => {
    if (r.neighborhood) {
      neighCounts[r.neighborhood] = (neighCounts[r.neighborhood] || 0) + 1;
    }
  });
  const sortedNeighborhoods = Object.entries(neighCounts)
    .map(([neighborhood, count]) => ({
      neighborhood,
      count,
      percentage: parseFloat(((count / totalVotes) * 100).toFixed(1))
    }))
    .sort((a, b) => b.count - a.count);

  // Aligned Evaluations
  let lulaPos = 0, lulaReg = 0, lulaNeg = 0, lulaDk = 0;
  let govPos = 0, govReg = 0, govNeg = 0, govDk = 0;
  let mayorPos = 0, mayorReg = 0, mayorNeg = 0, mayorDk = 0;

  const eduCounts: Record<string, number> = {};
  const incCounts: Record<string, number> = {};
  const colCounts: Record<string, number> = {};
  const relCounts: Record<string, number> = {};

  candidateVoters.forEach(r => {
    // Lula
    if (r.evalLula === "positive") lulaPos++;
    else if (r.evalLula === "regular") lulaReg++;
    else if (r.evalLula === "negative") lulaNeg++;
    else lulaDk++;

    // Governor
    if (r.evalGovernor === "positive") govPos++;
    else if (r.evalGovernor === "regular") govReg++;
    else if (r.evalGovernor === "negative") govNeg++;
    else govDk++;

    // Mayor
    if (r.evalMayor === "positive") mayorPos++;
    else if (r.evalMayor === "regular") mayorReg++;
    else if (r.evalMayor === "negative") mayorNeg++;
    else mayorDk++;

    // Demographics
    const edu = r.education || "Não Informado";
    eduCounts[edu] = (eduCounts[edu] || 0) + 1;

    const inc = r.income || "Não Informado";
    incCounts[inc] = (incCounts[inc] || 0) + 1;

    const col = r.color || "Não Informado";
    colCounts[col] = (colCounts[col] || 0) + 1;

    const rel = r.religion || "Não Informado";
    relCounts[rel] = (relCounts[rel] || 0) + 1;
  });

  const education: Record<string, number> = {};
  Object.entries(eduCounts).forEach(([k, v]) => {
    education[k] = parseFloat(((v / totalVotes) * 100).toFixed(1));
  });

  const income: Record<string, number> = {};
  Object.entries(incCounts).forEach(([k, v]) => {
    income[k] = parseFloat(((v / totalVotes) * 100).toFixed(1));
  });

  const color: Record<string, number> = {};
  Object.entries(colCounts).forEach(([k, v]) => {
    color[k] = parseFloat(((v / totalVotes) * 100).toFixed(1));
  });

  const religion: Record<string, number> = {};
  Object.entries(relCounts).forEach(([k, v]) => {
    religion[k] = parseFloat(((v / totalVotes) * 100).toFixed(1));
  });

  return {
    candidateId,
    name: candidateName,
    party: candidateParty,
    totalVotes,
    totalSample,
    pctOfVoters,
    gender: {
      feminino: parseFloat(((fem / totalVotes) * 100).toFixed(1)),
      masculino: parseFloat(((masc / totalVotes) * 100).toFixed(1)),
      outro: parseFloat(((out / totalVotes) * 100).toFixed(1))
    },
    age: {
      "16-24": parseFloat(((age1 / totalVotes) * 100).toFixed(1)),
      "25-34": parseFloat(((age2 / totalVotes) * 100).toFixed(1)),
      "35-44": parseFloat(((age3 / totalVotes) * 100).toFixed(1)),
      "45-59": parseFloat(((age4 / totalVotes) * 100).toFixed(1)),
      "60+": parseFloat(((age5 / totalVotes) * 100).toFixed(1))
    },
    neighborhoods: sortedNeighborhoods,
    education,
    income,
    color,
    religion,
    evaluations: {
      lula: {
        positive: parseFloat(((lulaPos / totalVotes) * 100).toFixed(1)),
        regular: parseFloat(((lulaReg / totalVotes) * 100).toFixed(1)),
        negative: parseFloat(((lulaNeg / totalVotes) * 100).toFixed(1)),
        dontKnow: parseFloat(((lulaDk / totalVotes) * 100).toFixed(1))
      },
      governor: {
        positive: parseFloat(((govPos / totalVotes) * 100).toFixed(1)),
        regular: parseFloat(((govReg / totalVotes) * 100).toFixed(1)),
        negative: parseFloat(((govNeg / totalVotes) * 100).toFixed(1)),
        dontKnow: parseFloat(((govDk / totalVotes) * 100).toFixed(1))
      },
      mayor: {
        positive: parseFloat(((mayorPos / totalVotes) * 100).toFixed(1)),
        regular: parseFloat(((mayorReg / totalVotes) * 100).toFixed(1)),
        negative: parseFloat(((mayorNeg / totalVotes) * 100).toFixed(1)),
        dontKnow: parseFloat(((mayorDk / totalVotes) * 100).toFixed(1))
      }
    }
  };
}
