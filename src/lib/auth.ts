import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { getPrisma } from "@/lib/prisma";

const COOKIE = "quizverse_session";
const MAX_AGE = 60 * 60 * 24 * 5;
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(token, true);
    if (!decoded.email || !decoded.email_verified) return null;
    const user = await getPrisma().user.findUnique({where:{firebaseUid:decoded.uid}});
    if (!user) return null;
    return {id:user.id,name:user.name,email:user.email};
  } catch { return null; }
}
export async function createFirebaseSession(idToken:string) {
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
  const sessionCookie = await auth.createSessionCookie(idToken,{expiresIn:MAX_AGE*1000});
  (await cookies()).set(COOKIE,sessionCookie,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:MAX_AGE});
  return {id:user.id,name:user.name,email:user.email};
}
export async function removeSession() {
  (await cookies()).delete(COOKIE);
}
export function allowMutation(request:Request) {
  const origin=request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  return new URL(origin).origin === new URL(request.url).origin;
}
