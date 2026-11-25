import "../_proceso.js";
import funcion from "../../netlify/functions/resenas.mjs";
import { envolver } from "../_envolver.js";

export const onRequest = envolver(funcion, 86400);
