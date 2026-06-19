import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

import type {
  GeneratedSpec,
  GenerationPack,
  LibraryData,
  LibraryEvent,
  LibraryPayload,
  LibrarySnapshot,
  PlatformAdPayload,
  SavedSpecSummary,
} from "@/lib/types";
import { generatedSpecSchema } from "@/lib/types";

const seedPath = path.join(process.cwd(), "data", "analytics_reference_library.json");

let cachedLibraryData: LibraryData | null = null;
let cachedSnapshot: LibrarySnapshot | null = null;
let sqlClient: postgres.Sql | null = null;
let savedSpecsTableReady: Promise<void> | null = null;

function asString(value: unknown) {
  return value == null ? "" : String(value);
}

function getLibraryData() {
  if (!cachedLibraryData) {
    cachedLibraryData = JSON.parse(fs.readFileSync(seedPath, "utf8")) as LibraryData;
  }
  return cachedLibraryData;
}

function getSection(section: string) {
  const rows = getLibraryData()[section as keyof LibraryData];
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for saved spec storage. Connect a Postgres database in Vercel.");
  }

  if (!sqlClient) {
    sqlClient = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  }

  return sqlClient;
}

async function ensureSavedSpecsTable() {
  if (!savedSpecsTableReady) {
    const sql = getSql();
    savedSpecsTableReady = sql`
      CREATE TABLE IF NOT EXISTS saved_specs (
        id TEXT PRIMARY KEY NOT NULL,
        game_title TEXT NOT NULL,
        genre TEXT NOT NULL,
        status TEXT NOT NULL,
        event_count INTEGER NOT NULL,
        payload_count INTEGER NOT NULL,
        generated_at TEXT NOT NULL,
        saved_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload TEXT NOT NULL
      )
    `
      .then(() => undefined)
      .catch((error) => {
        savedSpecsTableReady = null;
        throw error;
      });
  }

  await savedSpecsTableReady;
  return getSql();
}

export function getLibrarySnapshot(): LibrarySnapshot {
  if (cachedSnapshot) return cachedSnapshot;

  const events = getSection("event_catalog").map(
    (row): LibraryEvent => ({
      eventName: asString(row.event_name),
      featurePack: asString(row.feature_pack),
      category: asString(row.category),
      standardStatus: asString(row.standard_status),
      triggerDescription: asString(row.trigger_description),
      argumentType: asString(row.argument_type),
      argumentDescription: asString(row.argument_description),
      argumentExamples: asString(row.argument_examples),
      sourceCoverage: asString(row.source_coverage),
      canonicalPayloadFields: asString(row.canonical_payload_fields),
      generatorGuidance: asString(row.generator_guidance),
    }),
  );

  const payloads = getSection("payload_fields").map(
    (row): LibraryPayload => ({
      eventName: asString(row.event_name),
      featurePack: asString(row.feature_pack),
      category: asString(row.category),
      fieldName: asString(row.field_name),
      canonicalFieldName: asString(row.canonical_field_name),
      fieldDescription: asString(row.field_description),
      example: asString(row.example),
      dataType: asString(row.data_type),
      requiredness: asString(row.requiredness),
      note: asString(row.note),
      sourceLabel: asString(row.source_label),
      sourceGame: asString(row.source_game),
    }),
  );

  const generationPacks = getSection("generation_packs").map(
    (row): GenerationPack => ({
      featurePack: asString(row.feature_pack),
      applicableWhen: asString(row.applicable_when),
      recommendedEventsOrPlatformEvents: asString(row.recommended_events_or_platform_events),
      launchPriority: asString(row.launch_priority),
      notes: asString(row.notes),
    }),
  );

  const platformAdPayloads = getSection("platform_ad_payloads").map(
    (row): PlatformAdPayload => ({
      platformEventName: asString(row.platform_event_name),
      adFamily: asString(row.ad_family),
      description: asString(row.description),
      fieldName: asString(row.field_name),
      canonicalFieldName: asString(row.canonical_field_name),
      fieldDescription: asString(row.field_description),
      example: asString(row.example),
      dataType: asString(row.data_type),
      requiredness: asString(row.requiredness),
      featurePack: asString(row.feature_pack),
      sourceLabel: asString(row.source_label),
      sourceGame: asString(row.source_game),
    }),
  );

  cachedSnapshot = {
    events,
    payloads,
    generationPacks,
    governanceDecisions: getSection("governance_decisions") as Array<Record<string, string>>,
    platformAdPayloads,
    scenarios: getSection("scenario_library") as Array<Record<string, string>>,
  };
  return cachedSnapshot;
}

