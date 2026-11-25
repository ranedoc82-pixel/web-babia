# El Jardín de Babia · web

Web del restaurante El Jardín de Babia (C. Leonardo da Vinci 9, Talavera de la Reina).

- `index.html`: la web (una sola página).
- `netlify/functions/carta.mjs` → `/api/carta`: lee de Google Drive (carpeta "Web Babia") la carta, los vinos, los menús especiales y las fotos. Caché de 5 minutos.
- `netlify/functions/resenas.mjs` → `/api/resenas`: valoración, reseñas de 5★ y horario de Google Maps. Caché de 24 horas.
- `netlify/functions/foto.mjs` → `/api/foto`: muestra las fotos de Drive.
- Hoja "Menú del día - Web Babia": pestaña "Menú del día" en la carta y botón en la portada; se oculta si no hay filas con Activo = sí.
- `respaldo.json`: copia de la carta y los vinos por si Drive no responde.

Necesita la variable `GOOGLE_PLACES_KEY` en Netlify (con Places API y Drive API activadas).

## Cloudflare Pages

La web se sirve desde Cloudflare Pages (gratis, sin límite de créditos). La carpeta `functions/api` adapta las mismas funciones de `netlify/functions` a Cloudflare (`/api/carta`, `/api/foto`, `/api/resenas`) y guarda sus respuestas en la caché de Cloudflare. En Cloudflare hay que poner la variable `GOOGLE_PLACES_KEY` (Settings → Variables and Secrets).
