# QuizVerse AI — Hướng dẫn tổng hợp (Phase 1–6.1)

> **README chính — cập nhật đến Phase 6.1 (TC05 đang cần kiểm thử).** Các mục Phase 1–5 và hướng dẫn cũ ở phụ lục là tài liệu lịch sử. Khi có khác biệt, ưu tiên cấu hình hiện tại và các mục Phase 6/6.1 bên dưới. Project dùng Next.js, Firebase Authentication, Turso + Prisma, Gemini; bản TC05 đã bổ sung mã tích hợp Ably nhưng chưa xác nhận build/kiểm thử thực tế.

## Tính năng hiện tại

- **Phase 1–2:** Giao diện Prism, tạo/làm Quiz, thư viện và dữ liệu Turso/Prisma.
- **Phase 2.5:** Firebase Email/Password, xác minh email, Google Login, phiên đăng nhập và phân quyền riêng theo người dùng.
- **Phase 3:** Tạo Quiz từ chủ đề, văn bản, PDF/DOCX/TXT/URL; upload tài liệu đến 20 MiB; phân tích tài liệu dài; sinh câu hỏi theo batch và JSON schema, có kiểm tra và chỉnh sửa trước khi lưu.
- **Phase 4:** Quiz Engine, thời gian, chấm điểm, giải thích, LaTeX, sửa/xóa Quiz trong thư viện, biểu đồ thống kê và lịch sử.
- **Phase 5:** Topic Mastery, gợi ý độ khó cho Quiz tiếp theo, ôn tập theo lịch, AI Tutor và Learning Analytics.
- **Phase 6:** Thư viện Quiz cộng đồng, chế độ private/unlisted/public, Quiz Room, XP, cấp độ, thành tựu, bảng xếp hạng và báo cáo Quiz.
- **Phase 6.1:** Lọc ôn tập theo chủ đề, cấu hình thời gian/công suất phòng, quản trị báo cáo; TC05 thêm mã tích hợp Ably Realtime (cần cài và kiểm thử).

## Cấu hình hiện tại

1. Giữ bí mật `.env.local`, không commit hoặc chia sẻ. Bản ZIP không thay cho file môi trường đang chạy trên máy bạn.
2. Duy trì các biến Turso/Prisma và Firebase client/Admin đã cấu hình ở Phase 2.5.
3. Cấu hình Gemini server-side theo model **thực sự khả dụng với project của bạn**, chẳng hạn:

```env
GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"
GEMINI_MODEL="gemini-3.5-flash-lite"
GEMINI_FALLBACK_MODEL="gemini-3.8-flash"
```

Các model có thể thay đổi tính khả dụng hoặc quota; tên model ở đây là cấu hình từng được dùng trong dự án, không phải bảo đảm chúng luôn hoạt động. Không thêm `NEXT_PUBLIC_` cho Gemini key hoặc Firebase Admin private key.

## Nâng cấp từ Phase 4 lên Phase 5

1. **Sao lưu** source Phase 4 và database Turso trước khi thao tác.
2. Copy source Phase 5, `prisma/schema.prisma` và migration mới vào project hiện có; **giữ nguyên `.env.local`**, các migration cũ và thư mục `.git`.
3. Trong Ubuntu WSL, tại thư mục root project, **đọc migration trước khi chạy**:

```bash
cat prisma/migrations/20261015000000_adaptive_learning/migration.sql
turso db shell quizverse-ai < prisma/migrations/20261015000000_adaptive_learning/migration.sql
```

Chỉ chạy migration một lần. Trước khi chạy hãy kiểm tra chưa có bảng tương ứng trong database.

4. Trong PowerShell tại root project:

```powershell
npm install
npx prisma generate
npx tsc --noEmit
npm run dev
```

5. Xác nhận schema Turso:

```sql
SELECT name FROM sqlite_master
WHERE type='table' AND name IN ('TopicMastery','ReviewCard','LearningSubmission');
```

## Kiểm thử Phase 5

| TC | Kiểm thử |
|---|---|
| TC01 | Nộp Quiz có đáp án sai → cập nhật mastery và câu đến hạn |
| TC02 | Làm bài thêm lần nữa → mức thành thạo thay đổi, không ghi trùng submission |
| TC03 | Tạo Quiz thích ứng → chủ đề/độ khó được gợi ý |
| TC04 | Ôn tập câu sai → cập nhật lịch ôn |
| TC05 | AI Tutor giải thích câu sai; kiểm tra hạn mức 15 lượt/giờ |
| TC06 | Tài khoản khác không thể đọc/sửa dữ liệu học tập |
| TC07 | Reload và đăng nhập lại → dữ liệu còn nguyên |
| TC08 | Regression Phase 4: chỉnh sửa/xóa Quiz, chấm điểm, Google Login, LaTeX, biểu đồ |

## Giới hạn và lưu ý bảo mật

- Mastery là ước tính theo kết quả bài làm; độ khó **được đề xuất cho Quiz tiếp theo**, chưa tự thay đổi giữa các câu đang làm.
- Spaced repetition là thuật toán đơn giản, chưa phải SM-2 đầy đủ.
- Nội dung Tutor và câu hỏi AI có thể sai; người học nên đối chiếu nguồn.
- Tài liệu rất dài có thể cần nhiều request, chịu hạn mức Gemini; PDF scan chưa hỗ trợ OCR.
- Xóa Quiz có thể xóa theo Attempt liên quan theo schema Cascade; luôn xác nhận trước khi xóa.
- Với môi trường production, điểm bài làm cần được chấm tại server dựa trên câu trả lời, không tin điểm client tự gửi; cần bảo vệ answer keys và kiểm tra quota AI.

---

## Trạng thái kiểm thử gần nhất (16/10/2026)

| TC Phase 6.1 | Tình trạng |
|---|---|
| TC01 — Ôn tập theo chủ đề, dọn dữ liệu trùng | PASS theo xác nhận người kiểm thử |
| TC02 — Thời gian mỗi câu | PASS theo xác nhận người kiểm thử |
| TC03 — Số người tham gia | PASS theo xác nhận người kiểm thử |
| TC04 — Giao diện Room và Leaderboard | PASS theo xác nhận người kiểm thử |
| TC05 — Ably realtime và reconnect | Đã bổ sung mã; **chưa xác nhận build và chưa PASS** |
| TC06–TC08 — Moderation, security, regression | Chưa xác nhận |

