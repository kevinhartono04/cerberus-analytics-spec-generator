import { NextResponse } from "next/server";

import { getCurrentAppUser, jsonError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getCurrentAppUser(request);
    return NextResponse.json({ authenticated: Boolean(user), user });
  } catch (error) {
    return jsonError(error);
  }
}
