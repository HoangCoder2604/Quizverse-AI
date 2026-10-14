import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

const EXPIRY_MS = 30 * 60 * 1000;
export const hashVerificationToken = (token: string) => createHash("sha256").update(token).digest("hex");
export async function sendVerificationEmail(user: { id: string; name: string; email: string }, baseUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Chưa cấu hình RESEND_API_KEY hoặc EMAIL_FROM");
  const db = getPrisma();
  const token = randomBytes(32).toString("hex");
  const tokenRow = await db.emailVerificationToken.create({data: {
    id: randomUUID(), userId: user.id, tokenHash: hashVerificationToken(token),
    expiresAt: new Date(Date.now() + EXPIRY_MS)
  }});
  const appUrl = process.env.APP_URL?.trim() || baseUrl;
  const link = new URL("/verify-email", appUrl);
  link.searchParams.set("token", token);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method:"POST", headers: {Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json"},
      body: JSON.stringify({
        from, to:[user.email], subject:"Xác minh email QuizVerse",
        text:`Xin chào ${user.name},\n\nĐể xác minh tài khoản QuizVerse, mở liên kết sau (hiệu lực 30 phút):\n${link.toString()}\n\nNếu bạn không đăng ký, hãy bỏ qua email này.`,
        html:`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#20253b"><h2>Xác minh email QuizVerse</h2><p>Xin chào,</p><p>Nhấn nút bên dưới để xác minh email của bạn. Liên kết có hiệu lực trong 30 phút.</p><p><a href="${link.toString().replaceAll('&','&amp;')}" style="display:inline-block;padding:13px 22px;background:#6558ce;color:white;border-radius:10px;text-decoration:none">Xác minh email</a></p><p>Nếu bạn không tạo tài khoản, hãy bỏ qua email này.</p></div>`
      }),signal:controller.signal
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  } catch(err) {
    await db.emailVerificationToken.deleteMany({where:{id:tokenRow.id}}).catch(()=>{});
    throw err;
  } finally {clearTimeout(timeout);}
}
