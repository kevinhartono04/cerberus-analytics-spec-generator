import { NextResponse } from "next/server";

import { canManageUsers, jsonError, requireCurrentAppUser } from "@/lib/auth";
import { updateAppUserRole } from "@/lib/db";
import { userRoleSchema } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireCurrentAppUser(request);
    if (!canManageUsers(actor)) return NextResponse.json({ error: "Admins only" }, { status: 403 });

    const body = await request.json();
    const role = userRoleSchema.parse(body.role);
    const { id } = await context.params;
    const user = await updateAppUserRole(id, role);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    return jsonError(error);
  }
}
