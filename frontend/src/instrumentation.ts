/**
 * Next.js instrumentation hook — ported verbatim in behavior from OLD
 * `src/instrumentation.ts` (P1-21 XC-TZ frontend half, pass6 K-2).
 *
 * The app is Greek-only: every server-side date display / day-boundary
 * calculation must run in Europe/Athens, not the container's UTC default.
 * Without this, server-rendered message times (UTC) differ from the Greek
 * browser's (Athens) and /dashboard/messages* throws a hydration error on
 * every load. Setting process.env.TZ is re-read by Node's ICU-backed Date
 * methods on every subsequent call. Browser code is unaffected.
 */
if (process.env.NEXT_RUNTIME === 'nodejs') {
  process.env.TZ = 'Europe/Athens';
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.env.TZ = 'Europe/Athens';
  }
}
