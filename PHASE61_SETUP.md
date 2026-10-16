# QuizVerse AI — Phase 6.1 (incremental update)

## What was implemented
- Review: default all due topics; topic selector and counts. GET `/api/learning` returns `dueByTopic`. For now up to 500 due cards are fetched at once; large-scale pagination is a future improvement.
- Host chooses seconds per question (5–3600 permitted server-side; UI provides presets) and maximum participants (positive safe integer >=2, not hardcoded to 10). Existing rooms default to 30 seconds and 10 participants for backwards compatibility. New rooms use the submitted settings.
- Room timer and server answer cutoff use stored `secondsPerQuestion`; lobby and room header show configured capacity.
- Removed the 2-second polling text from room leaderboard (polling mechanism remains intact).
- Admin moderation `/community/admin`, `COMMUNITY_ADMIN_USER_IDS` = comma separated **internal database user IDs** (as returned from currentUser.id, *not necessarily Firebase UID*). Admin can dismiss reports or hide reported Quiz. Unauthorized requests return 403. No secret should be exposed through NEXT_PUBLIC_* variables.

## Required database migration
`prisma/migrations/20261017000000_room_settings/migration.sql` adds two QuizRoom columns (non-destructive):
```sql
ALTER TABLE "QuizRoom" ADD COLUMN "secondsPerQuestion" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "QuizRoom" ADD COLUMN "maxParticipants" INTEGER NOT NULL DEFAULT 10;
```
Apply ONCE to the intended Turso DB after backup (not to the backups). From WSL and repository root:
```bash
turso db shell quizverse-ai "$(cat prisma/migrations/20261017000000_room_settings/migration.sql)"
```
Check new columns with `turso db shell quizverse-ai 'PRAGMA table_info("QuizRoom");'`.
**Do not run `prisma migrate reset`.** Keep existing `.env.local`, Prisma configuration, Firebase configuration and source backups.

## Build/test
```powershell
npm install
npx prisma generate
npx tsc --noEmit
npm run build
npm run dev
```
Test review filtering, 15s and 60s per question, 2 and >10 seats, invalid capacity, concurrent joins, reconnect and XP idempotency, moderator auth/visibility and Phase1–6 regressions.

## Not yet complete
Realtime WebSocket/Ably is NOT implemented here. Rooms still poll every 2 seconds, and large-scale rooms need load testing. Do not treat Phase 6.1 as production-ready until service configuration, tests, concurrent-join verification and moderation audit logging are complete. Automatic `AuthRateLimit` cleanup remains scheduled for production deployment, not implemented here.
