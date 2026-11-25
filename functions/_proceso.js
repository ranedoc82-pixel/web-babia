// Las funciones de netlify/functions leen process.env; en Cloudflare se lo damos aquí.
if (!globalThis.process) globalThis.process = { env: {} };
if (!globalThis.process.env) globalThis.process.env = {};
