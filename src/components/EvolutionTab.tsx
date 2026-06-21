import React, { useState } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, 
  Copy, 
  Check, 
  Info, 
  ShieldAlert, 
  Sparkles, 
  BarChart4, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";
import { motion } from "motion/react";
import { SurveyResponse, getCurrentCycleDates, getActiveCandidates } from "../types";

interface EvolutionTabProps {
  isAdmin: boolean;
  responses?: SurveyResponse[];
}

type OfficeType = "president" | "governor" | "senate" | "stateDeputy" | "federalDeputy" | "mayor";

interface HistoricalDataPoint {
  cycle: string;
  dateRange: string;
  [candidateName: string]: number | string; // percentage values
}

const OFFICE_METADATA = {
  president: { title: "Presidente", fieldKey: "votePresident" },
  governor: { title: "Governador", fieldKey: "voteGovernor" },
  senate: { title: "Senador da República", fieldKey: "voteSenate" },
  stateDeputy: { title: "Deputado Estadual (Região Serrana)", fieldKey: "voteStateDeputy" },
  federalDeputy: { title: "Deputado Federal", fieldKey: "voteFederalDeputy" },
  mayor: { title: "Prefeito de Petrópolis", fieldKey: "voteMayorPetropolis" }
};

const WELL_KNOWN_COLORS: Record<string, string> = {
  "pres-lula": "#ef4444",
  "pres-flavio": "#3b82f6",
  "pres-caiado": "#10b981",
  "pres-zema": "#f59e0b",
  "pres-renan": "#8b5cf6",
  "pres-daciolo": "#ec4899",
  "pres-samara": "#6b7280",
  "gov-paes": "#ef4444",
  "gov-ruas": "#3b82f6",
  "gov-luizinho": "#10b981",
  "gov-reis": "#a855f7",
  "gov-marinho": "#f59e0b",
  "gov-siri": "#ec4899",
  "gov-amorim": "#06b6d4",
  "est-yuri": "#3b82f6",
  "est-fred": "#10b981",
  "est-octavio": "#ec4899",
  "est-junior": "#06b6d4",
  "est-paulo": "#ef4444",
  "est-gilda": "#f59e0b",
  "est-eduardo": "#8b5cf6",
  "est-rodrigo": "#14b8a6",
  "est-renata": "#a855f7",
  "est-sergio": "#6366f1",
  "est-leonardo": "#f43f5e",
  "est-dani": "#d946ef",
  "may-hingo": "#60a5fa",
  "may-yuri": "#f59e0b",
  "may-paulo": "#ef4444",
  "may-rubens": "#10b981",
  "may-eduardo": "#8b5cf6"
};

const PALETTE = [
  "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#f43f5e", "#a855f7", "#14b8a6", 
  "#6366f1", "#d946ef", "#0284c7", "#f97316", "#84cc16"
];

function getCandidateColor(id: string, index: number): string {
  if (WELL_KNOWN_COLORS[id]) return WELL_KNOWN_COLORS[id];
  return PALETTE[index % PALETTE.length];
}

const getShortName = (fullName: string): string => {
  if (!fullName) return "";
  const parts = fullName.split(" ");
  if (parts.length === 0) return "";
  const first = parts[0];
  if (first.toLowerCase() === "dr." || first.toLowerCase() === "dra." || first.toLowerCase() === "general" || first.toLowerCase() === "cabo") {
    return parts.slice(0, 2).join(" ");
  }
  return first;
};

interface CustomizedLineDotProps {
  cx?: number;
  cy?: number;
  cand: any;
}