function specStatus(spec: GeneratedSpec) {
  if (!spec.generatedEvents.length) return "Draft";
  if (spec.generatedEvents.some((event) => event.status === "Needs changes")) return "Needs changes";
  if (spec.generatedEvents.every((event) => event.status === "Reviewed")) return "Reviewed";
  return "Draft";
}

function specPayloadCount(spec: GeneratedSpec) {
  return spec.generatedEvents.reduce((total, event) => total + event.payloadFields.length, 0) + spec.platformAdPayloads.length;
}

function rowToSavedSpecSummary(row: Record<string, unknown>): SavedSpecSummary {
  return {
    id: asString(row.id),
    gameTitle: asString(row.game_title),
    genre: asString(row.genre),
    status: asString(row.status),
    eventCount: Number(row.event_count ?? 0),
    payloadCount: Number(row.payload_count ?? 0),
    generatedAt: asString(row.generated_at),
    savedAt: asString(row.saved_at),
    updatedAt: asString(row.updated_at),
  };
}

export async function listSavedSpecs(): Promise<SavedSpecSummary[]> {
  const sql = await ensureSavedSpecsTable();
  const rows = await sql`
    SELECT id, game_title, genre, status, event_count, payload_count, generated_at, saved_at, updated_at
    FROM saved_specs
    ORDER BY updated_at DESC
  `;
  return rows.map((row) => rowToSavedSpecSummary(row));
}

export async function getSavedSpec(id: string): Promise<GeneratedSpec | null> {
  const sql = await ensureSavedSpecsTable();
  const [row] = await sql<{ payload: string }[]>`
    SELECT payload
    FROM saved_specs
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!row) return null;
  return generatedSpecSchema.parse(JSON.parse(row.payload));
}

export async function saveSpec(specInput: unknown): Promise<SavedSpecSummary> {
  const sql = await ensureSavedSpecsTable();
  const spec = generatedSpecSchema.parse(specInput);
  const [existing] = await sql<{ saved_at: string }[]>`
    SELECT saved_at
    FROM saved_specs
    WHERE id = ${spec.id}
    LIMIT 1
  `;
  const now = new Date().toISOString();
  const savedAt = existing?.saved_at ?? now;
  const status = specStatus(spec);
  const eventCount = spec.generatedEvents.length;
  const payloadCount = specPayloadCount(spec);

  await sql`
    INSERT INTO saved_specs (
      id, game_title, genre, status, event_count, payload_count, generated_at, saved_at, updated_at, payload
    )
    VALUES (
      ${spec.id},
      ${spec.intake.gameTitle},
      ${spec.intake.genre},
      ${status},
      ${eventCount},
      ${payloadCount},
      ${spec.generatedAt},
      ${savedAt},
      ${now},
      ${JSON.stringify(spec)}
    )
    ON CONFLICT(id) DO UPDATE SET
      game_title = excluded.game_title,
      genre = excluded.genre,
      status = excluded.status,
      event_count = excluded.event_count,
      payload_count = excluded.payload_count,
      generated_at = excluded.generated_at,
      updated_at = excluded.updated_at,
      payload = excluded.payload
  `;

  return {
    id: spec.id,
    gameTitle: spec.intake.gameTitle,
    genre: spec.intake.genre,
    status,
    eventCount,
    payloadCount,
    generatedAt: spec.generatedAt,
    savedAt,
    updatedAt: now,
  };
}

export async function deleteSavedSpec(id: string) {
  const sql = await ensureSavedSpecsTable();
  const result = await sql`
    DELETE FROM saved_specs
    WHERE id = ${id}
  `;
  return result.count > 0;
}
