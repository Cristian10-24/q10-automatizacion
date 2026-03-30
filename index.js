import { obtenerDatosQ10 } from "./q10.js";
import { google } from "googleapis";

function calcularEstado(avance) {
  if (avance >= 100) return "Completado";
  if (avance > 0) return "En progreso";
  return "Sin iniciar";
}

function cruzarDatos(base, q10) {
  const mapa = {};

  q10.forEach(r => {
    const id = String(r["Identificacion"]).trim();
    mapa[id] = r;
  });

  return base.map(p => {
    const id = String(p["Identificación"]).trim();
    const match = mapa[id];

    const avance = match ? (match["Avance %"] || 0) : 0;

    return [
      id,
      p["Celular"],
      p["Email"],
      avance,
      calcularEstado(avance)
    ];
  });
}

async function main() {
  const datosQ10 = await obtenerDatosQ10();

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  const sheetId = process.env.SHEET_ID;

  const baseData = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "BASE!A1:D"
  });

  const rows = baseData.data.values;
  const headers = rows[0];

  const base = rows.slice(1).map(r => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });

  const resultado = cruzarDatos(base, datosQ10);

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "RESULTADO!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["Identificación", "Celular", "Email", "Avance", "Estado"],
        ...resultado
      ]
    }
  });

  console.log("✅ Actualizado");
}

main();