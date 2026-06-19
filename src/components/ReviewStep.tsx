import React from "react";
import { ArrowLeft, CheckSquare, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

interface ReviewStepProps {
  gender: string;
  age: string;
  neighborhood: string;
  education: string;
  income: string;
  color: string;
  religion: string;
  votePresidentName: string;
  votePresidentRunoffName: string;
  voteGovernorName: string;
  voteGovernorRunoffName: string;
  voteSenateNames: string;
  voteStateDeputyName: string;
  voteFederalDeputyName: string;
  voteMayorPetropolisName: string;
  onPrev: () => void;
  onSubmit: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  gender,
  age,
  neighborhood,
  education,
  income,
  color,
  religion,
  votePresidentName,
  votePresidentRunoffName,
  voteGovernorName,
  voteGovernorRunoffName,
  voteSenateNames,
  voteStateDeputyName,
  voteFederalDeputyName,
  voteMayorPetropolisName,
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

      <div className="bg-[#14151b] rounded-xl border border-[#1f212a] p-4 text-xs space-y-3.5 divide-y divide-[#1f212a]">
        <div className="space-y-2 pb-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Perfil Amostral:</span>
            <span className="font-bold text-[#3b82f6] font-mono">{gender}, {age} anos</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-gray-400 font-mono bg-[#0e0f14]/80 p-2.5 rounded-lg border border-[#1b1c28]">
            <div>📍 <span className="font-semibold text-gray-300">Bairro:</span> {neighborhood}</div>
            <div>🎓 <span className="font-semibold text-gray-300">Escolaridade:</span> {education}</div>
            <div>💰 <span className="font-semibold text-gray-300">Renda:</span> {income}</div>
            <div>🎨 <span className="font-semibold text-gray-300">Raça:</span> {color}</div>
            <div className="col-span-2">⛪ <span className="font-semibold text-gray-300">Religião:</span> {religion}</div>
          </div>
        </div>

        <div className="flex justify-between items-start pt-3 pb-2 gap-4">
          <span className="text-gray-400 shrink-0">Presidente (1º Turno):</span>
          <span className="font-bold text-[#3b82f6] text-right">{votePresidentName}</span>
        </div>

        <div className="flex justify-between items-start pt-3 pb-2 gap-4">
          <span className="text-gray-400 shrink-0">Presidente (2º Turno - Simulação):</span>
          <span className="font-bold text-amber-400 text-right">{votePresidentRunoffName}</span>
        </div>

        <div className="flex justify-between items-start pt-3 pb-2 gap-4">
          <span className="text-gray-400 shrink-0">Governador (1º Turno):</span>
          <span className="font-bold text-white text-right">{voteGovernorName}</span>
        </div>

        <div className="flex justify-between items-start pt-3 pb-2 gap-4">
          <span className="text-gray-400 shrink-0">Governador (2º Turno - Simulação):</span>
          <span className="font-bold text-amber-400 text-right">{voteGovernorRunoffName}</span>
        </div>

        <div className="flex justify-between items-start pt-3 pb-2 gap-4">
          <span className="text-gray-400 shrink-0">Senador(es):</span>
          <span className="font-bold text-white text-right font-serif italic">{voteSenateNames}</span>
        </div>

        <div className="flex justify-between items-start pt-3 pb-2 gap-4">
          <span className="text-gray-400 shrink-0">Deputado Estadual:</span>
          <span className="font-bold text-gray-300 text-right">{voteStateDeputyName}</span>
        </div>

        <div className="flex justify-between items-start pt-3 pb-2 gap-4">
          <span className="text-gray-400 shrink-0">Deputado Federal:</span>
          <span className="font-bold text-gray-300 text-right">{voteFederalDeputyName}</span>
        </div>

        <div className="flex justify-between items-start pt-3 pb-2 gap-4">
          <span className="text-gray-400 shrink-0">Prefeito de Petrópolis:</span>
          <span className="font-bold text-[#60a5fa] text-right">{voteMayorPetropolisName}</span>
        </div>
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
        <label htmlFor="lgpd-chk" className="text-[10px] text-gray-400 leading-relaxed cursor-pointer">
          Consentimento LGPD Ativo: Entendo que minhas escolhas são integralmente computadas na semente numérica estadual de forma anonimizada e agregada pelo Instituto Linkon.
        </label>
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={onPrev}
          className="px-4 py-2.5 bg-[#14151b] border border-[#1e2029] text-gray-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Ajustar Votos
        </button>
        <button
          onClick={onSubmit}
          className="px-6 py-3 bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] hover:scale-[1.01] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#3b82f6]/10"
        >
          <CheckSquare className="h-4 w-4" />
          Gravar & Computar Meu Voto
        </button>
      </div>
    </motion.div>
  );
};
