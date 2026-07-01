import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Share2, 
  CheckCircle2, 
  Users, 
  Flame,
  Clock,
  Heart,
  Zap,
  TrendingUp,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PETROPOLIS_NEIGHBORHOODS = [
  "Alcobacinha",
  "Alto da Serra",
  "Araras",
  "Atílio Marotti",
  "Bairro Esperança",
  "Bataillard",
  "Bela Vista",
  "Bingen",
  "Bonfim",
  "Brejal",
  "Carangola",
  "Cascatinha",
  "Castelânea",
  "Castrioto",
  "Caxambu",
  "Centro",
  "Chácara Flora",
  "Coronel Veiga",
  "Corrêas",
  "Cremerie",
  "Cristóvão Colombo",
  "Duarte da Silveira",
  "Duques",
  "Estrada da Saudade",
  "Fazenda Inglesa",
  "Floresta",
  "Gentio",
  "Glória",
  "Itaipava",
  "Itamarati",
  "Independência",
  "Jardim Salvador",
  "João Xavier",
  "Lopes Trovão",
  "Madame Machado",
  "Meio da Serra",
  "Moinho Preto",
  "Morin",
  "Mosela",
  "Nogueira",
  "Pedras Brancas",
  "Pedro do Rio",
  "Ponte Fones",
  "Posse",
  "Quissamã",
  "Quitandinha",
  "Retiro",
  "Roseiral",
  "Saldanha Marinho",
  "Samambaia",
  "Sargento Boening",
  "São Sebastião",
  "Secretário",
  "Siméria",
  "Taquara",
  "Vale das Videiras",
  "Vale do Carangola",
  "Vale dos Esquilos",
  "Valparaíso",
  "Vicenzo Rivetti",
  "Vila Felipe",
  "Vila Militar",
  "Vila Rica"
];

interface Petition6x1PageProps {
  onBackToSurvey: () => void;
}

