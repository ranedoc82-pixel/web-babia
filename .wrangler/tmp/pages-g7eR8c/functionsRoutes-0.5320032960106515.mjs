import { onRequest as __api_carta_js_onRequest } from "/home/claude/webs/web-babia/functions/api/carta.js"
import { onRequest as __api_foto_js_onRequest } from "/home/claude/webs/web-babia/functions/api/foto.js"
import { onRequest as __api_resenas_js_onRequest } from "/home/claude/webs/web-babia/functions/api/resenas.js"

export const routes = [
    {
      routePath: "/api/carta",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_carta_js_onRequest],
    },
  {
      routePath: "/api/foto",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_foto_js_onRequest],
    },
  {
      routePath: "/api/resenas",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_resenas_js_onRequest],
    },
  ]