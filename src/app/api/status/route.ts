import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ storage: isDatabaseConfigured() ? "turso" : "local" }); }
