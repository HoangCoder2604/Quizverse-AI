import { NextRequest, NextResponse } from "next/server";
import { currentUser, allowMutation } from "@/lib/auth";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import mammoth from "mammoth";
import { load } from "cheerio";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_WEB_BYTES = 8 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 2_000_000;
const allowedExtensions = new Set(["pdf","docx","txt"]);

function publicIP(address: string) {
  if (isIP(address) === 4) {
    const parts = address.split(".").map(Number);
    return !(parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
      parts[0] >= 224 || (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      (parts[0] === 192 && parts[1] === 0) || (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)));
  }
  if (isIP(address) === 6) {
    const lower=address.toLowerCase();
    if (lower.startsWith("::ffff:")) return publicIP(lower.slice(7));
    return !(lower === "::1" || lower === "::" || lower.startsWith("fe80:") ||
      lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("ff"));
  }
  return false;
}
function normalize(text: string) {
  return text.replace(/\0/g, " ").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Không cắt/lấy mẫu âm thầm: vượt giới hạn thì báo rõ để người dùng chọn tài liệu nhỏ hơn. */
function prepareFullSource(raw: string) {
  const text = normalize(raw);
  if (text.length > MAX_EXTRACTED_CHARS) {
    throw new Error(`Tài liệu có ${text.length.toLocaleString("vi-VN")} ký tự, vượt giới hạn xử lý toàn văn 2.000.000 ký tự. Hãy chia tài liệu thành những file nhỏ hơn.`);
  }
  return { text, originalCharacters: text.length, sampled: false, segmentCount: 1 };
}
async function fromURL(raw:string){
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443") throw new Error("Chỉ hỗ trợ URL HTTPS công khai.");
  const host=url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || isIP(host)) throw new Error("Địa chỉ URL không hợp lệ.");
  const resolved = await lookup(host,{all:true,verbatim:true});
  if (!resolved.length || resolved.some(r=>!publicIP(r.address))) throw new Error("URL trỏ tới địa chỉ mạng nội bộ.");
  // DNS re-binding protection requires an egress proxy with pinned DNS in production.
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try {
    const response=await fetch(url,{redirect:"manual",signal:controller.signal,headers:{"Accept":"text/html","User-Agent":"QuizVerseContentReader/1.0"}});
    if (!response.ok) throw new Error("Không đọc được trang web (HTTP "+response.status+").");
    if (!(response.headers.get("content-type")||"").toLowerCase().includes("text/html")) throw new Error("URL phải là một trang HTML.");
    if (Number(response.headers.get("content-length")||0)>MAX_WEB_BYTES) throw new Error("Trang quá lớn.");
    const reader=response.body?.getReader();
    if(!reader) throw new Error("Không thể đọc trang.");
    const blocks:Uint8Array[]=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_WEB_BYTES){await reader.cancel();throw new Error("Trang quá lớn.");} blocks.push(value);}
    const html=new TextDecoder().decode(Buffer.concat(blocks.map(b=>Buffer.from(b))));
    const $=load(html);$("script,style,nav,footer,header,aside,iframe,form,noscript").remove();
    return prepareFullSource($("main").text() || $("article").text() || $("body").text());
  }finally{clearTimeout(timer);}
}
export async function POST(req:NextRequest){
  if(!allowMutation(req))return NextResponse.json({error:"Invalid origin"},{status:403});
  if(!await currentUser())return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const form=await req.formData();const file=form.get("file");const link=form.get("url");
    if(file instanceof File){
      if(file.size>MAX_FILE_BYTES || file.size===0)return NextResponse.json({error:"File phải không quá 20 MB và không được rỗng."},{status:400});
      const ext=file.name.toLowerCase().split(".").pop()||"";
      if(!allowedExtensions.has(ext))return NextResponse.json({error:"Chỉ hỗ trợ .pdf, .docx và .txt."},{status:400});
      const buffer=Buffer.from(await file.arrayBuffer());let text="";
      if(ext==="txt")text=buffer.toString("utf8");
      if(ext==="docx")text=(await mammoth.extractRawText({buffer})).value;
      if(ext==="pdf"){
        if(buffer.subarray(0,5).toString()!=="%PDF-")throw new Error("File PDF không hợp lệ.");
        const pdfParse=(await import("pdf-parse")).default;
        text=(await pdfParse(buffer)).text;
      }
      const result=prepareFullSource(text);
      if(result.text.length<100)return NextResponse.json({error:"Không trích xuất đủ văn bản. PDF scan cần OCR (chưa hỗ trợ)."},{status:422});
      return NextResponse.json({...result,characters:result.text.length,filename:file.name});
    }
    if(typeof link==="string" && link.trim()){
      const result=await fromURL(link.trim());
      if(result.text.length<100)return NextResponse.json({error:"Trang web không có đủ nội dung văn bản để tạo Quiz."},{status:422});
      return NextResponse.json({...result,characters:result.text.length,filename:link.trim()});
    }
    return NextResponse.json({error:"Chọn file hoặc nhập URL."},{status:400});
  }catch(err){
    console.error("Source extraction:",err instanceof Error?err.message:"unknown");
    return NextResponse.json({error:err instanceof Error?err.message:"Không thể phân tích nguồn."},{status:422});
  }
}
