import { currentUser, allowMutation } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { validQuiz } from "@/lib/validation";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owner=user.id;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  try {
    const data = await getPrisma().quiz.findMany({ where: { ownerId: owner, demo: false }, orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json({ quizzes: data.map(q => ({ ...q, questions: JSON.parse(q.questions), createdAt: q.createdAt.toISOString() })) });
  } catch { return NextResponse.json({ error: "Database read failed" }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  if (!allowMutation(request)) return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if (!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body: unknown = await request.json().catch(() => null);
  const data = body as { owner?: unknown; quiz?: unknown } | null;
  if (!data || !validQuiz(data.quiz)) return NextResponse.json({ error: "Invalid quiz payload" }, { status: 400 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  try {
    const q = data.quiz;
    await getPrisma().quiz.create({ data: { id:q.id, ownerId:user.id, title:q.title, topic:q.topic, difficulty:q.difficulty, questions:JSON.stringify(q.questions), demo:Boolean(q.demo), createdAt:new Date(q.createdAt) } });
    return NextResponse.json({ ok:true }, { status: 201 });
  } catch { return NextResponse.json({ error: "Database write failed (maybe duplicate ID)" }, { status: 500 }); }
}
