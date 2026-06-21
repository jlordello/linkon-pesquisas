import React from "react";
import { ArrowLeft, CheckSquare, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { ResolvedCandidate } from "../types";

interface ReviewStepProps {
  gender: string;
  age: string;
  neighborhood: string;
  education: string;
  income: string;
  color: string;
  religion: string;
  votePresident: ResolvedCandidate[];
  votePresidentRunoff: ResolvedCandidate[];
  voteGovernor: ResolvedCandidate[];
  voteGovernorRunoff: ResolvedCandidate[];
  voteSenate: ResolvedCandidate[];
  voteStateDeputy: ResolvedCandidate[];
  voteFederalDeputy: ResolvedCandidate[];
  voteMayorPetropolis: ResolvedCandidate[];
  onPrev: () => void;
  onSubmit: () => void;
}

const RenderCandidateRow: React.FC<{ label: string, candidates: ResolvedCandidate[] }> = ({ label, candidates }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
      <span className="text-gray-400 shrink-0 text-xs font-semibold">{label}:</span>
      
      <div className="flex flex-col gap-1.5 items-end">
        {candidates.length === 0 ? (
          <span className="text-gray-500 italic">Nenhum votado</span>
        ) : (
          candidates.map((cand, idx) => {
            if (cand.specialType === "brancosNulos" || cand.id === "brancosNulos" || cand.name === "Brancos / Nulos" || cand.id === "") {
              return (
                <span key={idx} className="bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono">
                  Brancos / Nulos
                </span>
              );
            }
            if (cand.specialType === "indecisos" || cand.id === "indecisos" || cand.name === "Não Sabe / Indeciso") {
              return (
                <span key={idx} className="bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono">
                  Não Sabe / Indeciso
                </span>
              );
            }
            
            return (
              <div key={idx} className="flex items-center gap-2 bg-[#1b1c25] border border-[#232532] px-3 py-1 rounded-lg text-right max-w-full sm:max-w-md">
                {cand.photo ? (
                  <img 
                    src={cand.photo} 
                    alt={cand.name}
                    className="w-6 h-6 rounded-full object-cover border border-[#1e2029] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-[#232532] flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                    {cand.name ? cand.name[0] : "?"}
                  </div>
                )}
                <div className="text-left select-none leading-none">
                  <p className="text-xs font-bold text-white leading-tight break-words">{cand.name}</p>
                  {cand.party && (
                    <span className="text-[9px] text-[#3b82f6] font-semibold font-mono uppercase tracking-wider block mt-0.5">{cand.party}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const ReviewStep: React.FC<ReviewStepProps> = ({
  gender,
  age,
  neighborhood,
  education,
  income,
  color,
  religion,
  votePresident,
  votePresidentRunoff,
  voteGovernor,
  voteGovernorRunoff,
  voteSenate,
  voteStateDeputy,
  voteFederalDeputy,
  voteMayorPetropolis,
  onPrev,
  onSubmit,
}) => {
  return (
    <motion.div
      key="step-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-base font-bold font-display text-white tracking-wide uppercase">Confirme suas Respostas</h3>
        <p className="text-xs text-gray-400">Verifique os votos assinalados abaixo. Suas respostas são salvas anonimamente de forma agregada.</p>
      </div>

      <div className="bg-[#14151b] rounded-xl border border-[#1f212a] p-4 text-xs space-y-1 divide-y divide-[#1f212a]">
        <div className="space-y-2 pb-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Perfil Amostral:</span>
            <span className="font-bold text-[#3b82f6] font-mono">{gender}, {age} anos</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-gray-400 font-mono bg-[#0e0f14]/80 p-2.5 rounded-lg border border-[#1b1c28]">
            <div>📍 <span className="font-semibold text-gray-300">Bairro:</span> {neighborhood}</div>
            <div>🎓 <span className="font-semibold text-gray-350">Escolaridade:</span> {education}</div>
            <div>💰 <span className="font-semibold text-gray-300">Renda:</span> {income}</div>
            <div>🎨 <span className="font-semibold text-gray-300">Raça:</span> {color}</div>
            <div className="col-span-1 sm:col-span-2">⛪ <span className="font-semibold text-gray-350">Religião:</span> {religion}</div>
          </div>
        </div>

        <RenderCandidateRow label="👑 Presidente (1º Turno)" candidates={votePresident} />
        <RenderCandidateRow label="👑 Presidente (Simulação de 2º Turno)" candidates={votePresidentRunoff} />
        <RenderCandidateRow label="🏰 Governador (1º Turno)" candidates={voteGovernor} />
        <RenderCandidateRow label="🏰 Governador (Simulação de 2º Turno)" candidates={voteGovernorRunoff} />
        <RenderCandidateRow label="🏛️ Senador da República" candidates={voteSenate} />
        <RenderCandidateRow label="⛰️ Deputado Estadual" candidates={voteStateDeputy} />
        <RenderCandidateRow label="✈️ Deputado Federal" candidates={voteFederalDeputy} />
        <RenderCandidateRow label="🏙️ Prefeito de Petrópolis" candidates={voteMayorPetropolis} />
      </div>

      {/* LGPD Safety checks disclaimer */}
      <div className="p-3.5 bg-[#1a1c22]/30 rounded-xl border border-[#232530] flex items-start gap-2.5">
        <input 
          type="checkbox" 
          defaultChecked 
          id="lgpd-chk"
          disabled
          className="accent-[#3b82f6] h-4 w-4 rounded border-gray-300 mt-0.5" 
        />
        <label htmlFor="lgpd-chk" className="text-[10px] text-gray-400 leading-relaxed cursor-pointer font-sans">
          Consentimento LGPD Ativo: Entendo que minhas escolhas são integralmente computadas na semente numérica estadual de forma anonimizada e agregada pelo Instituto Linkon.
        </label>
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={onPrev}
          className="px-4 py-2.5 bg-[#14151b] border border-[#1e2029] text-gray-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer font-sans"
        >
          <ArrowLeft className="h-4 w-4" />
          Ajustar Votos
        </button>
        <button
          onClick={onSubmit}
          className="px-6 py-3 bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] hover:scale-[1.01] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#3b82f6]/10 font-sans"
        >
          <CheckSquare className="h-4 w-4" />
          Gravar & Computar Meu Voto
        </button>
      </div>
    </motion.div>
  );
};
