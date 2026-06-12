import { NextResponse } from "next/server";

import { generatedSpecSchema } from "@/lib/types";

export async function POST(request: Request) {
  const spec = generatedSpecSchema.parse(await request.json());
  return new NextResponse(JSON.stringify(spec, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${spec.intake.gameTitle || "analytics-spec"}.json"`,
    },
  });
}
