import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  CheckSquare, 
  ClipboardList, 
  BarChart4, 
  TrendingUp, 
  PlusCircle, 
  RefreshCw, 
  Trash2, 
  Search, 
  Copy, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldCheck,
  Calendar,
  Lock,
  KeyRound,
  Unlock,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

// Data Structures & Methods
import { 
  SurveyResponse, 
  PollData, 
  Candidate, 
  initialPollData, 
  calculateValidVotes, 
  generateBaselineResponses, 
  aggregateSurveyResponses, 
  generateMarkdownReport,
  PETROPOLIS_NEIGHBORHOODS,
  getCurrentCycleDates,
  getNextCycleStartDate,
  calculateCandidateProfile,
  getDistrictForNeighborhood,
  NEIGHBORHOODS_BY_DISTRICT,
  getActiveCandidates,
  saveActiveCandidates,
  getActiveQuestions,
  saveActiveQuestions,
  CandidateConfig,
  QuestionConfig,
  getDeviceFingerprint,
  getCycleKeyForTimestamp,
  getDatesForCycleKey
} from "./types";

// Modular Survey Steps
import { WelcomeStep } from "./components/WelcomeStep";
import { DemographicsStep } from "./components/DemographicsStep";
import { EvaluationsStep } from "./components/EvaluationsStep";
import { SingleSelectionStep } from "./components/SingleSelectionStep";
import { SenateSelectionStep } from "./components/SenateSelectionStep";
import { ReviewStep } from "./components/ReviewStep";
import { SuccessStep } from "./components/SuccessStep";
import { EvolutionTab } from "./components/EvolutionTab";
import { Petition6x1Page } from "./components/Petition6x1Page";
import { Petition6x1Tab } from "./components/Petition6x1Tab";

// Firebase/Firestore Integration
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, getDocFromServer } from "firebase/firestore";
import { db } from "./firebase";

