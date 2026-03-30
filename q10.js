import { chromium } from "playwright";
import fetch from "node-fetch";
import xlsx from "xlsx";

export async function obtenerDatosQ10() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://site6.q10.com");

  await page.fill("#Usuario", process.env.Q10_USER);
  await page.fill("#Clave", process.env.Q10_PASS);
  await page.click("#btnIngresar");

  await page.waitForLoadState("networkidle");

  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

  const params = new URLSearchParams();
  params.append("Tipo","Q10.Jack.Areas.ReportesExcel.EducacionVirtual.ServicioReporteConsolidadoEducacionVirtual");
  params.append("periodo","22");
  params.append("sedeJornada","1");
  params.append("programa","01JC");
  params.append("asignatura","01JC");
  params.append("publicado","true");
  params.append("archivado","false");

  const response = await fetch(
    "https://site6.q10.com/Reportes/Excel/ExcelReporte/EducacionVirtual/ConsolidadoEducacionVirtual",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookieHeader
      },
      body: params.toString()
    }
  );

  const data = await response.json();

  const file = await fetch(data.url);
  const buffer = await file.buffer();

  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = xlsx.utils.sheet_to_json(sheet);

  await browser.close();

  return jsonData;
}