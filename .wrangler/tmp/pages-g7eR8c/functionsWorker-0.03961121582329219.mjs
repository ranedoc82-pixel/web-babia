var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _proceso.js
if (!globalThis.process)
  globalThis.process = { env: {} };
if (!globalThis.process.env)
  globalThis.process.env = {};

// ../netlify/functions/carta.mjs
var HOJAS = {
  carta: "1sIFhY6cnacitRKca16P62p7FRWlADJpMY1vtZeYTuDY",
  vinos: "1KPHcNX0Pz0EpILEjOtDIAPcvBkU_qSDY5NzvuihJbwU",
  menus: "1o6iSAe69a06wco1qKZOQTmFcby6T1RDExAWe6VKisqo",
  dia: "1J_pTeclf-dyr14PY2o2xCIYEtGmi_fM2cKY0g_2BJBA"
  // Menú del día
};
var CARPETAS = { galeria: "1ddVK5qhm-cB7R2i6aKD4RKT_n8PSGzRf", botellas: "1LZrwGVONohx5vkbtV1Fp2FjCBKzkB-1c", menus: "18mp-oYk13GvjxuDqE3biVZyJ24Z_Ksyz", dia: "1wfWSilptQq76f38DIbcSs5VRCLh_iXLy" };
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else
          q = false;
      } else
        cell += c;
    } else if (c === '"')
      q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n")
        i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else
      cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x));
}
__name(parseCSV, "parseCSV");
async function hoja(id, key) {
  let r = key ? await fetch(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/csv&key=${key}`) : null;
  if (!r || !r.ok)
    r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`);
  if (!r.ok)
    throw new Error("hoja " + r.status);
  const [, ...rows] = parseCSV(await r.text());
  return rows;
}
__name(hoja, "hoja");
async function archivos(folder, key) {
  if (!key)
    return [];
  const q = encodeURIComponent(`'${folder}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)&pageSize=100&key=${key}`);
  if (!r.ok)
    return [];
  return ((await r.json()).files || []).map((f) => ({ nombre: f.name.replace(/\.[a-z0-9]+$/i, ""), url: f.webViewLink }));
}
__name(archivos, "archivos");
function fecha(t, finDeDia) {
  t = (t || "").trim();
  if (!t)
    return null;
  let d, m, y, mm;
  if (mm = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))
    [, y, m, d] = mm;
  else if (mm = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/)) {
    [, d, m, y] = mm;
    if (y.length === 2)
      y = "20" + y;
  } else
    return null;
  return new Date(Date.UTC(+y, +m - 1, +d, finDeDia ? 22 : -1, finDeDia ? 59 : 0));
}
__name(fecha, "fecha");
var si = /* @__PURE__ */ __name((v) => /^(s[ií]|si|yes|x|1|true|activo)$/i.test((v || "").trim()), "si");
async function fotos(folder, key) {
  if (!key)
    return [];
  const q = encodeURIComponent(`'${folder}' in parents and trashed=false and mimeType contains 'image/'`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,description)&orderBy=createdTime%20desc&pageSize=100&key=${key}`);
  if (!r.ok)
    return [];
  return ((await r.json()).files || []).map((f) => ({ id: f.id, nombre: f.name.replace(/\.[a-z0-9]+$/i, ""), texto: f.description || "" }));
}
__name(fotos, "fotos");
var diaMadrid = /* @__PURE__ */ __name((t) => new Date(t).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }), "diaMadrid");
async function ultimoArchivo(folder, key) {
  if (!key)
    return null;
  const q = encodeURIComponent(`'${folder}' in parents and trashed=false and (mimeType = 'application/pdf' or mimeType contains 'image/')`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime%20desc&pageSize=1&key=${key}`);
  if (!r.ok)
    return null;
  const f = ((await r.json()).files || [])[0];
  return f ? { id: f.id, nombre: f.name.replace(/\.[a-z0-9]+$/i, ""), pdf: f.mimeType === "application/pdf", url: f.webViewLink, fecha: f.createdTime } : null;
}
__name(ultimoArchivo, "ultimoArchivo");
async function modificada(id, key) {
  if (!key)
    return null;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=modifiedTime&key=${key}`);
  return r.ok ? (await r.json()).modifiedTime : null;
}
__name(modificada, "modificada");
var carta_default = /* @__PURE__ */ __name(async () => {
  const key = process.env.GOOGLE_PLACES_KEY;
  const out = {};
  const tareas = [
    hoja(HOJAS.carta, key).then((r) => out.carta = r.filter((x) => x[0] && x[2]).map(([pestana, apartado, plato, desc = "", precio = ""]) => ({ pestana, apartado, plato, desc, precio }))),
    hoja(HOJAS.vinos, key).then((r) => out.vinos = r.filter((x) => x[0] && x[2]).map(([tipo, denominacion, vino, uvas = "", bodega = "", precio = "", copa = ""]) => ({ tipo, denominacion, vino, uvas, bodega, precio, copa }))),
    fotos(CARPETAS.galeria, key).then((f) => out.galeria = f),
    Promise.all([hoja(HOJAS.menus, key), archivos(CARPETAS.menus, key)]).then(([rows, files]) => {
      const ahora = /* @__PURE__ */ new Date();
      const norm = /* @__PURE__ */ __name((x) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(), "norm");
      out.menus = rows.filter((x) => x[0] && si(x[4])).map(([titulo, desc = "", precio = "", enlace = "", , desde = "", hasta = ""]) => {
        const f = files.find((a) => norm(a.nombre) === norm(titulo));
        return { titulo, desc, precio, enlace: /^https?:\/\//.test(enlace.trim()) ? enlace.trim() : f?.url || "", desde: fecha(desde, false), hasta: fecha(hasta, true) };
      }).filter((m) => (!m.desde || m.desde <= ahora) && (!m.hasta || ahora <= m.hasta)).map(({ desde, hasta, ...m }) => m);
    }),
    fotos(CARPETAS.botellas, key).then((f) => out.botellas = f),
    // Menú del día en PDF/foto (carpeta) y fecha de la última edición de la hoja: la web enseña lo más reciente.
    // Un PDF/foto solo vale el día que se sube: al día siguiente, si no hay otro, el botón desaparece.
    ultimoArchivo(CARPETAS.dia, key).then((f) => out.diaArchivo = f && diaMadrid(f.fecha) === diaMadrid(Date.now()) ? f : null),
    // Menú del día: solo las filas con Activo = sí y dentro de Desde/Hasta. Si no queda ninguna, la pestaña no sale.
    Promise.all([hoja(HOJAS.dia, key), modificada(HOJAS.dia, key)]).then(([rows, editada]) => {
      const ahora = /* @__PURE__ */ new Date();
      out.diaHoja = editada;
      const deHoy = editada && diaMadrid(editada) === diaMadrid(ahora);
      out.dia = rows.filter((x) => x[0] && x[1] && si(x[3])).map(([apartado, plato, desc = "", , desde = "", hasta = ""]) => ({ apartado, plato, desc, desde: fecha(desde, false), hasta: fecha(hasta, true) })).filter((m) => m.desde || m.hasta ? (!m.desde || m.desde <= ahora) && (!m.hasta || ahora <= m.hasta) : deHoy).map(({ desde, hasta, ...m }) => m);
    })
  ];
  await Promise.allSettled(tareas);
  return new Response(JSON.stringify(out), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      // Los cambios de Cari se ven en unos 5 minutos.
      "Netlify-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600"
    }
  });
}, "default");

// _envolver.js
function envolver(funcion, segundos) {
  return async (ctx) => {
    Object.assign(globalThis.process.env, ctx.env || {});
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const clave = new Request(ctx.request.url, { method: "GET" });
    if (cache && segundos) {
      const guardada = await cache.match(clave);
      if (guardada)
        return guardada;
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
__name(envolver, "envolver");

// api/carta.js
var onRequest = envolver(carta_default, 300);

// ../netlify/functions/foto.mjs
var foto_default = /* @__PURE__ */ __name(async (req) => {
  const id = new URL(req.url).searchParams.get("id") || "";
  const w = Math.min(parseInt(new URL(req.url).searchParams.get("w") || "1600", 10) || 1600, 2400);
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id))
    return new Response("Foto no v\xE1lida", { status: 400 });
  const key = process.env.GOOGLE_PLACES_KEY;
  const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=mimeType,thumbnailLink,parents&key=${key}`);
  if (!meta.ok)
    return new Response("No encontrada", { status: 404 });
  const m = await meta.json();
  const pdf = m.mimeType === "application/pdf";
  if (!pdf && !String(m.mimeType || "").startsWith("image/"))
    return new Response("No es una imagen", { status: 400 });
  let r = null;
  if (m.thumbnailLink) {
    try {
      r = await fetch(m.thumbnailLink.replace(/=s\d+$/, `=w${w}`));
    } catch {
      r = null;
    }
  }
  if ((!r || !r.ok) && pdf)
    return new Response("Sin vista previa", { status: 404 });
  if (!r || !r.ok)
    r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}`);
  if (!r.ok)
    return new Response("No disponible", { status: 502 });
  return new Response(r.body, {
    headers: {
      "Content-Type": r.headers.get("content-type") || m.mimeType,
      "Cache-Control": "public, max-age=86400",
      "Netlify-CDN-Cache-Control": "public, s-maxage=604800, stale-while-revalidate=604800"
    }
  });
}, "default");

// api/foto.js
var onRequest2 = envolver(foto_default, 604800);

// ../netlify/functions/resenas.mjs
var PLACE_ID = process.env.GOOGLE_PLACE_ID || "ChIJc13xeywdQA0RwiYqPs6eH0c";
var FIELDS = ["id", "displayName", "formattedAddress", "rating", "userRatingCount", "googleMapsUri", "reviews", "regularOpeningHours"];
var QUERY = "El Jard\xEDn de Babia, Calle Leonardo da Vinci 9, Talavera de la Reina";
var resenas_default = /* @__PURE__ */ __name(async () => {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key)
    return json({ error: "Falta la clave GOOGLE_PLACES_KEY" }, 500, 60);
  try {
    let place;
    if (PLACE_ID) {
      const r = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=es`, {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS.join(",") }
      });
      place = await r.json();
    } else {
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": FIELDS.map((f) => "places." + f).join(",")
        },
        body: JSON.stringify({ textQuery: QUERY, languageCode: "es", maxResultCount: 1 })
      });
      place = (await r.json()).places?.[0];
    }
    if (!place || place.error)
      return json({ error: "No se encontr\xF3 el local en Google", detail: place?.error?.message }, 502, 300);
    const reviews = (place.reviews || []).filter((v) => v.rating === 5 && (v.originalText?.text || v.text?.text)).map((v) => ({
      estrellas: 5,
      texto: (v.originalText?.text || v.text?.text).trim(),
      autor: v.authorAttribution?.displayName || "Cliente de Google",
      fecha: v.relativePublishTimeDescription || ""
    }));
    return json({ nombre: place.displayName?.text, direccion: place.formattedAddress, reviews, horario: place.regularOpeningHours?.weekdayDescriptions || [], rating: place.rating, total: place.userRatingCount, mapsUri: place.googleMapsUri, placeId: place.id }, 200, 86400);
  } catch (e) {
    return json({ error: "No se pudo conectar con Google" }, 502, 300);
  }
}, "default");
function json(body, status, maxAge) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Netlify guarda la respuesta unas horas: así casi no se gastan consultas a Google.
      "Cache-Control": "public, max-age=600",
      "Netlify-CDN-Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=172800`
    }
  });
}
__name(json, "json");

// api/resenas.js
var onRequest3 = envolver(resenas_default, 86400);

// ../.wrangler/tmp/pages-g7eR8c/functionsRoutes-0.5320032960106515.mjs
var routes = [
  {
    routePath: "/api/carta",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/foto",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/resenas",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  }
];

// ../../../../../tmp/wr/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../../tmp/wr/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../../tmp/wr/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../tmp/wr/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-M72sX0/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../../tmp/wr/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-M72sX0/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.03961121582329219.mjs.map