> **Lưu ý phiên bản:** Tài liệu Phase 6 gốc dưới đây được giữ để tra cứu lịch sử, nên có mô tả cũ về giới hạn 10 người, thời gian 30 giây, polling 2 giây và dashboard chưa có. Ở Phase 6.1, chủ phòng đã có thể cấu hình sức chứa và thời gian; giao diện quản trị đã được bổ sung; bản TC05 mới có mã realtime và fallback polling. Không dùng các giới hạn cũ làm thông số hiện tại.

## Thiết lập nhanh bản hiện tại

1. Sao lưu source và Turso, giữ nguyên `.env.local`, `.git`. **Không chạy lại migration đã áp dụng hoặc `prisma migrate reset`.**
2. Các migration Phase 6 và Phase 6.1 (chỉ áp dụng một lần trên database cần nâng cấp):
   - `prisma/migrations/20261016000000_community_multiplayer/migration.sql`
   - `prisma/migrations/20261016010000_quiz_reports/migration.sql`
   - `prisma/migrations/20261017000000_room_settings/migration.sql`
3. Nếu dùng TC05 realtime, điền `ABLY_API_KEY` vào `.env.local` của máy chạy server; **không commit** key.
4. Chạy `npm install`, `npx prisma generate`, `npx tsc --noEmit`, `npm run build`, sau đó `npm run dev`.
5. TC05 chỉ PASS sau khi kiểm thử hai tài khoản, sự kiện realtime, mất mạng/reconnect và làm mới trang.

## Chi tiết Phase 6 và Phase 6.1 (hợp nhất từ tài liệu riêng)

### Phase 6 — Thiết lập cộng đồng & multiplayer (tài liệu gốc)

QuizVerse AI Phase 6 — Community & Multiplayer (MVP)

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

### Phase 6 — Nhật ký triển khai (lưu lịch sử)

QuizVerse AI Phase 6 — implementation status

This update is built on the uploaded Phase 6 MVP (which contains Phase 1–5 source). It is **not production-certified**.

## Present functionality
- Public/unlisted/private quiz sharing, public library, search/filters, server-side grading.
- Quiz rooms (up to 10 players), common start clock, answer submission, server-side point totals.
- XP, level, first room / first 100 XP achievements, user leaderboard.
- Room state and ranking refreshed every 2 seconds; this is **polling**, not a managed WebSocket realtime service.
- User-generated public quiz reporting (`QuizReport` and `POST /api/community/reports`). Reports are stored; admin review queue is not implemented.
- Room completion claim and XP award have been made atomic with a single Prisma transaction.

## Database changes
Apply both existing `20261016000000_community_multiplayer` and new `20261016010000_quiz_reports` migrations **once**, using the project's documented Turso workflow. Back up the live database first.

## Remaining work before marking Phase 6 PASS
- Connect a managed realtime transport (Ably/Pusher/WebSocket service), lifecycle/reconnect tests on deployment.
- Add an administrator moderation dashboard, reports review and takedown rules.
- Load/concurrency testing, cheating abuse testing, full regression 1–5 on deployed environment.
- Full `npm ci`, `prisma generate`, `tsc --noEmit`, `next build`: unable to verify in current environment because package installation stalled.

## Local verification
1. `npm ci`
2. `npx prisma generate`
3. `npx tsc --noEmit`
4. Back up Turso and apply the two Phase 6 migrations to the correct database.
5. `npm run dev`; test `/community` and `/room/<code>` in two isolated Firebase sessions.
6. Test double-click/retry of the room Finish button; XP should only increase once.
7. Have a second user report a public Quiz, and inspect `QuizReport` in Turso.

Do not include `.env.local` or private keys in Git or ZIP.

### Phase 6.1 — Thiết lập và nâng cấp

QuizVerse AI — Phase 6.1 (incremental update)

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

### Phase 6.1 — TC05: Cấu hình Ably realtime

QuizVerse Phase 6.1 — TC05 realtime (Ably)

1. Create an Ably application and copy its **API key** into your local `.env.local` as `ABLY_API_KEY=...`. Do not commit the real key.
2. In the project run `npm install` (updates `package-lock.json`), `npx prisma generate`, `npx tsc --noEmit`, `npm run build`.
3. Restart Next.js. Open one Quiz Room with two authenticated accounts. Browser DevTools → Network → WS should show Ably websocket connectivity.
4. Verify join/start/answer/leaderboard, offline → online, and F5 restore. Server events are hints only; all state is read from authenticated Turso API. Ably client token grants **subscribe only** to the room already joined.
5. If Ably is unavailable, a 5-second polling fallback remains. Every 30 seconds connected clients reconcile state, and question boundaries also refresh.
6. On Vercel also configure `ABLY_API_KEY` as a **server-side environment variable**, then redeploy.

Known limits: phase 6.1 implementation does not yet include a real load test at 50/100+ concurrent users; the fallback and room subscription should be stress-tested before production. This package was prepared without a complete dependency install/build in the authoring environment, so validate locally before marking TC05 PASS.

## Phụ lục — Tài liệu chi tiết từ các Phase trước

Các mục sau được **hợp nhất nguyên nội dung hướng dẫn cũ để không mất thông tin**. Một số hướng dẫn mô tả kiến trúc từng dùng nhưng đã được thay thế (ví dụ authentication tự viết, email Resend, OpenAI, giới hạn file 8 MB). **Không chạy migration cũ hoặc đổi cấu hình theo những đoạn này nếu bạn đã ở Phase 5.**


### README-PHASE-5.md (tham khảo)

#### QuizVerse AI — Phase 5 Adaptive Learning (MVP)

## What changed
- TopicMastery: updated after each successfully stored attempt. Difficulty advice: <50% strength easy, 50–79% medium, >=80% hard. Strength is an exponentially smoothed score (65% previous, 35% new quiz), so it is an **estimate**, not a validated learning measure.
- ReviewCard: incorrect answers are scheduled immediately for review; correct responses to existing review cards double the next interval (capped at 30 days). Basic spaced repetition, not SM-2.
- LearningSubmission: unique attempt ID avoids applying the same attempt twice.
- Learning page: progress bars, recommended quiz button, overdue question practice and AI Tutor on saved incorrect questions.
- Tutor limit: 15 requests per user/hour; answer not guaranteed to be factually correct. Tutor calls run on the server only, and do not leak the Gemini API key to the client.
- Existing Quiz and Attempt records remain in place. Older attempts are **not backfilled** into mastery, because per-question answers were not historically stored.

