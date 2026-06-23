import { execFileSync } from "node:child_process";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { DELETE, GET as GET_SPEC, PUT } from "@/app/api/specs/[id]/route";
import { POST as GENERATE_SPEC } from "@/app/api/generate/route";
import { GET as LIST_SPECS, POST } from "@/app/api/specs/route";
import { deleteSavedSpec } from "@/lib/db";
import { generateSpecFromRules } from "@/lib/generator";
import { getLibrarySnapshot } from "@/lib/db";
import type { GameIntake, GeneratedSpec, UserRole } from "@/lib/types";

const createdSpecIds = new Set<string>();

const baseIntake: GameIntake = {
  gameTitle: "RBAC Test Game",
  genre: "Puzzle",
  coreLoop: "Level based",
  gameModes: "Journey",
  mechanics: "Powerups",
  winConditions: "Complete objectives",
  loseConditions: "No moves left",
  economy: "Currency",
  itemsOrPowerups: "shuffle",
  powerupNames: "shuffle",
  iap: "",
  ads: "",
  rewardedAdPlacements: "",
  interstitialAdPlacements: "",
  liveOps: "",
  notes: "",
};

function specWithId(id: string) {
  const spec = generateSpecFromRules(baseIntake, getLibrarySnapshot());
  return { ...spec, id, generatedAt: new Date().toISOString() };
}

function request(method: string, role: UserRole, userId: string, body?: unknown) {
  return new Request("http://localhost/api/specs", {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-user-id": userId,
      "x-test-user-email": `${userId}@example.com`,
      "x-test-user-name": userId,
      "x-test-user-role": role,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function publicRequest(method = "GET") {
  return new Request("http://localhost/api/specs", { method });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function sqliteLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function clearOwnerFields(id: string) {
  execFileSync("sqlite3", [
    path.join(process.cwd(), "data", "analytics.sqlite"),
    `UPDATE saved_specs SET owner_user_id = NULL, owner_email = NULL, owner_name = NULL WHERE id = ${sqliteLiteral(id)}`,
  ]);
}

async function createAs(role: UserRole, userId: string, spec: GeneratedSpec) {
  createdSpecIds.add(spec.id);
  return POST(request("POST", role, userId, spec));
}

afterEach(async () => {
  for (const id of createdSpecIds) {
    await deleteSavedSpec(id);
  }
  createdSpecIds.clear();
});

describe("spec RBAC API", () => {
  it("allows admins to create, update, and delete any spec", async () => {
    const spec = specWithId("rbac-admin-any");
    await createAs("editor", "editor-owner", spec);

    const updated = {
      ...spec,
      intake: { ...spec.intake, gameTitle: "Admin Updated" },
    };
    const putResponse = await PUT(request("PUT", "admin", "admin-user", updated), context(spec.id));
    expect(putResponse.status).toBe(200);

    const deleteResponse = await DELETE(request("DELETE", "admin", "admin-user"), context(spec.id));
    expect(deleteResponse.status).toBe(200);
  });

  it("allows editors to mutate only their own specs", async () => {
    const ownSpec = specWithId("rbac-editor-own");
    const otherSpec = specWithId("rbac-editor-other");
    await createAs("editor", "editor-owner", ownSpec);
    await createAs("admin", "admin-user", otherSpec);

    const ownDelete = await DELETE(request("DELETE", "editor", "editor-owner"), context(ownSpec.id));
    expect(ownDelete.status).toBe(200);

    const otherDelete = await DELETE(request("DELETE", "editor", "editor-owner"), context(otherSpec.id));
    expect(otherDelete.status).toBe(403);
  });

  it("blocks viewers from creating specs", async () => {
    const response = await createAs("viewer", "viewer-user", specWithId("rbac-viewer-create"));
    expect(response.status).toBe(403);

    const generateResponse = await GENERATE_SPEC(request("POST", "viewer", "viewer-user-generate", baseIntake));
    expect(generateResponse.status).toBe(403);
  });

  it("allows public single-spec reads but blocks anonymous list access", async () => {
    const spec = specWithId("rbac-public-read");
    await createAs("admin", "admin-user", spec);

    const single = await GET_SPEC(publicRequest(), context(spec.id));
    expect(single.status).toBe(200);

    const list = await LIST_SPECS(publicRequest());
    expect(list.status).toBe(401);
  });

  it("keeps legacy unowned specs admin-only for mutations", async () => {
    const spec = specWithId("rbac-legacy-unowned");
    await createAs("admin", "admin-user", spec);
    clearOwnerFields(spec.id);

    const editorDelete = await DELETE(request("DELETE", "editor", "editor-owner"), context(spec.id));
    expect(editorDelete.status).toBe(403);
  });
});