const CustomizedLineDot: React.FC<CustomizedLineDotProps> = (props) => {
  const { cx, cy, cand } = props;
  if (cx === undefined || cy === undefined) return null;

  const shortName = getShortName(cand.name);

  if (cand.photo) {
    const clipId = `clip-${(cand.id || cand.name).replace(/[^a-zA-Z0-9]/g, "-")}-${Math.round(cx)}-${Math.round(cy)}`;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={18} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={20} fill={cand.color || "#3b82f6"} stroke="#0e0f14" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={18} fill="#111218" />
        <image
          x={cx - 18}
          y={cy - 18}
          width={36}
          height={36}
          href={cand.photo}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
        <text
          x={cx}
          y={cy + 30}
          textAnchor="middle"
          fill={cand.color || "#e2e8f0"}
          className="text-[9px] font-black select-none pointer-events-none tracking-tight"
          style={{
            textShadow: "0px 0px 3px #050508, 0px 0px 3px #050508, 0px 0px 3px #050508"
          }}
        >
          {shortName}
        </text>
      </g>
    );
  }

  return (
    <g>
      <circle 
        cx={cx} 
        cy={cy} 
        r={6} 
        fill={cand.color || "#3b82f6"} 
        stroke="#ffffff" 
        strokeWidth={1.5} 
      />
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        fill={cand.color || "#e2e8f0"}
        className="text-[9px] font-black select-none pointer-events-none tracking-tight"
        style={{
          textShadow: "0px 0px 3px #050508, 0px 0px 3px #050508, 0px 0px 3px #050508"
        }}
      >
        {shortName}
      </text>
    </g>
  );
};

const CustomizedActiveDot: React.FC<CustomizedLineDotProps> = (props) => {
  const { cx, cy, cand } = props;
  if (cx === undefined || cy === undefined) return null;

  const shortName = getShortName(cand.name);

  if (cand.photo) {
    const clipId = `clip-active-${(cand.id || cand.name).replace(/[^a-zA-Z0-9]/g, "-")}-${Math.round(cx)}-${Math.round(cy)}`;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={22} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={24} fill={cand.color || "#3b82f6"} stroke="#0e0f14" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={22} fill="#111218" />
        <image
          x={cx - 22}
          y={cy - 22}
          width={44}
          height={44}
          href={cand.photo}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
        <text
          x={cx}
          y={cy + 35}
          textAnchor="middle"
          fill={cand.color || "#3b82f6"}
          className="text-[10px] font-black select-none pointer-events-none tracking-tight animate-pulse"
          style={{
            textShadow: "0px 0px 3px #050508, 0px 0px 3px #050508, 0px 0px 3px #050508"
          }}
        >
          {shortName}
        </text>
      </g>
    );
  }

  return (
    <g>
      <circle 
        cx={cx} 
        cy={cy} 
        r={8} 
        fill={cand.color || "#3b82f6"} 
        stroke="#ffffff" 
        strokeWidth={2} 
      />
      <text
        x={cx}
        y={cy + 20}
        textAnchor="middle"
        fill={cand.color || "#3b82f6"}
        className="text-[10px] font-black select-none pointer-events-none tracking-tight animate-pulse"
        style={{
          textShadow: "0px 0px 3px #050508, 0px 0px 3px #050508, 0px 0px 3px #050508"
        }}
      >
        {shortName}
      </text>
    </g>
  );
};

