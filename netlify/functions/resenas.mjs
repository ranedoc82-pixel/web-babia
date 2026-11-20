// Devuelve las reseñas de Google de El Jardín de Babia (solo las de 5 estrellas).
// Necesita la variable de entorno GOOGLE_PLACES_KEY en Netlify.
// Ficha de Google de El Jardín de Babia (Talavera de la Reina). Se puede cambiar con GOOGLE_PLACE_ID.
const PLACE_ID = process.env.GOOGLE_PLACE_ID || "ChIJc13xeywdQA0RwiYqPs6eH0c";
const FIELDS = ["id", "displayName", "formattedAddress", "rating", "userRatingCount", "googleMapsUri", "reviews", "regularOpeningHours"];
const QUERY = "El Jardín de Babia, Calle Leonardo da Vinci 9, Talavera de la Reina";

export default async () => {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return json({ error: "Falta la clave GOOGLE_PLACES_KEY" }, 500, 60);

  try {
    let place;
    if (PLACE_ID) {
      const r = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=es`, {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS.join(",") },
      });
      place = await r.json();
    } else {
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": FIELDS.map((f) => "places." + f).join(","),
        },
        body: JSON.stringify({ textQuery: QUERY, languageCode: "es", maxResultCount: 1 }),
      });
      place = (await r.json()).places?.[0];
    }
    if (!place || place.error) return json({ error: "No se encontró el local en Google", detail: place?.error?.message }, 502, 300);

    const reviews = (place.reviews || [])
      .filter((v) => v.rating === 5 && (v.originalText?.text || v.text?.text))
      .map((v) => ({
        estrellas: 5,
        texto: (v.originalText?.text || v.text?.text).trim(),
        autor: v.authorAttribution?.displayName || "Cliente de Google",
        fecha: v.relativePublishTimeDescription || "",
      }));

    return json({ nombre: place.displayName?.text, direccion: place.formattedAddress, reviews, horario: place.regularOpeningHours?.weekdayDescriptions || [], rating: place.rating, total: place.userRatingCount, mapsUri: place.googleMapsUri, placeId: place.id }, 200, 86400);
  } catch (e) {
    return json({ error: "No se pudo conectar con Google" }, 502, 300);
  }
};

function json(body, status, maxAge) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Netlify guarda la respuesta unas horas: así casi no se gastan consultas a Google.
      "Cache-Control": "public, max-age=600",
      "Netlify-CDN-Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=172800`,
    },
  });
}

export const config = { path: "/api/resenas" };
