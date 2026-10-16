# QuizVerse AI Phase 6 — Community & Multiplayer (MVP)

## Setup
1. Back up your Turso database. Do not run development migrate-reset against production.
2. In project folder run `npm ci` then `npx prisma generate`.
3. Run `npx prisma migrate deploy` against your configured `LOCAL_DATABASE_URL`; use the existing Turso migration workflow already configured by your environment. Inspect migration first.
4. `npm run dev`; open `/community` after Firebase login.

## Functions delivered
- Public/unlisted/private sharing; public library paginated search/difficulty sorting.
- Play community quiz: grading computed on server; correct answers are never sent by public quiz GET endpoint.
- Quiz room for up to 10 players; server timestamp 30s per question; score updates by atomic database changes.
- Leaderboard and user profile; XP + levels and two achievements awarded after finishing room; reward idempotence on repeat calls.
- Refresh/polling every 2 seconds. **This is near-realtime polling, not WebSocket realtime**. For production scale deploy managed realtime channel (e.g. Ably) and event fan-out.

## Current limitations before production
- Multiplayer room is synchronous by server-start timestamp; late join disabled.
- Player time is shown based on local clock; server validates the question slot, preventing client clock cheating, but not latency compensation.
- XP award and completion flag now commit in the same database transaction; repeat finish calls are idempotent. Add a dedicated reward ledger if additional reward sources are introduced.
- Competition uses fixed 100 points per correct answer; ties share score; no speed bonus.
- Users can report public Quiz content; human moderation dashboard and automated enforcement are not implemented.
- Existing legacy `/api/attempts` accepts client-submitted score, so **never use it for competitive leaderboards or XP**.
- `unlisted` links are discoverable by ID and are not permission grants for secrecy; use `private` for sensitive Quiz.
- No load/performance/security audit completed; test manually in two distinct Firebase accounts and browsers.

## Smoke tests
1. User A shares own quiz to `public`; public library shows it, filter and sort work.
2. User B opens the Quiz, submits wrong answers, sees correct score from server.
3. User B cannot PATCH quiz owned by A; private quiz cannot be read by B.
4. User A creates room, B joins; only host starts when >=2 users.
5. Answer in current 30-second slot; repeated submission is rejected, score increments only once.
6. At final deadline, both clients fetch finished results and claim XP once.
7. Profile achievements and XP survive reload; leaderboard updates.
8. Retest Phase 1–5 after schema migration.
