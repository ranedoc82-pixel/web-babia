// Sirve una foto de la carpeta compartida "Web Babia" de Drive (galería o botellas).
export default async (req) => {
  const id = new URL(req.url).searchParams.get("id") || "";
  const w = Math.min(parseInt(new URL(req.url).searchParams.get("w") || "1600", 10) || 1600, 2400);
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) return new Response("Foto no válida", { status: 400 });
  const key = process.env.GOOGLE_PLACES_KEY;
  // Miniatura del tamaño pedido (más ligera); si no hay, el archivo original.
  const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=mimeType,thumbnailLink,parents&key=${key}`);
  if (!meta.ok) return new Response("No encontrada", { status: 404 });
  const m = await meta.json();
  const pdf = m.mimeType === "application/pdf"; // de un PDF se sirve la vista previa de la primera página
  if (!pdf && !String(m.mimeType || "").startsWith("image/")) return new Response("No es una imagen", { status: 400 });
  let r = null;
  if (m.thumbnailLink) { try { r = await fetch(m.thumbnailLink.replace(/=s\d+$/, `=w${w}`)); } catch { r = null; } }
  if ((!r || !r.ok) && pdf) return new Response("Sin vista previa", { status: 404 });
  if (!r || !r.ok) r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}`);
  if (!r.ok) return new Response("No disponible", { status: 502 });
  return new Response(r.body, {
    headers: {
      "Content-Type": r.headers.get("content-type") || m.mimeType,
      "Cache-Control": "public, max-age=86400",
      "Netlify-CDN-Cache-Control": "public, s-maxage=604800, stale-while-revalidate=604800",
    },
  });
};
export const config = { path: "/api/foto" };