const optimizeBase64Image = (base64Str: string, maxWidth = 96, maxHeight = 96): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image/") || base64Str.length < 5000) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const isPng = base64Str.includes("image/png") || base64Str.includes("image/gif");
        if (isPng) {
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        }
      } catch (err) {
        console.error("Error compressing image", err);
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

export default function App() {
  // Database States
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [standaloneSuggestions, setStandaloneSuggestions] = useState<{ id: string; timestamp: string; suggestedCandidate: string }[]>([]);

  // Selected Cycle Key for Filtering (Default is current cycle key)
  const [selectedCycleKey, setSelectedCycleKey] = useState<string>(() => getCurrentCycleDates().key);

  // Memoize all unique cycle keys available in the database (plus current cycle so it is always present)
  const availableCycles = useMemo(() => {
    const currentKey = getCurrentCycleDates().key;
    const keysSet = new Set<string>();
    keysSet.add(currentKey);

    responses.forEach((r) => {
      const k = getCycleKeyForTimestamp(r.timestamp);
      if (k) {
        keysSet.add(k);
      }
    });

    return Array.from(keysSet).sort((a, b) => b.localeCompare(a));
  }, [responses]);

  // Filtered responses based on selectedCycleKey
  const filteredResponses = useMemo(() => {
    if (!selectedCycleKey) return responses;
    return responses.filter((r) => {
      const k = getCycleKeyForTimestamp(r.timestamp) || getCurrentCycleDates().key;
      return k === selectedCycleKey;
    });
  }, [responses, selectedCycleKey]);
  const [activeView, setActiveView] = useState<"interviewee" | "analyst" | "petition_6x1">("interviewee");
  const [alreadyVoted, setAlreadyVoted] = useState<boolean>(false);
  const [isPrivateBrowsing, setIsPrivateBrowsing] = useState<boolean>(false);
  const [deviceHashState, setDeviceHashState] = useState<string>("");
  const [clientIpHash, setClientIpHash] = useState<string>("");
  const [voterUuid] = useState<string>(() => {
    let uid = localStorage.getItem("linkon_voter_uuid");
    if (!uid) {
      uid = "v-" + Math.random().toString(36).substring(2, 15) + "-" + Date.now().toString(36);
      localStorage.setItem("linkon_voter_uuid", uid);
    }
    return uid;
  });

  // Survey Wizard Step control
  const [surveyStep, setSurveyStep] = useState<number>(0); 
  const [surveySubmitted, setSurveySubmitted] = useState<boolean>(false);

  // Live Survey Answers
  const [surveyAnswers, setSurveyAnswers] = useState<Omit<SurveyResponse, "id" | "timestamp">>({
    gender: "",
    age: "",
    neighborhood: "",
    evalLula: "",
    evalGovernor: "",
    evalMayor: "",
    votePresident: "",
    votePresidentRunoff: "",
    voteGovernor: "",
    voteGovernorRunoff: "",
    voteSenate: [],
    voteStateDeputy: "",
    voteFederalDeputy: "",
    voteMayorPetropolis: "",
    education: "",
    income: "",
    color: "",
    religion: "",
    suggestedCandidate: ""
  });

  // Analyst Control Center States
  const [analystTab, setAnalystTab] = useState<"scenarios" | "approvals" | "demographics" | "report" | "evolution" | "petition_6x1">("scenarios");
  const [activeScenario, setActiveScenario] = useState<"president" | "presidentRunoff" | "governor" | "governorRunoff" | "senate" | "stateDeputy" | "federalDeputy" | "mayor">("president");
  const [valuationViewType, setValuationViewType] = useState<"valids" | "totals">("valids");
  
  // Notification states
  const [notif, setNotif] = useState<{ message: string; type: "success" | "info" | "warning" | null }>({
    message: "",
    type: null
  });
  
  // Search state in Database
  const [dbSearch, setDbSearch] = useState("");
  const [compactReportCopied, setCompactReportCopied] = useState(false);

  // Secret Admin Panel States
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("linkon_admin_session") === "true";
  });
  const [adminPinInput, setAdminPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

  const [adminSubTab, setAdminSubTab] = useState<"dossier" | "candidates" | "questions">("dossier");
  const [questionsList, setQuestionsList] = useState(() => getActiveQuestions());
  const [candidateUpdateTrigger, setCandidateUpdateTrigger] = useState(0);

  // States for candidate editing in candidates tab
  const [editCandCategory, setEditCandCategory] = useState<"president" | "presidentRunoff" | "governor" | "governorRunoff" | "senate" | "stateDeputy" | "federalDeputy" | "mayor">("president");
  const [editCandId, setEditCandId] = useState<string | null>(null);
  const [editCandName, setEditCandName] = useState("");
  const [editCandParty, setEditCandParty] = useState("");
  const [newCandName, setNewCandName] = useState("");
  const [newCandParty, setNewCandParty] = useState("");

  // States for question editing in questions tab
  const [editQuestKey, setEditQuestKey] = useState<string | null>(null);
  const [editQuestTitle, setEditQuestTitle] = useState("");
  const [editQuestSubtitle, setEditQuestSubtitle] = useState("");
  const [editQuestCategory, setEditQuestCategory] = useState<string>("president");
  const [newQuestKey, setNewQuestKey] = useState("");
  const [newQuestTitle, setNewQuestTitle] = useState("");
  const [newQuestSubtitle, setNewQuestSubtitle] = useState("");
  const [newQuestCategory, setNewQuestCategory] = useState<string>("president");
  const [adminCategory, setAdminCategory] = useState<"president" | "governor" | "senate" | "stateDeputy" | "federalDeputy">("president");
  const [adminCandidateId, setAdminCandidateId] = useState<string>("pres-lula");
  const [neighborhoodSearch, setNeighborhoodSearch] = useState<string>("");
  const [copiedNeighsText, setCopiedNeighsText] = useState<boolean>(false);
  const [copiedProfileText, setCopiedProfileText] = useState<boolean>(false);
  const [candidateProfileTab, setCandidateProfileTab] = useState<"stats" | "whatsapp">("stats");
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false);

  // AI Suggestions and Google Gemini analysis of candidate votes
  const [aiSuggestions, setAiSuggestions] = useState<{ name: string; count: number; analysis: string }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);

  const [deviceSuggestions, setDeviceSuggestions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("linkon_device_suggestions");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [newSuggestionInput, setNewSuggestionInput] = useState<string>("");
  const [submittingUserSuggestion, setSubmittingUserSuggestion] = useState<boolean>(false);

  useEffect(() => {
    setNeighborhoodSearch("");
  }, [adminCandidateId, adminCategory]);

  useEffect(() => {
    if (activeView !== "analyst" && !isAdminMode) return;
    
    // Filter non-empty open candidate suggestions from both responses and standalone suggestions
    const rawResponsesSuggestions = filteredResponses
      .map(r => r.suggestedCandidate)
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0);

    const rawStandaloneSuggestions = standaloneSuggestions
      .map(s => s.suggestedCandidate)
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0);

    const rawSuggestions = [...rawResponsesSuggestions, ...rawStandaloneSuggestions];

    if (rawSuggestions.length === 0) {
      setAiSuggestions([]);
      return;
    }

    let isMounted = true;
    const fetchAiSuggestions = async () => {
      setLoadingSuggestions(true);
      let success = false;
      let attempt = 1;
      const maxAttempts = 3;

      while (attempt <= maxAttempts && isMounted && !success) {
        try {
          const response = await fetch("/api/gemini/suggest-candidates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ suggestions: rawSuggestions })
          });
          if (!response.ok) throw new Error("Erro de comunicação com o servidor.");
          const data = await response.json();
          if (isMounted) {
            setAiSuggestions(data.candidates || []);
            success = true;
          }
        } catch (err) {
          console.error(`Erro buscando sugestões de candidaturas IA (tentativa ${attempt}/${maxAttempts}):`, err);
          attempt++;
          if (attempt <= maxAttempts && isMounted) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      // Defensive Programming Fallback: Compute local counts immediately if backend remains offline/failed
      if (!success && isMounted) {
        console.warn("[Instituto Linkon] Utilizando agregação local client-side para exibição imediata devido a atraso de rede.");
        const partyMap: Record<string, string> = {
          "Yuri Moura": "PSOL",
          "Rubens Bomtempo": "PSB",
          "Hingo Hammes": "PP",
          "Bernardo Rossi": "MDB",
          "Eduardo Do Blog": "MDB",
          "Fred Procópio": "MDB",
          "Leandro Sampaio": "PODEMOS",
          "Guto Silva": "PP",
          "Octavio Sampaio": "PL",
          "Lula": "PT",
          "Jair Bolsonaro": "PL"
        };

        const counts: Record<string, number> = {};
        rawSuggestions.forEach(s => {
          if (!s || typeof s !== "string") return;
          const clean = s.trim();
          if (clean) {
            const norm = clean.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            counts[norm] = (counts[norm] || 0) + 1;
          }
        });
        
        let sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => {
            let party = "S/D";
            const matchKey = Object.keys(partyMap).find(k => 
              name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())
            );
            if (matchKey) {
              party = partyMap[matchKey];
            }
            return {
              name,
              party,
              count,
              analysis: `Indicação orgânica de Petrópolis. Recenseado com ${count} menções nesta amostragem de coletas.`
            };
          });

        if (sorted.length > 5) {
          sorted = sorted.slice(0, 5);
        }
        setAiSuggestions(sorted);
      }

      if (isMounted) {
        setLoadingSuggestions(false);
      }
    };

    fetchAiSuggestions();
    
    return () => {
      isMounted = false;
    };
  }, [activeView, isAdminMode, filteredResponses, standaloneSuggestions]);

  // Detect private / incognito browsing to protect poll audit integrity
  useEffect(() => {
    const detectPrivateMode = async () => {
      // 1. Firefox private mode detection via IndexedDB
      const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
      if (isFirefox) {
        try {
          const db = window.indexedDB.open("ff_private_test");
          db.onerror = () => setIsPrivateMode(true);
        } catch (e) {
          setIsPrivateMode(true);
        }
        return;
      }

      // 2. Chrome & Chromium-based browsers (Edge, Opera, Chrome mobile) private mode detection
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const { quota } = await navigator.storage.estimate();
        // Chromium incognito limits local storage size, or limits storage estimate to very low bytes (< 120MB)
        if (quota && quota < 120000000) {
          setIsPrivateMode(true);
          return;
        }
      }

      // 3. Safari private mode check
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari) {
        try {
          const testDb = window.indexedDB.open("safari_private_test");
          testDb.onerror = () => setIsPrivateMode(true);
          testDb.onsuccess = () => {
            try {
              window.localStorage.setItem("safari_private_key", "test");
              window.localStorage.removeItem("safari_private_key");
            } catch (e) {
              setIsPrivateMode(true);
            }
          };
        } catch (e) {
          setIsPrivateMode(true);
        }
        return;
      }
    };

    detectPrivateMode();
  }, []);

  // Auto path-routing check for admin mode
  useEffect(() => {
    const checkRoute = () => {
      // Obfuscated representation of "painell" to prevent discovery via inspect element / string search
      const s = window.atob("cGFpbmVsbA==");
      const isPainel = window.location.pathname.includes(s) || 
                       window.location.hash.includes(s) ||
                       window.location.search.includes(s);
      setIsAdminMode(isPainel);
    };

    checkRoute();
    window.addEventListener("popstate", checkRoute);
    window.addEventListener("hashchange", checkRoute);
    return () => {
      window.removeEventListener("popstate", checkRoute);
      window.removeEventListener("hashchange", checkRoute);
    };
  }, []);

  // Auto-route check for Fim da Escala 6x1 petition page
  useEffect(() => {
    const checkPetitionRoute = () => {
      const isPetition6x1 = window.location.pathname.includes("fimdaescala6x1") || 
                           window.location.hash.includes("fimdaescala6x1") ||
                           window.location.search.includes("fimdaescala6x1");
      if (isPetition6x1) {
        setActiveView("petition_6x1");
      }
    };
    checkPetitionRoute();
    window.addEventListener("popstate", checkPetitionRoute);
    window.addEventListener("hashchange", checkPetitionRoute);
    return () => {
      window.removeEventListener("popstate", checkPetitionRoute);
      window.removeEventListener("hashchange", checkPetitionRoute);
    };
  }, []);

  // Scroll to top of page on survey step progress or major viewpoint switches
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0 });
      document.documentElement.scrollTo({ top: 0 });
      document.body.scrollTo({ top: 0 });
    };
    
    scrollToTop();
    const timer = setTimeout(scrollToTop, 20); // Fail-safe fallback for React paint delays
    return () => clearTimeout(timer);
  }, [
    surveyStep,
    activeView
  ]);

  // Load Seed / Data base with automatic 15-day cycle reset and Firestore integration
  useEffect(() => {
    const currentCycle = getCurrentCycleDates();
    const storedCycle = localStorage.getItem("linkon_survey_cycle");
    const submittedKey = "linkon_survey_submitted_" + currentCycle.key;
    
    let hasReset = false;
    // If the registered cycle has changed, completely clear the state automatically!
    if (storedCycle !== currentCycle.key) {
      localStorage.setItem("linkon_survey_cycle", currentCycle.key);
      localStorage.removeItem("linkon_survey_responses");
      setAlreadyVoted(false);
      hasReset = true;
    } else {
      const submitted = localStorage.getItem(submittedKey) === "true";
      setAlreadyVoted(submitted);
    }

    const checkSecurityAndFp = async () => {
      const hash = await getDeviceFingerprint();
      setDeviceHashState(hash);

      let isPrivate = false;
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const { quota } = await navigator.storage.estimate();
          if (quota && quota < 120 * 1024 * 1024) {
            isPrivate = true;
          }
        }
        
        if ('MozBoxSizing' in document.documentElement.style) {
          try {
            const dbRef = indexedDB.open("test_private");
            dbRef.onerror = () => { isPrivate = true; };
          } catch (e) {
            isPrivate = true;
          }
        }

        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari && !navigator.serviceWorker) {
          isPrivate = true;
        }

        try {
          localStorage.setItem("__private_test", "yes");
          localStorage.removeItem("__private_test");
        } catch (e) {
          isPrivate = true;
        }
      } catch (err) {
        console.error("Erro detectando modo privado:", err);
      }

      if (isPrivate) {
        setIsPrivateBrowsing(true);
      }
      return hash;
    };

    const syncFirestoreData = async () => {
      try {
        // Test connection first as required
        try {
          await getDocFromServer(doc(db, "test", "connection"));
        } catch (err) {
          if (err instanceof Error && err.message.includes("the client is offline")) {
            console.error("Please check your Firebase configuration.");
          }
        }

        const querySnapshot = await getDocs(collection(db, "responses"));
        const loaded: SurveyResponse[] = [];
        querySnapshot.forEach((docSnap) => {
          loaded.push(docSnap.data() as SurveyResponse);
        });

        // Check fingerprint, persistent voterUuid, and private mode
        const hash = await checkSecurityAndFp();
        const hasVoted = loaded.some(r => {
          const sameCycle = getCycleKeyForTimestamp(r.timestamp) === currentCycle.key;
          if (!sameCycle) return false;

          // 1. Check local UUID match (100% accurate per browser)
          if (r.voterUuid && voterUuid && r.voterUuid === voterUuid) {
            return true;
          }

          return false;
        });
        if (hasVoted) {
          setAlreadyVoted(true);
        }

        if (loaded.length > 0) {
          setResponses(loaded);
          localStorage.setItem("linkon_survey_responses", JSON.stringify(loaded));
        } else {
          // DB is empty in cloud, load from local storage if exists
          let loadedLocal = false;
          const stored = localStorage.getItem("linkon_survey_responses");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setResponses(parsed);
                loadedLocal = true;
              }
            } catch (e) {
              console.error(e);
            }
          }
          if (!loadedLocal) {
            setResponses([]);
            localStorage.setItem("linkon_survey_responses", JSON.stringify([]));
          }
        }

        // Fetch standalone suggestions from Cloud or cache
        const loadedSugs: { id: string; timestamp: string; suggestedCandidate: string }[] = [];
        try {
          const sugSnapshot = await getDocs(collection(db, "suggestions"));
          sugSnapshot.forEach((docSnap) => {
            loadedSugs.push(docSnap.data() as any);
          });
          setStandaloneSuggestions(loadedSugs);
          localStorage.setItem("linkon_standalone_suggestions", JSON.stringify(loadedSugs));
        } catch (sugErr) {
          console.error("Erro ao carregar sugestões adicionais da nuvem:", sugErr);
          const storedSugs = localStorage.getItem("linkon_standalone_suggestions");
          if (storedSugs) {
            setStandaloneSuggestions(JSON.parse(storedSugs));
          }
        }

        // Fetch custom category candidates from Cloud if they exist (to keep everyone in sync)
        try {
          const candSnapshot = await getDocs(collection(db, "candidates_config"));
          let loadedAny = false;
          candSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.category && Array.isArray(data.candidates)) {
              localStorage.setItem("linkon_custom_candidates_" + data.category, JSON.stringify(data.candidates));
              loadedAny = true;
            }
          });
          if (loadedAny) {
            setCandidateUpdateTrigger(prev => prev + 1);
          }
        } catch (candErr) {
          console.error("Erro ao carregar candidatos personalizados da nuvem:", candErr);
        }

      } catch (error) {
        console.error("Erro carregando do Firestore, tentando carregamento local:", error);
        // Fallback local load
        const stored = localStorage.getItem("linkon_survey_responses");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setResponses(parsed);
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          setResponses([]);
          localStorage.setItem("linkon_survey_responses", JSON.stringify([]));
        }

        const storedSugs = localStorage.getItem("linkon_standalone_suggestions");
        if (storedSugs) {
          try {
            const parsedS = JSON.parse(storedSugs);
            if (Array.isArray(parsedS)) {
              setStandaloneSuggestions(parsedS);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    };

    syncFirestoreData();

    if (hasReset) {
      showNotification(`Dados reiniciados! Nova amostragem quinzenal: ${currentCycle.start} a ${currentCycle.end}`, "info");
    }
  }, []);

  // Helper method to seed mock surveys for the current cycle to test dashboards
  const handleGenerateTestData = () => {
    const ageOptions = ["16-24", "25-34", "35-44", "45-59", "60+"];
    const genderOptions = ["Feminino", "Masculino", "Outro"];
    const evalOptions = ["positive", "regular", "negative", "dontKnow"];
    
    // Real Candidate IDs of Linkon
    const candidatesPres = ["pres-lula", "pres-flavio", "pres-caiado", "pres-zema", "pres-renan", "pres-daciolo", "pres-samara"];
    const candidatesGov = ["gov-paes", "gov-ruas", "gov-luizinho", "gov-reis", "gov-marinho", "gov-siri", "gov-amorim"];
    const candidatesSen = ["sen-crivella", "sen-benedita", "sen-monica", "sen-otoni", "sen-pedro"];
    const candidatesState = ["est-yuri", "est-fred", "est-octavio", "est-junior", "est-paulo", "est-gilda", "est-eduardo", "est-rodrigo", "est-renata", "est-sergio", "est-leonardo", "est-dani"];
    const candidatesFederal = ["fed-hugo", "fed-bernardo", "fed-rubens", "fed-leandro", "fed-julia", "fed-pazuello", "fed-taliria", "fed-taina", "fed-jandira"];
    const candidatesMayor = ["may-hingo", "may-yuri", "may-paulo", "may-rubens", "may-eduardo"];

    const testResponses: SurveyResponse[] = Array.from({ length: 150 }, (_, i) => {
      const idx = Math.floor(Math.random() * PETROPOLIS_NEIGHBORHOODS.length);
      const neigh = PETROPOLIS_NEIGHBORHOODS[idx] || "Centro";
      
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

      return {
        id: `li-res-test-${1000 + i}`,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 800000000)).toISOString(),
        gender: genderOptions[Math.floor(Math.random() * genderOptions.length)],
        age: ageOptions[Math.floor(Math.random() * ageOptions.length)],
        neighborhood: neigh,
        education: educationOptions[Math.floor(Math.random() * educationOptions.length)],
        income: incomeOptions[Math.floor(Math.random() * incomeOptions.length)],
        color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
        religion: religionOptions[Math.floor(Math.random() * religionOptions.length)],
        evalLula: evalOptions[Math.floor(Math.random() * evalOptions.length)],
        evalGovernor: evalOptions[Math.floor(Math.random() * evalOptions.length)],
        evalMayor: evalOptions[Math.floor(Math.random() * evalOptions.length)],
        votePresident: Math.random() < 0.1 ? "indecisos" : Math.random() < 0.08 ? "brancosNulos" : candidatesPres[Math.floor(Math.random() * candidatesPres.length)],
        votePresidentRunoff: Math.random() < 0.1 ? "indecisos" : Math.random() < 0.08 ? "brancosNulos" : (Math.random() < 0.5 ? "pres-lula" : "pres-flavio"),
        voteGovernor: Math.random() < 0.12 ? "indecisos" : Math.random() < 0.08 ? "brancosNulos" : candidatesGov[Math.floor(Math.random() * candidatesGov.length)],
        voteGovernorRunoff: Math.random() < 0.1 ? "indecisos" : Math.random() < 0.08 ? "brancosNulos" : (Math.random() < 0.5 ? "gov-paes" : "gov-ruas"),
        voteSenate: [candidatesSen[Math.floor(Math.random() * candidatesSen.length)]],
        voteStateDeputy: Math.random() < 0.15 ? "indecisos" : Math.random() < 0.1 ? "brancosNulos" : candidatesState[Math.floor(Math.random() * candidatesState.length)],
        voteFederalDeputy: Math.random() < 0.15 ? "indecisos" : Math.random() < 0.1 ? "brancosNulos" : candidatesFederal[Math.floor(Math.random() * candidatesFederal.length)],
        voteMayorPetropolis: Math.random() < 0.1 ? "indecisos" : Math.random() < 0.08 ? "brancosNulos" : candidatesMayor[Math.floor(Math.random() * candidatesMayor.length)]
      };
    });

    updateDatabase(testResponses);
    showNotification("Banco de coletas de amostragem gerado (150 registros reais simulados)!", "success");
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteCandidateTarget, setDeleteCandidateTarget] = useState<{ id: string, name: string, category: string } | null>(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<{ key: string, title: string } | null>(null);
  const [showHardResetConfirm, setShowHardResetConfirm] = useState(false);

  const handleClearDatabase = () => {
    setShowClearConfirm(true);
  };

  const confirmClearDatabase = async () => {
    const currentCycle = getCurrentCycleDates();
    updateDatabase([]);
    setStandaloneSuggestions([]);
    localStorage.removeItem("linkon_standalone_suggestions");
    setDeviceSuggestions([]);
    localStorage.removeItem("linkon_device_suggestions");
    localStorage.removeItem("linkon_survey_submitted_" + currentCycle.key);
    localStorage.removeItem("linkon_survey_submitted");
    setAlreadyVoted(false);
    setShowClearConfirm(false);
    
    try {
      const querySnapshot = await getDocs(collection(db, "responses"));
      const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      
      const sugSnapshot = await getDocs(collection(db, "suggestions"));
      const deleteSugPromises = sugSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));

      await Promise.all([...deletePromises, ...deleteSugPromises]);
      showNotification("Banco profissional da Nuvem e dados locais limpos com sucesso!", "warning");
    } catch (e) {
      console.error("Erro limpando Firestore ao confirmar clear:", e);
      showNotification("Banco local limpo. Falha ao limpar nuvem.", "warning");
    }
  };

  // Sync Database
  const updateDatabase = (newResponses: SurveyResponse[]) => {
    setResponses(newResponses);
    localStorage.setItem("linkon_survey_responses", JSON.stringify(newResponses));
  };

  const handleSaveActiveCandidates = async (category: string, list: any[]) => {
    // Proactively compress any huge base64 photos to stay well under Firestore's 1MB limit.
    let optimizedList = list;
    try {
      optimizedList = await Promise.all(
        list.map(async (cand) => {
          if (cand.photo && typeof cand.photo === "string" && cand.photo.startsWith("data:image/")) {
            try {
              const smallPhoto = await optimizeBase64Image(cand.photo, 96, 96);
              return { ...cand, photo: smallPhoto };
            } catch (e) {
              console.error("Erro compactando imagem no save:", e);
              return cand;
            }
          }
          return cand;
        })
      );
    } catch (err) {
      console.error("Erro ao otimizar lista de fotos:", err);
    }

    saveActiveCandidates(category, optimizedList);
    try {
      await setDoc(doc(db, "candidates_config", category), { category, candidates: optimizedList });
    } catch (e) {
      console.error("Erro ao sincronizar candidatos no Firestore:", e);
    }
  };

  const confirmDeleteCandidate = () => {
    if (!deleteCandidateTarget) return;
    const { id, category } = deleteCandidateTarget;
    const list = getActiveCandidates(category);
    const updated = list.filter(c => c.id !== id);
    handleSaveActiveCandidates(category, updated);
    setCandidateUpdateTrigger(prev => prev + 1);
    setDeleteCandidateTarget(null);
    showNotification("Candidato removido!", "warning");
  };

  const confirmDeleteQuestion = () => {
    if (!deleteQuestionTarget) return;
    const { key } = deleteQuestionTarget;
    const updated = questionsList.filter(q => q.key !== key);
    saveActiveQuestions(updated);
    setQuestionsList(updated);
    setDeleteQuestionTarget(null);
    showNotification("Pergunta excluída!", "warning");
  };

  // Toast notifications
  const showNotification = (message: string, type: "success" | "info" | "warning") => {
    setNotif({ message, type });
    setTimeout(() => {
      setNotif({ message: "", type: null });
    }, 4500);
  };

  // Real-time calculated aggregations
  const activePollData = useMemo(() => {
    return aggregateSurveyResponses(filteredResponses, selectedCycleKey === getCurrentCycleDates().key);
  }, [filteredResponses, selectedCycleKey, candidateUpdateTrigger]);

  // Valid vote precomputations
  const presValids = useMemo(() => {
    return calculateValidVotes(
      activePollData.presidentScenario.candidates,
      activePollData.presidentScenario.brancosNulos,
      activePollData.presidentScenario.indecisos
    );
  }, [activePollData.presidentScenario]);

  const govValids = useMemo(() => {
    return calculateValidVotes(
      activePollData.governorScenario.candidates,
      activePollData.governorScenario.brancosNulos,
      activePollData.governorScenario.indecisos
    );
  }, [activePollData.governorScenario]);

  const senValids = useMemo(() => {
    return calculateValidVotes(
      activePollData.senateScenario.candidates,
      activePollData.senateScenario.brancosNulos,
      activePollData.senateScenario.indecisos
    );
  }, [activePollData.senateScenario]);

  const stateValids = useMemo(() => {
    return calculateValidVotes(
      activePollData.stateDeputyScenario.candidates,
      activePollData.stateDeputyScenario.brancosNulos,
      activePollData.stateDeputyScenario.indecisos
    );
  }, [activePollData.stateDeputyScenario]);

  const fedValids = useMemo(() => {
    return calculateValidVotes(
      activePollData.federalDeputyScenario.candidates,
      activePollData.federalDeputyScenario.brancosNulos,
      activePollData.federalDeputyScenario.indecisos
    );
  }, [activePollData.federalDeputyScenario]);

  const presRunoffValids = useMemo(() => {
    if (!activePollData.presidentRunoff) return [];
    return calculateValidVotes(
      activePollData.presidentRunoff.candidates,
      activePollData.presidentRunoff.brancosNulos,
      activePollData.presidentRunoff.indecisos
    );
  }, [activePollData.presidentRunoff]);

  const govRunoffValids = useMemo(() => {
    if (!activePollData.governorRunoff) return [];
    return calculateValidVotes(
      activePollData.governorRunoff.candidates,
      activePollData.governorRunoff.brancosNulos,
      activePollData.governorRunoff.indecisos
    );
  }, [activePollData.governorRunoff]);

  const mayorValids = useMemo(() => {
    if (!activePollData.mayorScenario) return [];
    return calculateValidVotes(
      activePollData.mayorScenario.candidates,
      activePollData.mayorScenario.brancosNulos,
      activePollData.mayorScenario.indecisos
    );
  }, [activePollData.mayorScenario]);

  useEffect(() => {
    if (activeScenario === "presidentRunoff" && !activePollData.presidentRunoff?.showRunoff) {
      setActiveScenario("president");
    }
    if (activeScenario === "governorRunoff" && !activePollData.governorRunoff?.showRunoff) {
      setActiveScenario("governor");
    }
  }, [activeScenario, activePollData.presidentRunoff?.showRunoff, activePollData.governorRunoff?.showRunoff]);

  // Demographic Aggregations
  const demographicStats = useMemo(() => {
    const genderCounts: Record<string, number> = {};
    const ageCounts: Record<string, number> = {};
    const neighborhoodCounts: Record<string, number> = {};
    const educationCounts: Record<string, number> = {};
    const incomeCounts: Record<string, number> = {};
    const colorCounts: Record<string, number> = {};
    const religionCounts: Record<string, number> = {};
    const districtCounts: Record<string, number> = {
      "1º Distrito: Petrópolis": 0,
      "2º Distrito: Cascatinha": 0,
      "3º Distrito: Itaipava": 0,
      "4º Distrito: Pedro do Rio": 0,
      "5º Distrito: Posse": 0,
      "Outros / Não Especificado": 0
    };

    filteredResponses.forEach(r => {
      genderCounts[r.gender] = (genderCounts[r.gender] || 0) + 1;
      ageCounts[r.age] = (ageCounts[r.age] || 0) + 1;
      neighborhoodCounts[r.neighborhood] = (neighborhoodCounts[r.neighborhood] || 0) + 1;
      
      const dist = getDistrictForNeighborhood(r.neighborhood || "");
      districtCounts[dist] = (districtCounts[dist] || 0) + 1;

      const edu = r.education || "Não Informado";
      educationCounts[edu] = (educationCounts[edu] || 0) + 1;

      const inc = r.income || "Não Informado";
      incomeCounts[inc] = (incomeCounts[inc] || 0) + 1;

      const col = r.color || "Não Informado";
      colorCounts[col] = (colorCounts[col] || 0) + 1;

      const rel = r.religion || "Não Informado";
      religionCounts[rel] = (religionCounts[rel] || 0) + 1;
    });

    // Modern Deep Blue and Emerald Palette for confidence
    const colors = ["#3b82f6", "#10b981", "#06b6d4", "#8b5cf6", "#f43f5e", "#f59e0b", "#14b8a6", "#6b7280", "#a855f7", "#ec4899"];

    // Remove empty other districts if they have 0 responses, but keep the 5 main districts visible
    const formattedDistricts = Object.entries(districtCounts)
      .map(([name, value], i) => ({
        name,
        value,
        color: ["#3b82f6", "#10b981", "#a855f7", "#f59e0b", "#ec4899", "#6b7280"][i % 6]
      }))
      .filter(d => d.value > 0 || d.name !== "Outros / Não Especificado");

    return {
      gender: Object.entries(genderCounts).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] })),
      age: Object.entries(ageCounts).map(([name, value], i) => ({ name: `${name} anos`, value, color: colors[(i + 1) % colors.length] })),
      neighborhood: Object.entries(neighborhoodCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
        .map((item, i) => ({ ...item, color: colors[(i + 2) % colors.length] })),
      districts: formattedDistricts,
      education: Object.entries(educationCounts).map(([name, value], i) => ({ name, value, color: colors[(i + 3) % colors.length] })),
      income: Object.entries(incomeCounts).map(([name, value], i) => ({ name, value, color: colors[(i + 4) % colors.length] })),
      color: Object.entries(colorCounts).map(([name, value], i) => ({ name, value, color: colors[(i + 5) % colors.length] })),
      religion: Object.entries(religionCounts).map(([name, value], i) => ({ name, value, color: colors[(i + 6) % colors.length] }))
    };
  }, [filteredResponses]);

  // Top active segment
  const topActiveNeighborhood = useMemo(() => {
    if (demographicStats.neighborhood.length === 0) return "Carregando...";
    return demographicStats.neighborhood[0].name;
  }, [demographicStats]);

  // Set response answers and route
  const handleAnswerSelect = (field: keyof typeof surveyAnswers, value: any) => {
    setSurveyAnswers(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const activeQuestions = useMemo(() => {
    return questionsList.filter(q => q.active);
  }, [questionsList]);

  const handleNextStep = () => {
    if (surveyStep === 1) {
      if (
        !surveyAnswers.gender || 
        !surveyAnswers.age || 
        !surveyAnswers.neighborhood ||
        !surveyAnswers.education ||
        !surveyAnswers.income ||
        !surveyAnswers.color ||
        !surveyAnswers.religion
      ) {
        showNotification("Preencha todas as variáveis demográficas para continuar.", "warning");
        return;
      }
    }
    if (surveyStep === 2) {
      if (!surveyAnswers.evalLula || !surveyAnswers.evalGovernor || !surveyAnswers.evalMayor) {
        showNotification("Preencha as classificações de gestão pública para continuar.", "warning");
        return;
      }
    }

    if (surveyStep >= 3 && surveyStep < 3 + activeQuestions.length) {
      const qIdx = surveyStep - 3;
      const question = activeQuestions[qIdx];
      const val = surveyAnswers[question.key as keyof typeof surveyAnswers];

      if (question.category === "senate") {
        const votes = (val as string[]) || [];
        const isSpecial = votes.includes("brancosNulos") || votes.includes("indecisos");
        const isValidSenate = isSpecial || votes.length === 2;
        if (!isValidSenate) {
          showNotification("Por favor, selecione exatamente 2 candidatos ou clique em Branco/Nulo para o Senado.", "warning");
          return;
        }
      } else {
        if (!val) {
          showNotification(`Por favor, selecione uma opção para continuar.`, "warning");
          return;
        }
      }
    }
    
    setSurveyStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    if (surveyStep === 1) {
      setSurveyStep(0);
    } else {
      setSurveyStep(prev => Math.max(0, prev - 1));
    }
  };

  // Submit survey responses
  const handleSurveySubmit = async () => {
    const finalResponse: SurveyResponse = {
      ...surveyAnswers,
      id: `li-res-usr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      deviceHash: deviceHashState || (await getDeviceFingerprint()),
      ipHash: clientIpHash,
      voterUuid: voterUuid
    };

    const updated = [...responses, finalResponse];
    updateDatabase(updated);
    
    try {
      await setDoc(doc(db, "responses", finalResponse.id), finalResponse);
      showNotification("Sondagem enviada e salva na Nuvem com sucesso!", "success");
    } catch (e) {
      console.error("Erro salvando resposta no Firestore:", e);
      showNotification("Sondagem guardada localmente! (Modo Offline ativo)", "info");
    }

    const currentCycle = getCurrentCycleDates();
    localStorage.setItem("linkon_survey_submitted_" + currentCycle.key, "true");
    setAlreadyVoted(true);
    setSurveySubmitted(true);
    setSurveyStep(4 + activeQuestions.length);
  };

  // Clean reset
  const handleResetSurvey = () => {
    setSurveyAnswers({
      gender: "",
      age: "",
      neighborhood: "",
      evalLula: "",
      evalGovernor: "",
      evalMayor: "",
      votePresident: "",
      votePresidentRunoff: "",
      voteGovernor: "",
      voteGovernorRunoff: "",
      voteSenate: [],
      voteStateDeputy: "",
      voteFederalDeputy: "",
      voteMayorPetropolis: "",
      education: "",
      income: "",
      color: "",
      religion: "",
      suggestedCandidate: ""
    });
    setSurveySubmitted(false);
    setSurveyStep(0);
  };

  const handleUserSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSuggestionInput.trim();
    if (!cleanName) {
      showNotification("Por favor, digite o nome de um pré-candidato.", "warning");
      return;
    }

    if (deviceSuggestions.length >= 3) {
      showNotification("Você já enviou o limite máximo de 3 sugestões por dispositivo.", "warning");
      return;
    }

    setSubmittingUserSuggestion(true);
    const newSuggestDoc = {
      id: `li-sug-direct-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      suggestedCandidate: cleanName
    };

    const updated = [...standaloneSuggestions, newSuggestDoc];
    
    try {
      await setDoc(doc(db, "suggestions", newSuggestDoc.id), newSuggestDoc);
      setStandaloneSuggestions(updated);
      localStorage.setItem("linkon_standalone_suggestions", JSON.stringify(updated));
      
      const newDeviceList = [...deviceSuggestions, cleanName];
      setDeviceSuggestions(newDeviceList);
      localStorage.setItem("linkon_device_suggestions", JSON.stringify(newDeviceList));
      
      setNewSuggestionInput("");
      showNotification("Sua sugestão de pré-candidato foi enviada com sucesso!", "success");
    } catch (err) {
      console.error("Erro salvando sugestão direta:", err);
      showNotification("Não foi possível enviar sua sugestão. Tente novamente.", "warning");
    } finally {
      setSubmittingUserSuggestion(false);
    }
  };

  // Simulation respondent generator disabled to keep database 100% real
  const handleAddMockResponse = () => {
    showNotification("Simulações desativadas. Amostragem 100% real.", "info");
  };

  const handleDeleteResponse = async (id: string) => {
    const filtered = responses.filter(r => r.id !== id);
    updateDatabase(filtered);
    
    try {
      await deleteDoc(doc(db, "responses", id));
      showNotification("Sondagem removida com sucesso da Nuvem e do painel local.", "info");
    } catch (e) {
      console.error("Erro deletando do Firestore:", e);
      showNotification("Sondagem excluída localmente! (Erro ao atualizar Nuvem)", "warning");
    }
  };

  const handleHardResetDatabase = async () => {
    if (window.confirm("Zerar integralmente o banco de dados?")) {
      const currentCycle = getCurrentCycleDates();
      updateDatabase([]);
      setStandaloneSuggestions([]);
      localStorage.removeItem("linkon_standalone_suggestions");
      setDeviceSuggestions([]);
      localStorage.removeItem("linkon_device_suggestions");
      localStorage.removeItem("linkon_survey_submitted_" + currentCycle.key);
      localStorage.removeItem("linkon_survey_submitted");
      setAlreadyVoted(false);
      
      try {
        const querySnapshot = await getDocs(collection(db, "responses"));
        const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
        
        const sugSnapshot = await getDocs(collection(db, "suggestions"));
        const deleteSugPromises = sugSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));

        await Promise.all([...deletePromises, ...deleteSugPromises]);
        showNotification("Banco profissional da Nuvem, coletas e sugestões limpos com sucesso!", "warning");
      } catch (e) {
        console.error("Erro limpando Firestore:", e);
        showNotification("Banco local reiniciado. Falha ao limpar nuvem.", "warning");
      }
    }
  };

  const handleUnlockAllDevices = () => {
    const currentCycle = getCurrentCycleDates();
    localStorage.removeItem("linkon_survey_submitted_" + currentCycle.key);
    localStorage.removeItem("linkon_survey_submitted");
    setAlreadyVoted(false);
    showNotification("Dispositivos liberados com sucesso! Bloqueio de respostas redefinido para este navegador.", "success");
  };

  const handleClearAllDatabases = () => {
    setShowClearConfirm(true);
  };

  const handleCopyMarkdownReport = () => {
    const reportText = generateMarkdownReport(activePollData);
    navigator.clipboard.writeText(reportText).then(() => {
      setCompactReportCopied(true);
      showNotification("Boletim de divulgação para WhatsApp copiado!", "success");
      setTimeout(() => setCompactReportCopied(false), 2500);
    });
  };

  // Helper labels resolution
  const getCandidateName = (id: string | string[], scenario: "pres" | "presRunoff" | "gov" | "govRunoff" | "sen" | "state" | "fed" | "mayor") => {
    if (Array.isArray(id)) {
      if (id.length === 0) return "Nenhum selecionado";
      if (id.includes("brancosNulos")) return "Brancos / Nulos";
      if (id.includes("indecisos")) return "Não Sabe / Indeciso";
      return id.map(vid => {
        if (scenario === "sen") {
          const cand = activePollData.senateScenario.candidates.find(c => c.id === vid);
          return cand ? `${cand.name} (${cand.party})` : vid;
        }
        return vid;
      }).join(", ");
    }

    if (id === "brancosNulos") return "Brancos / Nulos";
    if (id === "indecisos") return "Não Sabe / Indeciso";
    
    if (scenario === "pres") {
      const cand = activePollData.presidentScenario.candidates.find(c => c.id === id);
      return cand ? `${cand.name} (${cand.party})` : id;
    } else if (scenario === "presRunoff") {
      const cand = activePollData.presidentRunoff?.candidates.find(c => c.id === id);
      return cand ? `${cand.name} (${cand.party})` : id;
    } else if (scenario === "gov") {
      const cand = activePollData.governorScenario.candidates.find(c => c.id === id);
      return cand ? `${cand.name} (${cand.party})` : id;
    } else if (scenario === "govRunoff") {
      const cand = activePollData.governorRunoff?.candidates.find(c => c.id === id);
      return cand ? `${cand.name} (${cand.party})` : id;
    } else if (scenario === "sen") {
      const cand = activePollData.senateScenario.candidates.find(c => c.id === id);
      return cand ? `${cand.name} (${cand.party})` : id;
    } else if (scenario === "state") {
      const cand = activePollData.stateDeputyScenario.candidates.find(c => c.id === id);
      return cand ? `${cand.name} (${cand.party})` : id;
    } else if (scenario === "mayor") {
      const cand = activePollData.mayorScenario?.candidates.find(c => c.id === id);
      return cand ? `${cand.name} (${cand.party})` : id;
    } else {
      const cand = activePollData.federalDeputyScenario.candidates.find(c => c.id === id);
      return cand ? `${cand.name} (${cand.party})` : id;
    }
  };

  const getCandidatesInfo = (idOrIds: string | string[], scenario: "pres" | "presRunoff" | "gov" | "govRunoff" | "sen" | "state" | "fed" | "mayor") => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    if (ids.length === 0 || (ids.length === 1 && ids[0] === "")) {
      return [];
    }
    return ids.map(id => {
      if (id === "brancosNulos") {
        return { id, name: "Brancos / Nulos", specialType: "brancosNulos" as const };
      }
      if (id === "indecisos") {
        return { id, name: "Não Sabe / Indeciso", specialType: "indecisos" as const };
      }

      let found: any = null;
      if (scenario === "pres") {
        found = activePollData.presidentScenario.candidates.find(c => c.id === id);
      } else if (scenario === "presRunoff") {
        found = activePollData.presidentRunoff?.candidates.find(c => c.id === id);
      } else if (scenario === "gov") {
        found = activePollData.governorScenario.candidates.find(c => c.id === id);
      } else if (scenario === "govRunoff") {
        found = activePollData.governorRunoff?.candidates.find(c => c.id === id);
      } else if (scenario === "sen") {
        found = activePollData.senateScenario.candidates.find(c => c.id === id);
      } else if (scenario === "state") {
        found = activePollData.stateDeputyScenario.candidates.find(c => c.id === id);
      } else if (scenario === "fed") {
        found = activePollData.federalDeputyScenario.candidates.find(c => c.id === id);
      } else if (scenario === "mayor") {
        found = activePollData.mayorScenario?.candidates.find(c => c.id === id);
      }

      return found ? {
        id: found.id,
        name: found.name,
        party: found.party,
        photo: (found as any).photo
      } : { id, name: id };
    });
  };

  const adminSearchFilteredResponses = useMemo(() => {
    return responses.filter(r => {
      const term = dbSearch.toLowerCase();
      return r.neighborhood.toLowerCase().includes(term) ||
             r.gender.toLowerCase().includes(term) ||
             r.age.toLowerCase().includes(term) ||
             r.id.toLowerCase().includes(term);
    }).slice().reverse();
  }, [responses, dbSearch]);

  const selectedCandidateData = useMemo(() => {
    let candList: Candidate[] = [];
    if (adminCategory === "president") candList = activePollData.presidentScenario.candidates;
    else if (adminCategory === "governor") candList = activePollData.governorScenario.candidates;
    else if (adminCategory === "senate") candList = activePollData.senateScenario.candidates;
    else if (adminCategory === "stateDeputy") candList = activePollData.stateDeputyScenario.candidates;
    else if (adminCategory === "federalDeputy") candList = activePollData.federalDeputyScenario.candidates;

    const cand = candList.find(c => c.id === adminCandidateId);
    if (cand) return cand;
    
    // Fallback to first candidate if current selection doesn't exist (e.g., category changed)
    const first = candList[0];
    if (first) {
      return first;
    }
    return { id: "", name: "Desconhecido", party: "S/P", votes: 0 };
  }, [adminCategory, adminCandidateId, activePollData]);

  const candidateProfile = useMemo(() => {
    if (!selectedCandidateData.id) return null;
    return calculateCandidateProfile(
      filteredResponses,
      selectedCandidateData.id,
      adminCategory,
      selectedCandidateData.name,
      selectedCandidateData.party
    );
  }, [filteredResponses, selectedCandidateData, adminCategory]);

  const getCandidateWhatsAppText = (): string => {
    if (!candidateProfile) return "";
    
    const cycle = getCurrentCycleDates();
    const formattedNeighs = candidateProfile.neighborhoods
      .slice(0, 5)
      .map(n => `  • ${n.neighborhood}: *${n.percentage}%* (${n.count} votos)`)
      .join("\n");
      
    const formattedDistricts = (candidateProfile.districts || [])
      .map(d => `  • ${d.district}: *${d.percentage}%* (${d.count} votos)`)
      .join("\n");

    const formattedEdu = Object.entries(candidateProfile.education || {})
      .map(([k, v]) => `  • ${k}: *${v}%*`)
      .join("\n");
    const formattedInc = Object.entries(candidateProfile.income || {})
      .map(([k, v]) => `  • ${k}: *${v}%*`)
      .join("\n");
    const formattedCol = Object.entries(candidateProfile.color || {})
      .map(([k, v]) => `  • ${k}: *${v}%*`)
      .join("\n");
    const formattedRel = Object.entries(candidateProfile.religion || {})
      .map(([k, v]) => `  • ${k}: *${v}%*`)
      .join("\n");

    return `*👑 LINKON INTELIGÊNCIA - DIAGNÓSTICO INDIVIDUAL*
*Dossiê Consultivo de Pré-Candidatura*

*👤 Candidato:* *${candidateProfile.name}* (${candidateProfile.party})
*📊 Cargo:* ${adminCategory === "president" ? "Presidente" : adminCategory === "governor" ? "Governador" : adminCategory === "senate" ? "Senador" : adminCategory === "stateDeputy" ? "Deputado Estadual" : "Deputado Federal"}
*📅 Amostragem Vigente:* ${cycle.start} a ${cycle.end}

--------------------------------------------

*📈 DESEMPENHO NA BASE ATUAL:*
• *Votos Coletados:* *${candidateProfile.totalVotes}* votos de *${candidateProfile.totalSample}* total
• *Expressividade:* *${candidateProfile.pctOfVoters}%* da amostragem total

--------------------------------------------

*👥 PERFIL DOS SEUS ELEITORES:*

*Gênero:*
• Masculino: *${candidateProfile.gender.masculino}%*
• Feminino: *${candidateProfile.gender.feminino}%*
• Outros: *${candidateProfile.gender.outro}%*

*Faixa Etária:*
• 16-24 anos: *${candidateProfile.age["16-24"]}%*
• 25-34 anos: *${candidateProfile.age["25-34"]}%*
• 35-44 anos: *${candidateProfile.age["35-44"]}%*
• 45-59 anos: *${candidateProfile.age["45-59"]}%*
• 60+ anos: *${candidateProfile.age["60+"]}%*

*Escolaridade:*
${formattedEdu || "  • Não Informado: 100%"}

*Faixa de Renda Familiar:*
${formattedInc || "  • Não Informado: 100%"}

*Cor ou Raça:*
${formattedCol || "  • Não Informado: 100%"}

*Religião:*
${formattedRel || "  • Não Informado: 100%"}

--------------------------------------------

*🏙️ CONCENTRAÇÃO DE VOTOS POR DISTRITO:*
${formattedDistricts || "  (Sem distritos registrados)"}

--------------------------------------------

*📍 PRINCIPAIS BAIRROS DE APOIO (Top 5):*
${formattedNeighs || "  (Sem votos registrados nesta amostragem)"}

--------------------------------------------

*🗣️ ALINHAMENTO DE GESTÃO (Como pensam seus eleitores):*

*Aprov. Pres. Lula:*
• Ótimo/Bom: *${candidateProfile.evaluations.lula.positive}%*
• Regular: *${candidateProfile.evaluations.lula.regular}%*
• Ruim/Péssimo: *${candidateProfile.evaluations.lula.negative}%*

*Aprov. Gov. Ricardo Couto (Estadual):*
• Ótimo/Bom: *${candidateProfile.evaluations.governor.positive}%*
• Regular: *${candidateProfile.evaluations.governor.regular}%*
• Ruim/Péssimo: *${candidateProfile.evaluations.governor.negative}%*

*Aprov. Pref. Hingo Hammes (Municipal):*
• Ótimo/Bom: *${candidateProfile.evaluations.mayor.positive}%*
• Regular: *${candidateProfile.evaluations.mayor.regular}%*
• Ruim/Péssimo: *${candidateProfile.evaluations.mayor.negative}%*

--------------------------------------------
*👉 Plataforma Administrativa Linkon - Sondagem Eleitoral*
*Website Oficial:* grupolinkon.online
`;
  };

  const handleCopyProfileMarkdown = () => {
    const text = getCandidateWhatsAppText();
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopiedProfileText(true);
      showNotification("Dossiê consultivo do candidato copiado para WhatsApp!", "success");
      setTimeout(() => setCopiedProfileText(false), 2500);
    });
  };

  const handleCopyAllNeighborhoods = () => {
    if (!candidateProfile) return;
    const neighListText = candidateProfile.neighborhoods
      .map((n, idx) => `• ${idx + 1}. ${n.neighborhood}: *${n.percentage}%* (${n.count} ${n.count === 1 ? 'voto' : 'votos'})`)
      .join("\n");
    const textToCopy = `*📍 TODOS OS BAIRROS COM VOTO - ${candidateProfile.name} (${candidateProfile.party})*\n\n${neighListText || "Não há votos registrados para nenhum bairro de Petrópolis nesta amostragem."}\n\n*👉 Instituto Linkon - Diagnóstico de Campo*`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedNeighsText(true);
      showNotification("Dados de todos os bairros copiados para o WhatsApp!", "success");
      setTimeout(() => setCopiedNeighsText(false), 2000);
    });
  };

  if (isPrivateMode && !isAdminMode) {
    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center p-6 text-[#e0e2e6] font-sans">
        <div className="relative max-w-lg w-full bg-[#0d0e12] border border-[#202230] rounded-3xl p-8 text-center space-y-6 shadow-2xl overflow-hidden">
          {/* Ambient blur background */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Secure Warning Shield */}
          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center justify-center text-red-500 animate-pulse">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold font-display uppercase tracking-wider text-white">
              Navegação Privada Bloqueada
            </h2>
            <p className="text-xs text-red-400 font-mono font-bold uppercase tracking-widest">
              SISTEMA DE AUDITORIA LINKON
            </p>
          </div>

          <div className="text-sm text-gray-400 leading-relaxed text-justify space-y-3 bg-[#08090c] p-4 rounded-xl border border-[#171822]">
            <p>
              Por questões de <b>integridade estatística, confiabilidade e segurança metodológica</b>, o Instituto Linkon não permite o preenchimento por entrevistados em navegadores no modo anônimo ou de navegação privada.
            </p>
            <p>
              Nosso sistema utiliza criptografia de tokens e identificadores locais por amostragem de 15 dias (via armazenamento seguro local) para impedir duplicidades, auto-registro massivo ou manipulação externa da amostragem eleitoral em Petrópolis.
            </p>
            <p className="text-xs text-gray-500">
              A navegação privada limpa esses dados instantaneamente ao fechar a guia, quebrando qualquer possibilidade de auditoria independente e corrompendo a amostragem justa.
            </p>
          </div>

          <div className="pt-2 text-xs text-gray-400 font-medium">
            💡 <b>Como prosseguir?</b> Abra o link em uma <b>guia convencional (modo normal)</b> no navegador do seu smartphone ou computador para conseguir responder à pesquisa.
          </div>

          <div className="border-t border-[#1a1b26] pt-4 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
            GRUPO LINKON • PETRÓPOLIS, RJ
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#070709] text-[#e0e2e6] font-sans antialiased selection:bg-[#3b82f6] selection:text-white">
      
      {/* Dynamic Popups */}
      <AnimatePresence>
        {notif.message && (
          <motion.div 
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4"
          >
            <div className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 ${
              notif.type === "success" ? "bg-[#0b1c15] text-[#2ebd7d] border-[#133c24]" :
              notif.type === "warning" ? "bg-[#251b0a] text-[#f2b035] border-[#4c3509]" :
              "bg-[#0e1629] text-[#5995ef] border-[#182a4d]"
            }`}>
              <div className="p-1 rounded-full bg-black/30 shrink-0">
                {notif.type === "success" && <CheckCircle2 className="h-5 w-5" />}
                {notif.type === "warning" && <AlertTriangle className="h-5 w-5" />}
                {notif.type === "info" && <Info className="h-5 w-5" />}
              </div>
              <p className="text-xs font-medium leading-normal">{notif.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAdminMode ? (
        !isAdminAuthenticated ? (
          /* BRAND NEW PASSWORD LOCK OVERLAY FOR MAX SECURITY */
          <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center px-4 relative overflow-hidden">
             {/* Glowing visual accent spheres */}
             <div className="absolute -top-40 -left-45 w-96 h-96 bg-[#3b82f6]/5 rounded-full blur-[120px] pointer-events-none" />
             <div className="absolute -bottom-40 -right-45 w-96 h-96 bg-[#ef4444]/5 rounded-full blur-[120px] pointer-events-none" />

             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 15 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               className="w-full max-w-sm bg-[#0d0e14]/90 border border-neutral-800/60 p-8 rounded-3xl space-y-6 shadow-2xl relative backdrop-blur-xl"
             >
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mb-2">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-extrabold text-white tracking-tight uppercase font-display">Acesso Restrito</h2>
                  <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase text-red-500">Instituto Linkon • Painel Analítico</p>
                  <p className="text-[11px] text-gray-400 leading-normal pt-1 px-4">
                    Insira o código de segurança do administrador para prosseguir para o módulo crítico e de simulação de Petrópolis.
                  </p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  // The passcode is "2623", obfuscated to prevent detection from Inspect Element search (MjYyMw==)
                  if (window.btoa(adminPinInput) === "MjYyMw==") {
                    sessionStorage.setItem("linkon_admin_session", "true");
                    setIsAdminAuthenticated(true);
                    setPinError("");
                  } else {
                    setPinError("Código incorreto. Acesso não habilitado.");
                    setAdminPinInput("");
                  }
                }} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block font-sans">Código Credencial</label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="••••"
                        maxLength={8}
                        value={adminPinInput}
                        onChange={(e) => {
                          setAdminPinInput(e.target.value);
                          if (pinError) setPinError("");
                        }}
                        className="w-full px-4.5 py-3 bg-[#07080c] border border-neutral-800 rounded-xl text-center text-white font-mono text-lg tracking-[0.4em] focus:outline-none focus:border-[#3b82f6]/50 focus:ring-1 focus:ring-[#3b82f6]/30 transition-all placeholder-neutral-700 placeholder:tracking-normal placeholder:text-sm"
                        autoFocus
                      />
                      <div className="absolute right-3.5 top-3.5 text-neutral-600">
                        <KeyRound className="h-4 w-4" />
                      </div>
                    </div>
                    {pinError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-red-400 font-mono text-center mt-1"
                      >
                        ⚠️ {pinError}
                      </motion.p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono tracking-wider uppercase rounded-xl shadow-lg shadow-red-600/15 cursor-pointer transition-all"
                  >
                    Desbloquear Painel
                  </button>
                </form>

                <div className="border-t border-[#1a1b24] pt-4 text-center">
                  <button
                    onClick={() => {
                      setIsAdminMode(false);
                      window.location.hash = "";
                      window.location.search = "";
                      window.history.replaceState({}, document.title, "/");
                    }}
                    className="text-gray-500 hover:text-white text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar ao Site Público
                  </button>
                </div>
             </motion.div>
          </div>
        ) : (
          /* SECRET ADMIN INTEL PANEL */
          <div className="min-h-screen bg-[#070709] text-gray-300 pb-24">
          {/* Admin Header */}
          <header className="bg-[#0b0c10]/95 backdrop-blur-xl border-b border-[#1b1c23] sticky top-0 z-40 px-6 py-4">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold font-display tracking-tight text-white uppercase leading-none">
                      Instituto <span className="text-[#3b82f6]">Linkon</span>
                    </h1>
                    <span className="text-[9px] bg-red-500/15 text-red-400 font-semibold border border-red-500/20 px-1.5 py-0.5 rounded uppercase font-mono tracking-wide leading-none">
                      Painel Reservado
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono tracking-tight leading-none mt-1">
                    Diagnóstico Estratégico & Perfil do Eleitorado • Petrópolis-RJ
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUnlockAllDevices}
                  className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                  title="Caso o sistema não libere os entrevistados de responder novamente a pesquisa no início de uma nova rodada, clique aqui para liberar este navegador."
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Liberar Dispositivos
                </button>

                <button
                  onClick={handleClearDatabase}
                  className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar Amostragem
                </button>

                <button
                  onClick={() => {
                    sessionStorage.removeItem("linkon_admin_session");
                    setIsAdminAuthenticated(false);
                    setIsAdminMode(false);
                    setActiveView("interviewee");
                  }}
                  className="px-3.5 py-2 bg-[#1c1e27] hover:bg-[#252834] border border-[#2d303f] text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  Voltar ao site
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            
            {/* Cycle info notice block */}
            <div className="bg-[#0e0f14] border border-[#1e202e] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  ⚙️ Monitoramento Geral de Coleta (Painel Privado)
                </h2>
                <p className="text-xs text-gray-400">
                  Gerenciamento do banco de dados de amostragem e auditoria da amostragem corrente.
                </p>
              </div>
              <div className="flex items-center gap-6 self-start md:self-auto">
                <div className="text-left">
                  <span className="text-[10px] text-gray-500 font-mono block uppercase">Amostragem Ativa</span>
                  <span className="text-xs font-bold font-mono text-[#3b82f6] bg-[#3b82f6]/5 border border-[#3b82f6]/20 px-3 py-1 rounded-lg">
                    {getCurrentCycleDates().start} a {getCurrentCycleDates().end}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-mono block uppercase">Base Acumulada</span>
                  <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-3 py-1 rounded-lg">
                    {responses.length} entrevistados
                  </span>
                </div>
              </div>
            </div>

            {/* Premium Admin Sub-tabs Navigation */}
            <div className="flex border-b border-[#1f212d] pb-2 gap-6 overflow-x-auto scroller-none">
              <button
                id="admin-tab-dossier"
                onClick={() => setAdminSubTab("dossier")}
                className={`py-2 px-1 text-xs uppercase font-extrabold font-mono tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  adminSubTab === "dossier" 
                    ? "border-blue-500 text-blue-400" 
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                📊 Dossiê Analítico
              </button>
              <button
                id="admin-tab-candidates"
                onClick={() => setAdminSubTab("candidates")}
                className={`py-2 px-1 text-xs uppercase font-extrabold font-mono tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  adminSubTab === "candidates" 
                    ? "border-blue-500 text-blue-400" 
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                👥 Gerenciar Candidatos
              </button>
              <button
                id="admin-tab-questions"
                onClick={() => setAdminSubTab("questions")}
                className={`py-2 px-1 text-xs uppercase font-extrabold font-mono tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  adminSubTab === "questions" 
                    ? "border-blue-500 text-blue-400" 
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                📝 Perguntas de Coleta
              </button>
            </div>

            {adminSubTab === "dossier" && (
              <>
                {/* GOOGLE ARCHITECTURE SUGGESTION BOX (GEMINI AI ENGINE) */}
                <div className="bg-gradient-to-br from-[#0e0f14] to-[#0a1122] rounded-2xl border border-blue-500/15 p-6 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl text-blue-400 shrink-0">
                        <Sparkles className="h-5 w-5 animate-pulse" />
                      </div>
                      <div className="text-left space-y-0.5">
                        <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-[#3b82f6]">Módulo Cognitivo Google Gemini</span>
                        <h3 className="text-sm font-bold text-white font-display">Sugestões de Pré-Candidato</h3>
                        <p className="text-xs text-gray-400">Nomes sugeridos livremente pelos eleitores para compor futuras amostragens de opinião pública.</p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[9px] text-gray-500 font-mono block uppercase">Total Acumulado</span>
                      <span className="text-xs font-bold font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                        {responses.filter(r => r.suggestedCandidate?.trim()).length + standaloneSuggestions.filter(s => s.suggestedCandidate?.trim()).length} indicações
                      </span>
                    </div>
                  </div>

                  {loadingSuggestions ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="inline-block h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-mono text-gray-400">Google Gemini está aglutinando, corrigindo grafias e analisando perfis...</p>
                    </div>
                  ) : aiSuggestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiSuggestions.map((candidate, idx) => (
                        <div 
                          key={idx} 
                          className="bg-[#0c0d12] border border-[#1b1c24] hover:border-blue-500/35 transition-all p-4 rounded-xl flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 text-left">
                              <div className="h-7 w-7 rounded-lg bg-[#141829] border border-blue-500/20 flex items-center justify-center font-bold text-xs text-blue-400 font-mono">
                                #{idx + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs font-bold text-white uppercase tracking-tight">{candidate.name}</h4>
                                  {((candidate as any).party || (candidate as any).partido) && (
                                    <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 select-none uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded">
                                      {(candidate as any).party || (candidate as any).partido}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#3b82f6] font-mono font-semibold">Identificado por IA</span>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-extrabold bg-[#1b223c] text-blue-400 border border-[#2b3a6c] px-2 py-0.5 rounded-md">
                              {candidate.count} sug.
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-relaxed text-left border-t border-gray-900/60 pt-2 bg-gradient-to-r from-transparent to-transparent">
                            <span className="text-blue-400 font-mono">💬 Contexto:</span> {candidate.analysis}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#0b0c10]/40 border border-[#1b1c24] p-6 rounded-xl text-center">
                      <p className="text-xs text-gray-500 font-mono">Nenhum pré-candidato sugerido pelos entrevistados nesta amostragem ainda.</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column - Candidate Navigator (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider">
                    Cenários Investigados
                  </h3>
                  
                  {/* Category select tabs */}
                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: "president", label: "👑 Presidente", color: "from-blue-600 to-indigo-700" },
                      { id: "governor", label: "🏰 Governador", color: "from-amber-600 to-orange-700" },
                      { id: "senate", label: "🏛️ Senado", color: "from-purple-600 to-indigo-700" },
                      { id: "stateDeputy", label: "⛰️ Dep. Estadual", color: "from-emerald-600 to-teal-700" },
                      { id: "federalDeputy", label: "✈️ Dep. Federal", color: "from-cyan-600 to-teal-700" }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setAdminCategory(cat.id as any);
                          // select first candidate automatically
                          let firstId = "";
                          const getFirstAlphaId = (candidates: any[]) => {
                            const sorted = [...candidates].sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
                            return sorted[0]?.id || "";
                          };
                          if (cat.id === "president") firstId = getFirstAlphaId(activePollData.presidentScenario.candidates);
                          else if (cat.id === "governor") firstId = getFirstAlphaId(activePollData.governorScenario.candidates);
                          else if (cat.id === "senate") firstId = getFirstAlphaId(activePollData.senateScenario.candidates);
                          else if (cat.id === "stateDeputy") firstId = getFirstAlphaId(activePollData.stateDeputyScenario.candidates);
                          else if (cat.id === "federalDeputy") firstId = getFirstAlphaId(activePollData.federalDeputyScenario.candidates);
                          setAdminCandidateId(firstId);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold border transition-all flex items-center justify-between cursor-pointer ${
                          adminCategory === cat.id
                            ? "bg-[#181a24] border-blue-500 text-white shadow-xl shadow-blue-500/5 font-extrabold"
                            : "bg-[#0e0f14] border-[#1f212a] text-gray-400 hover:border-gray-700 hover:text-white"
                        }`}
                      >
                        <span>{cat.label}</span>
                        {adminCategory === cat.id && (
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Candidate list menu */}
                <div className="bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider">
                      Lista de Opções
                    </h3>
                    <span className="text-[10px] bg-[#1a1b26] text-gray-400 font-mono px-2 py-0.5 rounded-full font-bold">
                      {
                        adminCategory === "president" ? activePollData.presidentScenario.candidates.length :
                        adminCategory === "governor" ? activePollData.governorScenario.candidates.length :
                        adminCategory === "senate" ? activePollData.senateScenario.candidates.length :
                        adminCategory === "stateDeputy" ? activePollData.stateDeputyScenario.candidates.length :
                        activePollData.federalDeputyScenario.candidates.length
                      } pré-cand.
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-96 overflow-y-auto scroll-smooth custom-scrollbar pr-1">
                    {(
                      adminCategory === "president" ? [...activePollData.presidentScenario.candidates].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) :
                      adminCategory === "governor" ? [...activePollData.governorScenario.candidates].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) :
                      adminCategory === "senate" ? [...activePollData.senateScenario.candidates].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) :
                      adminCategory === "stateDeputy" ? [...activePollData.stateDeputyScenario.candidates].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) :
                      [...activePollData.federalDeputyScenario.candidates].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                    ).map((cand) => {
                      const candProfile = calculateCandidateProfile(
                        filteredResponses,
                        cand.id,
                        adminCategory,
                        cand.name,
                        cand.party
                      );
                      const isSelected = adminCandidateId === cand.id;
                      
                      return (
                        <button
                          key={cand.id}
                          onClick={() => setAdminCandidateId(cand.id)}
                          className={`w-full p-3 rounded-xl border transition-all text-left block cursor-pointer ${
                            isSelected 
                              ? "bg-gradient-to-r from-[#171927] to-[#11121d] border-blue-500/50 text-white" 
                              : "bg-[#0c0d14] border-[#1e202c] text-gray-400 hover:border-gray-800 hover:text-white"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className={`font-bold text-xs ${isSelected ? "text-blue-400" : "text-white"}`}>
                                {cand.name}
                              </div>
                              <div className="text-[10px] font-mono text-gray-500 mt-0.5 font-bold uppercase">
                                {cand.party} • {
                                  adminCategory === "president" ? "Federal" :
                                  adminCategory === "governor" ? "Estadual" :
                                  adminCategory === "senate" ? "Senado" :
                                  adminCategory === "stateDeputy" ? "ALERJ" : "Câmara"
                                }
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-mono font-bold text-white">
                                {candProfile.totalVotes} vo.
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono">
                                {candProfile.pctOfVoters}% base
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column - Demographic File (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {candidateProfile ? (
                  <div className="bg-[#0e0f14] border border-[#1f212a] rounded-3xl p-6 md:p-8 space-y-8">
                    
                    {/* Header candidate banner card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1b1d2c] pb-6 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono tracking-widest font-bold uppercase px-2 py-0.5 rounded leading-none">
                            {adminCategory === "president" && "PRESIDENTE"}
                            {adminCategory === "governor" && "GOVERNADOR"}
                            {adminCategory === "senate" && "SENADO"}
                            {adminCategory === "stateDeputy" && "DEP. ESTADUAL (ALERJ)"}
                            {adminCategory === "federalDeputy" && "DEP. FEDERAL (CONGRESSO)"}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold bg-[#133c24]/30 border border-[#133c24] px-2 py-0.5 rounded leading-none">
                            Dossiê Segmentado
                          </span>
                        </div>
                        <h2 className="text-2xl font-black font-display text-white">
                          {candidateProfile.name}
                        </h2>
                        <p className="text-xs font-semibold font-mono text-gray-400 uppercase">
                          Partido: <span className="text-white font-bold">{candidateProfile.party}</span> | Reduto Regional: Petrópolis, RJ
                        </p>
                      </div>

                      <button
                        onClick={handleCopyProfileMarkdown}
                        className="px-4 py-2.5 bg-[#3b82f6] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#3b82f6]/10 shrink-0 self-start sm:self-center transition-all"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedProfileText ? "Dossiê Copiado!" : "Copiar Dossiê WhatsApp"}
                      </button>
                    </div>

                    {/* Inner Tabs for Candidate Section */}
                    <div className="flex bg-[#0b0c10] p-1 rounded-xl border border-[#1f212d] gap-1 max-w-xs shrink-0">
                      <button
                        onClick={() => setCandidateProfileTab("stats")}
                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                          candidateProfileTab === "stats"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        📊 Indicadores
                      </button>
                      <button
                        onClick={() => setCandidateProfileTab("whatsapp")}
                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                          candidateProfileTab === "whatsapp"
                            ? "bg-[#25d366] text-white shadow-md shadow-[#25d366]/10"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        💬 Cópia WhatsApp
                      </button>
                    </div>

                    {candidateProfileTab === "whatsapp" ? (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Boletim Compacto para Grupos</h3>
                            <p className="text-[11px] text-gray-400">Texto formatado pronto para copiar e publicar em transmissões de WhatsApp.</p>
                          </div>
                          <button
                            onClick={handleCopyProfileMarkdown}
                            className="px-4 py-2 bg-[#25d366] hover:bg-[#1ebd5d] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#25d366]/15 transition-all self-start sm:self-center"
                          >
                            {copiedProfileText ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copiedProfileText ? "Dossiê Copiado!" : "Copiar Dossiê WhatsApp"}
                          </button>
                        </div>
                        <textarea
                          readOnly
                          value={getCandidateWhatsAppText()}
                          className="w-full h-96 bg-[#070709] border border-[#1b1c26] rounded-2xl p-4 font-mono text-[10px] text-emerald-400 leading-relaxed focus:outline-none custom-scrollbar"
                        />
                      </div>
                    ) : candidateProfile.totalVotes === 0 ? (
                      <div className="py-24 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto text-yellow-500 animate-pulse">
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-base font-black text-white">Base de Amostragem Vazia</h4>
                          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                            Nenhum eleitor real do cadastro indicou voto estimulado em <span className="text-white">{candidateProfile.name}</span> nesta amostragem de {getCurrentCycleDates().start} a {getCurrentCycleDates().end}.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-fadeIn">
                        
                        {/* Summary metric cubes */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-[#0b0c10] border border-[#1e202a] rounded-2xl p-4 text-center space-y-1 shadow-lg">
                            <span className="text-[9px] text-gray-500 font-mono uppercase font-bold tracking-wider block">ELEITORES MAPEADOS</span>
                            <span className="text-2xl font-black text-white font-mono leading-none block">{candidateProfile.totalVotes}</span>
                            <span className="text-[10px] text-gray-400 font-mono">entrevistados individuais</span>
                          </div>
                          <div className="bg-[#0b0c10] border border-[#1e202a] rounded-2xl p-4 text-center space-y-1 shadow-lg">
                            <span className="text-[9px] text-gray-500 font-mono uppercase font-bold tracking-wider block">REPRESENTATIVIDADE DA BASE</span>
                            <span className="text-2xl font-black text-blue-400 font-mono leading-none block">{candidateProfile.pctOfVoters}%</span>
                            <span className="text-[10px] text-gray-400 font-mono">da amostragem total</span>
                          </div>
                          <div className="bg-[#0b0c10] border border-[#1e202a] rounded-2xl p-4 text-center space-y-1 shadow-lg">
                            <span className="text-[9px] text-gray-500 font-mono uppercase font-bold tracking-wider block">CONFIANÇA MATEMÁTICA</span>
                            <span className="text-2xl font-black text-emerald-400 font-mono leading-none block">95%</span>
                            <span className="text-[10px] text-gray-400 font-mono">Fórmula Analítica Linkon</span>
                          </div>
                        </div>

                        {/* Breakdown 1: Demographics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* GENDERS BLOCKS */}
                          <div className="bg-[#070709] border border-[#181a25] rounded-2xl p-5 space-y-4">
                            <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest border-b border-[#181a25] pb-2">
                              👥 COMPOSIÇÃO DE GÊNERO
                            </h3>
                            <div className="space-y-3 pt-1">
                              <div>
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                  <span className="text-gray-400">Mulheres (Feminino)</span>
                                  <span className="text-white font-mono font-bold">{candidateProfile.gender.feminino}%</span>
                                </div>
                                <div className="w-full bg-[#161720] h-2.5 rounded-full overflow-hidden">
                                  <div className="bg-pink-500 h-full rounded-full" style={{ width: `${candidateProfile.gender.feminino}%` }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                  <span className="text-gray-400">Homens (Masculino)</span>
                                  <span className="text-white font-mono font-bold">{candidateProfile.gender.masculino}%</span>
                                </div>
                                <div className="w-full bg-[#161720] h-2.5 rounded-full overflow-hidden">
                                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${candidateProfile.gender.masculino}%` }} />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                  <span className="text-gray-400">Outros</span>
                                  <span className="text-white font-mono font-bold">{candidateProfile.gender.outro}%</span>
                                </div>
                                <div className="w-full bg-[#161720] h-2.5 rounded-full overflow-hidden">
                                  <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${candidateProfile.gender.outro}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* AGE BLOCKS */}
                          <div className="bg-[#070709] border border-[#181a25] rounded-2xl p-5 space-y-4">
                            <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest border-b border-[#181a25] pb-2">
                              🎂 SEGMENTAÇÃO POR IDADE
                            </h3>
                            <div className="space-y-2.5 pt-1">
                              {[
                                { label: "16 a 24 anos", val: candidateProfile.age["16-24"], color: "bg-teal-500" },
                                { label: "25 a 34 anos", val: candidateProfile.age["25-34"], color: "bg-cyan-500" },
                                { label: "35 a 44 anos", val: candidateProfile.age["35-44"], color: "bg-blue-500" },
                                { label: "45 a 59 anos", val: candidateProfile.age["45-59"], color: "bg-indigo-500" },
                                { label: "60 anos ou mais", val: candidateProfile.age["60+"], color: "bg-purple-500" }
                              ].map((ageItem, aid) => (
                                <div key={aid}>
                                  <div className="flex justify-between text-[11px] font-semibold mb-0.5">
                                    <span className="text-gray-400">{ageItem.label}</span>
                                    <span className="text-white font-mono font-bold">{ageItem.val}%</span>
                                  </div>
                                  <div className="w-full bg-[#161720] h-1.5 rounded-full overflow-hidden">
                                    <div className={`${ageItem.color} h-full rounded-full`} style={{ width: `${ageItem.val}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>

                        {/* Breakdown 1.5: Advanced Demographics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* EDUCATION BLOCKS */}
                          <div className="bg-[#070709] border border-[#181a25] rounded-2xl p-5 space-y-4">
                            <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest border-b border-[#181a25] pb-2">
                              🎓 ESCOLARIDADE DOS ELEITORES
                            </h3>
                            <div className="space-y-3 pt-1">
                              {!candidateProfile.education || Object.entries(candidateProfile.education).length === 0 ? (
                                <p className="text-xs text-gray-500 italic">Sem dados registrados</p>
                              ) : (
                                Object.entries(candidateProfile.education)
                                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                                  .map(([label, val], idx) => {
                                    const colors = ["bg-emerald-500", "bg-teal-500", "bg-cyan-500"];
                                    const color = colors[idx % colors.length];
                                    return (
                                      <div key={label}>
                                        <div className="flex justify-between text-xs font-semibold mb-1">
                                          <span className="text-gray-400 truncate max-w-[80%]" title={label}>{label}</span>
                                          <span className="text-white font-mono font-bold">{val}%</span>
                                        </div>
                                        <div className="w-full bg-[#161720] h-2.5 rounded-full overflow-hidden">
                                          <div className={`${color} h-full rounded-full`} style={{ width: `${val}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          </div>

                          {/* INCOME BLOCKS */}
                          <div className="bg-[#070709] border border-[#181a25] rounded-2xl p-5 space-y-4">
                            <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest border-b border-[#181a25] pb-2">
                              💰 FAIXA DE RENDA FAMILIAR
                            </h3>
                            <div className="space-y-3 pt-1">
                              {!candidateProfile.income || Object.entries(candidateProfile.income).length === 0 ? (
                                <p className="text-xs text-gray-500 italic">Sem dados registrados</p>
                              ) : (
                                Object.entries(candidateProfile.income)
                                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                                  .map(([label, val], idx) => {
                                    const colors = ["bg-amber-500", "bg-yellow-500", "bg-orange-500"];
                                    const color = colors[idx % colors.length];
                                    return (
                                      <div key={label}>
                                        <div className="flex justify-between text-xs font-semibold mb-1">
                                          <span className="text-gray-400 truncate max-w-[80%]" title={label}>{label}</span>
                                          <span className="text-white font-mono font-bold">{val}%</span>
                                        </div>
                                        <div className="w-full bg-[#161720] h-2.5 rounded-full overflow-hidden">
                                          <div className={`${color} h-full rounded-full`} style={{ width: `${val}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          </div>

                          {/* COLOR / RACE BLOCKS */}
                          <div className="bg-[#070709] border border-[#181a25] rounded-2xl p-5 space-y-4">
                            <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest border-b border-[#181a25] pb-2">
                              🎨 DECLARAÇÃO DE COR OU RAÇA
                            </h3>
                            <div className="space-y-3 pt-1">
                              {!candidateProfile.color || Object.entries(candidateProfile.color).length === 0 ? (
                                <p className="text-xs text-gray-500 italic">Sem dados registrados</p>
                              ) : (
                                                                Object.entries(candidateProfile.color)
                                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                                  .map(([label, val], idx) => {
                                    const colors = ["bg-purple-500", "bg-fuchsia-500", "bg-pink-500", "bg-violet-500", "bg-rose-500"];
                                    const color = colors[idx % colors.length];
                                    return (
                                      <div key={label}>
                                        <div className="flex justify-between text-xs font-semibold mb-1">
                                          <span className="text-gray-400 truncate max-w-[80%]" title={label}>{label}</span>
                                          <span className="text-white font-mono font-bold">{val}%</span>
                                        </div>
                                        <div className="w-full bg-[#161720] h-2.5 rounded-full overflow-hidden">
                                          <div className={`${color} h-full rounded-full`} style={{ width: `${val}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          </div>

                          {/* RELIGION BLOCKS */}
                          <div className="bg-[#070709] border border-[#181a25] rounded-2xl p-5 space-y-4">
                            <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest border-b border-[#181a25] pb-2">
                              ⛪ CREDO OU RELIGIÃO DO ELEITORADO
                            </h3>
                            <div className="space-y-3 pt-1">
                              {!candidateProfile.religion || Object.entries(candidateProfile.religion).length === 0 ? (
                                <p className="text-xs text-gray-500 italic">Sem dados registrados</p>
                              ) : (
                                Object.entries(candidateProfile.religion)
                                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                                  .map(([label, val], idx) => {
                                    const colors = ["bg-sky-500", "bg-blue-500", "bg-indigo-500", "bg-blue-600"];
                                    const color = colors[idx % colors.length];
                                    return (
                                      <div key={label}>
                                        <div className="flex justify-between text-xs font-semibold mb-1">
                                          <span className="text-gray-400 truncate max-w-[80%]" title={label}>{label}</span>
                                          <span className="text-white font-mono font-bold">{val}%</span>
                                        </div>
                                        <div className="w-full bg-[#161720] h-2.5 rounded-full overflow-hidden">
                                          <div className={`${color} h-full rounded-full`} style={{ width: `${val}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Breakdown 2A: Districts concentration list */}
                        <div className="bg-[#070709] border border-[#181a25] rounded-2xl p-5 space-y-4">
                          <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest border-b border-[#181a25] pb-2">
                            🏙️ CONCENTRAÇÃO DE VOTOS POR DISTRITO DO CANDIDATO
                          </h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {!candidateProfile.districts || candidateProfile.districts.length === 0 ? (
                              <p className="text-xs text-gray-500 italic p-2 col-span-2">Sem distritos mapeados.</p>
                            ) : (
                              candidateProfile.districts.map((d, idx) => (
                                <div 
                                  key={idx} 
                                  className="bg-[#0d0e14] border border-[#1e202e] p-3.5 rounded-xl flex items-center justify-between transition-all hover:bg-[#13151f]"
                                >
                                  <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-white block">
                                      {idx + 1}. {d.district}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono uppercase font-semibold">
                                      {d.count} {d.count === 1 ? 'voto' : 'votos'}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-mono font-extrabold text-indigo-400 block">
                                      {d.percentage}%
                                    </span>
                                    <span className="text-[9px] text-gray-500 block uppercase font-bold">
                                      do candidato
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Breakdown 2B: Districts / Neighborhoods list */}
                        <div className="bg-[#070709] border border-[#181a25] rounded-2xl p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#181a25] pb-3">
                            <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest">
                              📍 TODOS OS BAIRROS COM VOTOS NO CANDIDATO
                            </h3>
                            <button
                              type="button"
                              onClick={handleCopyAllNeighborhoods}
                              className="px-3 py-1.5 bg-[#14151b] hover:bg-[#1a1b24] border border-[#1f212a] text-[11px] font-bold text-blue-400 hover:text-white rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
                            >
                              {copiedNeighsText ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  Copiar todos os bairros
                                </>
                              )}
                            </button>
                          </div>

                          {/* Search Input for Neighborhoods */}
                          <div className="relative">
                            <input
                              type="text"
                              value={neighborhoodSearch}
                              onChange={(e) => setNeighborhoodSearch(e.target.value)}
                              placeholder="Pesquisar bairro do candidato..."
                              className="w-full bg-[#0d0e14]/90 border border-[#1e202e] text-white placeholder-gray-500 text-xs py-2 pr-12 pl-9 rounded-xl focus:border-[#3b82f6] focus:outline-none transition-colors"
                            />
                            <Search className="h-3.5 w-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            {neighborhoodSearch && (
                              <button
                                onClick={() => setNeighborhoodSearch("")}
                                className="text-gray-400 hover:text-white text-[10px] uppercase font-mono absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {candidateProfile.neighborhoods.length === 0 ? (
                              <p className="text-xs text-gray-500 italic p-2 col-span-2">Sem votos mapeados.</p>
                            ) : (candidateProfile.neighborhoods || []).filter(n => 
                              n.neighborhood.toLowerCase().includes(neighborhoodSearch.toLowerCase())
                            ).length === 0 ? (
                              <p className="text-xs text-gray-500 italic p-2 col-span-2">Nenhum bairro compatível com a pesquisa.</p>
                            ) : (
                              (candidateProfile.neighborhoods || [])
                                .filter(n => n.neighborhood.toLowerCase().includes(neighborhoodSearch.toLowerCase()))
                                .map((n, idx) => (
                                  <div 
                                    key={idx} 
                                    className="bg-[#0d0e14] border border-[#1e202e] p-3.5 rounded-xl flex items-center justify-between transition-all hover:bg-[#13151f]"
                                  >
                                    <div className="space-y-0.5">
                                      <span className="text-xs font-bold text-white block">
                                        {n.neighborhood}
                                      </span>
                                      <span className="text-[10px] text-gray-500 font-mono uppercase font-semibold">
                                        {n.count} {n.count === 1 ? 'voto' : 'votos'}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-mono font-extrabold text-blue-400 block">
                                        {n.percentage}%
                                      </span>
                                      <span className="text-[9px] text-gray-500 block uppercase font-bold">
                                        do candidato
                                      </span>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                        {/* Breakdown 3: Cross evaluations (Lula, Gov, Mayor) */}
                        <div className="bg-[#070709] border border-[#181a25] rounded-2xl p-5 space-y-4">
                          <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest border-b border-[#181a25] pb-2">
                            🗣️ ALINHAMENTO POLÍTICO & ATUAIS GOVERNANTES
                          </h3>
                          <p className="text-[11px] text-gray-500 leading-normal -mt-2">
                            Como pensam os apoiadores de <span className="text-white font-semibold">{candidateProfile.name}</span>? Nível de aprovação dos atuais mandatários:
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            {/* Lula */}
                            <div className="bg-[#0d0e14] border border-[#1d1e2a] rounded-xl p-4 space-y-3.5">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-gray-500 block font-mono uppercase font-bold">GOVERNO FEDERAL</span>
                                <span className="text-xs font-extrabold text-white">Pres. Lula (PT)</span>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-emerald-400 font-medium">Aprova (Bom/Ótimo)</span>
                                    <span className="text-white font-mono">{candidateProfile.evaluations.lula.positive}%</span>
                                  </div>
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${candidateProfile.evaluations.lula.positive}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-gray-400 font-medium">Regular</span>
                                    <span className="text-white font-mono">{candidateProfile.evaluations.lula.regular}%</span>
                                  </div>
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-gray-500 h-full rounded-full" style={{ width: `${candidateProfile.evaluations.lula.regular}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-red-400 font-medium font-medium">Invalida (Ruim/Péss)</span>
                                    <span className="text-white font-mono">{candidateProfile.evaluations.lula.negative}%</span>
                                  </div>
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-red-500 h-full rounded-full" style={{ width: `${candidateProfile.evaluations.lula.negative}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Claudo */}
                            <div className="bg-[#0d0e14] border border-[#1d1e2a] rounded-xl p-4 space-y-3.5">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-gray-500 block font-mono uppercase font-bold">GOVERNO ESTADUAL</span>
                                <span className="text-xs font-extrabold text-white">Ricardo Couto (sem partido)</span>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-emerald-400 font-medium">Aprova (Bom/Ótimo)</span>
                                    <span className="text-white font-mono">{candidateProfile.evaluations.governor.positive}%</span>
                                  </div>
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${candidateProfile.evaluations.governor.positive}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-gray-400 font-medium">Regular</span>
                                    <span className="text-white font-mono">{candidateProfile.evaluations.governor.regular}%</span>
                                  </div>
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-gray-500 h-full rounded-full" style={{ width: `${candidateProfile.evaluations.governor.regular}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-red-400 font-medium">Invalida (Ruim/Péss)</span>
                                    <span className="text-white font-mono">{candidateProfile.evaluations.governor.negative}%</span>
                                  </div>
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-red-500 h-full rounded-full" style={{ width: `${candidateProfile.evaluations.governor.negative}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Hingo */}
                            <div className="bg-[#0d0e14] border border-[#1d1e2a] rounded-xl p-4 space-y-3.5">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-gray-500 block font-mono uppercase font-bold">PREFEITURA</span>
                                <span className="text-xs font-extrabold text-white">Hingo Hammes (Pref.)</span>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-emerald-400 font-medium">Aprova (Bom/Ótimo)</span>
                                    <span className="text-white font-mono">{candidateProfile.evaluations.mayor.positive}%</span>
                                  </div>
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${candidateProfile.evaluations.mayor.positive}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-gray-400 font-medium">Regular</span>
                                    <span className="text-white font-mono">{candidateProfile.evaluations.mayor.regular}%</span>
                                  </div>
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-gray-500 h-full rounded-full" style={{ width: `${candidateProfile.evaluations.mayor.regular}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-red-400 font-medium">Invalida (Ruim/Péss)</span>
                                    <span className="text-white font-mono">{candidateProfile.evaluations.mayor.negative}%</span>
                                  </div>
                                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-red-500 h-full rounded-full" style={{ width: `${candidateProfile.evaluations.mayor.negative}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                ) : (
                  <div className="bg-[#0e0f14] border border-[#1f212a] rounded-3xl p-12 text-center text-gray-500 font-mono text-xs">
                    Nenhum candidato carregado.
                  </div>
                )}

              </div>

            </div>

            {/* Premium Control Board: Candidate Evolution Trends */}
            <div className="border-t border-[#1b1c23] pt-8 space-y-6">
              <div className="text-left space-y-1">
                <span className="text-[9px] text-[#3b82f6] font-mono uppercase font-bold tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  Módulo de Controle Exclusivo
                </span>
                <h3 className="text-lg font-black text-white">Análise de Tendência de Pré-Candidaturas</h3>
                <p className="text-xs text-gray-500">
                  Histórico quinzenal retroativo completo, tabelas de delta e relatórios copiáveis exclusivos para WhatsApp.
                </p>
              </div>
              <EvolutionTab isAdmin={true} responses={responses} />
            </div>

            {/* Demographics Profile - Admin Only */}
            <div className="border-t border-[#1b1c23] pt-8 space-y-6">
              <div className="text-left space-y-1">
                <span className="text-[9px] text-[#3b82f6] font-mono uppercase font-bold tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  Dossiê Analítico de Demografia
                </span>
                <h3 className="text-lg font-black text-white">Perfil Demográfico Amostral Completo</h3>
                <p className="text-xs text-gray-500">
                  Distribuição detalhada por gênero, faixas etárias e bairros nos dados consolidados do Instituto Linkon.
                </p>
              </div>

              <div className="bg-[#0e0f14] rounded-2xl border border-[#1f212a] p-6 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  {/* Gender Chart Block */}
                  <div className="bg-[#14151b]/40 border border-[#1f212a] p-5 rounded-xl space-y-4 flex flex-col items-center">
                    <span className="text-xs font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Eleitores por Gênero</span>
                    
                    <div className="h-44 w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={demographicStats.gender}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {demographicStats.gender.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
                        <span className="text-2xl font-bold font-mono text-white">{responses.length}</span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono font-bold">Fichas</span>
                      </div>
                    </div>

                    <div className="w-full space-y-2 text-xs">
                      {demographicStats.gender.map((item) => (
                        <div key={item.name} className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-mono font-bold text-white">{item.value} ({(responses.length > 0 ? (item.value / responses.length) * 100 : 0).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Age Chart Block */}
                  <div className="bg-[#14151b]/40 border border-[#1f212a] p-5 rounded-xl space-y-4 flex flex-col items-center">
                    <span className="text-xs font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Faixas Etárias</span>
                    
                    <div className="h-44 w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={demographicStats.age}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {demographicStats.age.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                        <span className="text-xl font-bold font-mono text-blue-400">95%</span>
                        <span className="text-[9px] text-gray-500 uppercase font-mono tracking-widest font-semibold">Grau Confiança</span>
                      </div>
                    </div>

                    <div className="w-full space-y-2 text-xs">
                      {demographicStats.age.map((item) => (
                        <div key={item.name} className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-mono font-bold text-white">{item.value} ({(responses.length > 0 ? (item.value / responses.length) * 100 : 0).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* District Top Neighborhoods */}
                  <div className="bg-[#14151b]/40 border border-[#1f212a] p-5 rounded-xl space-y-4 flex flex-col items-center">
                    <span className="text-xs font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Topografia de Distritos</span>
                    
                    <div className="h-44 w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={demographicStats.neighborhood}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {demographicStats.neighborhood.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                        <span className="text-lg font-bold font-mono text-[#3b82f6]">LINKON</span>
                        <span className="text-[8px] text-gray-400 uppercase font-mono tracking-widest font-semibold">Sondagem</span>
                      </div>
                    </div>

                    <div className="w-full space-y-2 text-xs">
                      {demographicStats.neighborhood.slice(0, 4).map((item) => (
                        <div key={item.name} className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-mono font-bold text-white">{item.value} ({(responses.length > 0 ? (item.value / responses.length) * 100 : 0).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
              </>
            )}

            {/* CANDIDATES SUB-TAB VIEW */}
            {adminSubTab === "candidates" && (
              <div className="bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold font-mono text-white uppercase tracking-wider">
                    👥 Central de Candidatos & Partidos
                  </h3>
                  <p className="text-xs text-gray-400">
                    Adicione, edite ou remova candidatos de qualquer um dos 8 cenários de pesquisa mapeados. Tudo sincronizado dinamicamente.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Category Selection Left Panel */}
                  <div className="md:col-span-3 space-y-2">
                    {[
                      { id: "president", label: "👑 Presidente" },
                      { id: "presidentRunoff", label: "⚔️ Pres. Turno Fim" },
                      { id: "governor", label: "🏰 Governador" },
                      { id: "governorRunoff", label: "⚔️ Gov. Turno Fim" },
                      { id: "senate", label: "🏛️ Senado" },
                      { id: "stateDeputy", label: "⛰️ Dep. Estadual" },
                      { id: "federalDeputy", label: "✈️ Dep. Federal" },
                      { id: "mayor", label: "🏙️ Prefeito" }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        id={`cands-cat-${cat.id}`}
                        onClick={() => {
                          setEditCandCategory(cat.id as any);
                          setEditCandId(null);
                        }}
                        className={`w-full text-left py-2.5 px-3.5 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all border flex items-center justify-between cursor-pointer ${
                          editCandCategory === cat.id
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400 font-extrabold"
                            : "bg-[#14151b]/60 border-[#1f212a] text-gray-400 hover:text-white"
                        }`}
                      >
                        {cat.label}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    ))}
                  </div>

                  {/* Candidates Right Panel */}
                  <div className="md:col-span-9 space-y-6">
                    {/* Add Candidate Form */}
                    <div id="add-candidate-form" className="bg-[#12131a] border border-[#1f212a] p-4 rounded-xl space-y-3">
                      <span className="text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase block">
                        ➕ Adicionar Pré-Candidato no cenário ativo
                      </span>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          id="cand-name-input"
                          type="text"
                          placeholder="Nome Completo / Urna"
                          value={newCandName}
                          onChange={(e) => setNewCandName(e.target.value)}
                          className="flex-1 bg-[#0b0c10] border border-[#1f212a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                        />
                        <input
                          id="cand-party-input"
                          type="text"
                          placeholder="Partido (Ex: PL, PT, PSD)"
                          value={newCandParty}
                          onChange={(e) => setNewCandParty(e.target.value)}
                          className="w-full sm:w-44 bg-[#0b0c10] border border-[#1f212a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                        />
                        <button
                          id="cand-add-submit"
                          onClick={() => {
                            if (!newCandName.trim()) {
                              showNotification("Digite o nome do candidato.", "warning");
                              return;
                            }
                            const list = getActiveCandidates(editCandCategory);
                            const slug = newCandName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
                            const newCand: Candidate = {
                              id: `custom-${slug}-${Date.now()}`,
                              name: newCandName.trim(),
                              party: newCandParty.trim() || "S/P",
                              votes: 0
                            };
                            const updated = [...list, newCand];
                            handleSaveActiveCandidates(editCandCategory, updated);
                            setNewCandName("");
                            setNewCandParty("");
                            setCandidateUpdateTrigger(prev => prev + 1);
                            showNotification("Candidato adicionado com sucesso!", "success");
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    {/* Active Candidates List */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-[#3b82f6] font-mono font-bold tracking-wider uppercase block">
                        Visualização de Candidatos Estimulados ({getActiveCandidates(editCandCategory).length})
                      </span>
                      <div className="divide-y divide-[#1f212a] bg-[#14151b]/40 border border-[#1f212a] rounded-xl overflow-hidden">
                        {[...getActiveCandidates(editCandCategory)].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((cand) => (
                          <div
                            key={cand.id}
                            id={`cand-row-${cand.id}`}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111218]/40 hover:bg-[#14151a]"
                          >
                            {editCandId === cand.id ? (
                              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                <input
                                  id={`cand-edit-name-${cand.id}`}
                                  type="text"
                                  value={editCandName}
                                  onChange={(e) => setEditCandName(e.target.value)}
                                  className="flex-1 bg-[#0b0c10] border border-[#3b82f6] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                />
                                <input
                                  id={`cand-edit-party-${cand.id}`}
                                  type="text"
                                  value={editCandParty}
                                  onChange={(e) => setEditCandParty(e.target.value)}
                                  className="w-24 bg-[#0b0c10] border border-[#3b82f6] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                />
                                <div className="flex gap-1">
                                  <button
                                    id={`cand-save-${cand.id}`}
                                    onClick={() => {
                                      if (!editCandName.trim()) return;
                                      const list = getActiveCandidates(editCandCategory);
                                      const updated = list.map(c => c.id === cand.id ? { ...c, name: editCandName.trim(), party: editCandParty.trim() || c.party } : c);
                                      handleSaveActiveCandidates(editCandCategory, updated);
                                      setEditCandId(null);
                                      setCandidateUpdateTrigger(prev => prev + 1);
                                      showNotification("Alterações salvas!", "success");
                                    }}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold font-mono uppercase tracking-wider rounded-md transition-colors"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    id={`cand-cancel-${cand.id}`}
                                    onClick={() => setEditCandId(null)}
                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-[10px] font-bold font-mono uppercase tracking-wider rounded-md transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-3">
                                  {/* Circular Candidate Photo Frame */}
                                  <div className="relative group shrink-0">
                                    {(cand as any).photo ? (
                                      <img
                                        src={(cand as any).photo}
                                        alt={cand.name}
                                        className="w-11 h-11 rounded-full object-cover border-2 border-blue-500/30 shadow-lg"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-11 h-11 rounded-full bg-[#181a25] border-2 border-[#222435] flex items-center justify-center text-xs font-mono font-black text-gray-400">
                                        {cand.name.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    {/* Upload Button overlay on hover or small click icon */}
                                    <label className="absolute inset-0 bg-black/65 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                      <span className="text-[8px] text-white font-mono font-bold uppercase tracking-tighter text-center px-1">Foto</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = async (uploadEvent) => {
                                              const base64 = uploadEvent.target?.result as string;
                                              const optimized = await optimizeBase64Image(base64, 96, 96);
                                              const list = getActiveCandidates(editCandCategory);
                                              const updated = list.map(c => c.id === cand.id ? { ...c, photo: optimized } : c);
                                              handleSaveActiveCandidates(editCandCategory, updated);
                                              setCandidateUpdateTrigger(prev => prev + 1);
                                              showNotification(`Foto de ${cand.name} atualizada!`, "success");
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                  
                                  <div className="space-y-0.5 text-left">
                                    <span className="text-xs font-bold text-white block leading-tight">{cand.name}</span>
                                    <span className="text-[10px] text-gray-505 font-mono text-gray-500 block leading-none">Partido: {cand.party || "S/P"}</span>
                                    <label className="text-[9px] text-[#3b82f6] hover:underline cursor-pointer block font-mono mt-1">
                                      Alterar Foto…
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = async (uploadEvent) => {
                                              const base64 = uploadEvent.target?.result as string;
                                              const optimized = await optimizeBase64Image(base64, 96, 96);
                                              const list = getActiveCandidates(editCandCategory);
                                              const updated = list.map(c => c.id === cand.id ? { ...c, photo: optimized } : c);
                                              handleSaveActiveCandidates(editCandCategory, updated);
                                              setCandidateUpdateTrigger(prev => prev + 1);
                                              showNotification(`Foto de ${cand.name} atualizada!`, "success");
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    id={`cand-action-edit-${cand.id}`}
                                    onClick={() => {
                                      setEditCandId(cand.id);
                                      setEditCandName(cand.name);
                                      setEditCandParty(cand.party);
                                    }}
                                    className="px-2.5 py-1.5 bg-[#1f212a] hover:bg-[#2c2f3b] text-white text-[10px] font-bold font-mono rounded cursor-pointer transition-colors"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    id={`cand-action-del-${cand.id}`}
                                    onClick={() => {
                                      setDeleteCandidateTarget({ id: cand.id, name: cand.name, category: editCandCategory });
                                    }}
                                    className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-bold font-mono rounded cursor-pointer transition-colors"
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* QUESTIONS SUB-TAB VIEW */}
            {adminSubTab === "questions" && (
              <div className="bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold font-mono text-white uppercase tracking-wider">
                    📝 Perguntas de Coleta & Segmentos Survey
                  </h3>
                  <p className="text-xs text-gray-400">
                    Defina quais perguntas estimuladas serão exibidas progressivamente para o eleitorado no formulário público.
                  </p>
                </div>

                {/* Create Question Form */}
                <div id="add-question-form" className="bg-[#12131a] border border-[#1f212a] p-5 rounded-xl space-y-4">
                  <span className="text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase block">
                    ➕ Criar Nova Pergunta de Coleta
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-mono font-bold uppercase block">Chave de Resposta (Key)</label>
                      <input
                        id="new-quest-key"
                        type="text"
                        placeholder="Ex: voteCustomPres"
                        value={newQuestKey}
                        onChange={(e) => setNewQuestKey(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-[#1f212a] p-2 rounded-lg text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-mono font-bold uppercase block font-sans">Cenário Associado de Candidatos</label>
                      <select
                        id="new-quest-cat"
                        value={newQuestCategory}
                        onChange={(e) => setNewQuestCategory(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-[#1f212a] p-2 rounded-lg text-xs text-white focus:outline-none"
                      >
                        <option value="president">Presidente</option>
                        <option value="presidentRunoff">Presidente Simulado Segundo Turno</option>
                        <option value="governor">Governador</option>
                        <option value="governorRunoff">Governador Simulado Segundo Turno</option>
                        <option value="senate">Senado (Múltipla Escolha)</option>
                        <option value="stateDeputy">Deputado Estadual</option>
                        <option value="federalDeputy">Deputado Federal</option>
                        <option value="mayor">Prefeito de Petrópolis</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono font-bold uppercase block font-sans">Título da Pergunta</label>
                    <input
                      id="new-quest-title"
                      type="text"
                      placeholder="Ex: Se as eleições fossem hoje, em quem votaria..."
                      value={newQuestTitle}
                      onChange={(e) => setNewQuestTitle(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-[#1f212a] p-2 rounded-lg text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono font-bold uppercase block font-sans">Subtítulo Explicativo</label>
                    <input
                      id="new-quest-subtitle"
                      type="text"
                      placeholder="Ex: Escolha um candidato estimulado..."
                      value={newQuestSubtitle}
                      onChange={(e) => setNewQuestSubtitle(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-[#1f212a] p-2 rounded-lg text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <button
                    id="quest-add-submit"
                    onClick={() => {
                      if (!newQuestKey.trim() || !newQuestTitle.trim()) {
                        showNotification("Chave e Título são obrigatórios.", "warning");
                        return;
                      }
                      const activeList = getActiveQuestions();
                      const doubleKey = activeList.find(q => q.key === newQuestKey.trim());
                      if (doubleKey) {
                        showNotification("Essa chave de resposta já existe.", "warning");
                        return;
                      }
                      const newQuestionItem: QuestionConfig = {
                        stepIndex: activeList.length + 3,
                        key: newQuestKey.trim(),
                        title: newQuestTitle.trim(),
                        subtitle: newQuestSubtitle.trim() || "Selecione uma opção estimulada.",
                        category: newQuestCategory as any,
                        active: true
                      };
                      const updated = [...activeList, newQuestionItem];
                      saveActiveQuestions(updated);
                      setQuestionsList(updated);
                      setNewQuestKey("");
                      setNewQuestTitle("");
                      setNewQuestSubtitle("");
                      showNotification("Nova pergunta de coleta cadastrada com sucesso!", "success");
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Cadastrar Pergunta
                  </button>
                </div>

                {/* Display list of active/inactive questions */}
                <div className="space-y-3">
                  <span className="text-[10px] text-[#3b82f6] font-mono font-bold tracking-wider uppercase block">
                    Lista Geral de Perguntas de Coleta ({questionsList.length})
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {questionsList.map((quest) => (
                      <div
                        key={quest.key}
                        id={`quest-card-${quest.key}`}
                        className="bg-[#14151b] border border-[#1f212a] p-4 rounded-xl flex flex-col justify-between gap-4 hover:border-gray-800"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[9px] bg-blue-500/10 text-blue-400 font-mono font-bold px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wide">
                              {quest.category}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-gray-500 font-mono">{quest.active ? "Ativa" : "Desativa"}</span>
                              <input
                                id={`quest-toggle-${quest.key}`}
                                type="checkbox"
                                checked={quest.active}
                                onChange={() => {
                                  // Can toggle active state
                                  const updated = questionsList.map(q => q.key === quest.key ? { ...q, active: !q.active } : q);
                                  saveActiveQuestions(updated);
                                  setQuestionsList(updated);
                                  showNotification(`${quest.active ? "Pergunta desativada!" : "Pergunta ativada!"}`, "info");
                                }}
                                className="accent-[#3b82f6] h-4 w-4 cursor-pointer"
                              />
                            </div>
                          </div>

                          {editQuestKey === quest.key ? (
                            <div className="space-y-3 pt-2">
                              <input
                                id={`quest-edit-title-${quest.key}`}
                                type="text"
                                value={editQuestTitle}
                                onChange={(e) => setEditQuestTitle(e.target.value)}
                                className="w-full bg-[#0b0c10] border border-[#3b82f6] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                placeholder="Edit title"
                              />
                              <input
                                id={`quest-edit-subtitle-${quest.key}`}
                                type="text"
                                value={editQuestSubtitle}
                                onChange={(e) => setEditQuestSubtitle(e.target.value)}
                                className="w-full bg-[#0b0c10] border border-[#3b82f6] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                placeholder="Edit subtitle"
                              />
                              <div className="flex gap-1.5">
                                <button
                                  id={`quest-save-${quest.key}`}
                                  onClick={() => {
                                    if (!editQuestTitle.trim()) return;
                                    const updated = questionsList.map(q => q.key === quest.key ? { ...q, title: editQuestTitle.trim(), subtitle: editQuestSubtitle.trim() } : q);
                                    saveActiveQuestions(updated);
                                    setQuestionsList(updated);
                                    setEditQuestKey(null);
                                    showNotification("Pergunta atualizada!", "success");
                                  }}
                                  className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-mono rounded cursor-pointer transition-colors"
                                >
                                  Salvar
                                </button>
                                <button
                                  id={`quest-cancel-${quest.key}`}
                                  onClick={() => setEditQuestKey(null)}
                                  className="px-3 py-1 bg-gray-600 text-white text-[10px] font-mono rounded cursor-pointer transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 pt-1">
                              <h4 className="text-xs font-bold text-white">{quest.title}</h4>
                              <p className="text-[11px] text-gray-400 capitalize">{quest.subtitle}</p>
                            </div>
                          )}
                        </div>

                        {!editQuestKey && (
                          <div className="flex items-center justify-between border-t border-gray-900 pt-3 text-[10px] font-mono">
                            <span className="text-gray-500">Chave: {quest.key}</span>
                            <div className="flex items-center gap-2">
                              <button
                                id={`quest-action-edit-${quest.key}`}
                                onClick={() => {
                                  setEditQuestKey(quest.key);
                                  setEditQuestTitle(quest.title);
                                  setEditQuestSubtitle(quest.subtitle);
                                }}
                                className="text-[#3b82f6] hover:underline cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                id={`quest-action-del-${quest.key}`}
                                onClick={() => {
                                  setDeleteQuestionTarget({ key: quest.key, title: quest.title });
                                }}
                                className="text-red-400 hover:underline cursor-pointer"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
        )
      ) : (
        /* STANDARD PUBLIC CLIENT SCREEN */
        <>
          {/* Main Top Header */}
          {activeView !== "petition_6x1" && (
            <header className="bg-[#0b0c10]/95 backdrop-blur-xl border-b border-[#1b1c23] sticky top-0 z-40 px-6 py-4">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-bold font-display tracking-tight text-white uppercase">
                        Instituto <span className="text-[#3b82f6]">Linkon</span>
                      </h1>
                      <span className="text-[9px] bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/20 px-1.5 py-0.5 rounded uppercase font-mono tracking-wide">
                        Sondagem Eleitoral
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono tracking-tight leading-none mt-0.5">
                      Opinião Pública & Modelagem Amostral • Petrópolis-RJ
                    </p>
                  </div>
                </div>

                {/* Core View Selector Tabs */}
                <div className="flex flex-wrap items-center bg-[#111218] p-1.5 rounded-xl border border-[#21232e] gap-1">
                  <button
                    onClick={() => {
                      window.location.hash = "";
                      setActiveView("interviewee");
                      if (surveySubmitted) handleResetSurvey();
                    }}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeView === "interviewee"
                        ? "bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/10"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Responder Questionário
                  </button>
                  <button
                    onClick={() => {
                      window.location.hash = "";
                      setActiveView("analyst");
                    }}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeView === "analyst"
                        ? "bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/10"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <BarChart4 className="h-3.5 w-3.5" />
                    Gráfico de votos
                  </button>
                </div>

              </div>
            </header>
          )}

      {/* Primary content space */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {activeView === "petition_6x1" ? (
          <Petition6x1Page onBackToSurvey={() => {
            window.location.hash = "";
            setActiveView("interviewee");
          }} />
        ) : activeView === "interviewee" ? (
          isPrivateBrowsing && surveyStep !== (4 + activeQuestions.length) ? (
            <div className="max-w-md mx-auto bg-[#0e0f14] border border-amber-500/30 p-8 rounded-2xl text-center space-y-6 animate-fadeIn my-12 shadow-lg shadow-amber-500/5">
              <div className="mx-auto w-16 h-16 bg-amber-500/15 border border-amber-500/40 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold font-display text-white">Navegação Privada Ativa</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Para garantir a integridade metodológica das amostragens e evitar entrevistas duplicadas, registrar entrevistas através de <strong>guias anônimas ou modo privado</strong> não é permitido nesta plataforma.
                </p>
                <div className="bg-[#1b1411] border border-amber-900/30 rounded-xl p-4 text-left space-y-1">
                  <span className="text-[9px] text-amber-400 font-mono font-bold tracking-wider uppercase block">Medida de Proteção Antifraude</span>
                  <p className="text-xs text-gray-300 leading-relaxed">Por favor, feche esta guia e abra a plataforma em uma janela de navegação normal no seu navegador para que possa participar.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveView("analyst")}
                className="w-full px-5 py-2.5 bg-[#1c1e27] hover:bg-[#252834] border border-[#2d303f] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BarChart4 className="h-4 w-4" />
                Ver gráficos das entrevistas
              </button>
            </div>
          ) : alreadyVoted && surveyStep !== (4 + activeQuestions.length) ? (
            <div className="max-w-md mx-auto bg-[#0e0f14] border border-[#1f212a] p-8 rounded-2xl text-center space-y-6 animate-fadeIn my-12">
              <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-[#3b82f6]" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold font-display text-white">Entrevista já Registrada!</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Para honrar a integridade metodológica de forma justa, cada dispositivo só pode registrar uma entrevista por amostragem quinzenal.
                </p>
                <div className="bg-[#12141f] border border-[#212330] rounded-xl p-4 text-left space-y-1">
                  <span className="text-[9px] text-[#3b82f6] font-mono font-bold tracking-wider uppercase block">Bloqueio Metodológico de IP/Dispositivo</span>
                  <p className="text-xs text-gray-300">Este dispositivo poderá registrar uma nova entrevista a partir de:</p>
                  <p className="text-sm text-emerald-400 font-mono font-black mt-1.5 bg-[#0f2118] inline-block px-3 py-1 rounded border border-emerald-500/20">{getNextCycleStartDate()}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveView("analyst")}
                className="w-full px-5 py-2.5 bg-[#3b82f6] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#3b82f6]/10 animate-pulse"
              >
                <BarChart4 className="h-4 w-4" />
                Ver gráficos das entrevistas
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
            
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold font-display tracking-tight text-white sm:text-3xl">
                Sondagem Eleitoral Estimulada
              </h2>
              <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                Opine sobre o cenário atual de Petrópolis. Suas respostas redefinem os dados do painel geral em tempo real de forma estimulada.
              </p>
            </div>

            {/* Wizard stage frame */}
            <div className="bg-[#0e0f14] rounded-2xl border border-[#1f212a] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#1a1b26]" />
              
              {/* Dynamic Step Tracker indicator */}
              {surveyStep > 0 && surveyStep <= (2 + activeQuestions.length) && (
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between text-[11px] font-mono text-gray-400">
                    <span>PROGRESSO DE COLETA</span>
                    <span className="text-[#3b82f6]">Etapa {surveyStep} de {2 + activeQuestions.length}</span>
                  </div>
                  <div className="w-full bg-[#161821] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] h-full rounded-full transition-all duration-300"
                      style={{ width: `${(surveyStep / (2 + activeQuestions.length)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Step rendering dispatcher */}
              <AnimatePresence mode="wait">
                {surveyStep === 0 && (
                  <WelcomeStep 
                    onStart={() => setSurveyStep(1)} 
                    responses={responses}
                    setAlreadyVoted={setAlreadyVoted}
                    clientIpHash={clientIpHash}
                    setClientIpHash={setClientIpHash}
                    voterUuid={voterUuid}
                    deviceHash={deviceHashState}
                  />
                )}

                {surveyStep === 1 && (
                  <DemographicsStep
                    gender={surveyAnswers.gender}
                    age={surveyAnswers.age}
                    neighborhood={surveyAnswers.neighborhood}
                    education={surveyAnswers.education}
                    income={surveyAnswers.income}
                    color={surveyAnswers.color}
                    religion={surveyAnswers.religion}
                    onChange={handleAnswerSelect}
                    onNext={handleNextStep}
                  />
                )}

                {surveyStep === 2 && (
                  <EvaluationsStep
                    evalLula={surveyAnswers.evalLula}
                    evalGovernor={surveyAnswers.evalGovernor}
                    evalMayor={surveyAnswers.evalMayor}
                    onChange={handleAnswerSelect}
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                  />
                )}

                {activeQuestions.map((question, qIdx) => {
                  const currentStepNum = 3 + qIdx;
                  if (surveyStep !== currentStepNum) return null;

                  const candScenarioMap: Record<string, string> = {
                    votePresident: "presidentScenario",
                    votePresidentRunoff: "presidentRunoff",
                    voteGovernor: "governorScenario",
                    voteGovernorRunoff: "governorRunoff",
                    voteSenate: "senateScenario",
                    voteStateDeputy: "stateDeputyScenario",
                    voteFederalDeputy: "federalDeputyScenario",
                    voteMayorPetropolis: "mayorScenario"
                  };

                  const scenarioField = candScenarioMap[question.key] || "presidentScenario";
                  const rawCandidates = (activePollData as any)[scenarioField]?.candidates || [];
                  const candidates = [...rawCandidates].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

                  if (question.category === "senate") {
                    return (
                      <SenateSelectionStep
                        key={question.key}
                        candidates={candidates}
                        selectedValues={surveyAnswers.voteSenate}
                        onChange={(val) => handleAnswerSelect("voteSenate", val)}
                        onNext={handleNextStep}
                        onPrev={handlePrevStep}
                      />
                    );
                  }

                  return (
                    <SingleSelectionStep
                      key={question.key}
                      stepKey={question.key}
                      title={question.title}
                      subtitle={question.subtitle}
                      candidates={candidates}
                      selectedValue={(surveyAnswers as any)[question.key] || ""}
                      onChange={(val) => handleAnswerSelect(question.key as any, val)}
                      onNext={handleNextStep}
                      onPrev={handlePrevStep}
                      btnNextText={qIdx === activeQuestions.length - 1 ? "Revisar Respostas" : undefined}
                    />
                  );
                })}

                {surveyStep === (3 + activeQuestions.length) && (
                  <ReviewStep
                    gender={surveyAnswers.gender}
                    age={surveyAnswers.age}
                    neighborhood={surveyAnswers.neighborhood}
                    education={surveyAnswers.education}
                    income={surveyAnswers.income}
                    color={surveyAnswers.color}
                    religion={surveyAnswers.religion}
                    votePresident={getCandidatesInfo(surveyAnswers.votePresident, "pres")}
                    votePresidentRunoff={getCandidatesInfo(surveyAnswers.votePresidentRunoff || "", "presRunoff")}
                    voteGovernor={getCandidatesInfo(surveyAnswers.voteGovernor, "gov")}
                    voteGovernorRunoff={getCandidatesInfo(surveyAnswers.voteGovernorRunoff || "", "govRunoff")}
                    voteSenate={getCandidatesInfo(surveyAnswers.voteSenate, "sen")}
                    voteStateDeputy={getCandidatesInfo(surveyAnswers.voteStateDeputy, "state")}
                    voteFederalDeputy={getCandidatesInfo(surveyAnswers.voteFederalDeputy, "fed")}
                    voteMayorPetropolis={getCandidatesInfo(surveyAnswers.voteMayorPetropolis || "", "mayor")}
                    onPrev={handlePrevStep}
                    onSubmit={handleSurveySubmit}
                  />
                )}

                {surveyStep === (4 + activeQuestions.length) && (
                  <SuccessStep
                    onRestart={handleResetSurvey}
                    onGoToDashboard={() => {
                      setActiveView("analyst");
                      handleResetSurvey();
                    }}
                    showGoToDashboard={true}
                  />
                )}
              </AnimatePresence>

            </div>

          </div>
          )
        ) : (
          
          /* ANALYST VIEW SCREEN (INTELLIGENCE CENTER PANEL) */
          <div className="space-y-8 animate-fadeIn">
            
            {/* DESTACADO: PERÍODO DE TIRAGEM / RECOLHIMENTO & PRÓXIMA AMOSTRAGEM */}
            <div className="bg-[#0e0f14] border-2 border-blue-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Subtle background gradient splash */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-blue-400 shrink-0 mt-0.5">
                  <Calendar className="h-6 w-6 animate-pulse" />
                </div>
                <div className="space-y-1 text-left">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#3b82f6]">💬 Como funcionam as Amostragens de Sondagem Rotativas?</span>
                  <p className="text-white text-base font-bold font-sans">
                    Período de Recolhimento da Entrevista: <span className="text-[#3b82f6] font-mono">{getCurrentCycleDates().start} a {getCurrentCycleDates().end}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Sondagem Automatizada Quinzenal: A cada 15 dias os dados são consolidados e uma nova amostragem se inicia de forma limpa, permitindo que os participantes opinem novamente sobre o cenário para máxima precisão temporal.
                  </p>
                </div>
              </div>

              <div className="bg-[#11121c] border border-blue-500/20 p-4 rounded-xl flex items-center gap-3 shrink-0 self-stretch md:self-auto justify-center">
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25 text-emerald-400 font-bold text-xs ring-4 ring-emerald-500/5">
                  ✓
                </div>
                <div className="text-left">
                  <span className="text-[9px] uppercase font-mono text-gray-450 block font-bold text-gray-400">PRÓXIMA AMOSTRAGEM INICIA EM:</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">{getNextCycleStartDate()}</span>
                </div>
              </div>
            </div>

            {/* CYCLE SELECTOR CARD FOR MULTI-CYCLE ANALYSIS */}
            <div className="bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-5 text-left space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-red-600/10 border border-red-600/25 text-[#E41221] px-2.5 py-0.5 rounded-lg font-mono font-bold uppercase tracking-wider">
                      Filtro de Período
                    </span>
                    <span className="text-xs text-gray-550 font-mono">| {availableCycles.length} amostragem(ns) disponível(is)</span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Período de Amostragem Eleitoral</h3>
                  <p className="text-xs text-gray-400">
                    Selecione a amostragem de sondagem desejada. Todos os cenários eleitorais, avaliações de governo, boletins e perfis demográficos abaixo serão atualizados instantaneamente.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <span className="text-xs text-gray-400 shrink-0 font-bold sm:text-right">Amostragem Selecionada:</span>
                  <select
                    value={selectedCycleKey}
                    onChange={(e) => setSelectedCycleKey(e.target.value)}
                    className="bg-[#14151b] border border-[#2d303f] hover:border-blue-500 text-white font-mono text-xs font-bold rounded-xl px-4 py-3 cursor-pointer outline-none transition-all focus:ring-2 focus:ring-[#3b82f6]/50"
                  >
                    {availableCycles.map((key) => {
                      const current = getCurrentCycleDates();
                      if (key === current.key) {
                        return (
                          <option key={key} value={key}>
                            ⭐ Amostragem Atual ({current.start} a {current.end})
                          </option>
                        );
                      }
                      const dates = getDatesForCycleKey(key);
                      return (
                        <option key={key} value={key}>
                          📅 Amostragem Anterior ({dates.start} a {dates.end})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Legal / TSE Compliance Announcement Banner */}
            <div className="bg-[#121420]/75 border-s-4 border-yellow-500/80 rounded-r-2xl p-5 text-left space-y-2.5 shadow-xl border-y border-e border-[#1d1f30]">
              <div className="flex items-center gap-2">
                <span className="text-base">⚖️</span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Aviso de Conformidade Legal (Resolução nº 23.600 do TSE)</h4>
              </div>
              <p className="text-xs text-gray-200 leading-relaxed font-sans">
                Este é um projeto de automação de dados e inteligência artificial. Os dados coletados não possuem valor estatístico científico e não serão divulgados publicamente como pesquisa eleitoral.
              </p>
            </div>

            {/* Upper stats summary card block row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block font-bold">RESPOSTAS NA AMOSTRAGEM</span>
                <div className="flex items-baseline gap-1.5 leading-none">
                  <span className="text-2xl font-bold font-mono text-white">{filteredResponses.length}</span>
                  <span className="text-[11px] text-gray-400">fichas</span>
                </div>
                <div className="w-full bg-[#181a24] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#3b82f6] h-full rounded-full" style={{ width: `${Math.min(100, (filteredResponses.length/500)*100)}%` }} />
                </div>
                <span className="text-[9px] text-gray-500 font-mono block">Base total: {responses.length}</span>
              </div>

              <div className="bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block font-bold">MARGEM DE ERRO</span>
                <div className="flex items-baseline gap-1 leading-none">
                  <span className="text-2xl font-bold font-mono text-emerald-400">±{activePollData.metadata.marginOfError}%</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">Grau Integridade Amostral</p>
              </div>

              <div className="bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block font-bold">REGULARIZAÇÃO TRE</span>
                <p className="text-xs font-semibold text-amber-500 leading-tight font-display">{activePollData.metadata.registryNumber}</p>
                <span className="text-[10px] text-gray-400 font-mono">Uso interno / Não oficial</span>
              </div>

              <div className="bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-5 space-y-2">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block font-bold">DECORRÊNCIA DE CAMPO</span>
                <span className="text-xs font-bold text-[#3b82f6] leading-none block">REGIONAL SERRANA</span>
                <span className="text-[10px] text-gray-400 font-mono">{topActiveNeighborhood} mais ativo</span>
              </div>

            </div>

            {/* COLLABORATIVE CANDIDATE SUGGESTION BOX (FOR RESPONDENTS) */}
            <div className="bg-gradient-to-br from-[#0e0f14] to-[#121421] rounded-2xl border border-blue-500/15 p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl text-blue-400 shrink-0">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-[#3b82f6]">Colaboração do Eleitorado</span>
                    <h3 className="text-sm font-bold text-white font-display">Sugestões de Pré-Candidato</h3>
                    <p className="text-xs text-gray-400">
                      Sugira até 3 nomes de pré-candidato para serem testados no próximo período de amostragem oficial de Petrópolis.
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[9px] text-gray-500 font-mono block uppercase">Suas Sugestões</span>
                  <span className="text-xs font-bold font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                    {deviceSuggestions.length} de 3 enviadas
                  </span>
                </div>
              </div>

              <form onSubmit={handleUserSuggestionSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newSuggestionInput}
                      onChange={(e) => setNewSuggestionInput(e.target.value)}
                      placeholder={deviceSuggestions.length >= 3 ? "Limite de 3 sugestões atingido neste dispositivo." : "Ex: Yuri Moura, Bomtempo, Leandro Sampaio..."}
                      maxLength={60}
                      disabled={deviceSuggestions.length >= 3 || submittingUserSuggestion}
                      className="w-full px-4 py-3 bg-[#08090d] border border-[#1f212a] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/35 transition-all text-left disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={deviceSuggestions.length >= 3 || submittingUserSuggestion || !newSuggestionInput.trim()}
                    className="px-6 py-3 bg-[#3b82f6] hover:bg-[#1d4ed8] disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-bold font-mono tracking-wider uppercase rounded-xl shadow-lg hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {submittingUserSuggestion ? (
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Enviar Sugestão"
                    )}
                  </button>
                </div>

                {deviceSuggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-left">
                    <span className="text-[10px] text-gray-500 font-mono uppercase">Enviados por você:</span>
                    {deviceSuggestions.map((name, i) => (
                      <span key={i} className="text-[10px] bg-[#141829] border border-blue-500/15 text-blue-400 px-2.5 py-1 rounded-lg font-mono">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Banner Informativo de Ponderação Estatística */}
            <div className="bg-gradient-to-r from-blue-950/45 via-[#0d0e15] to-emerald-950/35 border border-blue-500/20 rounded-2xl p-6 text-left mb-6 shadow-xl">
              <div className="flex flex-col lg:flex-row gap-5 lg:items-center justify-between">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-black tracking-wider uppercase text-white font-mono flex items-center gap-1.5">
                      📊 Ponderação Estatística Ativa e Integridade Amostral
                    </h3>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed max-w-4xl">
                    Para garantir a máxima precisão científica e mitigar vieses decorrentes de mobilização coordenada ou disparos em massa por grupos políticos, esta plataforma recalcula continuamente os resultados usando <strong>Ponderação Estatística Proporcional</strong>. Os dados finais são ponderados em tempo real com base no perfil oficial do eleitorado de <strong>Petrópolis-RJ</strong> (proporções de Gênero e Idade estabelecidas pelo TSE e Censo do IBGE).
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0 lg:flex-col lg:items-end">
                  <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg font-mono font-semibold">
                    ♀️ Mulheres: 53.6% | ♂️ Homens: 46.4%
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg font-mono font-semibold">
                    🎂 Faixas de Idade: TSE 16 a 60+ anos
                  </span>
                </div>
              </div>
            </div>

            {/* Tab navigation headers in analyst dashboard */}
            <div className="border-b border-[#1b1c23] pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:flex bg-[#0f1016] p-1.5 rounded-xl border border-[#21232e] gap-1.5 w-full lg:w-max">
                {[
                  { id: "scenarios", label: "🗳️ Cenários" },
                  { id: "approvals", label: "📈 Avaliação" },
                  { id: "demographics", label: "👥 Perfil Demográfico" },
                  { id: "evolution", label: "📈 Histórico & Evolução" },
                  { id: "report", label: "📄 Boletim para WhatsApp" },
                  { id: "petition_6x1", label: "✊ Abaixo-Assinado 6x1" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAnalystTab(item.id as any)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center cursor-pointer ${
                      analystTab === item.id
                        ? "bg-[#3b82f6] text-white shadow-md shadow-[#3b82f6]/10 font-black"
                        : "text-gray-400 hover:text-white hover:bg-[#1a1b24]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENT HOUSES */}
            <div>
              {/* SUBTAB 1: CENARIOS MAJORITARIOS (Presidente, Governador, Senado, State Deputy, Federal Deputy) */}
              {analystTab === "scenarios" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Scenario Switcher (4 Columns) */}
                  <div className="lg:col-span-4 bg-[#0e0f14] rounded-2xl border border-[#1f212a] p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold font-display uppercase text-white tracking-wider">Cenários Eleitorais</h3>
                      <p className="text-xs text-gray-450 text-gray-400">Escolha o cargo pretendido para visualizar a apuração ponderada em tempo real.</p>
                    </div>

                    <div className="space-y-2 pt-2">
                      {(() => {
                        const scenarioOptions = [
                          { id: "president", label: "👑 Presidente (1º Turno)", candCount: activePollData.presidentScenario.candidates.length },
                          ...(activePollData.presidentRunoff?.showRunoff ? [
                            { id: "presidentRunoff", label: "⚡ Presidente (2º Turno)", candCount: 2 }
                          ] : []),
                          { id: "governor", label: "🏰 Governador (1º Turno)", candCount: activePollData.governorScenario.candidates.length },
                          ...(activePollData.governorRunoff?.showRunoff ? [
                            { id: "governorRunoff", label: "⚡ Governador (2º Turno)", candCount: 2 }
                          ] : []),
                          { id: "senate", label: "🏛️ Senador da República", candCount: activePollData.senateScenario.candidates.length },
                          { id: "stateDeputy", label: "⛰️ Deputado Estadual", candCount: activePollData.stateDeputyScenario.candidates.length },
                          { id: "federalDeputy", label: "✈️ Deputado Federal", candCount: activePollData.federalDeputyScenario.candidates.length },
                          { id: "mayor", label: "🏙️ Prefeito de Petrópolis", candCount: activePollData.mayorScenario?.candidates.length || 0 }
                        ];

                        return scenarioOptions.map((scen) => (
                          <button
                            key={scen.id}
                            onClick={() => setActiveScenario(scen.id as any)}
                            className={`w-full p-3.5 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                              activeScenario === scen.id
                                ? "bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6]"
                                : "bg-[#14151b] border-[#1e2029] text-gray-400 hover:border-gray-600"
                            }`}
                          >
                            <span className="text-xs font-bold">{scen.label}</span>
                            <span className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded text-gray-500 font-bold">{scen.candCount} Cand</span>
                          </button>
                        ));
                      })()}
                    </div>

                    <div className="border-t border-[#1a1c28] pt-4">
                      <div className="flex justify-between items-center text-xs text-gray-300">
                        <span>Filtro de Contagem:</span>
                        <div className="flex bg-[#14151b] p-0.5 rounded-lg border border-[#21232e]">
                          <button
                            onClick={() => setValuationViewType("valids")}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                              valuationViewType === "valids" ? "bg-[#3b82f6] text-white" : "text-gray-400"
                            }`}
                          >
                            Votos Válidos
                          </button>
                          <button
                            onClick={() => setValuationViewType("totals")}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                              valuationViewType === "totals" ? "bg-[#3b82f6] text-white" : "text-gray-400"
                            }`}
                          >
                            Votos Totais
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                        *Votos válidos baseiam-se em critérios amostrais consolidados, extraindo-se brancos, nulos e indecisos das intenções de voto.
                      </p>
                    </div>
                  </div>

                  {/* Right Graphics (8 Columns) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    <div className="bg-[#0e0f14] rounded-2xl border border-[#1f212a] p-6 shadow-xl">
                      
                      {/* Sub-Header details */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b1c23] pb-4 mb-6">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-bold text-white uppercase tracking-wider font-display shrink-0">
                              Cenário Ativo: {
                                activeScenario === "president" ? "Presidência (1º Turno)" : 
                                activeScenario === "presidentRunoff" ? "Presidência (2º Turno)" : 
                                activeScenario === "governor" ? "Governo do Estado (1º Turno)" : 
                                activeScenario === "governorRunoff" ? "Governo do Estado (2º Turno)" : 
                                activeScenario === "senate" ? "Senado" :
                                activeScenario === "stateDeputy" ? "Deputado Estadual" :
                                activeScenario === "mayor" ? "Prefeito de Petrópolis" :
                                "Deputado Federal"
                              }
                            </h3>
                            <span className="text-[10px] bg-sky-505/10 text-sky-400 border border-sky-400/20 font-bold px-2 py-0.5 rounded tracking-wider uppercase font-mono">
                              {valuationViewType === "valids" ? "Votos Válidos" : "Votos Totais"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            Contagem instantânea ponderada de todos os <b className="text-white">{filteredResponses.length} entrevistados</b> ativos neste período.
                          </p>
                        </div>
                      </div>

                      {/* Data Representation List sorted by percentage */}
                      <div className="space-y-4">
                        
                        {(activeScenario === "president" ? (valuationViewType === "valids" ? presValids : [...activePollData.presidentScenario.candidates].sort((a,b)=>b.votes-a.votes)) :
                          activeScenario === "presidentRunoff" ? (valuationViewType === "valids" ? presRunoffValids : [...(activePollData.presidentRunoff?.candidates || [])].sort((a,b)=>b.votes-a.votes)) :
                          activeScenario === "governor" ? (valuationViewType === "valids" ? govValids : [...activePollData.governorScenario.candidates].sort((a,b)=>b.votes-a.votes)) :
                          activeScenario === "governorRunoff" ? (valuationViewType === "valids" ? govRunoffValids : [...(activePollData.governorRunoff?.candidates || [])].sort((a,b)=>b.votes-a.votes)) :
                          activeScenario === "senate" ? (valuationViewType === "valids" ? senValids : [...activePollData.senateScenario.candidates].sort((a,b)=>b.votes-a.votes)) :
                          activeScenario === "stateDeputy" ? (valuationViewType === "valids" ? stateValids : [...activePollData.stateDeputyScenario.candidates].sort((a,b)=>b.votes-a.votes)) :
                          activeScenario === "mayor" ? (valuationViewType === "valids" ? mayorValids : [...(activePollData.mayorScenario?.candidates || [])].sort((a,b)=>b.votes-a.votes)) :
                          (valuationViewType === "valids" ? fedValids : [...activePollData.federalDeputyScenario.candidates].sort((a,b)=>b.votes-a.votes))
                        ).map((cand, idx) => {
                          const percent = cand.votes;
                          return (
                            <div key={cand.id} className="space-y-1.5 p-3 rounded-xl bg-[#14151b]/40 border border-[#1b1c28] hover:border-gray-800 transition-all">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] ${
                                    idx === 0 ? "bg-[#3b82f6] text-white" : idx === 1 ? "bg-[#06b6d4] text-white" : "bg-[#1f212c] text-gray-400"
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  {/* Candidate Circular Image */}
                                  {(cand as any).photo ? (
                                    <img
                                      src={(cand as any).photo}
                                      alt={cand.name}
                                      className="w-11 h-11 rounded-full object-cover border border-[#1b1c28]"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-11 h-11 rounded-full bg-[#1b1c26] border border-[#2b2d39] flex items-center justify-center text-xs font-bold text-gray-400 font-mono">
                                      {cand.name.substring(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="font-bold text-white text-xs">{cand.name}</span>
                                  <span className="text-[10px] bg-[#1a1c25] border border-gray-800 text-gray-400 font-mono px-1.5 py-0.2 rounded font-semibold uppercase">
                                    {cand.party}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-white text-xs">{percent.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-[#161821] h-2.5 rounded-full overflow-hidden flex shadow-inner">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                                    idx === 0 ? "bg-gradient-to-r from-[#2563eb] to-[#38bdf8]" :
                                    idx === 1 ? "bg-gradient-to-r from-[#06b6d4] to-[#10b981]" :
                                    "bg-gradient-to-r from-[#1e293b] to-[#475569]"
                                  }`}
                                  style={{ width: `${percent}%` }}
                                  id={`bar-${cand.id}`}
                                />
                              </div>
                            </div>
                          );
                        })}

                        {/* Brancos & Indecisos only showing up in total mode */}
                        {valuationViewType === "totals" && (
                          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[#1a1c2b]">
                            
                            <div className="p-3 bg-[#111218] border border-[#1f212a] rounded-xl flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-gray-500 font-display block uppercase">⚪ Brancos / Nulos</span>
                                <span className="text-sm font-bold font-mono text-white">
                                  {(activeScenario === "president" ? activePollData.presidentScenario.brancosNulos :
                                    activeScenario === "presidentRunoff" ? (activePollData.presidentRunoff?.brancosNulos || 0) :
                                    activeScenario === "governor" ? activePollData.governorScenario.brancosNulos :
                                    activeScenario === "governorRunoff" ? (activePollData.governorRunoff?.brancosNulos || 0) :
                                    activeScenario === "senate" ? activePollData.senateScenario.brancosNulos :
                                    activeScenario === "stateDeputy" ? activePollData.stateDeputyScenario.brancosNulos :
                                    activeScenario === "mayor" ? (activePollData.mayorScenario?.brancosNulos || 0) :
                                    activePollData.federalDeputyScenario.brancosNulos).toFixed(1)}%
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-500 italic">Descartados</span>
                            </div>

                            <div className="p-3 bg-[#111218] border border-[#1f212a] rounded-xl flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-gray-500 font-display block uppercase">❓ Não Sabem / Indecisos</span>
                                <span className="text-sm font-bold font-mono text-white">
                                  {(activeScenario === "president" ? activePollData.presidentScenario.indecisos :
                                    activeScenario === "presidentRunoff" ? (activePollData.presidentRunoff?.indecisos || 0) :
                                    activeScenario === "governor" ? activePollData.governorScenario.indecisos :
                                    activeScenario === "governorRunoff" ? (activePollData.governorRunoff?.indecisos || 0) :
                                    activeScenario === "senate" ? activePollData.senateScenario.indecisos :
                                    activeScenario === "stateDeputy" ? activePollData.stateDeputyScenario.indecisos :
                                    activeScenario === "mayor" ? (activePollData.mayorScenario?.indecisos || 0) :
                                    activePollData.federalDeputyScenario.indecisos).toFixed(1)}%
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-500 italic">Não Sabe</span>
                            </div>

                          </div>
                        )}

                      </div>

                    </div>

                    {/* Regional Leader Highlights (Local Focus) based on most voted survey results */}
                    {(activeScenario === "president" || activeScenario === "presidentRunoff") && (
                      <div className="bg-[#0e0f14] rounded-2xl border border-[#1f212a] p-5 shadow-[#1d4ed8]/5 shadow-lg space-y-4">
                        <div className="flex items-center gap-1.5 border-b border-[#1b1c23] pb-2">
                          <span className="text-[#3b82f6]">🗣️</span>
                          <h4 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                            ÍNDICE DE FORÇA DAS LIDERANÇAS SERRANAS
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(() => {
                            const leaderDescriptions: Record<string, string> = {
                              "est-yuri": "Deputado Estadual com grande recall em Petrópolis.",
                              "fed-bernardo": "Ex-prefeito e forte articulador na Região Serrana.",
                              "fed-rubens": "Ex-prefeito com base partidária consolidada no município.",
                              "fed-hugo": "Deputado atuante com forte reduto nos distritos de Petrópolis.",
                              "est-fred": "Vereador experiente e ex-presidente da Câmara local.",
                              "est-octavio": "Vereador com destacado protagonismo no bloco conservador.",
                              "fed-leandro": "Forte nome no segmento comunitário e distrital de Petrópolis.",
                              "fed-julia": "Coletiva feminista com representação expressiva nas urnas.",
                              "est-gilda": "Vereadora atuante com foco em políticas de saúde e sociais."
                            };

                            const allLocalCands = [
                              ...activePollData.stateDeputyScenario.candidates.map(c => ({
                                id: c.id,
                                name: c.name,
                                party: c.party,
                                votes: c.votes,
                                type: "Estadual"
                              })),
                              ...activePollData.federalDeputyScenario.candidates.map(c => ({
                                id: c.id,
                                name: c.name,
                                party: c.party,
                                votes: c.votes,
                                type: "Federal"
                              }))
                            ];

                            const topLeaders = [...allLocalCands]
                              .sort((a, b) => b.votes - a.votes)
                              .slice(0, 4);

                            return topLeaders.map((leader) => (
                              <div key={leader.id} className="p-3 bg-[#14151b]/40 border border-[#1f2129] rounded-xl space-y-1.5 text-xs hover:border-blue-500/20 transition-all">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white text-xs">{leader.name}</span>
                                    <span className="text-[9px] bg-[#1a1c25] border border-gray-800 text-gray-400 font-mono px-1.5 py-0.2 rounded font-semibold uppercase">
                                      {leader.type}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[10px] bg-blue-500/10 text-blue-400 font-semibold px-2 py-0.5 rounded">
                                    {leader.votes.toFixed(1)}% votos
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-400 font-sans leading-relaxed leading-normal">
                                  {leaderDescriptions[leader.id] || `Representante partidário (${leader.party}) com excelente respaldo regional decorrente do censo ativo.`}
                                </p>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* SUBTAB 2: APPROVALS / GOVERNMENTS EVALUATION */}
              {analystTab === "approvals" && (
                <div className="space-y-6">
                  
                  <div className="bg-[#0e0f14] rounded-2xl border border-[#1f212a] p-6 shadow-xl">
                    <div className="border-b border-[#1b1c23] pb-4 mb-6">
                      <h3 className="text-sm font-bold font-display uppercase text-white tracking-wider">Aprovação e Classificação de Gestão</h3>
                      <p className="text-xs text-gray-400">Classificação percentual ponderada dos executivos no município.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {activePollData.evaluations.map((ev) => (
                        <div key={ev.id} className="bg-[#14151b]/40 border border-[#1f212a] p-5 rounded-2xl space-y-4">
                          
                          <div className="border-b border-[#1f2129] pb-3">
                            <span className="text-[10px] text-[#3b82f6] font-semibold uppercase tracking-wider font-mono block">Gestão Pública</span>
                            <span className="text-base font-bold text-white font-display block leading-tight">{ev.entity}</span>
                            <span className="text-[11px] text-gray-400 leading-none">{ev.role}</span>
                          </div>

                          <div className="space-y-3 pt-2">
                            {/* Positive */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-400 font-medium">🟢 Ótimo / Bom</span>
                                <span className="font-mono font-bold text-emerald-400">{ev.positive.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-[#181922] h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${ev.positive}%` }} />
                              </div>
                            </div>

                            {/* Regular */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-400 font-medium">🔵 Regular</span>
                                <span className="font-mono font-bold text-sky-400">{ev.regular.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-[#181922] h-2 rounded-full overflow-hidden">
                                <div className="bg-sky-400 h-full rounded-full" style={{ width: `${ev.regular}%` }} />
                              </div>
                            </div>

                            {/* Negative */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-400 font-medium">🔴 Ruim / Péssimo</span>
                                <span className="font-mono font-bold text-rose-500">{ev.negative.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-[#181922] h-2 rounded-full overflow-hidden">
                                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${ev.negative}%` }} />
                              </div>
                            </div>

                            {/* Dont Know */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-400 font-medium font-medium">⚪ Não Sabe / Indeciso</span>
                                <span className="font-mono font-bold text-gray-400">{ev.dontKnow.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-[#181922] h-2 rounded-full overflow-hidden">
                                <div className="bg-gray-500 h-full rounded-full" style={{ width: `${ev.dontKnow}%` }} />
                              </div>
                            </div>
                          </div>

                          <div className={`p-3.5 rounded-xl border text-[11px] font-sans ${
                            ev.positive > ev.negative + 5 ? "bg-[#0b1c15] text-[#2ebd7d] border-[#133c24]" :
                            ev.negative > ev.positive + 5 ? "bg-[#210f13] text-[#ef647a] border-[#3f191f]" :
                            "bg-[#131721] text-[#93a2b8] border-[#1c2438]"
                          }`}>
                            <span className="font-bold">Análise de Saldo: </span>
                            {ev.positive > ev.negative + 5 ? `Gestão aprovada. Saldo positivo de +${(ev.positive - ev.negative).toFixed(1)}% de aprovação líquida.` :
                             ev.negative > ev.positive + 5 ? `Gestão reprovada. Desgaste acentuado com saldo negativo de ${(ev.negative - ev.positive).toFixed(1)}% de desfavorabilidade.` :
                             "Opinião polarizada / neutra em equilíbrio político."
                            }
                          </div>

                        </div>
                      ))}
                    </div>

                  </div>

                </div>
              )}

              {/* SUBTAB 3: DEMOGRAPHIC PROFILE SPLITS */}
              {analystTab === "demographics" && (
                <div className="space-y-6">
                  
                  <div className="bg-[#0e0f14] rounded-2xl border border-[#1f212a] p-6 shadow-xl">
                    <div className="border-b border-[#1b1c23] pb-4 mb-6">
                      <h3 className="text-sm font-bold font-display uppercase text-white tracking-wider">Perfil Demográfico Amostral</h3>
                      <p className="text-xs text-gray-400">Distribuição quantitativa por gênero, idade e bairros nos dados consolidados.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                      
                      {/* Gender Chart Block */}
                      <div className="bg-[#14151b]/40 border border-[#1f212a] p-5 rounded-xl space-y-4 flex flex-col items-center">
                        <span className="text-xs font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Eleitores por Gênero</span>
                        
                        <div className="h-44 w-full flex items-center justify-center relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={demographicStats.gender}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {demographicStats.gender.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
                            <span className="text-2xl font-bold font-mono text-white">{filteredResponses.length}</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono font-bold">Fichas</span>
                          </div>
                        </div>

                        <div className="w-full space-y-2 text-xs">
                          {demographicStats.gender.map((item) => (
                            <div key={item.name} className="flex justify-between items-center text-xs">
                              <span className="text-gray-400 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                                {item.name}
                              </span>
                              <span className="font-mono font-bold text-white">{item.value} ({(filteredResponses.length > 0 ? (item.value / filteredResponses.length) * 100 : 0).toFixed(1)}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Age Chart Block */}
                      <div className="bg-[#14151b]/40 border border-[#1f212a] p-5 rounded-xl space-y-4 flex flex-col items-center">
                        <span className="text-xs font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Faixas Etárias</span>
                        
                        <div className="h-44 w-full flex items-center justify-center relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={demographicStats.age}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {demographicStats.age.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                            <span className="text-xl font-bold font-mono text-blue-400">95%</span>
                            <span className="text-[9px] text-gray-500 uppercase font-mono tracking-widest font-semibold">Grau Confiança</span>
                          </div>
                        </div>

                        <div className="w-full space-y-2 text-xs">
                          {demographicStats.age.map((item) => (
                            <div key={item.name} className="flex justify-between items-center text-xs">
                              <span className="text-gray-400 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                                {item.name}
                              </span>
                              <span className="font-mono font-bold text-white">{item.value} ({(filteredResponses.length > 0 ? (item.value / filteredResponses.length) * 100 : 0).toFixed(1)}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Amostragem por Distrito */}
                      <div className="bg-[#14151b]/40 border border-[#1f212a] p-5 rounded-xl space-y-4 flex flex-col items-center">
                        <span className="text-xs font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Amostragem por Distrito</span>
                        
                        <div className="h-44 w-full flex items-center justify-center relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={demographicStats.districts}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {demographicStats.districts.map((entry, index) => (
                                  <Cell key={`cell-dist-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                            <span className="text-xl font-bold font-mono text-emerald-400">{demographicStats.districts.filter(d => d.value > 0).length}</span>
                            <span className="text-[9px] text-gray-500 uppercase font-mono tracking-widest font-semibold">Distritos</span>
                          </div>
                        </div>

                        <div className="w-full space-y-2 text-xs">
                          {demographicStats.districts.map((item) => (
                            <div key={item.name} className="flex justify-between items-center text-xs">
                              <span className="text-gray-400 flex items-center gap-1.5 max-w-[65%] truncate" title={item.name}>
                                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
                                {item.name.replace("º Distrito: ", "º d. - ")}
                              </span>
                              <span className="font-mono font-bold text-white shrink-0">{item.value} ({(filteredResponses.length > 0 ? (item.value / filteredResponses.length) * 100 : 0).toFixed(1)}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Bairros de Apoio */}
                      <div className="bg-[#14151b]/40 border border-[#1f212a] p-5 rounded-xl space-y-4 flex flex-col items-center">
                        <span className="text-xs font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Bairros com Mais Votos</span>
                        
                        <div className="h-44 w-full flex items-center justify-center relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={demographicStats.neighborhood}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {demographicStats.neighborhood.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                            <span className="text-lg font-bold font-mono text-[#3b82f6]">BAIRROS</span>
                            <span className="text-[8px] text-gray-400 uppercase font-mono tracking-widest font-semibold">Ranking</span>
                          </div>
                        </div>

                        <div className="w-full space-y-2 text-xs">
                          {demographicStats.neighborhood.slice(0, 4).map((item) => (
                            <div key={item.name} className="flex justify-between items-center text-xs">
                              <span className="text-gray-400 flex items-center gap-1.5 max-w-[65%] truncate" title={item.name}>
                                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
                                {item.name}
                              </span>
                              <span className="font-mono font-bold text-white shrink-0">{item.value} ({(filteredResponses.length > 0 ? (item.value / filteredResponses.length) * 100 : 0).toFixed(1)}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Linha adicional para dados amplos (Escolaridade, Renda, Cor, Religião) */}
                    <div className="border-t border-[#1b1c23] pt-6 mt-6">
                      <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest mb-4">Indicadores Socioeconômicos e Identitários Consolidados</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        
                        {/* Escolaridade Chart Block */}
                        <div className="bg-[#14151b]/40 border border-[#1f212a] p-4 rounded-xl space-y-4 flex flex-col items-center">
                          <span className="text-[11px] font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Escolaridade</span>
                          <div className="h-28 w-full flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={demographicStats.education}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={25}
                                  outerRadius={40}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {demographicStats.education.map((entry, index) => (
                                    <Cell key={`cell-edu-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full space-y-1.5 text-[10px]">
                            {demographicStats.education.map((item) => (
                              <div key={item.name} className="flex justify-between items-center">
                                <span className="text-gray-400 flex items-center gap-1 max-w-[65%] truncate" title={item.name}>
                                  <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
                                  {item.name}
                                </span>
                                <span className="font-mono font-bold text-white">{item.value} ({(filteredResponses.length > 0 ? (item.value / filteredResponses.length) * 100 : 0).toFixed(1)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Renda Chart Block */}
                        <div className="bg-[#14151b]/40 border border-[#1f212a] p-4 rounded-xl space-y-4 flex flex-col items-center">
                          <span className="text-[11px] font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Faixas de Renda</span>
                          <div className="h-28 w-full flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={demographicStats.income}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={25}
                                  outerRadius={40}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {demographicStats.income.map((entry, index) => (
                                    <Cell key={`cell-inc-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full space-y-1.5 text-[10px]">
                            {demographicStats.income.map((item) => (
                              <div key={item.name} className="flex justify-between items-center">
                                <span className="text-gray-400 flex items-center gap-1 max-w-[65%] truncate" title={item.name}>
                                  <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
                                  {item.name}
                                </span>
                                <span className="font-mono font-bold text-white">{item.value} ({(filteredResponses.length > 0 ? (item.value / filteredResponses.length) * 100 : 0).toFixed(1)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Cor Chart Block */}
                        <div className="bg-[#14151b]/40 border border-[#1f212a] p-4 rounded-xl space-y-4 flex flex-col items-center">
                          <span className="text-[11px] font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Cor / Raça</span>
                          <div className="h-28 w-full flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={demographicStats.color}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={25}
                                  outerRadius={40}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {demographicStats.color.map((entry, index) => (
                                    <Cell key={`cell-col-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full space-y-1.5 text-[10px]">
                            {demographicStats.color.map((item) => (
                              <div key={item.name} className="flex justify-between items-center">
                                <span className="text-gray-400 flex items-center gap-1 max-w-[65%] truncate" title={item.name}>
                                  <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
                                  {item.name}
                                </span>
                                <span className="font-mono font-bold text-white">{item.value} ({(filteredResponses.length > 0 ? (item.value / filteredResponses.length) * 100 : 0).toFixed(1)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Religião Chart Block */}
                        <div className="bg-[#14151b]/40 border border-[#1f212a] p-4 rounded-xl space-y-4 flex flex-col items-center">
                          <span className="text-[11px] font-bold text-white font-display border-b border-gray-800 pb-2 w-full text-center uppercase tracking-wider">Religião</span>
                          <div className="h-28 w-full flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={demographicStats.religion}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={25}
                                  outerRadius={40}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {demographicStats.religion.map((entry, index) => (
                                    <Cell key={`cell-rel-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#0e0f14", borderColor: "#1f212a" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full space-y-1.5 text-[10px]">
                            {demographicStats.religion.map((item) => (
                              <div key={item.name} className="flex justify-between items-center">
                                <span className="text-gray-400 flex items-center gap-1 max-w-[65%] truncate" title={item.name}>
                                  <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }} />
                                  {item.name}
                                </span>
                                <span className="font-mono font-bold text-white">{item.value} ({(filteredResponses.length > 0 ? (item.value / filteredResponses.length) * 100 : 0).toFixed(1)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>

                </div>
              )}



              {/* SUBTAB 5: COMPILED MARKDOWN TRANSMISSION EXPORT */}
              {analystTab === "report" && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  
                  <div className="bg-[#0e0f14] rounded-2xl border border-[#1f212a] p-6 shadow-xl space-y-4">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b1c23] pb-4">
                      <div>
                        <h3 className="text-sm font-bold font-display uppercase text-white tracking-wider">Boletim Otimizado para WhatsApp</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Compacto, com negritos formatados com asteriscos simples (*texto*) e link <b>grupolinkon.online</b> integrado. Pronto para colar de forma legível em grupos e conversas!
                        </p>
                      </div>

                      <button
                        onClick={handleCopyMarkdownReport}
                        className="px-4 py-2.5 bg-[#25d366]/20 hover:bg-[#25d366]/30 border border-[#25d366]/40 text-[#25d366] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                      >
                        {compactReportCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {compactReportCopied ? "Copiado!" : "Copiar para WhatsApp"}
                      </button>
                    </div>

                    <div className="pt-2">
                       <textarea
                        readOnly
                        value={generateMarkdownReport(activePollData)}
                        className="w-full h-96 bg-[#070709] border border-[#1a1c25] rounded-xl p-4 font-mono text-[10px] text-emerald-400 leading-relaxed focus:outline-none custom-scrollbar"
                      />
                    </div>

                    <p className="text-[10px] text-gray-500 text-center">
                      *O boletim reconstrói em tempo real todas as porcentagens de votos válidos e totais de acordo com as respostas reais da Sondagem Eleitoral Linkon.
                    </p>

                  </div>

                </div>
              )}

              {/* SUBTAB 6: HISTORICAL EVOLUTION */}
              {analystTab === "evolution" && (
                <EvolutionTab isAdmin={false} responses={responses} />
              )}

              {/* SUBTAB 7: PETITION 6X1 MANAGEMENT */}
              {analystTab === "petition_6x1" && (
                <Petition6x1Tab />
              )}

            </div>

          </div>
        )}

      </main>

      {/* Footer System Branding */}
      {activeView !== "petition_6x1" && (
        <footer className="border-t border-[#121319] bg-[#090a0e] mt-24 py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center md:text-left">
              <h4 className="text-sm font-bold font-display uppercase text-white tracking-wide">
                Instituto <span className="text-[#3b82f6]">Linkon</span> - Sondagem Eleitoral
              </h4>
              <p className="text-xs text-gray-500 max-w-sm">
                Sistemas de opinião pública voluntária amadora orientados pela lei de sigilo e LGPD. Em conformidade com a Resolução nº 23.600 do TSE.
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-2 text-[10px] font-mono text-gray-500">
              <span>Sondagem de Opinião Amadora (Sem Registro) • Petrópolis, RJ</span>
              <span>© 2026 Instituto Linkon — Fins de Estudo / Opinião.</span>
            </div>
          </div>
        </footer>
      )}


        </>
      )}

      {/* Custom Confirmation Modal for Clearing Database */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0e0f14] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">Limpar dados da amostragem?</h3>
                <p className="text-[10px] text-gray-500 font-mono">Esta ação é irreversível</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed text-left font-sans">
              Você está prestes a apagar <b>todos os depoimentos e coletas acumuladas</b> na amostragem corrente das sondagens do Instituto Linkon. O painel de simulação voltará ao estado original.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-[#1b1b22] hover:bg-[#22222b] border border-[#2d2d3a] text-gray-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClearDatabase}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting Candidate */}
      {deleteCandidateTarget && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0e0f14] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">Excluir Pré-Candidato?</h3>
                <p className="text-[10px] text-gray-500 font-mono">Esta ação removerá o candidato da lista de votação</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-left font-sans text-gray-300">
              Você está prestes a excluir permanentemente o pré-candidato <strong className="text-white">{deleteCandidateTarget.name}</strong> do cenário de seleção.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteCandidateTarget(null)}
                className="px-4 py-2 bg-[#1b1b22] hover:bg-[#22222b] border border-[#2d2d3a] text-gray-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteCandidate}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting Question */}
      {deleteQuestionTarget && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0e0f14] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">Excluir Pergunta?</h3>
                <p className="text-[10px] text-gray-500 font-mono">Esta ação descarta a pergunta extra</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-left font-sans text-gray-300">
              Você está prestes a excluir permanentemente a pergunta <strong className="text-white">{deleteQuestionTarget.key}</strong> ({deleteQuestionTarget.title}).
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteQuestionTarget(null)}
                className="px-4 py-2 bg-[#1b1b22] hover:bg-[#22222b] border border-[#2d2d3a] text-gray-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteQuestion}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
