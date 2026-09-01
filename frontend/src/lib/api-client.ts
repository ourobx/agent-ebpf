import createClient from "openapi-fetch";
import type { paths } from "@/types/api";

// Server-side (SSR) calls route through internal container network, Client calls through public URL
const baseUrl = typeof window === "undefined"
  ? (process.env.INTERNAL_API_URL || "http://127.0.0.1:8000")
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

export const api = createClient<paths>({ baseUrl });
export default api;
