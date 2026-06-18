import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface EvaluationsStepProps {
  evalLula: string;
  evalGovernor: string;
  evalMayor: string;
  onChange: (field: "evalLula" | "evalGovernor" | "evalMayor", value: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const EvaluationsStep: React.FC<EvaluationsStepProps> = ({
  evalLula,
  evalGovernor,
  evalMayor,
  onChange,
  onNext,
  onPrev,
}) => {
  const options = [
    { value: "positive", label: "🟢 Ótimo / Bom" },
    { value: "regular", label: "🔵 Regular" },
    { value: "negative", label: "🔴 Ruim / Péssimo" },
    { value: "dontKnow", label: "⚪ Não Sabe" },
  ];

  return (
    <motion.div
      key="step-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-base font-bold font-display text-white tracking-wide uppercase">Avaliação de Governos</h3>
        <p className="text-xs text-gray-400">Classifique o desempenho administrativo de cada governante nos âmbitos municipal, estadual e federal:</p>
      </div>

      <div className="space-y-6">
        {/* Lula */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-300 font-display block">Presidente Lula (Governo Federal):</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {options.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange("evalLula", item.value)}
                className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  evalLula === item.value
                    ? "bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6] font-bold"
                    : "bg-[#14151b] border-[#1e2029] text-gray-400 hover:border-gray-650"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Governor */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-300 font-display block">Governador Ricardo Couto (Estado do RJ):</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {options.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange("evalGovernor", item.value)}
                className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  evalGovernor === item.value
                    ? "bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6] font-bold"
                    : "bg-[#14151b] border-[#1e2029] text-gray-400 hover:border-gray-650"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mayor (Hingo Hammes) */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-300 font-display block">Prefeito Hingo Hammes (Petrópolis-RJ):</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {options.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange("evalMayor", item.value)}
                className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  evalMayor === item.value
                    ? "bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6] font-bold"
                    : "bg-[#14151b] border-[#1e2029] text-gray-400 hover:border-gray-650"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={onPrev}
          className="px-4 py-2.5 bg-[#14151b] border border-[#1e2029] text-gray-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
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