## Important before updating
1. Backup Phase 4 source and Turso `quizverse-ai` database.
2. Copy Phase 5 `src/`, `prisma/schema.prisma`, and `prisma/migrations/20261015000000_adaptive_learning` into the existing project. Preserve `.env.local` and all existing migrations.
3. From the root folder in Ubuntu WSL, **review** the SQL migration, then apply ONCE:
   ```bash
   cat prisma/migrations/20261015000000_adaptive_learning/migration.sql
   turso db shell quizverse-ai < prisma/migrations/20261015000000_adaptive_learning/migration.sql
   ```
4. From PowerShell in the project:
   ```powershell
   npm install
   npx prisma generate
   npx tsc --noEmit
   npm run dev
   ```
5. Check database:
   ```sql
   SELECT name FROM sqlite_master WHERE type='table' AND name IN ('TopicMastery','ReviewCard','LearningSubmission');
   ```

## Test cases
- TC01: Log in, complete 10 Q with some wrong answers. Learning screen shows a topic + strength and at least one due review item.
- TC02: Repeat the same Quiz; strength recalculates rather than duplicating a submit record.
- TC03: Click `Tạo Quiz thích ứng` from a topic: topic and suggested difficulty pre-filled in generator, generate normally.
- TC04: Click `Ôn ... câu đến hạn`: answer the questions; correct reviewed cards move to next interval, incorrect remain due.
- TC05: Ask Tutor why a wrong question's answer is correct. Verify response, and test rate limit after 15 questions/hour.
- TC06: A different account must not see, change, or query another user's mastery, review cards, or tutor items.
- TC07: Reload / logout / login: mastery and due cards persist and remain isolated per account.
- TC08: Regression: create/edit/delete Quiz, login Google/password, LaTeX, Turso Attempt history and bar charts still work.

## Caveats
- This MVP does not adapt difficulty mid-quiz. It **recommends the next Quiz difficulty** based on a user's past performance; users explicitly choose to generate it.
- The algorithm uses Quiz-level topic labels, not a semantic skills taxonomy; differently spelled topics form separate rows.
- Due review content is stored as a snapshot so deleting or editing the original Quiz may leave an older review question until it is reviewed again.
- The source application's original Attempt API accepts a client-side score, and this MVP checks learning submissions against the stored score and actual quiz answers. For publicly accessible production use, make the server compute score directly from submitted answers and protect quiz answer keys.
- Network timeouts, quotas, and deployment limits can still affect AI Tutor; do not treat generated explanations as verified facts.
- Confirm your hosting platform request budget for phase-5 transaction/AI latency.


### README-PHASE-4.md (tham khảo)

#### QuizVerse AI — Phase 4 (Quiz Engine)

## New features
- Edit existing saved quizzes: Library → Sửa, review editor → Lưu thay đổi. `PUT /api/quizzes/[id]` checks authenticated owner.
- Delete saved quizzes: Library → Xóa; confirms irreversible action. `DELETE /api/quizzes/[id]` checks owner. **ATTENTION:** with current Prisma schema `Attempt.quiz onDelete: Cascade`, deleting a Quiz deletes its attempt history, affecting charts and statistics. A future soft-delete migration would preserve historical records.
- Analytics: daily attempts column chart for last 7 local calendar days, zero bars when no data.
- Timed Quiz: 60 seconds per question, auto-submit on timeout, unanswered scored incorrect. Client-side timer is UX-only and is not authoritative/anti-cheat.
- LaTeX in question text, options, explanations via KaTeX: `$...$`, `$$...$$`, `\(...\)`, `\[...\]`. Model should generate expressions using delimiters.
- Existing scoring, explanations, attempt persistence and account isolation remain.

## Installation
1. Back up your project and Turso DB. Copy updated source, **preserve `.env.local`**.
2. `npm install` then `npx prisma generate` then `npm run dev`. KaTeX is newly required.
3. No database migration required.

## Suggested checks
1. Create, answer, score, explanation; reload after completion.
2. Edit a saved Quiz and confirm changes survive reload; verify another account cannot edit it (`404`).
3. Delete a saved Quiz and verify removal after reload; validate the warning about attempt cascade.
4. Quiz timer auto-submits at zero and unanswered count as incorrect.
5. LaTeX like `$x^2+1$`, `$$\frac{a}{b}$$` renders.
6. Complete quizzes across days and check chart counts.
7. Google login, Firebase session, PDF/DOCX and batch generation regression.

## Security
The edit/delete API validates origin and Firebase-backed session and scopes by ownerId. Existing attempt POST accepts client-computed score; server-side answer verification would be required for trustworthy high-stakes scoring.


### README-BATCH-GENERATION.md (tham khảo)

#### QuizVerse AI Phase 3 — Batch Quiz Generation

- `/api/generate`: validated JSON Schema output; up to two attempts per model for retryable server/JSON errors; fallback model; per-batch responses of 5 questions.
- `src/app/page.tsx`: orchestrates 5-question batches, retries a failing batch once, checks overlap with completed batches, shows real `x/y` progress, and persists the final quiz only after all batches succeed.
- Long PDF/DOCX extraction and `/api/source-analyze` flow retained from preceding version.

## Environment

Keep existing Firebase/Turso settings; set `GEMINI_API_KEY`, `GEMINI_MODEL` and `GEMINI_FALLBACK_MODEL` in `.env.local`.

## Run

`npm install && npx prisma generate && npm run dev`

## Test

1. Generate 5, 20, 25 and 50 questions, check `5/20`, `10/20`, ... increments and exact count.
2. Verify each question has four nonduplicate options and an explanation; spot-check against document.
3. Test cancel, model 503 and malformed output; failed generation should not save a partial quiz to Turso.
4. Test PDF/DOCX source and authentication; ensure existing session and quiz library unaffected.

Note: This release does not guarantee that every semantic duplicate or factual inaccuracy is detected; overlapping concepts can still occur. Multiple requests use quota and may run longer, especially on free tiers. A browser cancel can leave already-started upstream model requests billable.

Static verification only: the package dependencies are not installed in this runtime, so full Next.js build and live Gemini tests have not been run.


### README-PHASE-3-LONG-DOCS.md (tham khảo)

#### Phase 3 — Phân tích toàn bộ PDF/DOCX (bản thử nghiệm)

