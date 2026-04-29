/**
 * Input validation helpers for API routes.
 * Prevents malformed input from reaching external APIs or file system.
 */

const SYMBOL_RE = /^[A-Z0-9.^=]{1,15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MD_FILENAME_RE = /^[A-Za-z0-9._-]+\.md$/;

/** Validate & normalize a stock symbol. Returns null if invalid. */
export function validateSymbol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const sym = raw.trim().toUpperCase();
  return SYMBOL_RE.test(sym) ? sym : null;
}

/** Validate multiple comma-separated symbols. Returns null if any invalid. */
export function validateSymbols(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  const symbols = raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (symbols.length === 0) return null;
  if (symbols.some((s) => !SYMBOL_RE.test(s))) return null;
  return symbols;
}

/** Validate date string (YYYY-MM-DD). Returns null if invalid. */
export function validateDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return DATE_RE.test(raw) ? raw : null;
}

/** Validate .md filename (path-safe). Returns null if invalid. */
export function validateMdFilename(raw: string): string | null {
  if (!raw) return null;
  if (!MD_FILENAME_RE.test(raw)) return null;
  return raw;
}

/** Validate search query (max length). Returns null if invalid. */
export function validateSearchQuery(raw: string | null | undefined, maxLen = 100): string | null {
  if (!raw) return null;
  const q = raw.trim();
  if (q.length === 0 || q.length > maxLen) return null;
  return q;
}

/** Max prompt size for AI spawn (50KB) */
export const MAX_PROMPT_SIZE = 50_000;
