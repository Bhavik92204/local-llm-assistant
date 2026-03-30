/**
 * Normalize FastAPI / generic JSON errors into a single user-facing string.
 */

export function parseApiError(status: number, body: unknown): string {
  if (body == null || typeof body !== "object") {
    return `Request failed (HTTP ${status}).`;
  }
  const o = body as Record<string, unknown>;
  const detail = o.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === "object" && item !== null && "msg" in item) {
        const msg = (item as { msg?: string }).msg;
        const loc = (item as { loc?: unknown }).loc;
        const where = Array.isArray(loc) ? loc.join(".") : "";
        return where ? `${where}: ${msg}` : String(msg);
      }
      return JSON.stringify(item);
    });
    return parts.join(" · ") || `Validation failed (HTTP ${status}).`;
  }
  if (typeof detail === "object" && detail !== null) {
    return JSON.stringify(detail);
  }
  if ("message" in o && typeof o.message === "string") {
    return o.message;
  }
  return `Request failed (HTTP ${status}).`;
}

export async function errorTextFromResponse(r: Response): Promise<string> {
  const raw = await r.text();
  if (!raw.trim()) {
    return r.statusText || `HTTP ${r.status}`;
  }
  try {
    return parseApiError(r.status, JSON.parse(raw) as unknown);
  } catch {
    return raw.slice(0, 500);
  }
}