- Upload PDF, DOCX, TXT tối đa 20 MiB.
- Trích xuất toàn bộ văn bản từ file, không lấy mẫu/cắt 45.000 ký tự như bản cũ.
- Giới hạn văn bản trích xuất: **2 triệu ký tự**; vượt mức sẽ báo lỗi rõ ràng, không âm thầm bỏ nội dung.
- Tài liệu <=45.000 ký tự đi thẳng đến API tạo Quiz. Tài liệu >45.000 ký tự được chia toàn bộ thành các phần ~34.000 ký tự; API `/api/source-analyze` tạo bản ghi chú thông tin trọng yếu cho **từng phần**, đồng thời bảo toàn thứ tự các phần.
- Frontend chạy tối đa 2 lượt phân tích đồng thời, hiển thị tiến độ số phần đã xử lý; hủy sẽ ngắt request phía trình duyệt. Mỗi phần được thử lại tối đa 1 lần nếu lỗi thông thường, không tự thử lại khi hết quota 429.
- Các bản ghi chú được gộp và gửi qua generator để tạo Quiz 5–50 câu. Điều này bao phủ **tất cả các phần** của tài liệu nhưng bản ghi chú là bản rút gọn: **không đảm bảo mọi chi tiết của nguồn sẽ xuất hiện trong Quiz**.
- Tài liệu càng dài càng cần nhiều API calls, tiêu tốn thời gian và quota Gemini. Không có job queue/persistence nên đóng tab có thể làm mất tiến độ; chưa thích hợp deploy serverless hạn thời gian ngắn.
- URL vẫn giới hạn tải HTML 8 MiB; PDF scan cần OCR, chưa hỗ trợ.
- Dự án production cần request quotas theo user, job queue và chống SSRF ở tầng mạng; giới hạn upload của hosting có thể thấp hơn 20MB.

## Cách test

1. Upload PDF/DOCX nhỏ (<45.000 ký tự), tạo 10 câu như trước.
2. Upload tài liệu 80.000–200.000 ký tự: màn hình phải hiện `Đã phân tích x/y phần` tăng dần.
3. Đối chiếu câu hỏi với chương đầu, giữa, cuối.
4. Hủy giữa tiến trình, xác nhận giao diện có thể tạo bài mới.
5. Thử tài liệu >2 triệu ký tự: phải báo vượt giới hạn, không tạo Quiz rút gọn.


### README-PHASE-3.md (tham khảo)

#### QuizVerse AI — Phase 3 (đợt 1): nhiều nguồn tạo Quiz

## Có gì mới?
- Tạo từ **chủ đề** (giữ nguyên), **văn bản**, **PDF**, **DOCX**, **TXT**, và **URL HTTPS công khai**.
- Upload file tối đa 8 MB, trích xuất text tối đa 45.000 ký tự; không lưu file gốc lên Turso.
- AI được yêu cầu bám sát tài liệu, định dạng 4 đáp án/1 câu đúng và lời giải, kiểm tra schema + đáp án/câu hỏi trùng.
- Xác thực Firebase vẫn áp dụng với endpoint `/api/source-extract` và `/api/generate`; Quiz chỉ lưu khi tạo thành công.

## Cập nhật source
Sử dụng toàn bộ bản ZIP hoặc copy `src/`, `package.json` và giữ lại `.env.local`/`prisma/` đang chạy tốt. Cài thư viện mới:

```bash
npm install
npx prisma generate
npm run dev
```

Không có Prisma migration mới. Giữ các biến `GEMINI_API_KEY`, `TURSO_*`, `FIREBASE_*` như Phase 2.5.

## Test
1. Tạo Quiz từ chủ đề; kiểm tra lưu Turso.
2. Dán đoạn văn dài hơn 100 ký tự và tạo Quiz; soát câu/đáp án có bám nguồn.
3. Upload một PDF chứa text, DOCX hoặc TXT; kiểm tra Quiz và lịch sử làm bài.
4. Thử URL trang HTML HTTPS công khai; URL nội bộ, HTTP, trang redirect và trang không công khai phải bị từ chối.
5. Upload >8 MB, file sai định dạng, PDF scan; nhận lỗi rõ ràng.
6. Đăng xuất, gọi `/api/source-extract` hoặc `/api/generate`: phải 401.
7. So sánh Quiz mẫu: nhấp thẻ gợi ý KHÔNG tăng bộ đã tạo, nộp bài mới tăng lịch sử.

## Giới hạn trước production
- PDF scan cần OCR (chưa có); HTML render bằng JavaScript có thể không trích xuất đủ nội dung.
- URL extraction có phòng vệ sơ bộ SSRF (HTTPS, public DNS, không redirect, giới hạn kích thước) nhưng **chưa an toàn để bật truy cập URL tùy ý trên production** vì DNS rebinding; nên dùng egress proxy chặn mạng nội bộ và giới hạn miền.
- Chưa hỗ trợ PPTX, YouTube, ảnh, audio, citation theo trang và review/edit quiz trước khi lưu.
- AI có thể sinh câu sai; schema checks không thay thế kiểm chứng kiến thức.
- Chưa có quota/rate limit theo người dùng; cần bổ sung trước khi public.


### README-UX-GENERATOR.md (tham khảo)

#### QuizVerse AI — Generator UX update

## Các thay đổi
- Tiến trình theo **giai đoạn thực**: trích xuất file/URL (nếu có), chờ Gemini tạo, lưu Quiz trong Turso.
- Đồng hồ đếm thời gian chờ; thông báo sau 20 và 55 giây.
- Thanh chuyển động chỉ báo còn đang xử lý, **không biểu diễn phần trăm hoàn tất** (vì Gemini generateContent trả toàn bộ kết quả một lần).
- Nút **Hủy tạo Quiz**: gọi AbortController để ngừng đợi request trên trình duyệt. Yêu cầu đã gửi đến Gemini vẫn có thể tính quota hoặc tiếp tục xử lý ở server.
- Không thể gửi nhiều lần trong khi pending; kết quả của lượt đã hủy bị bỏ qua.
- Giảm retry 503 còn 1 lần mỗi model, sau đó fallback từ model chính sang GEMINI_FALLBACK_MODEL.
- Fallback mặc định gemini-3.5-flash-lite; không retry 429 quota.

## Cập nhật
Giải nén và copy đè các file, giữ nguyên .env.local và dữ liệu Turso của bạn.

.env.local:
GEMINI_MODEL="gemini-3.8-flash"
GEMINI_FALLBACK_MODEL="gemini-3.5-flash-lite"

Lệnh chạy:
npm install
npx prisma generate
npm run dev

