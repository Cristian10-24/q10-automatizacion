import { chromium } from "playwright";
import fetch from "node-fetch";
import xlsx from "xlsx";

export async function obtenerDatosQ10() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🔄 Abriendo Q10...");
  await page.goto("https://site6.q10.com", { waitUntil: "domcontentloaded" });

  // esperar que cargue bien todo (evita el linker-masker)
  await page.waitForTimeout(4000);

  console.log("✍️ Llenando credenciales...");

  // ✅ SELECTORES CORRECTOS
  await page.waitForSelector("#NombreUsuario", { timeout: 60000 });

  await page.fill("#NombreUsuario", process.env.Q10_USER);
  await page.fill("#Contrasena", process.env.Q10_PASS);

  console.log("🔐 Iniciando sesión...");
  await page.click("#submit-btn");

  await page.waitForResponse(response =>
    response.url().includes("/Login") && response.status() === 200
  );    
  
  if (page.url().includes("Login")) {
    throw new Error("❌ Login fallido");
  } 


  // esperar que cargue después del login
  await page.waitForLoadState("networkidle");

  console.log("🍪 Obteniendo cookies...");
  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

  console.log("📂 Entrando a Informes...");

await page.goto("https://site6.q10.com/Informes", {
  waitUntil: "networkidle"
});

// 🔥 IMPORTANTE: dejar que cargue scripts internos
await page.waitForTimeout(6000);

  console.log("📡 Consultando reporte...");

  const params = new URLSearchParams();
  params.append("Tipo","Q10.Jack.Areas.ReportesExcel.EducacionVirtual.ServicioReporteConsolidadoEducacionVirtual");
  params.append("periodo","22");
  params.append("sedeJornada","1");
  params.append("programa","01JC");
  params.append("asignatura","01JC");
  params.append("publicado","True");
  params.append("archivado","false");

 console.log("📡 Consultando reporte desde navegador...");

const response = await page.evaluate(async (params) => {
  const res = await fetch(
    "/Reportes/Excel/ExcelReporte/EducacionVirtual/ConsolidadoEducacionVirtual",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://site6.q10.com/Informes"
      },
      body: params
    }
  );

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (e) {
    return { error: text };
  }
}, params.toString());

if (response.error) {
  throw new Error("❌ Error del servidor:\n" + response.error);
}

if (!response.url) {
  throw new Error("❌ No se recibió URL del reporte. Puede que el login falló.");
}

console.log("⬇️ Descargando Excel...");
const file = await fetch(response.url);
const buffer = await file.buffer();

  console.log("📊 Procesando Excel...");
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = xlsx.utils.sheet_to_json(sheet);

  console.log("✅ Datos obtenidos:", jsonData.length);

  await browser.close();

  return jsonData;
}