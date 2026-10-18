"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import "../community.css";
type Report={id:string;quizId:string;reason:string;createdAt:string;quiz:{id:string;title:string;visibility:string}|null};
export default function AdminReportsClient(){
 const [reports,setReports]=useState<Report[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState("");
 const load=useCallback(async()=>{const res=await fetch("/api/community/admin/reports",{cache:"no-store"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Không thể tải báo cáo");setReports(data.reports)},[]);
 useEffect(()=>{void load().catch(e=>setError(e.message))},[load]);
 const act=async(id:string,action:"dismiss"|"hide")=>{
  if(action==="hide"&&!window.confirm("Ẩn Quiz này khỏi cộng đồng?"))return;
  setBusy(id);setError("");
  try{const res=await fetch("/api/community/admin/reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reportId:id,action})});const d=await res.json();if(!res.ok)throw new Error(d.error||"Thao tác thất bại");await load()}catch(e){setError(e instanceof Error?e.message:"Lỗi")}
  finally{setBusy("")}
 };
 return <main className="community-shell"><header className="community-head"><Link href="/community">← Cộng đồng</Link><h1>Quản trị <span>báo cáo Quiz</span></h1><p>Chỉ tài khoản quản trị được cấp quyền qua biến môi trường mới có thể xem và xử lý.</p></header>{error&&<p className="community-notice" role="alert">{error}</p>}{reports.map(r=><section className="community-card" key={r.id}><h2>{r.quiz?.title||"Quiz đã bị xóa"}</h2><p>{r.reason}</p><small>{new Date(r.createdAt).toLocaleString("vi-VN")}</small><div className="community-inline"><button disabled={Boolean(busy)} onClick={()=>void act(r.id,"dismiss")}>Bỏ qua báo cáo</button><button disabled={Boolean(busy)||!r.quiz} onClick={()=>void act(r.id,"hide")}>Ẩn Quiz khỏi cộng đồng</button></div></section>)}{!reports.length&&!error&&<p>Không có báo cáo cần xử lý.</p>}</main>
}
