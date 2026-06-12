import { NextResponse } from "next/server";

import { deleteSavedSpec, getSavedSpec, saveSpec } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const spec = getSavedSpec(id);
  if (!spec) return NextResponse.json({ error: "Spec not found" }, { status: 404 });
  return NextResponse.json(spec);
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  if (body.id !== id) return NextResponse.json({ error: "Spec id mismatch" }, { status: 400 });
  const saved = saveSpec(body);
  return NextResponse.json(saved);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = deleteSavedSpec(id);
  if (!deleted) return NextResponse.json({ error: "Spec not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