## Kiểm thử
1. Chọn Văn bản, dán nội dung 2.000-5.000 từ, tạo Quiz 25 câu: hiện trạng thái và thời gian.
2. Nhấn Hủy: giao diện ngừng loading; tạo lại được, phản hồi cũ không làm hiện Quiz.
3. Tạo 5 câu: hoàn thành và lưu vào Library.
4. Với nguồn PDF/URL: hiển thị bước đọc nguồn trước khi tạo Quiz.
5. Kiểm tra log Gemini fallback khi model đầu bị 503.

Lưu ý: không có phần trăm hay số câu hoàn thành thật cho đến khi triển khai backend job/streaming. Nút hủy không bảo đảm hủy được công việc đã bắt đầu trên Gemini và không hoàn tác lưu Turso nếu server đã thực hiện.

### Tình trạng xác minh
Đã kiểm tra source và sửa file tại môi trường làm việc. Chưa xác nhận được build Next.js do npm install không hoàn tất trong môi trường này; hãy chạy trên dự án thực tế trước khi deploy.


### README-GEMINI.md (tham khảo)

#### QuizVerse AI — Gemini 3.8 Flash

## Cấu hình

1. Mở https://aistudio.google.com/apikey và tạo Gemini API Key cho project được cấp Free Tier.
2. Giữ nguyên các biến Firebase và Turso trong `.env.local` và thêm:

```env
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-3.8-flash
```

3. Không dùng `NEXT_PUBLIC_` cho GEMINI_API_KEY, không commit `.env.local`.
4. Chạy `npm install`, `npx prisma generate`, `npm run dev`.
5. Đăng nhập và thử Tạo Quiz từ chủ đề với 5 câu đầu tiên, sau đó tăng lên 25, 30, 40 hoặc 50 câu, sau đó thử các nguồn tài liệu khác.

## Lưu ý

- `src/app/api/generate/route.ts` đã chuyển hoàn toàn sang Gemini `generateContent` qua REST, không cần cài thêm SDK.
- Cấu hình `OPENAI_API_KEY` cũ không còn được dùng để sinh Quiz.
- Firebase Google Login là dịch vụ khác với Gemini API Key.
- Free Tier tùy model/khu vực/project; có giới hạn RPM/TPM/RPD. Nếu hết quota, API trả HTTP 429.
- Dùng tài liệu PDF/DOCX/TXT/URL: ứng dụng trích xuất text trước, gửi text cho Gemini (không upload tài liệu thô lên Gemini).
- Không cần migration Prisma/Turso mới. Auth rate limiting trước đó vẫn giữ nguyên.
- API vẫn thiếu quota/rate limit riêng cho `/api/generate`; cần triển khai trước khi public.
- Chưa kiểm thử thực tế bằng key của bạn; cần kiểm tra API trực tiếp trên máy.

## Lựa chọn số câu

- Giao diện hỗ trợ 5, 10, 15, 20, 25, 30, 40 và 50 câu.
- API kiểm tra đúng danh sách số câu được phép; đặt `maxOutputTokens` 32768 và timeout 110 giây để hỗ trợ quiz dài.
- Câu dài hoặc tài liệu quá phức tạp vẫn có thể vượt giới hạn thời gian/token hoặc tạo thiếu câu. Khi đó nên thử ít câu hơn; tránh bấm gửi lặp khi request đang xử lý.
- Gemini 3.8 Flash có Free Tier theo bảng giá Google, nhưng số request phụ thuộc quota cụ thể của project.


### README-AUTH-RATE-LIMIT.md (tham khảo)

#### Phase 3 — Auth rate limiting (Firebase + Turso)

## Phạm vi

- POST `/api/auth` with `action=session`: max **10 attempts/minute/IP** and **60 attempts/hour/IP**; signed Firebase UID also max **30 session creations/hour**.
- POST `/api/auth` with `action=logout`: max **20/minute/IP**.
- Exceeded limits return HTTP **429** + `Retry-After` in seconds.
- Counters in Turso are atomic and shared across server instances; no in-memory map.
- Failed Firebase ID token validation still counts toward the IP limit.
- Malformed JSON or unsupported action is rejected before counting.

## Install and migrate (back up first)

In Ubuntu WSL, from the `quizverse-ai` project folder:

```bash
# Inspect schema first; do not rerun if already applied
turso db shell quizverse-ai 'SELECT name FROM sqlite_master WHERE name = "AuthRateLimit";'
# On an existing database WITHOUT the AuthRateLimit table:
turso db shell quizverse-ai < prisma/migrations/20261014040000_auth_rate_limit/migration.sql
```

Then run `npm install`, `npx prisma generate`, `npm run dev`. Keep `.env.local`, Firebase and Turso configuration unchanged.

Old records expire logically with their fixed-window identifiers. For maintenance, run this **periodically** (e.g. daily scheduled maintenance):

```sql
DELETE FROM "AuthRateLimit" WHERE "expiresAt" < CAST(strftime('%s','now') AS INTEGER) - 86400;
```

## Tests

1. Google sign-in or verified email sign-in still works and session survives refresh.
2. Open DevTools Network tab and simulate >10 session requests in a minute **only in your own local test project**; request 11 should be HTTP `429` with `Retry-After`. Avoid rapid tests on Firebase production quotas.
3. After waiting for the time window, session requests succeed again.
4. Sign out and verify GET `/api/quizzes` returns `401`.
5. On Turso verify `SELECT COUNT(*) FROM AuthRateLimit;` returns positive counts.
6. Check 2 browsers using different accounts; ensure their Quiz/Attempt data stays separate.

## Important limitations

- Firebase client `signInWithEmailAndPassword()` communicates **directly with Firebase**, not with `/api/auth`. This rate limiter therefore protects **creation of application sessions** but **cannot throttle or prevent password attempts against Firebase itself**. Configure Firebase / Google Cloud abuse protections, quotas and consider Firebase App Check / Identity Platform protections separately.
- IP identification relies on `x-forwarded-for` from a **trusted reverse proxy** (for example a hosting proxy that overwrites this header). Do not expose the backend directly behind an untrusted proxy or accept arbitrary user-controlled forwarded headers.
- Shared IPs (campus/NAT) can be rate-limited together; adjust limits after observing legitimate traffic.
- These fixed-window counters are a basic control, not a full bot defense. Add security monitoring and abuse controls before a public launch.
- Do not apply the previous Resend email-verification API; Firebase handles email verification.


### README-GOOGLE-LOGIN.md (tham khảo)

#### Phase 2.5 — Google Login (Firebase)

