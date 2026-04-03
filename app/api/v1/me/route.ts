import { NextResponse } from "next/server";
import { db } from "@/db";
import { parseBearerToken, resolveUserIdFromApiKeyBearer } from "@/lib/api-keys/verify-bearer";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = await resolveUserIdFromApiKeyBearer(db, token);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ userId });
}
