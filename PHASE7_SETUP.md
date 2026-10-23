# Phase 7 — Testing, Cleanup & Single Active Device

## Changes
- One active login per account. Device B receives `409 LOGIN_CONFIRMATION_REQUIRED`, explicitly confirms in modal, then replaces A. Cancel leaves A active.
- Existing sessions before migration must re-login once. Session validation checks Turso for every protected API request.
- Vercel cron protected with `CRON_SECRET` daily at 03:00 UTC, prunes expired AuthRateLimit and ActiveLogin rows.
- Ably subscribe tokens expire after 60 seconds, limiting residual channel access after session revocation; active connections may remain until Ably detects expiry. This is not instantaneous disconnection.
- `ably` version pinned to 2.14.0 for Next.js Webpack compatibility.

## Before running
1. Backup Turso and code. Apply migration `prisma/migrations/20261018000000_active_login/migration.sql` ONCE to existing Turso database. This is a new table only.
2. Set `CRON_SECRET` in Vercel Environment Variables (and local `.env.local` if manually testing cron). Keep it secret.
3. `npm install`, `npx prisma generate`, `npx tsc --noEmit`, `npm run build`.
4. `npx vitest run`, `npx playwright install chromium`, `npx playwright test` (E2E needs local app + real test configuration).
5. Confirm Device A stays logged in if B cancels and A receives 401 after B confirms. Verify two simultaneous replacement attempts, logout from stale device, and room token renewal.
6. Use Vercel Cron only on compatible deployment plan; otherwise schedule authenticated GET externally once per day.

## Limitations
- Current `UserSession` replacement is last-writer-wins if multiple logins confirm concurrently; every request checks active hash, so at most one session remains valid. Test races in staging.
- Existing WebSocket channels are not forcibly closed; short-lived tokens minimize window but do not provide instant disconnect. For strict immediate Ably revocation, add channel-level presence/session IDs and force-disconnect support.
- Testing skeleton is NOT comprehensive coverage. Add integration tests against isolated Turso test DB, AI question review fixtures, upload fuzzing, and load tests before production.
- Environment is required to validate build and integration. Do not mark Phase 7 PASS based on supplied archive.
