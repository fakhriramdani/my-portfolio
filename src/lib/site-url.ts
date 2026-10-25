/**
 * Resolve the deploy-time base URL (BR-016, OQ-001).
 * - Value comes from `SITE_URL` env; no hardcoded host in the repo.
 * - An optional single trailing `/` is normalized away, then exactly one `/`
 *   is appended so every absolute URL for `/` ends with exactly one `/`.
 * - Local dev (no `SITE_URL`, not CI) falls back to `http://localhost:3000`.
 */
export function resolveSiteUrl(): string {
  const raw = process.env.SITE_URL;
  if (!raw) return "http://localhost:3000/";
  return raw.trim().replace(/\/+$/, "") + "/";
}
