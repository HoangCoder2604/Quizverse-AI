import { currentUser, allowMutation } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { validAttempt, validQuiz } from "@/lib/validation";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owner=user.id;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  try {
    const rows = await getPrisma().attempt.findMany({ where: { ownerId: owner }, orderBy:{ finishedAt:"desc" }, take:500 });
    return NextResponse.json({ attempts:rows.map(a=>({ id:a.id, quizId:a.quizId, title:a.title, score:a.score, total:a.total, finishedAt:a.finishedAt.toISOString() })) });
  } catch { return NextResponse.json({ error: "Database read failed" }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  if (!allowMutation(request)) return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if (!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body: unknown = await request.json().catch(() => null);
  const data = body as { owner?: unknown; attempt?: unknown; demoQuiz?: unknown } | null;
  if (!data || !validAttempt(data.attempt)) return NextResponse.json({ error: "Invalid attempt payload" }, { status:400 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Turso is not configured" }, { status:503 });
  try {
    const a = data.attempt;
    if (data.demoQuiz !== undefined) {
      // A suggestion is not a user-created quiz. Create its hidden reference ONLY when submitted.
      if (!validQuiz(data.demoQuiz) || data.demoQuiz.demo !== true || data.demoQuiz.id !== a.quizId ||
          data.demoQuiz.title !== a.title || data.demoQuiz.questions.length !== a.total) {
        return NextResponse.json({ error: "Invalid demo attempt payload" }, { status:400 });
      }
      const q = data.demoQuiz;
      await getPrisma().$transaction([
        getPrisma().quiz.create({ data:{ id:q.id, ownerId:user.id, title:q.title, topic:q.topic,
          difficulty:q.difficulty, questions:JSON.stringify(q.questions), demo:true, createdAt:new Date(q.createdAt) } }),
        getPrisma().attempt.create({ data:{ id:a.id, ownerId:user.id, quizId:a.quizId,
          title:a.title, score:a.score, total:a.total, finishedAt:new Date(a.finishedAt) } })
      ]);
      return NextResponse.json({ ok:true }, { status:201 });
    }
    const quiz = await getPrisma().quiz.findFirst({ where:{ id:a.quizId, ownerId:user.id }, select:{ id:true, questions:true } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status:404 });
    if (JSON.parse(quiz.questions).length !== a.total) return NextResponse.json({ error: "Mismatched total" }, { status:400 });
    await getPrisma().attempt.create({ data:{ id:a.id, ownerId:user.id, quizId:a.quizId, title:a.title, score:a.score, total:a.total, finishedAt:new Date(a.finishedAt) } });
    return NextResponse.json({ ok:true }, {status:201});
  } catch { return NextResponse.json({ error: "Database write failed" }, {status:500}); }
}