## Firebase Console (bắt buộc)
1. Vào Firebase Console → Authentication → Sign-in method → Google → **Enable**.
2. Chọn **Project support email** → Save.
3. Authentication → Settings → **Authorized domains**: kiểm tra `localhost` (thêm nếu chưa có); khi deploy thêm domain sản phẩm (ví dụ `quizverse.vercel.app`).
4. Web App Firebase và Admin SDK đã cấu hình từ Phase 2.5, giữ nguyên `.env.local`.
5. Với thông báo OAuth consent/project settings, làm theo yêu cầu trên Firebase/Google Cloud Console.

## Cài và chạy
```bash
npm install
npx prisma generate
npm run dev
```
Không cần migration mới. Không cần Google Client Secret ở frontend và không cần Resend.

## Hành vi
- Nút **Tiếp tục với Google** ở cả trang đăng nhập và đăng ký.
- Firebase popup cho chọn Google account, trả về Firebase ID token; backend `/api/auth` dùng Firebase Admin SDK xác thực và tạo HttpOnly session cookie.
- Nếu email đã được Firebase xác minh, tạo/liên kết bản ghi User Turso theo logic Firebase đã có. Không cấp session nếu không verified.
- Nếu email đã có Firebase account sử dụng provider khác và Firebase báo `auth/account-exists-with-different-credential`, app hướng dẫn đăng nhập provider trước; **không tự động liên kết account**.
- Sau khi đăng nhập, Quiz/Attempt tiếp tục tách biệt theo User ID Turso.

## Kiểm thử
1. Đăng nhập Google lần đầu → Dashboard và `User.firebaseUid` xuất hiện trên Turso.
2. Đăng xuất → `/api/quizzes` trả HTTP 401.
3. Đăng nhập lại → Quiz và lịch sử vẫn còn.
4. Tài khoản Google B không thấy Quiz của A.
5. Popup bị đóng, popup bị chặn, authorized domain thiếu → hiện lỗi và không tạo session.
6. Email/password cũ vẫn hoạt động.

## Lưu ý
- Không chia sẻ Firebase Admin private key / Turso token.
- Đối với tài khoản cũ: Firebase có thể chặn đăng nhập Google nếu email đã đăng ký bằng provider khác. Nên triển khai **account linking** theo luồng re-authenticate trước khi cho phép kết hợp hai phương thức đăng nhập.
- Các migration trước đó chỉ chạy nếu database chưa áp dụng; không cần chạy lại ở bản này.


### README-FIREBASE-AUTH.md (tham khảo)

#### Phase 2.5 — Firebase Authentication (thay Resend)

## Mục tiêu
Firebase Auth xử lý tài khoản/mật khẩu, gửi email xác minh và xác thực email. Backend dùng Firebase Admin kiểm tra ID token trước khi cấp cookie phiên HttpOnly; Turso lưu dữ liệu Quiz/Attempt như cũ. Không dùng lại mã password hay session tự viết.

## Cấu hình Firebase Console
1. Truy cập https://console.firebase.google.com/ và tạo project (Spark miễn phí nếu đáp ứng giới hạn).
2. Authentication → Sign-in method → bật **Email/Password**.
3. Authentication → Templates → chỉnh mẫu **Email address verification** nếu muốn (dịch tiếng Việt tùy giao diện).
4. Project settings → General → Your apps → Add app (Web) → lấy apiKey, authDomain, projectId, appId để thêm vào `.env.local` theo `.env.example`.
5. Authentication → Settings → Authorized domains: đảm bảo `localhost` và domain deploy được phép. Các project Firebase mới có thể không thêm localhost sẵn.
6. Project settings → Service accounts → Generate new private key. Lưu bí mật: copy `project_id`, `client_email`, `private_key` vào FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY. Không commit JSON key hoặc `.env.local` vào git.

## Cập nhật code và Turso
- Giữ lại `.env.local` Turso cũ, thêm Firebase variables; xóa `RESEND_API_KEY`, `EMAIL_FROM` và `APP_URL` nếu không còn dùng.
- `npm install` → `npx prisma generate` → `npm run dev`.
- Trước tiên sao lưu Turso. Kiểm tra cột `firebaseUid` chưa tồn tại rồi chạy **một lần**:
  `turso db shell quizverse-ai < prisma/migrations/20261014030000_firebase_auth/migration.sql`
- Không chạy lại các migration cũ. Firebase quản lý password và email verification, nhưng Turso vẫn giữ bảng User/Quiz/Attempt. Bảng Session và EmailVerificationToken cũ chưa bị xóa để tránh mất dữ liệu; không còn được dùng để đăng nhập.

## Lưu ý tài khoản cũ
Tài khoản từ phiên bản Resend/đăng nhập cũ **không thể đăng nhập bằng Firebase ngay** vì mật khẩu lưu ở Turso không được nhập vào Firebase. Người dùng cần tạo tài khoản bằng cùng email trong Firebase và xác minh, sau đó đăng nhập. Khi email đã được Firebase xác minh, backend liên kết với user Turso có cùng email để giữ Quiz/Attempt trước đây. Kiểm thử với tài khoản test trước khi phát hành.

## Kiểm thử
1. Đăng ký tài khoản mới, chưa click link: đăng nhập bị từ chối.
2. Mở link trong email; thử đăng nhập: thành công.
3. Nhấn gửi lại: cần nhập email + mật khẩu đúng, và có giới hạn chống spam từ Firebase.
4. Tạo Quiz, nộp bài, reload, đăng xuất, đăng nhập lại: vẫn có dữ liệu.
5. Tài khoản B không đọc được dữ liệu A (kể cả sửa ownerId query).
6. Không đăng nhập: `/api/quizzes`, `/api/attempts` trả 401.
7. Form login/register được xóa khi chuyển qua lại và khi đăng xuất. Next.js Dev Indicator được tắt.

**Giới hạn:** Chưa có Google Login, password reset UI, chính sách rate limiting ở tầng ứng dụng, hoặc quy trình di chuyển tài khoản tự động hàng loạt. Trước production cần kiểm thử gửi mail, revoke sessions, bảo mật và giới hạn gửi email của Firebase theo gói hiện hành.


### README-EMAIL-VERIFICATION.md (tham khảo)

#### Phase 2.5 — Email link verification

## 1. Back up Turso first

Make sure you have the `quizverse-ai` backup you previously created, and confirm the original database has the `User` and `Session` tables.

## 2. Apply **only** the new migration in Ubuntu WSL

```bash
turso db shell quizverse-ai < prisma/migrations/20261014020000_email_verification/migration.sql
```

Do not rerun old migrations. This migration adds `User.emailVerifiedAt` and an `EmailVerificationToken` table. Accounts created **before** this migration are considered verified, to avoid locking them out. Only newly registered accounts require a verification link.

