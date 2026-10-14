import { currentUser, allowMutation } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { validQuiz } from "@/lib/validation";

export const runtime = "nodejs";
const err = (message: string, status: number) => NextResponse.json({error: message}, {status});
type Ctx = { params: Promise<{id:string}> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  if (!allowMutation(req)) return err("Invalid origin",403);
  const user=await currentUser(); if(!user) return err("Unauthorized",401);
  if(!isDatabaseConfigured()) return err("Database unavailable",503);
  const {id}=await ctx.params;
  if(!id || id.length>100) return err("Invalid Quiz ID",400);
  const body:unknown=await req.json().catch(()=>null);
  const value=body && typeof body==="object" && "quiz" in body ? (body as {quiz:unknown}).quiz : null;
  if(!validQuiz(value) || value.id!==id || value.demo) return err("Invalid quiz payload",400);
  try {
    // updateMany ensures cross-account access cannot mutate another user's Quiz.
    const result=await getPrisma().quiz.updateMany({
      where:{id,ownerId:user.id,demo:false},
      data:{title:value.title,topic:value.topic,difficulty:value.difficulty,questions:JSON.stringify(value.questions)}
    });
    if(!result.count) return err("Quiz not found",404);
    return NextResponse.json({ok:true});
  }catch(e){console.error("Quiz update failed",e);return err("Không thể cập nhật Quiz",500);}
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  if(!allowMutation(req)) return err("Invalid origin",403);
  const user=await currentUser(); if(!user) return err("Unauthorized",401);
  if(!isDatabaseConfigured()) return err("Database unavailable",503);
  const {id}=await ctx.params;
  if(!id || id.length>100) return err("Invalid Quiz ID",400);
  try {
    // Existing schema uses onDelete: Cascade for Attempt, warn in UI before deleting.
    const result=await getPrisma().quiz.deleteMany({where:{id,ownerId:user.id,demo:false}});
    if(!result.count) return err("Quiz not found",404);
    return NextResponse.json({ok:true});
  }catch(e){console.error("Quiz delete failed",e);return err("Không thể xóa Quiz",500);}
}
