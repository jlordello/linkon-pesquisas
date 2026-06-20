import React from "react";
import { ArrowRight, GraduationCap, DollarSign, Palette, Heart } from "lucide-react";
import { motion } from "motion/react";
import { PETROPOLIS_NEIGHBORHOODS } from "../types";

interface DemographicsStepProps {
  gender: string;
  age: string;
  neighborhood: string;
  education: string;
  income: string;
  color: string;
  religion: string;
  onChange: (field: "gender" | "age" | "neighborhood" | "education" | "income" | "color" | "religion", value: string) => void;
  onNext: () => void;
}

export const DemographicsStep: React.FC<DemographicsStepProps> = ({
  gender,
  age,
  neighborhood,
  education,
  income,
  color,
  religion,
  onChange,
  onNext,
}) => {
  const neighborhoods = PETROPOLIS_NEIGHBORHOODS;

  const educationOptions = [
    "Fundamental Completo ou Incompleto",
    "Ensino Médio Completo ou Incompleto",
    "Ensino Superior Completo ou Mais"
  ];

  const incomeOptions = [
    "Até 2 Salários Mínimos",
    "De 2 a 5 Salários Mínimos",
    "Mais de 5 Salários Mínimos"
  ];

  const colorOptions = [
    "Amarela",
    "Branca",
    "Indígena",
    "Parda",
    "Preta",
    "Quilombola"
  ];

  const religionOptions = [
    "Católica",
    "Evangélica/Protestante",
    "Espírita / Umbanda / Candomblé",
    "Outra / Sem Religião"
  ];

  // Check if all fields are filled to enable transition smoothly
  const isComplete = gender && age && neighborhood && education && income && color && religion;

  return (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-base font-bold font-display text-white tracking-wide uppercase">Censo Demográfico Ampliado</h3>
        <p className="text-xs text-gray-400 font-sans">
          Para manter a integridade amostral das projeções de sondagem eleitoral de Petrópolis, preencha as informações do seu perfil.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Coluna 1: Dados Básicos */}
        <div className="space-y-5 bg-[#0b0c10] p-5 rounded-2xl border border-[#1b1d28]/60">
          <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest border-b border-[#1b1c28] pb-2">
            Perfil Básico
          </h4>

          {/* Gender Column */}
          <div className="space-y-2">
            <label className="text-[11px] text-gray-300 font-semibold font-display">Gênero Eleitoral:</label>
            <div className="grid grid-cols-3 gap-2">
              {["Feminino", "Masculino", "Outro"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onChange("gender", g)}
                  className={`p-2.5 rounded-xl text-[11px] font-semibold border transition-all text-center cursor-pointer ${
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
            <label className="text-[11px] text-gray-300 font-semibold font-display">Sua Faixa Etária:</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {["16-24", "25-34", "35-44", "45-59", "60+"].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onChange("age", a)}
                  className={`py-2 rounded-lg text-[10px] font-semibold border transition-all text-center cursor-pointer ${
                    age === a
                      ? "bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6] font-bold"
                      : "bg-[#14151b] border-[#1e2029] text-gray-400 hover:border-gray-600"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Neighborhood Column */}
          <div className="space-y-2">
            <label className="text-[11px] text-gray-300 font-semibold font-display">Bairro onde reside em Petrópolis:</label>
            <select
              value={neighborhood}
              onChange={(e) => onChange("neighborhood", e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#14151b] border border-[#21232e] text-xs text-white focus:outline-none focus:border-[#3b82f6]"
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

        {/* Coluna 2: Dados Socioeconômicos e Identidade */}
        <div className="space-y-5 bg-[#0b0c10] p-5 rounded-2xl border border-[#1b1d28]/60">
          <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest border-b border-[#1b1c28] pb-2">
            Socioeconômico & Identidade
          </h4>

          {/* Escolaridade (Education) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-300 font-semibold font-display">
              <GraduationCap className="h-3.5 w-3.5 text-blue-400" />
              <span>Nível de Escolaridade:</span>
            </div>
            <select
              value={education}
              onChange={(e) => onChange("education", e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#14151b] border border-[#21232e] text-xs text-white focus:outline-none focus:border-[#3b82f6]"
            >
              <option value="">-- Selecione sua escolaridade --</option>
              {educationOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Faixa de Renda (Income) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-300 font-semibold font-display">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span>Faixa de Renda Familiar:</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {incomeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange("income", opt)}
                  className={`p-2 rounded-xl text-[10px] font-semibold border transition-all text-left px-3 cursor-pointer flex justify-between items-center ${
                    income === opt
                      ? "bg-[#10b981]/15 border-[#10b981] text-[#10b981] font-bold"
                      : "bg-[#14151b] border-[#1e2029] text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <span>{opt}</span>
                  {income === opt && <span className="h-2 w-2 rounded-full bg-[#10b981]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Cor ou Raça (Color/Race) */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-300 font-semibold font-display">
                <Palette className="h-3.5 w-3.5 text-amber-400" />
                <span>Cor ou Raça:</span>
              </div>
              <select
                value={color}
                onChange={(e) => onChange("color", e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#14151b] border border-[#21232e] text-xs text-white focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="">-- Selecione --</option>
                {colorOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Religião (Religion) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-300 font-semibold font-display">
                <Heart className="h-3.5 w-3.5 text-rose-400" />
                <span>Religião:</span>
              </div>
              <select
                value={religion}
                onChange={(e) => onChange("religion", e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#14151b] border border-[#21232e] text-xs text-white focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="">-- Selecione --</option>
                {religionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      </div>

      <div className="pt-4 flex justify-between items-center bg-[#13141f]/30 p-3 rounded-2xl border border-[#21232e]/50">
        <span className="text-[10px] uppercase font-mono font-bold text-gray-500">
          {!isComplete ? "⚠️ Preencha todos os campos obrigatórios" : "✓ Cadastro demográfico preenchido!"}
        </span>
        <button
          onClick={onNext}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all ${
            isComplete 
              ? "bg-[#3b82f6] hover:bg-[#1d4ed8] text-white" 
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          }`}
        >
          Avançar
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};
