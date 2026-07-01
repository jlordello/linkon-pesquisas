/**
 * Service to handle Google Sheets REST API requests directly using OAuth accessToken.
 */

export interface GoogleSpreadsheetInfo {
  id: string;
  url: string;
}

/**
 * Creates a new Google Spreadsheet for the petition and sets up headers.
 */
export async function createPetitionSpreadsheet(accessToken: string): Promise<GoogleSpreadsheetInfo> {
  const url = "https://sheets.googleapis.com/v4/spreadsheets";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      properties: {
        title: "Abaixo-Assinado Fim da Escala 6x1 - PT Petrópolis"
      },
      sheets: [
        {
          properties: {
            title: "Assinaturas"
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Initialize headers on the spreadsheet
  await appendRows(accessToken, spreadsheetId, "Assinaturas!A1", [
    ["Nome Completo", "E-mail", "WhatsApp / Telefone", "Data e Hora da Assinatura"]
  ]);

  return {
    id: spreadsheetId,
    url: spreadsheetUrl
  };
}

/**
 * Appends rows of values to a specified range in a Google Spreadsheet.
 */
export async function appendRows(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: values
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to append rows to spreadsheet: ${errText}`);
  }
}
