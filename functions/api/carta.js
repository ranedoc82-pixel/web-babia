import "../_proceso.js";
import funcion from "../../netlify/functions/carta.mjs";
import { envolver } from "../_envolver.js";

export const onRequest = envolver(funcion, 300);
