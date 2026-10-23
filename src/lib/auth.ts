import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { adminAuth } from "@/lib/firebase-admin";
import { getPrisma } from "@/lib/prisma";

const COOKIE = "quizverse_session";
const ACTIVE_COOKIE = "quizverse_active";
const MAX_AGE = 60 * 60 * 24 * 5;
const hash = (value:string) => createHash("sha256").update(value).digest("hex");
export class LoginConfirmationRequired extends Error { constructor(){super("LOGIN_CONFIRMATION_REQUIRED");} }
export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  const activeToken = cookieStore.get(ACTIVE_COOKIE)?.value;
  if (!token || !activeToken) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(token, true);
    if (!decoded.email || !decoded.email_verified) return null;
    const user = await getPrisma().user.findUnique({where:{firebaseUid:decoded.uid}});
    if (!user) return null;
    const active = await getPrisma().activeLogin.findUnique({where:{userId:user.id}});
    if (!active || active.tokenHash !== hash(activeToken) || active.expiresAt <= new Date()) return null;
    return {id:user.id,name:user.name,email:user.email};
  } catch { return null; }
}
export async function createFirebaseSession(idToken:string, confirmedReplacement = false) {
  const auth = adminAuth();
  const decoded = await auth.verifyIdToken(idToken, true);
  if (!decoded.email || !decoded.email_verified) throw new Error("EMAIL_NOT_VERIFIED");
  // Only a verified email can be linked to an existing legacy Turso account.
  const db = getPrisma();
  const email = decoded.email.toLowerCase();
  const existingByUid = await db.user.findUnique({where:{firebaseUid:decoded.uid}});
  if (existingByUid && existingByUid.email !== email) throw new Error("EMAIL_CHANGED");
  const existingByEmail = await db.user.findUnique({where:{email}});
  if (existingByEmail?.firebaseUid && existingByEmail.firebaseUid !== decoded.uid) throw new Error("ACCOUNT_CONFLICT");
  let user;
  if (existingByUid) user = existingByUid;
  else if (existingByEmail) user = await db.user.update({where:{id:existingByEmail.id},data:{firebaseUid:decoded.uid,emailVerifiedAt:new Date()}});
  else {
    const firebaseUser = await auth.getUser(decoded.uid);
    user = await db.user.create({data:{id:crypto.randomUUID(),firebaseUid:decoded.uid,email,name:firebaseUser.displayName?.trim()||email.split("@")[0],passwordHash:"FIREBASE_MANAGED",emailVerifiedAt:new Date()}});
  }
  const cookieStore = await cookies();
  const currentActiveToken = cookieStore.get(ACTIVE_COOKIE)?.value;
  const existing = await db.activeLogin.findUnique({where:{userId:user.id}});
  // First device (or the same active device) logs in normally. A second
  // device requires a separate POST explicitly confirming replacement.
  if (!confirmedReplacement && existing && existing.expiresAt > new Date() &&
      (!currentActiveToken || hash(currentActiveToken) !== existing.tokenHash)) {
    throw new LoginConfirmationRequired();
  }
  const sessionCookie = await auth.createSessionCookie(idToken,{expiresIn:MAX_AGE*1000});
  const activeToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000);
  await db.activeLogin.upsert({
    where:{userId:user.id},
    create:{userId:user.id,tokenHash:hash(activeToken),expiresAt},
    update:{tokenHash:hash(activeToken),expiresAt},
  });
  const cookieOptions = {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:MAX_AGE};
  cookieStore.set(COOKIE,sessionCookie,cookieOptions);
  cookieStore.set(ACTIVE_COOKIE,activeToken,cookieOptions);
  return {id:user.id,name:user.name,email:user.email};
}
export async function removeSession() {
  const store = await cookies();
  const token = store.get(ACTIVE_COOKIE)?.value;
  if (token) {
    // Never revoke the new device when a revoked, older device logs out.
    await getPrisma().activeLogin.deleteMany({where:{tokenHash:hash(token)}});
  }
  store.delete(COOKIE);
  store.delete(ACTIVE_COOKIE);
}
export function allowMutation(request:Request) {
  const origin=request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  return new URL(origin).origin === new URL(request.url).origin;
}
