import React from "react";
import { Check, ClipboardList, BarChart4, CalendarDays, KeyIcon } from "lucide-react";
import { motion } from "motion/react";
import { getCurrentCycleDates, getNextCycleStartDate } from "../types";

interface SuccessStepProps {
  onRestart: () => void;
  onGoToDashboard: () => void;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ onRestart, onGoToDashboard }) => {
  const currentCycle = getCurrentCycleDates();
  const nextCycleStart = getNextCycleStartDate();

  return (
    <motion.div
      key="step-9"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6 text-center py-6"
    >
      <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center">
        <Check className="h-8 w-8 text-emerald-400" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold font-display text-white">Pesquisa Concluída!</h3>
        <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
          Seu formulário individual foi anonimizado e integrado instantaneamente à amostra geral do <b className="text-white">Petrópolis-RJ</b>. Os percentuais já foram recalculados.
        </p>
      </div>

      {/* Cycle Period and Next Opening Notice Block */}
      <div className="bg-[#0b0c11] border border-[#1b1c27] rounded-2xl p-4 max-w-sm mx-auto text-left space-y-3 shadow-inner">
        <div className="flex items-center gap-2 text-blue-400 border-b border-[#1b1c27] pb-2">
          <CalendarDays className="h-4 w-4" />
          <span className="text-[10px] font-bold font-mono tracking-wider uppercase">Controle de Ciclos - Linkon</span>
        </div>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Ciclo Vigente:</span>
            <span className="text-white font-mono font-bold bg-[#141b2e] border border-blue-500/25 px-2 py-0.5 rounded">
              {currentCycle.start} a {currentCycle.end}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Próximo Ciclo Abre Em:</span>
            <span className="text-emerald-400 font-mono font-bold bg-[#0f2118] border border-emerald-500/25 px-2 py-0.5 rounded animate-pulse">
              {nextCycleStart}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-gray-500 leading-normal font-sans pt-1">
          * A amostragem de dados é rotativa e puramente estimulada, zerando e atualizando a cada 15 dias.
        </p>
      </div>

      <div className="pt-2 flex justify-center">
        <button
          onClick={onGoToDashboard}
          className="px-6 py-2.5 bg-[#3b82f6] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#3b82f6]/10 transition-all font-mono tracking-wide uppercase"
        >
          <BarChart4 className="h-4 w-4" />
          Ver Painel Geral de Votos
        </button>
      </div>
    </motion.div>
  );
};
