import {redirect} from "next/navigation";
import {currentUser} from "@/lib/auth";
import AdminReportsClient from "./AdminReportsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CommunityAdminPage(){
 const user = await currentUser();
 const admins = (process.env.COMMUNITY_ADMIN_USER_IDS ?? "").split(",").map(id=>id.trim()).filter(Boolean);
 if (!user || !admins.includes(user.id)) redirect("/community");
 return <AdminReportsClient/>;
}
