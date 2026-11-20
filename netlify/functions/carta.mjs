// Lee las cartas y las fotos desde Google Drive para que Cari pueda actualizarlas.
// Las hojas y carpetas están en Drive > El Jardín de Babia > Web Babia (compartida "cualquiera con el enlace: lector").
const HOJAS = {
  carta: "1sIFhY6cnacitRKca16P62p7FRWlADJpMY1vtZeYTuDY",
  vinos: "1KPHcNX0Pz0EpILEjOtDIAPcvBkU_qSDY5NzvuihJbwU",
  menus: "1o6iSAe69a06wco1qKZOQTmFcby6T1RDExAWe6VKisqo",
  dia: "1J_pTeclf-dyr14PY2o2xCIYEtGmi_fM2cKY0g_2BJBA", // Menú del día
};
const CARPETAS = { galeria: "1ddVK5qhm-cB7R2i6aKD4RKT_n8PSGzRf", botellas: "1LZrwGVONohx5vkbtV1Fp2FjCBKzkB-1c", menus: "18mp-oYk13GvjxuDqE3biVZyJ24Z_Ksyz", dia: "1wfWSilptQq76f38DIbcSs5VRCLh_iXLy" };

function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x));
}

async function hoja(id, key) {
  let r = key ? await fetch(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/csv&key=${key}`) : null;
  if (!r || !r.ok) r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`);
  if (!r.ok) throw new Error("hoja " + r.status);
  const [, ...rows] = parseCSV(await r.text()); // quita la fila de títulos
  return rows;
}

// Archivos de la carpeta "Menús especiales" (PDF, fotos…), para enlazar por nombre.
async function archivos(folder, key) {
  if (!key) return [];
  const q = encodeURIComponent(`'${folder}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)&pageSize=100&key=${key}`);
  if (!r.ok) return [];
  return ((await r.json()).files || []).map((f) => ({ nombre: f.name.replace(/\.[a-z0-9]+$/i, ""), url: f.webViewLink }));
}

// Fechas "1/12/2026", "01-12-2026" o "2026-12-01" -> Date (día completo, hora de Madrid aprox.)
function fecha(t, finDeDia) {
  t = (t || "").trim(); if (!t) return null;
  let d, m, y, mm;
  if ((mm = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) [, y, m, d] = mm;
  else if ((mm = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))) { [, d, m, y] = mm; if (y.length === 2) y = "20" + y; }
  else return null;
  return new Date(Date.UTC(+y, +m - 1, +d, finDeDia ? 22 : -1, finDeDia ? 59 : 0));
}
const si = (v) => /^(s[ií]|si|yes|x|1|true|activo)$/i.test((v || "").trim());

async function fotos(folder, key) {
  if (!key) return [];
  const q = encodeURIComponent(`'${folder}' in parents and trashed=false and mimeType contains 'image/'`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,description)&orderBy=createdTime%20desc&pageSize=100&key=${key}`);
  if (!r.ok) return [];
  return ((await r.json()).files || []).map((f) => ({ id: f.id, nombre: f.name.replace(/\.[a-z0-9]+$/i, ""), texto: f.description || "" }));
}

// Día (en Madrid) de una fecha, para que el menú del día caduque solo a medianoche.
const diaMadrid = (t) => new Date(t).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });

// Último PDF o foto subido a la carpeta "Menú del día" (el más reciente manda).
async function ultimoArchivo(folder, key) {
  if (!key) return null;
  const q = encodeURIComponent(`'${folder}' in parents and trashed=false and (mimeType = 'application/pdf' or mimeType contains 'image/')`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime%20desc&pageSize=1&key=${key}`);
  if (!r.ok) return null;
  const f = ((await r.json()).files || [])[0];
  return f ? { id: f.id, nombre: f.name.replace(/\.[a-z0-9]+$/i, ""), pdf: f.mimeType === "application/pdf", url: f.webViewLink, fecha: f.createdTime } : null;
}
async function modificada(id, key) {
  if (!key) return null;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=modifiedTime&key=${key}`);
  return r.ok ? (await r.json()).modifiedTime : null;
}

export default async () => {
  const key = process.env.GOOGLE_PLACES_KEY;
  const out = {};
  const tareas = [
    hoja(HOJAS.carta, key).then((r) => (out.carta = r.filter((x) => x[0] && x[2]).map(([pestana, apartado, plato, desc = "", precio = ""]) => ({ pestana, apartado, plato, desc, precio })))),
    hoja(HOJAS.vinos, key).then((r) => (out.vinos = r.filter((x) => x[0] && x[2]).map(([tipo, denominacion, vino, uvas = "", bodega = "", precio = "", copa = ""]) => ({ tipo, denominacion, vino, uvas, bodega, precio, copa })))),
    fotos(CARPETAS.galeria, key).then((f) => (out.galeria = f)),
    Promise.all([hoja(HOJAS.menus, key), archivos(CARPETAS.menus, key)]).then(([rows, files]) => {
      const ahora = new Date();
      const norm = (x) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      out.menus = rows
        .filter((x) => x[0] && si(x[4]))
        .map(([titulo, desc = "", precio = "", enlace = "", , desde = "", hasta = ""]) => {
          const f = files.find((a) => norm(a.nombre) === norm(titulo));
          return { titulo, desc, precio, enlace: /^https?:\/\//.test(enlace.trim()) ? enlace.trim() : f?.url || "", desde: fecha(desde, false), hasta: fecha(hasta, true) };
        })
        .filter((m) => (!m.desde || m.desde <= ahora) && (!m.hasta || ahora <= m.hasta))
        .map(({ desde, hasta, ...m }) => m);
    }),
    fotos(CARPETAS.botellas, key).then((f) => (out.botellas = f)),
    // Menú del día en PDF/foto (carpeta) y fecha de la última edición de la hoja: la web enseña lo más reciente.
    // Un PDF/foto solo vale el día que se sube: al día siguiente, si no hay otro, el botón desaparece.
    ultimoArchivo(CARPETAS.dia, key).then((f) => (out.diaArchivo = f && diaMadrid(f.fecha) === diaMadrid(Date.now()) ? f : null)),
    // Menú del día: solo las filas con Activo = sí y dentro de Desde/Hasta. Si no queda ninguna, la pestaña no sale.
    Promise.all([hoja(HOJAS.dia, key), modificada(HOJAS.dia, key)]).then(([rows, editada]) => {
      const ahora = new Date();
      out.diaHoja = editada;
      // Filas sin fechas: valen solo el día en que se editó la hoja (como un menú del día). Con Desde/Hasta, mandan las fechas.
      const deHoy = editada && diaMadrid(editada) === diaMadrid(ahora);
      out.dia = rows
        .filter((x) => x[0] && x[1] && si(x[3]))
        .map(([apartado, plato, desc = "", , desde = "", hasta = ""]) => ({ apartado, plato, desc, desde: fecha(desde, false), hasta: fecha(hasta, true) }))
        .filter((m) => (m.desde || m.hasta ? (!m.desde || m.desde <= ahora) && (!m.hasta || ahora <= m.hasta) : deHoy))
        .map(({ desde, hasta, ...m }) => m);
    }),
  ];
  await Promise.allSettled(tareas);
  return new Response(JSON.stringify(out), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      // Los cambios de Cari se ven en unos 5 minutos.
      "Netlify-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
};

export const config = { path: "/api/carta" };
