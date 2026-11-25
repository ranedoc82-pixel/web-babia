// Adapta las funciones de netlify/functions a Cloudflare Pages:
// pasa las variables (GOOGLE_PLACES_KEY…) y guarda la respuesta en la caché de Cloudflare
// para no gastar consultas a Google en cada visita.
export function envolver(funcion, segundos) {
  return async (ctx) => {
    Object.assign(globalThis.process.env, ctx.env || {});
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const clave = new Request(ctx.request.url, { method: "GET" });
    if (cache && segundos) {
      const guardada = await cache.match(clave);
      if (guardada) return guardada;
    }
    const r = await funcion(ctx.request);
    if (cache && segundos && r.ok) {
      const copia = new Response(r.clone().body, r);
      copia.headers.set("Cache-Control", "public, s-maxage=" + segundos);
      ctx.waitUntil(cache.put(clave, copia));
    }
    return r;
  };
}
