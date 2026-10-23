import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { allowMutation, createFirebaseSession, currentUser, removeSession, LoginConfirmationRequired } from "@/lib/auth";
import { checkRateLimits, logoutRules, sessionIpRules, sessionUserRules } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ user: await currentUser() }, { headers: { "Cache-Control": "no-store" } });
}
function limited(seconds: number) {
  return NextResponse.json({ error: "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau.", code: "RATE_LIMITED" }, {
    status: 429,
    headers: { "Retry-After": String(Math.max(1, seconds)), "Cache-Control": "no-store" },
  });
}
export async function POST(req: NextRequest) {
  if (!allowMutation(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (body?.action !== "logout" && body?.action !== "session")
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const byIp = await checkRateLimits(req, body.action === "logout" ? logoutRules : sessionIpRules);
    if (!byIp.allowed) return limited(byIp.retryAfter);
    if (body.action === "logout") {
      await removeSession();
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }
    if (typeof body.idToken !== "string" || body.idToken.length > 12000 || !body.idToken)
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    // Verify signed token before applying the per-user limit; never trust a posted UID.
    const verified = await adminAuth().verifyIdToken(body.idToken, true);
    const byUser = await checkRateLimits(req, sessionUserRules, verified.uid);
    if (!byUser.allowed) return limited(byUser.retryAfter);
    const user = await createFirebaseSession(body.idToken, body.confirmReplace === true);
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof LoginConfirmationRequired)
      return NextResponse.json({code:"LOGIN_CONFIRMATION_REQUIRED",error:"Tài khoản đang hoạt động trên thiết bị khác. Bạn có muốn đăng xuất thiết bị đó để tiếp tục?"},{status:409});
    if (e instanceof Error && e.message === "EMAIL_NOT_VERIFIED")
      return NextResponse.json({ error: "Cần xác minh email trước khi đăng nhập." }, { status: 403 });
    if (e instanceof Error && (e.message === "ACCOUNT_CONFLICT" || e.message === "EMAIL_CHANGED"))
      return NextResponse.json({ error: "Tài khoản đã liên kết với danh tính Firebase khác. Hãy liên hệ hỗ trợ." }, { status: 409 });
    // Database outages must fail closed, not silently bypass limiting.
    if (e instanceof Error && (/AuthRateLimit|database|libsql|SQLITE|TURSO/i.test(e.message)))
      return NextResponse.json({ error: "Dịch vụ xác thực đang tạm thời không khả dụng." }, { status: 503 });
    return NextResponse.json({ error: "Không thể xác thực Firebase. Kiểm tra cấu hình và database." }, { status: 401 });
  }
}