## 3. Configure `.env.local`

```env
RESEND_API_KEY=re_your_secret_key
EMAIL_FROM="QuizVerse <noreply@your-verified-domain.com>"
APP_URL=http://localhost:3000
```

Get the key from Resend. Verify a domain you control on Resend, then use a From address on that domain. Resend test-mode sender addresses cannot send freely to arbitrary recipients. For production, set `APP_URL=https://your-deployed-domain` and register/verify its sending domain. Never commit `.env.local`.

## 4. Start the app

```bash
npm install
npx prisma generate
npm run dev
```

Use the same commands after deploying, with production environment variables. Don't run `prisma migrate reset` or delete database tables.

## 5. Manual test

1. Register using a real inbox that can receive mail: success message **does not** log you in.
2. Try logging in before verification: response is `403` and prompts you to verify.
3. Open the incoming email, click link, press **Xác minh email**. After success, login works.
4. Reuse the same link or wait 30 minutes: should fail.
5. Use **Chưa nhận email? Gửi lại link xác minh** when needed; rate-limited to approximately 1 minute per account.
6. Check Turso `SELECT id,email,emailVerifiedAt FROM "User"` and `SELECT id,userId,expiresAt FROM "EmailVerificationToken"` (never log tokens).
7. Regression-test Quiz, Attempt, and logout, and verify users are separated.

## Notes/limitations

- A fresh registration that fails to send an email remains an unverified account; the user can request a new link.
- Email service failures should be investigated using provider logs. The resend handler uses a generic response to avoid easy account enumeration, but this is **not** full bot protection. Deploy behind endpoint rate limiting and abuse detection (e.g., Redis or WAF) before making registration public.
- Verification token is 32 random bytes, hashed SHA-256 in the database, 30-minute expiry, consumed on use. The email link lands on a confirmation page rather than immediately consuming the token when scanners open links.
- Existing verified logins and old data stay intact. This phase does not implement Google OAuth or password recovery.


### README-PHASE-2.5.md (tham khảo)

#### QuizVerse AI — Phase 2.5: Email Authentication (development build)

## Đã thêm
- Đăng ký email/mật khẩu (tối thiểu 10 ký tự), đăng nhập, đăng xuất.
- Mật khẩu được hash bằng scrypt + salt riêng, không lưu plaintext.
- Session lưu DB, trình duyệt chỉ giữ opaque token trong HttpOnly/SameSite cookie.
- API quizzes, attempts và generate yêu cầu xác thực; ownerId luôn lấy từ session phía server.
- Giữ nguyên Prism Multicolor UI và logic bài tập gợi ý: chỉ lưu lượt làm sau khi nộp.

## Triển khai lên Turso đã có dữ liệu
**Sao lưu database trước khi làm bất kỳ migration nào.** Không chạy lại migration `20261014000000_init` vì bảng Quiz/Attempt đã tồn tại.

Từ Ubuntu WSL trong thư mục gốc project:

```bash
turso db shell quizverse-ai < prisma/migrations/20261014010000_auth/migration.sql
```

Sau đó kiểm tra:

```bash
turso db shell quizverse-ai
```

```sql
SELECT name FROM sqlite_master WHERE type='table';
```

Kết quả cần gồm `Quiz`, `Attempt`, `User`, `Session`.

Giữ nguyên `.env.local` đã cấu hình TURSO_DATABASE_URL/TURSO_AUTH_TOKEN/OPENAI_API_KEY. Chạy:

```bash
npm install
npx prisma generate
npm run dev
```

## Kiểm thử
1. Đăng ký tài khoản A, làm Quiz và nộp. Bài tạo/lịch sử hiện trong tài khoản A.
2. Đăng xuất, API `/api/quizzes` trả `401`, trang yêu cầu đăng nhập.
3. Đăng ký tài khoản B, không nhìn thấy Quiz/lịch sử của A.
4. Đăng nhập lại A, kiểm tra dữ liệu được khôi phục từ Turso.
5. Gửi `ownerId` giả trong body/URL: không được cấp quyền đọc/ghi dữ liệu B.
6. Bấm Quiz gợi ý: không tăng bộ Quiz đã tạo; chỉ tăng bài đã làm sau khi nộp.

## Những điều **chưa** có
- **Google OAuth chưa được tích hợp** vì cần Google OAuth credentials và callback URI do bạn cấu hình. Không có nút Google giả.
- Chưa có forgot/reset password, xác minh email, MFA, kiểm tra email spam; chưa có distributed rate limiting để chống brute force; chưa có hệ thống chống abuse API AI.
- Các Quiz/lịch sử **cũ** dưới anonymous owner ID vẫn nằm trong Turso nhưng **không tự chuyển** vào tài khoản mới. Không xóa chúng; cần một bước migration/import được xác minh quyền sở hữu.
- Các điểm số tiếp tục do client gửi, chưa có server-authoritative grading. Không dùng cho thi cử có gian lận/điểm chính thức.
- Mã chưa được npm build hoặc E2E xác nhận trong môi trường biên soạn. Hãy kiểm thử đầy đủ trước khi public production.

## Bảo mật
Giữ `TURSO_AUTH_TOKEN`, `OPENAI_API_KEY` chỉ trên server và không commit `.env.local`. Cấu hình HTTPS ở hosting; cookie được bật `Secure` trên production. Backup Turso và giới hạn tài nguyên trước khi mở cho người dùng thật.


### README-UI-UPDATE.md (tham khảo)

#### QuizVerse AI — Prism Multicolor UI

Bản này xây dựng trực tiếp từ **Phase 2 Suggested Quiz Logic Fix**. Giữ nguyên logic demo quiz và API Turso/Prisma.

## Cập nhật nhanh cho dự án đã có

1. Copy `src/app/colorful.css` sang dự án cũ.
2. Trong `src/app/layout.tsx`, bổ sung `import "./colorful.css";` **sau** `import "./premium.css";`.
3. Nếu chưa cập nhật bản sửa logic Quiz mẫu, copy thêm `src/app/page.tsx`, `src/app/api/quizzes/route.ts`, `src/app/api/attempts/route.ts` từ ZIP này.
4. Giữ nguyên `.env.local`, `prisma/`, `.git` và database Turso.
5. Chạy `npm install` (nếu cần), `npm run dev`, và `npm run lint`.

## Test nhanh

