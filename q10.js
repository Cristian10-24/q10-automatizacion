import { chromium } from "playwright";
import xlsx from "xlsx";

export async function obtenerDatosQ10() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true // 🔥 CLAVE
  });
  const page = await context.newPage();

  console.log("🔄 Abriendo Q10...");
  await page.goto("https://site6.q10.com", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  console.log("✍️ Llenando credenciales...");
  await page.fill("#NombreUsuario", process.env.Q10_USER);
  await page.fill("#Contrasena", process.env.Q10_PASS);

  console.log("🔐 Iniciando sesión...");
  await page.click("#submit-btn");

  await page.waitForLoadState("networkidle");

  if (page.url().includes("Login")) {
    throw new Error("❌ Login fallido");
  }

  console.log("📂 Entrando a Informes...");
  await page.goto("https://site6.q10.com/Informes", {
    waitUntil: "networkidle"
  });

  await page.waitForTimeout(6000);

  console.log("⬇️ Generando reporte...");

  // 🔥 AQUÍ ESTÁ LA MAGIA
  const [ download ] = await Promise.all([
    page.waitForEvent("download"),
    page.click('button:has-text("Exportar reporte")')
  ]);

  const path = await download.path();

  console.log("📊 Procesando Excel...");
  const workbook = xlsx.readFile(path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = xlsx.utils.sheet_to_json(sheet);

  console.log("✅ Datos obtenidos:", jsonData.length);

  await browser.close();

  return jsonData;
}