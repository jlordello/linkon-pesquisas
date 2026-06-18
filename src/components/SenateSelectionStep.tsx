import React from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { motion } from "motion/react";
import { Candidate } from "../types";

interface SenateSelectionStepProps {
  candidates: Candidate[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const SenateSelectionStep: React.FC<SenateSelectionStepProps> = ({
  candidates,
  selectedValues = [],
  onChange,
  onNext,
  onPrev,
}) => {
  const handleToggle = (id: string) => {
    // If selecting special values, replace everything
    if (id === "brancosNulos" || id === "indecisos") {
      onChange([id]);
      return;
    }

    // Filter out special categories if present
    const cleaned = selectedValues.filter(v => v !== "brancosNulos" && v !== "indecisos");

    if (cleaned.includes(id)) {
      // De-select
      const next = cleaned.filter(v => v !== id);
      onChange(next);
    } else {
      // Select (max 2 items)
      if (cleaned.length < 2) {
        onChange([...cleaned, id]);
      } else {
        // If already 2, replace the earliest one
        onChange([cleaned[1], id]);
      }
    }
  };

  const isSelected = (id: string) => {
    return selectedValues.includes(id);
  };

  const getSeltCount = () => {
    if (selectedValues.includes("brancosNulos") || selectedValues.includes("indecisos")) {
      return 1;
    }
    return selectedValues.length;
  };

  return (
    <motion.div
      key="step-5"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display text-white tracking-wide uppercase">Cenário Senado Federal</h3>
          <span className="text-[10px] bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30 font-semibold font-mono tracking-wider px-2 py-0.5 rounded">
            Selecione até 2 nomes
          </span>
         </div>
        <p className="text-xs text-gray-400">Você deve preencher duas opções de voto para Senador pelo Estado do Rio de Janeiro:</p>
      </div>

      <div className="space-y-2.5 max-h-[352px] overflow-y-auto pr-2 custom-scrollbar">
        {candidates.map((cand) => {
          const selected = isSelected(cand.id);
          return (
            <button
              key={cand.id}
              type="button"
              onClick={() => handleToggle(cand.id)}
              className={`w-full p-3.5 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                selected
                  ? "bg-[#3b82f6]/15 border-[#3b82f6] text-[#3b82f6]"
                  : "bg-[#111218] border-[#1e2029] text-gray-300 hover:border-gray-500"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                  selected 
                    ? "bg-[#3b82f6] border-[#3b82f6] text-white" 
                    : "bg-gradient-to-br from-gray-700 to-gray-900 border-gray-650 text-white"
                }`}>
                  {selected ? <Check className="h-4 w-4 stroke-[3px]" /> : cand.name[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{cand.name}</p>
                  <span className="text-[10px] text-gray-400 font-mono">Partido: {cand.party}</span>
                </div>
              </div>
              <span className={`text-[9px] font-mono border px-2 py-0.5 rounded font-bold uppercase ${
                selected ? "border-[#3b82f6] text-[#3b82f6]" : "border-gray-800 text-gray-500"
              }`}>
                {selected ? "Selecionado" : "Estimulada"}
              </span>
            </button>
          );
        })}

        {/* Extras options */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleToggle("brancosNulos")}
            className={`p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
              isSelected("brancosNulos")
                ? "bg-rose-500/10 border-rose-500 text-rose-400"
                : "bg-[#111218] border-[#1e2029] text-gray-400 hover:border-gray-650"
            }`}
          >
            ⚪ Brancos / Nulos
          </button>
          <button
            type="button"
            onClick={() => handleToggle("indecisos")}
            className={`p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
              isSelected("indecisos")
                ? "bg-sky-505/10 border-sky-400 text-sky-400"
                : "bg-[#111218] border-[#1e2029] text-gray-400 hover:border-gray-650"
            }`}
          >
            ❓ Não Sabe / Indeciso
          </button>
        </div>
      </div>

      <div className="pt-4 flex justify-between items-center bg-black/10 p-2 rounded-xl border border-transparent">
        <button
          onClick={onPrev}
          className="px-4 py-2.5 bg-[#14151b] border border-[#1e2029] text-gray-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <span className="text-xs font-semibold text-gray-400 font-mono">
          {getSeltCount()} de 2 votos definidos
        </span>
        <button
          onClick={onNext}
          className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
        >
          Avançar
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};
