import { NextRequest, NextResponse } from "next/server";
import { allowMutation } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hashVerificationToken } from "@/lib/verification";
export const runtime = "nodejs";
export async function POST(req:NextRequest) {
  if (!allowMutation(req)) return NextResponse.json({error:"Invalid origin"},{status:403});
  const body = await req.json().catch(()=>null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({error:"Liên kết không hợp lệ"},{status:400});
  try {
    const db=getPrisma();
    const row=await db.emailVerificationToken.findUnique({where:{tokenHash:hashVerificationToken(token)}});
    if (!row || row.expiresAt.getTime()<Date.now()) return NextResponse.json({error:"Liên kết đã hết hạn hoặc đã được sử dụng"},{status:400});
    await db.$transaction([
      db.user.update({where:{id:row.userId},data:{emailVerifiedAt:new Date()}}),
      db.emailVerificationToken.deleteMany({where:{userId:row.userId}})
    ]);
    return NextResponse.json({ok:true,message:"Email đã được xác minh. Bạn có thể đăng nhập."});
  }catch{return NextResponse.json({error:"Không thể xác minh email. Vui lòng thử lại."},{status:500});}
}
