import React, { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Search, 
  Trash2, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Check, 
  Clock, 
  Download,
  Database
} from "lucide-react";
import { createPetitionSpreadsheet, appendRows } from "../services/sheetsService";

export const Petition6x1Tab: React.FC = () => {
  const [signatures, setSignatures] = useState<any[]>([]);
  const [filteredSignatures, setFilteredSignatures] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Google OAuth / Sheets States
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("");

  // 1. Subscribe to petition signatures in real time
  useEffect(() => {
    setLoading(true);
    const q = collection(db, "signatures_6x1");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort desc by timestamp
      list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      setSignatures(list);
      setLoading(false);
    }, (error) => {
      console.error("Error reading signatures:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, "signatures_6x1");
    });

    return () => unsubscribe();
  }, []);

  // Filter signatures based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSignatures(signatures);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = signatures.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(query)) ||
          (s.email && s.email.toLowerCase().includes(query)) ||
          (s.whatsapp && s.whatsapp.toLowerCase().includes(query))
      );
      setFilteredSignatures(filtered);
    }
  }, [signatures, searchQuery]);

  // 2. Load petition settings (spreadsheet info) from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "petition_settings", "6x1_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSpreadsheetId(data.spreadsheetId || null);
          setSpreadsheetUrl(data.spreadsheetUrl || null);
          setLastSynced(data.lastSynced || null);
        }
      } catch (err) {
        console.error("Error loading petition settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // 3. Listen to Firebase auth changes to cache local Google OAuth session if available
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Clean up accessToken if user logged out
      if (!currentUser) {
        setAccessToken(null);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Handle Google Login with Spreadsheet & Drive.file Scopes
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setSyncStatus("");
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/spreadsheets");
      provider.addScope("https://www.googleapis.com/auth/drive.file");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        setUser(result.user);
        setSyncStatus("Conectado ao Google com sucesso!");
      } else {
        throw new Error("Não foi possível obter o token de acesso do Google.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setSyncStatus(`Erro na conexão: ${err.message || err}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle spreadsheet creation
  const handleCreateSpreadsheet = async () => {
    if (!accessToken) {
      setSyncStatus("Por favor, conecte sua conta Google primeiro.");
      return;
    }

    setIsCreatingSheet(true);
    setSyncStatus("Criando nova planilha no seu Google Drive...");
    try {
      const sheetInfo = await createPetitionSpreadsheet(accessToken);
      
      // Save settings to Firestore
      const settingsRef = doc(db, "petition_settings", "6x1_config");
      const configData = {
        spreadsheetId: sheetInfo.id,
        spreadsheetUrl: sheetInfo.url,
        lastSynced: new Date().toISOString()
      };
      
      await setDoc(settingsRef, configData);
      
      setSpreadsheetId(sheetInfo.id);
      setSpreadsheetUrl(sheetInfo.url);
      setLastSynced(configData.lastSynced);
      setSyncStatus("Planilha criada e vinculada com sucesso!");
    } catch (err: any) {
      console.error("Error creating sheet:", err);
      setSyncStatus(`Erro ao criar planilha: ${err.message || err}`);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Synchronize pending signatures to the Google Sheet
  const handleSyncPending = async () => {
    if (!accessToken) {
      setSyncStatus("Por favor, conecte sua conta Google primeiro.");
      return;
    }
    if (!spreadsheetId) {
      setSyncStatus("Nenhuma planilha vinculada encontrada.");
      return;
    }

    // Filter signatures that are pending sync
    const pending = signatures.filter((s) => s.synced !== true);
    if (pending.length === 0) {
      setSyncStatus("Todas as assinaturas já estão sincronizadas!");
      return;
    }

    setIsSyncing(true);
    setSyncStatus(`Sincronizando ${pending.length} assinaturas pendentes...`);
    try {
      // Prepare row values
      const rowsToAppend = pending.map((s) => [
        s.name || "",
        s.email || "",
        s.whatsapp || "",
        s.timestamp ? new Date(s.timestamp).toLocaleString("pt-BR") : ""
      ]);

      // Append to spreadsheet range
      await appendRows(accessToken, spreadsheetId, "Assinaturas!A:D", rowsToAppend);

      // Batch update the signatures synced flag in Firestore
      const batch = writeBatch(db);
      pending.forEach((s) => {
        const docRef = doc(db, "signatures_6x1", s.id);
        batch.update(docRef, { synced: true });
      });
      await batch.commit();

      // Update last synced in settings
      const settingsRef = doc(db, "petition_settings", "6x1_config");
      const now = new Date().toISOString();
      await updateDoc(settingsRef, { lastSynced: now });

      setLastSynced(now);
      setSyncStatus(`${pending.length} assinaturas sincronizadas com sucesso!`);
    } catch (err: any) {
      console.error("Sync error:", err);
      setSyncStatus(`Erro de sincronização: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete signature with confirmation
  const handleDeleteSignature = async (id: string, name: string) => {
    const confirmed = window.confirm(`Deseja realmente remover a assinatura de "${name}"? Esta ação é irreversível.`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "signatures_6x1", id));
    } catch (err) {
      console.error("Error deleting signature:", err);
      alert("Erro ao excluir assinatura.");
    }
  };

  // Unlink sheet confirmation
  const handleUnlinkSheet = async () => {
    const confirmed = window.confirm("Deseja realmente desvincular esta planilha? Os dados da planilha no seu Drive não serão excluídos, mas a vinculação será removida.");
    if (!confirmed) return;

    try {
      const settingsRef = doc(db, "petition_settings", "6x1_config");
      await setDoc(settingsRef, {
        spreadsheetId: null,
        spreadsheetUrl: null,
        lastSynced: null
      });
      setSpreadsheetId(null);
      setSpreadsheetUrl(null);
      setLastSynced(null);
      setSyncStatus("Planilha desvinculada.");
    } catch (err) {
      console.error("Error unlinking sheet:", err);
    }
  };

  // Count pending signatures
  const pendingCount = signatures.filter((s) => s.synced !== true).length;
  const syncedCount = signatures.filter((s) => s.synced === true).length;

  return (
    <div className="space-y-6 animate-fadeIn" id="petition-tab-root">
      
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
          <span className="text-rose-500">★</span> Painel de Monitoramento: Abaixo-Assinado Fim da Escala 6x1
        </h2>
        <p className="text-xs text-gray-400">
          Gerencie os contatos captados pelo abaixo-assinado do PT Petrópolis e exporte para o seu Google Sheets oficial.
        </p>
      </div>

      {/* Grid: Google Sheets connection card + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Google Sheets Integration Controls */}
        <div className="lg:col-span-7 bg-[#0e0f14] border border-[#231518]/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Integração com Google Sheets</h3>
              <p className="text-[10px] text-gray-500 font-mono">WORKSPACE OAUTH CLIENT ACTIVE</p>
            </div>
          </div>

          <div className="bg-[#0b0c10] border border-[#1b1c24] p-4 rounded-xl space-y-3.5">
            {/* Connection state */}
            {!accessToken ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>Você precisa autenticar a sua conta Google para vincular e salvar as assinaturas diretamente em uma planilha do Google Drive.</span>
                </div>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-950/40 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Database className="h-3.5 w-3.5" />
                      Conectar Conta Google do PT
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs bg-[#112419] border border-emerald-900/30 px-3 py-2 rounded-lg text-emerald-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Conta Google Autenticada
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">{user?.email}</span>
                </div>

                {/* Planilha vinculada details */}
                {!spreadsheetId ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-350 text-gray-400 leading-relaxed">
                      Nenhuma planilha do Google Sheets vinculada a esta campanha de abaixo-assinado. Deseja criar uma planilha oficial formatada automaticamente?
                    </p>
                    <button
                      onClick={handleCreateSpreadsheet}
                      disabled={isCreatingSheet}
                      className="px-4 py-2.5 bg-[#1b1d28] hover:bg-[#242736] border border-[#2e3146] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isCreatingSheet ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white-500 rounded-full animate-spin"></div>
                          Criando planilha oficial...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                          Criar Planilha Oficial de Assinaturas
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="p-3 bg-[#13141c] border border-gray-900 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-300">Planilha Ativa:</span>
                        <a 
                          href={spreadsheetUrl || "#"} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-[#3b82f6] hover:underline flex items-center gap-0.5 font-bold"
                        >
                          Abrir no Sheets <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                      <p className="text-xs font-semibold text-white truncate max-w-full font-mono">{spreadsheetId}</p>
                      
                      {lastSynced && (
                        <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1">
                          <span>Última Sincronização:</span>
                          <span className="font-mono text-gray-400">
                            {new Date(lastSynced).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2.5 pt-1">
                      <button
                        onClick={handleSyncPending}
                        disabled={isSyncing || pendingCount === 0}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-950/40 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isSyncing ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Enviando dados...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            Sincronizar {pendingCount} Pendentes
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleUnlinkSheet}
                        className="px-3 py-2 bg-[#1b1415] hover:bg-[#2d1b1e] border border-rose-950 text-rose-400 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Desvincular
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {syncStatus && (
            <div className="p-3 bg-[#13141a] border border-[#21232e] rounded-xl text-xs text-gray-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{syncStatus}</span>
            </div>
          )}
        </div>

        {/* Campaign Metrics Stats */}
        <div className="lg:col-span-5 bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Métricas da Mobilização</h3>
            <p className="text-xs text-gray-400">Status atual das assinaturas em tempo real.</p>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-[#0b0c10] border border-gray-900 p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Total Captado</span>
              <p className="text-2xl font-black text-white font-mono">{signatures.length}</p>
            </div>

            <div className="bg-[#0b0c10] border border-gray-900 p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-amber-500 uppercase font-mono tracking-wider">Pendentes Sheets</span>
              <p className="text-2xl font-black text-amber-400 font-mono">{pendingCount}</p>
            </div>
          </div>

          <div className="bg-[#0b0c10] border border-gray-900 p-3 rounded-xl flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Check className="h-4 w-4" />
              Sincronizado no Sheets
            </span>
            <span className="font-mono text-white font-extrabold">{syncedCount} assinaturas</span>
          </div>
        </div>

      </div>

      {/* Database signatures List and Search */}
      <div className="bg-[#0e0f14] border border-[#1f212a] rounded-2xl p-5 space-y-4">
        
        <div className="flex flex-col sm:flex-row gap-3.5 sm:items-center sm:justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Assinaturas Registradas ({filteredSignatures.length})
          </h3>
          
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, e-mail ou WhatsApp..."
              className="w-full bg-[#151720] border border-[#242635] focus:border-rose-600 text-gray-200 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all placeholder:text-gray-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
            <div className="w-6 h-6 border-2 border-gray-800 border-t-rose-500 rounded-full animate-spin"></div>
            Carregando lista de apoiadores...
          </div>
        ) : filteredSignatures.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            Nenhuma assinatura encontrada para a busca atual.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1b1c23] text-gray-500 font-bold">
                  <th className="py-3 px-4">Nome Completo</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">WhatsApp / Celular</th>
                  <th className="py-3 px-4">Data da Assinatura</th>
                  <th className="py-3 px-4 text-center">Status Sheets</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {filteredSignatures.map((item) => (
                  <tr key={item.id} className="hover:bg-[#121319] transition-colors text-gray-300">
                    <td className="py-3.5 px-4 font-bold text-white">{item.name}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">{item.email}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">{item.whatsapp}</td>
                    <td className="py-3.5 px-4 text-gray-400">
                      {item.timestamp ? new Date(item.timestamp).toLocaleDateString("pt-BR") + " " + new Date(item.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.synced ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          <Check className="h-2.5 w-2.5" /> Sincronizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                          <Clock className="h-2.5 w-2.5" /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteSignature(item.id, item.name)}
                        className="p-1.5 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                        title="Remover assinatura"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};
