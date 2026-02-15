export function ok(res, data = {}, extras = {}) {
  return res.json({ ok: true, ...extras, ...data });
}

export function fail(res, statusCode, message, extras = {}) {
  return res.status(statusCode).json({ ok: false, message, ...extras });
}

export function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function toDecimal(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toDateInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return raw.slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}
