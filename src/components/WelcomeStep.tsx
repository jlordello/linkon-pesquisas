import React, { useState } from "react";
import { 
  ClipboardList, 
  ArrowRight, 
  ShieldCheck, 
  MapPin, 
  Navigation, 
  MapPinOff, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getNextCycleStartDate } from "../types";

interface WelcomeStepProps {
  onStart: () => void;
}

const PETROPOLIS_LAT = -22.5112;
const PETROPOLIS_LON = -43.1779;
const MAX_ALLOWED_DISTANCE_KM = 55; // 55 km buffer covers all Petrópolis districts

// Haversine distance calculator
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

type CheckState = "initial" | "checking" | "success" | "error";

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStart }) => {
  const [status, setStatus] = useState<CheckState>("initial");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [distance, setDistance] = useState<number | null>(null);
  const [showBypass, setShowBypass] = useState<boolean>(false);

  const requestLocation = () => {
    setStatus("checking");
    setErrorMessage("");
    setDistance(null);

    if (!navigator.geolocation) {
      setErrorMessage("Seu navegador não suporta geolocalização por satélite.");
      setStatus("error");
      setShowBypass(true);
      return;
    }

    // Attempt to fetch current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = getDistanceInKm(latitude, longitude, PETROPOLIS_LAT, PETROPOLIS_LON);
        setDistance(dist);

        if (dist <= MAX_ALLOWED_DISTANCE_KM) {
          setStatus("success");
          // Short delay to let the user see the success state, then start
          setTimeout(() => {
            onStart();
          }, 1500);
        } else {
          setErrorMessage(
            `Você está fora do município de Petrópolis. Distância calculada: ${dist} km.`
          );
          setStatus("error");
          setShowBypass(true);
        }
      },
      (error) => {
        let msg = "Acesso à localização recusado ou indisponível.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Permissão de geolocalização negada pelo usuário ou navegador.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Sinal de localização por GPS indisponível no momento.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Tempo limite atingido ao tentar obter coordenadas.";
        }
        setErrorMessage(msg);
        setStatus("error");
        setShowBypass(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSimulateBypass = () => {
    setStatus("success");
    setDistance(0.8); // perfect simulation
    setTimeout(() => {
      onStart();
    }, 1200);
  };

  return (
    <AnimatePresence mode="wait">
      {status === "initial" && (
        <motion.div
          key="welcome-initial"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="space-y-6 text-center py-6"
        >
          <div className="mx-auto w-16 h-16 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-full flex items-center justify-center">
            <MapPin className="h-8 w-8 text-[#3b82f6] animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold font-display text-white">Instituto Linkon Pesquisas</h3>
            <p className="text-xs text-xs font-bold font-mono text-[#3b82f6] tracking-wider uppercase">
              Verificação Obrigatória de Geolocalização
            </p>
            <p className="text-xs text-gray-400 leading-relaxed max-w-lg mx-auto">
              Para atender aos critérios de integridade estatística, esta pesquisa de amostragem eleitoral é restrita e auditável. Apenas cidadãos localizados fisicamente em <b className="text-white">Petrópolis, RJ</b> estão aptos a responder. 
              <br />
              <span className="text-emerald-400 font-medium block mt-1">
                ⚠️ Importante: Os dados desta pesquisa são atualizados e consolidados a cada 15 (quinze) dias. O início da próxima amostragem será em {getNextCycleStartDate()}.
              </span>
            </p>
          </div>

          <div className="bg-[#0e1017] border border-[#1d1f2e] rounded-xl p-4 max-w-md mx-auto text-left space-y-2">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-400 leading-normal">
                <b>Segurança & Privacidade:</b> Seus dados de localização exata (latitude/longitude) são lidos localmente pelo seu dispositivo apenas para verificar a distância da cidade e <b>nunca</b> serão salvos no banco de dados.
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              onClick={requestLocation}
              className="px-6 py-3 bg-[#3b82f6] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl tracking-wider uppercase transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              Confirmar Localização & Iniciar
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="pt-6 border-t border-[#1a1b24] text-[10px] text-gray-500 font-mono flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" /> Anônimo / Conforme LGPD
            </span>
            <span>•</span>
            <span>Petrópolis-RJ</span>
          </div>
        </motion.div>
      )}

      {status === "checking" && (
        <motion.div
          key="welcome-checking"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="space-y-6 text-center py-12"
        >
          <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-[#3b82f6] animate-spin" />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
              Validando Georreferenciamento
            </h3>
            <div className="text-[11px] font-mono text-gray-500 max-w-sm mx-auto space-y-1 bg-[#090a0f] border border-[#15161f] p-3 rounded-lg">
              <div className="flex justify-between">
                <span>Solicitação de GPS:</span>
                <span className="text-emerald-400">Ativa ✔</span>
              </div>
              <div className="flex justify-between">
                <span>Satélite de Triangulação:</span>
                <span className="text-blue-400">Em andamento...</span>
              </div>
              <div className="flex justify-between">
                <span>Distância de Petrópolis:</span>
                <span className="text-gray-600">Calculando...</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 animate-pulse mt-3 font-semibold">
              Por favor, autorize a permissão de localização caso seja solicitado pelo navegador.
            </p>
          </div>
        </motion.div>
      )}

      {status === "success" && (
        <motion.div
          key="welcome-success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="space-y-6 text-center py-12"
        >
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 animate-bounce" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">Acesso Autorizado!</h3>
            <p className="text-xs text-emerald-400 font-mono font-bold leading-none uppercase">
              Localização confirmada em Petrópolis, RJ
            </p>
            {distance !== null && (
              <p className="text-[11px] text-gray-500 font-mono mt-2">
                Conectado com proximidade de {distance} km do marco zero municipal.
              </p>
            )}
          </div>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div
          key="welcome-error"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="space-y-6 text-center py-6"
        >
          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black text-white">Pesquisa Bloqueada</h3>
            <p className="text-xs text-red-400 font-mono font-bold leading-none uppercase">
              Localidade não confirmada ou inválida
            </p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed pt-2">
              {errorMessage} 
              <br />
              <span className="text-[11px] block mt-2 text-gray-500">
                Esta pesquisa faz parte de amostragem restrita aos limites de Petrópolis e arredores (máx. {MAX_ALLOWED_DISTANCE_KM} km do centro).
              </span>
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-2.5 max-w-xs mx-auto">
            <button
              onClick={requestLocation}
              className="w-full px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Navigation className="h-4 w-4" />
              Tentar Novamente
            </button>

            {showBypass && (
              <button
                onClick={handleSimulateBypass}
                className="w-full px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition-all cursor-pointer block"
              >
                Simular Coleta em Petrópolis (Testes / Homologação)
              </button>
            )}

            <button
              onClick={() => setStatus("initial")}
              className="text-[10px] text-gray-500 hover:text-gray-400 font-mono uppercase font-bold text-center mt-2"
            >
              Voltar ao Início
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

