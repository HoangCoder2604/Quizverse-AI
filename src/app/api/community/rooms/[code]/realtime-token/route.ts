import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { ablyRest, roomChannel } from "@/lib/room-realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

export async function GET(_: Request, context: Context) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const code = (await context.params).code.toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ error: "Mã phòng không hợp lệ" }, { status: 400 });
  const room = await getPrisma().quizRoom.findUnique({
    where: { code },
    select: { id: true, participants: { where: { userId: user.id }, select: { id: true } } },
  });
  if (!room || room.participants.length === 0)
    return NextResponse.json({ error: "Bạn không thuộc phòng này" }, { status: 403 });
  const ably = ablyRest();
  if (!ably) return NextResponse.json({ error: "Realtime chưa được cấu hình" }, { status: 503 });
  try {
    const request = await ably.auth.createTokenRequest({
      clientId: user.id,
      ttl: 60 * 60 * 1000,
      capability: JSON.stringify({ [roomChannel(code)]: ["subscribe"] }),
    });
    return NextResponse.json(request, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Ably token request failed", error);
    return NextResponse.json({ error: "Không tạo được kết nối realtime" }, { status: 503 });
  }
}
