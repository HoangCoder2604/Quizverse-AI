import { NextRequest, NextResponse } from "next/server";
import { allowMutation } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isValidEmail } from "@/lib/email";
import { sendVerificationEmail } from "@/lib/verification";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!allowMutation(req)) return NextResponse.json({error:"Invalid origin"},{status:403});
  const body=await req.json().catch(()=>null);
  const email=typeof body?.email==="string"?body.email.trim().toLowerCase():"";
  const generic="Nếu tài khoản tồn tại và chưa xác minh, chúng tôi sẽ gửi email xác minh.";
  if (!isValidEmail(email)) return NextResponse.json({error:"Email không hợp lệ"},{status:400});
  try {
    const db=getPrisma();
    const user=await db.user.findUnique({where:{email}});
    if (!user || user.emailVerifiedAt) return NextResponse.json({message:generic});
    const latest=await db.emailVerificationToken.findFirst({where:{userId:user.id},orderBy:{createdAt:"desc"}});
    if(latest && Date.now()-latest.createdAt.getTime()<60_000) return NextResponse.json({message:generic});
    await sendVerificationEmail(user,req.nextUrl.origin);
    return NextResponse.json({message:generic});
  }catch{return NextResponse.json({error:"Tạm thời không thể gửi email, hãy thử lại sau."},{status:503});}
}
