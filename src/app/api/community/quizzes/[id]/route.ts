import { NextResponse } from "next/server";
import {currentUser} from "@/lib/auth";
import {getPrisma} from "@/lib/prisma";
export const runtime="nodejs";
export async function GET(_:Request,ctx:{params:Promise<{id:string}>}){
 const {id}=await ctx.params;if(id.length>100)return NextResponse.json({error:"Invalid ID"},{status:400});
 const q=await getPrisma().quiz.findUnique({where:{id}});
 if(!q)return NextResponse.json({error:"Không tìm thấy Quiz"},{status:404});
 const user=await currentUser();
 if(q.visibility==="private"&&user?.id!==q.ownerId)return NextResponse.json({error:"Quiz riêng tư"},{status:404});
 // Never reveal correct answers or explanations for public exams before submission.
 return NextResponse.json({quiz:{id:q.id,title:q.title,topic:q.topic,difficulty:q.difficulty,visibility:q.visibility,questionCount:JSON.parse(q.questions).length,questions:JSON.parse(q.questions).map((a:{id:string;question:string;options:string[]})=>({id:a.id,question:a.question,options:a.options}))}});
}
