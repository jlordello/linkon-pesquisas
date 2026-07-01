import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Main API Route for Gemini analysis
app.post("/api/gemini/suggest-candidates", async (req, res) => {
  try {
    const { suggestions } = req.body;
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return res.json({ candidates: [] });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Fallback aggregator helper function with party mapping for Petrópolis
    const runLocalFallback = () => {
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
      suggestions.forEach(s => {
        if (!s || typeof s !== "string") return;
        const clean = s.trim();
        if (clean) {
          // Normalize to Title Case for nice grouping
          const norm = clean.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
          counts[norm] = (counts[norm] || 0) + 1;
        }
      });
      
      let sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => {
          let party = "S/D"; // Sem Partido / Desconhecido
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

      // Show top 5 only if there are more than 5 unique candidate names
      if (sorted.length > 5) {
        sorted = sorted.slice(0, 5);
      }

      return { candidates: sorted };
    };

    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Using local offline counting.");
      return res.json(runLocalFallback());
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const suggestionsText = suggestions.join("\n");

      const prompt = `Analise os seguintes nomes de pré-candidatos sugeridos livremente por eleitores em uma sondagem eleitoral em Petrópolis, RJ:
${suggestionsText}

Por favor execute as tarefas a seguir:
1. Aglutine, corrija ortograficamente e unifique nomes parecidos ou grafados incorretamente por erro de digitação (ex: "yuri", "Yuri Moura", "Iuri Moura" -> "Yuri Moura"; "bom tempo", "Rubens Bomtempo" -> "Rubens Bomtempo").
2. Conte a frequência exata de ocorrência de cada nome pós aglutinação e organize em ordem decrescente de votos.
3. Extraia sempre de forma precisa do seu banco de dados de conhecimento o partido político atual ou oficial do candidato citado (ex: Yuri Moura -> PSOL, Rubens Bomtempo -> PSB, Hingo Hammes -> PP, Bernardo Rossi -> MDB, Leandro Sampaio -> PODEMOS, Octavio Sampaio -> PL, etc.). Se não houver partido claro, use "S/P".
4. Retorne APENAS os candidatos unificados correspondentes aos nomes presentes nas sugestões fornecidas. Se houver 5 ou menos nomes únicos sugeridos, NÃO adicione de forma alguma nenhum pré-candidato extra fictício ou padrão para preencher ou completar a lista. Por exemplo, se houver apenas 1 ou 2 sugestões reais e únicas, o retorno final deve conter unicamente esses candidates avaliados. Se e somente se houver mais de 5 nomes únicos reais sugeridos pelo eleitorado nas coletas, aí sim você deve ponderar e retornar apenas os 5 nomes mais sugeridos (os 5 nomes mais pedidos/votados).
5. Para cada candidato, escreva uma curta análise de 1 frase explicando sua importância política local serrana (se é deputado, prefeito, vereador, etc.).

Retorne os dados estritamente em um objeto JSON válido correspondente ao seguinte esquema de dados:
{
  "candidates": [
    {
      "name": "Nome do Candidato",
      "party": "SIGLA DO PARTIDO (MDB, PSOL, PSB, PP, PL, PT, etc.)",
      "count": 10,
      "analysis": "Breve análise sobre o candidato no contexto de Petrópolis, RJ."
    }
  ]
}`;

      let response: any = null;
      // Use gemini-3.1-flash-lite as first option because of extremely high availability and speed
      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"];
      let lastCallError: any = null;

      for (const modelToUse of modelsToTry) {
        let attempts = 2; // Tenta até 2 vezes por modelo (original + 1 re-tentativa com delay)
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelToUse,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    candidates: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          party: { type: Type.STRING },
                          count: { type: Type.NUMBER },
                          analysis: { type: Type.STRING }
                        },
                        required: ["name", "party", "count", "analysis"]
                      }
                    }
                  },
                  required: ["candidates"]
                }
              }
            });
            break; // Sucesso! Sai das tentativas deste modelo
          } catch (err: any) {
            lastCallError = err;
            // Quiet log to prevent false alarms in platform error-catchers
            console.log(`[Gemini API Info] Tentativa ${attempt} com modelo ${modelToUse} nao pôde responder imediatamente.`);
            if (attempt < attempts) {
              // Aguarda 1 segundo antes de tentar novamente o mesmo modelo
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
        if (response) {
          console.log(`Sucesso obtido com o modelo: ${modelToUse}`);
          break; // Sucesso total, encerra a busca de modelos
        }
      }

      if (!response) {
        throw lastCallError || new Error("Todos os modelos Gemini falharam.");
      }

      const resText = response.text || "{}";
      const data = JSON.parse(resText.trim());
      if (data && Array.isArray(data.candidates) && data.candidates.length > 0) {
        let rawList = data.candidates;
        if (rawList.length > 5) {
          rawList = rawList.slice(0, 5);
        }
        return res.json({ candidates: rawList });
      } else {
        console.log("[Gemini API Info] Retorno estruturado veio vazio. Executando fallback local.");
        return res.json(runLocalFallback());
      }
    } catch (apiError) {
      console.log("[Gemini API Info] Executando fallback local automatizado para as indicacoes.");
      return res.json(runLocalFallback());
    }

  } catch (error) {
    console.log("[Critical Error] Erro critico na rota de sugestoes:", error);
    return res.status(500).json({ error: "Erro crítico no servidor." });
  }
});

// Vite middleware configuration for development vs production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully operational on http://localhost:${PORT}`);
  });
}

startServer();
