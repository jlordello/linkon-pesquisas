import React from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { PETROPOLIS_NEIGHBORHOODS } from "../types";

interface DemographicsStepProps {
  gender: string;
  age: string;
  neighborhood: string;
  onChange: (field: "gender" | "age" | "neighborhood", value: string) => void;
  onNext: () => void;
}

export const DemographicsStep: React.FC<DemographicsStepProps> = ({
  gender,
  age,
  neighborhood,
  onChange,
  onNext,
}) => {
  const neighborhoods = PETROPOLIS_NEIGHBORHOODS;

  return (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-base font-bold font-display text-white tracking-wide uppercase">Dados Demográficos Básicos</h3>
        <p className="text-xs text-gray-400 font-sans">Essas variáveis auxiliam na calibração e proporcionalidade do censo eleitoral de Petrópolis.</p>
      </div>

      <div className="space-y-5">
        {/* Gender Column */}
        <div className="space-y-2">
          <label className="text-xs text-gray-300 font-semibold font-display">Gênero Eleitoral:</label>
          <div className="grid grid-cols-3 gap-3">
            {["Feminino", "Masculino", "Outro"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChange("gender", g)}
                className={`p-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  gender === g
                    ? "bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6] font-bold"
                    : "bg-[#14151b] border-[#1e2029] text-gray-400 hover:border-gray-600"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Age Column */}
        <div className="space-y-2">
          <label className="text-xs text-gray-300 font-semibold font-display">Sua Faixa Etária:</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {["16-24", "25-34", "35-44", "45-59", "60+"].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onChange("age", a)}
                className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                  age === a
                    ? "bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6] font-bold"
                    : "bg-[#14151b] border-[#1e2029] text-gray-400 hover:border-gray-600"
                }`}
              >
                {a} anos
              </button>
            ))}
          </div>
        </div>

        {/* Neighborhood Column */}
        <div className="space-y-2">
          <label className="text-xs text-gray-300 font-semibold font-display">Bairro onde reside em Petrópolis:</label>
          <select
            value={neighborhood}
            onChange={(e) => onChange("neighborhood", e.target.value)}
            className="w-full p-3 rounded-xl bg-[#14151b] border border-[#21232e] text-xs text-white focus:outline-none focus:border-[#3b82f6]"
          >
            <option value="">-- Selecione seu bairro --</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
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
