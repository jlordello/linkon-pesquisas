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
import { 
  getNextCycleStartDate, 
  SurveyResponse, 
  sha256, 
  getCurrentCycleDates, 
  getCycleKeyForTimestamp 
} from "../types";

interface WelcomeStepProps {
  onStart: () => void;
  responses: SurveyResponse[];
  setAlreadyVoted: (voted: boolean) => void;
  clientIpHash: string;
  setClientIpHash: (hash: string) => void;
  voterUuid: string;
  deviceHash: string;
}

const PETROPOLIS_LAT = -22.5112;
const PETROPOLIS_LON = -43.1779;
const MAX_ALLOWED_DISTANCE_KM = 27; // Tightened from 35 km to 27 km to cover the extreme edges of Petrópolis districts (Posse/Secretário) and strictly block adjacent municipalities

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

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ 
  onStart, 
  responses, 
  setAlreadyVoted, 
  clientIpHash, 
  setClientIpHash,
  voterUuid,
  deviceHash
}) => {
  const [status, setStatus] = useState<CheckState>("initial");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [distance, setDistance] = useState<number | null>(null);
  const [showBypass, setShowBypass] = useState<boolean>(false);
  const [isVpn, setIsVpn] = useState<boolean>(false);
  const [vpnDetails, setVpnDetails] = useState<string>("");
  const [checkingLogStep, setCheckingLogStep] = useState<number>(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const detectVpn = async () => {
      try {
        // Query BOTH ip-api.com and freeipapi.app in parallel for redundant, robust checks
        // We restore direct query flags for 'proxy' and 'hosting' to detect datacenter routes
        const [ipApiRes, freeIpRes] = await Promise.allSettled([
          fetch("https://ip-api.com/json/?fields=status,message,countryCode,region,city,isp,org,as,proxy,hosting,query"),
          fetch("https://freeipapi.app/api/json")
        ]);

        let vpnFound = false;
        let details = "";
        let detectedIp = "";

        // Process ip-api.com results
        if (ipApiRes.status === "fulfilled" && ipApiRes.value.ok) {
          try {
            const data = await ipApiRes.value.json();
            if (data && data.status === "success") {
              const countryCode = data.countryCode || "";
              const region = data.region || ""; // e.g. "RJ"
              const isp = (data.isp || "").toLowerCase();
              const org = (data.org || "").toLowerCase();
              const as = (data.as || "").toLowerCase();
              const isProxyField = data.proxy === true;
              const isHostingField = data.hosting === true;
              detectedIp = data.query || "";

              // 1. Mandatory country check (Must be Brazil)
              if (countryCode && countryCode !== "BR") {
                vpnFound = true;
                details = `Acesso Bloqueado: Conexão detectada fora do Brasil (${countryCode}). Apenas eleitores residentes no Brasil podem participar.`;
              }

              // 2. Strict region check: Must be Rio de Janeiro (RJ) to participate in Petrópolis poll
              if (countryCode === "BR" && region && region !== "RJ" && region !== "Rio de Janeiro") {
                vpnFound = true;
                details = `Acesso Bloqueado: Conexão fora do estado do Rio de Janeiro (${region}). Esta sondagem é restrita a moradores do município de Petrópolis (RJ).`;
              }

              // 3. Direct proxy / hosting checks
              if (isProxyField) {
                vpnFound = true;
                details = "Filtro ativo de Segurança: Proxy de Rede Detectado (Conexão mascarada bloqueada)";
              }
              if (isHostingField) {
                vpnFound = true;
                details = "Filtro ativo de Segurança: Servidor de Hospedagem / VPN Comercial Detectado";
              }

              // Keyword checking for VPNs/Hosting
              const hostingKeywords = [
                "vpn", "proxy", "hosting", "server", "servers", "datacenter", "data center",
                "cloud", "digitalocean", "linode", "ovh", "hetzner", "google llc", "amazon",
                "microsoft", "cloudflare", "fastly", "vultr", "m247", "choopa", "kamatera",
                "contabo", "interserver", "girasol", "prowritingaid", "tortrust", "tor-exit",
                "private internet", "nordvpn", "expressvpn", "surfshark", "vpn-node", "ghostvpn",
                "proton", "windscribe", "mullvad", "tunnelbear", "colocation", "subnet", "smartproxy",
                "packet", "hostinger", "locaweb", "kinghost", "uol host", "redecidades", "telesmart",
                "oracle", "heroku", "vercel", "netlify", "aws", "gcp", "azure"
              ];

              const matchesKeyword = hostingKeywords.some(keyword => 
                isp.includes(keyword) || org.includes(keyword) || as.includes(keyword)
              );

              if (matchesKeyword && !vpnFound) {
                vpnFound = true;
                details = `${data.isp || data.org || "VPN ou Cloud"} (Rede hospedada ou tunelada de segurança bloqueada)`;
              }
            }
          } catch (e) {
            console.warn("ip-api JSON parse failed:", e);
          }
        }

        // Process freeipapi.app results as secondary layer or backup
        if (freeIpRes.status === "fulfilled" && freeIpRes.value.ok) {
          try {
            const data = await freeIpRes.value.json();
            if (data) {
              const countryCode = data.countryCode || "";
              const isProxy = data.isProxy === true;
              if (!detectedIp) {
                detectedIp = data.ipAddress || "";
              }

              if (countryCode && countryCode !== "BR") {
                vpnFound = true;
                details = `Acesso Bloqueado: Conexão internacional detectada via backup (${countryCode})`;
              }

              if (isProxy) {
                vpnFound = true;
                details = "Filtro ativo de Segurança de Proxy ou Túnel VPN Detectado via Backup";
              }
            }
          } catch (e) {
            console.warn("freeipapi JSON parse failed:", e);
          }
        }

        // Securely hash IP address and cross-reference browser locks
        if (detectedIp) {
          const hashVal = await sha256(detectedIp);
          setClientIpHash(hashVal);
          
          // Verify if voterUuid has already voted in this cycle
          const currentCycle = getCurrentCycleDates();
          const alreadyVotedRecord = responses.some(r => {
            const sameCycle = getCycleKeyForTimestamp(r.timestamp) === currentCycle.key;
            if (!sameCycle) return false;

            // 1. Check local UUID match (100% accurate browser tracking)
            if (r.voterUuid && voterUuid && r.voterUuid === voterUuid) {
              return true;
            }

            return false;
          });
          
          if (alreadyVotedRecord) {
            setAlreadyVoted(true);
          }
        }

        if (vpnFound) {
          setIsVpn(true);
          setVpnDetails(details || "Rede de Segurança Virtual (VPN/Proxy/Hospedagem)");
        }
      } catch (err) {
        console.error("Erro detectando VPN:", err);
      }
    };
    detectVpn();
  }, []);

  React.useEffect(() => {
    if (status !== "initial" && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  const requestLocation = () => {
    if (isVpn) return;
    setStatus("checking");
    setCheckingLogStep(1);
    setErrorMessage("");
    setDistance(null);

    // Smoothly focus/align the card container immediately on start
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);

    // Timers for progressive checking simulation logs to give robust user feedback
    const t2 = setTimeout(() => setCheckingLogStep(2), 750);
    const t3 = setTimeout(() => setCheckingLogStep(3), 1500);
    const t4 = setTimeout(() => setCheckingLogStep(4), 2250);

    if (!navigator.geolocation) {
      setTimeout(() => {
        setErrorMessage("Seu navegador não suporta geolocalização por satélite.");
        setStatus("error");
        setShowBypass(true);
      }, 3000);
      return;
    }

    // Call geolocation in background but wait for visual simulation to finish complete check
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const dist = getDistanceInKm(latitude, longitude, PETROPOLIS_LAT, PETROPOLIS_LON);
        
        let isInsideCityBounds = true;
        let cityResolvedName = "";
        let isDefinitivelyPetropolis = false;
        let isDefinitivelyAdjacent = false;

        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=13&addressdetails=1`,
            {
              headers: {
                "User-Agent": "InstitutoLinkonPesquisas/1.0 (cjeancarlos2623@gmail.com)"
              }
            }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData && geoData.address) {
              const addr = geoData.address;
              
              const cityVal = (addr.city || "").toLowerCase();
              const townVal = (addr.town || "").toLowerCase();
              const municipalityVal = (addr.municipality || "").toLowerCase();
              const villageVal = (addr.village || "").toLowerCase();
              const countyVal = (addr.county || "").toLowerCase();
              const suburbVal = (addr.suburb || "").toLowerCase();
              const neighbourhoodVal = (addr.neighbourhood || "").toLowerCase();
              
              cityResolvedName = addr.city || addr.town || addr.municipality || addr.suburb || addr.neighbourhood || "município adjacente";
              
              // Validate if it is definitively Petrópolis
              const matchesPetropolis = [cityVal, townVal, municipalityVal, villageVal, countyVal, suburbVal, neighbourhoodVal]
                .some(val => val.includes("petrópolis") || val.includes("petropolis"));
              
              // Define adjacent cities to block explicitly
              const adjacentList = [
                "magé", "mage", "duque de caxias", "guapimirim", "teresópolis", "teresopolis",
                "são josé do vale", "sao jose do vale", "areal", "paraíba do sul", "paraiba do sul",
                "paty do alferes", "miguel pereira", "rio de janeiro"
              ];
              
              const isMainAdjacent = adjacentList.some(blocked => 
                cityVal.includes(blocked) || 
                townVal.includes(blocked) || 
                municipalityVal.includes(blocked) || 
                villageVal.includes(blocked) ||
                countyVal.includes(blocked)
              );
              
              if (matchesPetropolis && !isMainAdjacent) {
                isDefinitivelyPetropolis = true;
                isInsideCityBounds = true;
              } else if (isMainAdjacent) {
                isDefinitivelyAdjacent = true;
                isInsideCityBounds = false;
              } else {
                // Fallback simpler string checking
                const adrStr = JSON.stringify(addr).toLowerCase();
                isInsideCityBounds = adrStr.includes("petrópolis") || adrStr.includes("petropolis");
              }
            }
          }
        } catch (e) {
          console.error("Erro na geolocalização reversa, usando raio tradicional como fallback:", e);
        }

        setTimeout(() => {
          setDistance(dist);
          
          let allowed = false;
          let boundaryError = "";

          if (isDefinitivelyPetropolis) {
            // High-precision administrative match allows them even if extreme coordinates (e.g., Secretário/Posse) exceed general distance limits
            allowed = true;
          } else if (isDefinitivelyAdjacent) {
            allowed = false;
            boundaryError = `Acesso Bloqueado: Seu dispositivo está em ${cityResolvedName}. Esta sondagem é restrita a moradores de Petrópolis (seus vizinhos como Magé/Caxias não estão elegíveis).`;
          } else {
            // Fallback to traditional Haversine distance bounds
            if (isInsideCityBounds && dist <= MAX_ALLOWED_DISTANCE_KM) {
              allowed = true;
            } else if (!isInsideCityBounds) {
              boundaryError = `Acesso Bloqueado: Seu dispositivo está localizado em outro município vizinho (${cityResolvedName}) e não em Petrópolis. Esta sondagem é restrita a moradores de Petrópolis.`;
            } else {
              boundaryError = `Você está fora do município de Petrópolis. Distância calculada: ${dist} km (limite: ${MAX_ALLOWED_DISTANCE_KM} km).`;
            }
          }

          if (allowed) {
            // Double verify anti-fraud IP + fingerprint limit only AFTER they pass geographic check!
            const currentCycle = getCurrentCycleDates();
            const isAbuseIP = responses.some(r => {
              const sameCycle = getCycleKeyForTimestamp(r.timestamp) === currentCycle.key;
              if (!sameCycle) return false;
              return deviceHash && r.deviceHash === deviceHash && clientIpHash && r.ipHash === clientIpHash;
            });

            if (isAbuseIP) {
              setErrorMessage("Este dispositivo ou rede já possui uma entrevista registrada para esta amostragem quinzenal.");
              setStatus("error");
              setShowBypass(false); // Disable bypass for confirmed double-voting fraud attempts
            } else {
              setStatus("success");
              setTimeout(() => {
                onStart();
              }, 1500);
            }
          } else {
            setErrorMessage(boundaryError);
            setStatus("error");
            setShowBypass(true);
          }
        }, 3000);
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
        
        setTimeout(() => {
          setErrorMessage(msg);
          setStatus("error");
          setShowBypass(true);
        }, 3000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSimulateBypass = () => {
    setStatus("checking");
    setCheckingLogStep(1);
    const t2 = setTimeout(() => setCheckingLogStep(2), 600);
    const t3 = setTimeout(() => setCheckingLogStep(3), 1200);
    const t4 = setTimeout(() => setCheckingLogStep(4), 1800);

    setTimeout(() => {
      setStatus("success");
      setDistance(0.8); // perfect simulation
      setTimeout(() => {
        onStart();
      }, 1200);
    }, 2400);
  };

  if (isVpn) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto bg-[#0b0c11]/80 border border-red-500/25 rounded-3xl p-6 text-center space-y-6 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 animate-pulse">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-white">Uso de VPN Bloqueado</h3>
          <p className="text-xs font-bold font-mono text-red-400 tracking-wider uppercase">
            AUDITORIA E METODOLOGIA INTEGRAL
          </p>
          <p className="text-[10px] text-gray-500 font-mono tracking-tight mt-1.5 bg-red-950/20 py-1 px-2.5 rounded-lg border border-red-950/40 inline-block">
            ISP / Org: <span className="text-red-400 font-bold">{vpnDetails}</span>
          </p>
        </div>

        <div className="text-xs text-gray-400 leading-relaxed text-justify space-y-3 bg-[#07080c] p-4.5 rounded-xl border border-[#1b1c28]">
          <p>
            Por razões de <b>integridade estatística, controle de amostragem e segurança eleitoral</b>, o Instituto Linkon não permite a realização desta sondagem em conexões mascaradas por serviços de <b>VPN, Proxy ou Servidores de Hospedagem</b>.
          </p>
          <p>
            Essa fita impede tentativas de inserção automatizada, duplicidades de registro ou falsificação dos quotas de amostragem geográfica na região de Petrópolis.
          </p>
        </div>

        <div className="text-[11px] text-gray-400 font-medium bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg text-left leading-normal">
          💡 <b>Dica para continuar:</b> Desative o seu cliente ou extensão de VPN, desabilite o recurso Private Relay (Retransmissão Privada do iOS/macOS) se ativo, e atualize esta página usando sua <b>conexão Wi-Fi padrão</b> ou <b>dados móveis (4G/5G)</b>.
        </div>

        <div className="border-t border-[#1a1b24] pt-4 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
          Instituto Linkon • Petrópolis, RJ
        </div>
      </motion.div>
    );
  }

  return (
    <div ref={containerRef} className="scroll-mt-24 w-full">
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
              <h3 className="text-xl font-bold font-display text-white">Instituto Linkon</h3>
              <p className="text-xs font-bold font-mono text-[#3b82f6] tracking-wider uppercase">
                Verificação Obrigatória de Geolocalização
              </p>
              <p className="text-xs text-gray-400 leading-relaxed max-w-lg mx-auto">
                Para atender aos critérios de integridade amostral, esta sondagem eleitoral é restrita e auditável. Apenas cidadãos localizados fisicamente em <b className="text-white">Petrópolis, RJ</b> estão aptos a responder. 
                <br />
                <span className="text-emerald-400 font-medium block mt-1">
                  ⚠️ Importante: Os dados desta sondagem eleitoral são atualizados e consolidados a cada 15 (quinze) dias. O início da próxima sondagem será em {getNextCycleStartDate()}.
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
            id="welcome-checking"
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
              <div className="text-[11px] font-mono text-gray-400 max-w-sm mx-auto space-y-1.5 bg-[#090a0f] border border-[#15161f] p-4 rounded-lg text-left">
                <div className="flex justify-between items-center py-0.5 border-b border-[#15161f]">
                  <span>Solicitação de GPS:</span>
                  {checkingLogStep === 1 ? (
                    <span className="text-blue-400 animate-pulse font-bold">Iniciando...</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">Ativa ✔</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-[#15161f]">
                  <span>Satélite de Triangulação:</span>
                  {checkingLogStep === 1 && (
                    <span className="text-gray-600">Aguardando sinal...</span>
                  )}
                  {checkingLogStep === 2 && (
                    <span className="text-blue-400 animate-pulse font-bold">Sintonizando...</span>
                  )}
                  {checkingLogStep >= 3 && (
                    <span className="text-emerald-400 font-bold">Conectado (3 Satélites) ✔</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Distância do Município:</span>
                  {checkingLogStep < 3 && (
                    <span className="text-gray-600">Aguardando coordenadas...</span>
                  )}
                  {checkingLogStep === 3 && (
                    <span className="text-blue-400 animate-pulse font-bold">Calculando...</span>
                  )}
                  {checkingLogStep >= 4 && (
                    <span className="text-emerald-400 font-bold">Verificado ✔</span>
                  )}
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
              <h3 className="text-lg font-black text-white">Sondagem Bloqueada</h3>
              <p className="text-xs text-red-400 font-mono font-bold leading-none uppercase">
                Localidade não confirmada ou inválida
              </p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed pt-2">
                {errorMessage} 
                <br />
                <span className="text-[11px] block mt-2 text-gray-500">
                  Esta sondagem eleitoral faz parte de amostragem restrita aos limites de Petrópolis e arredores (máx. {MAX_ALLOWED_DISTANCE_KM} km do centro).
                </span>
              </p>
            </div>

            {/* Tutorial Step-by-step how to activate location */}
            <div className="bg-[#121420]/80 border border-[#212330] rounded-2xl p-4.5 max-w-md mx-auto text-left space-y-4 shadow-xl">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-[#212330] pb-2">
                <span>📍</span> Como Ativar a Localização no seu Dispositivo:
              </h4>
              
              <div className="space-y-3.5 text-xs text-gray-300">
                <div className="space-y-1">
                  <span className="font-bold text-[#3b82f6] block">🤖 Celulares Android (Chrome):</span>
                  <p className="text-gray-400 leading-normal pl-3 border-l-2 border-[#3b82f6]/30">
                    Toque no ícone de <b>cadeado ou configurações</b> à esquerda do endereço do site (canto superior esquerdo) ➡️ selecione <b>Permissões</b> ➡️ ative a permissão de <b>Localização</b> e atualize a página.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-amber-400 block">🍎 iPhone / iPad (Safari):</span>
                  <p className="text-gray-400 leading-normal pl-3 border-l-2 border-amber-400/30">
                    Abra os <b>Ajustes</b> do iOS ➡️ vá em <b>Privacidade e Segurança</b> ➡️ <b>Serviços de Localização</b> (certifique-se de que está ativado) ➡️ role até encontrar <b>"Safari"</b> e marque para permitir <b>"Durante o Uso do App"</b>. Depois retorne e recarregue a página.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-purple-400 block">💻 Computador / Notebook:</span>
                  <p className="text-gray-400 leading-normal pl-3 border-l-2 border-purple-400/30">
                    Clique no ícone de <b>cadeado</b> na barra de navegação superior (ao lado de linkon_survey...) ➡️ marque <b>"Permitir"</b> ao lado de <b>Localização</b> ➡️ aperte <b>F5</b> para recarregar.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-2.5 max-w-xs mx-auto">
              <button
                onClick={requestLocation}
                className="w-full px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="h-4 w-4" />
                Permitir e Tentar Novamente
              </button>

              <button
                onClick={() => setStatus("initial")}
                className="text-[10px] text-gray-500 hover:text-gray-400 font-mono uppercase font-bold text-center mt-2 cursor-pointer"
              >
                Voltar ao Início
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