- 4 thẻ gợi ý mở bài luyện tập, không tăng bộ câu hỏi đã tạo.
- Chỉ khi nộp bài, bộ đếm *Bài đã làm* mới tăng.
- Quiz tự tạo vẫn xuất hiện trong thư viện và lưu Turso.
- Kiểm tra responsive desktop/mobile, keyboard focus và Reduced Motion.

Giao diện dùng Lavender/Periwinkle cho hero và CTA, Indigo cho điều hướng, màu tím/cam/hồng/xanh lam phân loại các thẻ chủ đề, nền trắng xám dịu để tránh mỏi mắt. Không thay đổi API/database.


### README.md (tham khảo)

#### QuizVerse AI — Phase 2 (Turso + Prisma preview)

Ứng dụng Next.js tạo Quiz đa lĩnh vực. Phase 2 bổ sung Prisma schema và REST API để lưu bộ Quiz và lượt làm bài trên **Turso Cloud**. Khi chưa cấu hình Turso, giao diện tự dùng localStorage như Phase 1.

> **Cảnh báo bảo mật:** Đây là bản thử nghiệm dành cho môi trường phát triển, **chưa có đăng nhập hoặc phân quyền phía server**. `owner` hiện là UUID ngẫu nhiên lưu ở trình duyệt, không phải bằng chứng xác thực. Ai biết hoặc đoán được `owner` có thể đọc và ghi dữ liệu tương ứng. **Không deploy bản này công khai với dữ liệu thật hoặc bật OpenAI API trả phí trước khi bổ sung authentication, authorization, rate limits và quota.** Không có đồng bộ trên các thiết bị khác nhau; cần đăng nhập thật để thực hiện việc đó.

## Yêu cầu

- Node.js 20.9+ (đề xuất Node 22)
- npm
- Tài khoản Turso, Turso CLI nếu muốn kết nối Cloud
- OpenAI API key nếu muốn tạo Quiz AI (bộ Quiz demo không cần key)

## Chạy thử

```bash
npm install
```

Tạo `.env.local` từ `.env.example` (PowerShell):

```powershell
Copy-Item .env.example .env.local
```

**Chế độ localStorage**: Không cần nhập Turso key; để trống `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN`. Sau đó:

```bash
npm run dev
```

## Cấu hình Turso

Tạo database và lấy thông tin bằng Turso CLI:

```bash
turso db create quizverse-ai
turso db show quizverse-ai
turso db tokens create quizverse-ai
```

Thêm vào `.env.local`:

```env
TURSO_DATABASE_URL="libsql://YOUR-DB.turso.io"
TURSO_AUTH_TOKEN="YOUR_TOKEN"
LOCAL_DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
```

Tạo schema trên Turso bằng file SQL khởi tạo có sẵn. Trên Bash:

```bash
turso db shell quizverse-ai < prisma/migrations/20261014000000_init/migration.sql
```

Trên Windows PowerShell, nếu Turso CLI không hỗ trợ chuyển hướng `<`, chạy:

```powershell
Get-Content -Raw prisma/migrations/20261014000000_init/migration.sql | turso db shell quizverse-ai
```

Cách thay thế: mở `turso db shell quizverse-ai` rồi thực thi lần lượt các câu SQL trong migration. **Chỉ chạy migration khởi tạo đúng một lần trên database mới, trống**. Đừng chạy lại nếu đã có bảng.

Sinh Prisma Client rồi chạy ứng dụng:

```bash
npx prisma generate
npm run dev
```

Mở http://localhost:3000. Giao diện sẽ ghi Quiz và lượt làm bài lên Turso; nếu Turso lỗi, UI hiển thị cảnh báo và chuyển sang localStorage, dữ liệu chưa được tự động đồng bộ ngược. Các Quiz cũ lưu localStorage cũng **không tự nhập lên Turso**.

## Những API mới

- `GET /api/status`: trạng thái cấu hình storage (`local` hoặc `turso`), không xác nhận health kết nối.
- `GET /api/quizzes?owner=UUID`: danh sách Quiz của owner.
- `POST /api/quizzes`: lưu Quiz (`{ "owner": "UUID", "quiz": { ... } }`).
- `GET /api/attempts?owner=UUID`: lịch sử làm bài.
- `POST /api/attempts`: ghi một lượt làm (`{ "owner": "UUID", "attempt": { ... } }`).

Đây là **API thử nghiệm**, chưa có authentication. Điểm số được client gửi lên, chưa xác thực lại ở server. Muốn dùng thật phải triển khai server-side grading hoặc đáp án/đề thi do server quản lý.

## File quan trọng

- `prisma/schema.prisma`: Quiz và Attempt
- `prisma/migrations/20261014000000_init/migration.sql`: cấu trúc bảng ban đầu
- `src/lib/prisma.ts`: Prisma Client và adapter libSQL
- `src/lib/validation.ts`: kiểm tra payload
- `src/app/api/quizzes/route.ts`: API Quiz
- `src/app/api/attempts/route.ts`: API lượt làm
- `src/app/api/status/route.ts`: trạng thái cấu hình
- `src/app/page.tsx`: giao diện đã kết nối APIs

## Những việc cần hoàn thiện ở Phase 2

1. Authentication (Google OAuth/email) và server-side authorization.
2. Tạo hồ sơ User và gắn Quiz/Attempt với userId đã xác thực.
3. Server-side grading, không chấp nhận score do client tự khai.
4. CRUD đầy đủ và đồng bộ nhiều thiết bị.
5. Giới hạn tần suất, số lượt gọi AI, theo dõi chi phí, logging.
6. Viết integration tests và kiểm tra build trên máy có thể tải dependency.

## Kiểm thử

```bash
npm run lint
npm run build
```

Môi trường tạo gói không cài được dependency nên build/runtime **chưa được xác nhận**. Schema và code cần được chạy kiểm thử ở máy bạn trước khi deploy.

## UI refresh — phiên bản giao diện tối giản

- Điều chỉnh giao diện theo hướng sản phẩm học tập: nền trung tính, xanh lá trầm, layout nhiều khoảng trắng.
- Viết lại microcopy tiếng Việt cho trang chủ, tạo Quiz, quiz player, kết quả, thư viện.
- CSS tùy chỉnh đặt tại `src/app/redesign.css` và được import sau `globals.css` trong `layout.tsx`.
- Các API `/api/generate`, `/api/quizzes`, `/api/attempts`, `/api/status`, Prisma schema và cơ chế Turso/localStorage được giữ nguyên.
- Đây là bản redesign frontend; chưa bổ sung authentication hay các tính năng backend khác.
