import { NextResponse } from "next/server";

import { listSavedSpecs, saveSpec } from "@/lib/db";

export function GET() {
  return NextResponse.json(listSavedSpecs());
}

export async function POST(request: Request) {
  const body = await request.json();
  const saved = saveSpec(body);
  return NextResponse.json(saved);
}
