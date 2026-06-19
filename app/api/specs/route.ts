import { NextResponse } from "next/server";

import { listSavedSpecs, saveSpec } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await listSavedSpecs());
}

export async function POST(request: Request) {
  const body = await request.json();
  const saved = await saveSpec(body);
  return NextResponse.json(saved);
}
