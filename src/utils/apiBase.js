/**
 * Base URL for Vercel serverless API routes (/api/*).
 * - Production: same origin as the app
 * - Local dev: VITE_API_URL if set, otherwise same origin (Vite proxies /api → deployed backend)
 */
export function getApiBase() {
  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return window.location.origin;
}
