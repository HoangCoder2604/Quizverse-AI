import "server-only";
import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

/** Fixed-window counters stored in Turso so deployments share the same limits. */
export type LimitRule = { scope: string; limit: number; windowSeconds: number };

function clientIdentity(request: Request): string {
  // IMPORTANT: x-forwarded-for must only be trusted when the hosting reverse proxy
  // overwrites/sanitizes it. Otherwise an attacker can supply arbitrary values.
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

export async function checkRateLimits(request: Request, rules: LimitRule[], userUid?: string): Promise<{ allowed: boolean; retryAfter: number }> {
  const ipHash = clientIdentity(request);
  const now = Math.floor(Date.now() / 1000);
  let retryAfter = 0;
  const db = getPrisma();
  for (const rule of rules) {
    const windowStart = Math.floor(now / rule.windowSeconds) * rule.windowSeconds;
    const identity = userUid ? `uid:${createHash("sha256").update(userUid).digest("hex")}` : `ip:${ipHash}`;
    const id = `${rule.scope}:${identity}:${rule.windowSeconds}:${windowStart}`;
    // Single atomic SQLite statement prevents oversubscription under concurrency.
    const rows = await db.$executeRaw`
      INSERT INTO "AuthRateLimit" ("id", "hits", "expiresAt")
      VALUES (${id}, 1, ${windowStart + rule.windowSeconds})
      ON CONFLICT("id") DO UPDATE SET "hits" = "AuthRateLimit"."hits" + 1
      WHERE "AuthRateLimit"."hits" < ${rule.limit}
    `;
    if (rows === 0) retryAfter = Math.max(retryAfter, windowStart + rule.windowSeconds - now);
  }
  return { allowed: retryAfter === 0, retryAfter };
}
export const sessionIpRules: LimitRule[] = [
  { scope: "auth-session", limit: 10, windowSeconds: 60 },
  { scope: "auth-session", limit: 60, windowSeconds: 3600 },
];
export const sessionUserRules: LimitRule[] = [{ scope: "auth-user-session", limit: 30, windowSeconds: 3600 }];
export const logoutRules: LimitRule[] = [{ scope: "auth-logout", limit: 20, windowSeconds: 60 }];
