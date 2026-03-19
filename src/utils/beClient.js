/**
 * Sentinel AI — Backend client
 *
 * All calls to the FastAPI backend go through beFetch() so the
 * X-Sentinel-Key auth header is always attached automatically.
 *
 * Env vars (set in .env.local for dev, in Vercel dashboard for prod):
 *   VITE_API_URL     = https://your-app.railway.app
 *   VITE_API_SECRET  = ssk_66553f0be2dffee4bd27e48924562831ffdbffcbc6606713ce5c1aa1ea2f091e
 */

export const BE_URL = import.meta.env.VITE_API_URL    || "";
export const BE_KEY = import.meta.env.VITE_API_SECRET || "";

/**
 * Authenticated fetch to the backend.
 * Rejects immediately if VITE_API_URL is not configured.
 *
 * @param {string} path  - e.g. "/api/maritime/vessels"
 * @param {RequestInit} opts - standard fetch options (merged, headers extended)
 * @returns {Promise<Response>}
 */
export function beFetch(path, opts = {}) {
  if (!BE_URL) return Promise.reject(new Error("VITE_API_URL not configured"));
  return fetch(`${BE_URL}${path}`, {
    ...opts,
    headers: {
      "X-Sentinel-Key": BE_KEY,
      ...opts.headers,
    },
  });
}
