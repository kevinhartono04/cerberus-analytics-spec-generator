import { NextResponse } from "next/server";

import { canManageUsers, jsonError, requireCurrentAppUser } from "@/lib/auth";
import { listAppUsers } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentAppUser(request);
    if (!canManageUsers(user)) return NextResponse.json({ error: "Admins only" }, { status: 403 });
    return NextResponse.json(await listAppUsers());
  } catch (error) {
    return jsonError(error);
  }
}