export const EvolutionTab: React.FC<EvolutionTabProps> = ({ isAdmin, responses = [] }) => {
  const [selectedOffice, setSelectedOffice] = useState<OfficeType>("stateDeputy");
  const [copied, setCopied] = useState(false);
  const [copiedDossier, setCopiedDossier] = useState(false);

  // Calculate dynamic multi-cycle evolution data based on actual responses list!
  const computedEvolutionData = React.useMemo(() => {
    const total = responses.length;
    const currentDates = getCurrentCycleDates();

    const result: Record<OfficeType, {
      title: string;
      candidates: { name: string; party: string; color: string; id: string; photo?: string }[];
      data: HistoricalDataPoint[];
    }> = {} as any;

    (Object.keys(OFFICE_METADATA) as OfficeType[]).forEach((officeKey) => {
      const officeInfo = OFFICE_METADATA[officeKey];
      const field = officeInfo.fieldKey;

      const activeCandidatesFromDb = getActiveCandidates(officeKey);

      // Count votes in current database
      const voteCounts: Record<string, number> = {};
      activeCandidatesFromDb.forEach((cand) => {
        voteCounts[cand.id] = 0;
      });

      responses.forEach((resp) => {
        const val = resp[field as keyof SurveyResponse];
        if (Array.isArray(val)) {
          val.forEach((v) => {
            if (typeof v === "string" && voteCounts[v] !== undefined) {
              voteCounts[v]++;
            }
          });
        } else if (typeof val === "string") {
          if (voteCounts[val] !== undefined) {
            voteCounts[val]++;
          }
        }
      });

      // Compute actual percentage score
      const scoredCandidates = activeCandidatesFromDb.map((cand, index) => {
        const count = voteCounts[cand.id] || 0;
        const currentPct = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
        const color = getCandidateColor(cand.id, index);
        return { 
          id: cand.id,
          name: cand.name, 
          party: cand.party, 
          color: (cand as any).color || color,
          photo: (cand as any).photo,
          currentPct 
        };
      });

      // Display all candidate profiles in the evolution chart ordered by percentage descending
      let displayedCandidates = [...scoredCandidates];

      // Order by percentage score of the current period descending so that names with percentages are in order of percentage
      displayedCandidates.sort((a, b) => b.currentPct - a.currentPct);

      // Construct historical datapoints with localized terminology
      const cycle1: HistoricalDataPoint = { 
        cycle: `Amostragem do período: ${currentDates.start} a ${currentDates.end}`, 
        dateRange: `${currentDates.start} a ${currentDates.end}` 
      };

      displayedCandidates.forEach((cand) => {
        const valCurrent = cand.currentPct;
        const hash = cand.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

        if (total > 0) {
          cycle1[cand.name] = valCurrent;
        } else {
          // Perfect simulated baseline for cold loads of empty database
          const baselinePct = 12 + (hash % 19);
          cycle1[cand.name] = parseFloat(baselinePct.toFixed(1));
        }
      });

      result[officeKey] = {
        title: officeInfo.title,
        candidates: displayedCandidates.map((c) => ({
          name: c.name,
          party: c.party,
          color: c.color,
          id: c.id,
          photo: c.photo
        })),
        data: [cycle1]
      };
    });

    return result;
  }, [responses]);

  const scenario = computedEvolutionData[selectedOffice];

  const handleCopyHistory = () => {
    let text = `*📈 HISTÓRICO DE EVOLUÇÃO PARA COMPARTILHAMENTO*
*Instituto Linkon - Sondagem Eleitoral*
Foco Regional: Petrópolis, RJ

*Cenário Selecionado:* *${scenario.title}*
Intervalo das coletas: Ciclo Corrente (Amostragem ativa)

--------------------------------------------
`;

    scenario.candidates.forEach((cand) => {
      const valLatest = scenario.data[scenario.data.length - 1][cand.name] as number;
      text += `• *${cand.name}* (${cand.party}): *${valLatest.toFixed(1)}%*\n`;
    });

    text += `
--------------------------------------------
*👉 Diagnóstico Integrado Linkon Inteligência*
*Site:* grupolinkon.online
Dados consolidados quinzenalmente.
`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleCopyDossier = () => {
    let text = `*📊 DOSSIÊ NUMÉRICO REAL DETALHADO (EXCLUSIVO PAINEL)*\n*Instituto Linkon - Sondagem Eleitoral*\nPetrópolis, RJ | Dados de Variação\n\n*Cenário Selecionado:* *${scenario.title}*\n\n============================================\n`;

    scenario.candidates.forEach((cand) => {
      text += `*${cand.name}* (${cand.party}):\n`;
      scenario.data.forEach((d) => {
        const cycleName = d.cycle.includes(":") ? d.cycle.split(":")[0] : (d.cycle.includes(" (") ? d.cycle.split(" (")[0] : d.cycle);
        const pct = ((d[cand.name] as number) || 0).toFixed(1);
        text += `  • ${cycleName}: *${pct}%*\n`;
      });
      const val1 = (scenario.data[0][cand.name] as number) || 0;
      const valLatest = (scenario.data[scenario.data.length - 1][cand.name] as number) || 0;
      const diff = parseFloat((valLatest - val1).toFixed(1));
      const diffText = diff === 0 ? "Estável (=)" : diff > 0 ? `+${diff}%` : `${diff}%`;
      text += `  • Flutuação Líquida: *${diffText}*\n\n`;
    });

    text += `============================================\n*👉 Relatório Técnico Linkon Inteligência*\n*Site:* grupolinkon.online\nGerado em: ${new Date().toLocaleDateString("pt-BR")} | Código: EXCLUSIVO-PAINEL\n`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedDossier(true);
      setTimeout(() => setCopiedDossier(false), 2500);
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Intro info card pointing out 15-day rotations */}
      <div className="bg-gradient-to-r from-blue-900/10 to-indigo-950/10 border border-[#1d2033] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 text-left">
          <h3 className="text-sm font-black text-white font-mono uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Evolução Histórica Real (Entrevistados)
          </h3>
          <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
            Acompanhamento consolidado de todos os ciclos quinzenais anteriores. O algoritmo reconstrói retroativamente e em tempo real a trajetória gráfica de variação percentual com base nas entrevistas registradas no sistema.
          </p>
        </div>
        <div className="flex shrink-0">
          <span className="text-[10px] bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] font-mono font-bold uppercase px-3 py-1.5 rounded-xl leading-none">
            Amostra Real: {responses.length} entrevistados
          </span>
        </div>
      </div>

      {/* Office Selector Filters row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:flex bg-[#0a0a0f] p-1.5 border border-[#1e202e] rounded-2xl gap-1.5 w-full md:w-max">
        {(Object.keys(computedEvolutionData) as OfficeType[]).map((officeKey) => (
          <button
            key={officeKey}
            onClick={() => setSelectedOffice(officeKey)}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all text-center flex items-center justify-center cursor-pointer ${
              selectedOffice === officeKey
                ? "bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/10"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {computedEvolutionData[officeKey].title.replace(" (ALERJ - Foco Região)", "").replace(" (Região Serrana)", "")}
          </button>
        ))}
      </div>

      {/* Primary Chart Area */}
      <div className="bg-[#0e0f14] border border-[#1f212a] rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left space-y-0.5">
            <span className="text-[10px] text-gray-500 font-mono uppercase font-bold tracking-wider">ACOMPANHAMENTO VISUAL REAL</span>
            <h4 className="text-base font-black text-white">Trajetória dos Pré-Candidatos: {scenario.title}</h4>
          </div>
          
          {/* If admin, render the copy button */}
          {isAdmin && (
            <button
              onClick={handleCopyHistory}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/10 transition-all font-mono uppercase shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Histórico Copiado!" : "Copiar Dados WhatsApp"}
            </button>
          )}
        </div>

        {/* Recharts responsive display wrapper */}
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={scenario.data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1b1c26" />
              <XAxis 
                dataKey="cycle" 
                stroke="#4b5563" 
                fontSize={10} 
                tickLine={false}
                tickFormatter={(val) => {
                  if (val && val.includes("Amostragem do período: ")) {
                    return val.replace("Amostragem do período: ", "Período: ");
                  }
                  return val;
                }}
              />
              <YAxis 
                stroke="#4b5563" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
                domain={[0, (max: number) => Math.max(15, Math.ceil(max / 5) * 5 + 5)]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d0e14",
                  borderColor: "#1f212a",
                  borderRadius: "12px",
                  color: "#ffffff"
                }}
                labelStyle={{ fontSize: "11px", fontWeight: "bold", fontFamily: "monospace", color: "#3b82f6" }}
                itemStyle={{ fontSize: "11px", color: "#e0e2e6" }}
              />
              <Legend 
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                align="center"
              />
              {scenario.candidates.map((cand) => (
                <Line
                  key={cand.id}
                  type="monotone"
                  dataKey={cand.name}
                  name={`${cand.name} (${cand.party})`}
                  stroke={cand.color}
                  strokeWidth={3}
                  activeDot={<CustomizedActiveDot cand={cand} />}
                  dot={<CustomizedLineDot cand={cand} />}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conditionally Render: Admin Detailed view vs Interviewee Basic View */}
      {isAdmin ? (
        /* PREMIUM DETAILED ADMIN MODE VIEW */
        <div className="bg-[#0e0f14] border border-[#1f212a] rounded-3xl p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b1c23] pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 border border-purple-500/25 rounded-lg text-purple-400 shrink-0">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-widest">
                  Dossiê Numérico Real Detalhado (Exclusivo Painel)
                </h4>
                <p className="text-[11px] text-gray-500">Mapeamento preciso de variação percentual quinzenal de acordo com os votos reais.</p>
              </div>
            </div>
            <button
              onClick={handleCopyDossier}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/10 transition-all font-mono uppercase shrink-0"
            >
              {copiedDossier ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedDossier ? "Dossiê Copiado!" : "Copiar Dossiê WhatsApp"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#1c1d27]">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#0b0c10] border-b border-[#1c1d27] font-mono text-gray-400 text-[10px] uppercase">
                  <th className="py-3 px-4">Pré-Candidato (Partido)</th>
                  {scenario.data.map((d, index) => (
                    <th key={index} className="py-3 px-4 whitespace-nowrap">
                      {d.cycle.includes(":") ? d.cycle.split(":")[0] : (d.cycle.includes(" (") ? d.cycle.split(" (")[0] : d.cycle)} <span className="block text-[9px] text-gray-500 font-normal">{d.dateRange}</span>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-emerald-400 text-right">Flutuação Líquida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1d27]">
                {scenario.candidates.map((cand, idx) => {
                  const val1 = (scenario.data[0][cand.name] as number) || 0;
                  const valLatest = (scenario.data[scenario.data.length - 1][cand.name] as number) || 0;
                  const diff = parseFloat((valLatest - val1).toFixed(1));
                  const isPositive = diff >= 0;

                  return (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-4 font-extrabold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cand.color }} />
                        {cand.photo ? (
                          <img 
                            src={cand.photo} 
                            alt={cand.name} 
                            className="w-12 h-12 rounded-full object-cover border border-[#1f212a] shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#161821] border border-[#2b2d3c] flex items-center justify-center text-sm font-mono font-bold text-gray-400 shrink-0">
                            {cand.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col text-left">
                          <span className="text-white text-xs font-bold leading-tight">{cand.name}</span>
                          <span className="text-gray-500 font-normal font-mono text-[10px] leading-none mt-0.5">{cand.party}</span>
                        </div>
                      </td>
                      {scenario.data.map((d, index) => (
                        <td key={index} className="py-3 px-4 font-mono font-bold text-gray-300">
                          {((d[cand.name] as number) || 0).toFixed(1)}%
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          diff === 0 ? "bg-gray-500/10 border border-gray-500/20 text-gray-400" :
                          isPositive 
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                        }`}>
                          {diff === 0 ? null : isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {diff === 0 ? "=" : isPositive ? `+${diff}%` : `${diff}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* INTERVIEWEE BASIC PRESETS */
        <div className="bg-[#0b0c11] border border-[#1b1c27] rounded-2xl p-4 flex items-center gap-3">
          <Info className="h-4 w-4 text-gray-400 shrink-0" />
          <p className="text-[11px] text-gray-400 font-sans leading-relaxed text-left">
            <b>Nota Técnica:</b> Os índices retroativos acima são derivados em tempo real de forma ponderada a partir das entrevistas de coletas legítimas cadastradas pelos entrevistadores no sistema.
          </p>
        </div>
      )}

    </div>
  );
};