export const Petition6x1Page: React.FC<Petition6x1PageProps> = ({ onBackToSurvey }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bairro, setBairro] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [totalSignatures, setTotalSignatures] = useState(0); // Dynamic default, then synced
  const [recentSignups, setRecentSignups] = useState<{ id: string; name: string; bairro: string; timestamp: string }[]>([]);
  const [activeNotification, setActiveNotification] = useState<{ name: string; neighborhood: string; timeAgo: string } | null>(null);

  // Format phone number as user types (Brazilian format: (XX) XXXXX-XXXX)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    // Apply Brazilian phone mask
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    
    setWhatsapp(value);
  };

  // Helper to mask last name for privacy
  const getMaskedName = (fullName: string): string => {
    const parts = fullName.split(" ");
    if (parts.length <= 1) return fullName;
    const first = parts[0];
    const last = parts[parts.length - 1];
    return `${first} ${last[0]}.`;
  };

  // Real-time counter of signatures in Firestore
  useEffect(() => {
    try {
      const q = collection(db, "signatures_6x1");
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const actualCount = snapshot.size;
        setTotalSignatures(actualCount);

        const list: { id: string; name: string; bairro: string; timestamp: string }[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            name: data.name || "Apoiador Anônimo",
            bairro: data.bairro || "Centro",
            timestamp: data.timestamp || new Date().toISOString()
          });
        });

        // Sort by timestamp desc and take top 100
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentSignups(list.slice(0, 100));
      }, (error) => {
        console.error("Error subscribing to real-time signatures:", error);
        handleFirestoreError(error, OperationType.GET, "signatures_6x1");
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up real-time signatures subscription:", err);
    }
  }, []);

  // Floating live ticker feed showing who signed with custom timing
  useEffect(() => {
    if (recentSignups.length === 0) {
      setActiveNotification(null);
      return;
    }

    let currentIndex = 0;

    const showNextNotification = () => {
      const realSign = recentSignups[currentIndex];
      if (!realSign) return;

      const nameMasked = getMaskedName(realSign.name);
      const diffMs = new Date().getTime() - new Date(realSign.timestamp).getTime();
      const diffMins = Math.max(1, Math.floor(diffMs / 60000));
      
      let timeAgoStr = `assinou há ${diffMins} min`;
      if (diffMins < 2) {
        timeAgoStr = "acabou de assinar ✊";
      } else if (diffMins > 60) {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
          timeAgoStr = `assinou há ${diffHours}h`;
        } else {
          timeAgoStr = `assinou há ${Math.floor(diffHours / 24)}d`;
        }
      }
      
      setActiveNotification({
        name: nameMasked,
        neighborhood: realSign.bairro,
        timeAgo: timeAgoStr
      });

      currentIndex = (currentIndex + 1) % recentSignups.length;
    };

    // Show initial toast quickly, then cycle every 10 seconds
    const initialTimeout = setTimeout(showNextNotification, 2000);
    const interval = setInterval(showNextNotification, 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [recentSignups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // STRICT REQUIRED VALIDATIONS FOR ALL FIELDS
    if (!name.trim()) {
      setErrorMessage("O campo Nome Completo é obrigatório.");
      return;
    }
    if (name.trim().split(" ").length < 2 || name.trim().length < 5) {
      setErrorMessage("Por favor, digite seu nome e sobrenome completos.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("O campo E-mail é obrigatório.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage("Por favor, insira um endereço de e-mail válido.");
      return;
    }

    if (!whatsapp.trim()) {
      setErrorMessage("O campo WhatsApp / Celular é obrigatório.");
      return;
    }
    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMessage("Por favor, digite um número de WhatsApp completo com DDD.");
      return;
    }

    if (!bairro) {
      setErrorMessage("Por favor, selecione seu bairro em Petrópolis.");
      return;
    }

    setIsSubmitting(true);

    try {
      const newSignature = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim(),
        bairro: bairro.trim(),
        timestamp: new Date().toISOString(),
        synced: false
      };

      await addDoc(collection(db, "signatures_6x1"), newSignature);
      
      localStorage.setItem("petition_6x1_signed", "true");
      setSubmitted(true);
    } catch (err: any) {
      console.error("Error adding signature to database:", err);
      setErrorMessage("Ocorreu um erro ao salvar sua assinatura. Por favor, tente novamente.");
      handleFirestoreError(err, OperationType.CREATE, "signatures_6x1");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🔔 ACABEI DE ASSINAR! Abaixo-Assinado Oficial pelo FIM DA ESCALA 6X1 e pela redução da jornada de trabalho! ✊🚩\n\nNão podemos aceitar uma escala exaustiva que adoece a classe trabalhadora. Junte-se a nós nesta grande mobilização popular! Assine também clicando no link abaixo:\n\n👉 ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const signatureGoal = 1000;
  const percentCompleted = signatureGoal > 0 ? Math.round((totalSignatures / signatureGoal) * 100) : 0;

  return (
    <div className="relative min-h-screen bg-[#07080c] text-gray-100 font-sans pb-16 overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 sm:px-6 lg:px-8">
      
      {/* 1. STUNNING CAMPAIGN HEROBACKGROUND IMAGE OF EXHAUSTED SUPERMARKET CASHIER */}
      <div 
        className="absolute top-0 left-0 right-0 h-[380px] md:h-[480px] bg-cover bg-center opacity-15 pointer-events-none"
        style={{ 
          backgroundImage: `url('https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1200&q=80')`,
        }}
      />
      {/* Gradient Transition overlay to slide seamlessly into pure background */}
      <div className="absolute top-0 left-0 right-0 h-[380px] md:h-[480px] bg-gradient-to-b from-[#07080c]/20 via-[#07080c]/80 to-[#07080c] pointer-events-none" />

      {/* Floating dynamic live signatory alert toast */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#0e1017]/95 border-2 border-[#E41221]/50 hover:border-[#E41221] p-4 rounded-2xl shadow-2xl shadow-rose-950/20 backdrop-blur-xl flex items-center gap-3.5"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg border border-gray-100 shrink-0 overflow-hidden">
                <img 
                  src="https://i.ibb.co/VWP4jFpD/image.png" 
                  alt="Logo" 
                  className="w-7 h-7 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#07080c] animate-pulse"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white tracking-tight truncate">
                {activeNotification.name}
              </p>
              <p className="text-[10px] text-gray-400 font-medium truncate">
                Bairro {activeNotification.neighborhood}, Petrópolis
              </p>
              <p className="text-[9px] text-[#E41221] font-mono font-black uppercase mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E41221] animate-ping"></span>
                {activeNotification.timeAgo}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto pt-8 relative z-10 space-y-8">
        
        {/* Subtle, beautiful immersive navigation row */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2 bg-[#12141d]/80 px-3 py-1.5 rounded-xl border border-gray-800 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#E41221] animate-pulse" />
            <span className="text-[10px] font-bold text-gray-300 font-mono tracking-wider uppercase">CAMPANHA ATIVA</span>
          </div>
        </div>

        {/* Main High-End Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Stunning Campaign Hero & Goals */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Logo Badge Header */}
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-2xl p-3 shadow-2xl border-2 border-[#E41221]/15 flex items-center justify-center w-16 h-16 shrink-0 transform hover:scale-105 transition-transform">
                <img 
                  src="https://i.ibb.co/VWP4jFpD/image.png" 
                  alt="Logo PT" 
                  className="w-11 h-11 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#E41221] uppercase tracking-widest block font-mono">Movimento Democrático Popular</span>
                <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-display">PT Petrópolis</h2>
              </div>
            </div>

            {/* Campaign Big Bold Headline */}
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E41221]/10 border border-[#E41221]/20 text-[#E41221] text-xs font-bold font-mono">
                  <Flame className="h-3.5 w-3.5 text-[#E41221]" />
                  Luta por Dignidade do Trabalhador
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E41221] text-white text-[10px] font-black font-mono animate-pulse shadow-md shadow-[#E41221]/20">
                  <CheckCircle2 className="h-3 w-3" /> DUAS FOLGAS POR SEMANA
                </div>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight font-display">
                Fim da <span className="text-[#E41221] bg-[#E41221]/5 px-2 py-0.5 rounded-lg border border-[#E41221]/10 inline-block mt-1">Escala 6x1</span>
              </h1>

              {/* HIGHLY VISIBLE DEDICATED HIGHLIGHT CARD FOR 2 DAYS OFF PER WEEK */}
              <div className="bg-[#E41221]/10 border-l-4 border-[#E41221] p-4 rounded-r-2xl space-y-1 shadow-md">
                <span className="text-[9px] font-bold text-[#E41221] uppercase tracking-wider font-mono">PROPOSTA DE NOVA JORNADA DE TRABALHO</span>
                <h3 className="text-base sm:text-lg font-black text-white">Garantia de 2 Folgas Semanais para Todos!</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Redução da jornada semanal para permitir pelo menos <span className="text-white font-bold underline decoration-[#E41221] decoration-2">duas folgas completas por semana</span>, promovendo equilíbrio entre trabalho, convívio familiar, lazer e qualificação profissional.
                </p>
              </div>

              <p className="text-base sm:text-lg text-gray-300 leading-relaxed max-w-xl font-medium">
                A exaustiva jornada 6x1 adoece, afasta as famílias e sufoca o potencial de progresso de nossa gente. Chegou a hora de mudar a história e exigir um modelo humano e justo de trabalho!
              </p>
            </div>

            {/* Live Progress Goal Bar */}
            <div className="bg-[#0e1017]/95 border border-gray-800 p-6 rounded-2xl space-y-4 shadow-2xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#E41221]/5 rounded-full blur-3xl"></div>
              
              <div className="flex justify-between items-end relative z-10">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono font-bold">Meta de Mobilização Local</p>
                  <p className="text-2xl font-black text-white font-mono flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#E41221]" />
                    {totalSignatures} / {signatureGoal} <span className="text-xs text-[#E41221] font-sans font-medium">(Assinaturas coletadas)</span>
                  </p>
                </div>
                <span className="text-xs font-bold text-[#E41221] bg-[#E41221]/10 px-2.5 py-1.5 rounded-xl font-mono">
                  {percentCompleted}% concluído
                </span>
              </div>

              <div className="w-full bg-[#181a24] h-3.5 rounded-full overflow-hidden border border-[#282a36] relative z-10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, percentCompleted)}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-[#E41221] rounded-full"
                />
              </div>
              
              <p className="text-xs text-gray-400 leading-relaxed relative z-10">
                A sua assinatura dá peso político e legitimidade popular aos projetos de redução de jornada sem redução salarial na Câmara dos Deputados e no Senado.
              </p>
            </div>

            {/* Elegant Bento Highlights describing benefits of 6x1 end */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#E41221]" />
                Por que esta mudança beneficia a todos?
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0c0d12]/80 border border-gray-800 p-4 rounded-xl space-y-2 hover:border-gray-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#E41221]/10 text-[#E41221] flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Mais Saúde e Vida</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Reduz drasticamente o esgotamento físico, estresse e riscos de depressão ou Burnout.</p>
                </div>

                <div className="bg-[#0c0d12]/80 border border-gray-800 p-4 rounded-xl space-y-2 hover:border-gray-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#E41221]/10 text-[#E41221] flex items-center justify-center">
                    <Heart className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Convivência Familiar</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Permite ao trabalhador desfrutar de momentos reais de lazer e convívio com seus filhos.</p>
                </div>

                <div className="bg-[#0c0d12]/80 border border-gray-800 p-4 rounded-xl space-y-2 hover:border-gray-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#E41221]/10 text-[#E41221] flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Qualificação de Mão de Obra</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Garante o tempo necessário para quem quer estudar, fazer faculdade ou cursos técnicos.</p>
                </div>

                <div className="bg-[#0c0d12]/80 border border-gray-800 p-4 rounded-xl space-y-2 hover:border-gray-700 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#E41221]/10 text-[#E41221] flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Geração de Empregos</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Uma escala de trabalho mais equilibrada abre espaço para novas contratações no mercado.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Modern High-Conversion Input Form Card */}
          <div className="lg:col-span-5 bg-[#0e1017] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E41221]/5 rounded-full blur-3xl"></div>
            
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div
                  key="petition-form"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="text-[#E41221]">✊</span> 
                      Assine o Manifesto Oficial
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Preencha todos os campos obrigatórios abaixo para registrar seu voto contra a exploração.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Nome Completo Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300 flex items-center gap-1">
                        Nome Completo <span className="text-[#E41221] font-bold">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                          <User className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Seu nome completo"
                          className="w-full bg-[#151720] border border-[#282b3d] hover:border-gray-700 focus:border-[#E41221] text-gray-100 text-xs rounded-xl pl-10 pr-4 py-3.5 outline-none transition-all placeholder:text-gray-600 focus:ring-1 focus:ring-[#E41221]/35"
                        />
                      </div>
                    </div>

                    {/* E-mail Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300 flex items-center gap-1">
                        E-mail <span className="text-[#E41221] font-bold">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seuemail@provedor.com"
                          className="w-full bg-[#151720] border border-[#282b3d] hover:border-gray-700 focus:border-[#E41221] text-gray-100 text-xs rounded-xl pl-10 pr-4 py-3.5 outline-none transition-all placeholder:text-gray-600 focus:ring-1 focus:ring-[#E41221]/35"
                        />
                      </div>
                    </div>

                    {/* WhatsApp Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300 flex items-center gap-1">
                        WhatsApp / Celular <span className="text-[#E41221] font-bold">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                          <Phone className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          required
                          value={whatsapp}
                          onChange={handlePhoneChange}
                          placeholder="(24) 99999-9999"
                          className="w-full bg-[#151720] border border-[#282b3d] hover:border-gray-700 focus:border-[#E41221] text-gray-100 text-xs rounded-xl pl-10 pr-4 py-3.5 outline-none transition-all placeholder:text-gray-600 focus:ring-1 focus:ring-[#E41221]/35"
                        />
                      </div>
                    </div>

                    {/* NEW REQUIRED FIELD: Bairro (Dropdown Selector) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300 flex items-center gap-1">
                        Seu Bairro (em Petrópolis) <span className="text-[#E41221] font-bold">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500 pointer-events-none">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <select
                          required
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          className="w-full bg-[#151720] border border-[#282b3d] hover:border-gray-700 focus:border-[#E41221] text-gray-100 text-xs rounded-xl pl-10 pr-10 py-3.5 outline-none transition-all focus:ring-1 focus:ring-[#E41221]/35 appearance-none cursor-pointer"
                        >
                          <option value="" disabled className="text-gray-600 bg-[#151720]">
                            Selecione seu bairro...
                          </option>
                          {PETROPOLIS_NEIGHBORHOODS.map((n) => (
                            <option key={n} value={n} className="text-gray-100 bg-[#151720]">
                              {n}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="p-3 bg-red-950/25 border border-[#E41221]/30 rounded-xl text-red-400 text-xs font-semibold leading-relaxed">
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full px-5 py-3.5 bg-[#E41221] hover:bg-[#c9101d] disabled:bg-rose-950/40 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#E41221]/15 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Registrando Assinatura...
                        </>
                      ) : (
                        <>
                          Assinar Abaixo-Assinado Oficial ✊
                        </>
                      )}
                    </button>
                  </form>

                  <div className="text-[10px] text-gray-500 text-center leading-relaxed">
                    Sua assinatura contra a escala 6x1 será enviada com segurança e tratada de acordo com as leis eleitorais de manifestação política legítima do PT de Petrópolis.
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="petition-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-6"
                >
                  <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold text-white">Assinatura Confirmada!</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Sua assinatura foi devidamente gravada no banco de dados com seu bairro, ajudando a traçar o mapa de representatividade no município de Petrópolis!
                    </p>
                  </div>

                  <div className="bg-[#102319] border border-emerald-950 p-4 rounded-xl text-left space-y-1.5">
                    <span className="text-[9px] text-emerald-400 font-mono font-bold uppercase tracking-wider block">Obrigado pela sua luta</span>
                    <p className="text-xs text-emerald-100">Juntos, faremos o peso do povo ser escutado pelas instâncias do parlamento brasileiro.</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleShareWhatsApp}
                      className="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-600/10"
                    >
                      <Share2 className="h-4 w-4" />
                      Compartilhar no WhatsApp
                    </button>

                    <button
                      onClick={() => {
                        setName("");
                        setEmail("");
                        setWhatsapp("");
                        setBairro("");
                        setSubmitted(false);
                      }}
                      className="w-full px-5 py-2.5 bg-[#141620] hover:bg-[#1d202e] border border-[#2b2e40] text-gray-300 text-xs font-bold rounded-xl transition-all"
                    >
                      Assinar com outra pessoa
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
