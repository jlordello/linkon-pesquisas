import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Candidate } from "../types";

interface SingleSelectionStepProps {
  stepKey: string;
  title: string;
  subtitle: string;
  candidates: Candidate[];
  selectedValue: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  btnNextText?: string;
}

export const SingleSelectionStep: React.FC<SingleSelectionStepProps> = ({
  stepKey,
  title,
  subtitle,
  candidates,
  selectedValue,
  onChange,
  onNext,
  onPrev,
  btnNextText = "Avançar",
}) => {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-base font-bold font-display text-white tracking-wide uppercase break-words whitespace-normal leading-snug">{title}</h3>
        <p className="text-xs text-gray-400 break-words whitespace-normal leading-normal">{subtitle}</p>
      </div>

      <div className="space-y-2.5 max-h-[355px] overflow-y-auto pr-2 custom-scrollbar">
        {candidates.map((cand) => (
          <button
            key={cand.id}
            type="button"
            onClick={() => onChange(cand.id)}
            className={`w-full p-3.5 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
              selectedValue === cand.id
                ? "bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6]"
                : "bg-[#111218] border-[#1e2029] text-gray-300 hover:border-gray-500"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
              {cand.photo ? (
                <img
                  src={cand.photo}
                  alt={cand.name}
                  className="w-16 h-16 rounded-full object-cover border border-[#1e2029] shrink-0 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-650 flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-md">
                  {cand.name[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white break-words whitespace-normal leading-snug">{cand.name}</p>
                <span className="text-[10px] text-gray-400 font-mono block break-words whitespace-normal">Partido: {cand.party}</span>
              </div>
            </div>
            <span className="text-[9px] font-mono border border-gray-800 px-2 py-0.5 rounded text-gray-500 uppercase">Estimulada</span>
          </button>
        ))}

        {/* Extras options */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => onChange("brancosNulos")}
            className={`p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
              selectedValue === "brancosNulos"
                ? "bg-rose-500/10 border-rose-500 text-rose-400"
                : "bg-[#111218] border-[#1e2029] text-gray-400 hover:border-gray-600"
            }`}
          >
            ⚪ Brancos / Nulos
          </button>
          <button
            type="button"
            onClick={() => onChange("indecisos")}
            className={`p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
              selectedValue === "indecisos"
                ? "bg-sky-550/10 border-sky-400 text-sky-400"
                : "bg-[#111218] border-[#1e2029] text-gray-400 hover:border-gray-600"
            }`}
          >
            ❓ Não Sabe / Indeciso
          </button>
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
          {btnNextText}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};
