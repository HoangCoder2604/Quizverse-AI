import { NextRequest,NextResponse } from "next/server";
import { currentUser,allowMutation } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
export const runtime="nodejs";
const error=(message:string,status:number)=>NextResponse.json({error:message},{status});
export async function GET(req:NextRequest){
 const params=req.nextUrl.searchParams;
 const q=(params.get("q")||"").trim().slice(0,100), difficulty=params.get("difficulty")||"", topic=(params.get("topic")||"").trim().slice(0,100);
 const sort=params.get("sort")==="oldest"?"asc":"desc";
 const page=Math.min(100,Math.max(1,Number(params.get("page"))||1));
 const where={visibility:"public",demo:false,...(q?{OR:[{title:{contains:q}},{topic:{contains:q}}]}:{}),...(topic?{topic:{contains:topic}}:{}),...(["easy","medium","hard"].includes(difficulty)?{difficulty}:{})};
 try{
 const [items,total]=await Promise.all([getPrisma().quiz.findMany({where,orderBy:{createdAt:sort},skip:(page-1)*12,take:12,select:{id:true,title:true,topic:true,difficulty:true,createdAt:true,ownerId:true,questions:true}}),getPrisma().quiz.count({where})]);
 return NextResponse.json({total,page,items:items.map(x=>({id:x.id,title:x.title,topic:x.topic,difficulty:x.difficulty,createdAt:x.createdAt,questionCount:JSON.parse(x.questions).length}))});
 }catch{return error("Không tải được thư viện cộng đồng",500)}
}
export async function PATCH(req:NextRequest){
 if(!allowMutation(req))return error("Invalid origin",403);
 const user=await currentUser();if(!user)return error("Unauthorized",401);
 const data=await req.json().catch(()=>null);
 if(!data||typeof data.id!=="string"||data.id.length>100||!["private","unlisted","public"].includes(data.visibility))return error("Dữ liệu không hợp lệ",400);
 const result=await getPrisma().quiz.updateMany({where:{id:data.id,ownerId:user.id,demo:false},data:{visibility:data.visibility}});
 if(!result.count)return error("Không tìm thấy Quiz",404);
 return NextResponse.json({ok:true});
}
