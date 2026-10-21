import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isMongoConfigured } from "@/lib/mongodb";

export async function GET(req: Request) {
  const user = await getSession(req);
  return NextResponse.json({
    user,
    isMongoConfigured: isMongoConfigured(),
  });
}
